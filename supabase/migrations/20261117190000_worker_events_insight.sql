-- =====================================================================
-- GAMES · the funnel as a report (17.11.2026).
--
-- One read over the existing measurement (public.worker_event, recorded since 25.9.2026 — no new table, no new
-- write). For any period and, optionally, one club: totals with the period before, the day series, the hour × weekday
-- grid (Athens time), every gate's funnel (opened → started → finished) with the steps where people leave, every
-- event name, share channels and game modes, and the clubs. A "player" is a visitor-day (the daily salted hash).
-- service_role only. Safe to run twice.
-- =====================================================================
create or replace function public.worker_events_insight(p_from date, p_to date, p_club text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_len integer := greatest(1, (p_to - p_from) + 1); v_out jsonb;
begin
  with f as (
    select e.*, (e.at at time zone 'Europe/Athens') as local,
           substring(e.gate from '^/clubs/([a-z0-9-]+)') as club
      from public.worker_event e
     where e.day between p_from - v_len and p_to
       and (p_club is null or e.gate like '/clubs/' || p_club || '/%' or e.gate = '/clubs/' || p_club)
  ), cur as (select * from f where day between p_from and p_to),
  prev as (select * from f where day < p_from),
  t as (select
      count(distinct (day, visitor)) filter (where name = 'gate_view') v, count(distinct (day, visitor)) filter (where name = 'gate_start') s,
      count(distinct (day, visitor)) filter (where name = 'gate_finish') fi, count(*) filter (where name in ('share_click', 'share_created')) sh,
      count(*) filter (where name = 'cross_link_click') x, count(*) filter (where name = 'gate_leave') l, count(distinct (day, visitor)) p, count(*) n
    from cur),
  pt as (select
      count(distinct (day, visitor)) filter (where name = 'gate_view') v, count(distinct (day, visitor)) filter (where name = 'gate_start') s,
      count(distinct (day, visitor)) filter (where name = 'gate_finish') fi, count(*) filter (where name in ('share_click', 'share_created')) sh,
      count(*) filter (where name = 'cross_link_click') x, count(*) filter (where name = 'gate_leave') l, count(distinct (day, visitor)) p, count(*) n
    from prev),
  g as (select gate,
      count(distinct (day, visitor)) filter (where name = 'gate_view') v, count(distinct (day, visitor)) filter (where name = 'gate_start') s,
      count(distinct (day, visitor)) filter (where name = 'gate_finish') fi, count(*) filter (where name = 'gate_leave') l,
      count(*) filter (where name in ('share_click', 'share_created')) sh, count(*) filter (where name = 'cross_link_click') x
    from cur group by gate),
  steps as (select gate, jsonb_agg(jsonb_build_array(step, n) order by n desc, step) j from (
      select gate, step, count(*) n, row_number() over (partition by gate order by count(*) desc, step) r from cur where name = 'gate_leave' and step is not null group by gate, step) q
    where r <= 8 group by gate)
  select jsonb_build_object(
    'from', p_from, 'to', p_to, 'days', v_len, 'since', (select min(day) from public.worker_event),
    'totals', (select jsonb_build_object('players', p, 'opened', v, 'started', s, 'finished', fi, 'shares', sh, 'cross', x, 'leaves', l, 'events', n) from t),
    'previous', (select jsonb_build_object('players', p, 'opened', v, 'started', s, 'finished', fi, 'shares', sh, 'cross', x, 'leaves', l, 'events', n) from pt),
    'series', coalesce((select jsonb_agg(jsonb_build_object('day', d::date, 'opened', coalesce(x.v, 0), 'started', coalesce(x.s, 0), 'finished', coalesce(x.fi, 0)) order by d)
        from generate_series(p_from, p_to, interval '1 day') d
        left join (select day, count(distinct visitor) filter (where name = 'gate_view') v, count(distinct visitor) filter (where name = 'gate_start') s, count(distinct visitor) filter (where name = 'gate_finish') fi from cur group by day) x on x.day = d::date), '[]'),
    'grid', coalesce((select jsonb_agg(jsonb_build_array(dw, hr, n)) from (select (extract(isodow from local)::int - 1) dw, extract(hour from local)::int hr, count(*) filter (where name = 'gate_view') n from cur group by 1, 2) q), '[]'),
    'hours', coalesce((select jsonb_agg(jsonb_build_array(hr, n, s) order by hr) from (select extract(hour from local)::int hr, count(*) filter (where name = 'gate_view') n, count(*) filter (where name = 'gate_start') s from cur group by 1) q), '[]'),
    'weekdays', coalesce((select jsonb_agg(jsonb_build_array(dw, n, s) order by dw) from (select (extract(isodow from local)::int - 1) dw, count(*) filter (where name = 'gate_view') n, count(*) filter (where name = 'gate_start') s from cur group by 1) q), '[]'),
    'gates', coalesce((select jsonb_agg(jsonb_build_object('gate', g.gate, 'opened', g.v, 'started', g.s, 'finished', g.fi, 'leaves', g.l, 'shares', g.sh, 'cross', g.x, 'steps', coalesce(steps.j, '[]'::jsonb))
        order by g.v desc, g.s desc, g.gate) from g left join steps on steps.gate = g.gate), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('key', name, 'n', n, 'players', p) order by n desc) from (select name, count(*) n, count(distinct (day, visitor)) p from cur group by name) q), '[]'),
    'shares', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc) from (select coalesce(detail, 'other') k, count(*) n from cur where name in ('share_click', 'share_created') group by 1) q), '[]'),
    'modes', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc) from (select detail k, count(*) n from cur where name in ('gate_start', 'run_start') and detail is not null group by 1 order by 2 desc limit 20) q), '[]'),
    'clubs', coalesce((select jsonb_agg(jsonb_build_object('key', club, 'opened', v, 'started', s, 'finished', fi) order by v desc) from (select club, count(distinct (day, visitor)) filter (where name = 'gate_view') v, count(distinct (day, visitor)) filter (where name = 'gate_start') s, count(distinct (day, visitor)) filter (where name = 'gate_finish') fi from cur where club is not null group by club) q), '[]')
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.worker_events_insight(date, date, text) from public, anon, authenticated;
grant execute on function public.worker_events_insight(date, date, text) to service_role;
