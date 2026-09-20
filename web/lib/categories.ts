import { Cookie, CupSoda, Home, LucideIcon, Milk, Popcorn, Soup, Sparkles, Wheat } from "lucide-react";

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

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  Snacks: Popcorn,
  Beverages: CupSoda,
  Biscuits: Cookie,
  Dairy: Milk,
  "Personal Care": Sparkles,
  Household: Home,
  Staples: Wheat,
  "Instant Food": Soup,
};

export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICON[category] ?? Popcorn;
}
