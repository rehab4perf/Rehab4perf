# Protocole de test — AVANT TOUT DÉPLOIEMENT

> ⚠️ Ce fichier est obligatoire. Aucun push sur `main` sans avoir coché tous les tests concernés.

---

## ⚙️ Contrôles automatiques — à lancer systématiquement

```bash
node qualite/check-css-vars.js
node qualite/check-echelle.js
node qualite/check-couleurs.js
node qualite/etapes-cas.js
node qualite/motifs-cas.js
node qualite/lsi-cas.js
node qualite/cr-lignes-cas.js
node qualite/cr-cotes-cas.js
node qualite/hash-cas.js
node qualite/templates-cas.js
node qualite/feedback-cas.js
node qualite/cap-cas.js
node qualite/course-cas.js
node qualite/prehension-cas.js
node qualite/tactile-cas.js
node qualite/strava-doublons-cas.js
node qualite/cr-sections-cas.js
node qualite/cardio-cas.js
node qualite/cr-empreinte-cas.js
node qualite/retest-cas.js
node qualite/bilan-anterieur-cas.js
node qualite/cr-med-tests-cas.js
node qualite/cr-colonnes-cas.js
node qualite/evolution-graphiques-cas.js
node qualite/builder-consignes-cas.js
node qualite/topbar-cas.js
node qualite/echeances-cas.js
node qualite/cr-coupures-cas.js
node qualite/modele-ouvert-cas.js
```

- [ ] Sortie verte. Une variable CSS non définie est ignorée en silence par le
      navigateur : l'élément perd son fond ou sa couleur sans qu'aucune erreur
      n'apparaisse, et le défaut ne se voit que sur certaines zones de la page.
- [ ] Sortie verte. Aucune taille de police hors des neuf pas `--fs-*`. Le
      compteur des valeurs restantes ne doit que baisser.
- [ ] Sortie verte. Aucune couleur hors palette nouvelle. Le compteur des
      valeurs restantes ne doit que baisser.
- [ ] Sortie verte. L'appartenance d'un bloc à une étape est positionnelle :
      tout bloc poussé derrière un séparateur est absorbé par cette étape.

---

## 🔵 BUILDER PROGRAMME — Tests obligatoires si `programme.html` est modifié

### Flux 1 — Création d'un modèle (mode modèle)
- [ ] Cliquer "📋 Nouveau modèle" en tête du panneau → builder vide, titre
      "Nouveau modèle", pas de date, pas de bouton "Planifier", pas de champ nom
- [ ] Le bouton d'enregistrement dit "Enregistrer le modèle" (pas "Sauvegarder")
- [ ] Ajouter au moins 1 exercice → badge "● non sauvegardé" apparaît
- [ ] Fermer sans enregistrer → la confirmation parle bien du TEMPLATE, pas de la séance
- [ ] Enregistrer → modal : seuls Nom, Pathologie et Sport visibles ; "Classement" replié
- [ ] Confirmer → retour à l'agenda, le modèle apparaît dans le panneau

### Flux 1 bis — La séance en cours n'est JAMAIS perdue
> Le défaut historique : "Nouvelle phase" faisait `blocs = []` sans rien demander.
- [ ] Composer une séance dans le builder, la laisser NON enregistrée
- [ ] Cliquer "＋ Nouvelle phase" sous un protocole → plan de travail vide,
      titre "Nouvelle phase — <protocole>", numéro de phase pré-rempli
- [ ] Fermer le builder → la séance de départ est retrouvée à l'identique,
      avec sa date et son badge "● non sauvegardé"
- [ ] Rouvrir le builder → le brouillon proposé est celui de la SÉANCE,
      pas celui du modèle

### Flux 1 ter — Une même séance sur plusieurs jours
- [ ] Depuis un jour de l'agenda, composer une séance (non enregistrée)
- [ ] Le bouton « Planifier » est visible (il était masqué dans ce contexte)
- [ ] « Cocher les jours sur l'agenda » → la séance s'enregistre toute seule,
      le builder se ferme, le calendrier passe en sélection
- [ ] Le jour d'origine est DÉJÀ coché ; le bandeau affiche « 1 jour sélectionné »
- [ ] Cocher deux autres jours → valider → 3 séances planifiées, une seule
      séance enregistrée (les 3 pointent vers le même programme)
- [ ] Le bouton d'enregistrement ne dit plus « Enregistrer — <date> » mais
      « Sauvegarder » : sinon on créerait un second programme en double
- [ ] Depuis le menu ⋮ d'une séance de l'agenda, « Planifier sur d'autres dates »
      → aucun jour n'est pré-coché (on ne vient pas du builder)

### Flux 2 — Sauvegarde séance patient
- [ ] Sélectionner un patient → cliquer "+ Séance" → badge protocole absent
- [ ] Ajouter exercices → cliquer "💾 Sauvegarder" → séance sauvegardée (pas une erreur)
- [ ] Vérifier que le badge "● non sauvegardé" disparaît

