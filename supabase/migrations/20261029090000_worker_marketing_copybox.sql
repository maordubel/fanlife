-- FAN LIFE social plan v4 (owner, 29.10.2026): "easier text, smarter tags, real copy-paste".
-- marketing.render() writes the caption into a <pre> block (one-tap copy in Telegram) and the first comment into a
-- second one; the hook is no longer printed twice and the "Visual:" line is gone (the picture is sent just before).
-- Every other part of the function (fixture pick, variants, url) is the 20261027090000 version, unchanged.
create or replace function marketing.render(p_id bigint)
returns table (msg text, fixture_id text)
language plpgsql stable security definer set search_path = '' as $$
declare
  p marketing.posts; m jsonb; it jsonb; fmt text; fx record; local_day date;
  day_start timestamptz; url text; body text; hook text; caption text; used text[]; total int; ko text; slug text;
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

  -- v4 (owner, 29.10.2026): a short header, the caption in a <pre> copy box (Telegram copies a block in one tap),
  -- and the first comment in a second box when the post has one. Smart tags travel with the post (main->'tags').
  caption := left(hook || E'\n\n' || body || E'\n\n👉 ' || url || E'\n\n'
             || coalesce(it->>'tags', m->'tags'->>(it->>'app'), '#FANLIFE'), 2200);
  msg := '📅 <b>' || to_char(p.send_at at time zone 'Asia/Jerusalem', 'Dy DD.MM · HH24:MI') || '</b>'
      -- marketing.esc() turns null into '', so every optional line is guarded by its own field, not by coalesce
      || case when it->>'label' is not null then ' · ' || marketing.esc(it->>'label') else '' end
      || E'\n📌 ' || marketing.esc(m->'format_he'->>fmt) || ' · <b>' || marketing.esc(m->'names'->>(it->>'app')) || '</b> · '
      || marketing.esc(m->'platform'->>fmt)
      || case when fx.fixture_id is not null then E'\n⚽ Real match: ' || marketing.esc(fx.home || ' – ' || fx.away)
              || ' · ' || to_char(fx.kickoff at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI') else '' end
      || case when it->>'how' is not null then E'\n🎬 ' || marketing.esc(it->>'how') else '' end
      || E'\n\n👇 <b>Caption</b> — tap the box to copy\n<pre>' || marketing.esc(caption) || '</pre>'
      || case when coalesce(it->>'comment', '') <> '' then E'\n💬 <b>' || marketing.esc(coalesce(it->>'comment_label', 'First comment'))
              || '</b> — tap to copy\n<pre>' || marketing.esc(left(it->>'comment', 900)) || '</pre>' else '' end;
  fixture_id := fx.fixture_id;
  return next;
end $$;
revoke all on function marketing.render(bigint) from public, anon, authenticated;
