-- =====================================================================
-- THE SHIRT HUB — "the rest of the world" (stage B of FANLIFE-PRIVACY-REST-OF-WORLD-PLAN-2026-10-09).
-- A shirt from ANY club can be listed without waiting for the club to enter the game, and without a made-up archive slug:
--   * worker_club_library        — clubs of the world: stable key, name, country, aliases, review status
--   * item: club_key / club_label / season_label / variant / maker, archive_slug becomes optional
--   * worker_club_search         — type-ahead over the library
--   * worker_world_have          — "I have one" for a shirt that is not in the archive
--   * query language: `scope` (game | world); club filter, facets and text now understand library clubs
-- Runs AFTER 20261009210000_worker_market_text_search.sql. worker_-prefixed, idempotent, nothing on auth.
-- Nothing is destroyed: every existing item keeps its slug, its id and its links.
-- =====================================================================

-- ---------------------------------------------------------------- 1. the library
create table if not exists public.worker_club_library (
  key        text primary key check (key ~ '^[a-z0-9]{2,30}$'),
  name       text not null check (char_length(name) between 2 and 60),
  country    text check (country is null or country ~ '^[A-Z]{2}$'),
  aliases    text[] not null default '{}',
  -- review: entered by a collector, not yet checked · market: known club, listed in the market · active: also in the game
  status     text not null default 'market' check (status in ('review', 'market', 'active')),
  merged_into text references public.worker_club_library(key),
  created_at timestamptz not null default now()
);
alter table public.worker_club_library enable row level security;
revoke all on public.worker_club_library from anon, authenticated;

-- ---------------------------------------------------------------- 2. an item may belong to a club without an archive shirt
alter table public.worker_collector_item alter column archive_slug drop not null;
alter table public.worker_collector_item add column if not exists club_key text;
alter table public.worker_collector_item add column if not exists club_label text;
alter table public.worker_collector_item add column if not exists season_label text;
alter table public.worker_collector_item add column if not exists variant text;
alter table public.worker_collector_item add column if not exists maker text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_item_world_chk') then
    alter table public.worker_collector_item add constraint worker_collector_item_world_chk check (
      (archive_slug is not null or club_key is not null)
      and (club_label is null or char_length(club_label) between 2 and 60)
      and (season_label is null or char_length(season_label) between 2 and 20)
      and (variant is null or variant in ('home', 'away', 'third', 'goalkeeper', 'training', 'special', 'other'))
      and (maker is null or char_length(maker) between 1 and 30));
  end if;
end $$;
create index if not exists worker_collector_item_world_idx
  on public.worker_collector_item (club_key, state) where archive_slug is null;

/* a slug with no shirt behind it belongs to no club — it used to fall through to Hapoel Tel Aviv */
create or replace function public.worker_slug_club(p_slug text) returns text
language sql immutable as $$
  select case when p_slug is null then null
              when position('--' in p_slug) > 1 then split_part(p_slug, '--', 1)
              else 'hapoeltelaviv' end
$$;

/* the club of a copy: the library club it was listed under, or the club its archive shirt belongs to */
create or replace function public.worker_item_club(i public.worker_collector_item) returns text
language sql stable set search_path = public as $$
  select coalesce(i.club_key, public.worker_slug_club(i.archive_slug))
$$;
/* name + aliases + country of the library club, as one lowercase string for text search */
create or replace function public.worker_item_club_text(i public.worker_collector_item) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select lower(l.name || ' ' || array_to_string(l.aliases, ' ')) from public.worker_club_library l where l.key = i.club_key), '')
$$;

-- ---------------------------------------------------------------- 3. the public face says what is known — and what is not
create or replace function public.worker_item_public(p_item public.worker_collector_item) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_item.id,
    'archiveSlug', p_item.archive_slug,
    'kitId', p_item.kit_id,
    'size', p_item.size,
    'condition', p_item.condition,
    'itemType', p_item.item_type,
    'authenticityClaim', p_item.authenticity_claim,
    'playerName', p_item.player_name,
    'playerNumber', p_item.player_number,
    'personalization', p_item.personalization_notes,
    'description', p_item.description,
    'forTrade', p_item.for_trade,
    'forSale', p_item.for_sale,
    'askingPrice', p_item.asking_price,
    'currency', p_item.currency,
    'openToOffers', p_item.open_to_offers,
    'delivery', p_item.delivery,
    'shipScope', p_item.ship_scope,
    'state', p_item.state,
    'photos', public.worker_item_photos(p_item.id),
    'openedAt', p_item.opened_at,
    'seller', public.worker_collector_label(p_item.user_id),
    'world', case when p_item.archive_slug is null then (
        select jsonb_build_object(
          'clubKey', p_item.club_key,
          'club', coalesce(l.name, p_item.club_label),
          'country', l.country,
          'season', p_item.season_label,
          'variant', p_item.variant,
          'maker', p_item.maker,
          'checked', coalesce(l.status in ('market', 'active'), false))
        from (select 1) x left join public.worker_club_library l on l.key = p_item.club_key) end
  )
