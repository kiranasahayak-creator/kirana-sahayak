"use client";

import { useEffect, useState } from "react";
import { getCategoryIcon } from "@/lib/categories";
import { api } from "@/lib/api";
import { Forecast } from "@/lib/types";

export default function RecommendationPage() {
  const [loading, setLoading] = useState(true);
  const [hasForecasts, setHasForecasts] = useState(false);
  const [recommendations, setRecommendations] = useState<Forecast[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .weeklyRecommendations()
      .then((data) => {
        setHasForecasts(data.hasForecasts);
        setRecommendations(data.recommendations);
      })
      .catch(() => setError("Couldn't load recommendations."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-12 text-center text-sm text-paper-400">Loading recommendations...</p>;
  }

  if (error) {
    return <p className="py-12 text-center text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-paper-900">Weekly Recommendation</h1>
        <p className="mt-1 text-sm text-paper-600">
          Based on your recent sales, current inventory, and upcoming events, here are your
          suggested orders.
        </p>
      </div>

      {!hasForecasts ? (
        <div className="rounded-2xl border border-paper-100 bg-white p-8 text-center shadow-card">
          <p className="font-display font-semibold text-paper-800">No forecast yet for this store</p>
          <p className="mt-1 text-sm text-paper-400">
            The forecasting engine hasn&apos;t run for this store yet — this appears once{" "}
            <code className="rounded bg-paper-100 px-1 py-0.5 text-xs">ml/training/train_model.py</code>{" "}
            and{" "}
            <code className="rounded bg-paper-100 px-1 py-0.5 text-xs">
              ml/prediction/generate_forecasts.py
            </code>{" "}
            have been run.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((f) => {
            const Icon = getCategoryIcon(f.product.category);
            return (
              <div
                key={f.id}
                className="rounded-2xl border border-paper-100 bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                      <Icon size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-paper-900">{f.product.name}</p>
                      <p className="text-xs text-paper-400">{f.product.category}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
                    Order {f.recommendedOrder}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-paper-50 py-2.5">
                    <dt className="text-[11px] text-paper-400">Current stock</dt>
                    <dd className="mt-0.5 font-display font-semibold text-paper-900">
                      {f.currentStockSnapshot}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-paper-50 py-2.5">
                    <dt className="text-[11px] text-paper-400">Predicted demand</dt>
                    <dd className="mt-0.5 font-display font-semibold text-paper-900">
                      {Math.round(f.predictedDemand)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-paper-50 py-2.5">
                    <dt className="text-[11px] text-paper-400">Recommended order</dt>
                    <dd className="mt-0.5 font-display font-semibold text-paper-900">
                      {f.recommendedOrder}
                    </dd>
                  </div>
                </dl>

                {f.expectedGrossProfit !== null && (
                  <p className="mt-3 text-xs text-paper-500">
                    Expected gross profit if ordered: ₹{Math.round(f.expectedGrossProfit)}
                  </p>
                )}

                <p className="mt-1.5 text-xs text-paper-500">{f.explanation}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
