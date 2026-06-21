# Petrochemical Downstream DB

Modern Vercel-ready rebuild of the original Streamlit petrochemical downstream database.

## What Changed

- Replaced Streamlit screens with a Next.js App Router web app.
- Preserved the Excel-driven data model from `db.xlsx` and `db_screen.xlsx`.
- Added a deploy DB converter that writes API-readable JSON to `public/data/deploy_db.json`.
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
    db_screen.xlsx
    trade.xlsx
    deploy_db_0616.xlsx       Fallback screen workbook if db_screen.xlsx is absent
  generated/
    petro-data.json
public/
  data/
    deploy_db.json
lib/
  data.ts
  types.ts
scripts/
  build-data.mjs
  build-deploy-db.ts
petro_db-main/                Original uploaded Streamlit app
```

## Local Run

Install dependencies:

```bash
npm install
```

Generate the deploy DB JSON from the working Excel workbooks:

```bash
npm run deploy-db:build
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
4. Vercel will run `npm run build`.

Vercel does not parse the source Excel files during deployment. The deployable app uses committed JSON artifacts, including `public/data/deploy_db.json`, without Streamlit or Python.

## Updating Data

Replace:

- `data/source/db.xlsx`
- `data/source/db_screen.xlsx` if present, or `data/source/deploy_db_0616.xlsx` as the current fallback screen workbook

Then run:

```bash
npm run deploy-db:build
```

Commit both the Excel changes and the regenerated `public/data/deploy_db.json` if you want deterministic previews.

`npm run data:build` remains available as the legacy converter for `data/generated/petro-data.json`, but it is no longer wired into `npm run build`.

## Notes On Preserved Logic

The shortlist priority logic follows the Streamlit page:

- `A`: Axens/Lummus licensable route plus net import
- `B`: Axens/Lummus plus no trade data/export/balanced and domestic supplier
- `C`: Other licensable route plus net import
- `D`: Other licensable route plus no trade data/export/balanced and domestic supplier
- `E`: Remaining materials

Trade status uses the latest year net export/import value. Trade regime uses the sign pattern across historical years, matching the intent of the Streamlit chart logic.