$$;

-- ---------------------------------------------------------------- 4. type-ahead over the library
create or replace function public.worker_club_search(p_q text default '', p_limit integer default 8) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_t text := lower(btrim(regexp_replace(coalesce(p_q, ''), '[^a-z0-9֐-׿ ]+', ' ', 'gi')));
  v_c text := replace(v_t, ' ', '');
begin
  return jsonb_build_object('ok', true, 'clubs', coalesce((
    select jsonb_agg(jsonb_build_object('key', l.key, 'name', l.name, 'country', l.country, 'checked', l.status <> 'review')
                     order by (lower(l.name) = v_t) desc, (lower(l.name) like v_t || '%') desc, l.name)
      from (select * from public.worker_club_library l
             where l.merged_into is null and (l.status <> 'review' or v_t = '')
               and (v_t = '' or lower(l.name) like '%' || v_t || '%'
                    or replace(lower(l.name), ' ', '') like '%' || v_c || '%'
                    or exists (select 1 from unnest(l.aliases) a where lower(a) like '%' || v_t || '%'))
             order by l.name limit least(greatest(coalesce(p_limit, 8), 1), 20)) l), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- 5. "I have one" — for a shirt the archive does not have
create or replace function public.worker_world_have(
  p_club_key text, p_club_name text, p_country text, p_season text default null, p_variant text default null, p_maker text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_key text;
  v_name text := nullif(btrim(coalesce(p_club_name, '')), '');
  v_season text := nullif(btrim(coalesce(p_season, '')), '');
  v_item public.worker_collector_item;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_variant is not null and p_variant not in ('home', 'away', 'third', 'goalkeeper', 'training', 'special', 'other') then return public.worker_fail('bad_value'); end if;
  if v_season is not null and char_length(v_season) not between 2 and 20 then return public.worker_fail('bad_value'); end if;
  if p_maker is not null and char_length(btrim(p_maker)) not between 1 and 30 then return public.worker_fail('bad_value'); end if;
  perform public.worker_collector_touch(v_me);
  if p_club_key is not null then
    select l.key into v_key from public.worker_club_library l where l.key = p_club_key;
    if v_key is null then return public.worker_fail('not_found'); end if;
  else
    -- a club that is not in the library yet: a candidate, flagged for review — no emblem, no link to the game
    if v_name is null or char_length(v_name) not between 2 and 60 then return public.worker_fail('bad_value'); end if;
    if p_country is not null and p_country !~ '^[A-Z]{2}$' then return public.worker_fail('bad_value'); end if;
    v_key := left(regexp_replace(lower(v_name), '[^a-z0-9]+', '', 'g'), 30);
    if char_length(v_key) < 2 then v_key := 'club' || substr(md5(v_name), 1, 8); end if;
    -- the same name (or one an existing club answers to) is the same club
    select l.key into v_key from public.worker_club_library l
     where l.key = v_key or lower(l.name) = lower(v_name) or exists (select 1 from unnest(l.aliases) a where lower(a) = lower(v_name))
     order by (l.key = v_key) desc limit 1;
    if v_key is null then
      v_key := left(regexp_replace(lower(v_name), '[^a-z0-9]+', '', 'g'), 30);
      if char_length(v_key) < 2 then v_key := 'club' || substr(md5(v_name), 1, 8); end if;
      insert into public.worker_club_library (key, name, country, status) values (v_key, v_name, p_country, 'review')
        on conflict (key) do nothing;
    end if;
  end if;
  if (select count(*) from public.worker_collector_item where user_id = v_me and state <> 'removed') >= 600 then
    return public.worker_fail('closet_full');
  end if;
  if not public.worker_rate_ok(v_me, 'have_world', 60, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  insert into public.worker_collector_item (user_id, club_key, club_label, season_label, variant, maker)
    values (v_me, v_key, case when v_name is not null then left(v_name, 60) end, v_season, p_variant, nullif(btrim(coalesce(p_maker, '')), ''))
    returning * into v_item;
  return jsonb_build_object('ok', true, 'created', true, 'item', public.worker_item_owner(v_item));
end $$;

-- ---------------------------------------------------------------- 6. the query language and the search: library clubs, scope
create or replace function public.worker_market_q(p jsonb) returns jsonb
language plpgsql immutable as $$
declare
  r jsonb := '{}'::jsonb;
  v text[];
  t text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return r; end if;
  v := public.worker_q_arr(p, 'slugs', '^[a-z0-9][a-z0-9-]{2,63}$', 400);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('slugs', to_jsonb(v)); end if;
  v := public.worker_q_arr(p, 'clubs', '^[a-z0-9]{2,30}$', 40);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('clubs', to_jsonb(v)); end if;
  v := public.worker_q_arr(p, 'countries', '^[A-Z]{2}$', 12);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('countries', to_jsonb(v)); end if;
  v := public.worker_q_arr(p, 'cities', '^[a-z0-9-]{1,40}$', 12);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('cities', to_jsonb(v)); end if;
  if p ->> 'reach' ~ '^[A-Z]{2}$' then r := r || jsonb_build_object('reach', p ->> 'reach'); end if;
  v := public.worker_q_arr(p, 'kinds', '^(sale|trade)$', 2);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('kinds', to_jsonb(v)); end if;
  v := public.worker_q_arr(p, 'sizes', '^(kids|xs|s|m|l|xl|xxl|xxxl)$', 8);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('sizes', to_jsonb(v)); end if;
  v := public.worker_q_arr(p, 'conditions', '^(mint|excellent|good|worn|damaged)$', 5);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('conditions', to_jsonb(v)); end if;
  v := public.worker_q_arr(p, 'itemTypes', '^(original_period|official_reissue|replica|fan_reproduction|unknown)$', 5);
  if array_length(v, 1) > 0 then r := r || jsonb_build_object('itemTypes', to_jsonb(v)); end if;
  -- free text (T04): words only, lower-cased, 40 characters in all
  t := lower(btrim(regexp_replace(coalesce(p ->> 'text', ''), '[^a-z0-9\u0590-\u05ff ]+', ' ', 'gi')));
  t := left(regexp_replace(t, '\s+', ' ', 'g'), 40);
  if char_length(t) >= 2 then r := r || jsonb_build_object('text', t); end if;
  if p ->> 'scope' in ('game', 'world') then r := r || jsonb_build_object('scope', p ->> 'scope'); end if;
  if p ->> 'delivery' in ('local', 'ship') then r := r || jsonb_build_object('delivery', p ->> 'delivery'); end if;
  if jsonb_typeof(p -> 'maxPrice') = 'number' and (p ->> 'maxPrice')::numeric > 0 then
    r := r || jsonb_build_object('maxPrice', least((p ->> 'maxPrice')::numeric, 1000000),
                                 'currency', case when p ->> 'currency' in ('ILS', 'EUR', 'USD') then p ->> 'currency' else 'EUR' end);
  end if;
  return r;
end $$;

/* does a copy fit a (cleaned) query — the ONE predicate search, facets and saved-search alerts share */
create or replace function public.worker_item_matches(i public.worker_collector_item, q jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select (not q ? 'text' or not exists (
            -- every word must appear in the slug (club + season + kit), the player, the notes or the description;
            -- the compact form lets "maccabi haifa" find the club key "maccabihaifa"
            select 1 from unnest(string_to_array(q ->> 'text', ' ')) w
             where w <> '' and not (
               position(w in lower(replace(coalesce(i.archive_slug, ''), '-', ' ') || ' ' || coalesce(i.player_name, '') || ' '
                                   || coalesce(i.personalization_notes, '') || ' ' || coalesce(i.description, '') || ' '
                                   || coalesce(i.club_label, '') || ' ' || coalesce(i.season_label, '') || ' ' || coalesce(i.variant, '') || ' '
                                   || coalesce(i.maker, '') || ' ' || public.worker_item_club_text(i))) > 0
               or position(w in replace(lower(coalesce(i.archive_slug, '') || coalesce(i.club_label, '') || public.worker_item_club_text(i)), '-', '')) > 0)))
     and (not q ? 'scope' or (q ->> 'scope' = 'world') = (i.archive_slug is null))
     and (not q ? 'slugs' or i.archive_slug in (select jsonb_array_elements_text(q -> 'slugs')))
     and (not q ? 'clubs' or public.worker_item_club(i) in (select jsonb_array_elements_text(q -> 'clubs')))
     -- a place is only ever matched for collectors who chose to show it
     and (not q ? 'countries' or exists (select 1 from public.worker_collector_profile c
            where c.user_id = i.user_id and c.show_place and c.country in (select jsonb_array_elements_text(q -> 'countries'))))
     and (not q ? 'cities' or exists (select 1 from public.worker_collector_profile c
            where c.user_id = i.user_id and c.show_place and c.city_key in (select jsonb_array_elements_text(q -> 'cities'))))
     and (not q ? 'reach' or public.worker_item_reaches(i, q ->> 'reach'))
     and (not q ? 'kinds' or ((q -> 'kinds') ? 'sale' and i.for_sale) or ((q -> 'kinds') ? 'trade' and i.for_trade))
     and (not q ? 'sizes' or i.size in (select jsonb_array_elements_text(q -> 'sizes')))
     and (not q ? 'conditions' or i.condition in (select jsonb_array_elements_text(q -> 'conditions')))
     and (not q ? 'itemTypes' or i.item_type in (select jsonb_array_elements_text(q -> 'itemTypes')))
     and (not q ? 'delivery' or i.delivery in ('both', q ->> 'delivery'))
     -- a price filter hides copies priced above it, and copies in another currency (no conversion is invented);
     -- a swap-only copy has no price and stays
     and (not q ? 'maxPrice' or i.asking_price is null
          or (i.currency = q ->> 'currency' and i.asking_price <= (q ->> 'maxPrice')::numeric))
$$;


create or replace function public.worker_market_search(
  p_query jsonb default '{}'::jsonb, p_limit integer default 24, p_after_at timestamptz default null, p_after_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_q jsonb := public.worker_market_q(p_query);
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_rows jsonb;
  v_count integer;
  v_last record;
  v_next jsonb := null;
begin
  select coalesce(jsonb_agg(public.worker_item_public(i) || jsonb_build_object('mine', i.user_id = auth.uid())
                            order by coalesce(i.opened_at, 'epoch'::timestamptz) desc, i.id desc), '[]'::jsonb),
         count(*)
    into v_rows, v_count
  from (
    select * from public.worker_collector_item i
     where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q)
       and (p_after_id is null
            or (coalesce(i.opened_at, 'epoch'::timestamptz), i.id) < (coalesce(p_after_at, 'epoch'::timestamptz), p_after_id))
     order by coalesce(i.opened_at, 'epoch'::timestamptz) desc, i.id desc
     limit v_limit
  ) i;

  -- a next page exists only if one more copy sits beyond the last one returned
  if v_count = v_limit then
    select i.opened_at, i.id into v_last from (
      select * from public.worker_collector_item i
       where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q)
         and (p_after_id is null
              or (coalesce(i.opened_at, 'epoch'::timestamptz), i.id) < (coalesce(p_after_at, 'epoch'::timestamptz), p_after_id))
       order by coalesce(i.opened_at, 'epoch'::timestamptz) desc, i.id desc
       limit v_limit) i
     order by coalesce(i.opened_at, 'epoch'::timestamptz) asc, i.id asc limit 1;
    if exists (select 1 from public.worker_collector_item i
                where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q)
                  and (coalesce(i.opened_at, 'epoch'::timestamptz), i.id)
                      < (coalesce(v_last.opened_at, 'epoch'::timestamptz), v_last.id)) then
      v_next := jsonb_build_object('at', v_last.opened_at, 'id', v_last.id);
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'query', v_q,
    'items', v_rows,
    'next', v_next,
    'facets', jsonb_build_object(
      'total', (select count(*) from public.worker_collector_item i
                 where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q)),
      'sale', (select count(*) from public.worker_collector_item i
                where public.worker_item_visible(i, auth.uid()) and i.for_sale and public.worker_item_matches(i, v_q - 'kinds')),
      'trade', (select count(*) from public.worker_collector_item i
                 where public.worker_item_visible(i, auth.uid()) and i.for_trade and public.worker_item_matches(i, v_q - 'kinds')),
      'sizes', coalesce((select jsonb_object_agg(s.size, s.c) from (
                 select i.size, count(*) c from public.worker_collector_item i
                  where public.worker_item_visible(i, auth.uid()) and i.size is not null and public.worker_item_matches(i, v_q - 'sizes')
                  group by i.size) s), '{}'::jsonb),
      'conditions', coalesce((select jsonb_object_agg(s.condition, s.c) from (
                 select i.condition, count(*) c from public.worker_collector_item i
                  where public.worker_item_visible(i, auth.uid()) and i.condition is not null and public.worker_item_matches(i, v_q - 'conditions')
                  group by i.condition) s), '{}'::jsonb),
      'itemTypes', coalesce((select jsonb_object_agg(s.item_type, s.c) from (
                 select i.item_type, count(*) c from public.worker_collector_item i
                  where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q - 'itemTypes')
                  group by i.item_type) s), '{}'::jsonb),
      'clubs', coalesce((select jsonb_object_agg(s.club, s.c) from (
                 select public.worker_item_club(i) club, count(*) c from public.worker_collector_item i
                  where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q - 'clubs')
                  group by 1) s), '{}'::jsonb),
      'countries', coalesce((select jsonb_object_agg(s.country, s.c) from (
                 select c.country, count(*) c from public.worker_collector_item i
                  join public.worker_collector_profile c on c.user_id = i.user_id and c.show_place and c.country is not null
                  where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q - 'countries')
                  group by c.country) s), '{}'::jsonb),
      'scope', jsonb_build_object(
                 'game', (select count(*) from public.worker_collector_item i
                           where public.worker_item_visible(i, auth.uid()) and i.archive_slug is not null and public.worker_item_matches(i, v_q - 'scope')),
                 'world', (select count(*) from public.worker_collector_item i
                            where public.worker_item_visible(i, auth.uid()) and i.archive_slug is null and public.worker_item_matches(i, v_q - 'scope'))),
      'reachable', (select count(*) from public.worker_collector_item i
                     where v_q ? 'reach' and public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q)),
      'slugs', coalesce((select jsonb_object_agg(s.archive_slug, s.c) from (
                 select i.archive_slug, count(*) c from public.worker_collector_item i
                  where i.archive_slug is not null and public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q - 'slugs')
                  group by i.archive_slug) s), '{}'::jsonb)
    )
  );
