import Fuse from "fuse.js";
import { prisma } from "../config/prisma";
import { normalizeText } from "../utils/normalize";

export interface MatchCandidate {
  productId: string;
  name: string;
  brand: string | null;
  packSize: string | null;
  sellingPrice: number;
  confidence: number; // 0-1
}

export type MatchStatus = "confident" | "ambiguous" | "unmatched";

export interface MatchResult {
  status: MatchStatus;
  matches: MatchCandidate[];
}

interface CatalogProduct {
  id: string;
  name: string;
  normalizedName: string;
  brand: string | null;
  packSize: string | null;
  sellingPrice: number;
  aliasesNormalized: string[];
}

// Fetches the given store's full product + alias catalog. Deliberately
// scoped by storeId at the query level — this function has no way to
// accidentally return another store's products.
async function loadStoreCatalog(storeId: string): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { storeId },
    include: { aliases: true },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    normalizedName: p.normalizedName,
    brand: p.brand,
    packSize: p.packSize,
    sellingPrice: Number(p.sellingPrice),
    aliasesNormalized: p.aliases.map((a) => a.normalizedAlias),
  }));
}

function toCandidate(p: CatalogProduct, confidence: number): MatchCandidate {
  return {
    productId: p.id,
    name: p.name,
    brand: p.brand,
    packSize: p.packSize,
    sellingPrice: p.sellingPrice,
    confidence,
  };
}

/**
 * Matches a raw spoken/typed product phrase against one store's catalog.
 *
 * Layered strategy, cheapest/most-certain first:
 *   1. Exact normalized name match
 *   2. Exact alias match
 *   3. Fuzzy match (name + aliases) via Fuse.js
 *
 * If exactly one confident match comes out, status = "confident".
 * If several plausible candidates remain close together, status =
 * "ambiguous" and the caller (frontend) should ask the shopkeeper to pick.
 * If nothing reasonable is found, status = "unmatched".
 */
export async function matchProduct(storeId: string, rawText: string): Promise<MatchResult> {
  const catalog = await loadStoreCatalog(storeId);
  const query = normalizeText(rawText);

  if (!query) {
    return { status: "unmatched", matches: [] };
  }

  // 1. Exact normalized name match
  const exact = catalog.filter((p) => p.normalizedName === query);
  if (exact.length === 1) {
    return { status: "confident", matches: [toCandidate(exact[0], 1)] };
  }

  // 2. Exact alias match
  const aliasHits = catalog.filter((p) => p.aliasesNormalized.includes(query));
  if (aliasHits.length === 1) {
    return { status: "confident", matches: [toCandidate(aliasHits[0], 0.95)] };
  }
  if (aliasHits.length > 1) {
    return {
      status: "ambiguous",
      matches: aliasHits.map((p) => toCandidate(p, 0.9)),
    };
  }
  if (exact.length > 1) {
    return {
      status: "ambiguous",
      matches: exact.map((p) => toCandidate(p, 0.9)),
    };
  }

  // 3. Fuzzy match across product names + all their aliases
  const fuseEntries = catalog.flatMap((p) => [
    { product: p, text: p.normalizedName },
    ...p.aliasesNormalized.map((a) => ({ product: p, text: a })),
  ]);

  const fuse = new Fuse(fuseEntries, {
    keys: ["text"],
    includeScore: true,
    threshold: 0.4, // lower = stricter
  });

  const results = fuse.search(query);
  if (results.length === 0) {
    return { status: "unmatched", matches: [] };
  }

  // Collapse to unique products, keep the best (lowest) score per product
  const bestScoreByProduct = new Map<string, number>();
  for (const r of results) {
    const score = r.score ?? 1;
    const existing = bestScoreByProduct.get(r.item.product.id);
    if (existing === undefined || score < existing) {
      bestScoreByProduct.set(r.item.product.id, score);
    }
  }

  const ranked = [...bestScoreByProduct.entries()]
    .map(([productId, score]) => ({
      product: catalog.find((p) => p.id === productId)!,
      confidence: Math.max(0, 1 - score),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const top = ranked[0];
  const runnerUp = ranked[1];

  // Confident only if the top match is clearly ahead of the next-best one.
  if (top.confidence >= 0.55 && (!runnerUp || top.confidence - runnerUp.confidence >= 0.15)) {
    return { status: "confident", matches: [toCandidate(top.product, top.confidence)] };
  }

  const shortlisted = ranked.slice(0, 4).filter((r) => r.confidence >= 0.3);
  if (shortlisted.length === 0) {
    return { status: "unmatched", matches: [] };
  }

  return {
    status: shortlisted.length === 1 ? "confident" : "ambiguous",
    matches: shortlisted.map((r) => toCandidate(r.product, r.confidence)),
  };
}
