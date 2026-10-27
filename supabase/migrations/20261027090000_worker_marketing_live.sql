-- FAN LIFE social plan v3 (owner, 27.10.2026): three voices, every post with a picture, live slots that speak only
-- when there is something real to say.
--   FAN LIFE  — the lead publisher (fixed plan) + its own matches and results (live: 'fixtures', 'results').
--   DUBID     — a round is open (live: 'dubid'), in DUBID's own branding.
--   OFFSIDES  — today's arenas (live: 'offsides'), in OFFSIDES' own branding.
-- A live row is a slot, not a post: the site composes it at send time from real data (worker_marketing_live_data,
-- the fixture feed) and records what it sent (worker_marketing_compose) — or skips it (worker_marketing_skip).
-- Server only (service role). Standalone; needs 20261026180000 first.

alter table marketing.posts drop constraint if exists posts_kind_check;
alter table marketing.posts add constraint posts_kind_check
  check (kind in ('fixed','pre','live','night','fixtures','results','dubid','offsides'));

-- DUBID and OFFSIDES speak as themselves now: no "on the FAN LIFE page" line, and DUBID's tags cover its leagues.
update marketing.settings set value = jsonb_set(value, '{tags,dubid}',
  '"#DUBID #FantasyFootball #IsraeliFootball #SuperLeagueGreece #DubelTeam"'::jsonb), updated_at = now()
 where key = 'meta';

-- The tick also hands over each post's kind and slot, so the site knows which posts it must compose.
create or replace function public.worker_marketing_tick(p_nonce uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nonce uuid; v_probe boolean; posts jsonb;
begin
  update marketing.ticks k set used_at = now()
   where k.nonce = p_nonce and k.used_at is null and k.made_at > now() - interval '3 minutes'
  returning k.nonce, k.probe into v_nonce, v_probe;
  if v_nonce is null then return jsonb_build_object('ok', false); end if;
  if v_probe then
    return jsonb_build_object('ok', true, 'probe', true,
      'chat_id', (select s.value->>'chat_id' from marketing.settings s where s.key = 'telegram'));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'chat_id', c.chat_id, 'msg', c.msg,
           'kit', p.main->'kit', 'kind', p.kind, 'send_at', p.send_at)), '[]'::jsonb)
    into posts from public.worker_marketing_claim(3) c join marketing.posts p on p.id = c.id;
  return jsonb_build_object('ok', true, 'posts', posts);
end $$;
revoke all on function public.worker_marketing_tick(uuid) from public, anon, authenticated;
grant execute on function public.worker_marketing_tick(uuid) to service_role;

-- The same, by id, for the GitHub backup path.
create or replace function public.worker_marketing_meta(p_ids bigint[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(p.id::text, jsonb_build_object('kit', p.main->'kit', 'kind', p.kind, 'send_at', p.send_at)), '{}'::jsonb)
    from marketing.posts p where p.id = any(p_ids) and p.status = 'sending'
$$;
revoke all on function public.worker_marketing_meta(bigint[]) from public, anon, authenticated;
grant execute on function public.worker_marketing_meta(bigint[]) to service_role;

-- What the live slots may talk about, read-only, at the moment of sending.
--   dubid    — rounds open now (status 'open', lock still ahead), with their league's English name
--   offsides — today's visible football matches (Israel day, not yet kicked off) and their live arenas
--   posted   — what earlier live posts already announced (a round, a match, a result is announced once)
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
        'arenas', (select count(*) from offsides.arenas a where a.match_id = m.id and not coalesce(a.archived, false)
                    and a.status not in ('cancelled','settled'))) x
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

-- A live slot that found something: the message as sent, and the refs it announced.
create or replace function public.worker_marketing_compose(p_id bigint, p_msg text, p_ref text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update marketing.posts p set rendered = left(p_msg, 4000), fixture_id = left(p_ref, 2000)
   where p.id = p_id and p.status = 'sending' and p.kind in ('fixtures','results','dubid','offsides');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
revoke all on function public.worker_marketing_compose(bigint, text, text) from public, anon, authenticated;
grant execute on function public.worker_marketing_compose(bigint, text, text) to service_role;

-- A live slot with nothing real to say stays quiet.
create or replace function public.worker_marketing_skip(p_id bigint, p_why text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update marketing.posts p set status = 'skipped', error = left(p_why, 300)
   where p.id = p_id and p.status = 'sending' and p.kind in ('fixtures','results','dubid','offsides');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
revoke all on function public.worker_marketing_skip(bigint, text) from public, anon, authenticated;
grant execute on function public.worker_marketing_skip(bigint, text) to service_role;

-- The message: DUBID and OFFSIDES posts no longer say "on the FAN LIFE page" (they speak in their own branding).
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
  -- give fx its shape even when no match is looked up (fixed posts): no rows → every field null
  select * into fx from marketing.pick_fixture('infinity'::timestamptz, 'infinity'::timestamptz);

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

  url := coalesce(it->>'url', m->'urls'->>(it->>'app'), m->'urls'->>'fanlife');
  if it->>'app' = 'fanlife' and fx.fixture_id is not null and fx.cat = 'club' then
    slug := coalesce(m->'clubs'->>fx.home, m->'clubs'->>fx.away);
    if slug is not null then url := url || '/clubs/' || slug; end if;
  end if;

  hook := it->>'hook'; body := it->>'body';
  if fx.fixture_id is not null then
    ko := to_char(fx.kickoff at time zone 'Asia/Jerusalem', 'HH24:MI');
    hook := replace(replace(replace(replace(hook, '{home}', fx.home), '{away}', fx.away), '{league}', coalesce(fx.league,'')), '{kickoff}', ko);
    body := replace(replace(replace(replace(body, '{home}', fx.home), '{away}', fx.away), '{league}', coalesce(fx.league,'')), '{kickoff}', ko);
  end if;

  msg := '🗓 <b>' || case when p.day = 0 then 'Launch day' else 'Day ' || p.day || '/' || total end
      || ' · ' || to_char(p.send_at at time zone 'Asia/Jerusalem', 'DD.MM · HH24:MI') || '</b>'
      || E'\n📌 ' || marketing.esc(m->'format_he'->>fmt) || ' · <b>' || marketing.esc(m->'names'->>(it->>'app')) || '</b>'
      || case when coalesce(it->>'app','fanlife') not in ('fanlife','all','dubid','offsides') then ' · on the FAN LIFE page' else '' end
      || E'\n📱 ' || marketing.esc(m->'platform'->>fmt)
      || case when fx.fixture_id is not null then E'\n⚽ Real match: ' || marketing.esc(fx.home || ' – ' || fx.away)
              || ' · ' || to_char(fx.kickoff at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI') else '' end
      || E'\n\n🪝 <b>HOOK</b>\n<b>' || marketing.esc(hook) || '</b>'
      || E'\n\n✍️ <b>POST</b>\n' || marketing.esc(hook) || E'\n\n' || marketing.esc(body)
      || E'\n\n👉 ' || marketing.esc(url)
      || E'\n\n' || marketing.esc(m->'tags'->>(it->>'app'))
      || E'\n\n🎨 <i>Visual: ' || marketing.esc(it->>'visual') || '</i>';
  fixture_id := fx.fixture_id;
  return next;
end $$;
revoke all on function marketing.render(bigint) from public, anon, authenticated;
