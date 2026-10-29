Prompt à coller dans Claude Code, à la racine du dossier `quad/` :

---
Lis CLAUDE.md puis docs/MECHANISM.md. Le design est terminé (design/ et public/brand/), le backend est à construire sur le Dynamic Bonding Curve de Meteora.

Fais dans l'ordre, un commit par étape :
1. `pnpm install`, puis `pnpm test` : les tests de lib/curve.ts doivent passer. Ouvre le SDK installé (@meteora-ag/dynamic-bonding-curve-sdk) et aligne scripts/create-config.ts sur les noms de champs réels de cette version, sans changer les valeurs. Ajoute les deux champs marqués TODO(sdk) : token update authority immutable, et le premier swap au fee minimum pour le buy du créateur.
2. Crée un mint de test à 8 décimales sur devnet, lance `pnpm config:devnet`, puis vérifie avec les helpers du SDK que les montants base/quote par segment correspondent à ceux que verifyCurve() calcule. Si ça diverge, c'est la math de lib/curve.ts qu'il faut corriger et documenter, pas le test.
3. Branche LaunchForm sur lib/dbc.ts (upload des métadonnées sur Irys, puis createPoolAndBuy), fais un vrai lancement sur devnet, et affiche le pool créé dans la liste via app/api/pools.
4. Porte les trois blocs « The four rules » et la version mobile depuis design/website/*.html, pixel près, avec les tokens de app/globals.css uniquement.
5. Page créateur : claim des fees (claimCreatorTradingFee) et surplus.

Contraintes : aucune couleur ni valeur de fee en dur dans les composants ; HYPE toujours lu on-chain ; jamais de clé privée dans le repo ; QUAD est pairé à HYPE, pas affilié à Hyperliquid.
---
