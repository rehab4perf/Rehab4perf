# Fiche d'entretien — hébergeur certifié HDS

*Préparée le 28 août 2026 · appuyée sur `docs/audit-donnees-sante.md`*

> À avoir sous les yeux pendant l'appel. La partie 1 se lit, la partie 2 se
> pose. Chaque question porte son « pourquoi » : si la réponse ne vous éclaire
> pas sur ce point, c'est qu'elle est incomplète.

---

## 1. Ce qu'ils vont vous demander — réponses prêtes

### 1.1 Qui vous êtes

| | |
|---|---|
| Statut | Masseur-kinésithérapeute libéral, exercice en France |
| Rôle RGPD | Aujourd'hui **responsable de traitement** de ses propres patients. Demain, avec d'autres praticiens : **également sous-traitant pour eux**, et **hébergeur de données de santé pour le compte de tiers** — voir question 0. |
| Utilisateurs | **1 praticien aujourd'hui.** Objectif : **ouvrir la plateforme à d'autres praticiens** — dites-le dès le premier échange, cela change leur offre et votre statut. Les patients accèdent en lecture à leur calendrier par lien nominatif ; ils ne se connectent pas. |
| Finalité | Suivi de rééducation : bilans cliniques, prescription d'exercices, comptes-rendus au médecin. |

### 1.2 Nature des données

Données de santé à caractère personnel : bilans cliniques (diagnostic,
douleur, amplitudes, tests), notes cliniques, questionnaires patients,
protocoles de rééducation, **imagerie médicale** (radio, IRM, échographie,
scanner, arthrographie), et identité des patients (nom, prénom, date de
naissance, sexe).

### 1.3 Volumétrie — mesurée, pas estimée

| | |
|---|---|
| Un bilan enregistré | **12 Ko** (JSON, 558 champs) |
| Base complète à 150 patients × 6 bilans | **~10 Mo** |
| Base complète à 400 patients × 8 bilans | **~40 Mo** |
| Toutes tables confondues, horizon 5 ans | **< 1 Go** |
| Imagerie médicale (fichiers) | **quelques Go** — plafond 20 Mo par fichier |
| Trafic | Très faible : un praticien, quelques dizaines de consultations patient par jour |

**À l'échelle visée** (donnez-leur les deux, ils dimensionneront) :

| Échelle | Base | Imagerie |
|---|---|---|
| 10 praticiens × 150 patients | ~105 Mo | ~9 Go |
| 50 praticiens × 200 patients | ~930 Mo | ~63 Go |

Même à 50 praticiens la base reste modeste : **c'est l'imagerie seule qui
dimensionne le stockage**.

**Dites-le d'emblée.** Votre consommation est négligeable : cela déplace la
discussion du prix des ressources vers le prix du ticket d'entrée, qui est le
vrai sujet.

### 1.4 Architecture actuelle

| Brique | Aujourd'hui | Ce qu'il faut chez eux |
|---|---|---|
| Base de données | PostgreSQL (Supabase) | PostgreSQL managé |
| Sécurité d'accès | **RLS PostgreSQL** — toute la cloison entre praticiens en dépend | RLS natif (standard Postgres) |
| Fichiers | Stockage objet + **URL signées à 120 s** | Stockage objet compatible S3 + URL signées |
| Authentification | Supabase Auth (GoTrue) | À conserver ou à remplacer — voir Q6 |
| Fonctions serveur | **8 fonctions Deno**, dont 6 touchent des données patient | Exécution de conteneurs ou de fonctions |
| Front | Site statique (Netlify) | **Ne contient aucune donnée de santé** — peut rester hors HDS |

### 1.5 Sous-traitants et flux actuels — à déclarer

| Tiers | Rôle | Données de santé ? |
|---|---|---|
| Supabase (États-Unis) | Base, auth, stockage | **Oui** — c'est ce qu'on quitte |
| Netlify (États-Unis) | Hébergement du front statique | Non |
| Strava | Import d'activités sportives des patients | **À qualifier** (voir audit §2.4) |
| Stripe | Facturation des comptes praticiens | Non |
| Resend | E-mails d'invitation aux praticiens | Non |
| Google (Gmail) | Le bouton « Mail » du compte-rendu ouvre Gmail avec le courrier | **Oui — flux sortant à trancher** |

### 1.6 Ce que vous devez décider AVANT l'appel

Ils vous le demanderont, et sans réponse la proposition sera hors sujet.

- **RPO** — quelle perte de données maximale acceptez-vous en cas d'incident ?
  24 h (sauvegarde quotidienne) ou quelques minutes (PITR) ? Le second coûte
  plus cher.
- **RTO** — combien de temps pouvez-vous rester sans l'application ? Une
  demi-journée ? Deux jours ?
