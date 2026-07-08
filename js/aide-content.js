/* ═══════════════════════════════════════════════════════════════════
   CENTRE D'AIDE — CONTENU
   Source unique consommée par aide.html (page complète) et par le
   drawer contextuel « ? » de index.html. Ne jamais dupliquer ce
   contenu ailleurs.

   Structure :
   R4P_AIDE.sections = [{ id, emoji, titre, articles:[{ id, titre,
     intro, etapes:[{ t: action, x: détail, img: true|false }] }] }]
   R4P_AIDE.faq = [{ q, a }]

   Images : si etape.img est vrai, le rendu cherche
   aide/img/<section>-<article>-<n>.png (n = position de l'étape,
   base 1). Fichier absent → placeholder « Capture à venir ».
═══════════════════════════════════════════════════════════════════ */

var R4P_AIDE = {

sections: [

/* ── 🚀 PREMIERS PAS ─────────────────────────────────────────── */
{ id:'premiers-pas', emoji:'🚀', titre:'Premiers pas', articles:[
  { id:'connexion', titre:'Se connecter à Rehab4Perf',
    intro:'L\'accès praticien se fait sur invitation, avec un email et un mot de passe individuels.',
    etapes:[
      { t:'Ouvrez app.rehab4perf.com', x:'Si vous n\'êtes pas connecté, la page de connexion s\'affiche automatiquement.' },
      { t:'Saisissez votre email et votre mot de passe', x:'Mot de passe oublié ? Utilisez le lien de réinitialisation : un email vous sera envoyé.' },
      { t:'Votre session reste ouverte 8 heures', x:'Après 8 h sans activité, vous êtes déconnecté automatiquement par sécurité.' }
    ]},
  { id:'creer-patient', titre:'Créer et sélectionner un patient',
    intro:'Le patient actif est partagé par tous les onglets : bilan, outils et programme travaillent toujours sur le même dossier.',
    etapes:[
      { t:'Cliquez sur le bouton 👤 en haut de l\'écran', x:'Il affiche « Aucun patient » tant que personne n\'est sélectionné.', img:true },
      { t:'Cliquez sur « + Nouveau »', x:'Renseignez civilité, nom, prénom, date de naissance et sport. La date de naissance sert notamment aux estimations de fréquence cardiaque (Strava).' },
      { t:'Cliquez sur la fiche du patient pour l\'activer', x:'Son nom apparaît dans le bouton 👤. Tous les onglets basculent sur son dossier.' }
    ]},
  { id:'navigation', titre:'Naviguer entre les onglets',
    intro:'Trois espaces de travail, toujours chargés en arrière-plan : vous ne perdez jamais votre saisie en changeant d\'onglet.',
    etapes:[
      { t:'Bilan clinique', x:'L\'examen complet par région (épaule, rachis, hanche, genou, pied…) et la génération des comptes-rendus.' },
      { t:'Outils', x:'Les questionnaires PRO, les scores fonctionnels et le configurateur de CR médecin.' },
      { t:'Programme', x:'La bibliothèque d\'exercices, le builder de séances, l\'agenda, les cycles, le journal et l\'évolution.' },
      { t:'Mon compte', x:'Vos informations professionnelles, la sécurité et les réglages de notifications. On y accède via « Mon compte » en haut à droite.' }
    ]},
  { id:'mon-compte', titre:'Remplir « Mon compte »',
    intro:'Vos informations professionnelles alimentent la signature de vos comptes-rendus (CR médecin, bilans). Prenez une minute pour les renseigner : elles sont saisies une seule fois et réutilisées partout.',
    etapes:[
      { t:'Ouvrez « Mon compte » (en haut à droite)', x:'La carte « Informations professionnelles » regroupe tous les champs de votre profil.', img:true },
      { t:'Renseignez Prénom et Nom', x:'Ils composent votre nom affiché et la signature reprise en bas des comptes-rendus.' },
      { t:'Renseignez le N° ADELI / AM', x:'Votre numéro d\'identification praticien : il figure sur les courriers destinés au médecin.' },
      { t:'Ajoutez Téléphone et Cabinet / Structure', x:'Coordonnées reprises dans l\'en-tête / le pied des CR. Le Cabinet est le nom de votre structure (ex. « Athletik Lamarck »).' },
      { t:'L\'email du compte n\'est pas modifiable ici', x:'Il identifie votre connexion. Il s\'affiche en lecture seule.' },
      { t:'Cliquez sur « Enregistrer »', x:'Un « ✓ Sauvegardé » confirme. Le profil est synchronisé et diffusé aux onglets Bilan et Outils immédiatement — pas besoin de recharger.' },
      { t:'Modifier le mot de passe', x:'Dans la carte « Sécurité & Session », cliquez sur « Modifier » : un email de réinitialisation vous est envoyé. Le mot de passe ne se change jamais directement dans l\'app.' },
      { t:'Réglages de notifications', x:'Plus bas, la carte « Notifications » regroupe les interrupteurs (pastilles agenda, cloche, notifications navigateur, rappels de notes). Voir la section Notifications pour le détail.' },
      { t:'Se déconnecter', x:'Le bouton « Se déconnecter » en bas ferme votre session sur cet appareil.' }
    ]}
]},

/* ── 🩺 BILAN CLINIQUE ───────────────────────────────────────── */
{ id:'bilan', emoji:'🩺', titre:'Bilan clinique', articles:[
  { id:'infos-patient', titre:'Renseigner les informations patient',
    intro:'La première page du bilan conditionne beaucoup de choses — notamment les dates, utilisées partout ailleurs.',
    etapes:[
      { t:'Ouvrez la page « Infos » du bilan', x:'Activité, sport, antécédents, contexte de la blessure.' },
      { t:'Renseignez la date d\'opération (ou d\'accident)', x:'Cette date devient le « J0 » du patient : elle sert de référence aux étiquettes J+ de l\'agenda et aux rappels automatiques des protocoles (ex. CR médecin à J+45).', img:true }
    ]},
  { id:'remplir-tests', titre:'Remplir les tests par région',
    intro:'Chaque région (épaule, rachis, hanche, genou, pied, membre supérieur…) a ses tableaux de tests orthopédiques et fonctionnels.',
    etapes:[
      { t:'Naviguez vers la région concernée', x:'Le menu du bilan liste toutes les pages disponibles.' },
      { t:'Saisissez les valeurs côté gauche / côté droit', x:'Amplitudes, forces, scores… Les asymétries se calculent automatiquement quand c\'est pertinent.' },
      { t:'Ajoutez des commentaires libres si besoin', x:'Ils seront repris dans le compte-rendu.' }
    ]},
  { id:'generer-cr', titre:'Générer un compte-rendu',
    intro:'Deux formats générés automatiquement à partir de vos saisies — rien à rédiger à la main.',
    etapes:[
      { t:'« CR Tests » : le condensé des tests réalisés', x:'Idéal pour un suivi interne ou un point rapide.' },
      { t:'« CR Complet » : le bilan intégral structuré', x:'Toutes les régions évaluées, les scores et vos commentaires.' },
      { t:'Copiez ou exportez le résultat', x:'Le texte se met à jour en direct si vous modifiez le bilan. Pour un courrier destiné au médecin, utilisez plutôt le CR médecin de l\'onglet Outils.' }
    ]},
  { id:'sauvegarder-bilan', titre:'Sauvegarder, modifier et suivre un bilan',
    intro:'Un bilan est enregistré à une date donnée. Comprendre la différence entre corriger un bilan existant et créer un bilan de suivi est essentiel : c\'est ce qui construit — ou non — les courbes d\'évolution du patient.',
    etapes:[
      { t:'Sauvegarder le bilan', x:'Le bouton « Sauvegarder le bilan » enregistre l\'ensemble de vos saisies pour le patient actif, daté du jour. Une fois sauvegardé, le bilan passe en mode lecture (📖) pour éviter les modifications accidentelles.', img:true },
      { t:'Mode lecture', x:'Après sauvegarde, les champs sont verrouillés. Deux options s\'offrent alors : « Modifier ce bilan » (corriger) ou « Bilan de suivi » (nouvelle évaluation).' },
      { t:'Modifier ce bilan', x:'Corrige le bilan en cas d\'erreur de saisie. Les corrections sont enregistrées à la DATE D\'ORIGINE du bilan et ne créent AUCUN nouveau point dans l\'évolution. À utiliser pour rectifier, pas pour un nouveau contrôle.' },
      { t:'Bilan de suivi', x:'À utiliser lors d\'une nouvelle consultation de contrôle. Tous les champs sont pré-remplis depuis le dernier bilan : vous ne re-saisissez que ce qui a changé. Seules les valeurs que vous MODIFIEZ créent un nouveau point daté du jour dans les courbes d\'évolution.' },
      { t:'Bilans précédents', x:'Le bouton « Bilans précédents » ouvre l\'historique daté du patient. Vous pouvez consulter n\'importe quel bilan antérieur en lecture seule, puis « ↩ Revenir au bilan actuel ».' },
      { t:'Voir l\'évolution', x:'La page « Évolution » du bilan compare automatiquement les points successifs (amplitudes, forces, scores) dès qu\'au moins deux bilans existent — d\'où l\'importance de passer par le bilan de suivi plutôt que par une simple modification.' }
    ]}
]},

/* ── 🛠 OUTILS ───────────────────────────────────────────────── */
{ id:'outils', emoji:'🛠', titre:'Outils & CR médecin', articles:[
  { id:'questionnaires', titre:'Questionnaires PRO et scores fonctionnels',
    intro:'Les questionnaires validés (PRO) et les calculateurs de scores, avec sauvegarde automatique dans le dossier du patient.',
    etapes:[
      { t:'Choisissez un questionnaire ou un score', x:'Le patient actif est automatiquement associé au résultat.' },
      { t:'Saisissez les réponses', x:'Le score se calcule en direct.' },
      { t:'Enregistrez', x:'Le résultat est synchronisé et réapparaît en direct dans le bilan clinique correspondant.' }
    ]},
  { id:'cr-medecin', titre:'Rédiger un CR médecin',
    intro:'Un courrier structuré destiné au médecin, avec aperçu en temps réel pendant la saisie.',
    etapes:[
      { t:'Renseignez le destinataire', x:'Dr, spécialité, email.' },
      { t:'Cliquez sur « ⤓ Bilan » pour préremplir', x:'Les informations du dernier bilan du patient (dates, côté atteint, pathologie…) sont importées automatiquement.', img:true },
      { t:'Complétez pathologie, bilan clinique et plan', x:'Amplitudes, force, tests fonctionnels, signes cliniques, phase, évolution, plan de traitement — l\'aperçu à droite se met à jour à chaque champ.' },
      { t:'Exportez', x:'Copier la lettre, exporter en PDF ou envoyer par email directement.' }
    ]},
  { id:'config-cr', titre:'Personnaliser le configurateur CR',
    intro:'Pathologies, amplitudes de référence, signes cliniques et statuts sont modifiables — vos réglages sont synchronisés sur votre compte.',
    etapes:[
      { t:'Ouvrez la configuration du CR médecin', x:'Ajoutez vos propres pathologies ou ajustez les amplitudes normatives par articulation.' },
      { t:'Enregistrez', x:'La configuration est stockée en ligne : vous la retrouvez sur tous vos appareils, et le bilan clinique l\'utilise aussi pour ses menus déroulants.' }
    ]}
]},

/* ── 📋 PROGRAMME ────────────────────────────────────────────── */
{ id:'programme', emoji:'📋', titre:'Programme & agenda', articles:[
  { id:'bibliotheque', titre:'Utiliser la bibliothèque d\'exercices',
    intro:'Tous vos exercices, avec vidéos, filtrables et organisables en favoris.',
    etapes:[
      { t:'Recherchez ou filtrez', x:'Par nom, par objectif (mobilité, renfo…) ou par articulation.' },
      { t:'Cliquez sur ★ pour marquer un favori', x:'Le filtre « Favoris » ne montre alors que votre sélection.' },
      { t:'Cliquez sur + pour ajouter au bloc', x:'L\'exercice rejoint le bloc choisi dans « Ajouter au bloc » (par défaut, le dernier).', img:true },
      { t:'« Éditer la bibliothèque » pour vos propres exercices', x:'Ajoutez un exercice avec son lien vidéo YouTube : la vignette apparaîtra côté athlète.' }
    ]},
  { id:'builder', titre:'Construire une séance',
    intro:'Le builder assemble des blocs d\'exercices avec tous les paramètres d\'entraînement.',
    etapes:[
      { t:'Créez un bloc (+ Bloc) ou un bloc Cardio', x:'Chaque bloc a un objectif (libre, force, hypertrophie…) et éventuellement une méthode structurée.' },
      { t:'Paramétrez chaque exercice', x:'Répétitions ou durée, séries, récupération, tempo, option « /côté », enchaînement avec l\'exercice suivant.' },
      { t:'Ajoutez des cibles', x:'kg, RPE, RIR, %1RM ou vitesse — avec fourchette min–max possible. C\'est ce qui alimente les courbes d\'évolution de charge.' },
      { t:'Consignes et douleur EVA', x:'Une consigne spécifique par exercice, et un badge « EVA » pour noter la douleur observée (0–10) — elle rejoint les courbes de douleur.', img:true },
      { t:'Enregistrez la séance', x:'Elle est sauvegardée pour le patient et apparaît dans son historique de programmes.' }
    ]},
  { id:'agenda', titre:'Planifier dans l\'agenda',
    intro:'Vue mois ou semaine, glisser-déposer, et un menu complet sur chaque jour.',
    etapes:[
      { t:'Cliquez sur un jour', x:'Trois choix : « Nouvelle séance » (ouvre le builder), « Ajouter une séance existante » (un programme déjà créé) ou « Ajouter une note ».', img:true },
      { t:'Déplacez une séance par glisser-déposer', x:'Sur mobile, un appui long ouvre les mêmes actions (déplacer, dupliquer).' },
      { t:'Cliquez sur une chip pour l\'ouvrir dans le builder', x:'Le bouton ⋮ propose les actions rapides ; le ✕ supprime la séance planifiée.' },
      { t:'Mode « Sélectionner » pour les actions groupées', x:'Cochez plusieurs séances pour les supprimer ou les déplacer en une fois.' }
    ]},
  { id:'cycles', titre:'Créer des cycles d\'entraînement',
    intro:'Force, hypertrophie, récupération… Les cycles colorent l\'agenda et donnent la vision macro de la programmation.',
    etapes:[
      { t:'Ouvrez le panneau Cycles', x:'Nom, durée en semaines (ou dates précises), couleur, note.' },
      { t:'Le cycle s\'affiche dans l\'agenda', x:'Fond coloré sur chaque jour couvert + nom du cycle en petit dans la cellule. Les cycles sont propres à chaque patient.', img:true }
    ]},
  { id:'notes-rappels', titre:'Notes, messages patient et rappels 🔔',
    intro:'Deux types de notes, et un système de rappel pour ne rien oublier.',
    etapes:[
      { t:'« Note clinique » : privée', x:'Visible uniquement par vous, dans l\'agenda du patient.' },
      { t:'« Message patient » : partagé', x:'L\'athlète le voit dans son calendrier via son lien.' },
      { t:'Activez « 🔔 Me le rappeler »', x:'Choisissez la date de notification (par défaut 3 jours avant la note). Le rappel apparaîtra dans la cloche en haut de l\'écran, puis disparaîtra une fois consulté.', img:true },
      { t:'« 🔁 Planifier un suivi »', x:'Crée automatiquement une note future (ex. re-test à 35 jours).' }
    ]},
  { id:'protocoles', titre:'Protocoles et rappels automatiques',
    intro:'Assignez un protocole de rééducation (LCA, Latarjet…) : les échéances importantes se créent toutes seules.',
    etapes:[
      { t:'Assignez un protocole au patient', x:'Choisissez la phase de départ.' },
      { t:'Validez les rappels proposés', x:'À partir de la date d\'opération (J0), l\'app propose les jalons du protocole — ex. « CR médecin à réaliser » à J+45, J+150, J+270. Les échéances CR reçoivent automatiquement un rappel 3 jours avant dans la cloche.', img:true },
      { t:'Suivez la progression par phase', x:'Les séances liées à une phase sont colorées dans l\'agenda ; le protocole affiche le taux de réalisation.' }
    ]},
  { id:'journal-evolution', titre:'Journal et Évolution',
    intro:'Deux lectures complémentaires du parcours du patient : le fil des événements, et les courbes.',
    etapes:[
      { t:'Journal : le fil chronologique', x:'Séances, retours athlète (RPE, douleur), notes — filtrables par type. Cliquez sur un retour pour le déplier.' },
      { t:'Évolution : les courbes par exercice', x:'Charge (1RM estimé) et douleur EVA superposées, durées, cardio. Cochez les exercices à afficher, filtrez la période.', img:true },
      { t:'Charge globale (UA)', x:'La charge d\'entraînement totale, par séance ou par semaine — les hausses hebdomadaires de plus de 30 % sont signalées en orange.' },
      { t:'Bilan de charge sous l\'agenda', x:'Monotonie, strain, ACWR (ratio charge aiguë/chronique) et adhérence sur 30 jours, semaine par semaine.' }
    ]},
  { id:'feedback', titre:'Lire le retour d\'un athlète',
    intro:'Quand l\'athlète a rempli son ressenti, tout remonte dans le builder.',
    etapes:[
      { t:'Ouvrez la séance concernée', x:'Le bouton « Feedback » porte un badge bleu si un retour existe.', img:true },
      { t:'Lisez le retour hiérarchisé', x:'La douleur maximale signalée d\'abord, puis RPE / durée / UA, puis les exercices douloureux triés, avec les notes de l\'athlète.' },
      { t:'Ajoutez votre EVA praticien', x:'Votre propre évaluation, indépendante de celle de l\'athlète. Pour les séances CAP/HSR : boutons d\'adaptation (régresser / maintenir).' }
    ]}
]},

/* ── 🧮 CALCULATEURS ─────────────────────────────────────────── */
{ id:'calculateurs', emoji:'🧮', titre:'Calculateurs', articles:[
  { id:'rm', titre:'Calculateur RM (1RM estimé)',
    intro:'Estimez la charge maximale d\'un exercice à partir d\'une série sous-maximale — sans faire de test à 1 répétition.',
    etapes:[
      { t:'Menu ⋯ → « Calculateur RM »', x:'Saisissez le poids soulevé et le nombre de répétitions (l\'exercice est optionnel).', img:true },
      { t:'Lisez le 1RM estimé', x:'Moyenne de six formules validées (Brzycki, Epley, Lander, Lombardi, O\'Conner, Mayhew) pour lisser les écarts de chacune.' },
      { t:'Utilisez le tableau des pourcentages', x:'Pratique pour prescrire une cible en %1RM dans le builder (ex. 4×6 à 80 %).' }
    ]},
  { id:'cardio', titre:'Calculateur Cardio (zones FC et VMA)',
    intro:'Toutes les zones d\'entraînement du patient, calculées à partir de ses données physiologiques.',
    etapes:[
      { t:'Menu ⋯ → « Calculateur Cardio »', x:'Âge, sexe, poids, taille, FC de repos — et FC max mesurée si vous l\'avez (sinon elle est estimée).' },
      { t:'5 zones FC selon Karvonen', x:'FC cible = FC repos + (FC de réserve × %). Plus fiable qu\'un simple pourcentage de FC max, car ancré sur la FC de repos réelle.', img:true },
      { t:'Zones VMA', x:'%VMA, vitesse en km/h et allure en min/km pour construire les séances de course.' }
    ]},
  { id:'cap', titre:'Calculateur CAP (retour à la course)',
    intro:'Un assistant complet de reprise de course à pied : il génère le programme progressif directement dans l\'agenda.',
    etapes:[
      { t:'Menu ⋯ → « Calculateur CAP »', x:'Choisissez la pathologie et le point de départ du patient.', img:true },
      { t:'Le wizard planifie les paliers marche/course', x:'Les séances CAP apparaissent dans l\'agenda (ex. 5×(1\'C/1\'M)) et dans le calendrier de l\'athlète.' },
      { t:'L\'athlète renseigne douleur et effort après chaque sortie', x:'Selon la douleur EVA, le bandeau CAP du builder vous propose de régresser ou maintenir le palier — l\'adaptation se fait en un clic.' }
    ]},
  { id:'hsr', titre:'Calculateur HSR (tendinopathies)',
    intro:'Le protocole Heavy Slow Resistance pour les tendinopathies, piloté par le 1RM du patient.',
    etapes:[
      { t:'Menu ⋯ → « Calculateur HSR »', x:'Renseignez le 1RM de référence de l\'exercice cible.', img:true },
      { t:'Les séances des phases se planifient automatiquement', x:'Charges calculées en %1RM, progression par phases dans l\'agenda.' },
      { t:'Suivi par la douleur', x:'L\'athlète note sa douleur EVA après chaque séance ; le bandeau HSR du builder permet d\'adapter, et de mettre à jour le 1RM de référence au fil des progrès.' }
    ]},
  { id:'acwr-calc', titre:'Calculateur ACWR',
    intro:'Pour vérifier manuellement un ratio charge aiguë / chronique — par exemple avec des données externes à l\'app.',
    etapes:[
      { t:'Menu ⋯ → « Calculateur ACWR »', x:'Saisissez la charge aiguë (7 derniers jours, en UA) et les charges des semaines précédentes.' },
      { t:'Lisez le ratio et sa zone', x:'Le même code couleur que le Bilan de charge (voir la section « Charge d\'entraînement »). Note : pour vos patients suivis dans l\'app, ce ratio se calcule déjà tout seul sous l\'agenda.' }
    ]}
]},

/* ── ⚡ CHARGE D'ENTRAÎNEMENT ────────────────────────────────── */
{ id:'charges', emoji:'⚡', titre:'Charge d\'entraînement', articles:[
  { id:'ua-foster', titre:'Les UA : comment la charge est calculée',
    intro:'Toute la gestion de charge repose sur une unité commune : l\'UA (méthode de Foster).',
    etapes:[
      { t:'UA = RPE × durée', x:'Le ressenti d\'effort de l\'athlète (Borg 1–10) multiplié par la durée réelle en minutes. Une séance de 45 min à RPE 7 = 315 UA.' },
      { t:'Sources, par ordre de priorité', x:'1) Le retour athlète d\'une séance planifiée. 2) L\'activité Strava liée à une séance CAP (FC réelle × durée). 3) Les activités Strava libres, estimées par la fréquence cardiaque. Chaque effort n\'est compté qu\'une seule fois — jamais de doublon entre retour et Strava.' },
      { t:'Où la voir', x:'Badge ⚡ sur les chips de l\'agenda, Bilan de charge sous le calendrier, carte « Charge globale » de l\'Évolution.' }
    ]},
  { id:'bilan-charge', titre:'Lire le Bilan de charge (sous l\'agenda)',
    intro:'Le tableau de bord hebdomadaire : c\'est ici que se pilote la semaine en cours.',
    etapes:[
      { t:'Les barres quotidiennes', x:'La charge de chaque jour de la semaine. Vert < 150 UA, orange < 300, rouge au-delà — un profil en dents de scie est normal et même souhaitable.', img:true },
      { t:'Monotonie : la variabilité de la semaine', x:'Charge moyenne ÷ écart-type. En dessous de 1,5 : bonne variabilité ✓. Entre 1,5 et 2 : vigilance ⚠. Au-dessus de 2 : monotonie élevée 🔴 — des charges trop uniformes augmentent le risque de blessure et de surmenage, même à volume modéré.' },
      { t:'Strain : la contrainte globale', x:'Charge hebdomadaire × monotonie. Deux semaines à volume égal ne se valent pas : celle qui est monotone contraint plus l\'organisme.' },
      { t:'Progression : l\'évolution vs semaine précédente', x:'Jusqu\'à +10 % : progression sûre ✓. De +10 à +15 % : à surveiller ⚠. Au-delà de +15 % : hausse trop brutale 🔴.' },
      { t:'Adhérence 30 jours', x:'La part des séances planifiées réellement réalisées (retour athlète ou activité Strava à l\'appui).' }
    ]},
  { id:'acwr', titre:'L\'ACWR : le ratio charge aiguë / chronique',
    intro:'L\'indicateur clé du risque lié aux variations de charge — affiché en bas du Bilan de charge.',
    etapes:[
      { t:'Le calcul', x:'Charge aiguë = les 7 derniers jours. Charge chronique = la moyenne hebdomadaire des 28 derniers jours. ACWR = aiguë ÷ chronique. Il faut au moins quelques semaines d\'historique pour qu\'il soit interprétable.' },
      { t:'Les zones', x:'Moins de 0,8 : sous-charge (désentraînement possible). De 0,8 à 1,3 : sweet spot ✓ — la zone où viser. De 1,3 à 1,5 : prudence ⚠. Au-delà de 1,5 : zone à risque 🔴 — la charge récente dépasse nettement ce que l\'organisme a l\'habitude d\'encaisser.', img:true },
      { t:'La lecture clinique', x:'Un ACWR élevé n\'interdit pas de s\'entraîner : il invite à lisser la montée en charge. Croisez-le toujours avec la douleur (courbes de l\'Évolution) et le contexte du patient.' }
    ]},
  { id:'regles-lecture', titre:'Règles de lecture au quotidien',
    intro:'Quel écran pour quelle question — la méthode en trois regards.',
    etapes:[
      { t:'« Comment se passe la semaine ? » → Bilan de charge', x:'Sous l\'agenda : barres du jour, monotonie, strain, ACWR. C\'est le pilotage opérationnel.' },
      { t:'« La trajectoire est-elle saine ? » → Évolution, carte Charge globale', x:'La tendance sur plusieurs semaines ou mois, par séance ou par semaine. Les hausses hebdomadaires de plus de 30 % sont marquées en orange.' },
      { t:'« Et la douleur dans tout ça ? » → Évolution, courbes par exercice', x:'La douleur EVA superposée à la charge de chaque exercice : une charge qui monte pendant que la douleur descend, c\'est une adaptation réussie ; l\'inverse est un signal d\'alerte.' },
      { t:'Aucune charge ne s\'affiche ?', x:'Les UA n\'existent que si l\'athlète envoie ses retours (ou si Strava est connecté). Sans données d\'entrée, pas de pilotage — c\'est la première chose à mettre en place.' }
    ]}
]},

/* ── 📱 ESPACE ATHLÈTE ───────────────────────────────────────── */
{ id:'athlete', emoji:'📱', titre:'Espace athlète', articles:[
  { id:'lien-athlete', titre:'Partager le calendrier à l\'athlète (ou à un confrère)',
    intro:'L\'athlète n\'a pas de compte : il accède à son programme par un lien personnel, sur n\'importe quel téléphone.',
    etapes:[
      { t:'Menu ⋯ → « Partager le calendrier »', x:'Deux modes : « Partager au patient » (séances et feedback uniquement) ou « Partager à un kiné » (séances + notes cliniques, pour une prise en charge partagée).', img:true },
      { t:'Copiez le lien et envoyez-le', x:'SMS, WhatsApp ou email. Le lien reste valable en permanence : pas besoin de le renvoyer à chaque séance.' },
      { t:'Conseillez à l\'athlète de l\'ajouter à son écran d\'accueil', x:'Il retrouvera son calendrier comme une application.' }
    ]},
  { id:'vue-athlete', titre:'Ce que voit l\'athlète',
    intro:'Un calendrier épuré de ses séances, et le détail de chaque exercice avec vidéo.',
    etapes:[
      { t:'Son calendrier', x:'Ses séances planifiées, vos messages patient, et les cycles en couleur.' },
      { t:'Le détail d\'une séance', x:'Exercices avec vignette vidéo (clic = lecture), séries, répétitions, tempo, récupération, consignes.', img:true }
    ]},
  { id:'douleur-athlete', titre:'La saisie de douleur par exercice',
    intro:'Sous chaque exercice, un petit curseur discret : précis (0–10) mais sans friction.',
    etapes:[
      { t:'L\'athlète glisse le curseur', x:'La pastille affiche le chiffre avec un code couleur et un libellé (« Légère », « Importante »…).', img:true },
      { t:'Un toucher sur la pastille = « aucune douleur »', x:'Un second toucher efface la saisie.' },
      { t:'Le bouton 💬 ouvre une note par exercice', x:'« pique en fin d\'amplitude », etc. Tout vous remonte dans le feedback.' }
    ]},
  { id:'ressenti-seance', titre:'Le ressenti de fin de séance',
    intro:'C\'est la donnée qui alimente vos calculs de charge.',
    etapes:[
      { t:'Séance classique : durée réelle + effort Borg (1–10)', x:'L\'app calcule la charge : RPE × durée = UA.' },
      { t:'Séance CAP / HSR : douleur EVA + effort', x:'Deux échelles distinctes — la douleur pilote l\'adaptation du protocole, jamais convertie en charge.' },
      { t:'Envoi en un clic', x:'Vous recevez une notification dans la cloche dès que le retour arrive.' }
    ]}
]},

/* ── 🔶 STRAVA ───────────────────────────────────────────────── */
{ id:'strava', emoji:'🔶', titre:'Strava', articles:[
  { id:'connecter-strava', titre:'Connecter le Strava d\'un patient',
    intro:'Une fois connecté, chaque sortie de l\'athlète remonte automatiquement dans son agenda.',
    etapes:[
      { t:'Fiche patient → menu ⋮ → « Connecter Strava »', x:'Une fenêtre affiche un lien de connexion personnel.', img:true },
      { t:'Envoyez ce lien à l\'athlète', x:'Il l\'ouvre, se connecte à SON compte Strava et clique « Autoriser ». Une page de confirmation lui indique que c\'est fait — il n\'a rien d\'autre à faire.' },
      { t:'Les 90 derniers jours se synchronisent automatiquement', x:'Puis chaque nouvelle activité arrive en temps réel. Un badge « Strava » apparaît sur la fiche du patient.' }
    ]},
  { id:'liaison-auto', titre:'Liaison automatique séance ↔ activité',
    intro:'Une activité Strava réalisée le jour d\'une séance planifiée compatible est automatiquement rattachée à celle-ci.',
    etapes:[
      { t:'Course → séance CAP, vélo → séance Vélo', x:'La chip de la séance gagne un badge orange « S 4.7km 30min » : l\'activité est absorbée, l\'agenda reste lisible.', img:true },
      { t:'Cliquez sur le badge S', x:'Le détail complet s\'ouvre : distance, FC, D+, allure, charge.' },
      { t:'Les activités libres restent visibles en orange', x:'Plusieurs le même jour ? Elles se regroupent en une seule chip « 2 activités ».' }
    ]},
  { id:'lier-manuel', titre:'Lier ou délier manuellement',
    intro:'Quand la liaison automatique n\'a pas osé (une muscu Strava un jour de séance renfo, par exemple).',
    etapes:[
      { t:'Cliquez sur l\'activité orange', x:'Le détail propose « 🔗 Lier à une séance du jour » avec la liste des séances planifiées ce jour-là.', img:true },
      { t:'Ou « ✕ Délier » sur une activité déjà liée', x:'Le lien est enregistré en base : même résultat sur tous vos appareils.' }
    ]},
  { id:'panneau-strava', titre:'Le panneau « Réalisée avec Strava »',
    intro:'La séance liée, ouverte dans le builder, affiche tout ce que Strava sait de la sortie.',
    etapes:[
      { t:'Ouvrez la séance depuis l\'agenda', x:'Le panneau orange apparaît en tête : distance, durée, allure moyenne, FC moy/max, D+, charge, cadence.', img:true },
      { t:'Le parcours en tracé abstrait', x:'Point vert = départ.' },
      { t:'Les allures kilomètre par kilomètre', x:'Chargées automatiquement à la première ouverture (barre plus haute = plus rapide).' },
      { t:'Cliquez sur l\'entête pour replier le panneau', x:'Votre choix est mémorisé.' }
    ]},
  { id:'charge-strava', titre:'Strava et le calcul de charge',
    intro:'Chaque effort est compté une seule fois — jamais de doublon.',
    etapes:[
      { t:'Séance avec retour athlète : la charge vient du retour', x:'L\'activité Strava liée est absorbée, jamais comptée en plus.' },
      { t:'Séance CAP : la charge vient de Strava', x:'FC réelle × durée réelle. Le retour CAP (douleur/effort) n\'est jamais converti en charge.' },
      { t:'Activité libre : estimation par la fréquence cardiaque', x:'D\'où l\'importance de la date de naissance du patient (FC max théorique).' }
    ]}
]},

/* ── 🔔 NOTIFICATIONS ────────────────────────────────────────── */
{ id:'notifications', emoji:'🔔', titre:'Notifications', articles:[
  { id:'cloche', titre:'La cloche de notifications',
    intro:'Le point d\'entrée unique pour tout ce qui demande votre attention, tous patients confondus.',
    etapes:[
      { t:'Retours athlètes non lus', x:'Patient, séance, RPE, douleur maximale signalée. Un clic ouvre le patient et la séance concernée, et marque le retour comme lu.', img:true },
      { t:'Rappels de notes dus', x:'Les rappels 🔔 arrivés à échéance (« aujourd\'hui », « en retard de 2 j »). Un clic ouvre la note et fait disparaître le rappel.' },
      { t:'« Tout marquer lu / vu »', x:'Pour faire le ménage en un clic, section par section.' },
      { t:'Actualisation automatique', x:'La cloche se rafraîchit toutes les 2 minutes.' }
    ]},
  { id:'pastilles', titre:'Les pastilles sur l\'agenda',
    intro:'Un repère visuel directement sur les séances.',
    etapes:[
      { t:'Point bleu : retour athlète non lu', x:'Point orange : le retour signale une douleur ≥ 4/10.', img:true },
      { t:'La pastille disparaît à l\'ouverture du feedback', x:'Et la cloche se met à jour en même temps.' }
    ]},
  { id:'navigateur', titre:'Notifications navigateur',
    intro:'Des alertes système même quand l\'onglet est en arrière-plan (app ouverte quelque part).',
    etapes:[
      { t:'Activez le toggle dans Mon compte', x:'Le navigateur demandera votre autorisation une fois.' },
      { t:'Option « seulement si douleur ≥ 4 »', x:'Pour ne recevoir d\'alerte système que sur les retours douloureux.' }
    ]},
  { id:'reglages', titre:'Les réglages',
    intro:'Chaque canal s\'active indépendamment, dans Mon compte → Notifications.',
    etapes:[
      { t:'Pastilles agenda / Cloche / Navigateur / Filtre douleur / Rappels de notes', x:'Cinq toggles. Les réglages sont propres à chaque appareil (logique pour les notifications navigateur).', img:true }
    ]}
]}

],

/* ── ❓ FAQ ──────────────────────────────────────────────────── */
faq: [
  { q:'Mon athlète ne voit pas son programme, que vérifier ?',
    a:'Vérifiez que la séance est bien planifiée dans l\'agenda du bon patient, puis renvoyez-lui son lien personnel (il ne change pas d\'une séance à l\'autre). Sur son téléphone, un simple rechargement de la page suffit souvent — le bouton « ↻ Actualiser » est prévu pour ça.' },
  { q:'Les activités Strava ne remontent pas.',
    a:'Vérifiez le badge « Strava » sur la fiche du patient : s\'il est absent, la connexion n\'a pas abouti — régénérez le lien (menu ⋮ → Connecter Strava) et refaites-le suivre à l\'athlète. S\'il est présent, les nouvelles sorties arrivent en temps réel mais l\'historique ne couvre que les 90 jours précédant la connexion.' },
  { q:'Une activité Strava s\'est liée à la mauvaise séance.',
    a:'Cliquez sur le badge S de la chip (ou sur l\'activité), puis « ✕ Délier de la séance ». Vous pouvez ensuite la lier manuellement à la bonne séance du jour. Le lien corrigé est mémorisé définitivement.' },
  { q:'Le retour de mon athlète n\'apparaît pas.',
    a:'Regardez la cloche en haut de l\'écran et les pastilles bleues/oranges sur l\'agenda : le retour y apparaît dès son envoi (actualisation toutes les 2 minutes). Vérifiez aussi que le bon patient est sélectionné.' },
  { q:'Puis-je modifier un compte-rendu déjà généré ?',
    a:'Les CR du bilan se régénèrent en direct : modifiez les données du bilan et le texte se met à jour. Pour le CR médecin (Outils), tous les champs restent éditables avant l\'export — et vous pouvez retoucher la lettre après l\'avoir copiée.' },
  { q:'Comment supprimer plusieurs séances d\'un coup ?',
    a:'Dans l\'agenda, cliquez sur « Sélectionner », cochez les séances concernées, puis utilisez l\'action groupée. Pratique pour nettoyer un protocole replanifié.' },
  { q:'Quelle différence entre note clinique et message patient ?',
    a:'La note clinique (🔒) n\'est visible que par vous. Le message patient (💬) apparaît dans le calendrier de l\'athlète via son lien. Le type se choisit en haut du formulaire de note et peut être changé après coup.' },
  { q:'C\'est quoi, les UA ?',
    a:'Les Unités Arbitraires mesurent la charge d\'entraînement selon la méthode de Foster : RPE (effort perçu 1–10) × durée en minutes. Une séance de 45 min à RPE 7 = 315 UA. Pour les activités Strava sans retour athlète, la charge est estimée à partir de la fréquence cardiaque.' },
  { q:'C\'est quoi, le J0 ?',
    a:'La date de référence du patient : en priorité la date d\'opération, sinon la date d\'accident, sinon celle du premier bilan. Elle alimente les étiquettes J+ de l\'agenda et le calcul des échéances de protocole (CR médecin à J+45, etc.). Renseignez-la dans la page Infos du bilan.' },
  { q:'Un cycle d\'un patient apparaît chez un autre.',
    a:'Ce bug a été corrigé. Si vous l\'observez encore, faites un rechargement complet de la page (Cmd/Ctrl + Shift + R) : votre navigateur utilise probablement une ancienne version de l\'application.' },
  { q:'L\'application fonctionne-t-elle sur téléphone ?',
    a:'Côté athlète, oui — l\'espace athlète est conçu pour mobile. Côté praticien, l\'interface fonctionne dans un navigateur mobile mais elle est optimisée pour un écran d\'ordinateur ou de tablette.' },
  { q:'Qui peut voir mes données patients ?',
    a:'Uniquement vous. Chaque praticien n\'accède qu\'à ses propres patients — l\'isolation est appliquée au niveau de la base de données (Supabase RLS). L\'athlète, via son lien, ne voit que son propre programme et ses messages.' },
  { q:'À quoi sert le badge « EVA » sous chaque exercice du builder ?',
    a:'À noter une douleur (0–10) sur cet exercice précis. Cette valeur — comme celle saisie par l\'athlète sur son téléphone — alimente les courbes de douleur de l\'onglet Évolution, superposées aux courbes de charge.' },
  { q:'Comment relancer la synchronisation Strava d\'un patient ?',
    a:'Refaites simplement la procédure « Connecter Strava » : la reconnexion relance automatiquement la synchronisation des 90 derniers jours, sans créer de doublons.' }
]

};
