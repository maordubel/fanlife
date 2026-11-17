-- =====================================================================
-- FAN LIFE INSIGHT — the site's own analytics (owner, 17.11.2026: "a real internal Google Analytics: as much data as
-- possible — usage, clicks, location, time … filters, charts, an entry counter, days and hours, a daily report in the
-- morning Telegram update").
--
-- First-party only, no third party sees a request. A row is one page view, one click, one leave (time on page and
-- scroll depth) or one named event. What is NOT stored: an IP address, a user-agent string, a name, an email, an
-- account. Location is the country / region / city the edge (Cloudflare) resolves; device, OS and browser are read
-- from the user-agent on the server and only the family is kept. The visitor is sha256(secret | the device's own
-- random id): stable, so returning visitors and loyalty can be measured, never reversible to the device without the
-- secret, which lives in a table no role is granted. Supporters who send Global Privacy Control or Do Not Track are
-- not counted (the tracker never sends).
--
-- Free tier (CLAUDE.md, universe check 4): raw rows are kept 180 days (nightly sweep, pg_cron); a row is ~200 bytes.
-- Write: worker_insight_record (anon, security definer, every field re-checked, rate-limited).
-- Read: worker_insight_report / worker_insight_live (service_role only — the admin and the morning briefing).
-- Owned by FAN LIFE (worker_ prefix, rule: an app writes only what it owns). Safe to run twice.
-- =====================================================================

create table if not exists public.worker_insight_secret (id smallint primary key default 1 check (id = 1), secret text not null);
alter table public.worker_insight_secret enable row level security;
revoke all on public.worker_insight_secret from anon, authenticated;
insert into public.worker_insight_secret (id, secret) values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (id) do nothing;

create table if not exists public.worker_insight_visitor (
  visitor    text primary key check (visitor ~ '^[0-9a-f]{64}$'),
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  sessions   integer not null default 1,
  first_ref  text,
  first_path text
);
alter table public.worker_insight_visitor enable row level security;
revoke all on public.worker_insight_visitor from anon, authenticated;

create table if not exists public.worker_insight_hit (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  day       date not null,
  hour      smallint not null check (hour between 0 and 23),
  dow       smallint not null check (dow between 0 and 6),          -- 0 = Monday
  visitor   text not null check (visitor ~ '^[0-9a-f]{64}$'),
  session   text not null check (session ~ '^[0-9a-f]{16}$'),
  fresh     boolean not null default false,                          -- the visitor's first session
  kind      text not null check (kind in ('view','click','leave','event')),
  path      text not null check (path ~ '^/[^\s]{0,159}$'),
  club      text check (club ~ '^[a-z0-9-]{2,48}$'),
  title     text check (char_length(title) <= 120),
  ref_host  text check (ref_host ~ '^[a-z0-9.-]{1,80}$'),
  source    text check (source ~ '^[a-z0-9_.-]{1,48}$'),             -- utm_source, else the referrer's site, else 'direct'
  medium    text check (medium ~ '^[a-z0-9_.-]{1,48}$'),
  campaign  text check (campaign ~ '^[a-z0-9_.:-]{1,64}$'),
  country   text check (country ~ '^[A-Z]{2}$'),
  region    text check (char_length(region) <= 64),
  city      text check (char_length(city) <= 64),
  device    text check (device in ('mobile','tablet','desktop')),
  os        text check (os ~ '^[A-Za-z ]{2,24}$'),
  browser   text check (browser ~ '^[A-Za-z ]{2,24}$'),
  lang      text check (lang ~ '^[a-z]{2}$'),
  screen    smallint check (screen between 0 and 10000),
  target    text check (char_length(target) <= 80),                  -- a click: what was clicked (its label or link)
  dwell_ms  integer check (dwell_ms between 0 and 86400000),         -- a leave: time on the page
  scroll    smallint check (scroll between 0 and 100),               -- a leave: deepest scroll, %
  value     integer
);
alter table public.worker_insight_hit enable row level security;
revoke all on public.worker_insight_hit from anon, authenticated;
create index if not exists worker_insight_hit_day on public.worker_insight_hit (day, kind);
create index if not exists worker_insight_hit_visitor on public.worker_insight_hit (visitor, at desc);
create index if not exists worker_insight_hit_at on public.worker_insight_hit (at desc);

-- =====================================================================
-- 1. the write — one door, open to everyone, answers with a value
-- =====================================================================
/*
 * p_device  the device's random id ([0-9a-f-]{8,64}) · p_session the tab's session id (hex 16)
 * p_ctx     {country, region, city, device, os, browser, lang, screen} — set by the server route, not the browser
 * p_hits    [{kind, path, club?, title?, ref?, source?, medium?, campaign?, target?, dwell?, scroll?, value?}] × ≤ 30
 */
