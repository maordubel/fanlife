/* worker_terrace_board — the Daily Terrace's club board (owner roadmap, 20.10.2026).
   Opt-in: a score reaches this table only when a fan chooses a name for the board. The score is the server's own
   (the sealed ledger of the day), so the browser can never post a number; the Next server calls these functions with the
   service role and nobody else can (no grant to anon/authenticated, RLS on, no policy — rules 76 / 89).
   Nothing identifies a person: the key is a one-way hash of a random device cookie. Touches only worker_* objects.
   Safe to run more than once. Run after 20261019090000 (it closes grants on functions it does not know). */

create table if not exists public.worker_terrace_score (
  club_id     text not null check (club_id ~ '^[a-z0-9-]{2,48}$'),
  day         date not null,
  edition     text not null check (length(edition) between 1 and 64),
  voter_hash  text not null check (length(voter_hash) = 64),
  nick        text not null check (length(nick) between 2 and 20),
  score       integer not null check (score between 0 and 300),
  created_at  timestamptz not null default now(),
  primary key (club_id, day, voter_hash)
);
create index if not exists worker_terrace_score_board_idx on public.worker_terrace_score (club_id, day, score desc, created_at);
alter table public.worker_terrace_score enable row level security;
revoke all on public.worker_terrace_score from public, anon, authenticated;

/* one entry per device per club per day; the first graded score stays (a second call changes nothing but the name) */
create or replace function public.worker_terrace_submit(p_club text, p_day date, p_edition text, p_device text, p_nick text, p_score integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_nick text := btrim(coalesce(p_nick, '')); v_h text;
begin
  if p_club is null or p_club !~ '^[a-z0-9-]{2,48}$' then return jsonb_build_object('ok', false, 'error', 'club'); end if;
  if p_day is null or abs(p_day - current_date) > 2 then return jsonb_build_object('ok', false, 'error', 'day'); end if;
  if p_device is null or length(p_device) < 16 or length(p_device) > 64 then return jsonb_build_object('ok', false, 'error', 'device'); end if;
  if p_score is null or p_score < 0 or p_score > 300 then return jsonb_build_object('ok', false, 'error', 'score'); end if;
  if length(v_nick) < 2 or length(v_nick) > 20 or v_nick !~ '^[[:alnum:] _.-]+$' then return jsonb_build_object('ok', false, 'error', 'nick'); end if;
  v_h := encode(sha256(convert_to('terrace:' || p_device, 'UTF8')), 'hex');
  insert into public.worker_terrace_score (club_id, day, edition, voter_hash, nick, score)
    values (p_club, p_day, left(p_edition, 64), v_h, v_nick, p_score)
    on conflict (club_id, day, voter_hash) do update set nick = excluded.nick;
  return jsonb_build_object('ok', true);
end $$;

/* the board: top 20 of a day, names and scores only */
create or replace function public.worker_terrace_board(p_club text, p_day date, p_device text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_rows jsonb; v_me text; v_rank integer; v_h text;
begin
  if p_club is null or p_club !~ '^[a-z0-9-]{2,48}$' or p_day is null then return jsonb_build_object('ok', false, 'error', 'input'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('nick', nick, 'score', score) order by score desc, created_at), '[]'::jsonb)
    into v_rows from (select nick, score, created_at from public.worker_terrace_score where club_id = p_club and day = p_day
                      order by score desc, created_at limit 20) t;
  if p_device is not null and length(p_device) between 16 and 64 then
    v_h := encode(sha256(convert_to('terrace:' || p_device, 'UTF8')), 'hex');
    select nick into v_me from public.worker_terrace_score where club_id = p_club and day = p_day and voter_hash = v_h;
    if v_me is not null then
      select 1 + count(*) into v_rank from public.worker_terrace_score s
       where s.club_id = p_club and s.day = p_day
         and (s.score > (select score from public.worker_terrace_score where club_id = p_club and day = p_day and voter_hash = v_h)
              or (s.score = (select score from public.worker_terrace_score where club_id = p_club and day = p_day and voter_hash = v_h)
                  and s.created_at < (select created_at from public.worker_terrace_score where club_id = p_club and day = p_day and voter_hash = v_h)));
    end if;
  end if;
  return jsonb_build_object('ok', true, 'rows', v_rows, 'mine', v_me, 'rank', v_rank);
end $$;

revoke all on function public.worker_terrace_submit(text, date, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.worker_terrace_board(text, date, text) from public, anon, authenticated;
grant execute on function public.worker_terrace_submit(text, date, text, text, text, integer) to service_role;
grant execute on function public.worker_terrace_board(text, date, text) to service_role;

select 'terrace_tables' as k, count(*)::text as v from information_schema.tables where table_schema = 'public' and table_name = 'worker_terrace_score'
union all select 'terrace_functions', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'worker_terrace_%'
union all select 'anon_can_execute', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'worker_terrace_%' and has_function_privilege('anon', p.oid, 'execute');
