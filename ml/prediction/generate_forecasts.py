"""
Generates next-week demand forecasts + profit-aware order recommendations
for every product in every store, and writes them to the `forecasts` table.

This is what the backend's GET /api/recommendations/weekly actually reads —
it never calls Python at request time. Run this after train_model.py:

    cd ml
    python prediction/generate_forecasts.py

Safe to re-run: it's an upsert keyed on (store_id, product_id, forecast_date,
model_version).
"""
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

import joblib
import pandas as pd
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_engine  # noqa: E402
from features.feature_builder import build_features, load_all_products, load_festivals, load_weekly_sales  # noqa: E402
from models.baseline import blend_with_store_history, moving_average_baseline  # noqa: E402

ML_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ML_ROOT, "models", "artifacts")

SAFETY_STOCK_Z = 1.28  # ~90% single-sided service level
FALLBACK_SAFETY_STOCK_RATIO = 0.2  # used when there's too little history for a std dev
COLD_START_FULL_WEEKS = 8


def next_week_start(last_week_start):
    if last_week_start is not None:
        return (last_week_start + pd.Timedelta(days=7)).to_pydatetime()
    # No history at all for this store yet — anchor to the upcoming Monday.
    today = datetime.now(timezone.utc)
    days_until_monday = (7 - today.weekday()) % 7 or 7
    return (today + timedelta(days=days_until_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def load_model():
    model_path = os.path.join(MODEL_DIR, "model.pkl")
    columns_path = os.path.join(MODEL_DIR, "columns.json")
    if not (os.path.exists(model_path) and os.path.exists(columns_path)):
        return None, None
    model = joblib.load(model_path)
    with open(columns_path) as f:
        meta = json.load(f)
    return model, meta


def build_explanation(
    *,
    trend: float,
    festival_in_week: bool,
    current_stock: float,
    predicted_demand: float,
    maturity_weeks: int,
) -> str:
    """Built only from factors that actually contributed — nothing generic."""
    parts = []
    if trend > 0.5:
        parts.append("recent demand has been trending up")
    elif trend < -0.5:
        parts.append("recent demand has been trending down")

    if festival_in_week:
        parts.append("a historically relevant festival falls within this forecast week")

    if current_stock < predicted_demand:
        parts.append("current stock is below the predicted week's demand")
    elif current_stock > predicted_demand * 2:
        parts.append("current stock is comfortably above predicted demand")

    if maturity_weeks < 3:
        parts.append(
            "this store has limited sales history so far, so this leans on category-level patterns"
        )

    if not parts:
        return "Based on this product's typical weekly demand at this store."
    return "Recommended because " + ", and ".join(parts) + "."


def main():
    engine = get_engine()
    weekly = load_weekly_sales(engine)
    festivals = load_festivals(engine)
    all_products = load_all_products(engine)

    if all_products.empty:
        print("No products found - run the seed script first.")
        return

    model, model_meta = load_model()
    model_version = model_meta["model_version"] if model_meta else "baseline-only"
    if model is None:
        print("No trained model found — falling back to the moving-average baseline for everything.")
        print("(Run training/train_model.py first for the refined, store-aware model.)")

    features = build_features(weekly, festivals) if not weekly.empty else pd.DataFrame()

    # Most recent feature row per (store, product) — this is "as of today",
    # used to build the row we feed the model/baseline for NEXT week.
    latest = (
        features.sort_values("week_start").groupby(["store_id", "product_id"]).tail(1)
        if not features.empty
        else pd.DataFrame()
    )

    # Category-level average weekly quantity, per store (fallback for
    # products with no history of their own yet) and globally (fallback for
    # a store with literally no history at all).
    category_avg_by_store = (
        features.groupby(["store_id", "category"])["quantity"].mean().to_dict()
        if not features.empty
        else {}
    )
    category_avg_global = (
        features.groupby("category")["quantity"].mean().to_dict() if not features.empty else {}
    )

    # Historical std dev per product, for safety stock. Falls back to the
    # ratio-of-demand rule when there's too little history.
    std_by_product = (
        features.groupby(["store_id", "product_id"])["quantity"].std().to_dict()
        if not features.empty
        else {}
    )

    weeks_per_store = (
        features.groupby("store_id")["week_start"].nunique().to_dict() if not features.empty else {}
    )
    last_week_by_store = (
        features.groupby("store_id")["week_start"].max().to_dict() if not features.empty else {}
    )

    forecast_rows = []
    now = datetime.now(timezone.utc)

    for _, product in all_products.iterrows():
        store_id = product["store_id"]
        product_id = product["product_id"]
        category = product["category"]
        weeks_of_store_data = int(weeks_per_store.get(store_id, 0))
        forecast_date = next_week_start(last_week_by_store.get(store_id))

        product_history = (
            latest[(latest["store_id"] == store_id) & (latest["product_id"] == product_id)]
            if not latest.empty
            else pd.DataFrame()
        )

        category_avg = category_avg_by_store.get(
            (store_id, category), category_avg_global.get(category, 0.0)
        )

        if product_history.empty:
            # This exact product has never sold at this store — no
            # product-specific signal exists yet, full stop; the category
            # average IS the forecast rather than a blend of nothing.
            predicted_demand = float(category_avg)
            trend = 0.0
            festival_in_week = False
            std_dev = None
        else:
            row = product_history.iloc[0]
            trend = float(row["trend"])
            festival_in_week = bool(row["festival_in_week"])

            baseline_pred = moving_average_baseline(row["rolling_avg_4w"], row["rolling_avg_8w"])

            model_pred = None
            if model is not None and model_meta is not None:
                feature_columns = model_meta["feature_columns"]
                x = {col: 0.0 for col in feature_columns}
                for col in model_meta["numeric"]:
                    if col in row:
                        x[col] = row[col]
                store_col = f"store_{store_id}"
                cat_col = f"cat_{category}"
                if store_col in x:
                    x[store_col] = 1.0
                if cat_col in x:
                    x[cat_col] = 1.0
                    model_pred = float(model.predict(pd.DataFrame([x]))[0])
                # If the store's own dummy column doesn't exist (it wasn't
                # part of the training run yet — a genuinely brand-new
                # store), the model has no way to represent it; fall back
                # to the baseline instead of guessing.
                if store_col not in x:
                    model_pred = None

            store_specific_prediction = model_pred if model_pred is not None else baseline_pred
            predicted_demand = blend_with_store_history(
                store_specific_prediction, category_avg, weeks_of_store_data, COLD_START_FULL_WEEKS
            )

            std_dev = std_by_product.get((store_id, product_id))

        predicted_demand = max(0.0, predicted_demand)
        safety_stock = (
            SAFETY_STOCK_Z * float(std_dev)
            if std_dev is not None and not pd.isna(std_dev)
            else predicted_demand * FALLBACK_SAFETY_STOCK_RATIO
        )

        current_stock = int(product["current_stock"])
        moq = int(product["supplier_moq"]) if pd.notna(product["supplier_moq"]) else 1
        raw_order = max(0.0, predicted_demand + safety_stock - current_stock)
        recommended_order = int(round(raw_order / moq)) * moq if raw_order > 0 else 0
        if 0 < recommended_order < moq:
            recommended_order = moq

        selling_price = float(product["selling_price"])
        cost_price = float(product["cost_price"])
        expected_revenue = predicted_demand * selling_price
        expected_cost = predicted_demand * cost_price
        expected_gross_profit = expected_revenue - expected_cost

        explanation = build_explanation(
            trend=trend,
            festival_in_week=festival_in_week,
            current_stock=current_stock,
            predicted_demand=predicted_demand,
            maturity_weeks=weeks_of_store_data,
        )

        forecast_rows.append(
            {
                "id": str(uuid.uuid4()),
                "store_id": store_id,
                "product_id": product_id,
                "forecast_date": forecast_date,
                "predicted_demand": predicted_demand,
                "safety_stock": safety_stock,
                "current_stock_snapshot": current_stock,
                "recommended_order": recommended_order,
                "expected_revenue": expected_revenue,
                "expected_cost": expected_cost,
                "expected_gross_profit": expected_gross_profit,
                "confidence": None,  # no statistically grounded per-row confidence yet — left null rather than guessed
                "explanation": explanation,
                "model_version": model_version,
                "created_at": now,
            }
        )

    print(f"Writing {len(forecast_rows)} forecast rows...")
    with engine.begin() as conn:
        # Forecasts represent "the current recommendation", not an
        # append-only log — clear out this store's old rows before writing
        # the fresh batch so re-running doesn't accumulate stale forecasts
        # from earlier model versions.
        for store_id in all_products["store_id"].unique():
            conn.execute(text("DELETE FROM forecasts WHERE store_id = :store_id"), {"store_id": store_id})

        for row in forecast_rows:
            conn.execute(
                text(
                    """
                    INSERT INTO forecasts
                        (id, store_id, product_id, forecast_date, predicted_demand,
                         safety_stock, current_stock_snapshot, recommended_order,
                         expected_revenue, expected_cost, expected_gross_profit,
                         confidence, explanation, model_version, created_at)
                    VALUES
                        (:id, :store_id, :product_id, :forecast_date, :predicted_demand,
                         :safety_stock, :current_stock_snapshot, :recommended_order,
                         :expected_revenue, :expected_cost, :expected_gross_profit,
                         :confidence, :explanation, :model_version, :created_at)
                    ON CONFLICT (store_id, product_id, forecast_date, model_version)
                    DO UPDATE SET
                        predicted_demand = EXCLUDED.predicted_demand,
                        safety_stock = EXCLUDED.safety_stock,
                        current_stock_snapshot = EXCLUDED.current_stock_snapshot,
                        recommended_order = EXCLUDED.recommended_order,
                        expected_revenue = EXCLUDED.expected_revenue,
                        expected_cost = EXCLUDED.expected_cost,
                        expected_gross_profit = EXCLUDED.expected_gross_profit,
                        explanation = EXCLUDED.explanation
                    """
                ),
                row,
            )

    print("Done. The Recommendation screen will now show these for each store.")


if __name__ == "__main__":
    main()
