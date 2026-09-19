# Kirana Sahayak — ML forecasting engine

One pooled model across all stores (store identity is an input feature, not
a separate model per store), run periodically and directly against the same
Neon Postgres database the backend uses — never called synchronously by the
Node backend.

## Setup (Windows PowerShell)

```powershell
cd ml
py -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # only needed once per terminal
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit .env and paste the same DATABASE_URL you used in backend/.env
```

## Running it

Run these **after** the backend has been seeded (`npm run seed` in
`/backend`) or has real sales recorded:

```powershell
python training/train_model.py
python prediction/generate_forecasts.py
```

- `train_model.py` trains the model and writes evaluation metrics (honest
  MAE/RMSE, computed on a real held-out set of the most recent weeks — not
  fabricated) into `store_forecast_configs`.
- `generate_forecasts.py` uses the trained model (falling back to a moving-
  average baseline if no model has been trained yet) to write next-week
  demand + recommended order + explanation into `forecasts` — this is what
  the Recommendation screen reads.

Re-run both any time there's meaningfully more sales data. Neither is
triggered automatically per-sale — see the architecture notes in the root
README for why.

## What's simplified for the hackathon (documented, not hidden)

- **Weather** is structurally wired (the `weather_data` table exists, and
  `feature_builder.py` is where it would join in) but not yet populated —
  Open-Meteo integration is a follow-up, not required for the core voice →
  cart → sale → forecast demo.
- **Inventory history**: the seed data only captures a single "current
  stock" snapshot, not a day-by-day stock ledger, so current stock is used
  only in the order-quantity calculation at prediction time, not as a
  historical training feature.
- **Confidence**: forecast rows leave `confidence` as `null` rather than
  inventing a number — there's no statistically grounded per-row confidence
  interval computed yet. What *is* real: the per-store `evaluation_mae` /
  `evaluation_rmse` on `store_forecast_configs`, computed from an actual
  held-out set.

## Folder layout

```
ml/
├── db.py                       # shared SQLAlchemy engine
├── features/feature_builder.py # weekly aggregation + feature engineering
├── models/baseline.py          # moving-average baseline + cold-start blend
├── evaluation/metrics.py       # MAE / RMSE / MAPE
├── training/train_model.py     # trains + evaluates + saves model.pkl
└── prediction/generate_forecasts.py  # writes `forecasts` rows
```
