-- ═══════════════════════════════════════════════════════════════════
-- Newsletter « Le Vestiaire » — l'athlète donne son e-mail.
--
-- ⚠ NON APPLIQUÉE. À exécuter après 20260913_newsletter_vestiaire.sql,
--    à la console SQL. Rien ne casse avant : le champ de l'espace athlète
--    échouerait à l'enregistrement, le reste du bloc fonctionne.
--
-- POURQUOI : la tâche du dimanche prépare désormais un BROUILLON Gmail
-- adressé à l'athlète — le praticien relit et clique Envoyer, sans
-- transférer à la main. REHAB4PERF ne connaissait l'e-mail d'aucun
-- athlète : il n'existe ni dans `patients`, ni ailleurs.
--
-- DÉCISIONS :
--   · L'adresse vit ici, pas dans `patients` : c'est l'athlète qui la
--     donne, pour la newsletter et pour elle seule — `anon` n'écrit pas
--     `patients` et ne doit pas s'y mettre.
--   · Pas d'accord, pas d'adresse. Le déclencheur efface l'e-mail dès que
--     `consentement` est faux : retirer son accord l'efface, et aucune
--     adresse ne s'enregistre avant l'accord, même par un appel direct.
--   · L'athlète seul l'écrit (droit par colonne) ; le praticien la lit,
--     comme le reste de la ligne.
--
-- Garde-fou : node qualite/newsletter-cas.js
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.athlete_newsletter ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.athlete_newsletter
  DROP CONSTRAINT IF EXISTS athlete_newsletter_email_check;
ALTER TABLE public.athlete_newsletter
  ADD CONSTRAINT athlete_newsletter_email_check
  CHECK (email IS NULL OR (char_length(email) <= 254
         AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));

GRANT UPDATE (email) ON public.athlete_newsletter TO anon;

-- Remplace celui de 20260913 : mêmes règles, plus l'e-mail.
CREATE OR REPLACE FUNCTION public.r4p_newsletter_horodatage()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.consentement   := false;
    NEW.consenti_at    := NULL;
    NEW.email          := NULL;
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
  IF NOT NEW.consentement THEN
    NEW.email := NULL;
  ELSIF NEW.email IS NOT NULL THEN
    NEW.email := btrim(NEW.email);
  END IF;
  IF NEW.consentement IS DISTINCT FROM OLD.consentement
     OR NEW.format IS DISTINCT FROM OLD.format
     OR NEW.sujets IS DISTINCT FROM OLD.sujets
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.athlete_maj_at := now();
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- ANNULER :
--   ALTER TABLE public.athlete_newsletter DROP COLUMN IF EXISTS email;
--   puis réappliquer la fonction r4p_newsletter_horodatage de 20260913.
