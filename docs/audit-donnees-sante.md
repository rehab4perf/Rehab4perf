# Audit des données de santé — préparation à un hébergement HDS

*Établi le 28 août 2026 · portée : dépôt `REHAB4PERF` à la révision `41474a1`*

> **Lecture seule.** Ce document décrit l'existant. Il ne propose rien et ne
> modifie rien. Les qualifications juridiques ne sont pas tranchées : les cas
> limites sont **signalés**, pas décidés.

---

## 0. Méthode, et sa limite principale

Le schéma **n'est pas intégralement versionné** : `supabase/migrations/` ne
contient que **5 fichiers**, tous des `ALTER TABLE` postérieurs à la création
des tables. Aucun `CREATE TABLE` n'y figure.

**L'inventaire ci-dessous est donc reconstitué depuis le code** — noms de
tables et de colonnes lus dans les requêtes — et non depuis la base. Il est
fiable sur ce que le code utilise, et **muet sur ce qu'il n'utilise pas** :
une colonne existante mais jamais lue n'y apparaît pas.

**Pour le rendre opposable**, il faut un `pg_dump --schema-only` de la base de
production (ou l'export du schéma depuis le tableau de bord Supabase). Tant
qu'il manque, considérer ce document comme une base de travail, pas comme un
registre de traitement.

Deux autres angles morts, à combler par la même occasion :

- les **politiques RLS** ne sont pas dans le dépôt ; elles conditionnent
  pourtant qui voit quoi, et devront être rejouées à l'identique après
  migration ;
- les **types réels des colonnes** (longueur, nullabilité, contraintes) ne
  sont connus que pour les 5 migrations présentes.

---

## 1. Inventaire

### 1.1 Tables (22 identifiées)

| Table | Rattachée à une personne | Contenu (d'après les requêtes) |
|---|---|---|
| `patients` | oui — c'est le référentiel d'identité | `id, praticien_id, nom, prenom, ddn, sexe, sport, poids, taille, lateralite_main, lateralite_pied, niveau, activite, medecin, fiche (jsonb)` |
| `bilans` | oui | `id, patient_id, praticien_id, date, donnees (jsonb)` |
| `clinical_notes` | oui | `id, patient_id, praticien_id, date, title, body, created_at, remind_seen_at` |
| `athlete_feedback` | oui | `seance_id, patient_id, douleur, rpe, note, exo_data, seen_at` |
| `prom_responses` | oui | réponses aux questionnaires PROM (`patient_id`) |
| `patient_protocols` | oui | `id, patient_id, protocol_id, current_phase_id, phase_started_at, updated_at` |
| `protocol_criteria_checks` | oui | `patient_protocol_id, phase_id, criteria_index` + validation |
| `patient_messages` | oui | messages praticien ↔ patient (`patient_id`) |
| `patient_settings` | oui | réglages par patient |
| `seances_planifiees` | oui | séances datées, rattachées à un patient |
| `programmes` | oui | programmes d'exercices affectés à un patient |
| `strava_activities` | oui | activités sportives importées (durée, distance, FC…) |
| `strava_tokens` | oui — jetons d'un athlète | `access_token, refresh_token, expires_at` |
| `athlete_push_subscriptions` | oui | abonnements aux notifications push |
| `user_settings` | non — praticien | `praticien_id, previous_bilan_layout` |
| `playlists` | non — praticien | `user_id`, listes d'exercices |
| `templates` | non | modèles de séance + `pathologie`, `sport` |
| `template_groups` | non | protocoles, + `pathologie`, `sport`, couleur |
| `templates_library` | non | bibliothèque publiée |
| `exercices_library` | non | catalogue d'exercices |
| `user_exercises` | non — praticien | exercices personnels |
| `praticien_roles` | non — praticien | rôle / droits |

### 1.2 Stockage de fichiers

**Un seul bucket : `imagerie`** (`js/bilan.js:12163`).

Chemin des objets : `<patientId>/<type>-<horodatage>-…`, où `type` ∈
`radio, irm, echo, scan, arthro, autre`. Plafond 20 Mo par fichier.

C'est de **l'imagerie médicale nominative**, indexée par identifiant patient
jusque dans le chemin de l'objet. Accès par URL signée de 120 s
(`js/bilan.js:12258`).

### 1.3 Edge Functions (8)

| Fonction | Touche des données patient |
|---|---|
| `strava-webhook` | oui — `strava_activities`, `strava_tokens` |
| `strava-sync-history` | oui — idem |
| `strava-enrich-activity` | oui — idem |
| `strava-oauth-callback` | oui — `strava_tokens` |
| `notify-athlete` | oui — lit `patients.praticien_id`, `athlete_push_subscriptions` |
| `save-push-subscription` | oui — `athlete_push_subscriptions` |
| `stripe-webhook` | non — comptes praticiens (Stripe + Supabase Auth) |
| `smooth-processor` | non — facturation, invitation praticien par e-mail |

### 1.4 Persistance sur le poste du praticien (`localStorage`)

Non concerné par l'hébergement, mais à connaître.

| Clé | Contenu |
|---|---|
| `athletik-bilan` | **le bilan complet en cours**, ~500 champs, en clair |
| `r4p-cr-med-tests` | résumé des tests fonctionnels du patient courant |
| `r4p-current-patient` | identité du patient sélectionné |
| `r4p-pain-*`, `r4p-done-*`, `r4p-snote-*` | douleurs, séances faites, notes |
| `sb-…-auth-token` | jeton de session Supabase |

---

## 2. Classification

### 2.1 `SANTÉ` — données de santé identifiantes

| Champ / table | Pourquoi |
|---|---|
| `bilans.donnees` | Contient l'intégralité du bilan clinique : diagnostic, douleur, amplitudes, tests orthopédiques, forces, conclusions. **~500 clés** dans un seul JSONB. |
| `bilans.patient_id`, `.date` | Rattachent ce contenu à une personne et à une date de soin. |
| `clinical_notes.title`, `.body` | Notes cliniques en texte libre. |
| `athlete_feedback.douleur` | Cotation de douleur rapportée par le patient. |
| `athlete_feedback.rpe`, `.note`, `.exo_data` | Ressenti d'effort et commentaires sur une séance de rééducation. |
| `prom_responses.*` | Questionnaires de résultat rapportés par le patient (PROM). |
| `patient_protocols.*` | Le protocole suivi révèle la pathologie (`latarjet`, `lca`…) et l'avancement thérapeutique. |
| `protocol_criteria_checks.*` | Critères cliniques validés — l'état fonctionnel du patient. |
| `patient_messages.*` | Échanges praticien ↔ patient, susceptibles de contenir du clinique. |
| `seances_planifiees.*`, `programmes.*` | Prescription d'exercices nominative = acte de soin. |
| **bucket `imagerie`** | Radios, IRM, échographies, scanners, arthro — nominatifs par le chemin. |
| `patients.poids`, `.taille` | Mesures corporelles rattachées à une personne. |
| `patients.lateralite_main`, `.lateralite_pied` | Caractéristique physique individuelle. |
| `patients.medecin` | Médecin prescripteur — révèle une prise en charge. |
| `patients.fiche` (jsonb) | Contenu ouvert ; **inspecter avant de classer** (voir §2.4). |

### 2.2 `PERSONNEL` — données personnelles non médicales

| Champ | Remarque |
|---|---|
| `patients.nom`, `.prenom`, `.ddn`, `.sexe` | Identité. **Devient de la donnée de santé dès qu'elle est jointe** à l'une des tables ci-dessus — ce qui est le cas partout dans l'application. |
| `patients.praticien_id` | Lien de prise en charge. |
| `athlete_push_subscriptions.*` | Point de contact technique (endpoint navigateur). |
| `user_settings.*`, `playlists.*`, `user_exercises.*`, `praticien_roles.*` | Données du praticien, pas du patient. |
| Comptes Supabase Auth, Stripe | Facturation et authentification des praticiens. |

### 2.3 `NEUTRE` — contenu générique

`exercices_library`, `templates`, `template_groups`, `templates_library`
(hors les colonnes `pathologie` / `sport`, voir §2.4). Aucun rattachement à
une personne : ce sont des catalogues.

### 2.4 Cas limites — **à trancher par le praticien**

1. **`strava_activities`.** Activité physique d'une personne identifiée :
   durée, distance, fréquence cardiaque. Une FC est une donnée physiologique ;
   ces activités servent en outre au calcul de charge d'entraînement, qui
   oriente la rééducation. Elles ne sont pas saisies par un professionnel de
   santé et proviennent d'un tiers grand public. **Je ne tranche pas.**

2. **`strava_tokens`.** Ne contient aucune donnée de santé, mais **donne accès**
   au compte Strava du patient. Nature : secret d'accès. À traiter au moins
   comme du `PERSONNEL` sensible.

3. **`patients.sport`, `.niveau`, `.activite`.** Pratique sportive. Anodine
   isolément ; dans une base de rééducation, elle décrit le contexte de la
   prise en charge.

4. **`patients.fiche` (jsonb).** Champ ouvert, alimenté par la fiche athlète.
   Son contenu réel n'est pas déterminable depuis le code seul — **il faut
   l'échantillonner en base** avant de classer.

5. **`templates.pathologie` / `template_groups.pathologie`.** Une pathologie
   y est écrite, mais rattachée à un **modèle**, pas à une personne. Reste
   `NEUTRE` tant qu'aucun identifiant patient n'y est joint.

6. **`patient_messages`.** Le canal est neutre, le contenu ne l'est pas
   forcément. Classé `SANTÉ` par prudence ci-dessus ; à confirmer.

7. **`clinical_notes.title`.** Alimenté automatiquement depuis les dates de
   bilan (`js/bilan.js:5257`) — donc au minimum révélateur d'un suivi.

---

## 3. Cartographie des accès

**81 points d'accès** aux tables classées `SANTÉ`, répartis sur **10 fichiers**.

### 3.1 Par fichier

| Fichier | Accès | Tables concernées |
|---|---:|---|
| `js/prog-main.js` | 35 | `patient_protocols` (9), `athlete_feedback` (7), `clinical_notes` (5), `patient_messages` (4), `protocol_criteria_checks` (4), `bilans` (3), `strava_activities` (3) |
| `js/bilan.js` | 21 | `bilans` (17), `clinical_notes` (4) |
| `athlete.html` | 9 | `athlete_feedback` (4), + 5 tables à 1 accès |
| `index.html` | 7 | `clinical_notes` (4), `athlete_feedback` (2), `bilans` (1) |
| `supabase/functions/strava-*` (3 fichiers) | 5 | `strava_activities` |
| `patients.html` | 2 | `bilans` |
| `outils.html` | 1 | `prom_responses` |
| `prom-link.html` | 1 | `prom_responses` |

*(Les accès à `seances_planifiees` — 27 — et `programmes` — 22 — s'ajoutent si
ces tables sont retenues comme `SANTÉ` ; ils sont concentrés dans
`js/prog-data.js` et `js/prog-main.js`.)*

### 3.2 Lignes exactes — tables `SANTÉ`

**`js/bilan.js`** — `bilans` : 533, 3391, 5101, 5125, 5154, 5166, 5170, 5191,
5282, 5391, 5488, 5994, 6031, 6032, 6057, 6096, 6113 · `clinical_notes` :
5239, 5252, 5257, 5269

**`js/prog-main.js`** — `bilans` : 82, 2858, 9795 · `strava_activities` : 1214,
6000, 6304 · `athlete_feedback` : 1851, 1882, 2055, 2307, 2335, 13587, 14211 ·
`clinical_notes` : 2721, 2768, 2787, 3342, 3355 · `patient_protocols` : 2854,
7056, 8869, 9429, 9688, 9703, 9722, 9906, 9926 · `patient_messages` : 2928,
2939, 3347, 3356 · `protocol_criteria_checks` : 7071, 8910, 9493, 9581

**`athlete.html`** — 1045, 1080, 1083, 1090, 1196, 1209, 1881, 2536, 2876

**`index.html`** — 1527, 1538, 1660, 1669, 1728, 2174, 2175

**`patients.html`** — 660, 665 · **`outils.html`** — 8828 ·
**`prom-link.html`** — 99

**Bucket `imagerie`** — `js/bilan.js` : 12163, 12235, 12258, 12269 ·
`js/prog-main.js` : 10738

**Edge Functions** — `strava-enrich-activity` : 81, 144 ·
`strava-sync-history` : 117 · `strava-webhook` : 124

### 3.3 Ce que la surface a de particulier

- **Aucune couche d'accès.** Les requêtes Supabase sont écrites en clair dans
  les vues, y compris dans des fichiers HTML de plusieurs milliers de lignes.
  Il n'existe aucun module qui centralise l'accès aux données.
- **Deux clients Supabase distincts** cohabitent : le SDK (`sbB.from(...)`)
  et des appels REST bruts (`fetch('/rest/v1/…')`) dans `js/prog-*.js`. Une
  migration devra traiter les deux.
- **`bilans.donnees` est opaque.** Toute la clinique tient dans un JSONB d'une
  seule colonne : c'est ce qui rend l'inventaire fin impossible côté base, et
  ce qui rendrait un chiffrement applicatif par champ très coûteux.

---

## 4. Points de blocage à la portabilité

| Point | Statut en auto-hébergé / PaaS HDS |
|---|---|
| **Edge Functions (8)** | Existent en Supabase self-hosted, mais le déploiement, les secrets et le runtime Deno diffèrent. Sur un Postgres managé HDS **sans** Supabase, il n'y en a pas : les 8 fonctions sont à réécrire (Node/Deno hébergé ailleurs). |
| **Supabase Auth** | Disponible en self-hosted (GoTrue). Sur un Postgres managé nu, **à remplacer entièrement**. Impacte tout le front. |
| **RLS** | Portable — c'est du Postgres. **Mais les politiques ne sont pas dans le dépôt** : elles doivent être exportées avant toute migration, sans quoi elles seront perdues. |
| **Storage (`imagerie`)** | Supabase Storage existe en self-hosted. Sur un PaaS HDS, à remplacer par un stockage objet certifié. Les **URL signées** (`createSignedUrl`) sont une API Supabase, pas un standard. |
| **`auth.admin.*`** | Utilisé par `stripe-webhook` (`listUsers`, `updateUserById`, `generateLink`). Fortement lié à GoTrue. |
| **Realtime** | **Non utilisé.** Aucun `.channel()` ni `.subscribe()` sur les données. Un point de moins. |
| **RPC / fonctions Postgres** | **Aucun appel `.rpc()`.** Toute la logique est côté client. Un point de moins. |
| **Extensions Postgres** | Aucune extension spécifique repérée dans les migrations présentes — **à confirmer sur la base réelle** (`\dx`). |
| **Secrets managés** | 11 variables d'environnement d'Edge Functions (Strava, Stripe, Resend, VAPID, service-role). À reporter dans le gestionnaire de l'hébergeur cible. |
| **Front Netlify** | Statique, aucun stockage. Ne pose pas de question HDS **en tant qu'hébergeur** — l'application est un client. |

### 4.1 Flux sortants de données de santé — à signaler

Ils ne relèvent pas de l'hébergement mais du même dossier de conformité.

1. **Gmail** (`outils.html:7460`). Le bouton « ✉ Mail » du compte-rendu ouvre
   `https://mail.google.com/mail/?view=cm` en passant **le corps du courrier
   dans l'URL** — identité du patient et contenu clinique compris — et le
   copie dans le presse-papier. Transfert vers un tiers, à l'initiative du
   praticien.

2. **Strava** (`www.strava.com`). Jetons OAuth du patient et récupération de
   ses activités. Le flux est entrant, mais la liaison de compte est un
   transfert d'identifiants.

3. **Resend** (`api.resend.com`). Vérifié : n'envoie que des e-mails
   d'invitation et de facturation **aux praticiens**. Aucune donnée patient.

---

## 4bis. Perspective multi-praticien — ce qu'elle change

Le praticien envisage d'ouvrir la plateforme à d'autres confrères. Cela ne
change pas l'inventaire, mais cela change **la nature de deux risques** et
**le rôle juridique de l'éditeur**.

### 4bis.1 Le rôle juridique change

Aujourd'hui : un seul praticien, **responsable de traitement** de ses propres
patients, hébergé chez un tiers.

Demain : d'autres praticiens soignent **leurs** patients sur la plateforme.
L'éditeur devient alors **sous-traitant** pour ces praticiens, et **héberge des
données de santé pour le compte de tiers** — ce que le référentiel HDS encadre
précisément.

**Question ouverte, à poser à un juriste santé** : faut-il être certifié HDS
soi-même, ou l'hébergement chez un prestataire certifié suffit-il, et sous
quelles conditions contractuelles ? **Ce document ne tranche pas.** À noter :
plusieurs hébergeurs commercialisent des offres explicitement destinées aux
**éditeurs de logiciels de santé**, ce qui suggère que le montage est courant —
sans dire pour autant qu'il dispense de quoi que ce soit.

### 4bis.2 Le cloisonnement devient critique

Avec un seul praticien, un défaut d'isolation ne se voit pas — il n'y a
personne d'autre dans la base. À dix, le même défaut est une **fuite de données
de santé entre confrères**.

Or, mesuré sur le code :

| Table | Accès | Dont portant / filtrant `praticien_id` |
|---|---:|---:|
| `seances_planifiees` | 27 | 8 |
| `bilans` | 23 | 6 |
| `programmes` | 22 | 7 |
| `clinical_notes` | 14 | 6 |
| `athlete_feedback` | 13 | **0** |
| `patient_protocols` | 10 | 4 |
| `patients` | 9 | 5 |
| `patient_messages` | 5 | 1 |
| `protocol_criteria_checks` | 5 | **0** |
| `patient_settings` | 3 | **0** |
| `prom_responses` | 2 | **0** |

Un `0` ne signifie pas que la colonne est absente en base : il signifie que
**le code ne filtre jamais dessus**. Sur ces quatre tables, la cloison repose
donc **entièrement sur les politiques RLS** — lesquelles, rappel du §0, **ne
figurent dans aucun fichier du dépôt**.

**Conséquence** : versionner et auditer les politiques RLS cesse d'être une
recommandation de portabilité pour devenir un **préalable à l'ouverture**.

### 4bis.3 Ce qui est déjà en place

L'architecture est **déjà multi-praticien**, ce qui évite une refonte :
`praticien_id` apparaît 72 fois dans le code, une table `praticien_roles`
existe, et la facturation Stripe distingue déjà des plans par praticien.

### 4bis.4 Volumétrie révisée

| Échelle | Bilans | Imagerie (hypothèse : 40 % des patients, 2 examens de 8 Mo) |
|---|---|---|
| 1 praticien × 150 patients | 10 Mo | ~1 Go |
| 10 praticiens × 150 patients | 105 Mo | ~9 Go |
| 50 praticiens × 200 patients | 930 Mo | ~63 Go |

La base reste modeste même à 50 praticiens. **C'est l'imagerie qui dimensionne
le stockage**, et elle seule.

---

## 5. Synthèse

**Ce qui est réellement concerné :**

- **12 tables** portent des données classées `SANTÉ` sans ambiguïté
  (`bilans`, `clinical_notes`, `athlete_feedback`, `prom_responses`,
  `patient_protocols`, `protocol_criteria_checks`, `patient_messages`,
  `patient_settings`, `seances_planifiees`, `programmes`, `patients` pour
  partie, + le bucket `imagerie`).
- **2 tables** sont des cas limites à trancher (`strava_activities`,
  `strava_tokens`).
- **8 tables** sont hors sujet : catalogues et données de praticien.
- **10 fichiers** contiennent les **81 accès** à ces données, dont **2 fichiers
  concentrent 56 accès** (`js/prog-main.js` et `js/bilan.js`) — soit **69 %**
  de la surface dans deux fichiers.
- **6 Edge Functions sur 8** touchent des données patient.

**Ce qui facilite la suite :** pas de Realtime, pas de RPC, pas de logique
métier en base. La dépendance à Supabase est concentrée sur l'accès aux
données, l'authentification et le stockage de fichiers — trois surfaces
identifiables, pas une imbrication diffuse.

**Ce qui la complique :** aucune couche d'accès, deux styles de requête qui
coexistent, et un JSONB unique qui porte toute la clinique.

---

## 6. Ce que je n'ai pas tranché — questions ouvertes

0. **Priorité nouvelle** — l'ouverture à d'autres praticiens (§4bis) : faut-il
   être certifié HDS soi-même en tant qu'éditeur hébergeant pour des tiers ?
   C'est la question qui engage le plus, et elle est juridique, pas technique.
1. Les **sept cas limites** du §2.4, en premier lieu `strava_activities` et
   `patients.fiche`.
2. **Faut-il séparer identité et santé** (pseudonymisation, identité sur
   l'infra HDS et clinique référencée par pseudonyme), ou déplacer les deux
   ensemble ? Cela conditionne toute l'architecture cible.
3. **Cible retenue** : Supabase auto-hébergé chez un hébergeur certifié, ou
   Postgres managé HDS sans Supabase ? Dans le second cas, l'authentification
   et les 8 Edge Functions sont à reconstruire — l'effort n'a rien de
   comparable.
4. **Le cache local** (`athletik-bilan`, ~500 champs en clair sur le poste)
   entre-t-il dans le périmètre à traiter ?
5. **Le flux Gmail** du compte-rendu doit-il être conservé en l'état ?