### Flux 3 — Consulter et ouvrir un modèle depuis l'agenda
- [ ] Cliquer sur une carte de modèle dans la sidebar → elle se DÉPLIE sur
      place (blocs et exercices lisibles), le builder ne s'ouvre PAS
- [ ] Le nom d'une phase n'est JAMAIS tronqué : il passe sur deux lignes, et
      le préfixe du protocole est retiré (« LCA — Phase 1 : Récupération »
      sous le protocole « LCA » s'affiche « Phase 1 : Récupération »)
- [ ] Les étiquettes pathologie/sport sont sur l'en-tête du protocole, pas
      répétées sur chaque phase
- [ ] Aucun emoji dans la sidebar
- [ ] Chaque carte fait au moins 44 px de haut (cible tactile)
- [ ] Cliquer à nouveau → elle se replie
- [ ] Modèle vide → message "Ce modèle est vide." affiché
- [ ] Cliquer le kebab (⋮) ou le "+" sur une carte dépliée → n'affecte pas le pli
- [ ] Dans la carte dépliée, cliquer "Ouvrir dans le builder" → ouvre une
      séance NEUVE avec le modèle dedans (équivalent "+ Séance" pré-rempli)
- [ ] ⚠️ RÉGRESSION À SURVEILLER : ouvrir une séance planifiée depuis une chip,
      fermer le builder, puis "Ouvrir dans le builder" un modèle →
      le builder doit être VIDE de la séance précédente, et le bouton doit
      afficher "Sauvegarder" (PAS "Enregistrer la séance"). Sinon
      l'enregistrement modifierait la séance déjà planifiée chez le patient.
- [ ] Dans le builder, onglet "Modèles" → dépliage bloc/exercice inchangé
      (surface distincte, non touchée par ce lot)

### Flux 3 bis — Bouton "+" (planifier un modèle sans passer par le builder)
- [ ] Patient sélectionné → cliquer "+" sur une carte → une copie du modèle
      est créée pour ce patient, PUIS le même modal "Planifier la séance" que
      celui du builder s'ouvre (bouton "Cocher les jours sur l'agenda" en
      premier, saisie date par date en repli) — plus l'ancien mini-modal à
      7 jours fixes
- [ ] Aucun patient sélectionné → clic sur "+" → alerte demandant de
      sélectionner un patient, aucune requête réseau
- [ ] "Cocher les jours sur l'agenda" → calendrier en sélection → cocher 2 ou
      3 jours → valider → autant de séances planifiées, toutes sur LA MÊME
      copie du modèle (une seule ligne `programmes`)
- [ ] Repli "saisir les dates une par une" → fonctionne identiquement au
      builder (ajout de lignes de date, "Planifier")

### Flux 3 ter — Piocher dans un modèle (onglet Modèles du builder)
- [ ] Déplier un modèle qui contient une étape → AUCUNE ligne ne correspond
      au séparateur d'étape (pas de ligne "+" sans exercices)
- [ ] Ajouter un bloc seul → il arrive sans étape ; séance vide → 0 étape
- [ ] Ajouter un 2e bloc de la même étape source → les deux se suivent,
      toujours 0 étape (le défaut donnait 2 étapes du même nom)
- [ ] Séance dont la fin est une étape ouverte → le bloc pioché la REJOINT,
      il n'en crée pas une nouvelle et n'en change pas le titre
- [ ] "+ Ajouter tous les blocs" → l'étape du modèle est bien importée,
      avec son titre d'origine (seul chemin qui importe des étapes)

### Flux 4 — Bouton "+ Enregistrer" (tabs)
- [ ] Bouton "＋ Enregistrer" visible en permanence dans la barre des tabs
- [ ] Builder vide → clic → alerte "La séance est vide"
- [ ] Builder avec contenu, patient sélectionné, hors contexte date/chip →
      clic → enregistrement DIRECT (plus de modal de destination)
- [ ] Aucun patient sélectionné dans ce même contexte → alerte demandant de
      sélectionner un patient (pas de repli silencieux vers un modèle)

---

## 🟢 BILAN — Tests obligatoires si `bilan.html` est modifié

- [ ] Changer de patient → confirmation si bilan modifié
- [ ] Annuler le changement → patient précédent restauré dans l'UI
- [ ] CR Tests et CR Complet affichent les zones douloureuses avec côté
- [ ] Exporter HTML CR → lisible sur iPhone (pas de texte coupé)

---

## 🟡 INDEX — Tests obligatoires si `index.html` est modifié

- [ ] Menu "···" sur un patient → Sélectionner / Modifier / Supprimer fonctionnent
- [ ] Modifier infos patient → changement visible immédiatement
- [ ] Supprimer patient → confirmation, patient retiré de la liste

---

## Règle de déploiement

```
AVANT git push → cocher les tests → si un test échoue → NE PAS PUSHER
```

En cas de régression découverte après push :
1. `git revert HEAD` immédiatement
2. Analyser le bug
3. Fix + re-test complet
4. Push du fix
