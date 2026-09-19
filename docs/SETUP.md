# Setup guide (Windows 11 / PowerShell / VS Code)

Everything below assumes VS Code with 3-4 separate integrated PowerShell
terminals open (Backend, Web, ML, and optionally Flutter) — that's called
out per step.

## 0. Prerequisites

```powershell
node -v      # need 18+
python --version   # need 3.10+
git --version
```

If any are missing:
```powershell
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install Git.Git
```

## 1. Neon (Postgres)

1. On neon.tech, create a project.
2. Copy the connection string from the dashboard — it looks like
   `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`. Keep the
   `?sslmode=require` part.

## 2. Backend — Terminal 1

```powershell
cd backend
npm install
copy .env.example .env
```

Open `.env` and fill in:
- `DATABASE_URL` — the Neon string from step 1
- `JWT_SECRET` — generate one:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `SARVAM_API_KEY` — from https://dashboard.sarvam.ai (leave blank if you
  don't have one yet; voice will automatically fall back to native browser
  speech recognition / manual search, everything else still works)

Then:
```powershell
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

You should see `Kirana Sahayak backend listening on http://localhost:4000`.

**Test it:**
```powershell
curl http://localhost:4000/health
curl -X POST http://localhost:4000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"storeCode\":\"STORE001\",\"password\":\"demo123\"}'
```
The second command should return a `token`.

## 3. Web — Terminal 2

```powershell
cd web
npm install
copy .env.local.example .env.local
npm run dev
```

Open http://localhost:3000 — log in with `STORE001` / `demo123`, add
products via search or quick add, press SEND. Check that inventory
(`GET /api/inventory` or the quick-add cards after a refresh) reflects the
new stock.

## 4. ML pipeline — Terminal 3

```powershell
cd ml
py -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `ml\.env` and paste the **same** `DATABASE_URL` as `backend\.env`.

```powershell
python training/train_model.py
python prediction/generate_forecasts.py
```

Now open the Recommendation tab in the web app — it should show real
numbers per product instead of the "no forecast yet" empty state.

## 5. Sarvam (voice)

If you added `SARVAM_API_KEY` in step 2, the mic button on the Cart page
calls it directly. If not, or if it fails at demo time, the mic button
automatically retries with the browser's built-in speech recognition and
still works end-to-end (just without Sarvam's Indic-language accuracy) —
this fallback path is real code, not a stub.

## 6. Live demo script

1. Log in as `STORE001`.
2. Cart tab → tap the mic → say "2 blue lays and 3 coke".
3. Confirm the cart fills in; edit a quantity if you want to show that off.
4. Press SEND → "Sale recorded successfully".
5. Recommendation tab → point out a product whose recommended order changed
   because current stock is now lower.
6. Mention: *"Every store runs the same forecasting engine — this
   recommendation is personalized using STORE001's own sales history."*

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `prisma generate` hangs or 403s | Corporate firewall/proxy blocking `binaries.prisma.sh` | Try from an unrestricted network, or see Prisma's docs on custom engine mirrors |
| Backend won't start: "Missing required environment variable" | `.env` not filled in | Check every value in `backend/.env` is set (see step 2) |
| Web app can't reach the backend | `NEXT_PUBLIC_API_URL` wrong, or backend not running | Confirm Terminal 1 shows the backend listening, and `.env.local` points at it |
| Mic button always falls back to native speech | `SARVAM_API_KEY` blank, or Sarvam credits exhausted | Check `backend/.env`; this is the intended fallback behavior, not a bug |
| Recommendation page always empty | ML pipeline hasn't been run yet | Run `train_model.py` then `generate_forecasts.py` (step 4) |
| `venv\Scripts\Activate.ps1` refuses to run | PowerShell's default execution policy | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal |
| `npm install` in `backend` fails building `bcrypt` | Wrong dependency — this project uses `bcryptjs` (pure JS, no native build step) specifically to avoid this on Windows | Confirm `package.json` says `bcryptjs`, not `bcrypt` |
