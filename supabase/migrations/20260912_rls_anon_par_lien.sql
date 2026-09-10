-- ═══════════════════════════════════════════════════════════════════
-- La clé anonyme n'ouvre plus que le patient désigné par le lien.
--
-- ⚠ NON APPLIQUÉE — et À N'APPLIQUER QU'APRÈS le déploiement de la version
--    d'athlete.html qui envoie les en-têtes `x-r4p-patient` / `x-r4p-prog`.
--    Appliquée avant, l'espace athlète est VIDE pour tout le monde.
--    Ordre :
--      1. déployer athlete.html et js/prog-main.js (la base ignore ces
--         en-têtes tant que cette migration n'est pas passée : sans risque) ;
--      2. ouvrir un lien athlète, vérifier dans l'onglet Réseau que
--         `x-r4p-patient` part bien sur les appels /rest/v1/ ;
--      3. appliquer 20260911_rls_praticien_ses_lignes (appliquée le 2026-09-10)
--         (le mode kiné en dépend pour les notes cliniques), puis celle-ci ;
--      4. node qualite/rls-cas.js --live, puis rouvrir un lien athlète.
--    Réversible : DROP POLICY, liste en fin de fichier.
--
-- CE QUI A ÉTÉ MESURÉ (2026-09-10, comptages seuls, clé publique seule,
-- sans aucun filtre) :
--     seances_planifiees 975   programmes 868   strava_activities 395
--     clinical_notes     275   athlete_feedback 110   protocol_criteria_checks 39
--     templates 25   patient_settings 15   patient_protocols 10
--     template_groups 4   patient_messages 2   athlete_objectifs 2
--   La clé est publique : elle est écrite en clair dans athlete.html.
--
-- LE MÉCANISME :
--   PostgREST expose les en-têtes de chaque requête à Postgres
--   (`request.headers`). athlete.html envoie l'identifiant du patient ou du
--   programme que son lien désigne ; une politique RESTRICTIVE pour `anon`
--   compare chaque ligne à cet en-tête. Lister une table sans en-tête ne
--   rend plus rien ; avec l'en-tête d'un patient, ne rend que lui.
--   RESTRICTIVE pour la même raison que 20260911 : les politiques en place
--   ne sont pas dans le dépôt, et celle-ci doit borner quelles qu'elles
--   soient.
--
-- CE QUE ÇA VAUT, honnêtement :
--   L'uuid du patient devient le SECRET du lien. 122 bits aléatoires : il
--   ne se devine pas, et le lien n'a pas changé — aucun lien déjà envoyé,
--   aucune app installée n'est à refaire. Mais il n'est PAS RÉVOCABLE : un
--   lien transféré ouvre le patient pour toujours, et l'uuid circule dans
--   les URL (historique, journaux). La vraie correction est un jeton par
--   patient — voir « Vers le jeton » plus bas : elle ne changera que les
--   deux fonctions r4p_lien_*(), pas une seule politique.
--
-- DÉCISIONS :
--   · Notes cliniques : JAMAIS par un lien. Le mode kiné d'athlete.html les
--     lit sous la session du praticien (même origine), bornée par 20260911.
--   · Écritures anonymes : seulement ce que l'athlète écrit réellement —
--     ses retours (athlete_feedback, insertion et mise à jour) et ses
--     échéances (athlete_objectifs). Tout le reste lui est fermé : si une
--     politique en place ouvrait l'écriture à `public`, n'importe qui
--     pouvait jusqu'ici modifier ou supprimer le programme d'un patient.
--   · Templates : `anon` ne lit que (a) la méta de protocoles du praticien
--     du patient — protocole actif dans l'espace athlète — et (b) la
--     configuration CR globale, qu'outils.html lit sans jeton. Aucune
--     donnée patient là-dedans.
--
-- CE QUI RESTE HORS DE CETTE MIGRATION :
--   · les Edge Functions appelées depuis l'espace athlète
--     (save-push-subscription) prennent un patient_id sans le vérifier :
--     elles tournent sous la clé de service, la RLS ne les voit pas ;
--   · exercices_library reste lisible par tous : c'est un catalogue,
--     voulu public.
--
-- VERS LE JETON (la correction de fond) :
--   Une table `patient_liens(jeton, patient_id, praticien_id, cree_at,
--   revoque_at)`, un en-tête `x-r4p-jeton`, et r4p_lien_patient() qui résout
--   le jeton au lieu de lire l'uuid. Les politiques ci-dessous ne bougent
--   pas. Le prix : générer le jeton au partage (shareCalLink, lien
--   programme), et RENVOYER un lien à chaque patient actif — les liens et
--   les apps installées d'aujourd'hui cesseraient de fonctionner.
--
-- Garde-fou : node qualite/rls-cas.js
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── Ce que désigne le lien ────────────────────────────────────────
-- Valeur mal formée = NULL, jamais une erreur : un cast raté ferait
-- échouer la requête entière au lieu de ne rien rendre. PostgREST met les
-- noms d'en-tête en minuscules.
CREATE OR REPLACE FUNCTION public.r4p_lien_patient()
RETURNS uuid LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE v text;
BEGIN
  v := NULLIF(current_setting('request.headers', true), '')::json ->> 'x-r4p-patient';
  IF v IS NULL OR v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.r4p_lien_prog()
RETURNS uuid LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE v text;
BEGIN
  v := NULLIF(current_setting('request.headers', true), '')::json ->> 'x-r4p-prog';
  IF v IS NULL OR v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
END;
$$;

-- Le praticien du patient du lien. SECURITY DEFINER : `anon` ne lit pas
-- `patients`, et ne doit pas se mettre à la lire.
CREATE OR REPLACE FUNCTION public.r4p_lien_praticien()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.praticien_id FROM public.patients p
   WHERE p.id = public.r4p_lien_patient();
$$;

GRANT EXECUTE ON FUNCTION public.r4p_lien_patient()   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.r4p_lien_prog()      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.r4p_lien_praticien() TO anon, authenticated;

-- ── Lecture bornée au lien, aucune écriture ───────────────────────
-- Un programme est ouvert par son patient, par son propre lien
-- (?prog=), ou parce qu'une séance du patient le planifie.
DROP POLICY IF EXISTS r4p_lien_lecture ON public.programmes;
CREATE POLICY r4p_lien_lecture ON public.programmes
  AS RESTRICTIVE FOR SELECT TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient())
         OR id = (SELECT public.r4p_lien_prog())
         OR EXISTS (SELECT 1 FROM public.seances_planifiees s
                    WHERE s.programme_id = programmes.id
                      AND s.patient_id = (SELECT public.r4p_lien_patient())));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.programmes;
