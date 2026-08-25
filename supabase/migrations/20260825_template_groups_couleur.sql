-- Couleur d'un groupe de templates (protocole).
--
-- La colonne manquait alors que l'interface propose déjà de choisir une
-- couleur : `_persistGroups` rejoue une fois sans le champ quand PostgREST le
-- refuse (voir le commentaire de js/prog-main.js:5298). Le protocole se crée
-- donc bien, mais SA COULEUR EST PERDUE À CHAQUE ENREGISTREMENT, sans que rien
-- ne le signale — le repli est silencieux par construction.
--
-- Le repli reste en place après cette migration : il couvre le cas d'une base
-- qui n'aurait pas été migrée, et le supprimer ferait échouer la création de
-- protocole au lieu de la dégrader.

alter table template_groups
  add column if not exists couleur text;

comment on column template_groups.couleur is
  'Couleur du protocole, choisie dans la palette du builder. '
  'Reprise par les chips d''agenda pour teinter les phases.';
