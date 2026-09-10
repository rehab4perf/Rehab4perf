/* Recettes de capture — un fichier du centre d'aide → les gestes qui amènent
   l'écran. La LISTE des captures n'est pas tenue ici : elle est lue dans
   js/aide-content.js. Une recette rend soit rien (capture de toute la vue),
   soit un localisateur (capture de cet élément seul). */
'use strict';

/* Les pages de l'app vivent dans des IFRAMES persistantes : on les retrouve par
   leur adresse, jamais par leur rang — l'ordre des cadres n'est pas un contrat. */
const CADRES = { bilan: 'bilan.html', outils: 'outils.html', prescription: 'programme.html',
                 patients: 'patients.html', compte: 'account.html' };

function outils(page) {
  const o = {
    page,
    /* Onglets du shell : #tab-bilan, #tab-outils, #tab-prescription, #tab-patients. */
    async onglet(id) { await page.click('#tab-' + id); await page.waitForTimeout(900); },
    async pause(ms) { await page.waitForTimeout(ms || 400); },
    /* Le cadre d'une page, pour y cliquer ou y viser un élément. */
    cadre(nom) {
      const f = page.frames().find(x => x.url().includes(CADRES[nom] || nom));
      if (!f) throw new Error('cadre « ' + nom + ' » introuvable');
      return f;
    },
    /* Un élément À CAPTURER dans un cadre : la recette le rend, le moteur ne
       photographie alors que lui. Une étape qui vise un contrôle se lit mieux
       recadrée que noyée dans l'écran entier. */
    element(nom, selecteur) { return page.frameLocator('iframe[src*="' + (CADRES[nom] || nom) + '"]').locator(selecteur).first(); },
    /* Le même, mais repéré par le TEXTE qu'il contient — « la carte Logo &
       signature » plutôt qu'un rang dans la page, qui changerait au premier
       ajout de carte. */
    carte(nom, selecteur, texte) {
      return page.frameLocator('iframe[src*="' + (CADRES[nom] || nom) + '"]').locator(selecteur).filter({ hasText: texte }).first();
    },
    /* Appeler une fonction de l'app dans son cadre (showPage, showTab, setView…).
       Une fonction d'AFFICHAGE : si elle tentait d'écrire, la coupure réseau la
       bloquerait et le bilan du lancement le dirait. */
    /* Le PARENT d'un élément d'un cadre — la carte autour d'un bouton. */
    parent(nom, selecteur) {
      return page.frameLocator('iframe[src*="' + (CADRES[nom] || nom) + '"]').locator(selecteur).first().locator('xpath=..');
    },
    /* Cliquer un élément d'un cadre repéré par son texte. */
    async cliquerTexte(nom, texte) {
      await page.frameLocator('iframe[src*="' + (CADRES[nom] || nom) + '"]').getByText(texte, { exact: false }).first().click();
      await page.waitForTimeout(900);
    },
    /* L'identifiant de Thomas, lu dans la liste de la coquille. */
    /* PIÈGE : `_allPatients` (la coquille) est global mais VIDE tant que la
       fenêtre Patients n'a pas été ouverte. La copie du patient courant dans le
       cadre du bilan, elle, est remplie dès la sélection. */
    async idThomas() {
      await o.thomas();
      const id = await o.cadre('bilan').evaluate(() =>
        (window._bilanPatient && _bilanPatient.nom === 'MARTIN') ? _bilanPatient.id : null)
        || await o.cadre('prescription').evaluate(() =>
        (window._progPatient && _progPatient.nom === 'MARTIN') ? _progPatient.id : null);
      if (!id) throw new Error('identifiant de Thomas MARTIN introuvable');
      return id;
    },
    /* La page ATHLÈTE, en format téléphone : c'est là que l'athlète la regarde.
       Elle se passe de connexion — le lien porte le patient. */
    async athlete() {
      const id = await o.idThomas();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('https://app.rehab4perf.com/athlete.html?patient=' + id, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1800);
      /* L'invitation « Activer les rappels de séances » couvre le bas de
         l'écran. La fermer n'écrit que dans le navigateur (localStorage). */
      await page.evaluate(() => { if (window._dismissPushBanner) _dismissPushBanner(); });
      await page.waitForTimeout(300);
    },
    /* Ouvrir, côté athlète, la séance la plus récente de la liste. */
    async seanceAthlete() {
      await o.athlete();
      /* La page s'ouvre sur le CALENDRIER du mois : les cartes de séance
         n'existent qu'une fois entré dans une journée. */
      await page.evaluate(() => jumpToDay('2026-09-08'));
      await page.waitForTimeout(1500);
      const cartes = page.locator('[onclick*="openProgModal"]:visible');
      if (!(await cartes.count())) throw new Error('aucune séance à ouvrir sur la page athlète');
      await cartes.first().click();
      await page.waitForSelector('#progModal.open', { timeout: 8000 });
      await page.waitForTimeout(1800);
    },
    /* Ouvrir dans le builder la séance planifiée du 8 septembre (celle qui porte
       un retour non lu). */
    async seance() {
      await o.thomas(); await o.onglet('prescription'); await o.pause(1500);
      const chip = page.frameLocator('iframe[src*="programme.html"]').locator('#cal-day-2026-09-08 .cal-session-chip, #cal-day-2026-09-08 [id^="cal-chip-"]').first();
      await chip.click(); await o.pause(2500);
    },
    async appeler(nom, fn, arg) { await o.cadre(nom).evaluate(([f, a]) => window[f](a), [fn, arg]); await page.waitForTimeout(900); },
    /* Sélectionner Thomas MARTIN, le patient principal de la démo.
       PIÈGE : « MARTIN Thomas » est AUSSI l'étiquette du bouton du haut quand il
       est déjà choisi — cachée sous la fenêtre, elle captait le clic et la
       recette attendait 30 s. On ne clique donc rien s'il l'est déjà, et sinon
       on vise sa date de naissance, texte qui n'existe QUE dans la liste. */
    async thomas() {
      const lab = ((await page.textContent('#patientBtnLabel')) || '').trim();
      if (/MARTIN Thomas/.test(lab)) return;
      await page.click('#patientBtn'); await page.waitForTimeout(500);
      await page.getByText('14/03/1994', { exact: false }).first().click();
      await page.waitForTimeout(3500);
      const apres = ((await page.textContent('#patientBtnLabel')) || '').trim();
      if (!/MARTIN Thomas/.test(apres)) throw new Error('Thomas MARTIN n\'a pas pu être sélectionné (« ' + apres + ' »)');
    }
  };
  return o;
}

