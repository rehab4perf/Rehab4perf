-- ═══════════════════════════════════════════════════════════════════
-- Qui a saisi l'échéance — le praticien peut en poser depuis Programme
--
-- ⚠ NON APPLIQUÉE. À exécuter par le praticien, après lecture.
--    Tant qu'elle ne l'est pas, `source` n'existe pas : l'application
--    continue d'écrire sans cette colonne et tout fonctionne comme
--    avant — l'échéance saisie depuis Programme est alors rangée
--    comme une déclaration d'athlète, sans autre conséquence.
--
-- POURQUOI DANS CETTE TABLE, et pas dans le bilan :
--   Une date de course apprise au téléphone n'est pas une observation
--   clinique. Elle passait par le bilan uniquement parce que c'était
--   le seul endroit où la saisir — ce qui obligeait à rouvrir et
--   réenregistrer un document daté pour noter un semi-marathon.
--
--   Surtout, un objectif de bilan vit dans un JSON (`f-objectifs`) SANS
--   IDENTIFIANT. C'est la raison pour laquelle la bande de l'agenda ne
--   propose ni fusion ni modification dessus : il n'y a rien où inscrire
--   quoi que ce soit. Rangée ici, une échéance gagne un id — donc la
--   modification, la suppression, la fusion avec celle que l'athlète a
--   déclarée de son côté, et la période par `date_fin`.
--
-- CE QUE LA COLONNE CHANGE, ET CE QU'ELLE NE CHANGE PAS :
--   Elle ne change RIEN à l'apparence : toutes les échéances gardent la
--   même identité 🎯 ambre, décision déjà prise — la même échéance sous
--   deux couleurs selon l'endroit ferait douter que ce soit la même.
--   Elle sert au REGROUPEMENT : deux échéances du même jour ne se
--   fondent que si elles viennent de deux sources différentes.
-- ═══════════════════════════════════════════════════════════════════

-- Le défaut vaut 'athlete' : toutes les lignes déjà en base ont été
-- déclarées par l'athlète, et une colonne ajoutée sans défaut les
-- laisserait à NULL, c'est-à-dire sans source du tout.
ALTER TABLE athlete_objectifs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'athlete';

ALTER TABLE athlete_objectifs
  DROP CONSTRAINT IF EXISTS athlete_objectifs_source_check;
ALTER TABLE athlete_objectifs
  ADD CONSTRAINT athlete_objectifs_source_check
  CHECK (source IN ('athlete', 'praticien'));

-- ── L'athlète ne peut ni se faire passer pour le praticien… ─────────
-- Les politiques anon existantes autorisaient l'insertion dès lors que
-- `repris_at` était nul. Sans cette reprise, l'athlète pourrait écrire
-- `source = 'praticien'` et déposer une échéance qui, à l'écran, ne se
-- distingue plus d'une décision du cabinet.
DROP POLICY IF EXISTS athlete_objectifs_ajout_anon ON athlete_objectifs;
CREATE POLICY athlete_objectifs_ajout_anon ON athlete_objectifs
  FOR INSERT TO anon
  WITH CHECK (repris_at IS NULL AND source = 'athlete');

-- ── …ni toucher à une échéance posée par le praticien ───────────────
-- `repris_at` non nul l'interdisait déjà — et l'application pose bien
-- `repris_at` sur ce qu'elle écrit. Mais un verrou qui dépend de ce que
-- le client a pensé à envoyer n'est pas un verrou : la source est ici
-- redite, pour que la règle tienne même sur une ligne mal formée.
DROP POLICY IF EXISTS athlete_objectifs_maj_anon ON athlete_objectifs;
CREATE POLICY athlete_objectifs_maj_anon ON athlete_objectifs
  FOR UPDATE TO anon
  USING      (repris_at IS NULL AND source = 'athlete')
  WITH CHECK (repris_at IS NULL AND source = 'athlete');

DROP POLICY IF EXISTS athlete_objectifs_suppr_anon ON athlete_objectifs;
CREATE POLICY athlete_objectifs_suppr_anon ON athlete_objectifs
  FOR DELETE TO anon
  USING (repris_at IS NULL AND source = 'athlete');

COMMENT ON COLUMN athlete_objectifs.source IS
  'Qui a saisi l''échéance : ''athlete'' (déclarée depuis l''espace athlète) '
  'ou ''praticien'' (posée depuis l''onglet Programme). Sert au regroupement '
  'de la bande d''agenda — deux échéances du même jour ne se fondent que si '
  'elles viennent de deux sources différentes. Aucune donnée clinique.';
