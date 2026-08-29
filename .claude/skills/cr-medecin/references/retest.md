## Marquage du retest — le CR ne devine plus, il lit une marque

```bash
node qualite/retest-cas.js
```

Le CR décidait « frais ou ancien » en **comparant les valeurs**. Un test refait
dont le résultat n'a pas bougé — un Lachman toujours négatif à huit semaines —
se retrouvait donc daté du bilan précédent. C'est faux, et c'est justement
l'information la plus forte du suivi.

La question posée est désormais « ai-je refait ce test ? ». Elle ne se déduit
d'aucune donnée : elle se **marque**, par bloc, dans `donnees._reeval`. La
marque se pose **seule** dès qu'un champ du bloc est touché — `isTrusted`
écarte les écritures programmatiques, sans quoi ouvrir un bilan ancien le
marquerait entièrement. Le praticien ne clique que dans le seul cas où la
machine ne peut pas savoir : test refait, résultat identique.

C'est la généralisation de `_afTouched`, qui traitait déjà ce problème pour les
seules cases de l'Analyse Fonctionnelle. Les deux coexistent : l'AF est rendue
en JS hors de tout `.block[data-block-id]`.

**La pastille ne s'affiche que si elle peut servir.** Il faut un bilan
antérieur pour qu'il y ait quelque chose à réévaluer : sur un premier bilan,
« Réévalué » ne veut rien dire et la pastille n'est que du bruit sur 164 blocs.
`_reevalMajVisibilite` suit `_crInSuiviMode`.

**Le MARQUAGE, lui, tourne dans tous les cas** — y compris sur ce premier
bilan. C'est ce qui permettra au bilan SUIVANT de savoir que ces tests
existaient déjà (`_crDejaEvalue`). Masquer la pastille ne doit jamais couper le
mécanisme : ni `_reevalEcouter` ni `_reevalBlocsPourSauvegarde` ne consultent la
visibilité, et un cas de référence le garde. Les confondre ferait annoncer
« réévalué » sur des tests faits pour la première fois.

Le grain est le **bloc**. Marquer une page déclarerait réévalués dix tests qu'on
n'a pas refaits ; marquer le champ redemanderait ce que l'interaction dit déjà.
Corollaire assumé et refermé dans le code : dans un bloc marqué, un champ resté
**vide** reste « ancien » — la marque porte sur le bloc, l'affirmation sur le
champ.

**Une première mesure ne porte AUCUNE mention** — règle du praticien : ce qui
n'est pas marqué « réévalué » en est une, et un libellé de plus dirait ce que
l'absence dit déjà. L'état reste néanmoins **distingué en interne** : sans lui,
une première mesure serait annoncée « réévaluée », ce qui est faux. Ne pas
« simplifier » en supprimant l'état — c'est le libellé qui a été retiré, pas la
distinction.

**Une première mesure n'est pas une réévaluation.** Le mot « réévalué » sur un
test fait pour la première fois est faux, et le médecin le lit comme un suivi.
`_crDejaEvalue` répond « ce test avait-il déjà été évalué ? » par deux indices,
car aucun ne suffit seul : une marque sur ce bloc dans un bilan antérieur, ou
une vraie valeur dans la fusion des antérieurs.

« Vraie » **exclut `false`** : `_serializeBilan` parcourt tout le formulaire,
donc chaque bilan enregistre chaque case, cochée ou non. Une case à `false` en
juin ne dit pas que le test a été fait ce jour-là — elle est indiscernable de
« jamais évaluée », exactement le raisonnement posé pour `_afTouched`. Sans
cette exclusion, **aucun bloc à cases ne serait jamais reconnu comme initial**.

**La question « déjà évalué ? » se pose AUSSI dans le repli.** `_crDejaEvalue`
n'était consulté que pour les bilans portant une marque — or aucune base n'en
portait encore. On passait donc toujours par l'ancienne comparaison de valeurs,
qui répondait « réévalué » sans jamais se demander si le test existait avant :
une première mesure y était annoncée comme un contrôle de suivi. Le repli
tranche désormais lui aussi entre `initial` et `neuf`.

**Tout chemin d'enregistrement doit écrire `_reeval`.** Le Suivi rapide
construit ses `donnees` à la main (`merged`) au lieu de passer par
`_serializeBilan` : il écrivait `_meta` et `_blCustom` mais jamais `_reeval`.
La marque s'y **déduit du delta** — les champs saisis désignent leurs blocs via
`_reevalMap` — et s'unit à celles que portait déjà le bilan du jour. Un cas de
référence compte les écritures de `_reeval` et les tampons `_meta` : le jour où
un troisième chemin apparaîtra, il échouera.

**`null` et `[]` ne veulent pas dire la même chose.** `_reevalLire` rend `null`
quand la clé est absente : bilan enregistré avant le mécanisme, on retombe sur
l'ancienne comparaison de valeurs. `[]` veut dire « rien n'a été réévalué ».
Confondre les deux griserait entièrement tous les bilans anciens.

**Une marque ne se perd pas.** `_reevalBlocsPourSauvegarde` réunit les marques
de la session à celles que portait déjà le bilan édité. Rouvrir un bilan pour
corriger une faute de frappe l'aurait sinon vidé de ce qu'il disait, sans le
moindre signal.

`_crCtx()` remplace le calcul en dur sur `_allBilans[0]` : `_crInSuiviMode`
répondait `false` dès qu'on consultait un bilan qui n'était pas le plus récent,
et **tout un CR ancien s'affichait sans distinction**. Le contexte se calcule
depuis le bilan **consulté** — `_crPrevMerged(start)` porte donc `start` dans sa
clé de cache, faute de quoi passer d'un bilan à l'autre rendrait la mauvaise
fusion.

**Le CSS d'export ne contenait aucune de ces règles.** `.cr-item--carried`,
`--fresh` et `.cr-date-badge` étaient émis par le HTML mais absents de la chaîne
`var css = \`…\`` : le marquage était **totalement invisible dans le document
envoyé au médecin**. Même piège que d'habitude — une règle ajoutée d'un seul
côté ne se voit pas là où le document est lu.
