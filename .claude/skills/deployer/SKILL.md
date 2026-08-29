---
name: deployer
description: Rituel complet de mise en ligne de Rehab4Perf — contrôles qualité, bump des numéros de version en cascade, cache du service worker, message de commit, push dev puis main, et vérification que le fichier servi porte bien la correction. À utiliser dès qu'il s'agit de pousser, publier, déployer, mettre en ligne, livrer une correction, ou de préparer un commit sur ce dépôt, même si l'utilisateur dit simplement « pousse », « go prod », « déploie » ou « envoie ». À consulter aussi quand une correction déployée semble ne pas prendre effet chez l'utilisateur.
---

# Déployer Rehab4Perf

Le déploiement est automatique : `git push origin main` déclenche Netlify. Il n'y
a pas d'étape de compilation. Tout le risque est donc ailleurs — dans ce qu'on
oublie de vérifier avant, et dans les numéros de version.

## Le piège central, à comprendre avant tout

Un fichier JS est chargé par une page, qui est elle-même chargée par le shell.
Modifier `js/bilan.js` oblige à bouger **deux** numéros : celui du script dans
`bilan.html`, et celui de `bilan.html` dans `index.html`. En oublier un laisse
le navigateur sur son ancienne copie.

Ce qui rend ce défaut coûteux, c'est qu'il est **silencieux et trompeur** : le
déploiement réussit, le fichier est bien en ligne, mais l'utilisateur ne voit
rien changer. On cherche alors le défaut dans du code correct. Cela s'est
produit plusieurs fois et a coûté des heures.

`scripts/bump-versions.js` connaît la chaîne de chargement et fait ce travail :

```bash
node .claude/skills/deployer/scripts/bump-versions.js --dry-run   # montrer
node .claude/skills/deployer/scripts/bump-versions.js             # appliquer
```

Il lit `git status`, en déduit les références à faire bouger, choisit un tampon
`AAAAMMJJ<lettre>` qui **suit** la plus avancée du jour — jamais un trou libre,
une lettre relâchée ce matin restant dans le cache des navigateurs qui l'ont
vue — et incrémente le `CACHE` du service worker concerné. Il sort en erreur si
une référence attendue est introuvable, ce qui signale une chaîne à mettre à
jour dans le script.

## La séquence

**1. Syntaxe.** Une erreur ici casse toute la page, en silence dans une iframe.

```bash
node --check js/bilan.js && node --check js/prog-data.js && node --check js/prog-main.js && node --check js/aide-content.js
```

Pour le script inline de `bilan.html` ou `outils.html`, extraire le bloc avant
de le contrôler — voir `CLAUDE.md`.

**2. Les contrôles qualité, tous.** Ils sont ~35 et coûtent quelques secondes.

```bash
fail=0; for f in qualite/*-cas.js qualite/check-*.js; do node "$f" >/dev/null 2>&1 || { echo "✗ $f"; fail=1; }; done; [ $fail -eq 0 ] && echo "tous verts"
```

Un contrôle rouge arrête le déploiement. S'il est rouge **parce que le
comportement attendu a changé**, c'est le cas de référence qu'il faut corriger,
en expliquant pourquoi dans son commentaire — jamais le supprimer.

**3. Doublons d'identifiants**, si `bilan.html` a été touché — voir `CLAUDE.md`.

**4. Les numéros de version** — le script ci-dessus.

**5. Le commit.** En français, à l'impératif ou au présent, `type(portée): sujet`
en minuscules. Le corps explique **le pourquoi et le mécanisme**, pas la liste
des lignes changées : c'est ce corps qu'on relira dans six mois pour comprendre
pourquoi une chose est écrite ainsi. Y faire figurer les mesures quand il y en a
(« mesuré : 16 px de large donnent 972 px de haut ») — un chiffre vaut un
paragraphe. Terminer par la ligne `Co-Authored-By` habituelle.

**6. Le push.** `dev` d'abord, `main` ensuite.

```bash
git branch -f dev main && git push -q origin dev && git push -q origin main
```

**7. La vérification en ligne — elle n'est pas facultative.** « Le push est
passé » ne veut pas dire « la correction est servie ». Attendre le build, puis
interroger le fichier réellement servi :

```bash
for i in $(seq 1 8); do
  v=$(curl -s "https://app.rehab4perf.com/index.html" | grep -o 'programme.html?v=[0-9a-z]*' | head -1)
  [ "$v" = "programme.html?v=<TAMPON>" ] && { echo "déployé : $v"; break; }; sleep 15
done
curl -s "https://app.rehab4perf.com/js/prog-data.js?v=<TAMPON>" | grep -c '<un motif propre à la correction>'
```

Chercher un motif **propre à la correction**, pas seulement le numéro : c'est la
seule preuve que le contenu est bien là.

## Ce qui ne part pas avec `git push`

Les fonctions Edge (`supabase/functions/`) se déploient séparément :
`supabase functions deploy <nom>`. Netlify ne sert que le statique.

## Quand l'utilisateur dit que la correction n'a pas pris

Avant de toucher au code, distinguer trois causes — elles se traitent à des
endroits opposés :

1. **Le fichier servi ne porte pas la correction** → un numéro a été oublié.
   Le `curl` ci-dessus tranche en une commande.
2. **Le fichier servi la porte, mais l'appareil ne l'a pas** → faire lire le
   numéro de version affiché en bas du Centre d'aide (`helpBuild` dans
   `index.html`), qui est dérivé de l'adresse réellement chargée.
3. **L'appareil a le bon numéro et le défaut persiste** → la correction est
   fausse, et sur un moteur qu'on ne teste pas. Demander la plateforme exacte :
   un défaut visible seulement sur WebKit mobile ne se reproduit sur aucun
   navigateur de bureau. Voir la skill `verif-visuelle`.

Poser la question du numéro de version **avant** de modifier quoi que ce soit
fait gagner des allers-retours entiers.
