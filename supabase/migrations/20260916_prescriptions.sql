-- ═══════════════════════════════════════════════════════════════════
-- Historique des ordonnances rédigées par le kinésithérapeute.
--
-- ⚠ NON APPLIQUÉE — à appliquer par le praticien, dans la console SQL.
--    L'ordre est indifférent : tant que la table n'existe pas, outils.html
--    garde l'historique dans le navigateur (onglet Prescription). Après
--    application, les nouvelles ordonnances sont enregistrées ici.
--    Réversible : DROP TABLE public.prescriptions;
--
-- Une ligne par ordonnance imprimée : le patient, la date, l'objet (texte
-- exact). Le praticien ne voit et n'écrit que celles de SES patients ; la
-- clé anonyme n'y accède jamais. Pas de modification : une ordonnance
-- émise ne se réécrit pas, on en refait une (« Refaire »).
--
-- Garde-fous : node qualite/rls-cas.js · node qualite/presc-catalogue-cas.js
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  praticien_id uuid NOT NULL DEFAULT auth.uid(),
  date         date NOT NULL DEFAULT current_date,
  objet        text NOT NULL CHECK (length(objet) BETWEEN 1 AND 5000),
  cree_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prescriptions_patient ON public.prescriptions (patient_id, cree_at DESC);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Table neuve : la permissive ouvre, la restrictive borne (règle de 20260911).
DROP POLICY IF EXISTS r4p_prescriptions_du_praticien ON public.prescriptions;
CREATE POLICY r4p_prescriptions_du_praticien ON public.prescriptions
  FOR ALL TO authenticated
  USING      (public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id));
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.prescriptions;
CREATE POLICY r4p_praticien_ses_lignes ON public.prescriptions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING      (public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id));
-- Une ordonnance émise ne se réécrit pas.
DROP POLICY IF EXISTS r4p_prescriptions_sans_maj ON public.prescriptions;
CREATE POLICY r4p_prescriptions_sans_maj ON public.prescriptions
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false);
-- La clé anonyme : jamais.
DROP POLICY IF EXISTS r4p_lien_jamais ON public.prescriptions;
CREATE POLICY r4p_lien_jamais ON public.prescriptions
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

REVOKE ALL ON public.prescriptions FROM anon;
REVOKE UPDATE ON public.prescriptions FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.prescriptions TO authenticated;

COMMIT;
