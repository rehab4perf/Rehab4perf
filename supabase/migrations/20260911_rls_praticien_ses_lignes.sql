-- ═══════════════════════════════════════════════════════════════════
-- Cloisonnement entre praticiens — un praticien connecté ne lit et
-- n'écrit que SES lignes.
--
-- ✓ APPLIQUÉE le 2026-09-10, à la main dans la console SQL (écrite sous le
--    nom 20260910_…, renommée : ce numéro était déjà pris par
--    20260910_strava_lien_unique). Vérifiée : le compte de démo ne voit plus
--    que ses patients, le compte réel s'affiche normalement. Sans effet sur
--    l'espace athlète : le rôle `anon` n'est pas touché.
--
-- CE QUI A ÉTÉ MESURÉ (2026-09-10, comptages seuls, aucune ligne lue),
-- depuis un compte praticien de démo tout neuf, 5 patients fictifs :
--     programmes          868 visibles, 3 à lui
--     patient_settings     15 visibles, 0 à lui
--     patient_protocols    10 visibles, 0 à lui
--     protocol_criteria_checks 39 visibles
--     patient_messages      2 visibles, 0 à lui
--     templates            25 visibles, 1 à lui
--   `patients` et `bilans` étaient, eux, correctement isolés.
--
-- POURQUOI DES POLITIQUES « RESTRICTIVE » :
--   Les politiques en place ne sont pas dans le dépôt, et l'on ne sait pas
--   laquelle ouvre la lecture. Des politiques permissives se combinent en
--   OU : en ajouter une bien écrite ne ferme RIEN tant qu'une large reste.
--   Une politique RESTRICTIVE se combine en ET avec toutes les autres :
--   elle borne `authenticated` quelles que soient celles déjà en base, sans
--   avoir à les connaître ni à les supprimer. Réversible d'un DROP POLICY
--   (en fin de fichier).
--
-- CE QUE CETTE MIGRATION NE FERME PAS — et c'est l'essentiel :
--   la clé anonyme. Elle est publique (écrite dans athlete.html) et voit
--   aujourd'hui les mêmes 868 programmes, plus 275 notes cliniques, 975
--   séances, 395 activités Strava et 110 retours d'athlète. N'importe qui —
--   un praticien compris, en retirant son jeton de la requête — peut donc
--   toujours tout lister. C'est l'objet de 20260912_rls_anon_par_lien.
--   Celle-ci corrige ce que l'application connectée voit et écrit ; c'est
--   le préalable, pas la correction.
--
-- TYPES — vérifiés en base (erreur de format sur un filtre, aucune ligne
-- lue), pas supposés : tout est en uuid, SAUF clinical_notes.praticien_id
-- et clinical_notes.patient_id, qui sont en TEXT. Les comparer directement
-- à auth.uid() ferait échouer la migration entière.
--
-- Garde-fou : node qualite/rls-cas.js
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Rattachement d'un patient au praticien connecté. SECURITY DEFINER : la
-- réponse ne dépend pas des politiques de `patients`, et ne dit rien
-- d'autre qu'un booléen sur le praticien connecté lui-même.
CREATE OR REPLACE FUNCTION public.r4p_patient_du_praticien(p_patient uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.patients p
                 WHERE p.id = p_patient
                   AND p.praticien_id = (SELECT auth.uid()));
$$;

