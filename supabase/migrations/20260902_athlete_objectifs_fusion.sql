-- ═══════════════════════════════════════════════════════════════════
-- Fusion d'échéances : garder les DEUX libellés
--
-- ⚠ À APPLIQUER. Sans elle, la fusion refuse de s'écrire et le dit —
--    l'application continue de fonctionner, les deux échéances restent
--    simplement affichées séparément.
--
-- POURQUOI UNE COLONNE, et pas une réécriture du texte :
--   La première version de la fusion écrasait `texte` avec le libellé du
--   praticien. Le mot de l'athlète était alors PERDU : on ne pouvait plus
--   ni défusionner, ni choisir lequel des deux afficher — les deux gestes
--   que le praticien demande. Une fusion qui détruit une des deux valeurs
--   qu'elle relie n'est pas une fusion, c'est un remplacement.
--
--   `fusion` garde le lien et la préférence d'affichage à côté du texte,
--   sans jamais y toucher :
--     { "avec": "<libellé du praticien>", "affiche": "praticien"|"athlete" }
--
--   `avec` recopie le libellé du praticien parce que celui-ci vit dans le
--   JSON `f-objectifs` d'un bilan, où il n'a pas d'identifiant stable : on
--   ne peut pas le désigner autrement que par son texte et sa date.
--
-- DÉFUSIONNER = remettre `fusion` à NULL. Les deux échéances reparaissent
--   telles qu'elles ont été saisies, aucune n'ayant été modifiée.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE athlete_objectifs
  ADD COLUMN IF NOT EXISTS fusion jsonb;

COMMENT ON COLUMN athlete_objectifs.fusion IS
  'Fusion avec un objectif du bilan : {"avec":"<libellé praticien>","affiche":"praticien"|"athlete"}. NULL = pas de fusion.';

-- Le praticien écrit déjà cette ligne (politique de mise à jour posée par
-- 20260829) : aucune politique nouvelle n'est nécessaire.
--
-- L'ATHLÈTE, lui, ne doit pas pouvoir se déclarer fusionné — ce serait
-- s'auto-valider, exactement comme `repris_at`. La politique existante le
-- bloque déjà : elle refuse toute écriture sur une ligne dont `repris_at`
-- n'est pas nul, et une fusion suppose la prise en compte.
