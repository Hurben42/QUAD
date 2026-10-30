# QUAD — launchpad Solana, coins pairés à HYPE

Tu reprends un projet dont le design est fini et dont le backend tourne sur devnet (voir « Ce qui est fait »). Lis ce fichier en entier avant de toucher au code, puis `docs/MECHANISM.md`.

## Ce qu'est QUAD

Un launchpad sur Solana. Chaque coin lancé sur QUAD :

1. a une supply fixe de **1 000 000 000** (comme HYPE), mintée en une seule transaction, mint authority révoquée, pas de freeze authority ;
2. est **quoté en HYPE** (le token Hyperliquid bridgé sur Solana via Wormhole NTT, mint `98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g`) ;
3. se vend sur une bonding curve en **4 eras** : chaque era vend deux fois moins de coins que la précédente pour la même quantité de HYPE, donc le prix moyen double à chaque era (8/15, 4/15, 2/15, 1/15 des coins de la curve) ;
4. paie son **créateur en HYPE** : 2,5 % de chaque trade (fee totale 3,125 %, dont 20 % pour le protocole Meteora), sur la curve puis après graduation ; fee anti-sniper de 50 % sur le premier buy, sauf pour le buy du créateur dans la tx de lancement.

Tout cela tourne sur le **Dynamic Bonding Curve (DBC) de Meteora** : aucun programme on-chain custom. Le backend = une clé de config DBC + le front qui crée les pools + un indexeur léger.

## Stack

- Next.js 15 (app router) + TypeScript, Tailwind non utilisé : les styles sont dans `app/globals.css` (tokens + composants) — ne pas en ajouter d'autres.
- `@solana/web3.js`, `@solana/wallet-adapter-*`, `@meteora-ag/dynamic-bonding-curve-sdk`, `bn.js`.
- Mainnet et devnet : même program id DBC `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`.

## Arborescence

