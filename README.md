# Kirana Sahayak — Local Store Demand Forecast

Voice- and search-driven POS + inventory + demand forecasting for local
Indian retail stores. One shared forecasting engine, personalized per store
from its own sales history.

## Structure

- `backend/` — Express + TypeScript + Prisma API (auth, products, sales,
  inventory, recommendations, voice)
- `web/` — Next.js + TypeScript + Tailwind shopkeeper UI
- `ml/` — Python forecasting engine (one model, store-aware features)
- `flutter_app/` — Flutter mobile client (starter scaffold, expanded in the
  Flutter phase)

## Status

Core backend + web (Cart / Recommendation) + ML pipeline scaffolded.
Not yet connected to a live Neon database or a real Sarvam key — see
`docs/SETUP.md` for the steps to bring it up locally.

Demo credentials (after seeding): `STORE001` / `STORE002` / `STORE003`,
password `demo123` for all three.
