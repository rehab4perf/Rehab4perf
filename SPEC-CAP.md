# Générateur CAP — spécification

Ce document décrit **les règles cliniques** du générateur de retour à la course
à pied, et où chacune vit dans le code. Il est écrit pour être relu dans six
mois par quelqu'un qui a oublié pourquoi le moteur fait ce qu'il fait.

**Les règles font foi.** Quand le code diverge de ce document, c'est le code
qui a tort. Les cas de référence de `qualite/cap-cas.js` traduisent ces règles
en assertions exécutables :

```bash
node qualite/cap-cas.js
```

Code : `js/prog-main.js`, section délimitée par `var CAP_AXES = {` et
`/* ── Pré-remplissage depuis Strava`. Formulaire : `programme.html`, bloc
`#capFormScreen`.

---

## 1. Le principe : réduire ce qui a blessé, puis le reconstruire

Tout part de la pyramide de La Clinique du Coureur. La charge d'entraînement
d'un coureur se décompose en trois paramètres, et une pathologie donnée est
provoquée par **l'un** d'entre eux :

| Axe | Ce qu'il désigne | Exemples |
|---|---|---|
| **Charge** | L'intensité de l'impact à chaque foulée — la vitesse, les côtes | périostite, fracture de stress, tendinopathie achilléenne |
| **Répétition** | Le nombre de cycles — le volume | bandelette ilio-tibiale, patte d'oie, fémoro-patellaire |
| **Amplitude** | La longueur de foulée — la cadence | claquage, ischio-jambiers proximaux, lombalgie |

La règle est alors :

> Le paramètre **coupable** est réduit au départ, puis reconstruit à la fin.
> C'est lui, le traitement.
> Les paramètres **innocents** rejoignent la tolérance actuelle du coureur et
> n'y touchent plus.

Développer un paramètre innocent chargerait un tissu qui n'a rien demandé.
Geler le coupable sans jamais le remonter ne ramènerait personne à la course.

**Piège historique.** Le code faisait exactement l'inverse : il gelait le
coupable et développait l'innocent. Une périostite faisait monter le volume
d'un tibia déjà en souffrance, et l'axe annoncé ne pilotait rien. Si un jour
`CAP_AXES` reprend deux champs distincts pour « ce qu'on gèle » et « ce qui
progresse », c'est le retour de ce bug.

→ `CAP_AXES` : `coupable` et `innocents` désignent le **même** paramètre de
part et d'autre du programme.

---

## 2. Les deux grandeurs pilotées

Le moteur ne raisonne qu'en minutes. Une distance ne devient une durée qu'une
fois l'allure footing connue, et la conversion se fait à l'entrée, jamais
après (`_capVersMin`).

| Grandeur | Unité | Ce que c'est |
|---|---|---|
| **volume** | min/sem | Le total couru dans la semaine, à allure footing |
| **intensité** | min/sem | Les minutes passées en Z3 ou au-dessus |

L'intensité est une grandeur à part entière, avec sa trajectoire, ses paliers
et sa régression. Ce n'est pas une part du volume.

**Piège historique.** Tant que l'intensité n'a existé que sous forme d'un
booléen « dégelé / pas dégelé », une bandelette dont l'axe annonçait « moteur
allure » gardait 9 min de Z3+ pendant six semaines d'affilée — seule
l'étiquette de zone changeait. Une grandeur qu'on prétend piloter doit être
mesurable : `_capIntensiteSemaine()` la mesure sur le plan produit.

---

## 3. La structure : des cycles de 3 semaines

`CAP_SEUILS.cycle = 3`

### Cycle 1 — revenir à la tolérance

Le volume part **20 % sous la tolérance** et remonte d'un pas égal pour être
pile dessus à la dernière semaine du cycle. **Aucune intensité** pendant ce
cycle : c'est elle le vrai danger, elle n'ouvre qu'au cycle suivant.

```
S1  −20 %       S2  −10 %       S3  la tolérance
```

`CAP_SEUILS.dechargeInitiale = 0.20`

La décharge ne s'applique **que si une pathologie est renseignée**. Sans
pathologie, il n'y a rien à décharger et le programme démarre à la tolérance.

Le cycle 1 n'existe pas en course/marche : l'échelle de reprise joue déjà ce
rôle (§ 6).

