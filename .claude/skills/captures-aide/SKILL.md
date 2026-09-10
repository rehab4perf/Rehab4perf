---
name: captures-aide
description: Captures d'écran du centre d'aide de Rehab4Perf (aide/img/*.png) — script Playwright qui pilote le Chrome installé, garde du compte de démo, liste des captures attendues lue dans js/aide-content.js. À utiliser dès qu'il est question des captures, screenshots, images ou visuels du centre d'aide, d'une image « Capture à venir », ou de refaire les captures après un changement d'interface.
---

# Captures du centre d'aide

Le centre d'aide attend `aide/img/<section>-<article>-<n>.png` pour chaque étape
qui porte `img: true` dans `js/aide-content.js`. Une image absente s'affiche
« 📷 Capture à venir ».

## La règle qui passe avant tout : UN COMPTE DE DÉMO, jamais le vrai

Ces images sont **publiques**. Un patient de démo ne suffit pas : « Vue
d'ensemble » et « Liste » montrent **tous** les patients du compte, quel que
soit le patient sélectionné, et « Mon compte » montre la vraie signature et le
vrai tampon. Seul un compte séparé, qui ne contient que du fictif, protège
chaque écran par construction.

Le script le fait respecter : il lit l'e-mail de la session connectée et
**refuse d'écrire la moindre image** s'il ne correspond pas au compte de démo
déclaré. Il refuse aussi si la page est retombée sur `auth.html` — une session
expirée en cours de route aurait sinon capturé l'écran de connexion.

## Utilisation

```bash
cd .claude/skills/captures-aide
npm install                                  # une fois : playwright-core, aucun navigateur téléchargé
node scripts/captures.js connexion --demo demo@exemple.fr   # le praticien se connecte LUI-MÊME
node scripts/captures.js --liste             # état des captures, sans navigateur
node scripts/captures.js                     # toutes les captures qui ont une recette
node scripts/captures.js --seule bilan-sauvegarder-bilan-3.png
```

La connexion se fait **à la main** dans la fenêtre ouverte : l'agent n'a pas le
droit de saisir un mot de passe. Le profil Chrome (donc la session) vit dans
`~/.rehab4perf-captures/`, **hors du dépôt** : Netlify publie la racine, un
jeton commité serait servi à tout le monde. Le script refuse de démarrer si ce
chemin tombe dans le dépôt.

## Vérifier la garde

```bash
node qualite/captures-aide-cas.js
```

Il EXÉCUTE la décision (`refusCompte`), la lecture de la liste (`attendues`) et
la garde du profil. Un seul point y reste un contrôle de texte, assumé : que
`captures()` consulte la garde avant sa première écriture — l'exécuter demande
un vrai Chrome et le réseau. La preuve d'exécution se fait donc à la main,
avec un profil vide :

```bash
mkdir -p /tmp/garde/.rehab4perf-captures
echo '{"demo":"demo@exemple.fr"}' > /tmp/garde/.rehab4perf-captures/config.json
HOME=/tmp/garde node scripts/captures.js     # doit refuser, code 1, aucune image
```

## Pourquoi un script plutôt que l'extension Chrome

Les outils de capture des navigateurs pilotés par l'agent renvoient l'image à
l'agent, ils ne l'écrivent pas sur le disque. Le script produit les fichiers,
à taille fixe (1280×800, Retina ×2), et **se relance** quand l'interface
change au lieu de tout refaire à la main.

## Les recettes

`scripts/recettes.js` associe chaque fichier à la suite de gestes qui amène
l'écran. La liste des captures n'y est PAS tenue : elle est lue dans
`js/aide-content.js` à chaque lancement. Une capture ajoutée au centre d'aide
apparaît donc d'office comme « sans recette » — jamais oubliée en silence.

Une image s'écrit dans un fichier temporaire puis se renomme : un lancement
interrompu ne laisse jamais une image à moitié écrite que le centre d'aide
afficherait.
