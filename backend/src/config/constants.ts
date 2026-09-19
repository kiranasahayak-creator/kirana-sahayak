export const CATEGORIES = [
  "Snacks",
  "Beverages",
  "Biscuits",
  "Dairy",
  "Personal Care",
  "Household",
  "Staples",
  "Instant Food",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Small set of Indian festivals used as a model feature. Dates are for the
// current demo year and are meant to be re-seeded/updated periodically —
// they are NOT fetched from a live API (no reliable free one exists for this).
export const DEMO_FESTIVALS: { name: string; date: string; region?: string }[] = [
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Raksha Bandhan", date: "2026-08-28" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Christmas", date: "2026-12-25" },
  { name: "New Year", date: "2026-01-01" },
  { name: "Eid al-Fitr", date: "2026-03-20", region: "approx" },
];
