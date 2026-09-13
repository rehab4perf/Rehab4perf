-- ═══════════════════════════════════════════════════════════════════
-- Un jeton par patient : le lien athlète devient RÉVOCABLE.
--
-- ⚠ NON APPLIQUÉE — à appliquer par le praticien, dans la console SQL.
--    L'ordre est indifférent : tant que cette table n'existe pas, le partage
--    retombe sur l'ancien lien (?patient=<uuid>), et athlete.html sait déjà
--    lire le nouveau (?j=<jeton>). Après application :
--      1. node qualite/rls-cas.js --live ;
--      2. « Partager » le calendrier du patient de démo, ouvrir le lien copié
--         (il commence par athlete.html?j=) : calendrier complet ;
--      3. rouvrir l'ANCIEN lien du même patient (?patient=…) : il doit dire
--         « Lien remplacé ». Celui d'un autre patient marche toujours.
--    Réversible : voir la fin du fichier.
--
-- AVANT (20260912) : l'uuid du patient était le secret du lien. Impossible à
-- deviner, mais un lien transféré ouvrait le patient POUR TOUJOURS, et
-- l'uuid circule dans les URL (historique, journaux, applis installées).
--
-- APRÈS :
--   · patient_liens porte un jeton aléatoire (24 octets en base64url, soit
--     192 bits) par patient, un seul actif à la fois ;
--   · r4p_lien_patient() résout l'en-tête x-r4p-jeton. Un jeton révoqué ou
--     inconnu n'ouvre RIEN — jamais de repli sur l'uuid, sinon révoquer ne
--     servirait à rien ;
--   · BASCULE PATIENT PAR PATIENT (décision du praticien, 2026-09-13) :
--     l'ancien lien (?patient=, ?prog=) marche tant qu'aucun jeton n'a été
--     émis pour ce patient, et meurt dès le premier. Rien ne casse d'un
--     coup : le praticien migre au fil de ses partages ;
--   · AUCUNE politique de 20260912 ne change : toutes comparent à
--     r4p_lien_patient() / r4p_lien_prog(), dont seul le corps change.
--
-- Hors de cette migration : save-push-subscription (Edge Function, clé de
-- service) accepte toujours un patient_id sans le vérifier.
--
-- Garde-fous : node qualite/rls-cas.js · node qualite/lien-jeton-cas.js
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.patient_liens (
  jeton        text PRIMARY KEY CHECK (jeton ~ '^[A-Za-z0-9_-]{32,64}$'),
  patient_id   uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  praticien_id uuid NOT NULL DEFAULT auth.uid(),
  cree_at      timestamptz NOT NULL DEFAULT now(),
  revoque_at   timestamptz
);
-- Un seul lien actif par patient : régénérer, c'est révoquer PUIS créer.
CREATE UNIQUE INDEX IF NOT EXISTS patient_liens_un_actif
  ON public.patient_liens (patient_id) WHERE revoque_at IS NULL;

ALTER TABLE public.patient_liens ENABLE ROW LEVEL SECURITY;

-- ── Le praticien : les liens de SES patients ──────────────────────
-- Table neuve, aucune politique en place : la permissive ouvre, la
-- restrictive borne — la même règle que 20260911.
DROP POLICY IF EXISTS r4p_liens_du_praticien ON public.patient_liens;
CREATE POLICY r4p_liens_du_praticien ON public.patient_liens
  FOR ALL TO authenticated
  USING      (public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id));
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.patient_liens;
CREATE POLICY r4p_praticien_ses_lignes ON public.patient_liens
  AS RESTRICTIVE FOR ALL TO authenticated
  USING      (public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id));
-- Jamais supprimé : effacer les jetons d'un patient ferait REVIVRE son uuid.
DROP POLICY IF EXISTS r4p_liens_sans_suppr ON public.patient_liens;
CREATE POLICY r4p_liens_sans_suppr ON public.patient_liens
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
-- Une seule modification : révoquer un lien actif, sans retour en arrière.
DROP POLICY IF EXISTS r4p_liens_revoquer ON public.patient_liens;
CREATE POLICY r4p_liens_revoquer ON public.patient_liens
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (revoque_at IS NULL) WITH CHECK (revoque_at IS NOT NULL);
-- La clé anonyme : jamais. Les fonctions de lien la lisent pour elle.
DROP POLICY IF EXISTS r4p_lien_jamais ON public.patient_liens;
CREATE POLICY r4p_lien_jamais ON public.patient_liens
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

REVOKE ALL ON public.patient_liens FROM anon;
REVOKE UPDATE ON public.patient_liens FROM authenticated;
GRANT SELECT, INSERT ON public.patient_liens TO authenticated;
GRANT UPDATE (revoque_at) ON public.patient_liens TO authenticated;

-- ── Ce que désigne le lien ────────────────────────────────────────
-- SECURITY DEFINER : `anon` ne lit pas patient_liens, et ne doit pas se
-- mettre à la lire. Valeur mal formée = NULL, jamais une erreur.
CREATE OR REPLACE FUNCTION public.r4p_lien_patient()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE h json; j text; v text; p uuid;
BEGIN
  h := NULLIF(current_setting('request.headers', true), '')::json;
  IF h IS NULL THEN RETURN NULL; END IF;
  -- Le jeton d'abord. Révoqué ou inconnu : rien — pas de repli sur l'uuid.
  j := h ->> 'x-r4p-jeton';
  IF j IS NOT NULL THEN
    IF j !~ '^[A-Za-z0-9_-]{32,64}$' THEN RETURN NULL; END IF;
    SELECT l.patient_id INTO p FROM public.patient_liens l
     WHERE l.jeton = j AND l.revoque_at IS NULL;
    RETURN p;
  END IF;
  -- L'ancien lien : valable tant qu'aucun jeton n'a été émis pour ce patient.
  v := h ->> 'x-r4p-patient';
  IF v IS NULL OR v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.patient_liens l WHERE l.patient_id = v::uuid) THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
END;
$$;

-- L'ancien lien d'un programme suit son patient : mort dès le premier jeton.
-- Le nouveau (?j=…&prog=…) passe par le jeton, donc par r4p_lien_patient().
CREATE OR REPLACE FUNCTION public.r4p_lien_prog()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v text;
BEGIN
  v := NULLIF(current_setting('request.headers', true), '')::json ->> 'x-r4p-prog';
  IF v IS NULL OR v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.programmes pr
               JOIN public.patient_liens l ON l.patient_id = pr.patient_id
              WHERE pr.id = v::uuid) THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.r4p_lien_patient() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.r4p_lien_prog()    TO anon, authenticated;

COMMIT;

-- ── Retour arrière ────────────────────────────────────────────────
--   Réexécuter les deux CREATE OR REPLACE FUNCTION de
--   20260912_rls_anon_par_lien.sql (les anciens liens remarchent tous), puis :
--   DROP TABLE public.patient_liens;
