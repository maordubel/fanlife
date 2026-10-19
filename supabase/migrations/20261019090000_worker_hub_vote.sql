/* worker_hub_vote — "Which club opens next?" on the FAN LIFE hub (owner, 19.10.2026).
   Until now the ballot was a fixed seed in code plus one vote kept in the browser. This is the real count.
   - One vote per signed-in account, or one per device for a guest. Guests may vote; the two are counted apart.
   - Changing your mind moves your vote. Signing in on a device that already voted as a guest replaces that guest vote.
   - The table has no grant and no policy (rule 76 / supabase-server-authority): votes go in through worker_hub_vote_cast,
     and only totals come out through worker_hub_vote_tally. Nobody is stored by id: the key is a one-way hash per ballot.
   - The 42 "Early count" votes are NOT in this table; the site adds them on top and labels them (lib/home/vote.ts).
   Touches only worker_* objects (rule 89), nothing on auth. Safe to run more than once.
   Needs worker_market_uid() from 20260922120000_worker_collector_market.sql (null for anonymous sessions).
   If that collector file is ever run again, run this one after it (it closes grants on functions it does not know). */

create table if not exists public.worker_hub_vote (
  id          uuid primary key default gen_random_uuid(),
  ballot      text not null check (ballot ~ '^[a-z0-9:_-]{1,48}$'),
  club_id     text not null check (club_id ~ '^[a-z0-9-]{2,48}$'),
  kind        text not null check (kind in ('account','guest')),
  voter_hash  text not null check (length(voter_hash) = 64),
  device_hash text check (device_hash is null or length(device_hash) = 64),
  voted_at    timestamptz not null default now(),
  unique (ballot, kind, voter_hash)
);
create index if not exists worker_hub_vote_ballot_idx on public.worker_hub_vote (ballot, club_id);
create index if not exists worker_hub_vote_device_idx on public.worker_hub_vote (ballot, device_hash) where device_hash is not null;

alter table public.worker_hub_vote enable row level security;
revoke all on public.worker_hub_vote from public, anon, authenticated;

/* worker_hub_vote_cast — answers with a value, never an exception, so the page can say what happened. */
create or replace function public.worker_hub_vote_cast(p_ballot text, p_club text, p_device text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := public.worker_market_uid();
  v_dev  text := nullif(trim(coalesce(p_device, '')), '');
  v_dh   text;
  v_kind text;
  v_key  text;
begin
  if p_ballot is null or p_ballot !~ '^[a-z0-9:_-]{1,48}$' then return jsonb_build_object('ok', false, 'error', 'ballot'); end if;
  if p_club   is null or p_club   !~ '^[a-z0-9-]{2,48}$'   then return jsonb_build_object('ok', false, 'error', 'club'); end if;
  if v_dev is not null and (length(v_dev) < 8 or length(v_dev) > 64) then return jsonb_build_object('ok', false, 'error', 'device'); end if;
  if v_uid is null and v_dev is null then return jsonb_build_object('ok', false, 'error', 'device'); end if;

  if v_dev is not null then v_dh := encode(sha256(convert_to('device:' || v_dev, 'UTF8')), 'hex'); end if;

  if v_uid is not null then
    v_kind := 'account';
    v_key  := encode(sha256(convert_to('account:' || p_ballot || ':' || v_uid::text, 'UTF8')), 'hex');
    /* this device may already have voted as a guest — that vote is now the account's */
    if v_dh is not null then
      delete from public.worker_hub_vote where ballot = p_ballot and kind = 'guest' and device_hash = v_dh;
    end if;
  else
    v_kind := 'guest';
    v_key  := encode(sha256(convert_to('device:' || p_ballot || ':' || v_dev, 'UTF8')), 'hex');
    /* one device cannot hold an unbounded number of ballots */
    if not exists (select 1 from public.worker_hub_vote where ballot = p_ballot and kind = 'guest' and voter_hash = v_key)
       and (select count(*) from public.worker_hub_vote where kind = 'guest' and device_hash = v_dh) >= 20 then
      return jsonb_build_object('ok', false, 'error', 'too_many');
    end if;
  end if;

  insert into public.worker_hub_vote (ballot, club_id, kind, voter_hash, device_hash, voted_at)
    values (p_ballot, p_club, v_kind, v_key, v_dh, now())
    on conflict (ballot, kind, voter_hash)
      do update set club_id = excluded.club_id, device_hash = excluded.device_hash, voted_at = now();
  return jsonb_build_object('ok', true, 'kind', v_kind, 'club', p_club);
end $$;

/* worker_hub_vote_mine — what this person (or this device) voted, so a second device shows the same tick. */
create or replace function public.worker_hub_vote_mine(p_ballot text, p_device text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid  uuid := public.worker_market_uid();
  v_dev  text := nullif(trim(coalesce(p_device, '')), '');
  v_club text;
begin
  if p_ballot is null or p_ballot !~ '^[a-z0-9:_-]{1,48}$' then return jsonb_build_object('ok', false, 'error', 'ballot'); end if;
  if v_uid is not null then
    select club_id into v_club from public.worker_hub_vote
     where ballot = p_ballot and kind = 'account'
       and voter_hash = encode(sha256(convert_to('account:' || p_ballot || ':' || v_uid::text, 'UTF8')), 'hex');
  end if;
  if v_club is null and v_dev is not null and length(v_dev) between 8 and 64 then
    select club_id into v_club from public.worker_hub_vote
     where ballot = p_ballot and kind = 'guest'
       and voter_hash = encode(sha256(convert_to('device:' || p_ballot || ':' || v_dev, 'UTF8')), 'hex');
  end if;
  return jsonb_build_object('ok', true, 'club', v_club);
end $$;

/* worker_hub_vote_tally — totals only, accounts and guests apart. Never a voter. */
create or replace function public.worker_hub_vote_tally(p_ballot text)
returns table (club_id text, account_votes bigint, guest_votes bigint)
language sql stable security definer set search_path = public as $$
  select v.club_id,
         count(*) filter (where v.kind = 'account')::bigint,
         count(*) filter (where v.kind = 'guest')::bigint
  from public.worker_hub_vote v
  where v.ballot = p_ballot
  group by v.club_id
  order by count(*) desc, v.club_id;
$$;

revoke all on function public.worker_hub_vote_cast(text,text,text)  from public, anon, authenticated;
revoke all on function public.worker_hub_vote_mine(text,text)       from public, anon, authenticated;
revoke all on function public.worker_hub_vote_tally(text)           from public, anon, authenticated;
grant execute on function public.worker_hub_vote_cast(text,text,text) to anon, authenticated;
grant execute on function public.worker_hub_vote_mine(text,text)      to anon, authenticated;
grant execute on function public.worker_hub_vote_tally(text)          to anon, authenticated;

comment on table public.worker_hub_vote is
  'FAN LIFE hub ballot. No grants, no policy: in through worker_hub_vote_cast, out only as totals through worker_hub_vote_tally. Voters are one-way hashes.';

/* the check line the owner reads after pasting */
select 'worker_hub_vote ready · table ' || (select count(*) from pg_tables where schemaname='public' and tablename='worker_hub_vote')
    || ' · functions ' || (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'worker_hub_vote_%')
    || ' · anon_can_read_table ' || (case when has_table_privilege('anon','public.worker_hub_vote','select') then 'YES (bad)' else '0' end) as status;