### Cycles 2 et suivants — une seule horloge

Microcycle **4:1** — trois semaines de progression, une de consolidation
(`CAP_SEUILS.cycleProgression = 4`). **Un seul levier bouge par semaine**, et
il alterne :

```
S4  intensité ↑     S8   intensité ↑ (rebond)
S5  volume ↑        S9   volume ↑
S6  intensité ↑     S10  intensité ↑
S7  consolidation   S11  consolidation
```

Le levier alterne sur le compteur des semaines de **progression**, pas sur le
numéro de semaine : la consolidation ne doit pas décaler l'alternance. Chaque
cycle porte donc trois progressions — I, V, I puis V, I, V — et les deux
leviers restent à égalité sur deux cycles.

Le cycle 2 s'ouvre par l'intensité, puisque le volume vient tout juste de
retrouver la tolérance. Les faire monter ensemble ne permettrait plus de savoir
lequel a fait mal en cas de retour douloureux.

En dessous du plancher de volume (§ 7), rien ne s'accumule encore : pas de
consolidation programmée, le cycle se réduit à la simple alternance.

**La semaine qui suit une consolidation en baisse ne progresse pas** : elle
remonte au niveau d'avant la décharge, et c'est tout. Sans cette règle, le
rebond de la grandeur déchargée s'ajoutait à la progression de l'autre, et deux
leviers montaient la même semaine — exactement ce que la consolidation
cherchait à éviter.

**Piège historique — trois horloges pour un seul rythme.** Le cycle de
progression, une alternance sur 2 semaines et un palier tissulaire sur 3 ou 4
ont un temps tourné en parallèle. Ils se déphasaient, et le plan produisait ceci :

```
S7   INTENSITÉ
S8   INTENSITÉ            ← deux semaines d'intensité d'affilée
S9   VOLUME + intensité↓  ← deux leviers la même semaine
```

Le tissu ne décide donc plus de la **cadence** des consolidations — c'est le
cycle qui la fixe — mais seulement de leur **amplitude** (§ 7).

**Piège de calcul, deux fois.** D'abord : un levier qui ne bouge qu'une fois
par cycle calcule son taux sur les **tours** qui lui restent, pas sur les
semaines. Ensuite : la progression s'applique en **début** de semaine. Calculée
en fin de semaine, l'augmentation atterrissait sur la semaine suivante — donc
parfois sur la consolidation, qui se retrouvait à monter le volume tout en
baissant l'intensité.

**Le pas d'un tour est plafonné** — `intensiteMaxPct` pour l'allure, la borne
ACWR rapportée à la durée du cycle pour le volume. Sans plafond, le dernier
tour absorbait tout l'écart restant : l'intensité passait de 18 à 30 min en une
semaine, +67 %. Conséquence assumée : un délai trop court fait terminer le plan
**sous** sa cible, ce qui vaut mieux qu'un saut final.

---

## 4. La progression de l'intensité

> « Augmenter le volume de l'intensité, pas la vitesse en soi. »

La zone ne monte pas mécaniquement : ce sont **les minutes passées à allure
plus élevée** qui augmentent. C'est le même calcul que la progression du
volume, appliqué à une autre grandeur.

- Première dose : `CAP_SEUILS.intensitePlancher = 4` minutes.
- Croissance maximale : `CAP_SEUILS.intensiteMaxPct = 0.25` (+25 %/semaine).
- Cible par défaut : 15 % du volume, si le champ « minutes de qualité visées »
  est laissé vide.

### La forme de la séance

Le fractionné est **inséré dans une sortie de longueur normale**, pas dans une
séance dédiée. Récupération **courue au footing**, rapport 1:1 au départ, qui
se resserre quand le total monte.

```
19' Z2 · 5×1' Z3 (r. 1') · 12' Z2     7,3 km    →   5 min de Z3
15' Z2 · 4×2' Z3 (r. 2') · 10' Z2     6,9 km    →   8 min de Z3
10' Z2 · 5×3' Z4 (r. 2') ·  6' Z2     6,4 km    →  15 min de Z4
```

La sortie garde à peu près la même longueur d'un bout à l'autre : c'est la
part rapide qui grandit à l'intérieur.

