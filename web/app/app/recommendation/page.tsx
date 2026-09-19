"use client";

import { useEffect, useState } from "react";
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
    return <p className="py-12 text-center text-sm text-gray-400">Loading recommendations...</p>;
  }

  if (error) {
    return <p className="py-12 text-center text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Weekly Recommendation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Based on your recent sales, current inventory, and upcoming events, here are your
          suggested orders.
        </p>
      </div>

      {!hasForecasts ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-700">No forecast yet for this store</p>
          <p className="mt-1 text-sm text-gray-400">
            The forecasting engine hasn&apos;t run for this store yet — this appears once{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">ml/training/train_model.py</code>{" "}
            and <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">ml/prediction/generate_forecasts.py</code>{" "}
            have been run.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{f.product.name}</p>
                  <p className="text-xs text-gray-400">{f.product.category}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  Order {f.recommendedOrder}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-gray-50 py-2">
                  <dt className="text-gray-400">Current stock</dt>
                  <dd className="mt-0.5 font-semibold text-gray-800">{f.currentStockSnapshot}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 py-2">
                  <dt className="text-gray-400">Predicted demand</dt>
                  <dd className="mt-0.5 font-semibold text-gray-800">
                    {Math.round(f.predictedDemand)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 py-2">
                  <dt className="text-gray-400">Recommended order</dt>
                  <dd className="mt-0.5 font-semibold text-gray-800">{f.recommendedOrder}</dd>
                </div>
              </dl>

              {f.expectedGrossProfit !== null && (
                <p className="mt-2 text-xs text-gray-500">
                  Expected gross profit if ordered: ₹{Math.round(f.expectedGrossProfit)}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500">{f.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
