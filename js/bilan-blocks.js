/* ═══════════════════════════════════════════════════════════════════
   BILAN_BLOCKS — registre descriptif des blocs de bilan.html.
   Étape 1 du projet « bilan modulable ». Purement déclaratif : aucun
   comportement ne dépend encore de ce fichier.
   - Chaque bloc logique regroupe ses variantes single/bilateral
     (même data-block-id sur les deux <div class="block">).
   - tests[] : les <tbody> de TESTS{} rattachés au bloc. Le contenu
     hors TESTS{} (grilles de mobilité, lignes LSI, observations)
     appartient au bloc entier : il se masque avec lui, jamais
     ligne par ligne (règle de périmètre v1).
   - locked : bloc de base non retirable (marqueurs, conclusions).
   Validation croisée : golden.html + le script de validation
   (chaque tbody de TESTS{} doit appartenir à exactement un bloc).
═══════════════════════════════════════════════════════════════════ */
var BILAN_BLOCKS = {
 "infos": [
  {
   "id": "infos--identite",
   "name": "Identité",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "infos--anamnese",
   "name": "Anamnèse",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "infos--imageries",
   "name": "Imageries disponibles",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "epaule": [
  {
   "id": "epaule--marqueur",
   "name": "Type d'épaule & Marqueur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "epaule--trau",
   "name": "Quick Scan Traumatique",
   "tests": [
    "tb-ep-trau-gh",
    "tb-ep-trau-ac",
    "tb-ep-trau-lab",
    "tb-ep-trau-coiffe",
    "tb-ep-trau-g",
    "tb-ep-trau-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "epaule--irrit",
   "name": "Quick Scan Épaule Irritable",
   "tests": [
    "tb-ep-irrit",
    "tb-ep-irrit-g",
    "tb-ep-irrit-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "epaule--fonc",
   "name": "Quick Scan Fonctionnel",
   "tests": [
    "tb-ep-fonc",
    "tb-ep-fonc-g",
    "tb-ep-fonc-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "epaule--ortho",
   "name": "Quick Scan Orthopédique",
   "tests": [
    "tb-ep-ortho-mob",
    "tb-ep-ortho-conf",
    "tb-ep-ortho-g",
    "tb-ep-ortho-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "epaule--amplitudes-articulaires",
   "name": "Amplitudes Articulaires — Épaule (°)",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "epaule--optionnels",
   "name": "Tests Optionnels",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "epaule--conclusion",
   "name": "Conclusion — Diagnostic & Éducation patient",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "coude": [
  {
   "id": "coude--marqueur",
   "name": "Marqueur de douleur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "coude--amplitudes-articulaires",
   "name": "Amplitudes Articulaires — Coude",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "coude--lat",
   "name": "Compartiment Latéral",
   "tests": [
    "tb-co-lat",
    "tb-co-lat-g",
    "tb-co-lat-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "coude--med",
   "name": "Compartiment Médial",
   "tests": [
    "tb-co-med",
    "tb-co-med-g",
    "tb-co-med-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "coude--ant",
   "name": "Compartiment Antérieur",
   "tests": [
    "tb-co-ant",
    "tb-co-ant-g",
    "tb-co-ant-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "coude--post",
   "name": "Compartiment Postérieur",
   "tests": [
    "tb-co-post",
    "tb-co-post-g",
    "tb-co-post-d"
   ],
   "bilateral": true,
   "locked": false
  }
 ],
 "main": [
  {
   "id": "main--marqueur",
   "name": "Marqueur de douleur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "main--amplitudes-articulaires",
   "name": "Amplitudes Articulaires — Poignet",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "main--neuro",
   "name": "Tests Neurologiques",
   "tests": [
    "tb-po-neuro",
    "tb-po-neuro-g",
    "tb-po-neuro-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "main--lig",
   "name": "Tests Ligamentaires",
   "tests": [
    "tb-po-lig",
    "tb-po-lig-g",
    "tb-po-lig-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "main--pouce",
   "name": "Pouce — De Quervain",
   "tests": [
    "tb-po-pouce",
    "tb-po-pouce-g",
    "tb-po-pouce-d"
   ],
   "bilateral": true,
   "locked": false
  }
 ],
 "rachis": [
  {
   "id": "rachis--marqueur",
   "name": "Marqueur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "rachis--cervical",
   "name": "Quick Scan Cervical",
   "tests": [
    "tb-ra-cerv",
    "tb-ra-cerv-neuro-g",
    "tb-ra-cerv-neuro-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis--lombaire",
   "name": "Quick Scan Lombaire",
   "tests": [
    "tb-ra-lomb-g",
    "tb-ra-lomb-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis--mobilite-rachis",
   "name": "Mobilité du Rachis",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis--mckenzie",
   "name": "Préférences directionnelles McKenzie",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis--transverse",
   "name": "Test du transverse",
   "tests": [
    "tb-ra-transverse"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis--optionnels",
   "name": "Tests Optionnels",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis--conclusion",
   "name": "Conclusion",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "rachis-cerv": [
  {
   "id": "rachis-cerv--marqueur",
   "name": "Marqueur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "rachis-cerv--exclusion-vasculaire",
   "name": "Tests d'exclusion vasculaire",
   "tests": [
    "tb-cv-vascul"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-cerv--defile-thoracique",
   "name": "Syndrome du Défilé Thoraco-Brachial",
   "tests": [
    "tb-cv-defilé-g",
    "tb-cv-defilé-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-cerv--exclusion-mecanique",
   "name": "Tests d'exclusion mécanique",
   "tests": [
    "tb-cv-mecanique"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-cerv--ulnt",
   "name": "ULNT — Tests de Mécanosensitivité",
   "tests": [
    "tb-cv-ulnt-g",
    "tb-cv-ulnt-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-cerv--dn4",
   "name": "DN4 — Douleur Neuropathique",
   "tests": [
    "tb-cv-dn4-itw",
    "tb-cv-dn4-exam"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-cerv--exclusion-neurologique",
   "name": "Tests d'exclusion neurologique",
   "tests": [
    "tb-cv-motric-g",
    "tb-cv-motric-d",
    "tb-cv-rot-g",
    "tb-cv-rot-d",
    "tb-cv-sensib-g",
    "tb-cv-sensib-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-cerv--mobilite-cervicale",
   "name": "Mobilité Cervicale",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-cerv--conclusion",
   "name": "Conclusion",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "rachis-lomb": [
  {
   "id": "rachis-lomb--marqueur",
   "name": "Marqueur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "rachis-lomb--nerveux",
   "name": "Tests Nerveux — Mécanosensitivité",
   "tests": [
    "tb-rl-nerveux-g",
    "tb-rl-nerveux-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--exclusion-neurologique",
   "name": "Tests d'exclusion neurologique",
   "tests": [
    "tb-rl-rot-g",
    "tb-rl-rot-d",
    "tb-rl-motric-g",
    "tb-rl-motric-d",
    "tb-rl-sensib-g",
    "tb-rl-sensib-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--mecaniques",
   "name": "Tests Mécaniques",
   "tests": [
    "tb-rl-plet",
    "tb-rl-instab"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--cluster-laslett",
   "name": "Cluster de Laslett — Diag Différentiel Lombaire / Sacro-Iliaque",
   "tests": [
    "tb-rl-laslett-1",
    "tb-rl-laslett-2",
    "tb-rl-laslett-3"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--mobilite-lombaire",
   "name": "Mobilité Lombaire",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--bilan-mckenzie",
   "name": "Bilan McKenzie (MDT)",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--transverse",
   "name": "Transverse",
   "tests": [
    "tb-rl-transverse"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--tm",
   "name": "Tests TM",
   "tests": [
    "tb-rl-tfd-suite",
    "tb-rl-tfa-suite"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "rachis-lomb--conclusion",
   "name": "Conclusion",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "hanche": [
  {
   "id": "hanche--marqueur",
   "name": "Marqueur de Douleur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "hanche--neuro",
   "name": "Tests Neurologiques",
   "tests": [
    "tb-ha-neuro",
    "tb-ha-neuro-g",
    "tb-ha-neuro-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "hanche--cluster-laslett",
   "name": "Cluster de Laslett — Diag Différentiel Lombaire / Sacro-Iliaque",
   "tests": [
    "tb-ha-laslett-1",
    "tb-ha-laslett-2",
    "tb-ha-laslett-3"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "hanche--fracture",
   "name": "Exclusion Fracture de Contrainte",
   "tests": [
    "tb-ha-fracture",
    "tb-ha-fracture-g",
    "tb-ha-fracture-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "hanche--agp",
   "name": "Athletic Groin Pain (AGP)",
   "tests": [
    "tb-ha-agp-clock",
    "tb-ha-agp-demem",
    "tb-ha-agp-add",
    "tb-ha-agp-pubis",
    "tb-ha-agp-flech",
    "tb-ha-agp-inguinal",
    "tb-ha-agp-g",
    "tb-ha-agp-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "hanche--hanche",
   "name": "Tests de la Hanche (Coxo-Fémorale)",
   "tests": [
    "tb-ha-hanche",
    "tb-ha-hanche-g",
    "tb-ha-hanche-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "hanche--mobilite-hanche",
   "name": "Mobilité de Hanche",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "hanche--optionnels",
   "name": "Tests Optionnels",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "hanche--conclusion",
   "name": "Conclusion",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "genou": [
  {
   "id": "genou--marqueur",
   "name": "Marqueur de Douleur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "genou--global",
   "name": "Approche Globale",
   "tests": [
    "tb-ge-global",
    "tb-ge-global-g",
    "tb-ge-global-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--mob",
   "name": "Mobilités Flexion / Extension",
   "tests": [
    "tb-ge-mob-flex",
    "tb-ge-mob-ext",
    "tb-ge-mob-flex-g",
    "tb-ge-mob-flex-d",
    "tb-ge-mob-ext-g",
    "tb-ge-mob-ext-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--lig",
   "name": "Ligaments Latéraux",
   "tests": [
    "tb-ge-lig",
    "tb-ge-lig-g",
    "tb-ge-lig-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--lca",
   "name": "LCA / LCP",
   "tests": [
    "tb-ge-lca",
    "tb-ge-lca-g",
    "tb-ge-lca-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--men",
   "name": "Ménisques",
   "tests": [
    "tb-ge-men",
    "tb-ge-men-g",
    "tb-ge-men-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--rot",
   "name": "SD Patella",
   "tests": [
    "tb-ge-rot",
    "tb-ge-rot-g",
    "tb-ge-rot-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--sbit",
   "name": "SBIT (Bandelette IT)",
   "tests": [
    "tb-ge-sbit",
    "tb-ge-sbit-g",
    "tb-ge-sbit-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--plicae",
   "name": "Plicae",
   "tests": [
    "tb-ge-plicae",
    "tb-ge-plicae-g",
    "tb-ge-plicae-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "genou--ami",
   "name": "Tests Cliniques AMI",
   "tests": [
    "tb-ge-ext",
    "tb-ge-ext-g",
    "tb-ge-ext-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "genou--optionnels",
   "name": "Tests Optionnels",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "genou--conclusion",
   "name": "Conclusion",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "pied": [
  {
   "id": "pied--marqueur",
   "name": "Marqueur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "pied--ottawa",
   "name": "Règles d'Ottawa",
   "tests": [
    "tb-pi-ottawa",
    "tb-pi-ottawa-g",
    "tb-pi-ottawa-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "pied--global",
   "name": "Approche Globale",
   "tests": [
    "tb-pi-global",
    "tb-pi-global-g",
    "tb-pi-global-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "pied--amplitudes-articulaires",
   "name": "Amplitudes Articulaires — Cheville / Pied",
   "tests": [
    "tb-pi-amp-g",
    "tb-pi-amp-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "pied--tt",
   "name": "Tibio-Tarsienne",
   "tests": [
    "tb-pi-tt",
    "tb-pi-tt-g",
    "tb-pi-tt-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "pied--synd",
   "name": "Syndesmose",
   "tests": [
    "tb-pi-synd",
    "tb-pi-synd-g",
    "tb-pi-synd-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "pied--conf",
   "name": "Conflits",
   "tests": [
    "tb-pi-conf",
    "tb-pi-conf-g",
    "tb-pi-conf-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "pied--st",
   "name": "Sous-Talienne",
   "tests": [
    "tb-pi-st",
    "tb-pi-st-g",
    "tb-pi-st-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "pied--chopart",
   "name": "Chopart",
   "tests": [
    "tb-pi-chopart",
    "tb-pi-chopart-g",
    "tb-pi-chopart-d"
   ],
   "bilateral": true,
   "locked": false
  },
  {
   "id": "pied--cliniques",
   "name": "Tests Cliniques",
   "tests": [
    "tb-pi-tc-g",
    "tb-pi-tc-d"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "pied--optionnels",
   "name": "Tests Optionnels",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "pied--conclusion",
   "name": "Conclusion",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "lma": [
  {
   "id": "lma--localisation",
   "name": "Localisation de la lésion",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "lma--pectoraux",
   "name": "Pectoraux",
   "tests": [
    "tb-lma-pecto"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--biceps",
   "name": "Biceps",
   "tests": [
    "tb-lma-biceps"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--triceps",
   "name": "Triceps",
   "tests": [
    "tb-lma-triceps"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--grand-dorsal",
   "name": "Grand dorsal",
   "tests": [
    "tb-lma-dorsal"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--intercostaux",
   "name": "Intercostaux",
   "tests": [
    "tb-lma-interco"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--ischio-jambiers",
   "name": "Ischio-jambiers",
   "tests": [
    "tb-lma-ischio"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--quadriceps",
   "name": "Quadriceps",
   "tests": [
    "tb-lma-quadri"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--adducteurs",
   "name": "Adducteurs",
   "tests": [
    "tb-lma-adduct"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--mollet",
   "name": "Mollet",
   "tests": [
    "tb-lma-mollet"
   ],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "lma--marqueur",
   "name": "Marqueur",
   "tests": [],
   "bilateral": false,
   "locked": true
  },
  {
   "id": "lma--conclusion",
   "name": "Conclusion",
   "tests": [],
   "bilateral": false,
   "locked": true
  }
 ],
 "fonctionnels": [
  {
   "id": "fonctionnels--sls",
   "name": "Force Fonctionnelle — Single Leg Squat (SLS)",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--single-hop",
   "name": "Propulsion — Single Hop Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--hop80",
   "name": "Test de Réception — 80% Hop Test — Score /5",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--plio-qualitative",
   "name": "Pliométrie Verticale Qualitative",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--heel-rise",
   "name": "Force du Mollet — Heel Rise Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--lunge",
   "name": "Flexion Dorsale de Cheville — Lunge Test WBLT",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--drop-jump",
   "name": "Pliométrie Quantitative — Single Leg Drop Jump",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--side-hop",
   "name": "Side Hop Test — Explosivité & Endurance",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--msebt",
   "name": "mSEBT — modified Star Excursion Balance Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--sl-stance",
   "name": "Équilibre Statique — Single-Leg Stance Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnels--f8t",
   "name": "Figure-of-8 Hop Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  }
 ],
 "musculaires": [
  {
   "id": "musculaires--quadriceps",
   "name": "Quadriceps",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "musculaires--ischio-jambiers",
   "name": "Ischio-Jambiers",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "musculaires--ratios",
   "name": "Ratios & Pic / Poids de Corps",
   "tests": [],
   "bilateral": false,
   "locked": false
  }
 ],
 "force-ms": [
  {
   "id": "force-ms--epaule",
   "name": "Épaule",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "force-ms--coude",
   "name": "Coude",
   "tests": [],
   "bilateral": false,
   "locked": false
  }
 ],
 "force-rachis": [
  {
   "id": "force-rachis--cervical",
   "name": "Cervical",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "force-rachis--lombaire",
   "name": "Lombaire",
   "tests": [],
   "bilateral": false,
   "locked": false
  }
 ],
 "force-mi": [
  {
   "id": "force-mi--hanche",
   "name": "Hanche",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "force-mi--genou",
   "name": "Genou",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "force-mi--pied-cheville",
   "name": "Pied / Cheville",
   "tests": [],
   "bilateral": false,
   "locked": false
  }
 ],
 "fonctionnelsMS": [
  {
   "id": "fonctionnelsMS--pset",
   "name": "PSET — Prone Shoulder Endurance Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsMS--mckcuest",
   "name": "mCKCUEST — Closed Kinetic Chain Upper Extremity Stability Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsMS--side-hold-rotation",
   "name": "Side Hold Rotation Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsMS--shoulder-endurance",
   "name": "Shoulder Endurance Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsMS--ulrt",
   "name": "ULRT — Upper Limb Rotation Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsMS--uqybt",
   "name": "UQYBT — Upper-Quarter Y-Balance Test",
   "tests": [],
   "bilateral": false,
   "locked": false
  }
 ],
 "fonctionnelsRachis": [
  {
   "id": "fonctionnelsRachis--dnf",
   "name": "Endurance des Fléchisseurs Cervicaux (Deep Neck Flexor)",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsRachis--dne",
   "name": "Endurance des Extenseurs Cervicaux (Deep Neck Extensor)",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsRachis--lnf",
   "name": "Endurance Latérale Cervicale (Lateral Neck Flexor Test)",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsRachis--sorensen",
   "name": "Test de Sørensen — Endurance Extenseurs Lombaires",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsRachis--pdslrt",
   "name": "Prone Double Straight Leg Raise Test (PDSLRT) — Endurance Extenseurs Lombaires",
   "tests": [],
   "bilateral": false,
   "locked": false
  },
  {
   "id": "fonctionnelsRachis--shirado",
   "name": "Test de Shirado — Endurance Fléchisseurs Lombaires",
   "tests": [],
   "bilateral": false,
   "locked": false
  }
 ]
};
