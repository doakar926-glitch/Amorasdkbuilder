# Tidepool — launchpad on the Ammora SDK

Vite + React + TypeScript app that lists launches from the Ammora Data API (GIWA Sepolia, chain 91342)
using `@ammora-protocol/sdk@0.2.13`.

## Run locally
```sh
npm install
cp .env.example .env
npm run dev
```

## Deploy
1. Push to a GitHub repo.
2. In Vercel: Add New → Project → import the repo (framework: Vite, build `npm run build`, output `dist`).
3. Optional env var: `VITE_AMMORA_DATA_API`.
4. Submit the Vercel URL in the Ammora mission form and post on X.

Beta testnet software. Do not use real funds.
