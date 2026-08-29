-- ═══════════════════════════════════════════════════════════════════
-- Échéances déclarées par l'athlète
--
-- ⚠ NON APPLIQUÉE. À exécuter par le praticien, après lecture, via
--    `supabase db push` ou la console SQL. Rien dans l'application ne
--    dépend de cette table pour fonctionner : tant qu'elle n'existe pas,
--    l'écran « Mes objectifs » reste masqué et l'agenda n'affiche que les
--    objectifs saisis dans le bilan.
--
-- POURQUOI UNE TABLE À PART, et pas une colonne de `patients` :
--   L'athlète est identifié par un simple `?patient=<id>` dans l'URL, avec
--   la clé anonyme. Lui ouvrir une écriture sur `patients` — la table qui
--   porte nom, prénom et date de naissance — pour qu'il puisse déclarer une
--   date de course serait un très mauvais échange. Une table dédiée isole
--   exactement ce qu'il a le droit d'écrire.
--
-- ⚠ EXPOSITION RÉSIDUELLE, à trancher avant la migration HDS :
--   La lecture anonyme ne peut pas être restreinte par ligne, faute
--   d'identité côté athlète — qui détient la clé anonyme peut lire la
--   table. C'est déjà la posture des tables `athlete_*` existantes ; cette
--   migration ne l'aggrave pas, mais elle ne la corrige pas non plus. Le
--   correctif est un jeton par patient dans le lien de partage, qui
--   dépasse le cadre de cette table et concerne tout l'espace athlète.
--   Les données ici sont volontairement pauvres : un intitulé et une date,
--   aucune donnée clinique.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS athlete_objectifs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id   bigint NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  texte        text   NOT NULL,
  date         date   NOT NULL,
  -- Horodatage de la prise en compte par le praticien. NULL = déclarée,
  -- pas encore vue. C'est ce champ qui verrouille l'édition côté athlète :
  -- une échéance sur laquelle des cycles ont été calés ne doit plus changer
  -- sous les pieds du praticien.
  repris_at    timestamptz,
  cree_at      timestamptz NOT NULL DEFAULT now()
);

-- Un intitulé vide ne dit rien ; un intitulé de 2 000 signes n'est pas un
-- intitulé, c'est un vecteur. La bande de l'agenda tronque à 26 caractères.
ALTER TABLE athlete_objectifs
  DROP CONSTRAINT IF EXISTS athlete_objectifs_texte_check;
ALTER TABLE athlete_objectifs
  ADD CONSTRAINT athlete_objectifs_texte_check
  CHECK (char_length(btrim(texte)) BETWEEN 1 AND 120);

-- Une échéance est un point du futur proche. Bornée pour qu'une faute de
-- frappe (« 2206 ») ne parte pas peupler l'agenda pour deux siècles.
ALTER TABLE athlete_objectifs
  DROP CONSTRAINT IF EXISTS athlete_objectifs_date_check;
ALTER TABLE athlete_objectifs
  ADD CONSTRAINT athlete_objectifs_date_check
  CHECK (date BETWEEN DATE '2020-01-01' AND (CURRENT_DATE + INTERVAL '10 years'));

CREATE INDEX IF NOT EXISTS athlete_objectifs_patient_date_idx
  ON athlete_objectifs (patient_id, date);

ALTER TABLE athlete_objectifs ENABLE ROW LEVEL SECURITY;

-- ── Le praticien : tous les droits, sur SES patients uniquement ──────
-- C'est la seule politique réellement fermée ici, et c'est elle qui
-- protège les données d'un cabinet de celles d'un autre.
DROP POLICY IF EXISTS athlete_objectifs_praticien ON athlete_objectifs;
CREATE POLICY athlete_objectifs_praticien ON athlete_objectifs
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM patients p
                      WHERE p.id = athlete_objectifs.patient_id
                        AND p.praticien_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM patients p
                      WHERE p.id = athlete_objectifs.patient_id
                        AND p.praticien_id = auth.uid()));

-- ── L'athlète : lecture ─────────────────────────────────────────────
-- Voir l'exposition résiduelle en tête de fichier : sans identité côté
-- athlète, la restriction par ligne est impossible aujourd'hui.
DROP POLICY IF EXISTS athlete_objectifs_lecture_anon ON athlete_objectifs;
CREATE POLICY athlete_objectifs_lecture_anon ON athlete_objectifs
  FOR SELECT TO anon USING (true);

-- ── L'athlète : déclarer ────────────────────────────────────────────
-- Il ne peut pas se déclarer « pris en compte » lui-même : ce serait
-- s'auto-valider, et le praticien perdrait le filtre qui l'empêche de
-- caler des cycles sur une date fantaisiste.
DROP POLICY IF EXISTS athlete_objectifs_ajout_anon ON athlete_objectifs;
CREATE POLICY athlete_objectifs_ajout_anon ON athlete_objectifs
  FOR INSERT TO anon WITH CHECK (repris_at IS NULL);

-- ── L'athlète : corriger, tant que ce n'est pas repris ──────────────
-- Une fois l'échéance prise en compte, des cycles sont calés dessus :
-- la laisser modifiable ferait bouger la planification sans que le
-- praticien en soit averti.
DROP POLICY IF EXISTS athlete_objectifs_maj_anon ON athlete_objectifs;
CREATE POLICY athlete_objectifs_maj_anon ON athlete_objectifs
  FOR UPDATE TO anon
  USING (repris_at IS NULL) WITH CHECK (repris_at IS NULL);

DROP POLICY IF EXISTS athlete_objectifs_suppr_anon ON athlete_objectifs;
CREATE POLICY athlete_objectifs_suppr_anon ON athlete_objectifs
  FOR DELETE TO anon USING (repris_at IS NULL);

COMMENT ON TABLE athlete_objectifs IS
  'Échéances sportives déclarées par l''athlète (course, reprise, examen). '
  'Jamais de donnée clinique. `repris_at` non nul = prise en compte par le '
  'praticien, l''athlète ne peut plus la modifier.';
