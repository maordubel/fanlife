create extension if not exists pgcrypto;
do $$ begin
if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table if not exists auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb,created_at timestamptz default now(),is_anonymous boolean not null default false);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
grant execute on function auth.uid(),auth.jwt() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant all on functions to anon,authenticated,service_role;
alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
create schema if not exists storage;
grant usage on schema storage to anon,authenticated,service_role;
create table if not exists storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[],created_at timestamptz default now());
create table if not exists storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid,created_at timestamptz default now(),unique(bucket_id,name));
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to anon,authenticated;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant execute on function storage.foldername(text) to anon,authenticated;

-- Local evaluation only: the marketing schema lives in supabase/marketing/ (it needs pg_net and pg_cron,
-- which PGlite does not have). The delivery migration alters marketing.posts, so a bare stand-in of the
-- two tables lets every migration in supabase/migrations/ apply here. Production never reads this file.
create schema if not exists marketing;
create table if not exists marketing.settings(key text primary key,value jsonb not null,updated_at timestamptz not null default now());
create table if not exists marketing.posts(id bigserial primary key,day int not null,send_at timestamptz not null unique,format text not null,kind text not null,main jsonb,variants jsonb,fallback jsonb,fallback_format text,status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),attempts int not null default 0,request_id bigint,sent_at timestamptz,rendered text,fixture_id text,error text);