const RECETTES = {
  /* Recette-témoin : elle prouve la chaîne entière — session, garde, écriture
     atomique — avant d'écrire les quarante autres sur des écrans réels. */
  'premiers-pas-creer-patient-1.png': async (o) => {
    await o.page.click('#patientBtn');
    await o.pause(500);
  },

  /* ── Premiers pas : Mon compte ── */
  'premiers-pas-mon-compte-1.png': async (o) => {
    await o.page.click('#userDisplay'); await o.pause(1500);
    return o.carte('compte', '.card', 'Informations professionnelles');
  },
  'premiers-pas-mon-compte-8.png': async (o) => {
    await o.page.click('#userDisplay'); await o.pause(2500);        // les URL signées des images
    return o.carte('compte', '.card', 'Logo & signature');
  },

  /* ── Bilan clinique ── */
  'bilan-infos-patient-2.png': async (o) => {
    await o.thomas(); await o.onglet('bilan'); await o.appeler('bilan', 'showPage', 'infos');
    return o.element('bilan', '.form-grid:has(#f-date-op)');
  },
  'bilan-personnaliser-bilan-1.png': async (o) => {
    await o.thomas(); await o.onglet('bilan'); await o.appeler('bilan', 'showPage', 'genou');
    return o.element('bilan', '#page-genou .page-header');
  },
  'bilan-sauvegarder-bilan-3.png': async (o) => {
    await o.thomas(); await o.onglet('bilan'); await o.pause(1200);
    /* L'aide parle de « Sauvegarder le bilan » : c'est le libellé d'un bilan
       NON ENREGISTRÉ. Rouvrir un bilan existant l'intitule « Enregistrer les
       modifications ». On part donc d'un bilan de suivi neuf — ni la création
       ni sa confirmation n'écrivent. */
    await o.appeler('bilan', 'newBilanSuivi');
    await o.appeler('bilan', '_newBilanSuiviConfirm');
    const lib = await o.cadre('bilan').evaluate(() => (document.getElementById('bilan-save-btn') || {}).textContent || '');
    if (!/Sauvegarder le bilan/.test(lib)) throw new Error('le bouton dit « ' + lib.trim() + ' », pas « Sauvegarder le bilan »');
    /* On MONTRE le bouton, on ne le clique jamais — et s'il l'était, la coupure
       réseau empêcherait l'enregistrement. */
    return o.page.frameLocator('iframe[src*="bilan.html"]').locator('#bilan-save-btn').locator('xpath=..');
  },

  /* ── Outils ── */
  'outils-batteries-1.png': async (o) => {
    await o.onglet('outils'); await o.appeler('outils', 'showTab', 'batteries');
  },
  'outils-cr-medecin-4.png': async (o) => {
    await o.thomas(); await o.onglet('outils'); await o.appeler('outils', 'showTab', 'cr');
    await o.pause(2500);                                              // l'association automatique
  },

  /* ── Patients ── */
  'patients-vue-ensemble-1.png': async (o) => {
    await o.onglet('patients'); await o.appeler('patients', 'setView', 'overview');
  },
  'patients-filtres-periode-1.png': async (o) => {
    await o.onglet('patients'); await o.appeler('patients', 'setView', 'overview');
    await o.appeler('patients', 'setPeriod', 'custom');
  },
  'patients-liste-1.png': async (o) => {
    await o.onglet('patients'); await o.appeler('patients', 'setView', 'list');
  },
  /* ── Programme : agenda, notes, cycles ── */
  'programme-agenda-1.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'openCalPicker', '2026-09-15');
    return o.parent('prescription', '#calPickerList');
  },
  'programme-notes-rappels-3.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'openCalPicker', '2026-09-15');
    await o.cliquerTexte('prescription', 'Ajouter une note');
    await o.cadre('prescription').evaluate(() => { const c = document.getElementById('note-reminder-chk'); if (!c) throw new Error('case « Me le rappeler » absente'); c.checked = true; if (window._toggleReminderFields) _toggleReminderFields(); });
    await o.pause(500);
    /* Sur ordinateur, la note s'écrit DANS le choix du jour (#calPickerList),
       pas dans la fiche tactile #noteSheet — qui reste masquée. */
    return o.parent('prescription', '#calPickerList');
  },
  'programme-protocoles-2.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.pause(1200);
    /* La fenêtre des rappels s'ouvre d'ordinaire APRÈS l'assignation d'un
       protocole — une écriture. On l'ouvre directement sur le protocole LCA de
       Thomas : elle calcule ses jalons depuis la date d'opération (J0). */
    await o.cadre('prescription').evaluate(() => {
      const tous = (typeof _getAllProtocols === 'function' ? _getAllProtocols() : [])
        .concat(typeof PROTOCOLS_REF !== 'undefined' ? PROTOCOLS_REF : []);
      const p = tous.find(x => /\bLCA\b/i.test(x.name || ''));
      if (!p) throw new Error('protocole LCA introuvable');
      _openRappelsModal(p);
    });
    await o.pause(1200);
    /* Recadrée : en plein écran, la liste des jalons était illisible. */
    return o.element('prescription', '#rappels-modal-overlay > div');
  },
  'programme-cycles-1.png': async (o) => {
    /* L'étape montre le FORMULAIRE (nom, couleur, note, Durée fixe / Critères) :
       la fenêtre s'ouvre sur la liste, il faut « + Ajouter un cycle ». */
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'openCycles');
    await o.appeler('prescription', 'openCycleForm', null);
    return o.element('prescription', '#cycle-modal > div');
  },
  'programme-cycles-3.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'openCycles');
    await o.appeler('prescription', 'openCycleForm', null);
    await o.appeler('prescription', 'selectCycleMode', 'criteres');
    return o.element('prescription', '#cycle-modal > div');
  },

  /* ── Programme : builder et bibliothèque ── */
  'programme-builder-4.png': async (o) => {
    await o.seance();
    return o.element('prescription', '.exo-row');
  },
  'programme-bibliotheque-4.png': async (o) => {
    await o.seance();
  },
  'programme-bibliotheque-5.png': async (o) => {
    await o.seance();
    await o.cliquerTexte('prescription', 'mon exercice');
  },
  'programme-etapes-1.png': async (o) => {
    await o.seance();
    /* Par la FONCTION du bouton et le seul visible : un clic par texte visait
       un « + Ajouter » homonyme masqué et attendait 30 s. */
    await o.page.frameLocator('iframe[src*="programme.html"]').locator('button[onclick*="ouvrirMenuAjout(event,-1)"]:visible').first().click();
    await o.pause(700);
  },
  'programme-feedback-1.png': async (o) => {
    await o.seance();
    return o.parent('prescription', '#builder-feedback-btn');
  },

  /* ── Calculateurs et générateurs (menu ⋯) ── */
  'calculateurs-rm-1.png': async (o) => {
    await o.onglet('prescription'); await o.appeler('prescription', 'openToolPanel', 'rm');
    return o.element('prescription', '#tp-rm');
  },
  'calculateurs-cardio-2.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'openToolPanel', 'cardio');
    /* Les 5 zones de Karvonen n'apparaissent qu'avec une FC de repos. Le champ
       n'a pas d'identifiant stable : on le trouve par son libellé. Saisie
       locale, aucune écriture. */
    await o.cadre('prescription').evaluate(() => {
      const p = document.getElementById('tp-cardio');
      const lab = [...p.querySelectorAll('label')].find(l => /FC repos/i.test(l.textContent));
      const inp = lab && (lab.htmlFor ? document.getElementById(lab.htmlFor) : (lab.parentElement || p).querySelector('input'));
      if (!inp) throw new Error('champ « FC repos » introuvable');
      inp.value = '58';
      inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
      if (window._pCalcCardio) _pCalcCardio();
    });
    await o.pause(700);
    /* Le panneau défile : capturé entier, ses 5 zones restaient hors cadre.
       On vise leur bloc, reconnu par son intitulé. */
    return o.page.frameLocator('iframe[src*="programme.html"]').locator('.tp-block-hd').filter({ hasText: '5 Zones' }).first().locator('xpath=..');
  },
  'generateurs-cap-1.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'openCAPWizard'); await o.pause(1200);
  },
  'generateurs-hsr-1.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'openHSRWizard'); await o.pause(1200);
  },
  'athlete-lien-athlete-1.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.appeler('prescription', 'shareCalLink');
    return o.element('prescription', '#share-cal-menu');
  },

  /* ── Espace athlète (format téléphone) ── */
  'athlete-vue-athlete-2.png': async (o) => { await o.seanceAthlete(); },
  'athlete-douleur-athlete-1.png': async (o) => {
    await o.seanceAthlete();
    const q = o.page.locator('#progModal .exo-pain-q').first();
    if (!(await q.count())) throw new Error('question de douleur absente de la séance');
    return q.locator('xpath=..');
  },
  'programme-etapes-7.png': async (o) => {
    await o.seanceAthlete();
    const e = o.page.locator('#progModal .etape-header-ath').first();
    if (!(await e.count())) throw new Error('la séance ne contient aucune étape');
    return e.locator('xpath=..');
  },
  'programme-cycles-6.png': async (o) => { await o.athlete(); },
  'programme-protocoles-4.png': async (o) => {
    await o.athlete();
    const b = o.page.locator('#proto-banner-slot');
    if (!(await b.count()) || !(await b.innerText()).trim()) throw new Error('section « Mon protocole » vide');
    return b;
  },

  /* ── Strava et notifications ── */
  'strava-connecter-strava-1.png': async (o) => {
    const id = await o.idThomas();
    await o.page.evaluate(id => stravaConnect(id), id); await o.pause(700);
    return o.page.locator('#stravaModal > div').first();
  },
  'notifications-cloche-1.png': async (o) => {
    await o.page.click('#notifBell'); await o.pause(1200);
    return o.page.locator('#notifDrop');
  },
  'notifications-pastilles-1.png': async (o) => {
    await o.thomas(); await o.onglet('prescription'); await o.pause(1800);
    return o.element('prescription', '#cal-day-2026-09-08');
  },
  'notifications-reglages-1.png': async (o) => {
    await o.page.click('#userDisplay'); await o.pause(1500);
    return o.carte('compte', '.card', 'Notifications — Retours athlètes');
  },

  'patients-fiche-1.png': async (o) => {
    await o.thomas(); await o.onglet('patients'); await o.appeler('patients', 'setView', 'fiche');
    await o.pause(1200);
  }
};

module.exports = { RECETTES, outils };
