# The four rules — and how they map to a Meteora DBC config

Every QUAD coin is a Meteora Dynamic Bonding Curve virtual pool created from one partner config key. The config fixes the rules at launch; nobody edits them after.

| Rule | DBC parameter |
|---|---|
| 21,000,000 coins, minted once | `tokenSupply.preMigrationTokenSupply = postMigrationTokenSupply = 21_000_000 × 10^decimals`; mint authority is revoked by the program at pool creation; no freeze authority |
| Quoted in HYPE | `quoteMint = 98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g`, `collectFeeMode = 0` (fees in quote only → creators are paid in HYPE) |
| Four eras, each selling half the coins of the last for the same HYPE | `curve` = 4 segments `{sqrtPrice, liquidity}` built by `lib/curve.ts` (below) |
| Creator earns 2.5% of every trade | `baseFee` 3.125% (`cliffFeeNumerator` ends at 31_250_000 / 1e9), `creatorTradingFeePercentage = 100` → protocol 0.625%, creator 2.5%. Platform revenue: set it to 50 and the platform (`feeClaimer`) takes 1.25% |
| 50% anti-sniper fee on the first buy | fee scheduler: `cliffFeeNumerator = 500_000_000`, exponential decay to 31_250_000 over `numberOfPeriod` slots |
| Graduation | `migrationOption = 1` (DAMM v2), `migrationQuoteThreshold` in HYPE lamports, LP 100% locked (`partnerLockedLpPercentage + creatorLockedLpPercentage = 100`), post-migration fee tier via `migrationFeeOption` |

## The curve math (lib/curve.ts)

Notation: `Q` = migration quote threshold (HYPE lamports), `B` = base tokens sold on the curve (lamports), `P` = price in quote-lamports per base-lamport, `s = sqrt(P) × 2^64` (Q64 sqrt price, what the program stores).

- Equal HYPE per era: `quote_i = Q / 4`.
- Price doubles per era: `sqrtP_i = sqrtP_0 × 2^(i/2)`, so `P_4 = 16 × P_0`.
- Base sold in era i on a constant-product segment: `base_i = quote_i / (sqrtP_{i-1} × sqrtP_i) = (Q/4) / (P_0 × 2^(i-0.5))`, which halves every era (8/15, 4/15, 2/15, 1/15 of `B`).
- Summing the four eras: `B = (Q/4) / P_0 × √2 × 15/16` ⇒ `P_0 = (Q/4) × √2 × 15/16 / B`.
- Liquidity in the program's scaling: `liquidity_i = quote_i × 2^128 / (s_i − s_{i-1})`.
- Check (the program's own formulas): `quote_i = liquidity_i × (s_i − s_{i-1}) / 2^128`, `base_i = liquidity_i × (s_i − s_{i-1}) / (s_{i-1} × s_i)`.

Migration: the program moves `Q × (1 − migrationFee)` of HYPE plus `migrationBase = Q × (1 − migrationFee) / P_4` base tokens into the DAMM v2 pool. With `P_4 = 16 P_0` that is `k × B` with `k = 4 / (15 √2) ≈ 0.1886`. To use the whole supply with no leftover, the curve sells `B = supply / (1 + k) ≈ 84.1%` and migration takes ≈ 15.9%. `lib/curve.ts` computes `B` from the supply this way; any rounding dust goes to `leftoverReceiver`.

Things to verify on devnet before mainnet (the SDK evolves faster than this doc):

1. That the SDK's own helpers recompute the same `base_i` / `quote_i` from the config you created (compare with `verifyCurve()` in `lib/curve.ts`).
2. The exact field names for the fee scheduler and for the "first swap at minimum fee" option in the installed SDK version.
3. HYPE's decimals and token program on Solana — read on-chain (`lib/hype.ts`), never assumed.
4. The DAMM v2 migration validation rules in the installed version (fee tier options, whether a fee scheduler on the DBC config is accepted).
