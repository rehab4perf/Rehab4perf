-- ═══════════════════════════════════════════════════════════════════
-- Périodes déclarées par l'athlète — vacances, déplacement, arrêt
--
-- ⚠ NON APPLIQUÉE. À exécuter par le praticien, comme les deux
--    migrations `athlete_objectifs` qui la précèdent.
--
-- POURQUOI UNE COLONNE, ET PAS UNE TABLE :
--   Une période et une échéance sont la même chose vue du praticien —
--   quelque chose de daté que l'athlète déclare et sur quoi la
--   planification doit s'appuyer. Elles partagent le même cycle de vie
--   (`repris_at`), les mêmes politiques RLS, le même écran, la même
--   bande d'agenda. Une seconde table aurait dupliqué tout cela pour
--   une seule différence : la présence d'une date de fin.
--
--   `date_fin` NULL = un point dans le temps (une échéance).
--   `date_fin` non nul = une plage, de `date` à `date_fin` incluses.
--
-- CE QUE ÇA NE FAIT PAS :
--   Rien n'empêche le praticien de planifier une séance pendant une
--   période déclarée. C'est délibéré — l'athlète informe, il ne pilote
--   pas l'agenda. Un blocage dur transformerait une information en
--   contrainte, et le praticien sait des choses que l'athlète ignore.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE athlete_objectifs
  ADD COLUMN IF NOT EXISTS date_fin date;

-- Une fin avant le début n'est pas une période, c'est une faute de
-- saisie — et elle produirait une plage vide, donc invisible, donc
-- impossible à comprendre depuis l'écran.
ALTER TABLE athlete_objectifs
  DROP CONSTRAINT IF EXISTS athlete_objectifs_date_fin_check;
ALTER TABLE athlete_objectifs
  ADD CONSTRAINT athlete_objectifs_date_fin_check
  CHECK (date_fin IS NULL OR date_fin >= date);

-- Bornée comme la date de début, et pour la même raison : une faute de
-- frappe ne doit pas peupler l'agenda pour deux siècles.
ALTER TABLE athlete_objectifs
  DROP CONSTRAINT IF EXISTS athlete_objectifs_date_fin_bornee;
ALTER TABLE athlete_objectifs
  ADD CONSTRAINT athlete_objectifs_date_fin_bornee
  CHECK (date_fin IS NULL
         OR date_fin <= (CURRENT_DATE + INTERVAL '10 years'));

-- Une période d'un an teinterait tous les mois de l'agenda et cesserait
-- d'informer. Au-delà, ce n'est plus une période : c'est un changement
-- de situation, qui se dit au praticien de vive voix.
ALTER TABLE athlete_objectifs
  DROP CONSTRAINT IF EXISTS athlete_objectifs_duree_check;
ALTER TABLE athlete_objectifs
  ADD CONSTRAINT athlete_objectifs_duree_check
  CHECK (date_fin IS NULL OR (date_fin - date) <= 366);

-- La recherche par patient balaie désormais aussi les périodes EN COURS,
-- dont la date de début est passée. L'index existant porte (patient_id,
-- date) et reste le bon point d'entrée ; celui-ci sert les filtres de
-- fin.
CREATE INDEX IF NOT EXISTS athlete_objectifs_patient_fin_idx
  ON athlete_objectifs (patient_id, date_fin)
  WHERE date_fin IS NOT NULL;

COMMENT ON COLUMN athlete_objectifs.date_fin IS
  'Non nul = période (vacances, déplacement, arrêt) de `date` à `date_fin` '
  'incluses. Nul = échéance ponctuelle. Aucune donnée clinique.';