- **Échéance visée** pour la migration.
- **Préproduction** : en voulez-vous une, et acceptez-vous qu'elle ne
  contienne que des données fictives ?

---

## 2. Les questions à poser — et pourquoi

### 0. La question préalable — à poser en premier

**0. Je suis éditeur : d'autres praticiens soigneront leurs propres patients
sur ma plateforme, et je stockerai leurs données. Votre certification me
couvre-t-elle, ou dois-je être certifié HDS moi-même ?**
> *Pourquoi* — C'est la question qui engage le plus, et elle n'est pas la même
> que « où j'héberge mes données ». Hébergeur pour le compte de tiers, ce n'est
> plus le même rôle. Plusieurs hébergeurs commercialisent des offres
> explicitement destinées aux **éditeurs de logiciels de santé** : demandez
> laquelle vous correspond, et surtout **ce que le contrat dit de votre propre
> statut**.
>
> **Leur réponse ne vous engage pas.** Faites-la confirmer par un juriste
> santé : c'est leur commerce, pas votre responsabilité juridique.

### A. Certification et contrat

**1. Quel est le périmètre exact de votre certification HDS, service par
service ?** Citez les vôtres : PostgreSQL managé, stockage objet, instances
applicatives.
> *Pourquoi* — Un hébergeur certifié ne l'est pas forcément sur toute sa
> gamme. Le service que vous utiliserez doit être **nommément** dans le
> périmètre.

