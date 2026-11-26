-- =====================================================================
-- JCI Présence : schéma à exécuter UNE FOIS dans Supabase → SQL Editor
-- Le schéma "presence" est indépendant des tables de la billetterie
-- (Prisma ne le touche pas). Le script peut être relancé sans danger.
-- =====================================================================

create schema if not exists presence;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists presence.jci_locales (
  id     uuid primary key default gen_random_uuid(),
  nom    text not null unique check (length(nom) between 1 and 120),
  ordre  int  not null default 0,
  actif  boolean not null default true
);

create table if not exists presence.events (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(nom) between 1 and 160),
  date_event  date not null,
  lieu        text not null check (length(lieu) between 1 and 160),
  actif       boolean not null default false,
  ferme_a     timestamptz,                       -- fermeture automatique (facultatif)
  created_at  timestamptz not null default now()
);

create table if not exists presence.attendees (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references presence.events(id) on delete cascade,
  nom            text not null check (length(nom) between 1 and 80),
  prenom         text not null check (length(prenom) between 1 and 80),
  telephone      text not null,                  -- tel. tel que saisi (affichage)
  telephone_cle  text not null,                  -- tel. normalisé (anti-doublon)
  statut         text not null check (statut in ('membre', 'invite')),
  jci_locale_id  uuid references presence.jci_locales(id) on delete set null,
  jci_autre      text check (length(jci_autre) <= 120),
  organisation   text check (length(organisation) <= 120),
  created_at     timestamptz not null default now(),
  constraint attendees_tel_ck check (length(telephone_cle) between 7 and 15),
  constraint attendees_unique_event_tel unique (event_id, telephone_cle)
);
create index if not exists attendees_event_created_idx
  on presence.attendees (event_id, created_at desc);

create table if not exists presence.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------

-- Normalise un numéro : chiffres seulement, sans 00, sans indicatif 229,
-- et ancien format béninois (8 chiffres) = nouveau format (01 + 8 chiffres).
create or replace function presence.normalize_phone(p text)
returns text language plpgsql immutable set search_path = pg_temp as $$
declare v text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if v like '00%' then v := substr(v, 3); end if;
  if v like '229%' and length(v) in (11, 13) then v := substr(v, 4); end if;
  if length(v) = 10 and v like '01%' then v := substr(v, 3); end if;
  return v;
end $$;

create or replace function presence.set_phone_key()
returns trigger language plpgsql set search_path = presence, pg_temp as $$
begin
  new.telephone_cle := presence.normalize_phone(new.telephone);
  return new;
end $$;

drop trigger if exists attendees_phone_key on presence.attendees;
create trigger attendees_phone_key
  before insert or update of telephone on presence.attendees
  for each row execute function presence.set_phone_key();

-- L'utilisateur connecté est-il administrateur de la présence ?
create or replace function presence.is_admin()
returns boolean language sql stable security definer
set search_path = presence, pg_temp as $$
  select exists (select 1 from presence.admins where user_id = (select auth.uid()))
$$;

-- Événements ouverts aux inscriptions (actifs et non fermés), pour la page publique.
create or replace function presence.evenements_ouverts()
returns table (id uuid, nom text, date_event date, lieu text)
language sql stable security definer set search_path = presence, pg_temp as $$
  select e.id, e.nom, e.date_event, e.lieu
  from presence.events e
  where e.actif and (e.ferme_a is null or e.ferme_a > now())
  order by e.date_event, e.nom
$$;

-- Inscription publique. Retourne {"status": "ok" | "duplicate" | "closed" | "busy" | "invalid", "field": ...}
create or replace function presence.register(
  p_event_id      uuid,
  p_nom           text,
  p_prenom        text,
  p_telephone     text,
  p_statut        text,
  p_jci_locale_id uuid default null,
  p_jci_autre     text default null,
  p_organisation  text default null
) returns jsonb
language plpgsql security definer set search_path = presence, pg_temp as $$
declare
  v_ev     presence.events%rowtype;
  v_nom    text := nullif(trim(p_nom), '');
  v_prenom text := nullif(trim(p_prenom), '');
  v_tel    text := nullif(trim(p_telephone), '');
  v_key    text := presence.normalize_phone(p_telephone);
  v_loc    uuid := p_jci_locale_id;
  v_autre  text := nullif(trim(p_jci_autre), '');
  v_org    text := nullif(trim(p_organisation), '');
  v_id     uuid;