**Piège historique.** Une séance de qualité courte et séparée (échauffement +
série + retour au calme, ~20 min) obligeait les autres sorties à absorber son
reliquat. Le volume par sortie dépassait alors la tolérance déclarée, et le
moteur ajoutait une sortie de plus dans la semaine — 4 séances là où 3 étaient
prescrites.

→ `_capSpecQualite(intensiteMin, zone, volumeSeance)` : le troisième argument
est la part de volume de la sortie. Sans lui, le bug revient.

---

## 5. Les axes, cas par cas

### Charge — l'allure a blessé

Volume : rejoint la tolérance au cycle 1, puis progresse vers la cible.
Intensité : nulle au cycle 1, introduite à S4, puis reconstruite.

**Exemple.** Périostite, tolère 10 km par sortie à 5:30, 3 sorties, cible
36 km/sem :

```
S1  24,0 km   0' Z3+   46 min continu | 43 min continu
S2  26,9 km   0' Z3+   52 min continu | 48 min continu
S3  30,0 km   0' Z3+   55 min continu
S4  30,0 km   4' Z3+   29' Z2 · 4×1' Z3 (r. 1') · 19' Z2 | 55 min continu
S5  31,3 km   4' Z3+   volume ↑, intensité inchangée
S6  31,3 km   5' Z3+   intensité ↑, volume inchangé
S7  31,3 km   8' Z3+   15' Z2 · 4×2' Z3 (r. 2') · 10' Z2
S8  31,3 km  15' Z3+   10' Z2 · 5×3' Z4 (r. 2') · 6' Z2
…                      jusqu'à 36,2 km et 21' de Z3+
```

À S5 le volume dépasse la tolérance de 10 km par sortie : le moteur passe à
4 sorties plutôt que d'allonger celles qui existent, et le verdict de la fiche
le signale.

### Répétition — le volume a blessé

Les sorties sont **découpées** au départ — c'est le nombre de cycles
consécutifs qui blesse, pas la vitesse. L'intensité est innocente : elle est
présente **dès la première semaine**, au niveau que le coureur encaissait
déjà. Puis le volume se recompose progressivement.

`CAP_AXES.repetition.sansLongue = true` — pas de sortie longue tant que le
volume d'un seul tenant est le problème.

### Amplitude — la foulée a blessé

Volume légèrement réduit, **uniquement du travail technique**, aucune séance
rapide de tout le programme, puis remontée progressive du volume.

`CAP_AXES.amplitude.technique = true` — la séance technique est obligatoire,
la cadence est le traitement et non un à-côté.

---

## 6. La reprise depuis zéro — l'échelle course/marche

Quand le coureur ne tient pas 5 minutes d'affilée
(`CAP_SEUILS.fractionne = 5`), l'échelle passe avant tout arbitrage d'axe.

`CAP_ECHELLE_FRACTIONNE` — le bout de course s'allonge, la marche reste à
1 min, et **le nombre de répétitions décroît** pour que le volume monte
doucement :

| bout | 1' | 2' | 3' | 4' | 5' | 6' | 8' | 10' | 12' |
|---|---|---|---|---|---|---|---|---|---|
| reps | 8 | 6 | 5 | 4 | 4 | 4 | 3 | 3 | 3 |

Un barreau par semaine. Aucune intensité pendant cette phase. Le volume de la
semaine est celui que l'échelle délivre, jamais une cible à rattraper.

**Exemple.** Post-op LCA, ne court pas du tout, objectif 30 min continu,
12 semaines, 3 sorties :

```
S1  8×(1'C / 1'M)   24 min      S7   23 min continu   69 min
S2  6×(2'C / 1'M)   36 min      S8   26 min continu   78 min
S3  5×(3'C / 1'M)   45 min      S9   28 min continu   84 min
S4  4×(4'C / 1'M)   48 min      S10  30 min continu   90 min
S5  16 min continu  48 min      S11  30 min continu   90 min
S6  20 min continu  60 min      S12  30 min continu   90 min
```

L'objectif est atteint en S10 ; les deux dernières semaines le consolident,
parce que le délai saisi est une durée tenue (§ 9) et non une cible à
atteindre au plus tôt.

**Pièges historiques, tous du même genre.** La progression était conditionnée
à `continu > 0`, ce qui excluait exactement le patient à qui le walk-run est
destiné. Et le constructeur de semaine ajoutait des séances pour atteindre un
volume cible, produisant 11 sorties hebdomadaires de `8×(1'C/1'M)` identiques.

