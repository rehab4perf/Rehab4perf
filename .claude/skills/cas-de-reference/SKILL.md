---
name: cas-de-reference
description: Méthode des fichiers de cas de Rehab4Perf (qualite/*-cas.js) — écrire le cas avant le correctif, exécuter le vrai code plutôt qu'une copie, et prouver que le garde-fou vire au ROUGE en y injectant la régression. À utiliser dès qu'il s'agit d'ajouter ou de modifier un contrôle dans qualite/, de protéger une correction contre un retour en arrière, quand un contrôle échoue et qu'on se demande s'il faut le corriger ou corriger le code, ou quand l'utilisateur demande de tester, vérifier, garantir ou verrouiller un comportement de ce dépôt.
---

# Cas de référence

Ce dépôt n'a ni framework de test ni compilation. Les garde-fous sont des
scripts Node autonomes dans `qualite/`, lancés à la main et par la skill
`deployer`. Leur valeur ne tient pas à leur nombre mais à une seule propriété :
**un cas qui ne peut pas échouer ne protège rien.**

## L'ordre : le cas d'abord

Écrire le cas attendu **avant** de modifier le moteur, puis corriger, puis
vérifier qu'il repasse au vert. Écrit après, un cas décrit ce que le code fait
plutôt que ce qu'il devrait faire — et il fige alors le défaut.

## La règle qui compte : prouver le rouge

Un cas vert ne prouve rien tant qu'on ne l'a pas vu échouer. Après l'avoir
écrit, **remettre le défaut dans le code** et vérifier qu'il vire au rouge :

```bash
cp <fichier> /tmp/sauvegarde
python3 -c "
import io
p,a,b='<fichier>','''<le code corrigé>''','''<le défaut d'origine>'''
s=io.open(p,encoding='utf-8').read(); assert a in s, 'motif introuvable'
io.open(p,'w',encoding='utf-8').write(s.replace(a,b,1))"
node qualite/<le-cas>.js          # doit afficher ✗
cp /tmp/sauvegarde <fichier>
node qualite/<le-cas>.js          # doit repasser au vert
```

L'`assert a in s` est important : sans lui, une substitution qui ne s'applique
pas laisse le fichier intact et le cas reste vert — on croit alors avoir prouvé
quelque chose. Cette erreur s'est produite plusieurs fois.

Injecter **une régression par famille d'assertions**, pas une seule pour tout
le fichier.

## Les quatre pièges qui ont déjà laissé passer un vert

Ils reviennent, et chacun a déjà coûté un aller-retour.

**Vérifier la fonction, pas qui l'appelle.** Un cas contrôlait qu'un attribut
`onchange` existait dans le HTML — jamais que le gestionnaire faisait son
travail. Il ne le faisait pas. Quand un mécanisme relie deux points, faire le
trajet complet : lire le corps de la fonction appelée, pas seulement le nom
écrit dans l'attribut.

**Ne jamais recopier le code testé dans le cas.** Extraire les vraies fonctions
du fichier et les exécuter :

```js
var src = fs.readFileSync('js/bilan.js', 'utf8');
var f = new Function(src.slice(src.indexOf('function _evoFleche'),
                               src.indexOf('function _evoFig')) +
                     '\nreturn [_evoFleche, _evoStatSingle];')();
```

Un cas qui réécrit ce qu'il teste passe au vert quoi qu'il arrive dans le
produit. Même chose pour un gestionnaire d'événement : en extraire le **corps**
et l'exécuter avec des doublures, plutôt que d'en réécrire la logique.

**Viser la forme actuelle du défaut, pas l'ancienne.** Un garde-fou écrit contre
`break` ne voit rien quand le défaut revient sous la forme d'un `return`.
Formuler l'assertion sur la **propriété voulue** (« la boucle collecte tous les
courants ») plutôt que sur la trace d'une correction passée.

**Borner la zone lue.** Deux règles peuvent porter le même sélecteur — une pour
le bureau, une pour le mobile — et `indexOf` rend la première. Découper d'abord
la tranche pertinente, puis chercher dedans. Un cas qui lit la mauvaise règle
échoue de façon incompréhensible, ou pire, passe.

## Ce qu'un bon cas contient

Un **en-tête qui raconte le défaut** : ce qui se passait, pourquoi ce n'était
pas visible, ce qui a été mesuré. C'est ce texte qu'on lira dans six mois pour
comprendre pourquoi la règle existe — sans lui, elle sera « simplifiée ».

Des **libellés lisibles** (`✓ la flèche dit le sens de la valeur`), pas des noms
de fonctions. La sortie doit se lire comme un compte rendu.

Un **détail en cas d'échec** : la valeur trouvée, pas seulement « faux ». Un
`✗ … — 3 appel(s)` fait gagner le temps d'une enquête.

## Structure

```js
#!/usr/bin/env node
/* Cas de référence — <sujet>.
 *
 * <ce qui se passait, et pourquoi ça ne se voyait pas>
 *
 *   node qualite/<nom>-cas.js
 */
'use strict';
var fs = require('fs'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', '<fichier>'), 'utf8');
var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
// … sections avec console.log('\n<Titre de section>')
console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('<Sujet> : tous les cas passent.');
```

Sortir en `1` en cas d'échec : la boucle de la skill `deployer` lit le code de
sortie.

## Après avoir écrit le cas

L'ajouter à `TESTS_AVANT_DEPLOY.md`, et documenter le mécanisme dans
`CLAUDE.md` — le cas garde le comportement, `CLAUDE.md` explique pourquoi il
est ainsi.

## Quand un cas existant échoue

Deux causes, opposées. Soit le code a régressé — on corrige le code. Soit le
comportement attendu a **légitimement** changé — on corrige le cas, en
expliquant dans son commentaire ce qui a changé et pourquoi l'ancienne
assertion était juste en son temps. Ne jamais supprimer une assertion pour
faire passer un déploiement : c'est exactement le moment où elle sert.
