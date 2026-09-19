export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  packSize: string | null;
  unit: string | null;
  sellingPrice: number;
  costPrice: number;
  currentStock: number;
  reorderLevel: number;
  imageUrl?: string | null;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export type MatchStatus = "confident" | "ambiguous" | "unmatched";

export interface MatchCandidate {
  productId: string;
  name: string;
  brand: string | null;
  packSize: string | null;
  sellingPrice: number;
  confidence: number;
}

export interface VoiceItem {
  rawText: string;
  quantity: number;
  status: MatchStatus;
  matches: MatchCandidate[];
}

export interface VoiceTranscribeResponse {
  transcript: string;
  items: VoiceItem[];
}

export interface Forecast {
  id: string;
  productId: string;
  product: Product;
  forecastDate: string;
  predictedDemand: number;
  safetyStock: number;
  currentStockSnapshot: number;
  recommendedOrder: number;
  expectedRevenue: number | null;
  expectedCost: number | null;
  expectedGrossProfit: number | null;
  confidence: number | null;
  explanation: string;
  modelVersion: string;
}

export interface WeeklyRecommendationsResponse {
  hasForecasts: boolean;
  recommendations: Forecast[];
}
