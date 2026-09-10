/* Recettes de capture — un fichier du centre d'aide → les gestes qui amènent
   l'écran. La LISTE des captures n'est pas tenue ici : elle est lue dans
   js/aide-content.js. Une recette rend soit rien (capture de toute la vue),
   soit un localisateur (capture de cet élément seul). */
'use strict';

function outils(page) {
  return {
    page,
    /* Onglets du shell : #tab-bilan, #tab-outils, #tab-prescription, #tab-patients. */
    async onglet(id) { await page.click('#tab-' + id); await page.waitForTimeout(600); },
    async pause(ms) { await page.waitForTimeout(ms || 400); }
  };
}

const RECETTES = {
  /* Recette-témoin : elle prouve la chaîne entière — session, garde, écriture
     atomique — avant d'écrire les quarante autres sur des écrans réels. */
  'premiers-pas-creer-patient-1.png': async (o) => {
    await o.page.click('#patientBtn');
    await o.pause(500);
  }
};

module.exports = { RECETTES, outils };