end $$;


-- ---------------------------------------------------------------- 7. the library, seeded with clubs of the world
insert into public.worker_club_library (key, name, country, aliases) values
('acmilan','AC Milan','IT','{Milan,"A.C. Milan"}'),('inter','Inter Milan','IT','{Internazionale,"FC Internazionale",Inter}'),('juventus','Juventus','IT','{Juve}'),
('napoli','Napoli','IT','{"SSC Napoli"}'),('asroma','AS Roma','IT','{Roma}'),('lazio','Lazio','IT','{"SS Lazio"}'),('fiorentina','Fiorentina','IT','{"ACF Fiorentina"}'),
('atalanta','Atalanta','IT','{}'),('torino','Torino','IT','{}'),('sampdoria','Sampdoria','IT','{}'),('genoa','Genoa','IT','{}'),('parma','Parma','IT','{}'),
('realmadrid','Real Madrid','ES','{Madrid}'),('barcelona','Barcelona','ES','{"FC Barcelona",Barca,Barça}'),('atleticomadrid','Atletico Madrid','ES','{"Atlético Madrid",Atleti}'),
('sevilla','Sevilla','ES','{"Sevilla FC"}'),('valencia','Valencia','ES','{"Valencia CF"}'),('villarreal','Villarreal','ES','{}'),('realbetis','Real Betis','ES','{Betis}'),
('athleticbilbao','Athletic Bilbao','ES','{"Athletic Club"}'),('realsociedad','Real Sociedad','ES','{}'),('deportivolacoruna','Deportivo La Coruna','ES','{Depor,"Deportivo de La Coruña"}'),
('manchesterunited','Manchester United','GB','{"Man United","Man Utd",MUFC}'),('manchestercity','Manchester City','GB','{"Man City",MCFC}'),('liverpool','Liverpool','GB','{LFC}'),
('arsenal','Arsenal','GB','{AFC}'),('chelsea','Chelsea','GB','{CFC}'),('tottenham','Tottenham Hotspur','GB','{Spurs,Tottenham}'),('everton','Everton','GB','{}'),
('newcastleunited','Newcastle United','GB','{Newcastle}'),('westham','West Ham United','GB','{"West Ham"}'),('astonvilla','Aston Villa','GB','{Villa}'),('leedsunited','Leeds United','GB','{Leeds}'),
('nottinghamforest','Nottingham Forest','GB','{Forest}'),('celtic','Celtic','GB','{"Celtic FC"}'),('rangers','Rangers','GB','{"Glasgow Rangers"}'),('aberdeen','Aberdeen','GB','{}'),
('bayernmunich','Bayern Munich','DE','{"FC Bayern","Bayern München"}'),('borussiadortmund','Borussia Dortmund','DE','{Dortmund,BVB}'),('schalke04','Schalke 04','DE','{Schalke}'),
('bayerleverkusen','Bayer Leverkusen','DE','{Leverkusen}'),('werderbremen','Werder Bremen','DE','{Bremen}'),('hamburgersv','Hamburger SV','DE','{HSV,Hamburg}'),
('borussiamonchengladbach','Borussia Monchengladbach','DE','{Gladbach,"Borussia Mönchengladbach"}'),('eintrachtfrankfurt','Eintracht Frankfurt','DE','{Frankfurt}'),('vfbstuttgart','VfB Stuttgart','DE','{Stuttgart}'),
('stpauli','St. Pauli','DE','{"FC St. Pauli","St Pauli"}'),('unionberlin','Union Berlin','DE','{"1. FC Union Berlin"}'),('herthabsc','Hertha BSC','DE','{Hertha}'),
('parissaintgermain','Paris Saint-Germain','FR','{PSG,"Paris SG"}'),('olympiquemarseille','Olympique de Marseille','FR','{Marseille,OM}'),('olympiquelyonnais','Olympique Lyonnais','FR','{Lyon,OL}'),
('asmonaco','AS Monaco','FR','{Monaco}'),('lille','Lille','FR','{LOSC}'),('staderennais','Stade Rennais','FR','{Rennes}'),('saintetienne','Saint-Etienne','FR','{"AS Saint-Étienne",ASSE}'),('nantes','Nantes','FR','{}'),
('ajax','Ajax','NL','{"AFC Ajax"}'),('psveindhoven','PSV Eindhoven','NL','{PSV}'),('feyenoord','Feyenoord','NL','{}'),('az','AZ Alkmaar','NL','{AZ}'),
('benfica','Benfica','PT','{"SL Benfica"}'),('fcporto','FC Porto','PT','{Porto}'),('sportingcp','Sporting CP','PT','{Sporting,"Sporting Lisbon"}'),('bragasc','Braga','PT','{"SC Braga"}'),
('galatasaray','Galatasaray','TR','{}'),('fenerbahce','Fenerbahce','TR','{"Fenerbahçe"}'),('besiktas','Besiktas','TR','{"Beşiktaş"}'),('trabzonspor','Trabzonspor','TR','{}'),
('panathinaikos','Panathinaikos','GR','{}'),('olympiacos','Olympiacos','GR','{"Olympiakos"}'),('aekathens','AEK Athens','GR','{AEK}'),('paok','PAOK','GR','{"PAOK Thessaloniki"}'),
('maccabitelaviv','Maccabi Tel Aviv','IL','{"Maccabi TA"}'),('maccabihaifa','Maccabi Haifa','IL','{}'),('hapoelbeersheva','Hapoel Beer Sheva','IL','{"Hapoel Be''er Sheva"}'),('betarjerusalem','Beitar Jerusalem','IL','{Betar,"Beitar Yerushalayim"}'),
('hapoelhaifa','Hapoel Haifa','IL','{}'),('maccabinetanya','Maccabi Netanya','IL','{}'),('hapoeljerusalem','Hapoel Jerusalem','IL','{}'),('bneisakhnin','Bnei Sakhnin','IL','{}'),
('redstarbelgrade','Red Star Belgrade','RS','{"Crvena Zvezda","Crvena zvezda"}'),('partizan','Partizan','RS','{"Partizan Belgrade"}'),('dinamozagreb','Dinamo Zagreb','HR','{}'),('hajduksplit','Hajduk Split','HR','{Hajduk}'),
('steauabucuresti','Steaua Bucuresti','RO','{FCSB,Steaua}'),('dinamobucuresti','Dinamo Bucuresti','RO','{}'),('slaviapraha','Slavia Praha','CZ','{"Slavia Prague"}'),('spartapraha','Sparta Praha','CZ','{"Sparta Prague"}'),
('legiawarszawa','Legia Warszawa','PL','{"Legia Warsaw"}'),('lechpoznan','Lech Poznan','PL','{"Lech Poznań"}'),('ferencvaros','Ferencvaros','HU','{"Ferencváros",FTC}'),('dynamokyiv','Dynamo Kyiv','UA','{"Dynamo Kiev"}'),
('shakhtardonetsk','Shakhtar Donetsk','UA','{Shakhtar}'),('spartakmoscow','Spartak Moscow','RU','{}'),('zenit','Zenit','RU','{"Zenit St Petersburg"}'),('cskamoscow','CSKA Moscow','RU','{}'),
('rbsalzburg','RB Salzburg','AT','{"Red Bull Salzburg",Salzburg}'),('rapidvienna','Rapid Vienna','AT','{"Rapid Wien"}'),('austriawien','Austria Wien','AT','{"Austria Vienna"}'),
('clubbrugge','Club Brugge','BE','{Brugge}'),('anderlecht','Anderlecht','BE','{"RSC Anderlecht"}'),('standardliege','Standard Liege','BE','{"Standard Liège"}'),('basel','FC Basel','CH','{Basel}'),
('youngboys','Young Boys','CH','{BSC}'),('fckobenhavn','FC Copenhagen','DK','{"FC København"}'),('malmoff','Malmo FF','SE','{"Malmö FF"}'),('aikfotboll','AIK','SE','{}'),('rosenborg','Rosenborg','NO','{}'),
('boca','Boca Juniors','AR','{Boca}'),('riverplate','River Plate','AR','{River}'),('independiente','Independiente','AR','{}'),('racingclub','Racing Club','AR','{}'),
('flamengo','Flamengo','BR','{}'),('corinthians','Corinthians','BR','{}'),('palmeiras','Palmeiras','BR','{}'),('santos','Santos','BR','{}'),('saopaulo','Sao Paulo','BR','{"São Paulo"}'),
('gremio','Gremio','BR','{"Grêmio"}'),('cruzeiro','Cruzeiro','BR','{}'),('penarol','Penarol','UY','{"Peñarol"}'),('nacional','Nacional','UY','{"Club Nacional"}'),
('colocolo','Colo-Colo','CL','{"Colo Colo"}'),('americamexico','Club America','MX','{"Club América"}'),('guadalajara','Chivas','MX','{"Chivas Guadalajara"}'),('lagalaxy','LA Galaxy','US','{Galaxy}'),
('intermiami','Inter Miami','US','{}'),('seattlesounders','Seattle Sounders','US','{Sounders}'),('newyorkcosmos','New York Cosmos','US','{Cosmos}'),
('alahly','Al Ahly','EG','{}'),('zamalek','Zamalek','EG','{}'),('kaizerchiefs','Kaizer Chiefs','ZA','{}'),('orlandopirates','Orlando Pirates','ZA','{}'),
('alhilal','Al Hilal','SA','{}'),('alnassr','Al Nassr','SA','{}'),('urawareds','Urawa Red Diamonds','JP','{"Urawa Reds"}'),('kashimaantlers','Kashima Antlers','JP','{}'),
('shimizuspulse','Shimizu S-Pulse','JP','{}'),('seoul','FC Seoul','KR','{}'),('guangzhouevergrande','Guangzhou Evergrande','CN','{}'),('sydneyfc','Sydney FC','AU','{}')
  on conflict (key) do nothing;

-- ---------------------------------------------------------------- 8. grants
do $grants$
declare v_fn record;
begin
  for v_fn in select p.oid::regprocedure::text as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname in ('worker_club_search', 'worker_world_have', 'worker_item_club', 'worker_item_club_text')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = 'worker_club_search' then execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    elsif v_fn.proname = 'worker_world_have' then execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
  revoke all on function public.worker_item_public(public.worker_collector_item) from public, anon, authenticated;
  revoke all on function public.worker_slug_club(text) from public, anon, authenticated;
end
$grants$;
