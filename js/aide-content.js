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
      { t:'Ajoutez Spécialité, Cabinet / Structure et Adresse', x:'Coordonnées reprises dans l\'en-tête / le pied des CR et sur vos prescriptions. Le Cabinet est le nom de votre structure (ex. « Athletik Lamarck »).' },
      { t:'Ajoutez Téléphone', x:'Repris lui aussi dans l\'en-tête des documents générés.' },
      { t:'L\'email du compte n\'est pas modifiable ici', x:'Il identifie votre connexion. Il s\'affiche en lecture seule.' },
      { t:'Cliquez sur « Enregistrer »', x:'Un « ✓ Sauvegardé » confirme. Le profil est synchronisé et diffusé aux onglets Bilan et Outils immédiatement — pas besoin de recharger. Tant qu\'un champ n\'est pas renseigné, il reste vide sur vos documents (jamais de valeur par défaut empruntée à un autre compte).' },
      { t:'Logo, signature et tampon', x:'Plus bas, la carte « Logo & signature » propose trois zones d\'upload (PNG, JPEG ou WEBP, 3 Mo max). Une fois ajoutées, ces images apparaissent automatiquement sur vos prescriptions. Elles sont privées : personne d\'autre que vous n\'y a accès, et chaque affichage passe par un lien à durée de vie limitée.', img:true },
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
  { id:'personnaliser-bilan', titre:'Personnaliser vos pages de bilan',
    intro:'Chaque praticien évalue différemment. Vous pouvez masquer ou réordonner des blocs et des tests, ajouter vos propres descriptions, et même créer des blocs et des tests entièrement personnalisés — sans jamais perdre ni corrompre les bilans déjà sauvegardés.',
    etapes:[
      { t:'Cliquez sur « ⚙ Personnaliser » en haut de la page', x:'Disponible sur toutes les pages du bilan (régions orthopédiques, tests fonctionnels et de force, LMA). Le bouton devient « ✓ Terminé » : vous êtes en mode édition.', img:true },
      { t:'Réordonnez ou masquez un bloc', x:'Les flèches ▲▼ déplacent le bloc, la croix le retire (il reste disponible dans la bibliothèque en bas de page, jamais supprimé). Les blocs marqués « 🔒 Élément de base » (marqueur de douleur, conclusion…) restent toujours visibles.' },
      { t:'Réordonnez, masquez ou décrivez un test', x:'Chaque ligne de test a son propre rail (crayon ✏️ / ▲▼ / croix). Le crayon ouvre l\'édition du texte affiché sous le nom du test — utile pour préciser votre propre façon de réaliser un test.' },
      { t:'Ajoutez un test à un bloc existant', x:'Le bouton « + Ajouter un test » en bas de chaque bloc crée un test entièrement personnalisé (nom, description) — vous le notez ensuite comme n\'importe quel test natif.' },
      { t:'Créez un bloc personnalisé', x:'Le bouton « + Créer un bloc personnalisé » en bas de page ajoute un bloc vide, que vous nommez puis remplissez avec vos propres tests. Sur les pages Tests fonctionnels / Force et LMA, seuls les tests se personnalisent (les blocs y sont fixes — voir plus bas).' },
      { t:'Cliquez sur « ✓ Terminé »', x:'Votre disposition est enregistrée sur votre compte : elle s\'applique à tous vos patients, sur tous vos appareils. « Annuler » abandonne les changements de la session en cours. « Réinitialiser cet onglet » restaure la disposition de base de cette page.' },
      { t:'Un bilan déjà sauvegardé reste toujours fidèle à lui-même', x:'Masquer ou réordonner un test après coup n\'efface jamais une valeur déjà saisie sur un ancien bilan : si un test masqué contient une donnée, il redevient visible automatiquement pour ce bilan-là. Vos tests personnalisés sont aussi conservés dans chaque bilan, même si vous les supprimez plus tard de votre modèle.' },
      { t:'Cas particulier : Tests fonctionnels, Force et LMA', x:'Sur ces pages, chaque « test » est un bloc de score autonome (ex. Single Leg Squat) plutôt qu\'une ligne de tableau — vous pouvez donc réordonner/masquer ces blocs et en créer de nouveaux, mais pas éditer leur contenu interne. Sur LMA, la personnalisation porte sur les tests du muscle actuellement sélectionné (les blocs musculaires eux-mêmes sont pilotés par le sélecteur Membre / Muscle).' }
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
  { id:'batteries', titre:'Batteries validées (ex. Ankle-GO)',
    intro:'Des scores composites issus de la littérature, combinant tests fonctionnels mesurés par vous et auto-questionnaires remplis par le patient, avec cotation automatique et rapport PDF.',
    etapes:[
      { t:'Ouvrez « Batteries » (sous-onglet d\'Outils)', x:'Cliquez sur la batterie souhaitée, par ex. « Ankle-GO » (Picot et al., Sports Health 2023) — retour au sport après entorse latérale de cheville, noté sur 25 points.', img:true },
      { t:'Associez le patient', x:'Le bouton « ⤓ Associer les infos patient » reprend nom, date de naissance et côté lésé depuis le bilan ou le patient actif — comme sur le CR médecin.' },
      { t:'Choisissez la latéralité', x:'« Droite »/« Gauche » pour une cheville lésée (les colonnes s\'affichent Lésé/Sain), ou « Bilatéral » pour un dépistage sans blessure (les colonnes deviennent Droit/Gauche). Le score /25 est toujours calculé sur la première colonne.' },
      { t:'Remplissez les auto-questionnaires', x:'Les boutons « Remplir FAAM » et « Remplir ALR-RSI » ouvrent le questionnaire correspondant (déjà disponible dans les PROMs) et récupèrent le score automatiquement, côté lésé et/ou côté sain.' },
      { t:'Saisissez les tests fonctionnels', x:'Chaque test (Single Leg Stance, mSEBT, Side Hop, Figure-of-8) affiche ses consignes et ses critères de cotation. Le mSEBT se saisit en 3 essais par direction (ANT/PM/PL) — la moyenne se calcule automatiquement.' },
      { t:'Renseignez la date de la blessure', x:'Importée automatiquement avec « Associer les infos patient » (date d\'accident ou d\'opération du bilan), ou saisie à la main. Elle détermine quel seuil de couleur s\'applique.' },
      { t:'Lisez le score et sa couleur', x:'La couleur dépend du délai depuis la blessure : à 2 mois ou moins, vert dès 8 pts (prédit un retour au niveau pré-blessure), orange à 7 pts (zone intermédiaire), rouge sous 7 pts (prédit une absence de retour au sport). Au-delà de 2 mois ou si la date est inconnue, orange tant que le score n\'atteint pas 19,6 pts (niveau des sujets sains). À 19,6 pts ou plus, le score est toujours vert (« Ankle-GO validé »), quelle que soit la date.' },
      { t:'Consultez l\'asymétrie', x:'Si le côté sain est renseigné, l\'écart entre les deux côtés est calculé par test — complémentaire, il n\'entre pas dans le score /25. Il s\'affiche en asymétrie : 20 % signifie que le côté atteint est 20 % en dessous du sain. Seuil usuel : ≤10 %. Une valeur négative indique un côté atteint supérieur au sain.' },
      { t:'Consultez le profil détaillé', x:'Les réponses aux questionnaires sont listées triées de la plus défavorable à la plus favorable — utile pour repérer rapidement l\'appréhension ou les activités les plus limitantes du patient.' },
      { t:'Basculez barres / radar', x:'Vue barres (par défaut) pour lire les points par composant, ou radar pour une vue d\'ensemble. Le PDF exporté reprend la vue sélectionnée.' },
      { t:'Générez le rapport PDF', x:'Score, asymétrie et profil détaillé sont inclus dans un rapport prêt à imprimer ou archiver.' }
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
    intro:'Tous vos exercices, avec vidéos, filtrables et organisables en favoris. La bibliothèque n\'apparaît qu\'à l\'intérieur du builder — pas depuis le calendrier.',
    etapes:[
      { t:'Ouvrez d\'abord le builder', x:'« + Séance » ou une séance existante depuis l\'agenda. La bibliothèque s\'affiche alors dans le panneau latéral.' },
      { t:'Recherchez ou filtrez', x:'Par nom, par objectif (mobilité, renfo…) ou par articulation.' },
      { t:'Cliquez sur ★ pour marquer un favori', x:'Le filtre « Favoris » ne montre alors que votre sélection.' },
      { t:'Cliquez sur + pour ajouter au bloc', x:'L\'exercice rejoint le bloc choisi dans « Ajouter au bloc » (par défaut, le dernier).', img:true },
      { t:'« Ajouter mon exercice » pour un exercice personnel', x:'Nom, objectif (warm-up/mobilité, renforcement, auto-massage), zone/articulation et lien vidéo YouTube (optionnel). Il rejoint immédiatement la bibliothèque, mais reste visible par vous seul, sur toutes vos séances — jamais par les autres praticiens.', img:true }
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
  { id:'etapes', titre:'Regrouper des blocs en étapes',
    intro:'Pour que l\'athlète distingue clairement l\'échauffement du corps de séance (ou toute autre organisation), regroupez plusieurs blocs sous une étape nommée et colorée.',
    etapes:[
      { t:'Cliquez sur « + Ajouter une étape »', x:'Disponible même sur une séance vide. L\'étape se crée sans bloc à l\'intérieur — vous la remplissez ensuite, à votre rythme.', img:true },
      { t:'Nommez l\'étape et choisissez sa couleur', x:'Renommage libre à tout moment. Une palette de 8 couleurs permet de distinguer visuellement chaque groupe.' },
      { t:'Rattachez des blocs existants, ou créez-en dans l\'étape', x:'Chaque bloc a un menu « Étape » pour rejoindre ou quitter un groupe. Le bouton dédié en bas de l\'étape crée directement un nouveau bloc à l\'intérieur.' },
      { t:'Déplacez une étape entière', x:'Les flèches ↑↓ de son en-tête déplacent tous ses blocs d\'un coup, sans avoir à les manipuler un par un.' },
      { t:'Enregistrez une étape comme template', x:'Le bouton dédié sauvegarde uniquement les blocs de cette étape (pas toute la séance) — pratique pour réutiliser un échauffement type dans d\'autres séances. L\'injection ultérieure crée une copie indépendante, sans lien avec l\'original.' },
      { t:'Ce que voit l\'athlète', x:'Les mêmes bandeaux colorés autour des blocs concernés, avec le nom de l\'étape en en-tête — un repère visuel immédiat entre les différentes parties de la séance.', img:true }
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
    intro:'Force, hypertrophie, récupération… Deux façons de programmer un cycle : à durée fixe (nombre de semaines), ou piloté par des critères cliniques organisés en phases — sans durée connue à l\'avance.',
    etapes:[
      { t:'Ouvrez le panneau Cycles', x:'Nom, couleur, note, et le choix entre « Durée fixe » et « Critères » en haut du formulaire.', img:true },
      { t:'Durée fixe : le mode classique', x:'Durée en semaines (ou dates précises) — le cycle colore l\'agenda sur toute sa période.' },
      { t:'Critères : le cycle avance sur des jalons cliniques', x:'Pas de durée à saisir, la date de début est même optionnelle. Vous créez une ou plusieurs phases (ex. « Post-opératoire immédiat », « Renforcement »), chacune avec sa propre liste de critères (ex. « Genou sec », « Extension passive = 0° »).', img:true },
      { t:'Cochez les critères directement dans la liste', x:'Pas besoin de rouvrir le formulaire — un clic sur un critère le valide. Un stepper (① ② ③) affiche la progression entre les phases.' },
      { t:'La phase, puis le cycle suivant démarrent tout seuls', x:'Dès que tous les critères d\'une phase sont validés, la phase suivante s\'active automatiquement. Une fois la dernière phase validée, le cycle est terminé et le cycle suivant de la séquence devient actif — sans bouton à cliquer.' },
      { t:'Ce que voit l\'athlète', x:'Le cycle actif dans son bandeau « Cycle en cours » : pour un cycle à durée fixe, la semaine en cours ; pour un cycle à critères, la phase en cours avec la checklist des critères validés/manquants, mise à jour en temps réel dès que vous cochez quelque chose. Votre note de cycle lui est visible aussi.', img:true }
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
      { t:'Suivez la progression par phase', x:'Les séances liées à une phase sont colorées dans l\'agenda ; le protocole affiche le taux de réalisation.' },
      { t:'Ce que voit l\'athlète', x:'Une section « Mon protocole » sur son calendrier : le nom du protocole, la phase en cours et la liste de ses critères de sortie, validés ou manquants. Tant que vous n\'avez pas activé la phase suivante (même si tous les critères sont cochés), l\'athlète voit un badge « en attente de validation » — le passage à la phase suivante reste toujours votre décision.', img:true }
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
      { t:'Ajoutez votre EVA praticien', x:'Votre propre évaluation, indépendante de celle de l\'athlète. Pour les séances CAP/HSR : boutons d\'adaptation (régresser / maintenir).' },
      { t:'Alerte visuelle dans l\'agenda', x:'Si votre EVA praticien dépasse 3/10, la chip de cette séance passe en rouge dans l\'agenda (badge ⚠ X/10) — repérable en un coup d\'œil, y compris sur les séances passées.' }
    ]}
]},

/* ── 👥 PATIENTS ──────────────────────────────────────────────── */
{ id:'patients', emoji:'👥', titre:'Patients', articles:[
  { id:'vue-ensemble', titre:'La vue d\'ensemble du cabinet',
    intro:'Une lecture globale de votre patientèle, sans sélectionner personne. Trois sous-onglets structurent l\'espace : Vue d\'ensemble, Liste et Fiche.',
    etapes:[
      { t:'Ouvrez l\'onglet « Patients »', x:'Il s\'ouvre sur la vue d\'ensemble. Aucun patient n\'a besoin d\'être sélectionné : les chiffres portent sur l\'ensemble de votre fichier.', img:true },
      { t:'Quatre indicateurs en haut', x:'Patients au total, Actifs (séance de moins de 30 jours), Dormants (plus de 90 jours sans rien) et Nouveaux du mois. Actifs et Dormants ne s\'additionnent pas au total : les patients situés entre 30 et 90 jours ne sont dans aucune des deux cases.' },
      { t:'« Dormants » est l\'indicateur le plus actionnable', x:'Il liste les patients que vous n\'avez pas vus depuis plus de trois mois. Contrairement aux graphiques, qui décrivent, celui-ci suggère une action.' },
      { t:'Répartition par sexe, âge et sport', x:'Le sexe est déduit de la civilité saisie à la création du patient. L\'âge est calculé depuis la date de naissance. Les sports sont regroupés automatiquement (voir l\'article suivant).' },
      { t:'Régions atteintes et diagnostics', x:'Ces deux blocs portent le badge « Bilan » : ils sont calculés depuis vos bilans et n\'apparaissent donc pas si votre offre ne comprend pas le bilan clinique.' }
    ]},
  { id:'comprendre-chiffres', titre:'Bien lire les chiffres',
    intro:'Quelques règles de calcul à connaître pour ne pas mal interpréter les graphiques. Elles sont volontairement affichées sous chaque bloc.',
    etapes:[
      { t:'L\'unité de comptage est le patient, jamais le bilan', x:'Un patient qui a cinq bilans compte pour un. Sinon les patients les plus suivis écraseraient les statistiques.' },
      { t:'Un patient peut compter dans plusieurs lignes', x:'C\'est le cas pour les régions atteintes (genou et épaule) comme pour les diagnostics. C\'est pourquoi ces blocs sont en barres et non en camembert : les parts ne se partagent pas un tout, et leur somme dépasse 100 %.' },
      { t:'« Non renseigné » et « Non reconnu » sont affichés exprès', x:'Ces lignes grises vous disent quelle part de vos données échappe au classement. Sans elles, vous liriez un palmarès en croyant qu\'il couvre tout votre fichier.' },
      { t:'Surveillez le taux de non-reconnus des diagnostics', x:'Il est écrit sous le bloc. En dessous de 30 %, le classement est fiable. Au-delà, il devient trompeur : c\'est le signal qu\'il faut nommer la pathologie dans le champ Diagnostic, et non la décrire.' },
      { t:'Les barres se lisent par leur longueur relative', x:'La plus longue correspond à la valeur la plus élevée de la série, pas à 100 % de vos patients. La valeur exacte est toujours écrite à droite.' }
    ]},
  { id:'filtres-periode', titre:'Filtrer sur une période',
    intro:'Les cinq filtres en haut de page cadrent toute la vue, pas seulement le compteur principal.',
    etapes:[
      { t:'3 mois, 6 mois, 1 an, Tout ou Personnalisé', x:'« Personnalisé » fait apparaître deux champs de dates, préremplis sur les trois derniers mois.', img:true },
      { t:'Un patient est compté s\'il a eu de l\'activité sur la période', x:'Une séance planifiée, un bilan, ou sa création dans votre fichier. C\'est la lecture de « combien de patients ai-je eu sur ces trois mois », qui englobe donc aussi bien les nouveaux que les suivis.' },
      { t:'La rangée d\'indicateurs change quand un filtre est actif', x:'Actifs et Dormants disparaissent, car ce sont des notions relatives à aujourd\'hui : les afficher à côté d\'une période passée serait trompeur. Ils sont remplacés par Patients sur la période, Nouveaux sur la période et Bilans réalisés, avec le total général conservé comme repère.' },
      { t:'Changer de filtre ne recharge rien', x:'Les données sont chargées une seule fois à l\'ouverture de l\'onglet ; tout est recalculé localement. Le changement est instantané.' },
      { t:'Si vous inversez les dates', x:'Un avertissement orange s\'affiche et la plage est ignorée — la vue repasse sur l\'ensemble des données plutôt que d\'afficher un résultat vide sans explication.' }
    ]},
  { id:'liste', titre:'La liste des patients',
    intro:'Un tableau complet, plus lisible que le menu déroulant du bandeau supérieur, pensé pour l\'analyse et le tri.',
    etapes:[
      { t:'Cliquez sur « Liste » dans la sous-navigation', x:'Huit colonnes : nom, prénom, âge, sexe, sport, dernière activité, nombre de bilans et statut.', img:true },
      { t:'Cliquez sur un en-tête pour trier', x:'Un second clic inverse l\'ordre. Les valeurs absentes restent toujours en dernier, dans les deux sens : une date manquante n\'est ni petite ni grande.' },
      { t:'La recherche porte sur le nom, le prénom et le sport', x:'La saisie est insensible aux accents et à la casse : « course » retrouve « Course à pied ».' },
      { t:'La pastille de statut', x:'Actif (vert) pour une activité de moins de 30 jours, Récent (orange) entre 30 et 90 jours, Dormant (gris) au-delà ou jamais. La « dernière activité » retient la plus récente entre séance et bilan : un patient vu en bilan sans séance planifiée n\'est pas considéré comme inactif.' },
      { t:'Cliquez sur une ligne pour sélectionner le patient', x:'Le bandeau supérieur se met à jour et tous les onglets basculent sur son dossier. La ligne du patient actif est surlignée en bleu. Si le bilan contient des données non sauvegardées, la demande de confirmation habituelle s\'affiche.' },
      { t:'Le filtre de période s\'applique aussi à la liste', x:'En revanche le statut et les dates restent calculés sur tout l\'historique : un patient vu en janvier ne paraîtra pas « jamais actif » sous un filtre 3 mois.' }
    ]},
  { id:'fiche', titre:'La fiche athlète',
    intro:'Les informations durables du patient, regroupées en un endroit : anthropométrie, profil, contexte, cadre d\'entraînement et antécédents. Elle est accessible quelle que soit votre offre, y compris sans le bilan clinique.',
    etapes:[
      { t:'Sélectionnez un patient, puis ouvrez « Fiche »', x:'Sans patient sélectionné, la fiche propose un lien vers la liste. Le filtre de période ne s\'applique pas ici : la fiche porte sur une seule personne.', img:true },
      { t:'Anthropométrie — poids et taille', x:'Ces deux champs existent aussi dans le bilan, où ils sont datés. La fiche ne les écrase jamais.' },
      { t:'Les champs à bordure pointillée affichent une valeur du bilan', x:'Quand la fiche est vide et qu\'un bilan porte la valeur, celle du bilan le plus récent s\'affiche en gris italique, avec sa date. C\'est un indice de lecture, jamais enregistré. Cela concerne le poids, la taille, l\'activité professionnelle et le médecin prescripteur.' },
      { t:'Saisir dans le champ remplace l\'indice', x:'Votre saisie devient alors la valeur de référence. Pour revenir à l\'indice du bilan, videz le champ et enregistrez : la fiche redonne la main au bilan.' },
      { t:'Profil — niveau et latéralité', x:'Trois listes fermées : niveau de pratique (de Loisir à Professionnel), main dominante et pied dominant. Des listes et non du texte libre, pour que ces données restent exploitables en statistiques.' },
      { t:'Cadre d\'entraînement', x:'Séances par semaine, matériel et lieu, jours d\'entraînement possibles, précisions sur les disponibilités, contre-indications. C\'est la partie qui sert à dimensionner vos programmes.' },
      { t:'Les jours d\'entraînement sont des boutons à bascule', x:'Cliquez sur un jour pour l\'activer ou le désactiver ; un compteur récapitule la sélection. Le champ de précisions juste en dessous reste utile pour les horaires ou les exceptions.' },
      { t:'Antécédents — une entrée par épisode', x:'Saisissez le libellé, ajoutez une date si vous la connaissez, puis « Ajouter ». Chaque antécédent devient une étiquette supprimable. Une liste datée plutôt qu\'un bloc de texte : la chronologie se perdrait à la première réécriture.' },
      { t:'Cliquez sur « Enregistrer la fiche »', x:'Le bouton reste visible en bas de page pendant que vous faites défiler. Un message confirme l\'enregistrement.' }
    ]},
  { id:'sport-motifs', titre:'Comment les sports et les diagnostics sont reconnus',
    intro:'Vous saisissez librement le sport et le diagnostic ; le regroupement se fait automatiquement à l\'affichage. Rien n\'est modifié dans vos données.',
    etapes:[
      { t:'Les sports sont regroupés par équivalences', x:'« foot », « Football » et « futsal » se retrouvent dans la même barre. Ce qui n\'est pas reconnu apparaît en « Autres », ce qui est vide en « Non renseigné ».' },
      { t:'Le sport peut venir de deux endroits', x:'Celui de la fiche patient est prioritaire ; s\'il est vide, celui du bilan le plus récent est utilisé. Vous n\'avez donc rien à ressaisir si vous ne l\'aviez renseigné que dans un bilan.' },
      { t:'Les diagnostics sont analysés par mots-clés', x:'Le champ est une phrase, pas une étiquette : « Contrôle post-op LCA à 3 mois » alimente à la fois Post-opératoire, LCA et Contrôle. Une quarantaine de pathologies sont reconnues, y compris les abréviations courantes (SFP, SBIT, LCA, RTS) et les fautes de frappe fréquentes.' },
      { t:'Écrire naturellement suffit', x:'Les accents, les tirets et les apostrophes n\'ont pas d\'importance : « fémoro-patellaire », « femoro patellaire » et « SFP » sont traités de la même façon.' },
      { t:'Un diagnostic sans mot-clé connu part en « Non reconnu »', x:'« Gêne au genou depuis la reprise » n\'est rattachable à aucune pathologie : c\'est une description, pas un diagnostic. Il est compté à part plutôt que classé au hasard. Pour améliorer la reconnaissance, nommez la pathologie — la description détaillée a sa place dans le motif de consultation, juste en dessous.' },
      { t:'Les négations ne sont pas gérées', x:'« Pas de rupture du LCA » sera compté dans LCA. À garder en tête si vous formulez un diagnostic par élimination.' }
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
  { id:'acwr-calc', titre:'Calculateur ACWR',
    intro:'Pour vérifier manuellement un ratio charge aiguë / chronique — par exemple avec des données externes à l\'app.',
    etapes:[
      { t:'Menu ⋯ → « Calculateur ACWR »', x:'Saisissez la charge aiguë (7 derniers jours, en UA) et les charges des semaines précédentes.' },
      { t:'Lisez le ratio et sa zone', x:'Le même code couleur que le Bilan de charge (voir la section « Charge d\'entraînement »). Note : pour vos patients suivis dans l\'app, ce ratio se calcule déjà tout seul sous l\'agenda.' }
    ]}
]},

/* ── 🏗 GÉNÉRATEURS ──────────────────────────────────────────── */
{ id:'generateurs', emoji:'🏗', titre:'Générateurs', articles:[
  { id:'cap', titre:'Générateur CAP : remplir la fiche',
    intro:'Le générateur part de la charge réelle du coureur, pas de zéro, et déduit ses contraintes de la pathologie. La fiche se remplit en quatre blocs — c\'est là que se joue la pertinence du programme.',
    etapes:[
      { t:'Menu ⋯ → Générateur → « Générateur CAP »', x:'La fiche s\'ouvre sur le bloc 1. Si un programme existe déjà pour ce patient, vous arrivez sur l\'écran de résultat : « ← Paramètres » ramène à la fiche.', img:true },
      { t:'Bloc 1 — l\'état actuel du coureur', x:'Choisissez d\'abord l\'unité (km ou minutes), puis renseignez les quatre dernières semaines de volume. Leur moyenne est la charge chronique : elle sert à la fois de point de départ et de référence pour l\'ACWR. Le bouton « Depuis Strava » remplit tout le bloc à partir des sorties réelles — vous n\'avez plus qu\'à valider.' },
      { t:'Deux tolérances à ne pas confondre', x:'« Plus longue sortie tolérée » est une durée totale, marche comprise : elle décide de la répartition du volume entre les sorties. « Course continue sans douleur » est le nombre de minutes courues d\'affilée : en dessous de 5 min, le programme bascule en course/marche. Un patient peut tenir 40 min de sortie et seulement 2 min de course d\'un trait.' },
      { t:'Bloc 2 — la pathologie et son axe', x:'La liste est groupée par axe. Choisir une pathologie pré-remplit l\'axe dominant et le tissu concerné, tous deux modifiables : ce sont des arbitrages cliniques, pas des données. Une seconde pathologie peut être ajoutée. L\'encadré gris récapitule ce que le moteur va appliquer — le paramètre en cause, ceux qui sont maintenus, les interdits, la cadence cible et le palier.' },
      { t:'Le paramètre en cause est réduit, puis reconstruit', x:'C\'est le cœur du modèle. Sur une pathologie de charge — périostite, fracture de stress — c\'est l\'allure qui a blessé : le volume reste à la tolérance actuelle du coureur et ne bouge plus, et ce sont les minutes de qualité qu\'on reconstruit. Sur une pathologie de répétition — bandelette, patte d\'oie — c\'est l\'inverse. Développer le paramètre innocent chargerait un tissu qui n\'a rien demandé ; geler le coupable sans jamais le remonter ne ramènerait personne à la course.' },
      { t:'L\'objectif de base est le critère de dégel', x:'C\'est le jalon à franchir sans douleur pour rouvrir le paramètre en cause. Il ne s\'agit pas d\'un délai : tant qu\'il n\'est pas atteint, il ne bouge pas. Laissé vide, deux à trois semaines de décharge tiennent lieu de jalon selon le tissu.' },
      { t:'Bloc 3 — la cible et le délai', x:'Le volume hebdomadaire visé est la cible principale. La sortie longue est optionnelle et ne concerne que l\'athlète confirmé qui en a besoin — laissée vide, le volume se répartit sur la fréquence.' },
      { t:'Le délai est proposé, pas deviné', x:'Tant que vous n\'y touchez pas, le nombre de semaines est celui qui maintient l\'ACWR sous 1,15 — semaines de course/marche et paliers de consolidation compris. C\'est le délai « juste » au sens de la charge, pas un nombre rond.' },
      { t:'Le raccourcir est un arbitrage, pas une erreur', x:'Le stepper reste libre : réduire le délai accélère la montée, et l\'encadré vous dit aussitôt si elle devient soutenue ou agressive, sans jamais l\'interdire. Un lien « y revenir » ramène au délai conseillé. Le plan produit exactement le nombre de semaines demandé — c\'est le rythme qui s\'y plie.' },
      { t:'Bloc 4 — le contexte d\'exécution', x:'Terrain disponible, cross-training autorisé et jours de la semaine. Ces informations ne sont pas déductibles : le moteur ne peut pas deviner si votre patient a des côtes à proximité ou un vélo.' }
    ]},
  { id:'cap-lire', titre:'Lire un programme CAP généré',
    intro:'Le programme n\'est plus une simple montée en durée : chaque séance a un rôle, et la semaine est construite autour de l\'axe de la pathologie.',
    etapes:[
      { t:'L\'en-tête donne la logique du plan', x:'Nombre de semaines, axe retenu et paramètre reconstruit, volume et minutes de qualité visées. Quand le volume est figé, c\'est sa valeur réelle qui s\'affiche et non la cible saisie — le plan ne promet que ce qu\'il délivre.' },
      { t:'Le badge Z3+ de chaque semaine', x:'À côté de la charge hebdomadaire, les minutes passées en zone 3 ou au-dessus. Sur un axe Charge c\'est LA grandeur qui progresse : le volume, lui, ne bouge pas d\'une semaine à l\'autre, et sans ce badge l\'écran donnerait l\'impression d\'un plan immobile.' },
      { t:'Les quatre rôles de séance', x:'La sortie longue porte le volume. Les séances faciles sont le gros du travail. La séance de qualité travaille l\'allure. La séance technique porte la cadence. Toutes les semaines n\'ont pas les quatre : la polarisation ne s\'ouvre que si le patient a le volume pour la porter — la plupart des retours de blessure n\'ont que des séances faciles, et c\'est normal.' },
      { t:'Le graphe de charge est pondéré par zone', x:'Une séance de seuil pèse plus qu\'un footing de même durée. La courbe verte est l\'ACWR calculé sur cette charge pondérée.' },
      { t:'Les semaines de palier', x:'Selon le tissu concerné, le plan intègre des semaines de consolidation : une sur trois avec baisse réelle sur l\'os, une sur quatre à charge constante sur les tendons. En dessous d\'un volume faible, aucun palier programmé — c\'est le retour du patient qui pilote.' },
      { t:'Un signalement d\'espacement peut apparaître', x:'Si les jours disponibles ne permettent pas d\'intercaler une séance facile entre deux séances dures, le plan est généré quand même et l\'encadré orange vous le dit. Ajouter un jour disponible résout le problème.' },
      { t:'Puis « Ajouter à l\'agenda »', x:'Chaque séance devient un programme daté, visible par l\'athlète. Une séance à plusieurs blocs (échauffement, série, retour au calme) lui arrive détaillée, avec l\'allure de chaque partie.' }
    ]},
  { id:'cap-adapter', titre:'Adapter un programme CAP en cours',
    intro:'L\'erreur initiale est inévitable : c\'est la boucle de retour qui fait la sécurité, pas la précision de la saisie.',
    etapes:[
      { t:'L\'athlète note sa douleur après chaque sortie', x:'Le seuil d\'arrêt dépend de la pathologie et figure dans les consignes envoyées à l\'athlète.' },
      { t:'Douleur au niveau du seuil → la séance suivante répète', x:'Le palier est simplement redonné à l\'identique, sans progresser.' },
      { t:'Douleur au-dessus du seuil sur une sortie longue ou une qualité', x:'Seule cette filière régresse : le moteur cherche la dernière séance validée du même rôle et vise le milieu. Les autres séances du plan ne bougent pas.' },
      { t:'Douleur au-dessus du seuil sur une séance facile', x:'C\'est le cas le plus sérieux, et c\'est contre-intuitif : aucun levier n\'a été poussé sur cette séance, donc le problème vient de la charge accumulée. Le moteur décharge alors l\'ensemble du plan de 30 %.' },
      { t:'Vous pouvez aussi décider à la main', x:'Le bandeau CAP du builder propose « Régresser » et « Maintenir » à tout moment, sans attendre un retour de l\'athlète.' }
    ]},
  { id:'hsr', titre:'Générateur HSR (tendinopathies)',
    intro:'Le protocole Heavy Slow Resistance pour les tendinopathies, piloté par le 1RM du patient.',
    etapes:[
      { t:'Menu ⋯ → Générateur → « Générateur HSR »', x:'Renseignez le 1RM de référence de l\'exercice cible.', img:true },
      { t:'Les séances des phases se planifient automatiquement', x:'Charges calculées en %1RM, progression par phases dans l\'agenda.' },
      { t:'Suivi par la douleur', x:'L\'athlète note sa douleur EVA après chaque séance ; le bandeau HSR du builder permet d\'adapter, et de mettre à jour le 1RM de référence au fil des progrès.' }
    ]}
]},

/* ── 🏃 COMPRENDRE LA COURSE À PIED ──────────────────────────── */
{ id:'cap-savoir', emoji:'🏃', titre:'Comprendre la course à pied', articles:[
  { id:'pyramide', titre:'La pyramide de La Clinique du Coureur',
    intro:'Il n\'y a pas une charge en course à pied, mais trois contraintes tissulaires distinctes. Savoir laquelle a blessé votre patient détermine tout le reste du programme.',
    etapes:[
      { t:'Trois sommets, trois façons de se blesser',
        x:'CHARGE, c\'est l\'intensité de l\'impact à chaque foulée. RÉPÉTITION, c\'est le nombre de cycles — le volume. AMPLITUDE, c\'est la longueur de la foulée. Chaque pathologie du coureur se positionne selon la contrainte qui la provoque.',
        svg:'<svg viewBox="0 0 680 540" role="img" aria-label="Pyramide de La Clinique du Coureur : les 15 pathologies du coureur placées selon la contrainte qui les provoque"><defs><linearGradient id="pyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E08A3C" stop-opacity=".62"/><stop offset="100%" stop-color="#E08A3C" stop-opacity=".08"/></linearGradient><linearGradient id="pyA" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5AA0E6" stop-opacity=".08"/><stop offset="100%" stop-color="#5AA0E6" stop-opacity=".62"/></linearGradient><linearGradient id="pyR" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#43B07A" stop-opacity=".08"/><stop offset="100%" stop-color="#43B07A" stop-opacity=".62"/></linearGradient></defs><rect x="0" y="0" width="680" height="540" rx="10" fill="#0B1B2D"/><polygon points="340.0,132.0 435.0,272.0 340.0,318.7 245.0,272.0" fill="url(#pyC)"/><polygon points="150.0,412.0 245.0,272.0 340.0,318.7 340.0,412.0" fill="url(#pyA)"/><polygon points="530.0,412.0 340.0,412.0 340.0,318.7 435.0,272.0" fill="url(#pyR)"/><polygon points="340.0,132.0 530.0,412.0 150.0,412.0" fill="none" stroke="rgba(127,168,217,.30)" stroke-width="1"/><circle cx="359.5" cy="160.8" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><text x="370.5" y="164.8" font-size="12.5" font-weight="650" fill="#E08A3C">Achilléenne corporéale</text><circle cx="310.8" cy="184.3" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><text x="299.8" y="188.3" text-anchor="end" font-size="12.5" font-weight="650" fill="#E08A3C">Périostite tibiale</text><circle cx="381.4" cy="205.3" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><text x="392.4" y="209.3" font-size="12.5" font-weight="650" fill="#E08A3C">Fracture de stress</text><circle cx="271.8" cy="213.1" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><text x="260.8" y="217.1" text-anchor="end" font-size="12.5" font-weight="650" fill="#E08A3C">Métatarsalgie</text><circle cx="396.0" cy="239.3" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><text x="407.0" y="243.3" font-size="12.5" font-weight="650" fill="#E08A3C">Coussinet graisseux</text><circle cx="257.2" cy="244.5" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><text x="246.2" y="248.5" text-anchor="end" font-size="12.5" font-weight="650" fill="#E08A3C">Fasciapathie plantaire</text><circle cx="330.3" cy="273.3" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><text x="341.3" y="277.3" font-size="12.5" font-weight="650" fill="#E08A3C">Tendinopathie patellaire</text><circle cx="262.1" cy="302.1" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><path d="M 262.1 296.6 A 5.5 5.5 0 0 1 262.1 307.6 Z" fill="#5AA0E6"/><text x="251.10000000000002" y="306.1" text-anchor="end" font-size="12.5" font-weight="650" fill="#E08A3C">Achilléenne insertionnelle</text><circle cx="408.2" cy="296.9" r="5.5" fill="#E08A3C" stroke="#0B1B2D" stroke-width="2"/><path d="M 408.2 291.4 A 5.5 5.5 0 0 1 408.2 302.4 Z" fill="#43B07A"/><text x="419.2" y="300.9" font-size="12.5" font-weight="650" fill="#E08A3C">Fémoro-patellaire</text><circle cx="232.8" cy="333.5" r="5.5" fill="#5AA0E6" stroke="#0B1B2D" stroke-width="2"/><text x="243.8" y="337.5" font-size="12.5" font-weight="650" fill="#5AA0E6">Claquage musculaire</text><circle cx="262.1" cy="362.3" r="5.5" fill="#5AA0E6" stroke="#0B1B2D" stroke-width="2"/><text x="273.1" y="366.3" font-size="12.5" font-weight="650" fill="#5AA0E6">Ischio-jambiers proximaux</text><circle cx="213.3" cy="391.1" r="5.5" fill="#5AA0E6" stroke="#0B1B2D" stroke-width="2"/><text x="224.3" y="395.1" font-size="12.5" font-weight="650" fill="#5AA0E6">Lombalgie du coureur</text><circle cx="184.1" cy="419.9" r="5.5" fill="#5AA0E6" stroke="#0B1B2D" stroke-width="2"/><text x="195.1" y="423.9" font-size="12.5" font-weight="650" fill="#5AA0E6">Fléchisseurs de hanche</text><circle cx="398.5" cy="338.7" r="5.5" fill="#43B07A" stroke="#0B1B2D" stroke-width="2"/><text x="409.5" y="342.7" font-size="12.5" font-weight="650" fill="#43B07A">Patte d’oie</text><circle cx="447.2" cy="393.7" r="5.5" fill="#43B07A" stroke="#0B1B2D" stroke-width="2"/><text x="458.2" y="397.7" font-size="12.5" font-weight="650" fill="#43B07A">Bandelette ilio-tibiale</text><text x="340" y="52" text-anchor="middle" font-size="19" font-weight="800" letter-spacing="2.4" fill="#E08A3C">CHARGE</text><rect x="318" y="62" width="44" height="2.5" rx="1.25" fill="#E08A3C"/><text x="340" y="84" text-anchor="middle" font-size="12.5" fill="#93A8BE">l’impact à chaque foulée</text><text x="340" y="104" text-anchor="middle" font-size="13" font-weight="700" fill="#E08A3C">maintient le volume · reconstruit l’allure</text><text x="24" y="472" font-size="19" font-weight="800" letter-spacing="2.4" fill="#5AA0E6">AMPLITUDE</text><rect x="24" y="482" width="44" height="2.5" rx="1.25" fill="#5AA0E6"/><text x="24" y="504" font-size="12.5" fill="#93A8BE">la longueur de foulée</text><text x="24" y="524" font-size="13" font-weight="700" fill="#5AA0E6">corrige la cadence</text><text x="656" y="472" text-anchor="end" font-size="19" font-weight="800" letter-spacing="2.4" fill="#43B07A">RÉPÉTITION</text><rect x="612" y="482" width="44" height="2.5" rx="1.25" fill="#43B07A"/><text x="656" y="504" text-anchor="end" font-size="12.5" fill="#93A8BE">le nombre de cycles</text><text x="656" y="524" text-anchor="end" font-size="13" font-weight="700" fill="#43B07A">maintient l’allure · reconstruit le volume</text></svg>' },
      { t:'CHARGE et RÉPÉTITION sont exactement symétriques', x:'Sur une pathologie de charge — périostite, fracture de stress, tendinopathie achilléenne corporéale — on coupe l\'intensité et on monte d\'abord le volume. Sur une pathologie de répétition — bandelette ilio-tibiale, syndrome fémoro-patellaire, patte d\'oie — c\'est l\'inverse : on coupe le volume et on monte d\'abord l\'intensité. Ce sont les deux mêmes leviers, on inverse simplement lequel est gelé.' },
      { t:'AMPLITUDE n\'est pas une question de dose', x:'C\'est une question de technique. Augmenter la cadence raccourcit la foulée, réduit l\'attaque talon et le freinage. Ce n\'est donc pas une progression : c\'est une correction appliquée dès la première séance, en évitant la vitesse et les côtes qui allongent la foulée.' },
      { t:'Deux distinctions qui changent la prise en charge', x:'La tendinopathie rotulienne relève de la charge, le syndrome fémoro-patellaire de la répétition : leurs traitements sont opposés. De même, la tendinopathie achilléenne corporéale relève de la charge, l\'insertionnelle de l\'amplitude. Les confondre revient à appliquer l\'inverse de ce qu\'il faudrait.' },
      { t:'Et quand deux pathologies coexistent ?', x:'Si leurs axes s\'opposent, on baisse tous les leviers responsables, puis on les remonte un par un — le volume d\'abord, l\'allure ensuite. Les interdits des deux pathologies s\'additionnent.' }
    ]},
  { id:'leviers', titre:'Volume, allure, cadence : un seul levier à la fois',
    intro:'La règle qui structure tout le générateur, et qui vaut aussi quand vous prescrivez à la main.',
    etapes:[
      { t:'Ne jamais augmenter deux paramètres la même semaine', x:'Si le patient va mieux, vous ne savez pas ce qui a marché. S\'il va moins bien, vous ne savez pas ce qui a fait mal. Un seul levier bouge, les autres tiennent.' },
      { t:'Le levier gelé n\'est jamais la cause d\'une douleur', x:'C\'est ce qui rend la régression simple : puisqu\'il n\'a pas bougé, il ne peut pas expliquer l\'aggravation. On régresse celui qui progressait.' },
      { t:'La fréquence avant la durée', x:'Pour atteindre un volume hebdomadaire, ajouter des sorties est presque toujours préférable à les allonger. Allonger concentre la contrainte sur une séance ; multiplier la répartit. C\'est particulièrement vrai des pathologies de répétition, qui tolèrent mal les sorties longues.' },
      { t:'La marche n\'est pas du temps perdu', x:'Dans un fractionné course/marche, la marche décharge activement l\'os et le tendon entre les bouts de course. C\'est ce qui permet de faire du volume sans accumuler la contrainte.' }
    ]},
  { id:'zones-allure', titre:'Les zones d\'allure et la charge pondérée',
    intro:'Une seule saisie — l\'allure de footing — et le reste se calcule. Comprendre pourquoi les séances ne pèsent pas toutes pareil.',
    etapes:[
      { t:'Tout se dérive du footing', x:'Renseignez l\'allure à laquelle votre patient court en endurance fondamentale (Z2). Les autres zones s\'en déduisent : récupération environ 8 % plus lent, endurance active 8 % plus rapide, seuil 14 %, VMA 22 %. Les pastilles sous le champ affichent le résultat.' },
      { t:'En retour de blessure, Z1 à Z3 suffisent presque toujours', x:'Le seuil (Z4) n\'apparaît que dans le dernier tiers de la reconstruction de l\'allure, et seulement sur les pathologies où c\'est elle qu\'on reconstruit. La VMA relève de la performance, pas de la reprise.' },
      { t:'Une minute de seuil ne vaut pas une minute de footing', x:'C\'est pourquoi la charge est pondérée par la zone : Z1 compte pour 1, Z2 pour 1,2, Z3 pour 1,6, Z4 pour 2,2, Z5 pour 3. Vingt-cinq minutes de seuil pèsent ainsi presque autant que cinquante minutes de footing — ce qui correspond à la réalité du tissu.' },
      { t:'La marche compte pour zéro', x:'Elle allonge la durée de la séance sans ajouter de charge de course. Une récupération courue en Z1, en revanche, compte bien ses minutes.' },
      { t:'C\'est cette charge pondérée qui alimente l\'ACWR du programme', x:'Sans pondération, introduire une séance de qualité ferait baisser l\'ACWR affiché alors que la contrainte augmente. Le graphe du générateur CAP utilise donc la charge pondérée, pas les minutes brutes.' }
    ]},
  { id:'paliers', titre:'Pourquoi certaines semaines n\'augmentent pas',
    intro:'La semaine de consolidation n\'est pas une semaine perdue, et elle ne se justifie pas de la même façon qu\'en entraînement classique.',
    etapes:[
      { t:'En rééducation, ce qui manque n\'est pas du repos', x:'C\'est du temps à charge constante. Aux volumes d\'une reprise, il n\'y a quasiment pas de fatigue accumulée à évacuer — le modèle de la décharge, importé de l\'entraînement, ne s\'y transpose pas tel quel.' },
      { t:'Le tissu conjonctif s\'adapte plus lentement que le cardio', x:'C\'est le piège classique : le coureur se sent parfaitement bien sur le plan cardio-vasculaire, il augmente, et le tissu n\'a pas suivi. L\'os passe même par une phase où la résorption précède la formation — il est transitoirement plus fragile avant d\'être plus solide.' },
      { t:'Sur l\'os, on baisse réellement', x:'Périostite, fracture de stress : une semaine sur trois à −30 %. La fenêtre de remodelage bénéficie d\'une contrainte réduite, et la douleur y est un signal tardif — quand elle apparaît, la lésion est déjà constituée. Attendre le retour du patient serait systématiquement trop tard.' },
      { t:'Sur le tendon, on maintient', x:'Un tendon a besoin de charge pour se remodeler : le décharger franchement est contre-productif. Une semaine sur quatre à charge constante suffit, et seulement au-dessus d\'un volume significatif.' },
      { t:'À faible volume, aucun palier programmé', x:'Il n\'y a rien à consolider quand rien ne s\'accumule. C\'est le retour du patient qui pilote, et lui seul.' }
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
      { t:'Copiez le lien et envoyez-le', x:'SMS, WhatsApp ou email. Le lien reste valable en permanence : pas besoin de le renvoyer à chaque séance. Le nom du patient est inclus en clair dans le lien copié — pratique pour reconnaître à qui il correspond dans votre historique de conversation, et il s\'affiche aussi en titre dans l\'en-tête de la page que l\'athlète ou le confrère ouvre.' },
      { t:'Le lien de partage d\'un programme (bouton 📤)', x:'Depuis le builder ou l\'historique des programmes, le bouton 📤 copie de la même façon un lien à sens unique vers ce programme précis, avec le nom du patient inclus.' },
      { t:'Conseillez à l\'athlète de l\'ajouter à son écran d\'accueil', x:'Il retrouvera son calendrier comme une application. Un bouton « 📲 Installer » sur sa page ouvre directement un tuto pas-à-pas adapté à son téléphone (iPhone ou Android) — voir la section Notifications push ci-dessous.' }
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
    ]},
  { id:'push-athlete', titre:'Notifications push sur le téléphone de l\'athlète 🔔',
    intro:'Si l\'athlète a installé l\'app sur son écran d\'accueil et activé les notifications, il reçoit une alerte sur son téléphone dès que vous modifiez son planning — sans avoir besoin d\'ouvrir l\'app pour le découvrir.',
    etapes:[
      { t:'Ce qui déclenche une notification', x:'Planifier une nouvelle séance (quel que soit le mode : ajout rapide, template, builder, protocole/cycle), déplacer ou dupliquer une séance existante, et envoyer un message patient.' },
      { t:'Ce qui ne déclenche rien', x:'Les modifications de contenu à l\'intérieur d\'une séance déjà planifiée (exercices, séries…) et les notes cliniques (réservées à vous, jamais visibles par l\'athlète) ne notifient pas.' },
      { t:'Regroupement automatique', x:'Si vous planifiez plusieurs séances d\'un coup, l\'athlète reçoit une seule notification groupée plutôt qu\'une rafale.' },
      { t:'Ce que voit l\'athlète', x:'À sa première visite, l\'app lui propose d\'activer les notifications (bannière en bas de l\'écran). Il peut aussi les activer plus tard depuis les réglages de son téléphone.' },
      { t:'Si l\'athlète ne reçoit rien', x:'Vérifiez qu\'il a bien installé l\'app depuis l\'icône « 📲 Installer » (les notifications ne fonctionnent pas depuis un onglet de navigateur classique, seulement depuis l\'app installée) et qu\'il a autorisé les notifications au niveau de son téléphone.' }
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
  { q:'Le générateur CAP me demande la charge des 4 dernières semaines : et si le patient ne court plus du tout ?',
    a:'Laissez les quatre champs à 0. Le générateur bascule alors en mode course/marche et progresse par paliers absolus : c\'est le cas d\'une reprise post-opératoire. À l\'inverse, un coureur qui encaisse déjà 40 km par semaine ne doit pas repartir de zéro — c\'est précisément ce que ces quatre champs évitent.' },
  { q:'Quelle différence entre « plus longue sortie tolérée » et « course continue sans douleur » ?',
    a:'La première est une durée totale de sortie, marche comprise : elle décide comment le volume se répartit entre les séances. La seconde est le nombre de minutes courues d\'affilée avant que la douleur apparaisse : en dessous de 5 minutes, le programme passe en course/marche. Un patient peut très bien tenir 40 minutes de sortie en alternant, et seulement 2 minutes de course d\'un trait.' },
  { q:'Pourquoi mon programme n\'a-t-il que des séances faciles, sans sortie longue ni séance de qualité ?',
    a:'La polarisation ne s\'ouvre que si le patient a le volume et la fréquence pour la porter. La grande majorité des retours de blessure n\'ont qu\'un seul type de séance, et c\'est le comportement attendu : distinguer des rôles n\'a de sens qu\'à partir d\'un certain volume.' },
  { q:'Le générateur me dit que ma progression est « agressive ». Est-ce qu\'il refuse de générer ?',
    a:'Non, jamais. L\'ACWR est un indicateur, pas une barrière : une reprise volontairement rapide peut être un choix clinique assumé. Le vrai filet de sécurité est la boucle de retour — la régression sur douleur, séance après séance.' },
  { q:'Mon patient a mal après une séance facile. Pourquoi le programme baisse-t-il partout ?',
    a:'Parce que c\'est le signal le plus sérieux, même s\'il paraît anodin. Aucun levier n\'a été poussé sur une séance facile : si elle fait mal, ce n\'est pas un problème de dosage de cette séance mais de charge accumulée. Réduire seulement les séances faciles laisserait le problème entier.' },
  { q:'Mon athlète ne voit pas son programme, que vérifier ?',
    a:'Vérifiez que la séance est bien planifiée dans l\'agenda du bon patient, puis renvoyez-lui son lien personnel (il ne change pas d\'une séance à l\'autre). Sur son téléphone, un simple rechargement de la page suffit souvent — le bouton « ↻ Actualiser » est prévu pour ça.' },
  { q:'Les activités Strava ne remontent pas.',
    a:'Vérifiez le badge « Strava » sur la fiche du patient : s\'il est absent, la connexion n\'a pas abouti — régénérez le lien (menu ⋮ → Connecter Strava) et refaites-le suivre à l\'athlète. S\'il est présent, les nouvelles sorties arrivent en temps réel mais l\'historique ne couvre que les 90 jours précédant la connexion.' },
  { q:'Une activité Strava s\'est liée à la mauvaise séance.',
    a:'Cliquez sur le badge S de la chip (ou sur l\'activité), puis « ✕ Délier de la séance ». Vous pouvez ensuite la lier manuellement à la bonne séance du jour. Le lien corrigé est mémorisé définitivement.' },
  { q:'Le retour de mon athlète n\'apparaît pas.',
    a:'Regardez la cloche en haut de l\'écran et les pastilles bleues/oranges sur l\'agenda : le retour y apparaît dès son envoi (actualisation toutes les 2 minutes). Vérifiez aussi que le bon patient est sélectionné.' },
  { q:'Dans la vue d\'ensemble, Actifs + Dormants ne fait pas le total de mes patients.',
    a:'C\'est normal. « Actif » signifie une activité de moins de 30 jours, « Dormant » plus de 90 jours. Les patients situés entre les deux ne sont dans aucune des deux cases — ils apparaissent en « Récent » dans la liste. Seul « Patients au total » compte tout le monde.' },
  { q:'Pourquoi la répartition des régions atteintes dépasse-t-elle 100 % ?',
    a:'Parce qu\'un patient peut avoir plusieurs zones douloureuses : il compte alors dans plusieurs lignes. C\'est aussi pour cette raison que ce bloc est en barres et non en camembert — un camembert affirmerait visuellement un partage du tout qui n\'existe pas. Le pourcentage se lit « part des patients concernés », pas « part du total ».' },
  { q:'Beaucoup de mes diagnostics sont en « Non reconnu ».',
    a:'La reconnaissance se fait par mots-clés sur le champ « Diagnostic » du bilan. Une formulation descriptive comme « Gêne au genou depuis la reprise » ne contient aucune pathologie nommée : elle est comptée à part plutôt que classée au hasard. Nommez la pathologie (SFP, LCA, tendinopathie de la coiffe…) pour améliorer le taux ; la description libre a sa place dans le motif de consultation, juste en dessous. Au-delà de 30 % de non-reconnus, considérez le classement comme indicatif seulement.' },
  { q:'Le sport de mon patient n\'apparaît pas dans les statistiques.',
    a:'Vérifiez d\'abord qu\'il est renseigné : la ligne grise « Non renseigné » compte les patients sans sport. S\'il est renseigné mais atterrit dans « Autres », c\'est que le libellé n\'est pas dans la liste des équivalences reconnues — dites-le nous, la liste s\'enrichit.' },
  { q:'Dans la fiche athlète, un champ est grisé avec une bordure pointillée.',
    a:'Ce n\'est pas un champ verrouillé : il affiche la valeur du bilan le plus récent, avec sa date, parce que la fiche est vide sur ce champ. C\'est un indice de lecture, jamais enregistré. Écrivez dedans pour poser votre propre valeur ; videz-le et enregistrez pour redonner la main au bilan.' },
  { q:'Le poids que je saisis dans la fiche écrase-t-il celui de mes bilans ?',
    a:'Non, jamais. Le bilan conserve sa propre valeur datée, ce qui permet le suivi dans le temps. La fiche porte la valeur de référence courante, utile notamment si vous n\'avez pas l\'offre bilan. Aucune écriture ne va de la fiche vers les bilans.' },
  { q:'Je clique sur un patient dans la liste et le sélecteur ne change pas.',
    a:'Ce bug a été corrigé. Si vous l\'observez encore, faites un rechargement complet de la page (Cmd/Ctrl + Shift + R) : votre navigateur utilise probablement une ancienne version de l\'application.' },
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
  { q:'Quelle différence entre un cycle « critères » et un protocole ?',
    a:'Un protocole (LCA, Latarjet…) vient d\'une bibliothèque réutilisable entre patients, avec objectifs, précautions et rappels automatiques. Un cycle « critères » est propre à un seul patient : plus léger, pensé pour une progression que vous définissez au cas par cas, sans avoir à créer un protocole complet dans la bibliothèque.' },
  { q:'Un bloc de séance n\'apparaît plus dans son étape.',
    a:'Vérifiez le menu « Étape » du bloc concerné (dans son en-tête) : il a peut-être été détaché par erreur, il suffit de le rattacher à nouveau. L\'étape elle-même n\'est jamais supprimée automatiquement, même si elle se retrouve vide.' },
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