**2. Quelles activités du référentiel HDS couvrez-vous, et lesquelles restent
à ma charge ?**
> *Pourquoi* — Le référentiel distingue plusieurs activités (mise à
> disposition d'infrastructure, infogérance, sauvegarde…). Savoir lesquelles
> ils portent vous dit ce qu'il vous reste à porter — et à assurer.

**3. Puis-je voir le contrat d'hébergement de données de santé et l'accord de
sous-traitance RGPD avant de m'engager ?**
> *Pourquoi* — Ouvrir un compte chez un hébergeur certifié **ne suffit pas** :
> le contrat spécifique doit exister et être signé. Demandez-le à lire, pas
> à découvrir.

**4. Où sont physiquement hébergées les données, et avez-vous des
sous-traitants ultérieurs ?**
> *Pourquoi* — Vous devez pouvoir répondre à un patient qui le demande, et le
> porter dans votre registre.

**5. Êtes-vous soumis à une législation extraterritoriale ? Quel est
l'actionnariat de la société ?**
> *Pourquoi* — Une entreprise européenne détenue hors UE peut être soumise à
> des demandes d'accès étrangères. C'est une des raisons de quitter Supabase.

### B. La frontière de responsabilité — **la question qui décide de tout**

**6. Si je fais tourner ma propre pile applicative sur vos instances — base,
authentification, services — qu'est-ce qui reste couvert par votre
certification, et qu'est-ce qui devient ma responsabilité ?**
> *Pourquoi* — C'est **la** question de l'appel. Selon la réponse, deux
> chemins très différents :
> - s'ils couvrent l'exploitation, vous pouvez auto-héberger votre pile
>   actuelle et **presque rien ne change dans le code** ;
> - s'ils ne couvrent que l'infrastructure, vous reprenez à votre charge les
>   mises à jour et le durcissement de ces composants — et il devient plus
>   raisonnable de prendre leurs services managés, donc de **remplacer
>   l'authentification et les 8 fonctions**.
>
> Le premier chemin, c'est quelques jours de travail. Le second, plusieurs
> semaines. Ne raccrochez pas sans une réponse claire.

**7. Fournissez-vous une matrice de responsabilité écrite ?**
> *Pourquoi* — Une réponse orale ne vous protège pas. Demandez le document.

### C. Faisabilité technique

**8. PostgreSQL managé : quelle version, quelles extensions disponibles,
ai-je un accès superuser ?**
> *Pourquoi* — **Toute la séparation entre praticiens repose sur les
> politiques RLS.** Elles sont du Postgres standard, donc portables — mais
> vérifiez que vous pourrez les créer, ce qui suppose les bons droits.
> Vérifiez aussi les extensions que votre base utilise réellement (`\dx` sur
> la base actuelle avant l'appel).

**9. Votre stockage objet est-il compatible S3, et sait-il produire des URL
signées à durée limitée ?**
> *Pourquoi* — Votre imagerie médicale est servie par des URL signées de
> 120 secondes. Sans équivalent, il faut réécrire cette partie **et** trouver
> un autre moyen de ne pas exposer des IRM en accès public.

**10. Puis-je exécuter des conteneurs ou des fonctions Node/Deno, et
comment sont gérés les secrets ?**
> *Pourquoi* — Six de vos huit fonctions serveur touchent des données
> patient. Il leur faut un foyer, et 11 variables secrètes un
> coffre.

**11. Chiffrement au repos : activé par défaut ? Qui détient les clés ?
Puis-je apporter les miennes ?**
> *Pourquoi* — Exigence du référentiel, et argument à opposer si un patient
> ou un confrère vous interroge.

**12. Comment sont journalisés les accès aux données de santé ? Quelle
rétention, et puis-je exporter ces journaux ?**
> *Pourquoi* — La traçabilité des accès est une exigence HDS, pas une option.
> Vous devez savoir **qui produit ces traces** : eux, ou vous.

### D. Sauvegarde et réversibilité — **la seconde question qui compte**

**13. Quelle politique de sauvegarde est incluse : fréquence, rétention,
restauration à un instant donné ? Que coûte une rétention plus longue ?**
> *Pourquoi* — C'est là que se joue votre RPO. Et pour de la donnée de santé,
> la sauvegarde n'est pas une option : demandez ce qui est **inclus** et ce
> qui est **facturé**.

**14. Puis-je à tout moment faire un export complet de la base et récupérer
tous les fichiers du stockage, par mes propres moyens ?**
> *Pourquoi* — **Réversibilité.** N'entrez jamais quelque part d'où vous ne
> pouvez pas sortir. C'est aussi ce qui vous permet de garder une sauvegarde
> chez vous, indépendante d'eux.

**15. Que se passe-t-il si je résilie : délai de restitution, format, durée
de conservation ensuite, et me fournissez-vous un certificat de
destruction ?**
> *Pourquoi* — Obligation contractuelle classique en HDS, et c'est le genre de
> clause qu'on lit trop tard.

**16. Avez-vous déjà accompagné une migration depuis Supabase ? Proposez-vous
un accompagnement ?**
> *Pourquoi* — S'ils l'ont déjà fait, ils connaissent les pièges (GoTrue,
> stockage, RLS). Cela peut valoir plus que quelques euros de remise.

### E. Coût

**17. Les 200 €/mois fixes sont-ils par organisation, par environnement, ou
par praticien hébergé ?**
> *Pourquoi* — **C'est la question qui décide de votre modèle économique.**
> Par organisation, le fixe s'amortit : 200 € seul, c'est 200 € par praticien ;
> à dix, c'est 20 €. Par praticien, votre plateforme ne tient pas.
> Enchaînez sur : si c'est par environnement, **une préproduction avec des
> données fictives peut-elle rester hors HDS sur le même compte ?**

**18. Pouvez-vous me chiffrer précisément, sur deux paliers :**
> - aujourd'hui — base < 100 Mo, 1 Go de stockage objet, une petite instance ;
> - à terme — base < 1 Go, **60 Go de stockage objet**, une instance plus large.
>
> **Tarif standard, puis avec le coefficient 1,4**, dans les deux cas.
> *Pourquoi* — Leur page annonce le fixe et le coefficient, pas la grille.
> Sans elle, aucune estimation n'est vérifiable.

**19. Sauvegardes supplémentaires et SLA Premium : combien ?**
> *Pourquoi* — Facturés à part d'après leur FAQ, et vous ne pourrez pas vous
> passer des premières.

**20. Y a-t-il un engagement de durée, des frais de mise en service, un
minimum de facturation ?**

### F. Exploitation

**21. Quel SLA, quel support, quels délais de réponse ? Y a-t-il une
astreinte ?**
> *Pourquoi* — Vous êtes seul. Un incident un vendredi soir, c'est votre
> lundi de consultations.

**22. Comment se passent les maintenances : fenêtres, préavis,
interruptions ?**

---

## 3. Ce qu'il ne faut PAS leur demander de trancher

Un commercial d'hébergeur n'est ni votre juriste ni votre DPO. Ces
questions-là ne sont pas pour lui :

- **la qualification de vos données** — notamment les cas limites de l'audit
  (activités Strava, pratique sportive, fiche athlète) ;
- **l'étendue de vos obligations** de responsable de traitement ;
- **le flux Gmail** du compte-rendu : le conserver ou non ne dépend pas d'eux.

Posez-les à un juriste santé ou à un DPO. Leur réponse à eux serait
rassurante et sans valeur.

---

## 4. À faire avant l'appel

- [ ] `pg_dump --schema-only` de la base de production, et `\dx` pour la liste
      des extensions installées — vous saurez répondre à la question 8.
- [ ] Décider RPO et RTO (§1.6).
- [ ] Relire l'audit, section 4 « Points de blocage à la portabilité ».
- [ ] **Décider si vous annoncez le multi-praticien dès le premier appel.**
      Je le ferais : cela change leur offre, leur contrat et leur tarif, et le
      découvrir après signature serait le pire moment.
- [ ] Poser la même grille à **un second hébergeur** — la comparaison vaut
      surtout sur les questions 6, 13 et 15, où les réponses divergent le plus.
