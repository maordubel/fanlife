-- Connected Football audit CF-03 (27.10.2026): `arenas` in the live data counts only arenas a visitor can join now.
-- It used to count every arena that was not cancelled or settled — private and locked ones included — and the hub card
-- and the 15:00 OFFSIDES post said "arenas open". FAN LIFE derives join / create from this number (lib/universe/discovery.ts).
-- Idempotent: safe to run again. Replaces the function from 20261027090000_worker_marketing_live.sql; nothing else changes.

create or replace function public.worker_marketing_live_data()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
-- plpgsql, not sql: DUBID's and OFFSIDES' schemas live in the shared project and are bound at run time, so this
-- file also installs on a database that does not carry them (CI, a fresh branch).
begin
  return (with today as (select (now() at time zone 'Asia/Jerusalem')::date d)
  select jsonb_build_object(
    'dubid', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'round', g.number,
        'league', coalesce(l.names->'en'->>'full', l.code), 'code', l.code, 'lock_at', g.lock_at,
        'first_kickoff_at', g.first_kickoff_at) order by g.lock_at, l.code)
      from game.gameweeks g join core.leagues l on l.id = g.league_id
      where g.status = 'open' and l.is_active and g.lock_at > now()), '[]'::jsonb),
    'offsides', coalesce((select jsonb_agg(x order by (x->>'arenas')::int desc, x->>'kickoff') from (
      select jsonb_build_object('id', m.id, 'home', m.home_team, 'away', m.away_team, 'league', m.league,
        'kickoff', m.kickoff, 'tier', m.tier,
        -- arenas a visitor can JOIN now (audit CF-03): public, open, not archived, no password.
        -- A private, locked, live or archived arena is never counted as "open".
        'arenas', (select count(*) from offsides.arenas a where a.match_id = m.id and not coalesce(a.archived, false)
                    and a.type = 'public' and a.status = 'open' and a.password_hash is null)) x
      from offsides.matches m, today t
      where (m.kickoff at time zone 'Asia/Jerusalem')::date = t.d and m.kickoff > now()
        and m.visible and coalesce(m.sport, 'football') = 'football' and m.status = 'scheduled') s), '[]'::jsonb),
    'posted', coalesce((select jsonb_agg(distinct r) from marketing.posts p,
        unnest(string_to_array(p.fixture_id, ',')) r
      where p.kind in ('fixtures','results','dubid','offsides') and p.status in ('sent','sending')
        and p.send_at > now() - interval '21 days' and p.fixture_id is not null), '[]'::jsonb)));
end $$;
revoke all on function public.worker_marketing_live_data() from public, anon, authenticated;
grant execute on function public.worker_marketing_live_data() to service_role;