-- L'admin publie et dépublie la bibliothèque (_togglePublic, prog-data.js),
-- y compris des lignes publiques d'un autre compte.
CREATE OR REPLACE FUNCTION public.r4p_est_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.praticien_roles r
                 WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.r4p_patient_du_praticien(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.r4p_est_admin() TO authenticated;

-- ── Tables à patient ET praticien ─────────────────────────────────
-- Lire : ce que j'ai écrit, ou ce qui concerne un de mes patients.
-- Écrire : sur un de mes patients — ou, sans patient, en mon nom.
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.programmes;
CREATE POLICY r4p_praticien_ses_lignes ON public.programmes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING      (praticien_id = (SELECT auth.uid())
              OR public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id)
              OR (patient_id IS NULL AND praticien_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.seances_planifiees;
CREATE POLICY r4p_praticien_ses_lignes ON public.seances_planifiees
  AS RESTRICTIVE FOR ALL TO authenticated
  USING      (praticien_id = (SELECT auth.uid())
              OR public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id)
              OR (patient_id IS NULL AND praticien_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.patient_protocols;
CREATE POLICY r4p_praticien_ses_lignes ON public.patient_protocols
  AS RESTRICTIVE FOR ALL TO authenticated
  USING      (praticien_id = (SELECT auth.uid())
              OR public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id)
              OR (patient_id IS NULL AND praticien_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.patient_messages;
CREATE POLICY r4p_praticien_ses_lignes ON public.patient_messages
  AS RESTRICTIVE FOR ALL TO authenticated
  USING      (praticien_id = (SELECT auth.uid())
              OR public.r4p_patient_du_praticien(patient_id))
  WITH CHECK (public.r4p_patient_du_praticien(patient_id)
              OR (patient_id IS NULL AND praticien_id = (SELECT auth.uid())));

-- Colonnes en TEXT ici : la comparaison se fait en texte, jamais par un
-- cast vers uuid qui lèverait sur une valeur mal formée.
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.clinical_notes;
CREATE POLICY r4p_praticien_ses_lignes ON public.clinical_notes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING      (praticien_id = (SELECT auth.uid())::text
              OR EXISTS (SELECT 1 FROM public.patients p
                         WHERE p.id::text = clinical_notes.patient_id
                           AND p.praticien_id = (SELECT auth.uid())))
  WITH CHECK (praticien_id = (SELECT auth.uid())::text
              AND (patient_id IS NULL
                   OR EXISTS (SELECT 1 FROM public.patients p
                              WHERE p.id::text = clinical_notes.patient_id
                                AND p.praticien_id = (SELECT auth.uid()))));

-- ── Tables à patient seul ─────────────────────────────────────────
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.patient_settings;
CREATE POLICY r4p_praticien_ses_lignes ON public.patient_settings
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.r4p_patient_du_praticien(patient_id));

-- Écrite par les Edge Functions sous la clé de service, qui ignore la RLS.
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.strava_activities;
CREATE POLICY r4p_praticien_ses_lignes ON public.strava_activities
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.r4p_patient_du_praticien(patient_id));

-- Déjà bornée par sa politique permissive (20260829) ; posée ici aussi pour
-- que la règle soit la même partout, et qu'une politique large ajoutée plus
-- tard ne puisse pas la rouvrir.
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.athlete_objectifs;
CREATE POLICY r4p_praticien_ses_lignes ON public.athlete_objectifs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.r4p_patient_du_praticien(patient_id));

-- ── Tables rattachées par jointure ────────────────────────────────
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.protocol_criteria_checks;
CREATE POLICY r4p_praticien_ses_lignes ON public.protocol_criteria_checks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patient_protocols pp
                 WHERE pp.id = protocol_criteria_checks.patient_protocol_id
                   AND (pp.praticien_id = (SELECT auth.uid())
                        OR public.r4p_patient_du_praticien(pp.patient_id))));

-- Mesuré : `authenticated` n'en voyait déjà rien d'autrui. Posée pour la
-- même raison qu'athlete_objectifs.
DROP POLICY IF EXISTS r4p_praticien_ses_lignes ON public.athlete_feedback;
CREATE POLICY r4p_praticien_ses_lignes ON public.athlete_feedback
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seances_planifiees s
                 WHERE s.id = athlete_feedback.seance_id
                   AND (s.praticien_id = (SELECT auth.uid())
                        OR public.r4p_patient_du_praticien(s.patient_id))));

-- ── Bibliothèque ──────────────────────────────────────────────────
-- Lire : les siennes, et les lignes publiques — sauf les méta PERSONNELLES
-- d'un autre compte (favoris, définitions de protocoles), écrites avec
-- `is_public: true` et que personne d'autre ne lit. La configuration CR
-- globale (`__cr_config__`) reste lisible : outils.html la lit pour tous.
-- Écrire : les siennes ; l'admin, en plus, la bibliothèque publique.
DROP POLICY IF EXISTS r4p_praticien_lecture ON public.templates;
CREATE POLICY r4p_praticien_lecture ON public.templates
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (praticien_id = (SELECT auth.uid())
         OR (is_public
             AND COALESCE(nom, '') NOT IN ('__r4p_favs_meta__', '__r4p_protocols_meta__')));

