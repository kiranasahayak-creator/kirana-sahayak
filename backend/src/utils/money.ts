import { Decimal } from "@prisma/client/runtime/library";

// Prisma's Decimal type is precise but not JSON-friendly / not what the
// frontend wants to deal with. Convert once, at the boundary, everywhere.
export function toNumber(value: Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return value.toNumber();
}

// Recursively converts any Decimal fields on a plain object/array to numbers.
// Good enough for the shapes we return from controllers without needing a
// full serialization library.
export function serializeDecimals<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Decimal) {
    return value.toNumber() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeDecimals(v)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeDecimals(v);
    }
    return out as T;
  }
  return value;
}