begin
  select * into v_ev from presence.events where id = p_event_id;
  if not found or not v_ev.actif or (v_ev.ferme_a is not null and v_ev.ferme_a <= now()) then
    return jsonb_build_object('status', 'closed');
  end if;

  if v_nom is null or length(v_nom) > 80 then
    return jsonb_build_object('status', 'invalid', 'field', 'nom');
  end if;
  if v_prenom is null or length(v_prenom) > 80 then
    return jsonb_build_object('status', 'invalid', 'field', 'prenom');
  end if;
  if v_tel is null or length(v_key) not between 7 and 15 then
    return jsonb_build_object('status', 'invalid', 'field', 'telephone');
  end if;

  if p_statut = 'membre' then
    v_org := null;
    if v_loc is not null then
      v_autre := null;
      if not exists (select 1 from presence.jci_locales where id = v_loc and actif) then
        return jsonb_build_object('status', 'invalid', 'field', 'jci');
      end if;
    elsif v_autre is null or length(v_autre) > 120 then
      return jsonb_build_object('status', 'invalid', 'field', 'jci');
    end if;
  elsif p_statut = 'invite' then
    v_loc := null;
    v_autre := null;
    if v_org is null or length(v_org) > 120 then
      return jsonb_build_object('status', 'invalid', 'field', 'organisation');
    end if;
  else
    return jsonb_build_object('status', 'invalid', 'field', 'statut');
  end if;

  -- Garde-fou anti-inondation : 200 inscriptions par minute et par événement.
  if (select count(*) from presence.attendees
       where event_id = p_event_id and created_at > now() - interval '1 minute') >= 200 then
    return jsonb_build_object('status', 'busy');
  end if;

  insert into presence.attendees
    (event_id, nom, prenom, telephone, telephone_cle, statut, jci_locale_id, jci_autre, organisation)
  values
    (p_event_id, v_nom, v_prenom, v_tel, v_key, p_statut, v_loc, v_autre, v_org)
  on conflict (event_id, telephone_cle) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('status', 'duplicate');
  end if;
  return jsonb_build_object('status', 'ok');
end $$;

-- Ajoute un compte déjà existant dans Supabase Auth comme administrateur.
-- Retourne 'ok' ou 'not_found' (le compte n'existe pas encore).
create or replace function presence.add_admin(p_email text)
returns text language plpgsql security definer
set search_path = presence, auth, pg_temp as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if not presence.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_id from auth.users where lower(email) = v_email limit 1;
  if v_id is null then return 'not_found'; end if;
  insert into presence.admins (user_id, email) values (v_id, v_email)
  on conflict (user_id) do nothing;
  return 'ok';
end $$;

-- ---------------------------------------------------------------------
-- Sécurité (RLS) : le public n'a accès à rien d'autre qu'aux fonctions
-- evenements_ouverts() et register(), et à la liste des JCI locales actives.
-- ---------------------------------------------------------------------
alter table presence.jci_locales enable row level security;
alter table presence.events      enable row level security;
alter table presence.attendees   enable row level security;
alter table presence.admins      enable row level security;

drop policy if exists jci_select  on presence.jci_locales;
drop policy if exists jci_admin   on presence.jci_locales;
drop policy if exists ev_admin    on presence.events;
drop policy if exists att_admin   on presence.attendees;
drop policy if exists adm_select  on presence.admins;
drop policy if exists adm_delete  on presence.admins;

create policy jci_select on presence.jci_locales for select to anon, authenticated
  using (actif or presence.is_admin());
create policy jci_admin  on presence.jci_locales for all to authenticated
  using (presence.is_admin()) with check (presence.is_admin());

create policy ev_admin   on presence.events for all to authenticated
  using (presence.is_admin()) with check (presence.is_admin());

create policy att_admin  on presence.attendees for all to authenticated
  using (presence.is_admin()) with check (presence.is_admin());

create policy adm_select on presence.admins for select to authenticated
  using (presence.is_admin());
create policy adm_delete on presence.admins for delete to authenticated
  using (presence.is_admin() and user_id <> (select auth.uid()));   -- jamais soi-même

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
grant usage on schema presence to anon, authenticated;

grant select on presence.jci_locales to anon, authenticated;
grant insert, update, delete on presence.jci_locales to authenticated;
grant select, insert, update, delete on presence.events    to authenticated;
grant select, insert, update, delete on presence.attendees to authenticated;
grant select, delete on presence.admins to authenticated;

revoke all on function presence.is_admin()            from public;
revoke all on function presence.evenements_ouverts()  from public;
revoke all on function presence.add_admin(text)       from public;
revoke all on function presence.register(uuid, text, text, text, text, uuid, text, text) from public;

grant execute on function presence.is_admin()           to anon, authenticated;
grant execute on function presence.evenements_ouverts() to anon, authenticated;
grant execute on function presence.add_admin(text)      to authenticated;
grant execute on function presence.register(uuid, text, text, text, text, uuid, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- Données de départ
-- ---------------------------------------------------------------------
insert into presence.jci_locales (nom, ordre) values ('JCI Comé Excellence', 1)
on conflict (nom) do nothing;

-- ---------------------------------------------------------------------
-- ÉTAPES MANUELLES (voir README) :
-- 1. Supabase → Project Settings → API → « Exposed schemas » : ajouter "presence".
-- 2. Créer le premier administrateur (remplacer l'adresse par un compte existant) :
--
--   insert into presence.admins (user_id, email)
--   select id, email from auth.users where lower(email) = lower('secretaire@exemple.org');
-- ---------------------------------------------------------------------
