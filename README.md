# Petrochemical Downstream DB

Modern Vercel-ready rebuild of the original Streamlit petrochemical downstream database.

## What Changed

- Replaced Streamlit screens with a Next.js App Router web app.
- Preserved the Excel-driven data model from `db.xlsx` and `trade.xlsx`.
- Added a build-time converter that writes API-readable JSON to `data/generated/petro-data.json`.
- Preserved the core logic from the original app:
  - material master and route master
  - route input/output links
  - route-to-licensor mapping
  - material-to-supplier mapping and capacity summaries
  - trade status/regime classification
  - derivative shortlist priority buckets
  - stream graph traversal and filtering of hidden materials
- Added modern drill-down pages for streams, materials, shortlist screening, and global search.

The original Streamlit source is kept under `petro_db-main/` for reference.

## Project Structure

```text
app/
  page.tsx                    Landing stream dashboard
  streams/[stream]/page.tsx   Detailed downstream stream map
  materials/[material_id]/page.tsx
  shortlist/page.tsx
  search/page.tsx
components/
  StreamMap.tsx
  ShortlistClient.tsx
  SearchClient.tsx
  TradeBars.tsx
data/
  source/
    db.xlsx
    trade.xlsx
  generated/
    petro-data.json
lib/
  data.ts
  types.ts
scripts/
  build-data.mjs
petro_db-main/                Original uploaded Streamlit app
```

## Local Run

Install dependencies:

```bash
npm install
```

Generate JSON from the Excel workbooks:

```bash
npm run data:build
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Use the default Next.js settings.
4. Vercel will run `npm run build`, which automatically runs `npm run data:build` first.

The Excel files are read only at build time from `data/source`. The deployed app serves the generated JSON-backed pages without Streamlit or Python.

## Updating Data

Replace:

- `data/source/db.xlsx`
- `data/source/trade.xlsx`

Then run:

```bash
npm run data:build
```

Commit both the Excel changes and the regenerated `data/generated/petro-data.json` if you want deterministic previews.

## Notes On Preserved Logic

The shortlist priority logic follows the Streamlit page:

- `A`: Axens/Lummus licensable route plus net import
- `B`: Axens/Lummus plus no trade data/export/balanced and domestic supplier
- `C`: Other licensable route plus net import
- `D`: Other licensable route plus no trade data/export/balanced and domestic supplier
- `E`: Remaining materials

Trade status uses the latest year net export/import value. Trade regime uses the sign pattern across historical years, matching the intent of the Streamlit chart logic.
