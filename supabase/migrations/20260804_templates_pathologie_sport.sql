-- ═══════════════════════════════════════════════════════════════════
-- Templates — étiqueter ce qu'ils soignent et pour qui.
--
-- Le problème résolu : la pathologie n'existait que dans le NOM du
-- template (« LCA — Phase 2 : Renfor… », tronqué à l'affichage). Un nom
-- ne se filtre pas, ne se trie pas, et surtout ne se rapproche pas d'un
-- patient. Impossible, donc, de proposer les bonnes séances quand un
-- patient est sélectionné — qui est pourtant l'usage principal.
--
-- Deux colonnes de TEXTE LIBRE, sur décision du praticien : il tape ce
-- qu'il veut. Le rapprochement avec le diagnostic du patient reste fiable
-- parce que l'étiquette passe par le MÊME classificateur que le champ
-- « Diagnostic » du bilan (R4P_MOTIF_KEYWORDS, js/patients-data.js).
-- « LCA » saisi ici et « rupture LCA opérée » saisi dans un bilan se
-- résolvent tous deux sur le groupe LCA, et se rejoignent.
--
-- Les deux tables reçoivent les colonnes : un protocole les porte pour
-- toutes ses phases (héritage), un template libre porte les siennes.
-- Sans cet héritage il faudrait saisir la même pathologie sur chacune
-- des trois phases d'un protocole LCA.
--
-- Aucune valeur par défaut, aucune contrainte : une étiquette absente
-- signifie « non renseigné », jamais « aucune pathologie ».
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS pathologie text,
  ADD COLUMN IF NOT EXISTS sport      text;

ALTER TABLE template_groups
  ADD COLUMN IF NOT EXISTS pathologie text,
  ADD COLUMN IF NOT EXISTS sport      text;

-- Recherche par étiquette : les listes se filtrent à chaque frappe dans la
-- barre latérale, sur des cohortes qui grossissent avec les années.
CREATE INDEX IF NOT EXISTS idx_templates_pathologie
  ON templates (pathologie) WHERE pathologie IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_sport
  ON templates (sport) WHERE sport IS NOT NULL;
