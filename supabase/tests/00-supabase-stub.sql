-- A minimal Supabase shape: roles, auth.users, auth.uid(), and the default privileges
-- Supabase grants in public (ALL to anon/authenticated/service_role).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- DUBID, as found on 22.9.2026: its own schemas, and five tables + three functions in public.
create schema if not exists core; create schema if not exists game; create schema if not exists shared;
create table if not exists public.profiles (id uuid primary key references auth.users(id), username text, coins int default 0);
create table if not exists public.arenas (id serial primary key, name text);
create table if not exists public.bets (id serial primary key, user_id uuid, amount int);
create table if not exists public.questions (id serial primary key, body text);
create table if not exists public.system_configs (key text primary key, value jsonb);
create or replace function public.handle_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create or replace function public.pending_rewards() returns int language sql as $$ select 0 $$;
create or replace function public.server_now() returns timestamptz language sql as $$ select now() $$;
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','dubid-a@example.com'),
  ('22222222-2222-2222-2222-222222222222','dubid-b@example.com')
  on conflict do nothing;
insert into public.profiles(id,username) values ('11111111-1111-1111-1111-111111111111','dubidA') on conflict do nothing;

-- auth.jwt() as Supabase defines it: the claims of the request.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
grant execute on function auth.jwt() to anon, authenticated;
alter table auth.users add column if not exists is_anonymous boolean not null default false;

-- A minimal storage schema: buckets, objects, and foldername().
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now());
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, created_at timestamptz default now(), unique (bucket_id, name));
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant execute on function storage.foldername(text) to anon, authenticated;
-- a DUBID bucket and a DUBID policy, so the test can prove ours add nothing to theirs
insert into storage.buckets (id, name, public) values ('dubid-avatars', 'dubid-avatars', false) on conflict do nothing;
drop policy if exists dubid_avatars_own on storage.objects;
create policy dubid_avatars_own on storage.objects for all to authenticated
  using (bucket_id = 'dubid-avatars' and owner = auth.uid()) with check (bucket_id = 'dubid-avatars' and owner = auth.uid());
insert into auth.users(id,email) values ('33333333-3333-3333-3333-333333333333','c@example.com'),
  ('44444444-4444-4444-4444-444444444444','admin@example.com') on conflict do nothing;
insert into auth.users(id,email,is_anonymous) values ('55555555-5555-5555-5555-555555555555',null,true) on conflict do nothing;
