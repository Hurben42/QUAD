QUAD est un launchpad Solana : des coins à supply fixe vendus sur une courbe en quatre eras, chaque era vendant deux fois moins de coins pour la même quantité de HYPE, avec des fees créateur payées en HYPE. Tout le système visuel dit cette seule chose : **des pixels, quatre eras, une montée du bleu à l'ember.**

## Fondamentaux de contenu

- Voix : courte, déclarative, technique sans jargon. Des règles, pas des promesses. « Four eras. Priced in HYPE. » — « Each era sells half as many coins as the last. » — « Mint authority revoked in the same transaction. »
- Anglais sur le produit, tu/you direct. Pas d'emoji, pas de point d'exclamation, pas de « 🚀 ».
- Les chiffres portent leur unité, toujours : `48.2 HYPE`, `3.125 %`, `Era 2 / 4`. Les montants et adresses se composent en `num` ou `num-lg` (mono), jamais en sans.
- Les étiquettes de section sont des labels mono en capitales numérotés, à la Sovra : `01 / LAUNCH`, `02 / ON THE CURVE`, `03 / CREATORS` (style `label`, couleur `text-muted`).
- « HYPE » s'écrit en capitales et désigne le token Solana (Wormhole). Jamais de logo ni de nom Hyperliquid dans l'interface : QUAD est pairé à HYPE, pas affilié.
- Le nom s'écrit `QUAD`, en capitales, dans tous les contextes.

## Couleur

- Deux thèmes. `dark` est le thème par défaut (fond `surface-0` `#0b0d18`) ; `light` sert le mode clair (fond `surface-0` `#f0eff4`). Les quatre couleurs d'era ne changent pas de thème : ce sont des couleurs de marque, pas d'interface.
- Les eras sont une échelle ordonnée, jamais une palette au choix : `era-1` Volt (bleu) → `era-2` Violet → `era-3` Coral → `era-4` Ember. C'est le dégradé du logo, lu de haut en bas. Une era donnée a toujours sa couleur : un badge « Era 3 » est `era-3`, une barre de curve va de `era-1` à `era-4` de gauche à droite — la curve chauffe en montant.
- `brand` (= `era-4` Ember) est la seule couleur d'action : bouton primaire, lien actif, curseur de progression. Le texte posé dessus est `on-brand` (encre).
- Texte posé sur un bloc d'era : blanc sur `era-1` et `era-2`, encre sur `era-3` et `era-4` (`on-era-N`). Sur un bloc en `brand-vertical`, le texte est blanc dans la moitié haute et encre dans la moitié basse — ou, plus simple, le texte reste hors du bloc.
- Era utilisée comme texte sur une surface : les tokens `era-N-text` (assombris en light pour tenir 4.5:1).
- Trois dégradés, tous du bleu à l'ember : `brand-vertical` (logo, icône app, blocs pleins, titre du hero), `era-sweep` (barre de curve, bordure de la carte sélectionnée), `era-horizon` (le lever de soleil radial posé au bas d'un panneau : un seul par écran, toujours en bas, jamais derrière du texte courant).
- Surfaces : `surface-0` page, `surface-1` cartes, `surface-2` inputs et chips. Les cartes se détachent par `shadow` `card` et une bordure `line`, pas par un dégradé.
- Pas de dégradé tronqué : un dégradé montre toujours les quatre eras, du bleu à l'ember.
- Statuts : `success` (Live, Graduated) et `danger` (erreur) portent toujours leur mot ; la couleur seule ne suffit pas.

## Typographie

- `sans` = Manrope (Google Fonts, 500 / 700 / 800). `mono` = JetBrains Mono (Google Fonts, 600). Charger : `https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=JetBrains+Mono:wght@600&display=swap`.
- Titres : `display-xl` pour le hero uniquement, `display-lg` pour les sections, `display-md` pour un coin en page détail. Tracking serré (-0.02 à -0.035em), interlignage ≤ 1.1.
- Texte : `title` 18, `body` 15, `small` 13, tous en 500 ou 700. Pas de 400 : Manrope 400 est trop gris sur `surface-0`.
- Mono : `label` (capitales, tracking 0.12em) pour les étiquettes ; `num-lg` et `num` pour tout chiffre. Les chiffres s'alignent à droite dans les tableaux.
- Le wordmark QUAD est du texte vivant en `display-md` ou plus, Manrope 800, `letter-spacing -0.04em`, à côté du mark ; jamais une image.

## Espace, rayons, bordures

- Grille de 4px : `space-1` à `space-16`. Padding de carte `space-6`, gouttière desktop `space-8`, sections de page séparées par `space-12`.
- Rayons : `radius-sm` 6 (quads du logo, chips, badges, inputs), `radius-md` 12 (boutons, tuiles), `radius-lg` 20 (cartes, hero), `radius-pill` (barres de progression).
- Bordures : `line` pour décorer, `line-strong` pour les contrôles. Jamais de bordure gauche colorée sur une carte.
- Focus : anneau plein 2px `focus`, décalé de 2px, sur tout élément interactif. Pas d'`outline: none` sans remplacement.

## Motifs

- Le bloc est l'unité : le mark est le Q en blocs du propriétaire sur une grille de 4 × 5 unités, et les blocs du site se composent sur la même logique de grille. Un amas de 4 à 9 pixels (12–16px, `radius-sm` 0) en `era-3` et `era-4` sur un coin de panneau sombre sert de curseur ou de signature ; jamais plus d'un amas par écran.
- Les bandes : des colonnes verticales de largeurs inégales (multiples de `space-8`) remplies de `brand-vertical` à différentes positions, en fond d'un bloc plein ou d'une affiche. Les bandes portent un titre court en `display-lg` encre, posé en bas à gauche.
- L'horizon : `era-horizon` en bas d'un panneau sombre, avec un fin rayonnement de lignes `line` depuis le point de fuite. Un seul par écran, sous le hero ou dans une carte vide.
- La courbe en marches : quatre paliers de hauteur croissante (×2), remplis `era-1` → `era-4`, toujours aux vraies proportions (8 / 4 / 2 / 1 de largeur).
- Grain : bruit monochrome à 6–8 % sur `surface-0` et sur les blocs de dégradé. Pas de scène, pas de mascotte, pas de 3D.

## Iconographie

- Icônes trait 1.5px, 20px, en `text` ou `text-muted` ; ensemble Lucide. Pas d'emoji en guise d'icône.
- Le mark QUAD (le Q en blocs, vectorisé à l'identique) est dans `assets/Logos` en trois variantes (dégradé, encre, blanc) plus l'icône app 1024. Jamais redessiné, jamais déformé.

## Composants

- `Lockup` : mark + wordmark, trois tailles. `Button` : primary (`brand`), secondary (bordure `line-strong`), ghost. `EraProgress` : la barre de curve en quatre segments proportionnels avec le curseur de progression. `StatTile` : un chiffre `num-lg` et son label. `CoinCard` : une ligne de coin sur la curve (nom, era, prix en HYPE, progression).
- Un composant reçoit ses données prêtes à afficher (montants déjà formatés avec leur unité) et n'appelle rien lui-même.
