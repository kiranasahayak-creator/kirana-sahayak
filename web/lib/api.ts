import { getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!options.skipAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (storeCode: string, password: string) =>
    request<{ token: string; store: { storeCode: string; storeName: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ storeCode, password }), skipAuth: true }
    ),

  searchProducts: (q: string) =>
    request<import("./types").Product[]>(`/api/products/search?q=${encodeURIComponent(q)}`),

  listProducts: (category?: string) =>
    request<import("./types").Product[]>(
      `/api/products${category ? `?category=${encodeURIComponent(category)}` : ""}`
    ),

  createSale: (items: { productId: string; quantity: number }[], source: string) =>
    request("/api/sales", { method: "POST", body: JSON.stringify({ items, source }) }),

  transcribeVoice: (audioBlob: Blob, languageCode?: string) => {
    const form = new FormData();
    form.append("audio", audioBlob, "clip.webm");
    if (languageCode) form.append("languageCode", languageCode);
    return request<import("./types").VoiceTranscribeResponse>("/api/voice/transcribe", {
      method: "POST",
      body: form,
    });
  },

  // Used by the native-speech-recognition fallback: skips Sarvam, reuses the
  // same server-side parse + product-matching pipeline on a transcript the
  // browser's own speech recognizer already produced.
  submitTranscript: (transcript: string) =>
    request<import("./types").VoiceTranscribeResponse>("/api/voice/transcribe", {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }),

  weeklyRecommendations: () =>
    request<import("./types").WeeklyRecommendationsResponse>("/api/recommendations/weekly"),

  storeProfile: () =>
    request<{
      store: { storeCode: string; storeName: string; location: string | null };
      modelStatus: Record<string, unknown>;
    }>("/api/store/profile"),
};
