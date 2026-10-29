# QUAD

Launch a coin on Solana in four eras, priced in HYPE. Design done, backend in progress — start with `CLAUDE.md`.

```bash
pnpm install
cp .env.example .env.local        # fill RPC, quote mint, fee claimer; keys/payer.json for scripts
pnpm test                          # curve math + config checked against the DBC SDK's own helpers
pnpm mint:devnet                   # devnet: 8-decimal test HYPE, prints NEXT_PUBLIC_QUOTE_MINT (TEST_WALLET=<pubkey> to fund your wallet)
pnpm config:devnet                 # creates the DBC partner config, prints NEXT_PUBLIC_DBC_CONFIG
pnpm config:verify                 # reads the config back from chain and compares it with lib/curve.ts
pnpm dev                           # http://localhost:3000 — landing, /launch (wizard), /creator (fees), /docs
pnpm launch:devnet                 # devnet: launch a coin with the payer key (needs pnpm dev for /api/metadata)
```

- `docs/MECHANISM.md` — the four rules and the curve math.
- `design/` — the design system (tokens, components, brand book) and the HTML mockups the site is built from.
- `public/brand/` — logo, app icon, official Hyperliquid mark, grain.