- `scripts/create-config.ts` — crée la clé de config DBC (quote HYPE, 4 eras, fees, supply fixe, migration DAMM v2). À lancer une fois par environnement.
- `lib/curve.ts` — la math des 4 eras (prix, liquidités, vérification). Pure, testée dans `test/curve.test.ts`.
- `lib/dbc.ts` — helpers client : créer un pool (+ first buy), lister les pools de la config, progression, fees.
- `lib/hype.ts` — constantes HYPE (mint, décimales lues on-chain, token program).
- `app/` — la landing (`page.tsx`) et le formulaire de lancement. `design/website/*.html` est la maquette de référence pixel par pixel : reproduire ces sections, pas en inventer.
- `components/` — Lockup, Button, EraSteps, CoinRow, LaunchForm.
- `design/design-system/` — `tokens.json` (couleurs dark/light, type, espaces, rayons), `bundle.css` (classes `.q-*`), `BRAND.md` (règles d'usage). `app/globals.css` en est la compilation : s'y référer, ne pas inventer de couleurs.
- `public/brand/` — le logo QUAD (dégradé / encre / blanc), l'icône app, le mark Hyperliquid officiel (`hyperliquid-blob-green.svg`, issu du brand kit officiel ; ne jamais le recolorer ni le déformer), le grain.

## Règles de marque (résumé, détail dans `design/design-system/BRAND.md`)

- Dark par défaut (`--surface-0 #0b0d18`). Quatre couleurs d'era, jamais une palette au choix : `era-1 #1b27f5` → `era-2 #7136fe` → `era-3 #e04d71` → `era-4 #f88262`. Les dégradés vont toujours du bleu à l'ember.
- `brand` = `era-4` (ember) est la seule couleur d'action ; texte posé dessus = encre.
- Manrope (500/700/800) pour le texte, JetBrains Mono 600 pour tout chiffre, label et ticker. Étiquettes mono en capitales numérotées : `01 / LAUNCH`.
- Le logo QUAD n'est jamais redessiné : `public/brand/quad-mark*.svg`.
- Copy en anglais, courte, déclarative. Pas d'emoji. « HYPE » en capitales. QUAD est pairé à HYPE, pas affilié à Hyperliquid : ne jamais suggérer l'inverse.

## Ce qui est fait

- Design system complet (tokens, composants, logo, icône app) et maquettes HTML desktop + mobile.
- Front complet : landing, `/launch` (wizard en 4 eras), `/rules`, `/docs`, `/creators`, `/creator`, modal wallet QUAD, header fixe, menu mobile.
- Math de la curve alignée sur le programme DBC (arrondis par segment, migration DAMM v2), `pnpm test` : 26 tests, dont les helpers du SDK 1.5.13 comme oracle.
- Backend câblé : `scripts/create-config.ts`, upload des métadonnées sur Irys via `/api/metadata`, lancement d'un pool avec first buy en une signature (`lib/dbc.ts#buildLaunchTx`), liste des pools via `/api/pools` (cache 5 s), claim des fees créateur et retrait du surplus sur `/creator`.
- **Validé sur devnet le 30 octobre 2026**, de bout en bout : mint HYPE de test, config DBC relue par `pnpm config:verify` (13 valeurs identiques au lamport près à `lib/curve.ts`), lancement d'un coin avec first buy de 1 HYPE, affiché sur la landing. Le buy du créateur paie la fee normale de 3,125 %, pas les 50 % anti-sniper.
- **Cycle de vie complet joué sur devnet** avec le payeur comme créateur (même builders que `/creator`, signés en script) : achats à travers les 4 eras (la curve vend exactement `swapBaseAmount`), claim des fees créateur avant et après migration (2,5 % de chaque trade arrive en HYPE), franchissement du seuil en remplissage partiel (`swap2`, `SwapMode.PartialFill`), migration DAMM v2 via `migration.migrateToDammV2` (dammConfig = `DAMM_V2_MIGRATION_FEE_ADDRESS[migrationFeeOption]`), retrait du surplus. Pool DAMM v2 : `FPAUnS5zew19ekzHWVhFntg8vTAj4NBLi67wxv7ZK4a4`. Un buy exact-in qui dépasse la capacité restante de la curve échoue dans le SDK (`Insufficient Liquidity`) : l'UI de swap devra passer en partial fill près du seuil.

Adresses devnet (dans `.env.local`, jamais dans le repo ; `keys/payer.json` est la clé payeur) :

| Élément | Adresse |
|---|---|
| Payeur / fee claimer | `9r9VGrEmq5GtzC4TUeNFJN6Yx2WjiFzJGoiiGduQ5BCs` |
| Mint HYPE de test (8 déc.) | `H6SoYYTPSY85GJdz181NBG3uKnvThzMuK6dcbLhGzXfD` |
| Config DBC (seuil 50 HYPE) | `BakZ7m6Hv6LP6PCkcGqBcYqMm9VHLngWyw3Ewh4mAXH4` |
| Premier pool (Hypedog, $HDOG) | `4WganbYtA7Vqpr9EbQ1L6JxX5MnftS8NQfg3GDnzDgef` |

Le faucet RPC devnet est fermé : du SOL s'obtient sur https://faucet.solana.com (connexion GitHub). Pour un lancement depuis l'UI, `TEST_WALLET=<pubkey> REUSE_MINT=1 pnpm mint:devnet` envoie 1 000 HYPE de test au wallet navigateur.

## Ce qu'il reste à faire — par ordre

1. **Tester l'UI avec un wallet navigateur** sur devnet : lancement depuis `/launch`, claim et surplus depuis `/creator` (la logique on-chain est validée, reste le parcours wallet-adapter). Qui déclenche la migration DAMM v2 en prod : le keeper Meteora ou un cron QUAD, à confirmer.
2. **RPC privé.** Le RPC public mainnet renvoie 403 depuis le navigateur : `NEXT_PUBLIC_RPC_URL` doit pointer sur Helius ou équivalent avant tout passage mainnet.
3. **Config mainnet.** `pnpm config:mainnet` avec le vrai mint HYPE, puis un lancement test avec un seuil minuscule. Décimales et token program de HYPE sont lus on-chain, jamais codés en dur.
4. **Fees plateforme.** Un cron qui appelle `claimPartnerTradingFee` pour le `feeClaimer`. Pas encore dans le code.
5. **Métadonnées de pool.** `createPoolMetadata` (site, logo) après chaque lancement. Pas encore dans le code.
6. **Propreté.** `outputFileTracingRoot` dans `next.config.ts` (Next détecte un `package-lock.json` dans le home) et `align-items: end` → `flex-end` dans `app/globals.css` (avertissement autoprefixer).

## Conventions

- Jamais de clé privée dans le repo : `.env.local` à partir de `.env.example`.
- Toute valeur de curve ou de fee passe par `lib/curve.ts` ou `lib/hype.ts`, pas de nombre magique dans les composants.
- Avant mainnet : un vrai lancement test sur devnet, puis un sur mainnet avec un seuil minuscule.
- Commits en anglais, impératif, un sujet par commit.

## Liens de travail

- Design system (artifact Claude) : https://claude.ai/artifact/HYDV3iRxVJSwN5ehAdGSSh
- Maquettes du site (artifact Claude) : https://claude.ai/artifact/Ub2ZkHFY1wQGEpsDAN1sN9
- Doc DBC Meteora : https://docs.meteora.ag/overview/products/dbc/what-is-dbc — SDK : https://github.com/MeteoraAg/dynamic-bonding-curve-sdk
- HYPE sur Solana : https://tokens.solana.com/hyperliquid — brand kit : https://hyperliquid.gitbook.io/hyperliquid-docs/brand-kit