create or replace function public.worker_insight_record(p_device text, p_session text, p_ctx jsonb, p_hits jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_local timestamp := (now() at time zone 'Europe/Athens');
  v_visitor text; v_session text; v_fresh boolean; v_recent integer; v_hit jsonb; v_kept integer := 0; v_skipped integer := 0;
  v_ref text; v_path text;
begin
  if p_device is null or p_device !~ '^[0-9a-f-]{8,64}$' then return jsonb_build_object('ok', false, 'error', 'bad_device'); end if;
  if p_session is null or p_session !~ '^[0-9a-f]{8,64}$' then return jsonb_build_object('ok', false, 'error', 'bad_session'); end if;
  if p_hits is null or jsonb_typeof(p_hits) <> 'array' or jsonb_array_length(p_hits) = 0 then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  if jsonb_array_length(p_hits) > 30 or octet_length(p_hits::text) > 16384 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  v_visitor := encode(sha256(convert_to((select secret from public.worker_insight_secret where id = 1) || '|' || p_device, 'UTF8')), 'hex');
  v_session := left(encode(sha256(convert_to(v_visitor || '|' || p_session, 'UTF8')), 'hex'), 16);
  select count(*) into v_recent from public.worker_insight_hit where visitor = v_visitor and at > v_now - interval '1 minute';
  if v_recent + jsonb_array_length(p_hits) > 300 then return jsonb_build_object('ok', false, 'error', 'slow_down'); end if;

  v_hit := p_hits -> 0;
  v_ref := nullif(lower(v_hit ->> 'ref'), ''); v_path := v_hit ->> 'path';
  insert into public.worker_insight_visitor (visitor, first_ref, first_path) values (v_visitor, left(v_ref, 80), left(v_path, 160))
  on conflict (visitor) do update set last_at = v_now,
    sessions = public.worker_insight_visitor.sessions + case when not exists (select 1 from public.worker_insight_hit h where h.visitor = v_visitor and h.session = v_session) then 1 else 0 end;
  -- a fresh visitor is one whose every session so far is this one
  v_fresh := not exists (select 1 from public.worker_insight_hit h where h.visitor = v_visitor and h.session <> v_session);

  for v_hit in select * from jsonb_array_elements(p_hits) loop
    begin
      if jsonb_typeof(v_hit) <> 'object' then raise exception 'shape'; end if;
      insert into public.worker_insight_hit (at, day, hour, dow, visitor, session, fresh, kind, path, club, title, ref_host, source, medium, campaign,
        country, region, city, device, os, browser, lang, screen, target, dwell_ms, scroll, value)
      values (v_now, v_local::date, extract(hour from v_local)::smallint, ((extract(isodow from v_local)::int) - 1)::smallint, v_visitor, v_session, v_fresh,
        v_hit ->> 'kind', left(v_hit ->> 'path', 160), nullif(v_hit ->> 'club', ''), left(nullif(v_hit ->> 'title', ''), 120),
        left(nullif(lower(v_hit ->> 'ref'), ''), 80), left(nullif(lower(v_hit ->> 'source'), ''), 48), left(nullif(lower(v_hit ->> 'medium'), ''), 48), left(nullif(lower(v_hit ->> 'campaign'), ''), 64),
        nullif(upper(p_ctx ->> 'country'), ''), left(nullif(p_ctx ->> 'region', ''), 64), left(nullif(p_ctx ->> 'city', ''), 64),
        nullif(p_ctx ->> 'device', ''), nullif(p_ctx ->> 'os', ''), nullif(p_ctx ->> 'browser', ''), nullif(lower(p_ctx ->> 'lang'), ''),
        case when jsonb_typeof(p_ctx -> 'screen') = 'number' then (p_ctx ->> 'screen')::numeric::smallint end,
        left(nullif(v_hit ->> 'target', ''), 80),
        case when jsonb_typeof(v_hit -> 'dwell') = 'number' then least(86400000, greatest(0, (v_hit ->> 'dwell')::numeric::integer)) end,
        case when jsonb_typeof(v_hit -> 'scroll') = 'number' then least(100, greatest(0, (v_hit ->> 'scroll')::numeric::integer))::smallint end,
        case when jsonb_typeof(v_hit -> 'value') = 'number' then round((v_hit ->> 'value')::numeric)::integer end);
      v_kept := v_kept + 1;
    exception when others then v_skipped := v_skipped + 1;
    end;
  end loop;
  return jsonb_build_object('ok', true, 'kept', v_kept, 'skipped', v_skipped);
end $$;
revoke all on function public.worker_insight_record(text, text, jsonb, jsonb) from public;
grant execute on function public.worker_insight_record(text, text, jsonb, jsonb) to anon, authenticated, service_role;

-- =====================================================================
-- 2. the read — one report for any period and filter (service_role only)
-- =====================================================================
/*
 * p_from / p_to   Athens days, inclusive · p_club / p_country / p_device / p_source / p_path   optional filters
 * Returns one JSON document: totals (+ the same totals for the period before, for the arrows), the day series, the
 * hour × weekday grid, and every breakdown. A session is one tab visit (30 minutes of quiet starts a new one).
 */
create or replace function public.worker_insight_report(p_from date, p_to date, p_club text default null, p_country text default null,
  p_device text default null, p_source text default null, p_path text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_len integer := greatest(1, (p_to - p_from) + 1); v_out jsonb;
begin
  with f as (
    select * from public.worker_insight_hit h
     where h.day between p_from - v_len and p_to
       and (p_club is null or h.club = p_club) and (p_country is null or h.country = p_country)
       and (p_device is null or h.device = p_device)
       -- a source belongs to the session it brought: every hit of a session that landed from it
       and (p_source is null or h.session in (select x.session from public.worker_insight_hit x where x.day between p_from - v_len and p_to and coalesce(x.source, 'direct') = p_source and x.kind = 'view'))
       and (p_path is null or h.path = p_path)
  ), cur as (select * from f where day between p_from and p_to),
  prev as (select * from f where day < p_from),
  sess as (  -- per session: pages, first and last moment, time engaged
    select session, min(visitor) visitor, bool_or(fresh) fresh, count(*) filter (where kind = 'view') views,
           extract(epoch from (max(at) - min(at)))::int span, coalesce(sum(dwell_ms) filter (where kind = 'leave'), 0) dwell,
           (array_agg(path order by at) filter (where kind = 'view'))[1] entry,
           (array_agg(path order by at desc) filter (where kind = 'view'))[1] exit,
           coalesce((array_agg(source order by at) filter (where kind = 'view' and source is not null))[1], 'direct') src,
           coalesce((array_agg(medium order by at) filter (where kind = 'view' and medium is not null))[1], '(none)') med,
           (array_agg(campaign order by at) filter (where kind = 'view' and campaign is not null))[1] camp
      from cur group by session),
  psess as (select session, count(*) filter (where kind = 'view') views, extract(epoch from (max(at) - min(at)))::int span, coalesce(sum(dwell_ms) filter (where kind = 'leave'), 0) dwell from prev group by session),
  tot as (select jsonb_build_object(
      'views', (select count(*) from cur where kind = 'view'),
      'visitors', (select count(distinct visitor) from cur),
      'new', (select count(distinct visitor) from cur where fresh),
      'returning', (select count(distinct visitor) from cur where not fresh),
      'sessions', (select count(*) from sess),
      'clicks', (select count(*) from cur where kind = 'click'),
      'events', (select count(*) from cur where kind = 'event'),
      'avgSessionSec', (select coalesce(round(avg(greatest(span, dwell / 1000))), 0) from sess),
      'pagesPerSession', (select coalesce(round(avg(views)::numeric, 2), 0) from sess),
      'bounceRate', (select coalesce(round(100.0 * count(*) filter (where views <= 1) / nullif(count(*), 0), 1), 0) from sess),
      'avgPageSec', (select coalesce(round(avg(dwell_ms) / 1000.0), 0) from cur where kind = 'leave' and dwell_ms > 0),
      'avgScroll', (select coalesce(round(avg(scroll)), 0) from cur where kind = 'leave' and scroll is not null),
      'countries', (select count(distinct country) from cur where country is not null)) j),
  ptot as (select jsonb_build_object(
      'views', (select count(*) from prev where kind = 'view'),
      'visitors', (select count(distinct visitor) from prev),
      'new', (select count(distinct visitor) from prev where fresh),
      'returning', (select count(distinct visitor) from prev where not fresh),
      'sessions', (select count(*) from psess),
      'clicks', (select count(*) from prev where kind = 'click'),
      'avgSessionSec', (select coalesce(round(avg(greatest(span, dwell / 1000))), 0) from psess),
      'pagesPerSession', (select coalesce(round(avg(views)::numeric, 2), 0) from psess),
      'bounceRate', (select coalesce(round(100.0 * count(*) filter (where views <= 1) / nullif(count(*), 0), 1), 0) from psess),
      'avgPageSec', (select coalesce(round(avg(dwell_ms) / 1000.0), 0) from prev where kind = 'leave' and dwell_ms > 0),
      'avgScroll', (select coalesce(round(avg(scroll)), 0) from prev where kind = 'leave' and scroll is not null),
      'countries', (select count(distinct country) from prev where country is not null)) j)
  select jsonb_build_object(
    'from', p_from, 'to', p_to, 'days', v_len,
    'totals', (select j from tot), 'previous', (select j from ptot),
    'series', coalesce((select jsonb_agg(jsonb_build_object('day', d::date, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0), 'new', coalesce(v.fresh, 0), 'clicks', coalesce(v.clicks, 0)) order by d)
        from generate_series(p_from, p_to, interval '1 day') d
        left join (select day, count(*) filter (where kind = 'view') views, count(distinct visitor) visitors, count(distinct visitor) filter (where fresh) fresh, count(*) filter (where kind = 'click') clicks from cur group by day) v on v.day = d::date), '[]'),
    'grid', coalesce((select jsonb_agg(jsonb_build_array(dow, hour, n)) from (select dow, hour, count(*) filter (where kind = 'view') n from cur group by dow, hour) g), '[]'),
    'hours', coalesce((select jsonb_agg(jsonb_build_array(hour, n, v) order by hour) from (select hour, count(*) filter (where kind = 'view') n, count(distinct visitor) v from cur group by hour) g), '[]'),
    'weekdays', coalesce((select jsonb_agg(jsonb_build_array(dow, n, v) order by dow) from (select dow, count(*) filter (where kind = 'view') n, count(distinct visitor) v from cur group by dow) g), '[]'),
    'pages', coalesce((select jsonb_agg(x order by (x ->> 'views')::int desc) from (select jsonb_build_object('key', path, 'views', count(*) filter (where kind = 'view'), 'visitors', count(distinct visitor),
        'avgSec', round(avg(dwell_ms) filter (where kind = 'leave' and dwell_ms > 0) / 1000.0), 'scroll', round(avg(scroll) filter (where kind = 'leave')), 'clicks', count(*) filter (where kind = 'click')) x
        from cur group by path order by count(*) filter (where kind = 'view') desc limit 60) p), '[]'),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('key', entry, 'n', n) order by n desc) from (select entry, count(*) n from sess where entry is not null group by entry order by count(*) desc limit 25) e), '[]'),
    'exits', coalesce((select jsonb_agg(jsonb_build_object('key', exit, 'n', n) order by n desc) from (select exit, count(*) n from sess where exit is not null group by exit order by count(*) desc limit 25) e), '[]'),
    'clubs', coalesce((select jsonb_agg(jsonb_build_object('key', club, 'views', views, 'visitors', visitors) order by views desc) from (select club, count(*) filter (where kind = 'view') views, count(distinct visitor) visitors from cur where club is not null group by club) c), '[]'),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('key', src, 'sessions', n, 'visitors', v, 'bounce', b, 'pages', pg) order by n desc) from (select src, count(*) n, count(distinct visitor) v, round(100.0 * count(*) filter (where views <= 1) / count(*)) b, round(avg(views)::numeric, 1) pg from sess group by 1 order by 2 desc limit 30) s), '[]'),
    'mediums', coalesce((select jsonb_agg(jsonb_build_object('key', med, 'sessions', n) order by n desc) from (select med, count(*) n from sess group by 1 order by 2 desc limit 20) s), '[]'),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('key', camp, 'sessions', n, 'visitors', v) order by n desc) from (select camp, count(*) n, count(distinct visitor) v from sess where camp is not null group by 1 order by 2 desc limit 30) s), '[]'),
    'referrers', coalesce((select jsonb_agg(jsonb_build_object('key', ref_host, 'sessions', n) order by n desc) from (select ref_host, count(distinct session) n from cur where ref_host is not null group by 1 order by 2 desc limit 30) s), '[]'),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('key', country, 'visitors', v, 'views', n) order by v desc) from (select country, count(distinct visitor) v, count(*) filter (where kind = 'view') n from cur where country is not null group by 1 order by 2 desc limit 60) s), '[]'),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('key', city, 'country', country, 'visitors', v, 'views', n) order by v desc) from (select city, country, count(distinct visitor) v, count(*) filter (where kind = 'view') n from cur where city is not null group by 1, 2 order by 3 desc limit 60) s), '[]'),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('key', device, 'visitors', v) order by v desc) from (select coalesce(device, 'unknown') device, count(distinct visitor) v from cur group by 1) s), '[]'),
    'os', coalesce((select jsonb_agg(jsonb_build_object('key', os, 'visitors', v) order by v desc) from (select coalesce(os, 'Other') os, count(distinct visitor) v from cur group by 1) s), '[]'),
    'browsers', coalesce((select jsonb_agg(jsonb_build_object('key', browser, 'visitors', v) order by v desc) from (select coalesce(browser, 'Other') browser, count(distinct visitor) v from cur group by 1) s), '[]'),
    'langs', coalesce((select jsonb_agg(jsonb_build_object('key', lang, 'visitors', v) order by v desc) from (select coalesce(lang, '??') lang, count(distinct visitor) v from cur group by 1 order by 2 desc limit 20) s), '[]'),
    'screens', coalesce((select jsonb_agg(jsonb_build_object('key', b, 'visitors', v) order by v desc) from (select case when screen is null then 'unknown' when screen < 400 then '< 400 px' when screen < 768 then '400–767 px' when screen < 1024 then '768–1023 px' when screen < 1440 then '1024–1439 px' else '1440+ px' end b, count(distinct visitor) v from cur group by 1) s), '[]'),
    'clicks', coalesce((select jsonb_agg(jsonb_build_object('key', target, 'path', path, 'n', n, 'visitors', v) order by n desc) from (select target, path, count(*) n, count(distinct visitor) v from cur where kind = 'click' and target is not null group by 1, 2 order by 3 desc limit 60) s), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('key', target, 'n', n, 'visitors', v) order by n desc) from (select coalesce(target, '(unnamed)') target, count(*) n, count(distinct visitor) v from cur where kind = 'event' group by 1 order by 2 desc limit 40) s), '[]'),
    'depth', coalesce((select jsonb_agg(jsonb_build_object('key', b, 'n', n) order by b) from (select width_bucket(scroll, 0, 100, 4) b, count(*) n from cur where kind = 'leave' and scroll is not null group by 1) s), '[]'),
    'sessionLength', coalesce((select jsonb_agg(jsonb_build_object('key', b, 'n', n) order by b) from (select case when s < 10 then 1 when s < 30 then 2 when s < 60 then 3 when s < 180 then 4 when s < 600 then 5 else 6 end b, count(*) n from (select greatest(span, dwell / 1000) s from sess) q group by 1) s), '[]'),
    'loyalty', coalesce((select jsonb_agg(jsonb_build_object('key', b, 'n', n) order by b) from (select case when v.sessions <= 1 then 1 when v.sessions <= 3 then 2 when v.sessions <= 9 then 3 else 4 end b, count(*) n from public.worker_insight_visitor v where v.visitor in (select distinct visitor from cur) group by 1) s), '[]')
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.worker_insight_report(date, date, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.worker_insight_report(date, date, text, text, text, text, text) to service_role;

/* who is on the site right now: visitors with a hit in the last 5 / 30 minutes, and the pages they are on */
create or replace function public.worker_insight_live()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'now5', (select count(distinct visitor) from public.worker_insight_hit where at > now() - interval '5 minutes'),
    'now30', (select count(distinct visitor) from public.worker_insight_hit where at > now() - interval '30 minutes'),
    'today', (select count(distinct visitor) from public.worker_insight_hit where day = (now() at time zone 'Europe/Athens')::date),
    'todayViews', (select count(*) from public.worker_insight_hit where kind = 'view' and day = (now() at time zone 'Europe/Athens')::date),
    'allTime', (select count(*) from public.worker_insight_visitor),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('key', path, 'n', n) order by n desc) from (select path, count(distinct visitor) n from public.worker_insight_hit where at > now() - interval '30 minutes' and kind = 'view' group by 1 order by 2 desc limit 10) p), '[]'),
    'places', coalesce((select jsonb_agg(jsonb_build_object('key', coalesce(city || ', ', '') || coalesce(country, '??'), 'n', n) order by n desc) from (select city, country, count(distinct visitor) n from public.worker_insight_hit where at > now() - interval '30 minutes' group by 1, 2 order by 3 desc limit 10) p), '[]'))
$$;
revoke all on function public.worker_insight_live() from public, anon, authenticated;
grant execute on function public.worker_insight_live() to service_role;

-- retention: raw rows older than 180 days go nightly (free tier, CLAUDE.md universe check 4)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'fanlife:insight-sweep';
    perform cron.schedule('fanlife:insight-sweep', '41 2 * * *', $q$delete from public.worker_insight_hit where day < (now() at time zone 'Europe/Athens')::date - 180$q$);
  end if;
end $$;