---

## 7. Les paliers de consolidation — dictés par le tissu

`_capPalier(tissu, volume, unite)`

La consolidation tombe en position 2 du cycle (§ 3). Le tissu n'en fixe que
l'**amplitude** :

| Tissu | Amplitude de la consolidation | Pourquoi |
|---|---|---|
| **os** | baisse réelle de 30 % sur le paramètre en cause | signal douloureux tardif, fenêtre de remodelage |
| autres | maintien à charge constante | |
| volume faible | aucune consolidation programmée | rien ne s'accumule encore |

Seuil de « volume faible » : `_capPlancherPalier` = 20 km ou 2 h par semaine.

La consolidation porte sur **le paramètre en cause**. Décharger un paramètre
figé n'a aucun sens.

**Conséquence sur le délai conseillé.** Le pas d'un tour est plafonné :
reconstruire 30 min de qualité hebdomadaire depuis 4 min demande une trentaine
de semaines au rythme prudent. Le facteur limitant est le plafond de +25 % par
tour, pas la consolidation — passer d'un 3:1 à un 4:1 n'a fait gagner que trois
semaines. C'est long,
et c'est le prix de la prudence — le stepper reste libre, et le verdict dit ce
que coûte un raccourci.

Le tissu est pré-rempli par la pathologie mais reste modifiable : c'est un
arbitrage clinique. Le coussinet graisseux n'est aucun des cinq types, une
métatarsalgie peut être osseuse comme neurologique.

---

## 8. Les zones d'allure

Toutes dérivées de **l'allure footing**, seul champ à saisir (`CAP_ZONES`) :

| Zone | Allure | Usage | Coefficient de charge |
|---|---|---|---|
| Z1 | × 1,08 | récupération, retour au calme | 1,0 |
| Z2 | × 1,00 | endurance fondamentale — le gros du volume | 1,2 |
| Z3 | × 0,92 | endurance active, allure marathon | 1,6 |
| Z4 | × 0,86 | seuil, allure 10 km | 2,2 |
| Z5 | × 0,78 | VMA, intervalles courts | 3,0 |
| marche | — | — | **0** |

La charge hebdomadaire affichée est **pondérée par zone**. Sans pondération,
introduire une séance de qualité ferait baisser l'ACWR affiché alors que la
contrainte augmente.

En retour de blessure, Z1 à Z3 suffisent presque toujours. Le Z4 n'apparaît
que dans le dernier tiers de la reconstruction de l'allure, et l'axe Amplitude
plafonne à Z3 (`zonesDegel`).

---

## 9. Le délai

**Le délai est une durée, pas une pente de départ.** Le plan produit
exactement le nombre de semaines demandé et atteint sa cible à la dernière.
Le taux est recalculé chaque semaine sur la valeur réellement atteinte.

**Piège historique.** Le nombre de semaines ne servait qu'à calculer une pente
initiale ; la boucle s'arrêtait sur « cible atteinte ». 14 semaines demandées
en produisaient 11, et 25 en produisaient 14.

### Le délai conseillé

Proposé par défaut, et **le stepper rend la main dès que le praticien y
touche** (lien « y revenir » pour retrouver le conseil).

Le critère dépend du paramètre reconstruit :

- **Volume** → l'ACWR, plafonné à `CAP_SEUILS.acwrOk = 1.15`.
  Le facteur de croissance correspondant se calcule par bissection sur
  `4 / (1 + g⁻¹ + g⁻² + g⁻³)` — soit environ +10 %/semaine, ce qui retombe sur
  la règle des 10 %.
- **Intensité** → le rythme de réintroduction de l'allure, +25 %/semaine max.
  L'ACWR est muet ici : multiplier par cinq 4 min de Z3+ noyées dans 240 min
  de course ne bouge presque pas la charge pondérée. L'invoquer donnerait une
  fausse caution au chiffre.

Les semaines de palier sont déduites : elles ne font pas progresser.

**L'ACWR est un indicateur, jamais une barrière.** Une reprise volontairement
rapide est un choix clinique assumé. Le vrai filet de sécurité est la boucle
de retour — la régression sur douleur, séance après séance.

---

