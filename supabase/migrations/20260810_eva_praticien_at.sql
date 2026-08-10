-- Horodatage de l'EVA saisie par le PRATICIEN dans le builder.
--
-- Pourquoi une colonne et pas une source : `athlete_feedback` ne garde qu'UNE
-- ligne par seance, partagee entre le patient et le praticien (contrainte
-- d'unicite sur seance_id, et l'ecriture praticien fusionne dans l'exo_data
-- du patient). Une colonne `source` y serait ecrasee par le dernier ecrivain.
--
-- Ce que ca corrige : la saisie du praticien creait une ligne avec seen_at
-- vide, indiscernable d'un retour patient — sa propre cloche sonnait. Et son
-- EVA, rangee dans exo_data.eva_praticien, n'etait lue par aucun compteur de
-- douleur : une douleur a 8/10 s'affichait « RAS ».
--
-- La cloche ne retient desormais que les lignes portant du contenu PATIENT
-- et dont l'envoi est posterieur a la derniere saisie du praticien.
alter table athlete_feedback
  add column if not exists eva_praticien_at timestamptz;

comment on column athlete_feedback.eva_praticien_at is
  'Date de la derniere EVA saisie par le praticien (exo_data.eva_praticien). '
  'Sert a distinguer sa propre ecriture d''un retour patient : ne jamais '
  'l''ecraser depuis l''espace athlete.';
