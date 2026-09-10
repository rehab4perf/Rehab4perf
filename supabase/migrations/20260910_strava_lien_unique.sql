-- ═══════════════════════════════════════════════════════════════════
-- Un compte Strava = un seul lien.
--
-- Le callback OAuth rangeait le jeton avec `onConflict: 'patient_id'` : rien
-- n'empêchait le même `strava_athlete_id` d'être relié à deux fiches. Le
-- webhook cherche le patient par compte Strava ; avec deux lignes, il tombait
-- en erreur à chaque événement et toutes les activités du compte étaient
-- perdues, pour les deux fiches.
--
-- Le callback applique désormais la règle (même praticien : la dernière fiche
-- l'emporte ; autre praticien : refus). Cet index en est le filet : il ferme
-- aussi la course entre deux connexions simultanées.
--
-- La migration S'ARRÊTE si des doublons existent déjà, en les nommant : les
-- résoudre est une décision clinique (quelle fiche garde le lien), pas un
-- effet de bord d'une migration.
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  doublons text;
BEGIN
  SELECT string_agg(strava_athlete_id::text || ' (' || n || ' fiches)', ', ')
    INTO doublons
    FROM (SELECT strava_athlete_id, count(*) AS n
            FROM strava_tokens
           WHERE strava_athlete_id IS NOT NULL
           GROUP BY strava_athlete_id
          HAVING count(*) > 1) d;
  IF doublons IS NOT NULL THEN
    RAISE EXCEPTION 'strava_tokens : comptes Strava relies a plusieurs fiches — %. Resoudre avant de poser l''index.', doublons;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS strava_tokens_strava_athlete_id_uniq
  ON strava_tokens (strava_athlete_id);

-- ── Résolution des doublons, SI la migration s'est arrêtée ─────────────
-- À n'exécuter qu'après avoir lu les doublons, et seulement s'ils sont chez
-- le même praticien : garde, pour chaque compte, le lien le plus récent
-- (la règle du callback et du webhook).
--
-- DELETE FROM strava_tokens t
--  USING strava_tokens plus_recent
--  WHERE plus_recent.strava_athlete_id = t.strava_athlete_id
--    AND plus_recent.id <> t.id
--    AND (coalesce(plus_recent.updated_at, '-infinity'), plus_recent.id)
--      > (coalesce(t.updated_at, '-infinity'), t.id);