## 10. La fiche — et les contradictions de saisie

Quatre champs décrivent la capacité du coureur. **Ordre de priorité :**

1. **Charge chronique** (4 dernières semaines) — ce qu'il encaisse réellement.
2. **Plus longue sortie tolérée** — plafond par sortie, et repli si la
   chronique est vide.
3. **Course continue sans douleur** — décide de la bascule en course/marche.
4. **Volume hebdomadaire cible** — le plafond absolu, décision du praticien.

### « Vide » ne doit jamais valoir « zéro »

C'est **le** bug qui a coûté le plus cher. « Course continue sans douleur »
vaut 0 par défaut dans le formulaire, et 0 signifie pour le moteur « ne court
pas une seule minute d'affilée ». Un praticien renseignant *« tolère 10 km sur
une sortie »* sans toucher à ce champ voyait son patient renvoyé au fractionné
de reprise, à 4,4 km, avec la première allure en semaine 26.

> **Le champ vide ne doit jamais écraser le champ rempli.**

`_capContinuTolere(p)` déduit la tolérance en continu de la sortie tolérée
(moitié) ou de la charge chronique quand elle n'est pas saisie explicitement.
Une saisie explicite fait toujours foi.

`_capContradictionSaisie(p)` signale une contradiction franche — une sortie
longue tolérée avec une course continue trop courte pour la porter — au lieu
de trancher en silence.

### Le nombre de sorties

La fréquence prescrite est une contrainte du praticien. Une sortie ne s'ajoute
que si la part de chacune **dépasserait la plus longue sortie tolérée**.

```
32 km/sem ÷ 3 sorties = 10,7 km      >  8 km tolérés   →  4 sorties
32 km/sem ÷ 4 sorties =  8,0 km      ✓
```

Le moteur fait passer la contrainte clinique (ne pas dépasser le seuil
douloureux sur une sortie) avant la contrainte d'organisation (le nombre de
séances). L'écran de résultat affiche alors un bandeau qui dit combien de
sorties sont produites, pourquoi, et les deux façons de revenir à la fréquence
prescrite — relever la sortie tolérée, ou baisser le volume cible. Sans lui, le
praticien constate 4 séances là où il en a demandé 3 sans aucune explication.

**Piège historique.** L'ancienne boucle ajoutait une sortie tant que le volume
produit n'égalait pas la cible. Sur les petits volumes, l'arrondi à la minute
suffisait : 13,3 min sur 3 sorties donne 4 min arrondies, soit 12 min
produites, donc une 4ᵉ sortie, qui raccourcit chaque séance et aggrave
l'arrondi. D'où des semaines à 5 et 6 sorties sur 15 min de course.

---

## 11. L'état de la trajectoire, semaine par semaine

`_capBuildProgrammeV2` renvoie `etats` — une entrée par semaine — et
`CAP_STATE.etats` la persiste avec le plan :

| Champ | Contenu |
|---|---|
| `prescrit` | ce que la semaine délivre : volume, minutes de Z3+, course continue |
| `sortie` | de quoi REPRENDRE à la semaine suivante : volume, intensité, continu, dégel, `tourNum`, `baissePrecedente` |
| `cycle1`, `pos`, `palier` | où l'on se trouve dans le microcycle |

Sans cette trace, le plan enregistré n'est qu'une liste de séances : impossible
de savoir, en semaine 7, à quel volume et à quelle intensité le moteur en
était, ni où l'on en est dans le cycle. Une régression ne pourrait alors que
rééchelonner des séances au jugé, **hors du modèle** — ce que fait encore le
code v1 (§ 12).

Lecture utile : sur une semaine de consolidation en baisse, `prescrit.intensite`
est inférieur à `sortie.intensite`. La décharge s'applique à la semaine, elle
n'entame pas l'acquis.

---

## 12. La régression sur douleur

> **Reste à faire.** Les trois boutons passent désormais par la proposition
> quand le plan est en v2. Le moteur v1 (`_capBuildProgressive`, `_capLoadOf`,
> `_capMidpointL`, `_capReplanFromIndex`) subsiste comme **repli pour les plans
> sans axe** — générés avant la v2. Il ne peut donc pas être retiré tant que
> ces plans peuvent exister.

### On propose, on n'applique jamais d'office

