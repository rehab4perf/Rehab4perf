-- ═══════════════════════════════════════════════════════════════════
-- Latarjet — purge des validations de l'ancienne version du protocole.
--
-- Le protocole passe d'un découpage par semaines (phases p1–p5) à un
-- découpage piloté par critères (phases f1–f5, Bradley 2021).
--
-- Les validations sont stockées par (phase_id, criteria_index) : un index
-- de position, pas le texte du critère. Les nouveaux identifiants de phase
-- suffisent donc déjà à rendre les anciennes coches invisibles — aucun
-- critère ne peut apparaître validé à tort, même sans exécuter ce script.
-- Celui-ci ne fait que supprimer les lignes devenues orphelines et
-- repositionner les patients en cours sur la première phase du nouveau
-- protocole.
--
-- Idempotent : relançable sans effet de bord.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Supprimer les validations rattachées aux anciennes phases p1–p5
DELETE FROM protocol_criteria_checks
WHERE phase_id IN ('p1','p2','p3','p4','p5')
  AND patient_protocol_id IN (
    SELECT id FROM patient_protocols WHERE protocol_id = 'latarjet'
  );

-- 2. Repositionner les protocoles en cours dont la phase courante
--    référence encore un ancien identifiant
UPDATE patient_protocols
SET current_phase_id  = 'f1',
    phase_started_at  = COALESCE(phase_started_at, now()),
    updated_at        = now()
WHERE protocol_id = 'latarjet'
  AND current_phase_id IN ('p1','p2','p3','p4','p5');

-- 3. Contrôle — doit renvoyer 0 ligne
SELECT c.phase_id, count(*) AS lignes_restantes
FROM protocol_criteria_checks c
JOIN patient_protocols pp ON pp.id = c.patient_protocol_id
WHERE pp.protocol_id = 'latarjet'
  AND c.phase_id IN ('p1','p2','p3','p4','p5')
GROUP BY c.phase_id;
