# Générateur CAP — spécification

Ce document décrit **les règles cliniques** du générateur de retour à la course
à pied, et où chacune vit dans le code. Il est écrit pour être relu dans six
mois par quelqu'un qui a oublié pourquoi le moteur fait ce qu'il fait.

**Les règles font foi.** Quand le code diverge de ce document, c'est le code
qui a tort. Les cas de référence de `qualite/cap-cas.js` les traduisent en
assertions exécutables :

```bash
node qualite/cap-cas.js
```

Code : `js/prog-main.js`, section délimitée par `var CAP_AXES = {` et
`/* ── CAP → Agenda : sélecteur de jours de la semaine ── */`. Formulaire :
`programme.html`, bloc `#capFormScreen`.

Ces deux repères servent aussi à `cap-cas.js` pour charger le moteur : les
déplacer casse le test, qui le dit explicitement.

---

## 1. Le principe : une rampe, et ce qu'elle coûte

Le générateur ne décide pas à la place du praticien.

> Vous dites d'où part le patient, où vous voulez l'amener, sur combien de
> semaines. L'outil trace la rampe et affiche l'ACWR, avec la couleur du
> risque. Vous jouez avec le curseur jusqu'à ce que le compromis vous convienne.

C'est un outil de planification, pas un oracle. Le travail clinique reste le
vôtre ; le rôle du moteur est de rendre la charge lisible **avant** de
l'appliquer.

---

## 2. Les trois modes — la pathologie choisit

| Axe | Mode | Ce qui monte | Ce qui ne bouge pas |
|---|---|---|---|
| **Répétition** — le volume a blessé | `volume` | le volume | l'allure, maintenue à ce que le coureur fait déjà |
| **Charge** — l'allure a blessé | `allure` | les minutes de Z3+ | le volume hebdomadaire |
| **Amplitude** — la foulée a blessé | `amplitude` | le volume | aucune allure de tout le plan, et une séance technique chaque semaine |

`CAP_AXES[axe].mode`. Le mode commande aussi **les champs affichés dans la
fiche** : demander un objectif de volume là où le volume ne bouge pas, ou une
cible de qualité là où il n'y en aura jamais, ne sert qu'à égarer.

Deux drapeaux complètent le tableau :
`repetition.sansLongue` — pas de sortie longue tant que le volume d'un seul
tenant est le problème. `amplitude.technique` — la séance technique est
obligatoire, la cadence est le traitement.

---

## 3. La rampe

`_capRampe(depart, cible, n, consolidation)` — progression géométrique sur `n`
semaines. Le facteur se déduit de la distance à parcourir et du nombre de pas
disponibles, jamais l'inverse.

### La consolidation est une case à cocher

Décochée par défaut. Cochée, **une semaine sur quatre répète la précédente**
(`CAP_SEUILS.cycleProgression = 4`), et la rampe se resserre d'autant sur les
semaines qui restent pour arriver quand même à destination.

```
sans consolidation   10 semaines, 9 pas    →  +4,6 %/sem
avec consolidation   S4 et S8 répètent     →  +6,0 %/sem sur les 7 pas
```

Dans les deux cas, S10 vaut 36 km. C'est la pente qui absorbe la différence.

---

## 4. L'ACWR — sur la grandeur qui progresse

Même formule, mêmes seuils, mêmes couleurs. **Seule la grandeur mesurée
change** :

| Mode | Ce qu'on met dans le ratio |
|---|---|
| volume, amplitude | le volume hebdomadaire |
| allure | les minutes passées en Z3+ — S1 : 4×1' = **4 min** |

Fenêtre glissante de quatre semaines, comme toujours. Seuils :
`acwrOk = 1.15` (vert, progressif) · `acwrWarn = 1.30` (orange, soutenu) ·
au-delà, rouge — assumé, feedback séance par séance.

**Piège historique.** Mesurer la charge pondérée totale sur un mode allure
affichait 1,00 tout vert pendant que la qualité quintuplait : 4 à 20 min de
Z3+ noyées dans 165 min de course ne bougent presque pas la charge globale.

**Second piège.** L'ACWR se calcule sur la série **réellement prescrite**,
arrondie à la minute — pas sur la rampe idéale. On ne prescrit pas 4,6 minutes
de Z3 : le plan délivre `4 5 5 6 7 8 10 11 13 15 17 20`, avec un +25 % entre 8
et 10. La rampe théorique annonçait 1,23, le plan délivre **1,29**. La fiche
doit dire ce que le patient encaissera. Un cas de référence vérifie que la
série annoncée est exactement celle produite.

### Une limite à connaître

