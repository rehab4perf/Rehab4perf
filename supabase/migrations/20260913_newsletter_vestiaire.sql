-- ═══════════════════════════════════════════════════════════════════
-- Newsletter « Le Vestiaire » — le praticien active, l'athlète consent.
--
-- ⚠ NON APPLIQUÉE. À exécuter par le praticien, après lecture, via la
--    console SQL ou `supabase db push`. Rien dans l'application ne dépend
--    de ces tables pour fonctionner : tant qu'elles n'existent pas, la carte
--    de la fiche et le bloc de l'espace athlète restent masqués.
--    Ordre :
--      1. appliquer cette migration ;
--      2. inscrire le praticien (voir « APRÈS », en fin de fichier) ;
--      3. déployer la fonction : supabase functions deploy newsletter-export --no-verify-jwt
--      4. node qualite/rls-cas.js && node qualite/newsletter-cas.js
--    Dépend de 20260912 (appliquée le 2026-09-10) pour r4p_lien_patient(),
--    dont sa politique anonyme a besoin, et NE LA REDÉFINIT PAS. Une
--    première version la recréait « à l'identique » : réexécutée après
--    20260914_lien_jeton, elle aurait ramené le lien athlète à l'uuid seul
--    et rouvert les liens que le jeton a fermés. Retiré le 2026-09-15 ;
--    garde-fou : qualite/newsletter-cas.js.
--
-- LE DISPOSITIF :
--   Chaque dimanche, une tâche du praticien rédige un numéro par athlète :
--   une partie commune (récupération, renforcement) et un article dédié à
--   son sport, calé sur ses échéances (`athlete_objectifs`) et son volume
--   Strava. Elle lit ces données par la fonction `newsletter-export`, sous
--   un secret propre au praticien — jamais sous la clé de service.
--
-- DEUX CLÉS, ET CHACUN LA SIENNE :
--   · `active` est au PRATICIEN : c'est lui qui propose la newsletter.
--     Tant qu'elle est éteinte, l'athlète ne voit rien.
--   · `consentement` est à l'ATHLÈTE : sans son accord, il ne reçoit rien,
--     et il peut le retirer à tout moment depuis son espace.
--   La RLS dit QUI touche une ligne ; les droits par COLONNE disent QUOI.
--   Sans eux, la clé anonyme pouvait allumer `active` et le praticien
--   cocher le consentement à la place de l'athlète. Les horodatages sont
--   posés par un déclencheur : ni l'un ni l'autre ne peut antidater un
--   accord.
--
-- POURQUOI UNE TABLE À PART, et pas une colonne de `patients` : même raison
-- qu'`athlete_objectifs` — `anon` ne lit pas `patients` et ne doit pas s'y
-- mettre. Ici, l'athlète ne fait JAMAIS d'INSERT : la ligne naît quand le
-- praticien active, l'athlète ne fait que la mettre à jour. Cela évite au
-- passage l'insertion anonyme sur table neuve, bloquée sans explication le
-- 2026-07-21 (voir save-push-subscription).
--
-- RÉSERVÉ AUX PRATICIENS INSCRITS : REHAB4PERF sert plusieurs cabinets, et
-- la newsletter n'est rédigée que pour ceux qui ont une tâche en place.
-- `newsletter_praticiens` les liste ; elle porte aussi l'empreinte SHA-256
-- du secret d'export — jamais le secret lui-même. Personne ne l'écrit
-- depuis l'application : l'inscription se fait à la console.
--
-- Garde-fous : node qualite/rls-cas.js · node qualite/newsletter-cas.js
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── Praticiens inscrits ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_praticiens (
  praticien_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_sha256  text NOT NULL,
  cree_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_praticiens
  DROP CONSTRAINT IF EXISTS newsletter_praticiens_secret_check;
ALTER TABLE public.newsletter_praticiens
  ADD CONSTRAINT newsletter_praticiens_secret_check
  CHECK (secret_sha256 ~ '^[0-9a-f]{64}$');

ALTER TABLE public.newsletter_praticiens ENABLE ROW LEVEL SECURITY;

-- Le praticien sait s'il est inscrit — il ne lit pas l'empreinte.
REVOKE ALL ON public.newsletter_praticiens FROM anon, authenticated;
GRANT SELECT (praticien_id) ON public.newsletter_praticiens TO authenticated;

DROP POLICY IF EXISTS newsletter_praticiens_soi ON public.newsletter_praticiens;
CREATE POLICY newsletter_praticiens_soi ON public.newsletter_praticiens
  FOR SELECT TO authenticated
  USING (praticien_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.newsletter_praticiens;
CREATE POLICY r4p_praticien_ses_lignes ON public.newsletter_praticiens
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (praticien_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS r4p_lien_jamais ON public.newsletter_praticiens;
CREATE POLICY r4p_lien_jamais ON public.newsletter_praticiens
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- ── Une ligne par athlète proposé ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.athlete_newsletter (
  patient_id      uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  -- Au praticien
  active          boolean NOT NULL DEFAULT false,
  active_maj_at   timestamptz,
  -- À l'athlète
  consentement    boolean NOT NULL DEFAULT false,
  consenti_at     timestamptz,
  format          text,
  sujets          text[] NOT NULL DEFAULT '{}',
  athlete_maj_at  timestamptz,
  cree_at         timestamptz NOT NULL DEFAULT now()
);

-- Un format est une ligne (« triathlon 70.3 »), pas un texte libre de
-- 2 000 signes. Les sujets sont une liste fermée : la tâche les lit.
ALTER TABLE public.athlete_newsletter
  DROP CONSTRAINT IF EXISTS athlete_newsletter_format_check;
ALTER TABLE public.athlete_newsletter
  ADD CONSTRAINT athlete_newsletter_format_check
  CHECK (format IS NULL OR char_length(btrim(format)) BETWEEN 1 AND 80);
ALTER TABLE public.athlete_newsletter
  DROP CONSTRAINT IF EXISTS athlete_newsletter_sujets_check;
ALTER TABLE public.athlete_newsletter
  ADD CONSTRAINT athlete_newsletter_sujets_check
  CHECK (sujets <@ ARRAY['recuperation','renforcement','prevention',
                         'preparation','sommeil','nutrition']::text[]);

ALTER TABLE public.athlete_newsletter ENABLE ROW LEVEL SECURITY;

-- Droits par colonne : chacun n'écrit que SA clé.
REVOKE ALL ON public.athlete_newsletter FROM anon, authenticated;
GRANT SELECT ON public.athlete_newsletter TO anon, authenticated;
GRANT UPDATE (consentement, format, sujets) ON public.athlete_newsletter TO anon;
GRANT INSERT (patient_id, active) ON public.athlete_newsletter TO authenticated;
GRANT UPDATE (active) ON public.athlete_newsletter TO authenticated;

-- Horodatages posés par la base. Un praticien qui crée la ligne ne peut
-- pas y glisser un consentement : il est remis à zéro à l'insertion.
CREATE OR REPLACE FUNCTION public.r4p_newsletter_horodatage()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.consentement   := false;
    NEW.consenti_at    := NULL;
    NEW.athlete_maj_at := NULL;
    NEW.active_maj_at  := now();
    RETURN NEW;
  END IF;
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    NEW.active_maj_at := now();
  END IF;
  IF NEW.consentement IS DISTINCT FROM OLD.consentement THEN
    NEW.consenti_at := CASE WHEN NEW.consentement THEN now() ELSE NULL END;
  END IF;
  IF NEW.consentement IS DISTINCT FROM OLD.consentement
     OR NEW.format IS DISTINCT FROM OLD.format
     OR NEW.sujets IS DISTINCT FROM OLD.sujets THEN
    NEW.athlete_maj_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS athlete_newsletter_horodatage ON public.athlete_newsletter;
CREATE TRIGGER athlete_newsletter_horodatage
  BEFORE INSERT OR UPDATE ON public.athlete_newsletter
  FOR EACH ROW EXECUTE FUNCTION public.r4p_newsletter_horodatage();

-- Permissives : sans elles, les restrictives n'accordent rien.
-- Le praticien lit les lignes de ses patients ; il n'en crée ou n'en
-- modifie que s'il est inscrit à la newsletter.
DROP POLICY IF EXISTS athlete_newsletter_praticien ON public.athlete_newsletter;
CREATE POLICY athlete_newsletter_praticien ON public.athlete_newsletter
  FOR ALL TO authenticated
  USING (public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id)
              AND EXISTS (SELECT 1 FROM public.newsletter_praticiens n
                          WHERE n.praticien_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS athlete_newsletter_lecture_anon ON public.athlete_newsletter;
CREATE POLICY athlete_newsletter_lecture_anon ON public.athlete_newsletter
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS athlete_newsletter_maj_anon ON public.athlete_newsletter;
CREATE POLICY athlete_newsletter_maj_anon ON public.athlete_newsletter
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Restrictives : le praticien, ses patients ; le lien, son patient.
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.athlete_newsletter;
CREATE POLICY r4p_praticien_ses_lignes ON public.athlete_newsletter
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id));
DROP POLICY IF EXISTS r4p_lien_sa_newsletter ON public.athlete_newsletter;
CREATE POLICY r4p_lien_sa_newsletter ON public.athlete_newsletter
  AS RESTRICTIVE FOR ALL TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient()));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.athlete_newsletter;
