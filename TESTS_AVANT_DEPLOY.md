# Protocole de test — AVANT TOUT DÉPLOIEMENT

> ⚠️ Ce fichier est obligatoire. Aucun push sur `main` sans avoir coché tous les tests concernés.

---

## 🔵 BUILDER PROGRAMME — Tests obligatoires si `programme.html` est modifié

### Flux 1 — Création template via protocole (+ Nouvelle phase)
- [ ] Cliquer sur un protocole dans la sidebar → il s'ouvre et reste ouvert après rechargement
- [ ] Cliquer "＋ Nouvelle phase" → builder s'ouvre, badge protocole visible en haut (vert)
- [ ] Ajouter au moins 1 exercice → badge "● non sauvegardé" apparaît
- [ ] Fermer le builder sans sauvegarder → confirmation s'affiche
- [ ] Rouvrir le builder → brouillon proposé à la restauration
- [ ] Ajouter exercices → cliquer "📋 Enregistrer la phase" → modal s'ouvre avec protocole pré-sélectionné
- [ ] Confirmer → template apparaît dans la sidebar sous le protocole

### Flux 2 — Sauvegarde séance patient
- [ ] Sélectionner un patient → cliquer "+ Séance" → badge protocole absent
- [ ] Ajouter exercices → cliquer "💾 Sauvegarder" → séance sauvegardée (pas une erreur)
- [ ] Vérifier que le badge "● non sauvegardé" disparaît

### Flux 3 — Chargement template existant
- [ ] Cliquer sur un template dans la sidebar → exercices chargés dans le builder
- [ ] Bouton affiche "🔄 Mettre à jour" (pas "Enregistrer la phase")
- [ ] Modifier un exercice → "🔄 Mettre à jour" → toast de confirmation

### Flux 4 — Bouton "+ Enregistrer" (tabs)
- [ ] Bouton "＋ Enregistrer" visible en permanence dans la barre des tabs
- [ ] Builder vide → clic → alerte "La séance est vide"
- [ ] Builder avec contenu → clic → modal template s'ouvre

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
