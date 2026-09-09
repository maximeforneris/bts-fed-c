# Images téléchargées le 9 septembre 2026 — crédits à porter

Licences lues dans les métadonnées de la page de description Wikimedia
(champs `LicenseShortName`, `Artist`, `DateTimeOriginal`), pas sur la vignette.
Convention d'attribution : `Auteur — Wikimedia Commons — <licence>`.

⚠️ **Les deux titres Commons sont trompeurs.** Ni l'une ni l'autre ne montre
une centrale de traitement d'air. Elles sont renommées ici d'après ce qu'elles
montrent réellement. Vérifier le sujet avant d'utiliser : la licence se contrôle
en une requête, le sujet demande quelqu'un qui connaît la machine.

## cta-swegon-gold-e.jpg — **celle qui est utilisée**

**Ce que ça montre** — une centrale de traitement d'air double flux Swegon
GOLD E, photo produit sur fond blanc, caisson ouvert à gauche : on voit le
ventilateur à roue libre et, en dessous, le récupérateur à plaques. C'est
la seule vraie CTA trouvée, et de loin la plus lisible.

- Trouvée sur : https://www.batiproduits.com/fiche/produits/centrales-de-traitement-d-air-a-recuperation-de-p69110883.html
- Fichier : `centrales-de-traitement-d-air-a-recuperation-de-chaleur-gold-e-002553223-product_maxi.jpg`
- Fabricant : **Swegon** — gamme GOLD E
- Licence : **photo produit de fabricant, non libre.** Aucune licence publiée.
- Taille : 555 × 555, c'est le maximum publié — suffisant pour une figure web,
  **trop petit pour un `.docx` en pleine page.**
- Crédit porté dans la légende : `Photo Swegon.` — à compléter selon ce que
  tu veux écrire.

## prise-air-neuf-web.jpg · prise-air-neuf-word.jpg

**Ce que ça montre** — la prise d'air neuf d'une installation de ventilation de
lycée, vue depuis la cour : deux grilles à chevrons dans un mur béton. C'est le
repère 6 de ton schéma du banc, en vrai et en grand.

- Source : https://commons.wikimedia.org/wiki/File:L%C3%BCftungsanlage_JCRG_20210904_HOF05266_RAW-Export_20220607003429.jpg
- Titre Commons : *Lüftungsanlage JCRG 20210904 HOF05266* (annoncé « installation de ventilation »)
- Auteur : **PantheraLeo1359531**
- Licence : **CC BY 4.0** — attribution seule, pas de partage à l'identique
- Date : 4 septembre 2021 · original 9504 × 6336
- Crédit à porter : `PantheraLeo1359531 — Wikimedia Commons — CC BY 4.0`

## aerocondenseurs-web.jpg · aerocondenseurs-word.jpg

**Ce que ça montre** — une batterie d'aérocondenseurs Alfa Laval et Vertiv sur
une terrasse grillagée, vue de dessus. Ce ne sont **pas** des CTA, malgré le
titre Commons. Utile pour la séquence 3, production de chaleur et de froid.

- Source : https://commons.wikimedia.org/wiki/File:Unidades_de_tratamiento_de_aire.jpg
- Titre Commons : *Unidades de tratamiento de aire* — **le titre est faux**
- Auteur : **Rjcastillo**
- Licence : **CC BY-SA 4.0** — ⚠️ partage à l'identique : la licence contamine
  le document qui l'intègre. Ta propre note le signale. À peser pour un `.docx`.
- Date : 30 juillet 2025 · original 6112 × 4298
- Crédit à porter : `Rjcastillo — Wikimedia Commons — CC BY-SA 4.0`

## Formats produits

| suffixe | largeur | usage |
|---|---|---|
| `-web` | 1600 px | pages du site, ~385 ko |
| `-word` | 2400 px | documents et projection, ~1,1 Mo |

## Ce que Commons n'a pas

**Aucune photographie correcte d'une CTA en local technique.** Cherché en
français, anglais et allemand — `Lüftungszentrale`, `Klimazentralgerät`,
`Luftbehandlungsgerät`, `air handling unit` : rien d'exploitable et récent.
La seule vraie CTA disponible est celle de 2004, 1109 × 738, déjà écartée.

Ta photo de la CTA du lycée reste la seule bonne route pour ce sujet-là.

---

# Les images de gouttière des cinq séquences

Ajoutées le 9 septembre 2026. Une par séquence, dans la colonne de droite,
légende et crédit portés par le `content` du pseudo-élément — donc **le crédit
voyage avec l'image**, ce qu'un fond CSS seul ne permet pas.

| Fichier | Séquence | Auteur | Licence | Source |
|---|---|---|---|---|
| `seq1-paroi-resistances.jpg` | 1 — Thermique | Ellande | **CC BY-SA 4.0** | [Thermal resistance in series.png](https://commons.wikimedia.org/wiki/File:Thermal_resistance_in_series.png) |
| `seq2-bouteille-decouplage.jpg` | 2 — Hydraulique | Rainer Sielker | **Domaine public** | [Hydraulische Weiche.png](https://commons.wikimedia.org/wiki/File:Hydraulische_Weiche.png) |
| `seq3-pac-compresseur.jpg` | 3 — Production de chaleur | PeterEastern | **CC BY-SA 4.0** | [Ecodan outdoor unit Internal view.jpg](https://commons.wikimedia.org/wiki/File:Ecodan_outdoor_unit_Internal_view.jpg) |
| `cta-swegon-detouree.png` | 4 — Traitement d'air | Swegon | photo produit, non libre | [fiche batiproduits](https://www.batiproduits.com/fiche/produits/centrales-de-traitement-d-air-a-recuperation-de-p69110883.html) |
| `seq5-gtb-controleurs.jpg` | 5 — Régulation et GTB | Mstucky2 | **CC BY-SA 3.0** | [KMC Controls BAS Product Family](https://commons.wikimedia.org/wiki/File:KMC_Controls_BAS_Product_Family_Samples_2010_Large.jpg) |

## Retouches appliquées

- **seq2** — la légende allemande du bas est **recadrée hors de l'image** ; les
  repères numérotés restent, le texte part.
- **seq3** — recadrée de 14 % en haut pour resserrer sur le compresseur et le
  faisceau de tubes.
- **cta seq4** — **détourée** : remplissage par diffusion depuis les coins,
  seuil 26, alpha adouci de 0,6 px. L'ombre de studio part avec le fond.
- **seq1, seq2, seq5** — pas de détourage : `background-blend-mode: multiply`
  contre la couleur de la chaussée fait disparaître leur fond blanc, et la
  légende n'est pas affectée.

## ⚠️ Trois d'entre elles sont en CC BY-SA

`seq1`, `seq3` et `seq5`. Sans conséquence sur le site. **Le partage à
l'identique contamine en revanche le document qui les intègre** : à peser avant
de les reprendre dans un `.docx` diffusé.

## Écartées, et pourquoi

- **Pont thermique** (simulation par éléments finis, CC0) — échelle arc-en-ciel
  magenta/cyan/jaune, incompatible avec la charte.
- **Mécanismes de transfert dans un isolant** (CC BY 4.0) — abstraite, et
  légendes en anglais.
- **Chaudières murales** de catalogue — boîtes blanches fermées : elles
  n'apprennent rien, et détourées elles seraient invisibles sur fond clair.
- **Photos d'ambiance de fabricant** — canapé rose, plante verte, rendu 3D sur
  fond vert. Marketing, pas enseignement.