Quand la qualité part de 4 minutes, allonger le plan **ne fait plus descendre
l'ACWR sous 1,20** : passer de 4 à 5 minutes, c'est +25 %, quel que soit le
nombre de semaines. L'indicateur est mal adapté aux très petits volumes. Le
curseur reste utile jusqu'à 18 semaines environ, puis il plafonne.

---

## 5. La forme des séances

### Le fractionné est inséré dans une sortie

Pas de séance dédiée. Récupération **courue au footing**, rapport 1:1 au
départ, qui se resserre quand le total monte.

```
19' Z2 · 5×1' Z3 (r. 1') · 12' Z2     7,3 km    →   5 min de Z3
15' Z2 · 4×2' Z3 (r. 2') · 10' Z2     6,9 km    →   8 min de Z3
10' Z2 · 5×3' Z4 (r. 2') ·  6' Z2     6,4 km    →  15 min de Z4
```

La sortie garde à peu près la même longueur : c'est la part rapide qui grandit
à l'intérieur.

**Piège historique.** Une séance de qualité courte et séparée obligeait les
autres sorties à absorber son reliquat, ce qui faisait naître une sortie de
plus dans la semaine — 4 séances là où 3 étaient prescrites.
→ `_capSpecQualite(intensiteMin, zone, volumeSeance)` : le troisième argument
est la part de volume de la sortie. Sans lui, le bug revient.