CREATE POLICY r4p_lien_sans_ajout ON public.programmes
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.programmes;
CREATE POLICY r4p_lien_sans_maj ON public.programmes
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.programmes;
CREATE POLICY r4p_lien_sans_suppr ON public.programmes
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

-- Ne renvoie jamais vers `programmes` : les deux politiques se liraient
-- l'une l'autre sans fin.
DROP POLICY IF EXISTS r4p_lien_lecture ON public.seances_planifiees;
CREATE POLICY r4p_lien_lecture ON public.seances_planifiees
  AS RESTRICTIVE FOR SELECT TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient())
         OR programme_id = (SELECT public.r4p_lien_prog()));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.seances_planifiees;
CREATE POLICY r4p_lien_sans_ajout ON public.seances_planifiees
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.seances_planifiees;
CREATE POLICY r4p_lien_sans_maj ON public.seances_planifiees
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.seances_planifiees;
CREATE POLICY r4p_lien_sans_suppr ON public.seances_planifiees
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

DROP POLICY IF EXISTS r4p_lien_lecture ON public.patient_settings;
CREATE POLICY r4p_lien_lecture ON public.patient_settings
  AS RESTRICTIVE FOR SELECT TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient()));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.patient_settings;
CREATE POLICY r4p_lien_sans_ajout ON public.patient_settings
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.patient_settings;
CREATE POLICY r4p_lien_sans_maj ON public.patient_settings
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.patient_settings;
CREATE POLICY r4p_lien_sans_suppr ON public.patient_settings
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

DROP POLICY IF EXISTS r4p_lien_lecture ON public.patient_protocols;
CREATE POLICY r4p_lien_lecture ON public.patient_protocols
  AS RESTRICTIVE FOR SELECT TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient()));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.patient_protocols;
CREATE POLICY r4p_lien_sans_ajout ON public.patient_protocols
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.patient_protocols;
CREATE POLICY r4p_lien_sans_maj ON public.patient_protocols
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.patient_protocols;
CREATE POLICY r4p_lien_sans_suppr ON public.patient_protocols
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

DROP POLICY IF EXISTS r4p_lien_lecture ON public.protocol_criteria_checks;
CREATE POLICY r4p_lien_lecture ON public.protocol_criteria_checks
  AS RESTRICTIVE FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.patient_protocols pp
                 WHERE pp.id = protocol_criteria_checks.patient_protocol_id
                   AND pp.patient_id = (SELECT public.r4p_lien_patient())));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.protocol_criteria_checks;