Toute douleur signalée ouvre une **proposition**. Le praticien la lit,
l'ajuste, décide. L'interprétation d'un score EVA varie d'une pathologie à
l'autre : c'est un jugement clinique, pas un calcul.

Le recul est **fixe — un tour en arrière** — quel que soit le score. L'EVA est
enregistrée et affichée à côté du repère de la pathologie (`seuil` dans
`CAP_PATHO_DB`, en EVA), mais **ne pilote aucune formule**.

Le moment de la douleur — pendant la course ou dans les 24 h — n'entre pas en
compte : un seul canal de saisie.

### L'ordre : le miroir exact de la remontée

On remonte le volume d'abord et l'allure ensuite (§ 3). On redescend donc
l'allure d'abord, le volume ensuite.

| Séance douloureuse | Réponse |
|---|---|
| **Contient du Z3+** | L'allure recule d'un tour. Le volume ne bouge pas. |
| **Contient du Z3+, allure déjà au plancher** | Plus rien à retirer de ce côté : on retire l'allure et le volume recule d'un tour. |
| **Footing** (Z2 continu, sans Z3+) | Aucun levier n'a été poussé sur cette séance : c'est la charge cumulée. **Décharge globale de 30 %.** |
| **Technique** (Z1) | Décharge globale de 30 %, **et la technique de course est à retravailler** — la part que le moteur ne peut pas traiter à votre place. La cadence cible est rappelée. |

Un footing, c'est du Z2 continu — il n'a pas d'allure : dans tout le moteur,
Z2 vaut `allureFooting × 1,00`, une constante du plan que rien ne fait varier.
« Geler l'allure » revient donc à ne prescrire que des footings, ce que fait le
cycle 1.

### Un tour en arrière, concrètement

La dernière valeur strictement inférieure dans l'historique des états (§ 11).
On lit `sortie`, l'acquis — et non `prescrit`, qu'une semaine de consolidation
abaisse artificiellement.

### Les liens agenda survivent

Une régression change le **contenu** des séances à venir, pas le calendrier. La
date, la séance planifiée et le programme Supabase sont donc reportés de
l'ancienne séance vers la nouvelle, semaine par semaine et rang par rang
(`_capReporterLiensAgenda`), puis le contenu des programmes déjà planifiés est
mis à jour dans Supabase — sans rien supprimer ni recréer.

**Piège historique.** Sans ce report, appliquer une régression sur un plan déjà
envoyé à l'agenda faisait perdre `date`, `seance_id` et `prog_id` à toutes les
séances suivantes : les anciens programmes restaient orphelins chez le patient,
et les nouvelles séances n'apparaissaient nulle part. Dix-huit séances sur un
plan de quinze semaines.

Quand le plan change de longueur — allongement, ou séances en plus dans une
semaine — les séances sans lien sont **comptées et signalées** par un bandeau :
c'est au praticien de resynchroniser avec « Ajouter à l'agenda ».

### Appliquer, c'est régénérer

`_capAppliquerRegression` ne rééchelonne pas les séances à venir une à une :
elle remet le moteur dans l'état corrigé et lui fait **rejouer la suite**, si
bien que le microcycle, l'alternance et les plafonds restent respectés par
construction. Les semaines déjà vécues ne sont jamais réécrites.

Deux issues, au choix du praticien : **allonger** le plan d'un cycle pour tenir
la cible, ou **garder la durée** et terminer plus bas. C'est le patient qui
décide, pas une règle.

### Le panneau

Le clic sur **Douleur** ouvre le curseur EVA, puis le panneau — et **le plan ne
bouge pas** tant qu'aucune décision n'est prise (`_capProposition`).

```
Douleur 4/10 — semaine 10        repère pour cette pathologie : 2/10
Douleur sur une séance à allure élevée : l'allure recule d'un tour,
le volume ne bouge pas.

  PROPOSITION                                              [ − ] [ + ]
  Allure (Z3+)     6′ → 5′
  Volume           33.6 — inchangé

  [ Allonger le plan          ]  [ Garder 15 sem.        ]
    15 → 19 sem., cible tenue      le plan termine plus bas

                                        [ Ignorer ]  [ Appliquer ]
```

`−` / `+` ajustent d'une minute sur l'allure, de cinq points de pourcentage sur
une décharge globale. **Ignorer** laisse la douleur consignée sur la séance et
le plan intact.