CREATE POLICY r4p_lien_sans_ajout ON public.athlete_newsletter
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.athlete_newsletter;
CREATE POLICY r4p_lien_sans_suppr ON public.athlete_newsletter
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

COMMENT ON TABLE public.athlete_newsletter IS
  'Newsletter « Le Vestiaire » : active (praticien) + consentement, format, sujets (athlète). '
  'Lue par la fonction newsletter-export, jamais par la clé de service hors de celle-ci.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- APRÈS — inscrire le praticien (une fois, à la console SQL). Le secret
-- reste sur la machine qui rédige la newsletter ; seule son empreinte
-- entre en base :
--   INSERT INTO public.newsletter_praticiens (praticien_id, secret_sha256)
--   SELECT id, '<empreinte sha256 du secret, 64 caractères hexadécimaux>'
--     FROM auth.users WHERE email = '<e-mail du compte praticien>'
--   ON CONFLICT (praticien_id) DO UPDATE SET secret_sha256 = EXCLUDED.secret_sha256;
--
-- ANNULER :
--   DROP TABLE IF EXISTS public.athlete_newsletter;
--   DROP TABLE IF EXISTS public.newsletter_praticiens;
--   DROP FUNCTION IF EXISTS public.r4p_newsletter_horodatage();
-- ═══════════════════════════════════════════════════════════════════
