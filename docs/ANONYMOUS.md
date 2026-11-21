# Anonymous launches

A coin launched without a creator wallet. The curve, the trades and the fees are the same public
Meteora DBC pool as any QUAD coin; only who pays for and signs the launch changes.

## Flow

1. **Claim secret, in the browser.** The launch form draws 32 random bytes and shows them as
   `quad-claim-<base58>`. The claim key is `Keypair.fromSeed(seed)`. Only its public key leaves the
   browser. QUAD never sees the secret and cannot recover it.
2. **Order.** `POST /api/anon/orders` with the coin (name, ticker, description, image, links), the
   first buy in HYPE (capped, see below) and the claim key. The server answers with a one-time
   deposit address and an amount in SOL.
3. **Private payment.** The creator pays that address from a private balance: a withdrawal from
   Privacy Cash or a Privacy Ring. Payment is in SOL because Privacy Cash only allowlists SOL,
   USDC, USDT, ORE and ZEC, so HYPE cannot be paid privately; the treasury provides the HYPE of the
   first buy at the quoted rate.
4. **Queue.** Once the deposit holds the amount, it is swept to the treasury and the launch is
   scheduled at a random time `ANON_DELAY_MIN_S`–`ANON_DELAY_MAX_S` later, so a payment and the
   token it pays for do not line up in time.
5. **Launch.** The server generates a burner key, funds it from the treasury (SOL for rent and
   fees, HYPE for the first buy), and the burner signs one transaction:
   `create pool` + `first buy` (buyer: burner, receiver: claim key) + `transfer_pool_creator`
   (to the claim key). The burner's leftovers go back to the treasury and the key is dropped.
6. **Claim.** `/claim`: the creator pastes the secret, the browser derives the claim key, finds its
   pools (`getPoolsByCreator`), and signs a fee claim (`claimCreatorTradingFee` to a receiver) or a
   token withdrawal (`transferChecked`) to any address. The claim key holds no SOL, so the relayer
   (`/api/anon/relay`) pays the network fee and co-signs.

The "hash stored on-chain" of the design note is the claim key itself: the pool's `creator`
field commits to the secret, and only the secret can sign for it. No custom program.

## Relayer rules

The relayer signs only as fee payer. A transaction is refused unless every instruction is one of:
Compute Budget; Associated Token `create`/`createIdempotent` (the relayer may fund it);
SPL Token `transferChecked` of HYPE or a QUAD base mint, signed by an authority other than the
relayer; DBC `claim_creator_trading_fee` on a pool of the QUAD config, signed by a creator other
than the relayer. The relayer may appear in no other account list. The transaction is simulated
before sending and refused if the relayer would lose more than `RELAY_MAX_SPEND_SOL`.

## Guardrails

- **First buy cap**: `ANON_FIRST_BUY_CAP_SHARE` of the graduation threshold (`lib/curve.ts`).
- **Badge**: anonymous pools are listed in the server's order index and flagged in `/api/pools`;
  the list, the token page and its on-chain section say so.
- **Not done** (each needs custody or a program): vesting the creator's first buy, and deferring
  creator fees until graduation. The way without a program is for the burner to keep the creator
  role until migration, then transfer it, which means QUAD holds a key for the life of the curve.

## Limits, said to users

- The privacy comes from the private balance the creator pays from. Paying from a usual wallet
  links it to the deposit address on-chain.
- The default Privacy Ring hides amounts, not addresses.
- QUAD's server knows which deposit paid for which launch. Orders live in `ANON_DATA_DIR`
  (default `.data/anon`, gitignored) with the deposit keys: production needs a database and a KMS.
- Lose the secret, lose the fees and the first buy. Nobody can recover them.

## Configuration

| Variable | Default | |
|---|---|---|
| `ANON_TREASURY_KEYPAIR` | `PAYER_KEYPAIR` | funds burners, receives deposits, holds HYPE for first buys |
| `ANON_RELAYER_KEYPAIR` | the treasury | pays claim fees |
| `ANON_HYPE_PER_SOL` | Jupiter price on mainnet; required on devnet | the SOL→HYPE rate of a quote |
| `ANON_DELAY_MIN_S` / `ANON_DELAY_MAX_S` | 300 / 1800 (devnet 30 / 120) | the launch delay after payment |
| `ANON_WORKER_TOKEN` | none | bearer token of `POST /api/anon/process` (`pnpm anon:worker`) |
| `ANON_DATA_DIR` | `.data/anon` | the order store |