### Les deux autres boutons

**Régresser** ouvre la même proposition, sans score : le praticien juge la
séance trop ambitieuse avant même qu'elle soit faite.

**Maintenir** répète la semaine à l'identique. C'est une duplication littérale
— les séances sont recopiées, tout ce qui suit décale d'une semaine, dates
comprises pour ne pas désynchroniser l'agenda, et les copies perdent leur lien
`seance_id` / `prog_id` pour que deux séances ne pointent pas le même
programme. Rejouer le moteur ne conviendrait pas : la position dans le
microcycle changerait et la semaine produite ne serait plus la même.

Le plan prend donc une semaine de retard — c'est la logique. Mais le choix
reste offert : garder la durée fait sauter la dernière semaine.

### Exemple

Périostite, douleur sur une séance de qualité en semaine 10 :

```
levier   : allure
Z3+      : 6' → 5'          un tour en arrière
volume   : 33,6 km          inchangé
repère   : 2/10 pour une périostite
```

Le plan reprend ensuite sa progression depuis ce niveau. La même douleur sur un
footing de la même semaine donnerait : volume 33,6 → 23,5 km et Z3+ 6' → 4'.

---

## 13. Les 18 pathologies

`CAP_PATHO_DB` — chaque entrée porte `axe`, `tissu`, `seuil` de douleur,
`interdits`, `cadenceCible`, `consignes` et `drapeaux`.

| Axe | Pathologies |
|---|---|
| **Charge** | achilléenne corporéale, périostite tibiale, fracture de stress, coussinet graisseux, métatarsalgie, fasciapathie plantaire, tendinopathie patellaire, post-op genou |
| **Amplitude** | achilléenne insertionnelle, claquage, ischio-jambiers proximaux, lombalgie, psoas, pubalgie |
| **Répétition** | fémoro-patellaire, patte d'oie, bandelette ilio-tibiale |

Deux pathologies de même axe et même tissu **doivent** produire la même
mécanique. C'est ce qui permet de ne tester que six situations de saisie
plutôt que dix-huit pathologies.

Les trois dernières (pubalgie, psoas, lombalgie) ne figurent pas sur la
pyramide de La Clinique du Coureur : leur axe est une transposition, à
confirmer cliniquement.

---

## 14. Ce qui n'est pas branché

À jour au 1ᵉʳ août 2026. Ces champs existent mais ne contraignent rien :

- **`interdits`** (côtes, surfaces dures, descentes, dévers) — affichés en
  consigne, sans effet sur la génération. Les rendre contraignants suppose que
  le moteur sache produire du dénivelé, ce qu'il ne fait pas.
- **`terrain`** et **`crossTraining`** (bloc 4) — jamais lus.
- **`cadenceCible`** — posée sur la séance, ne modifie aucun contenu.

---

## 15. Questions ouvertes

**La plus longue sortie tolérée est-elle un plafond figé, ou une valeur de
départ qui progresse ?** Pour une bandelette dont l'objectif *est* de
recomposer une sortie d'une heure d'un seul tenant, elle doit manifestement
croître — mais selon quelle règle ? C'est le seul cas de référence qui échoue
encore (`cap-cas.js`, cas 2).

**La décharge de cycle 1 devrait-elle être saisissable ?** Elle vaut 20 %
d'office dès qu'une pathologie est renseignée. Un patient peu irritable n'en a
peut-être pas besoin.

---

## 16. Méthode de travail — pourquoi ce document existe

Quatre corrections successives ont été livrées, chacune vérifiée, et le
premier essai en consultation réelle échouait encore. La cause n'était pas
dans les règles mais dans la façon de les vérifier : **le moteur était testé
avec des profils écrits à la main**, donc cohérents, alors que le formulaire
produit des combinaisons que ces profils n'avaient jamais.

D'où `qualite/cap-cas.js`, qui part des valeurs par défaut réelles du
formulaire, lues dans `programme.html`. Avant de modifier le moteur :

1. Écrire ou corriger le cas de référence — le résultat attendu **d'abord**.
2. Modifier le moteur.
3. `node qualite/cap-cas.js` doit repasser au vert.
4. Vérifier dans le navigateur, et bumper le `?v=` de `programme.html`.