**Second piège.** Le découpage essaie les trois durées de répétition (3', 2',
1') et garde celle qui tombe le plus près du total voulu. Choisir la durée
d'abord et arrondir ensuite faisait déborder : 20 minutes devenaient 7×3' = 21.

### Les zones, toutes dérivées de l'allure footing

| Zone | Allure | Usage | Coefficient de charge |
|---|---|---|---|
| Z1 | × 1,08 | récupération, retour au calme | 1,0 |
| Z2 | × 1,00 | endurance fondamentale — le footing | 1,2 |
| Z3 | × 0,92 | endurance active, allure marathon | 1,6 |
| Z4 | × 0,86 | seuil, allure 10 km | 2,2 |
| Z5 | × 0,78 | VMA | 3,0 |
| marche | — | — | **0** |

**Un footing n'a pas d'allure** : c'est du Z2 continu. Dans tout le moteur, Z2
vaut `allureFooting × 1,00`, une constante du plan que rien ne fait varier.

L'axe Amplitude plafonne à Z3 (`zonesDegel`) — corriger une foulée à pleine
vitesse n'a pas de sens.

---

## 6. La reprise course/marche

Quand le coureur ne tient pas 5 minutes d'affilée
(`CAP_SEUILS.fractionne = 5`), l'échelle passe avant tout arbitrage de mode.

`CAP_ECHELLE_FRACTIONNE` — le bout de course s'allonge, la marche reste à
1 min, et **le nombre de répétitions décroît** pour que le volume monte
doucement :

| bout | 1' | 2' | 3' | 4' | 5' | 6' | 8' | 10' | 12' |
|---|---|---|---|---|---|---|---|---|---|
| reps | 8 | 6 | 5 | 4 | 4 | 4 | 3 | 3 | 3 |

Un barreau par semaine, aucune intensité pendant cette phase, puis la rampe
reprend depuis le volume atteint en sortie d'échelle.

> **Un patient qui ne court pas d'un trait reconstruit son VOLUME**, quel que
> soit l'axe de sa pathologie. Travailler l'allure suppose un volume qui
> n'existe pas encore ; elle fera l'objet d'un plan suivant.

**Pièges historiques, tous du même genre.** La progression était conditionnée à
`continu > 0`, ce qui excluait exactement le patient à qui le walk-run est
destiné. Et le constructeur de semaine ajoutait des séances pour atteindre un
volume cible, produisant onze sorties hebdomadaires identiques.

---

## 7. La fiche

**1 · Pathologie** — la liste, le tissu (modifiable : c'est un arbitrage
clinique), et le mode retenu annoncé en clair.

**2 · Ce qu'il tolère aujourd'hui** — l'unité (km ou min), puis selon le mode :
la tolérance avec une bascule **par sortie / par semaine**, ou le **volume à
maintenir**. Plus les minutes de qualité actuelles, la course continue sans
douleur et l'allure footing.

**3 · Objectif** — par sortie **et/ou** hebdomadaire (l'hebdomadaire fixe la
destination, celui par sortie devient un plafond par séance), ou les minutes de
qualité visées. Puis la fréquence, le curseur des semaines, la case de
consolidation, et le verdict qui se recalcule à chaque clic.

**4 · Contexte** — terrain, cross-training, jours disponibles.

### « Vide » ne doit jamais valoir « zéro »

C'est **le** bug qui a coûté le plus cher. « Course continue sans douleur »
vaut 0 par défaut, et 0 signifie « ne court pas une minute d'affilée ». Un
praticien renseignant *« tolère 10 km sur une sortie »* sans toucher à ce champ
voyait son patient renvoyé au fractionné de reprise.

`_capContinuTolere(p)` déduit la tolérance en continu de la sortie tolérée
(moitié) ou de la charge chronique quand elle n'est pas saisie explicitement.
Une saisie explicite fait toujours foi.

### Le nombre de sorties

La fréquence prescrite est une contrainte du praticien. Une sortie ne s'ajoute
que si la part de chacune dépasserait le plafond par sortie — et l'écran de
résultat **explique alors pourquoi**, avec l'arithmétique.

**Piège historique.** L'ancienne boucle ajoutait une sortie tant que le volume
produit n'égalait pas la cible : sur les petits volumes, l'arrondi à la minute
suffisait à déclencher l'ajout, ce qui raccourcissait chaque séance et
aggravait l'arrondi. D'où des semaines à 5 et 6 sorties sur 15 min de course.

---

## 8. L'écran de résultat

L'en-tête décrit ce que le plan délivre, dans les grandeurs du mode :

```
10 semaines de progression   Axe : Répétition   Volume : 24 → 36 km/sem
+6 %/sem · ACWR 1.09
```

Sur un mode allure, « Volume maintenu » et « Qualité visée » remplacent la
plage de volume.

**Piège historique.** L'en-tête lisait `cibleHebdo` et `objectiveMin`, champs
supprimés de la fiche : il affichait « NaN km/sem » et « undefined′ Z3+ ».

**Pas de noms de phase.** Ils venaient d'un modèle en trois temps qui n'existe
plus et annonçaient « Phase 3 — Retour continu » dès la semaine 1. Les
intertitres ne numérotent que les **cycles**, et seulement quand la
consolidation est cochée : `Cycle 1`, `Cycle 2`…

---

## 9. L'état de la trajectoire, semaine par semaine

`_capBuildProgrammeV2` renvoie `etats` — une entrée par semaine — et
`CAP_STATE.etats` la persiste avec le plan :

| Champ | Contenu |
|---|---|
| `prescrit` | ce que la semaine délivre : volume, minutes de Z3+, course continue |
| `sortie` | de quoi REPRENDRE à la semaine suivante |
| `palier` | `'maintien'` sur une semaine de consolidation |

Sans cette trace, le plan enregistré n'est qu'une liste de séances : une
régression ne pourrait que rééchelonner des séances au jugé, hors du modèle.

---

## 10. La régression sur douleur

### On propose, on n'applique jamais d'office

Toute douleur signalée ouvre une **proposition**. Le praticien la lit,
l'ajuste, décide. L'interprétation d'un score EVA varie d'une pathologie à
l'autre : c'est un jugement clinique, pas un calcul.

Le recul est **fixe — un tour en arrière** — quel que soit le score. L'EVA est
enregistrée et affichée à côté du repère de la pathologie (`seuil` dans
`CAP_PATHO_DB`), mais **ne pilote aucune formule**. Le moment de la douleur —
pendant la course ou dans les 24 h — n'entre pas en compte.

### L'ordre : le miroir de la remontée

| Séance douloureuse | Réponse |
|---|---|
| **Contient du Z3+** | L'allure recule d'un tour. Le volume ne bouge pas. |
| **Z3+ déjà au plancher** | On retire l'allure, le volume recule d'un tour. |
| **Footing** (Z2 continu) | Aucun levier n'a été poussé : c'est la charge cumulée. **Décharge globale de 30 %.** |
| **Technique** (Z1) | Décharge globale, **et la technique de course est à retravailler** — la part que le moteur ne peut pas traiter à votre place. |

### Les liens agenda survivent

Une régression change le **contenu** des séances à venir, pas le calendrier.
La date, la séance planifiée et le programme Supabase sont reportés de
l'ancienne séance vers la nouvelle (`_capReporterLiensAgenda`), puis le contenu
des programmes est mis à jour — sans rien supprimer ni recréer.

**Piège historique.** Sans ce report, une régression sur un plan déjà agendé
faisait perdre `date`, `seance_id` et `prog_id` à toutes les séances suivantes
— dix-huit séances sur un plan de quinze semaines.

Quand le plan change de longueur, les séances sans lien sont comptées et
signalées par un bandeau.

### Le panneau

Le clic sur **Douleur** ouvre le curseur EVA, puis le panneau — et **le plan ne
bouge pas** tant qu'aucune décision n'est prise.

```
Douleur 4/10 — semaine 10        repère pour cette pathologie : 2/10

  PROPOSITION                                              [ − ] [ + ]
  Allure (Z3+)     6′ → 5′
  Volume           33.6 — inchangé

  [ Allonger le plan ]  [ Garder 15 sem. ]      [ Ignorer ]  [ Appliquer ]
```

**Régresser** ouvre la même proposition, sans score. **Maintenir** répète la
semaine à l'identique — duplication littérale, tout ce qui suit décale d'une
semaine, dates comprises, et les copies perdent leur lien agenda.

### La reprise après coupure

Dix jours sans séance validée déclenchent une bannière. « Recalculer » repart
de la **dernière semaine réellement faite** et applique **−15 % par semaine de
coupure sur les deux grandeurs** : le désentraînement ne choisit pas entre
volume et allure.

---

## 11. Les 18 pathologies

`CAP_PATHO_DB` — chaque entrée porte `axe`, `tissu`, `seuil` de douleur,
`interdits`, `cadenceCible`, `consignes` et `drapeaux`.

| Axe | Pathologies |
|---|---|
| **Charge** (9) | achilléenne corporéale, périostite tibiale, fracture de stress, coussinet graisseux, métatarsalgie, fasciopathie plantaire, tendinopathie rotulienne, post-op genou, aucune |
| **Amplitude** (6) | achilléenne insertionnelle, claquage, ischio-jambiers proximaux, lombalgie, fléchisseurs de hanche, pubalgie |
| **Répétition** (3) | fémoro-patellaire, patte d'oie, bandelette ilio-tibiale |

Deux pathologies de même axe et même tissu **doivent** produire la même
mécanique. C'est ce qui permet de ne tester que six situations de saisie plutôt
que dix-huit pathologies.

Les trois dernières de la liste Amplitude ne figurent pas sur la pyramide de La
Clinique du Coureur : leur axe est une transposition, à confirmer cliniquement.

---

## 12. Ce qui a été retiré, et pourquoi

À jour au 2 août 2026.

**Le moteur v1** (415 lignes) — `CAP_RYTHME`, `CAP_START_L`,
`_capBuildProgressive`, `_capLoadOf`, `_capMidpointL`, `_capReplanFromIndex`,
`_capAdaptNext`. Un plan généré avant la v2 n'a pas d'`axe` : il n'est plus
régénérable, et l'app invite à repasser par la fiche.

**Les cycles, l'alternance des leviers, la décharge automatique de −20 %, le
délai conseillé.** C'était de l'extrapolation, pas des règles cliniques : trois
horloges tournaient en parallèle, se déphasaient, et produisaient des plans de
trente semaines illisibles. Le délai conseillé prétendait savoir mieux que le
praticien. Si un jour le moteur reprend un cycle qui décide seul de la cadence,
c'est le retour de ce problème.

`CAP_SEUILS` garde `cycle`, `dechargeInitiale` et `intensiteMaxPct` : ils ne
sont plus lus par la génération. À supprimer si rien ne les reprend.

---

## 13. Ce qui n'est pas branché

- **`interdits`** (côtes, surfaces dures, descentes, dévers) — affichés en
  consigne, sans effet sur la génération. Les rendre contraignants suppose que
  le moteur sache produire du dénivelé, ce qu'il ne fait pas.
- **`terrain`** et **`crossTraining`** — jamais lus.
- **`cadenceCible`** — posée sur la séance, ne modifie aucun contenu.
- **Le pré-remplissage Strava a été retiré.** Il visait `capW1`…`capW4`, champs
  supprimés de la fiche. Les données Strava restent disponibles ailleurs dans
  l'app ; si le bouton revient, il devra viser `capTolVal` / `capVolMaintenu`.

---

## 14. Questions ouvertes

**Le plafond par sortie doit-il progresser ?** Un coureur dont l'objectif est
de recomposer une sortie d'une heure d'un seul tenant a besoin que sa tolérance
par sortie croisse. Aujourd'hui elle est figée à la saisie.

**Le plancher de 4 minutes** pour la première dose de qualité — repris de
l'ancien modèle, jamais discuté cliniquement.

---

## 15. Méthode de travail — pourquoi ce document existe

Quatre corrections successives ont été livrées, chacune vérifiée, et le premier
essai en consultation réelle échouait encore. La cause n'était pas dans les
règles mais dans la façon de les vérifier : **le moteur était testé avec des
profils écrits à la main**, donc cohérents, alors que le formulaire produit des
combinaisons que ces profils n'avaient jamais.

D'où `qualite/cap-cas.js`, qui part des valeurs par défaut réelles du
formulaire. Avant de modifier le moteur :

1. Écrire ou corriger le cas de référence — le résultat attendu **d'abord**.
2. Modifier le moteur.
3. `node qualite/cap-cas.js` doit repasser au vert.
4. Vérifier dans le navigateur, et bumper le `?v=` de `programme.html`.
