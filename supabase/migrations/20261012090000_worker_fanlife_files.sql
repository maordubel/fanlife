-- FAN LIFE's control room, research and game data files (owner, 12.10.2026: "approved, Supabase").
-- The Vercel Blob store sat on the Hobby plan's monthly operation cap; when it ran out, the hub went empty and every control-room
-- screen errored. Supabase, already this project's database, has no operation cap. One table holds what Blob held: one row per
-- file, its text, and an etag every save changes — so a save stays a compare-and-swap (`etag=eq.<read>`).
-- Only the server reaches it, with the service-role key it already holds: no grant to anon or authenticated, RLS on, no policy.
-- Idempotent: runs any number of times. Touches nothing that is not worker_ (rule 89).
create table if not exists public.worker_fanlife_files (
  name        text primary key check (char_length(name) between 1 and 300 and name !~ '(^/|\.\.)'),
  body        text not null,
  etag        text not null,
  updated_at  timestamptz not null default now()
);
alter table public.worker_fanlife_files enable row level security;
revoke all on table public.worker_fanlife_files from anon, authenticated;
grant select, insert, update, delete on table public.worker_fanlife_files to service_role;
comment on table public.worker_fanlife_files is 'FAN LIFE server files (control state, research, desk packs). Server only — service role.';
select 'worker_fanlife_files ready · anon_can_read ' || has_table_privilege('anon','public.worker_fanlife_files','select')::text
     || ' · authenticated_can_write ' || has_table_privilege('authenticated','public.worker_fanlife_files','insert')::text;
