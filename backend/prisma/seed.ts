/**
 * Seeds the database with 3 demo stores, a shared ~52-product catalog
 * (each store gets its own Product rows, with slight price variance), and
 * 8 weeks of synthetic historical sales — deliberately shaped differently
 * per store (category bias + weekday pattern + a mild trend) so the
 * forecasting engine has something genuinely store-specific to learn from.
 *
 * Safe to re-run: it wipes and rebuilds everything each time.
 *
 * Run with:  npm run seed   (from /backend, after `npx prisma migrate dev`)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { CATEGORIES, Category, DEMO_FESTIVALS } from "../src/config/constants";
import { normalizeText } from "../src/utils/normalize";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Seeded PRNG so re-running seed produces comparable (not identical, since
// Date.now() anchors "today", but structurally similar) demo data.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function weightedCategory(rng: () => number, weights: Record<Category, number>): Category {
  const entries = Object.entries(weights) as [Category, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [cat, w] of entries) {
    r -= w;
    if (r <= 0) return cat;
  }
  return entries[entries.length - 1][0];
}

// ---------------------------------------------------------------------------
// Product catalog — ~52 realistic Indian kirana-store products across all
// 8 required categories, each with a few common spoken aliases (including
// Devanagari/Gurmukhi where a shopkeeper would naturally say it that way).
// ---------------------------------------------------------------------------
interface BaseProduct {
  name: string;
  brand: string;
  category: Category;
  packSize: string;
  unit: string;
  price: number;
  cost: number;
  aliases: string[];
}

const BASE_PRODUCTS: BaseProduct[] = [
  // Snacks
  { name: "Lay's Classic Salted 52g", brand: "Lay's", category: "Snacks", packSize: "52g", unit: "packet", price: 20, cost: 15, aliases: ["lays", "blue lays", "lays blue", "लेज़", "ब्लू लेज़"] },
  { name: "Lay's Magic Masala 52g", brand: "Lay's", category: "Snacks", packSize: "52g", unit: "packet", price: 20, cost: 15, aliases: ["magic masala lays", "red lays", "मसाला लेज़"] },
  { name: "Lay's Cream & Onion 52g", brand: "Lay's", category: "Snacks", packSize: "52g", unit: "packet", price: 20, cost: 15, aliases: ["cream onion lays", "green lays"] },
  { name: "Kurkure Masala Munch 55g", brand: "Kurkure", category: "Snacks", packSize: "55g", unit: "packet", price: 20, cost: 14, aliases: ["kurkure", "कुरकुरे"] },
  { name: "Haldiram's Aloo Bhujia 200g", brand: "Haldiram's", category: "Snacks", packSize: "200g", unit: "packet", price: 55, cost: 42, aliases: ["bhujia", "aloo bhujia", "आलू भुजिया"] },
  { name: "Bingo Mad Angles 72g", brand: "Bingo", category: "Snacks", packSize: "72g", unit: "packet", price: 20, cost: 15, aliases: ["bingo", "mad angles"] },
  // Beverages
  { name: "Coca-Cola 250ml", brand: "Coca-Cola", category: "Beverages", packSize: "250ml", unit: "bottle", price: 20, cost: 15, aliases: ["coke", "coca cola", "कोक", "कोका कोला"] },
  { name: "Coca-Cola 750ml", brand: "Coca-Cola", category: "Beverages", packSize: "750ml", unit: "bottle", price: 40, cost: 30, aliases: ["coke bottle", "badi coke", "बड़ी कोक"] },
  { name: "Pepsi 250ml", brand: "Pepsi", category: "Beverages", packSize: "250ml", unit: "bottle", price: 20, cost: 15, aliases: ["pepsi", "पेप्सी"] },
  { name: "Sprite 250ml", brand: "Sprite", category: "Beverages", packSize: "250ml", unit: "bottle", price: 20, cost: 15, aliases: ["sprite", "स्प्राइट"] },
  { name: "Thums Up 250ml", brand: "Thums Up", category: "Beverages", packSize: "250ml", unit: "bottle", price: 20, cost: 15, aliases: ["thums up", "thumbs up", "थम्स अप"] },
  { name: "Frooti 200ml", brand: "Frooti", category: "Beverages", packSize: "200ml", unit: "tetra pack", price: 15, cost: 11, aliases: ["frooti", "mango frooti", "फ्रूटी"] },
  { name: "Real Fruit Juice Mixed 1L", brand: "Real", category: "Beverages", packSize: "1L", unit: "carton", price: 110, cost: 88, aliases: ["real juice", "mixed fruit juice"] },
  { name: "Bisleri Water 1L", brand: "Bisleri", category: "Beverages", packSize: "1L", unit: "bottle", price: 20, cost: 14, aliases: ["bisleri", "pani ki bottle", "पानी की बोतल"] },
  { name: "Tata Tea Gold 250g", brand: "Tata", category: "Beverages", packSize: "250g", unit: "packet", price: 130, cost: 105, aliases: ["chai patti", "tea patti", "चाय पत्ती"] },
  { name: "Nescafe Classic 50g", brand: "Nescafe", category: "Beverages", packSize: "50g", unit: "jar", price: 145, cost: 118, aliases: ["nescafe", "coffee", "कॉफी"] },
  // Biscuits
  { name: "Parle-G 100g", brand: "Parle", category: "Biscuits", packSize: "100g", unit: "packet", price: 10, cost: 7, aliases: ["parle g", "parle-g", "पारले जी"] },
  { name: "Britannia Good Day 100g", brand: "Britannia", category: "Biscuits", packSize: "100g", unit: "packet", price: 30, cost: 23, aliases: ["good day", "गुड डे"] },
  { name: "Britannia Marie Gold 150g", brand: "Britannia", category: "Biscuits", packSize: "150g", unit: "packet", price: 35, cost: 27, aliases: ["marie gold", "मैरी गोल्ड"] },
  { name: "Oreo Original 120g", brand: "Oreo", category: "Biscuits", packSize: "120g", unit: "packet", price: 30, cost: 23, aliases: ["oreo", "ओरियो"] },
  { name: "Hide & Seek 100g", brand: "Parle", category: "Biscuits", packSize: "100g", unit: "packet", price: 30, cost: 23, aliases: ["hide and seek", "हाइड एंड सीक"] },
  { name: "Monaco Salted 100g", brand: "Parle", category: "Biscuits", packSize: "100g", unit: "packet", price: 30, cost: 23, aliases: ["monaco", "मोनाको"] },
  // Dairy
  { name: "Amul Milk 500ml", brand: "Amul", category: "Dairy", packSize: "500ml", unit: "pouch", price: 30, cost: 27, aliases: ["amul milk", "doodh", "दूध"] },
  { name: "Amul Butter 100g", brand: "Amul", category: "Dairy", packSize: "100g", unit: "pack", price: 58, cost: 50, aliases: ["amul butter", "makhan", "मक्खन"] },
  { name: "Amul Taaza Toned Milk 1L", brand: "Amul", category: "Dairy", packSize: "1L", unit: "pouch", price: 68, cost: 60, aliases: ["taaza milk", "toned milk"] },
  { name: "Amul Paneer 200g", brand: "Amul", category: "Dairy", packSize: "200g", unit: "pack", price: 90, cost: 76, aliases: ["paneer", "पनीर"] },
  { name: "Mother Dairy Curd 400g", brand: "Mother Dairy", category: "Dairy", packSize: "400g", unit: "cup", price: 45, cost: 37, aliases: ["dahi", "curd", "दही"] },
  { name: "Amul Cheese Slices 100g", brand: "Amul", category: "Dairy", packSize: "100g", unit: "pack", price: 65, cost: 54, aliases: ["cheese", "cheese slice"] },
  // Personal Care
  { name: "Dettol Soap 75g", brand: "Dettol", category: "Personal Care", packSize: "75g", unit: "bar", price: 35, cost: 28, aliases: ["dettol", "dettol sabun", "डेटॉल"] },
  { name: "Colgate Strong Teeth 100g", brand: "Colgate", category: "Personal Care", packSize: "100g", unit: "tube", price: 55, cost: 44, aliases: ["colgate", "toothpaste", "कोलगेट"] },
  { name: "Dove Soap 75g", brand: "Dove", category: "Personal Care", packSize: "75g", unit: "bar", price: 55, cost: 44, aliases: ["dove", "dove sabun"] },
  { name: "Head & Shoulders Shampoo 180ml", brand: "Head & Shoulders", category: "Personal Care", packSize: "180ml", unit: "bottle", price: 175, cost: 142, aliases: ["head and shoulders", "shampoo", "शैम्पू"] },
  { name: "Nivea Body Lotion 200ml", brand: "Nivea", category: "Personal Care", packSize: "200ml", unit: "bottle", price: 185, cost: 150, aliases: ["nivea", "body lotion"] },
  { name: "Patanjali Toothpaste 100g", brand: "Patanjali", category: "Personal Care", packSize: "100g", unit: "tube", price: 45, cost: 35, aliases: ["patanjali toothpaste", "दंत कांति"] },
  // Household
  { name: "Surf Excel 500g", brand: "Surf Excel", category: "Household", packSize: "500g", unit: "pack", price: 65, cost: 52, aliases: ["surf excel", "detergent", "सर्फ"] },
  { name: "Vim Dishwash Bar 200g", brand: "Vim", category: "Household", packSize: "200g", unit: "bar", price: 20, cost: 15, aliases: ["vim", "dishwash bar", "बर्तन साबुन"] },
  { name: "Harpic Toilet Cleaner 500ml", brand: "Harpic", category: "Household", packSize: "500ml", unit: "bottle", price: 95, cost: 76, aliases: ["harpic", "toilet cleaner"] },
  { name: "Good Knight Mosquito Coil", brand: "Good Knight", category: "Household", packSize: "10 coils", unit: "pack", price: 35, cost: 27, aliases: ["good knight", "machhar coil", "मच्छर अगरबत्ती"] },
  { name: "Colin Glass Cleaner 500ml", brand: "Colin", category: "Household", packSize: "500ml", unit: "bottle", price: 85, cost: 68, aliases: ["colin", "glass cleaner"] },
  { name: "Rin Detergent Bar", brand: "Rin", category: "Household", packSize: "250g", unit: "bar", price: 18, cost: 13, aliases: ["rin", "rin bar"] },
  // Staples
  { name: "Aashirvaad Atta 5kg", brand: "Aashirvaad", category: "Staples", packSize: "5kg", unit: "bag", price: 260, cost: 225, aliases: ["atta", "aata", "आटा"] },
  { name: "Tata Salt 1kg", brand: "Tata", category: "Staples", packSize: "1kg", unit: "packet", price: 25, cost: 20, aliases: ["namak", "salt", "नमक"] },
  { name: "Fortune Sunflower Oil 1L", brand: "Fortune", category: "Staples", packSize: "1L", unit: "pouch", price: 145, cost: 122, aliases: ["tel", "oil", "तेल"] },
  { name: "Toor Dal 1kg", brand: "Local", category: "Staples", packSize: "1kg", unit: "packet", price: 140, cost: 118, aliases: ["dal", "arhar dal", "दाल"] },
  { name: "India Gate Basmati Rice 1kg", brand: "India Gate", category: "Staples", packSize: "1kg", unit: "packet", price: 95, cost: 78, aliases: ["chawal", "rice", "चावल"] },
  { name: "Sugar 1kg", brand: "Local", category: "Staples", packSize: "1kg", unit: "packet", price: 44, cost: 38, aliases: ["chini", "sugar", "चीनी"] },
  // Instant Food
  { name: "Maggi 2-Minute Noodles 70g", brand: "Maggi", category: "Instant Food", packSize: "70g", unit: "packet", price: 14, cost: 10, aliases: ["maggi", "मैगी"] },
  { name: "Maggi Masala Noodles Multipack", brand: "Maggi", category: "Instant Food", packSize: "4x70g", unit: "pack", price: 55, cost: 42, aliases: ["maggi pack", "maggi multipack"] },
  { name: "Top Ramen Curry 70g", brand: "Top Ramen", category: "Instant Food", packSize: "70g", unit: "packet", price: 15, cost: 11, aliases: ["top ramen", "ramen"] },
  { name: "Knorr Soup Mixed Veg 44g", brand: "Knorr", category: "Instant Food", packSize: "44g", unit: "packet", price: 40, cost: 31, aliases: ["knorr soup", "soup"] },
  { name: "MTR Ready to Eat Poha 180g", brand: "MTR", category: "Instant Food", packSize: "180g", unit: "pack", price: 65, cost: 52, aliases: ["poha", "ready to eat poha"] },
  { name: "Yippee Noodles 70g", brand: "Sunfeast", category: "Instant Food", packSize: "70g", unit: "packet", price: 14, cost: 10, aliases: ["yippee", "yippee noodles"] },
];

// ---------------------------------------------------------------------------
// Store definitions — each with a distinct demand shape so store-specific
// learning is actually visible in the demo, not just claimed.
// ---------------------------------------------------------------------------
const uniformWeights: Record<Category, number> = Object.fromEntries(
  CATEGORIES.map((c) => [c, 1])
) as Record<Category, number>;

const STORE_DEFS = [
  {
    storeCode: "STORE001",
    storeName: "Sharma General Store",
    location: "Sector 22, Chandigarh",
    categoryWeights: { ...uniformWeights, Beverages: 3.2, "Instant Food": 1.3 } as Record<Category, number>,
    weekdayMultiplier: (dow: number) => (dow === 0 || dow === 6 ? 1.15 : 1.0), // mild weekend bump
    basketsPerDay: [10, 22] as [number, number],
  },
  {
    storeCode: "STORE002",
    storeName: "Patel Snacks Corner",
    location: "Andheri West, Mumbai",
    categoryWeights: { ...uniformWeights, Snacks: 3.0, Biscuits: 1.6 } as Record<Category, number>,
    weekdayMultiplier: (dow: number) => (dow === 0 || dow === 6 ? 1.3 : 0.95),
    basketsPerDay: [9, 20] as [number, number],
  },
  {
    storeCode: "STORE003",
    storeName: "Singh Kirana Store",
    location: "Model Town, Ludhiana",
    categoryWeights: { ...uniformWeights, Staples: 1.7, Household: 1.4 } as Record<Category, number>,
    // Strongly weekend-skewed — its distinguishing pattern vs the other two.
    weekdayMultiplier: (dow: number) => (dow === 0 || dow === 6 ? 2.1 : 0.75),
    basketsPerDay: [6, 16] as [number, number],
  },
];

const HISTORY_DAYS = 56; // 8 weeks
const PASSWORD = "demo123";

async function main() {
  console.log("Wiping existing data...");
  await prisma.forecast.deleteMany();
  await prisma.storeForecastConfig.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.productAlias.deleteMany();
  await prisma.product.deleteMany();
  await prisma.weatherData.deleteMany();
  await prisma.festival.deleteMany();
  await prisma.store.deleteMany();

  console.log("Seeding festivals...");
  await prisma.festival.createMany({
    data: DEMO_FESTIVALS.map((f) => ({ name: f.name, date: new Date(f.date), region: f.region })),
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const storeDef of STORE_DEFS) {
    const rng = mulberry32(hashSeed(storeDef.storeCode));
    console.log(`\nSeeding ${storeDef.storeCode} (${storeDef.storeName})...`);

    const store = await prisma.store.create({
      data: {
        storeCode: storeDef.storeCode,
        passwordHash,
        storeName: storeDef.storeName,
        location: storeDef.location,
      },
    });

    // --- Products + aliases -------------------------------------------------
    const productRecords = BASE_PRODUCTS.map((bp) => {
      const priceJitter = 1 + (rng() * 0.1 - 0.05); // +-5% local price variance
      const sellingPrice = Math.round(bp.price * priceJitter);
      const costPrice = Math.round(bp.cost * priceJitter);
      return {
        id: randomUUID(),
        storeId: store.id,
        name: bp.name,
        normalizedName: normalizeText(bp.name),
        category: bp.category,
        brand: bp.brand,
        packSize: bp.packSize,
        unit: bp.unit,
        sellingPrice,
        costPrice,
        currentStock: 0, // set for real after historical demand is known, see below
        reorderLevel: randInt(rng, 5, 15),
        supplierMOQ: pick(rng, [10, 12, 20, 24]),
        leadTimeDays: randInt(rng, 1, 4),
        supplier: `${bp.brand} Distributor`,
      };
    });

    await prisma.product.createMany({ data: productRecords });

    const aliasRecords = BASE_PRODUCTS.flatMap((bp, i) =>
      bp.aliases.map((alias) => ({
        id: randomUUID(),
        productId: productRecords[i].id,
        alias,
        normalizedAlias: normalizeText(alias),
        language: /[\u0900-\u097F]/.test(alias) ? "hi" : /[\u0A00-\u0A7F]/.test(alias) ? "pa" : "en",
      }))
    );
    await prisma.productAlias.createMany({ data: aliasRecords });

    const productsByCategory = new Map<Category, typeof productRecords>();
    for (const p of productRecords) {
      const list = productsByCategory.get(p.category as Category) ?? [];
      list.push(p);
      productsByCategory.set(p.category as Category, list);
    }

    // --- Historical sales (last HISTORY_DAYS days) --------------------------
    const salesToInsert: {
      id: string;
      storeId: string;
      transactionDate: Date;
      totalItems: number;
      totalValue: number;
      source: string;
    }[] = [];
    const saleItemsToInsert: {
      id: string;
      saleId: string;
      productId: string;
      quantity: number;
      sellingPrice: number;
      costPrice: number;
      subtotal: number;
    }[] = [];
    const invTxToInsert: {
      id: string;
      storeId: string;
      productId: string;
      type: string;
      quantity: number;
      referenceId: string;
      createdAt: Date;
    }[] = [];
    const totalSoldByProduct = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = HISTORY_DAYS; dayOffset >= 1; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dow = date.getDay();

      // Mild upward trend across the 8-week window (week 8 ~15% busier than week 1).
      const weekIndex = Math.floor((HISTORY_DAYS - dayOffset) / 7);
      const trendMultiplier = 1 + weekIndex * 0.02;

      const [minB, maxB] = storeDef.basketsPerDay;
      const baskets = Math.round(
        randInt(rng, minB, maxB) * storeDef.weekdayMultiplier(dow) * trendMultiplier
      );

      for (let b = 0; b < baskets; b++) {
        const itemCount = randInt(rng, 1, 3);
        const chosen = new Set<string>();
        const items: { productId: string; sellingPrice: number; costPrice: number; quantity: number }[] = [];

        for (let i = 0; i < itemCount; i++) {
          const category = weightedCategory(rng, storeDef.categoryWeights);
          const candidates = productsByCategory.get(category);
          if (!candidates || candidates.length === 0) continue;
          const product = pick(rng, candidates);
          if (chosen.has(product.id)) continue;
          chosen.add(product.id);

          const quantity = randInt(rng, 1, 4);
          items.push({
            productId: product.id,
            sellingPrice: product.sellingPrice,
            costPrice: product.costPrice,
            quantity,
          });
        }
        if (items.length === 0) continue;

        const saleId = randomUUID();
        const totalItems = items.reduce((s, i) => s + i.quantity, 0);
        const totalValue = items.reduce((s, i) => s + i.quantity * i.sellingPrice, 0);
        // Spread transactions across the day (9am-9pm) for a plausible timestamp.
        const txDate = new Date(date);
        txDate.setHours(randInt(rng, 9, 21), randInt(rng, 0, 59));

        salesToInsert.push({
          id: saleId,
          storeId: store.id,
          transactionDate: txDate,
          totalItems,
          totalValue,
          source: pick(rng, ["voice", "search", "quickadd"]),
        });

        for (const item of items) {
          saleItemsToInsert.push({
            id: randomUUID(),
            saleId,
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            costPrice: item.costPrice,
            subtotal: item.quantity * item.sellingPrice,
          });
          invTxToInsert.push({
            id: randomUUID(),
            storeId: store.id,
            productId: item.productId,
            type: "SALE",
            quantity: -item.quantity,
            referenceId: saleId,
            createdAt: txDate,
          });
          totalSoldByProduct.set(
            item.productId,
            (totalSoldByProduct.get(item.productId) ?? 0) + item.quantity
          );
        }
      }
    }

    console.log(`  ${salesToInsert.length} historical sales, ${saleItemsToInsert.length} line items`);
    // Batch inserts in chunks to stay well under any single-query size limits.
    await batchCreateMany(prisma.sale, salesToInsert);
    await batchCreateMany(prisma.saleItem, saleItemsToInsert);
    await batchCreateMany(prisma.inventoryTransaction, invTxToInsert);

    // --- Set "current" stock -------------------------------------------------
    // Deliberately independent of the historical sales total above (this is
    // a snapshot of "today", not a running ledger balance) — chosen so some
    // products are comfortably stocked and others are low relative to their
    // recent average demand, which is what makes the recommendation screen
    // meaningful rather than uniformly boring.
    for (const p of productRecords) {
      const totalSold = totalSoldByProduct.get(p.id) ?? 0;
      const avgWeeklyDemand = totalSold / (HISTORY_DAYS / 7);
      const stockWeeksOnHand = rng() < 0.35 ? randFloat(rng, 0.2, 0.8) : randFloat(rng, 1, 3);
      const currentStock = Math.max(0, Math.round(avgWeeklyDemand * stockWeeksOnHand));
      await prisma.product.update({ where: { id: p.id }, data: { currentStock } });
    }
  }

  const [storeCount, productCount, saleCount, saleItemCount] = await Promise.all([
    prisma.store.count(),
    prisma.product.count(),
    prisma.sale.count(),
    prisma.saleItem.count(),
  ]);

  console.log("\nSeed complete:");
  console.log(`  Stores: ${storeCount}`);
  console.log(`  Products: ${productCount}`);
  console.log(`  Sales: ${saleCount} (${saleItemCount} line items)`);
  console.log(`  Login with STORE001 / STORE002 / STORE003, password "${PASSWORD}"`);
}

function randFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

// Prisma createMany can choke on very large arrays in one call — chunk it.
async function batchCreateMany<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: { createMany: (args: { data: T[] }) => Promise<any> },
  data: T[],
  chunkSize = 1000
) {
  for (let i = 0; i < data.length; i += chunkSize) {
    await delegate.createMany({ data: data.slice(i, i + chunkSize) });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