CREATE POLICY r4p_lien_sans_ajout ON public.protocol_criteria_checks
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.protocol_criteria_checks;
CREATE POLICY r4p_lien_sans_maj ON public.protocol_criteria_checks
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.protocol_criteria_checks;
CREATE POLICY r4p_lien_sans_suppr ON public.protocol_criteria_checks
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

DROP POLICY IF EXISTS r4p_lien_lecture ON public.patient_messages;
CREATE POLICY r4p_lien_lecture ON public.patient_messages
  AS RESTRICTIVE FOR SELECT TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient()));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.patient_messages;
CREATE POLICY r4p_lien_sans_ajout ON public.patient_messages
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.patient_messages;
CREATE POLICY r4p_lien_sans_maj ON public.patient_messages
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.patient_messages;
CREATE POLICY r4p_lien_sans_suppr ON public.patient_messages
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

DROP POLICY IF EXISTS r4p_lien_lecture ON public.strava_activities;
CREATE POLICY r4p_lien_lecture ON public.strava_activities
  AS RESTRICTIVE FOR SELECT TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient()));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.strava_activities;
CREATE POLICY r4p_lien_sans_ajout ON public.strava_activities
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.strava_activities;
CREATE POLICY r4p_lien_sans_maj ON public.strava_activities
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.strava_activities;
CREATE POLICY r4p_lien_sans_suppr ON public.strava_activities
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

DROP POLICY IF EXISTS r4p_lien_lecture ON public.templates;
CREATE POLICY r4p_lien_lecture ON public.templates
  AS RESTRICTIVE FOR SELECT TO anon
  USING ((nom = '__r4p_protocols_meta__'
          AND praticien_id = (SELECT public.r4p_lien_praticien()))
         OR (nom = '__cr_config__' AND is_public));
DROP POLICY IF EXISTS r4p_lien_sans_ajout ON public.templates;
CREATE POLICY r4p_lien_sans_ajout ON public.templates
  AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS r4p_lien_sans_maj ON public.templates;
CREATE POLICY r4p_lien_sans_maj ON public.templates
  AS RESTRICTIVE FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.templates;
CREATE POLICY r4p_lien_sans_suppr ON public.templates
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

-- ── Ce que l'athlète écrit ────────────────────────────────────────
-- Ses retours de séance : lus, insérés et mis à jour (upsert) pour une
-- séance de SON patient ou de SON programme. Jamais supprimés.
DROP POLICY IF EXISTS r4p_lien_ses_retours ON public.athlete_feedback;
CREATE POLICY r4p_lien_ses_retours ON public.athlete_feedback
  AS RESTRICTIVE FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM public.seances_planifiees s
                 WHERE s.id = athlete_feedback.seance_id
                   AND (s.patient_id = (SELECT public.r4p_lien_patient())
                        OR s.programme_id = (SELECT public.r4p_lien_prog()))));
DROP POLICY IF EXISTS r4p_lien_sans_suppr ON public.athlete_feedback;
CREATE POLICY r4p_lien_sans_suppr ON public.athlete_feedback
  AS RESTRICTIVE FOR DELETE TO anon USING (false);

-- Ses échéances : les politiques permissives de 20260829 gardent la règle
-- de `repris_at` ; celle-ci ajoute « et seulement les siennes ».
DROP POLICY IF EXISTS r4p_lien_ses_echeances ON public.athlete_objectifs;
CREATE POLICY r4p_lien_ses_echeances ON public.athlete_objectifs
  AS RESTRICTIVE FOR ALL TO anon
  USING (patient_id = (SELECT public.r4p_lien_patient()));

-- ── Jamais par un lien ────────────────────────────────────────────
DROP POLICY IF EXISTS r4p_lien_jamais ON public.clinical_notes;
CREATE POLICY r4p_lien_jamais ON public.clinical_notes
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS r4p_lien_jamais ON public.template_groups;
CREATE POLICY r4p_lien_jamais ON public.template_groups
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- APRÈS — vérifier :
--   node qualite/rls-cas.js --live
--   R4P_PATIENT=<uuid d'un patient de démo> node qualite/rls-cas.js --live
--
-- ANNULER — rend exactement l'état d'avant :
--   DO $$ DECLARE r record; BEGIN
--     FOR r IN SELECT tablename, policyname FROM pg_policies
--               WHERE schemaname = 'public' AND policyname LIKE 'r4p\_lien\_%'
--     LOOP EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
--     END LOOP; END $$;
-- ═══════════════════════════════════════════════════════════════════
