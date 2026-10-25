-- The real match of the moment (core.fixtures, read-only) and the Telegram message for one post.
-- Team names print in Hebrew (core.teams.name_he); matching uses name_en.

drop function if exists marketing.pick_fixture(timestamptz, timestamptz, text[]);
create function marketing.pick_fixture(p_from timestamptz, p_to timestamptz, p_exclude text[] default '{}')
returns table (fixture_id text, home text, away text, league text, kickoff timestamptz, cat text, is_derby boolean, home_he text, away_he text)
language sql stable security definer set search_path = '' as $$
  with m as (select value from marketing.settings where key = 'meta'),
  f as (
    select fx.id::text fid, h.name_en home, a.name_en away,
           coalesce(l.names->'he'->>'full', l.names->'en'->>'full') league, fx.kickoff_at,
           coalesce(nullif(h.name_he,''), h.name_en) home_he, coalesce(nullif(a.name_he,''), a.name_en) away_he,
           (l.names->'en'->>'full') league_en
    from core.fixtures fx
    join core.teams h on h.id = fx.home_team_id
    join core.teams a on a.id = fx.away_team_id
    left join core.leagues l on l.id = fx.league_id
    where fx.kickoff_at >= p_from and fx.kickoff_at < p_to
      and not (fx.id::text = any(p_exclude))
  ),
  s as (
    select f.*,
      case when (m.value->'clubs') ? f.home or (m.value->'clubs') ? f.away then 'club'
           when f.league_en = 'Israeli Premier League' then 'il' else 'big' end as cat,
      exists (select 1 from jsonb_array_elements(m.value->'derby_pairs') p
              where (p->>0 = f.home and p->>1 = f.away) or (p->>0 = f.away and p->>1 = f.home)) as derby,
      ((m.value->'big_names') ? f.home)::int + ((m.value->'big_names') ? f.away)::int as bigs
    from f, m
  )
  select fid, home, away, league, kickoff_at, cat, derby, home_he, away_he from s
  order by derby desc, case cat when 'club' then 3 when 'il' then 2 else 1 end desc, bigs desc, kickoff_at
  limit 1
$$;

create or replace function marketing.render(p_id bigint)
returns table (msg text, fixture_id text)
language plpgsql stable security definer set search_path = '' as $$
declare
  p marketing.posts; m jsonb; it jsonb; fmt text; fx record; local_day date;
  day_start timestamptz; url text; body text; hook text; used text[]; total int; ko text; slug text;
begin
  select * into p from marketing.posts where id = p_id;
  select value into m from marketing.settings where key = 'meta';
  select max(x.day) into total from marketing.posts x;
  local_day := (p.send_at at time zone 'Asia/Jerusalem')::date;
  day_start := local_day::timestamp at time zone 'Asia/Jerusalem';
  select coalesce(array_agg(x.fixture_id), '{}') into used from marketing.posts x
   where x.fixture_id is not null and x.send_at >= day_start and x.send_at < p.send_at;
  fmt := p.format; it := p.main;

  if p.kind = 'pre' then
    select * into fx from marketing.pick_fixture(p.send_at - interval '10 minutes', day_start + interval '24 hours', used);
  elsif p.kind = 'live' then
    select * into fx from marketing.pick_fixture(p.send_at - interval '45 minutes', p.send_at + interval '75 minutes', used);
  elsif p.kind = 'night' then
    select * into fx from marketing.pick_fixture(day_start, day_start + interval '24 hours') pf where pf.is_derby;
  end if;

  if p.kind in ('pre','live') then
    if fx.fixture_id is not null then it := p.variants -> fx.cat;
    else it := p.fallback; fmt := coalesce(p.fallback_format, p.format); end if;
  elsif p.kind = 'night' and fx.fixture_id is not null then
    it := p.fallback;                                  -- Israeli derby night → FUCK YOU
  end if;

  url := coalesce(m->'urls'->>(it->>'app'), m->'urls'->>'fanlife');
  if it->>'app' = 'fanlife' and fx.fixture_id is not null and fx.cat = 'club' then
    slug := coalesce(m->'clubs'->>fx.home, m->'clubs'->>fx.away);
    if slug is not null then url := url || '/clubs/' || slug; end if;
  end if;

  hook := it->>'hook'; body := it->>'body';
  if fx.fixture_id is not null then
    ko := to_char(fx.kickoff at time zone 'Asia/Jerusalem', 'HH24:MI');
    hook := replace(replace(replace(replace(hook, '{home}', fx.home_he), '{away}', fx.away_he), '{league}', coalesce(fx.league,'')), '{kickoff}', ko);
    body := replace(replace(replace(replace(body, '{home}', fx.home_he), '{away}', fx.away_he), '{league}', coalesce(fx.league,'')), '{kickoff}', ko);
  end if;

  msg := '🗓 <b>' || case when p.day = 0 then 'השקה' else 'יום ' || p.day || '/' || total end
      || ' · ' || to_char(p.send_at at time zone 'Asia/Jerusalem', 'DD.MM · HH24:MI') || '</b>'
      || E'\n📌 ' || marketing.esc(m->'format_he'->>fmt) || ' · <b>' || marketing.esc(m->'names'->>(it->>'app')) || '</b>'
      || E'\n📱 ' || marketing.esc(m->'platform'->>fmt)
      || case when fx.fixture_id is not null then E'\n⚽ משחק אמיתי: ' || marketing.esc(fx.home_he || ' – ' || fx.away_he)
              || ' · ' || to_char(fx.kickoff at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI') else '' end
      || E'\n\n🪝 <b>HOOK</b>\n<b>' || marketing.esc(hook) || '</b>'
      || E'\n\n✍️ <b>הפוסט</b>\n' || marketing.esc(hook) || E'\n\n' || marketing.esc(body)
      || E'\n\n👉 ' || marketing.esc(url)
      || E'\n\n' || marketing.esc(m->'tags'->>(it->>'app'))
      || E'\n\n🎨 <i>ויזואל: ' || marketing.esc(it->>'visual') || '</i>';
  fixture_id := fx.fixture_id;
  return next;
end $$;
revoke all on all functions in schema marketing from public, anon, authenticated;
