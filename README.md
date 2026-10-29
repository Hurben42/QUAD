# QUAD

Launch a coin on Solana in four eras, priced in HYPE. Design done, backend in progress — start with `CLAUDE.md`.

```bash
pnpm install
cp .env.example .env.local        # fill RPC, quote mint, fee claimer
pnpm test                          # curve math (4 eras: halving coins, doubling price, equal HYPE)
pnpm config:devnet                 # creates the DBC partner config, prints NEXT_PUBLIC_DBC_CONFIG
pnpm dev                           # landing + launch form on http://localhost:3000
```

- `docs/MECHANISM.md` — the four rules and the curve math.
- `design/` — the design system (tokens, components, brand book) and the HTML mockups the site is built from.
- `public/brand/` — logo, app icon, official Hyperliquid mark, grain.