DROP POLICY IF EXISTS r4p_praticien_ajout ON public.templates;
CREATE POLICY r4p_praticien_ajout ON public.templates
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (praticien_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS r4p_praticien_maj ON public.templates;
CREATE POLICY r4p_praticien_maj ON public.templates
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING      (praticien_id = (SELECT auth.uid()) OR public.r4p_est_admin())
  WITH CHECK (praticien_id = (SELECT auth.uid()) OR public.r4p_est_admin());

DROP POLICY IF EXISTS r4p_praticien_suppr ON public.templates;
CREATE POLICY r4p_praticien_suppr ON public.templates
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (praticien_id = (SELECT auth.uid()) OR public.r4p_est_admin());

DROP POLICY IF EXISTS r4p_praticien_lecture ON public.template_groups;
CREATE POLICY r4p_praticien_lecture ON public.template_groups
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (praticien_id = (SELECT auth.uid()) OR is_public);

DROP POLICY IF EXISTS r4p_praticien_ajout ON public.template_groups;
CREATE POLICY r4p_praticien_ajout ON public.template_groups
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (praticien_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS r4p_praticien_maj ON public.template_groups;
CREATE POLICY r4p_praticien_maj ON public.template_groups
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING      (praticien_id = (SELECT auth.uid()) OR public.r4p_est_admin())
  WITH CHECK (praticien_id = (SELECT auth.uid()) OR public.r4p_est_admin());

DROP POLICY IF EXISTS r4p_praticien_suppr ON public.template_groups;
CREATE POLICY r4p_praticien_suppr ON public.template_groups
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (praticien_id = (SELECT auth.uid()) OR public.r4p_est_admin());

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- AVANT d'appliquer — relever l'état réel (lecture seule) :
--
--   SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
--     FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN ('programmes','seances_planifiees','patient_settings',
--        'patient_protocols','protocol_criteria_checks','patient_messages',
--        'clinical_notes','strava_activities','athlete_feedback',
--        'athlete_objectifs','templates','template_groups')
--    ORDER BY tablename, policyname;
--
-- APRÈS — vérifier depuis le compte de démo :
--   R4P_JWT=<access_token> node qualite/rls-cas.js --live
--   (chaque table : « N visibles = N à lui »)
--
-- ANNULER — rend exactement l'état d'avant, rien d'autre n'a été modifié :
--   DROP POLICY r4p_praticien_ses_lignes ON public.programmes;
--   DROP POLICY r4p_praticien_ses_lignes ON public.seances_planifiees;
--   DROP POLICY r4p_praticien_ses_lignes ON public.patient_protocols;
--   DROP POLICY r4p_praticien_ses_lignes ON public.patient_messages;
--   DROP POLICY r4p_praticien_ses_lignes ON public.clinical_notes;
--   DROP POLICY r4p_praticien_ses_lignes ON public.patient_settings;
--   DROP POLICY r4p_praticien_ses_lignes ON public.strava_activities;
--   DROP POLICY r4p_praticien_ses_lignes ON public.athlete_objectifs;
--   DROP POLICY r4p_praticien_ses_lignes ON public.protocol_criteria_checks;
--   DROP POLICY r4p_praticien_ses_lignes ON public.athlete_feedback;
--   DROP POLICY r4p_praticien_lecture ON public.templates;
--   DROP POLICY r4p_praticien_ajout   ON public.templates;
--   DROP POLICY r4p_praticien_maj     ON public.templates;
--   DROP POLICY r4p_praticien_suppr   ON public.templates;
--   DROP POLICY r4p_praticien_lecture ON public.template_groups;
--   DROP POLICY r4p_praticien_ajout   ON public.template_groups;
--   DROP POLICY r4p_praticien_maj     ON public.template_groups;
--   DROP POLICY r4p_praticien_suppr   ON public.template_groups;
-- ═══════════════════════════════════════════════════════════════════
