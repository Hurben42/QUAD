# QUAD — launchpad Solana, coins pairés à HYPE

Tu reprends un projet dont le design est fini et dont le backend est à construire. Lis ce fichier en entier avant de toucher au code, puis `docs/MECHANISM.md`.

## Ce qu'est QUAD

Un launchpad sur Solana. Chaque coin lancé sur QUAD :

1. a une supply fixe de **21 000 000**, mintée en une seule transaction, mint authority révoquée, pas de freeze authority ;
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

- Design system complet (tokens, composants, logo, icône app).
- Maquettes HTML de la landing desktop + mobile et d'un visuel « Paired to HYPE ».
- Math de la curve et script de config (à valider sur devnet, voir ci-dessous).

## Ce qu'il reste à faire — par ordre

1. **Valider la math sur devnet.** `pnpm test` doit passer. Puis `pnpm config:devnet` avec un mint quote de test (mint SPL à 8 décimales que tu crées toi-même) et vérifier que `client.state.getPoolCurveProgress` et les helpers du SDK (`getBaseTokenForSwap` / totaux de supply) redonnent exactement les montants de `lib/curve.ts`. Si le SDK expose un `buildCurve*` qui sait faire des segments explicites, le préférer à la math maison et garder `lib/curve.ts` comme oracle de test.
2. **Config mainnet.** `pnpm config:mainnet` avec le vrai mint HYPE. Décimales et token program de HYPE sont lus on-chain, jamais codés en dur.
3. **Front de lancement.** `LaunchForm` → `lib/dbc.ts#createPoolAndBuy` (name, symbol, uri metadata uploadée sur Arweave/Irys, seuil de graduation en HYPE, wallet qui reçoit les fees = `poolCreator`, first buy optionnel). Signataires : payer, baseMint keypair, poolCreator.
4. **Liste « On the curve ».** Route API `app/api/pools/route.ts` : `getPoolsByConfig(config)` + progression + prix spot ; cache 5 s. Le front lit cette route. Jupiter/DexScreener indexent les pools DBC tout seuls : lien « Trade », pas de swap UI pour l'instant.
5. **Fees.** Page créateur : `claimCreatorTradingFee`, `creatorWithdrawSurplus` ; côté plateforme un cron qui appelle `claimPartnerTradingFee`.
6. **Métadonnées** : `createPoolMetadata` (site, logo) après chaque lancement.

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
