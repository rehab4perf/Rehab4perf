-- ═══════════════════════════════════════════════════════════════════
-- Fiche athlète — champs qui n'ont aucun autre foyer aujourd'hui.
--
-- Principe retenu : la fiche ne devient JAMAIS un second point de saisie
-- pour un champ qui vit déjà dans le bilan. Les champs ci-dessous sont soit
-- inexistants ailleurs (latéralité, niveau, cadre d'entraînement), soit
-- inaccessibles aux plans sans bilan (poids, taille) — auquel cas la valeur
-- du bilan le plus récent reste prioritaire à la lecture, et la fiche ne
-- sert que de repli. Aucune écriture de la fiche vers les bilans.
--
-- Colonnes réelles pour ce qui est court, typé et interrogeable.
-- JSONB pour l'ouvert et l'évolutif.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS poids            numeric,
  ADD COLUMN IF NOT EXISTS taille           numeric,
  ADD COLUMN IF NOT EXISTS lateralite_main  text,
  ADD COLUMN IF NOT EXISTS lateralite_pied  text,
  ADD COLUMN IF NOT EXISTS niveau           text,
  ADD COLUMN IF NOT EXISTS activite         text,
  ADD COLUMN IF NOT EXISTS medecin          text,
  ADD COLUMN IF NOT EXISTS fiche            jsonb DEFAULT '{}'::jsonb;

-- Le niveau est une liste fermée dès le premier jour : il n'y a aucune
-- valeur existante à migrer, donc aucune raison de répéter l'erreur du
-- champ « sport » en texte libre, qui rend les statistiques inexploitables.
ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_niveau_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_niveau_check CHECK (
    niveau IS NULL OR niveau IN (
      'loisir','departemental','regional','national','international','professionnel'
    )
  );

ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_lat_main_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_lat_main_check CHECK (
    lateralite_main IS NULL OR lateralite_main IN ('droite','gauche','ambidextre')
  );

ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_lat_pied_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_lat_pied_check CHECK (
    lateralite_pied IS NULL OR lateralite_pied IN ('droit','gauche','indifferent')
  );

-- Garde-fous physiologiques : évite qu'une faute de frappe (« 750 » kg)
-- pollue les statistiques sans que rien ne le signale.
ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_poids_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_poids_check CHECK (poids IS NULL OR (poids > 0 AND poids < 400));
ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_taille_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_taille_check CHECK (taille IS NULL OR (taille > 0 AND taille < 260));
