import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeDecimals } from "../utils/money";

/**
 * Returns the most recent forecast row per product for this store.
 *
 * Forecasts are written by the Python ML pipeline (ml/prediction), not
 * computed on the fly here — this endpoint only ever reads what's actually
 * in the database. If the ML pipeline hasn't run yet for this store, this
 * correctly returns an empty list rather than inventing numbers.
 */
export const getWeeklyRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const storeId = req.storeId!;

  const latestPerProduct = await prisma.forecast.groupBy({
    by: ["productId"],
    where: { storeId },
    _max: { forecastDate: true },
  });

  if (latestPerProduct.length === 0) {
    return res.json({ hasForecasts: false, recommendations: [] });
  }

  const forecasts = await Promise.all(
    latestPerProduct.map(({ productId, _max }) =>
      prisma.forecast.findFirst({
        where: { storeId, productId, forecastDate: _max.forecastDate! },
        include: { product: true },
        orderBy: { createdAt: "desc" },
      })
    )
  );

  const recommendations = forecasts
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => b.recommendedOrder - a.recommendedOrder);

  res.json({ hasForecasts: true, recommendations: serializeDecimals(recommendations) });
});
