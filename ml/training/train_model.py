"""
Trains ONE Gradient Boosting model across ALL stores' pooled weekly sales
data. Store identity is an input feature (one-hot column), not a separate
model per store — this is what makes "one common engine, personalized per
store" actually work mechanically rather than being a slogan.

Run manually (or on a schedule later) — this is NOT called by the Node
backend and does NOT run after every sale:

    cd ml
    python training/train_model.py

Writes:
  - models/artifacts/model.pkl + columns.json  (the trained model)
  - store_forecast_configs rows                (per-store evaluation, honestly
                                                 computed on a held-out set)
"""
import json
import os
import sys
import uuid
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_engine  # noqa: E402
from evaluation.metrics import mae, mape, rmse  # noqa: E402
from features.feature_builder import (  # noqa: E402
    NUMERIC_FEATURE_COLUMNS,
    build_features,
    load_festivals,
    load_weekly_sales,
)

ML_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ML_ROOT, "models", "artifacts")
os.makedirs(MODEL_DIR, exist_ok=True)

HOLDOUT_WEEKS = 2  # most recent N weeks held out for honest evaluation


def main():
    engine = get_engine()
    weekly = load_weekly_sales(engine)
    festivals = load_festivals(engine)

    if weekly.empty:
        print("No sales data found in the database - nothing to train on.")
        print("Run `npm run seed` in /backend first (or record some real sales).")
        return

    features = build_features(weekly, festivals)
    if features.empty:
        print("Every product has fewer than 2 weeks of history - nothing usable to train on yet.")
        return

    # One-hot encode the small-cardinality categoricals as ADDITIONAL columns
    # (concat, not pd.get_dummies(..., columns=[...]) in place) — we still
    # need the original store_id/category columns afterward for the
    # per-store evaluation grouping below.
    store_dummies = pd.get_dummies(features["store_id"], prefix="store")
    cat_dummies = pd.get_dummies(features["category"], prefix="cat")
    encoded = pd.concat([features, store_dummies, cat_dummies], axis=1)
    dummy_columns = list(store_dummies.columns) + list(cat_dummies.columns)
    feature_columns = NUMERIC_FEATURE_COLUMNS + dummy_columns
    encoded = encoded.sort_values("week_start").reset_index(drop=True)

    distinct_weeks = sorted(encoded["week_start"].unique())
    if len(distinct_weeks) <= HOLDOUT_WEEKS:
        print(
            f"Only {len(distinct_weeks)} distinct week(s) of data - training on everything, "
            "per-store evaluation will be null until more weeks accumulate."
        )
        train_df, test_df = encoded, encoded.iloc[0:0]
    else:
        split_week = distinct_weeks[-HOLDOUT_WEEKS]
        train_df = encoded[encoded["week_start"] < split_week]
        test_df = encoded[encoded["week_start"] >= split_week]

    model = GradientBoostingRegressor(
        random_state=42, n_estimators=150, max_depth=3, learning_rate=0.08
    )
    model.fit(train_df[feature_columns], train_df["quantity"])

    model_version = f"gb-v1-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
    joblib.dump(model, os.path.join(MODEL_DIR, "model.pkl"))
    with open(os.path.join(MODEL_DIR, "columns.json"), "w") as f:
        json.dump(
            {
                "feature_columns": feature_columns,
                "numeric": NUMERIC_FEATURE_COLUMNS,
                "model_version": model_version,
            },
            f,
        )
    print(f"Trained {model_version} on {len(train_df)} rows across {encoded['store_id'].nunique()} stores.")

    # Per-store evaluation on the holdout weeks — real numbers per store,
    # never a global figure copy-pasted onto every store's status card.
    per_store_metrics: dict[str, dict] = {}
    if not test_df.empty:
        preds = model.predict(test_df[feature_columns])
        test_df = test_df.assign(prediction=preds)
        for store_id, group in test_df.groupby("store_id"):
            per_store_metrics[store_id] = {
                "mae": mae(group["quantity"], group["prediction"]),
                "rmse": rmse(group["quantity"], group["prediction"]),
                "mape": mape(group["quantity"], group["prediction"]),
            }
            m = per_store_metrics[store_id]
            print(f"  {store_id}: MAE={m['mae']:.2f}  RMSE={m['rmse']:.2f}")
    else:
        print("  (no holdout weeks available yet)")

    weeks_per_store = features.groupby("store_id")["week_start"].nunique().to_dict()
    training_from = features["week_start"].min().to_pydatetime()
    training_to = features["week_start"].max().to_pydatetime()
    now = datetime.now(timezone.utc)

    with engine.begin() as conn:
        for store_id in features["store_id"].unique():
            weeks = int(weeks_per_store.get(store_id, 0))
            maturity = "cold_start" if weeks < 3 else "warming" if weeks < 8 else "mature"
            metrics = per_store_metrics.get(store_id, {"mae": None, "rmse": None, "mape": None})

            conn.execute(
                text(
                    """
                    INSERT INTO store_forecast_configs
                        (id, store_id, model_version, parameters, data_maturity,
                         last_trained_at, training_data_from, training_data_to,
                         evaluation_mae, evaluation_rmse, evaluation_mape,
                         created_at, updated_at)
                    VALUES
                        (:id, :store_id, :model_version, CAST(:parameters AS jsonb), :maturity,
                         :trained_at, :from_date, :to_date, :mae, :rmse, :mape, :now, :now)
                    ON CONFLICT (store_id) DO UPDATE SET
                        model_version = EXCLUDED.model_version,
                        parameters = EXCLUDED.parameters,
                        data_maturity = EXCLUDED.data_maturity,
                        last_trained_at = EXCLUDED.last_trained_at,
                        training_data_from = EXCLUDED.training_data_from,
                        training_data_to = EXCLUDED.training_data_to,
                        evaluation_mae = EXCLUDED.evaluation_mae,
                        evaluation_rmse = EXCLUDED.evaluation_rmse,
                        evaluation_mape = EXCLUDED.evaluation_mape,
                        updated_at = EXCLUDED.updated_at
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "store_id": store_id,
                    "model_version": model_version,
                    "parameters": json.dumps({"weeks_of_history": weeks}),
                    "maturity": maturity,
                    "trained_at": now,
                    "from_date": training_from,
                    "to_date": training_to,
                    "mae": metrics["mae"],
                    "rmse": metrics["rmse"],
                    "mape": metrics["mape"],
                    "now": now,
                },
            )

    print("store_forecast_configs updated for all stores.")
    print("Next: python prediction/generate_forecasts.py")


if __name__ == "__main__":
    main()
