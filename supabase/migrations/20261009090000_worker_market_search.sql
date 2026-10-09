-- =====================================================================
-- THE SHIRT HUB — Wave 1: a market that can be searched, a wanted board, saved searches.
-- Everything here starts with worker_ (shared Supabase project with DUBID — rule 89); nothing touches auth.
-- Runs AFTER 20260922120000_worker_collector_market.sql. Idempotent: the verify script runs it twice.
--
--  1. item.delivery            — local / ship / both (the seller says how the shirt can travel)
--  2. want.*                   — a request can be public (shirt + size + mode + note), with a PRIVATE budget
--  3. worker_collector_search  — saved searches that notify when a matching shirt opens
--  4. worker_market_search     — server-side filters, facets, a stable keyset cursor (opened_at, id)
--  5. worker_wanted_list / worker_want_request / worker_want_respond / worker_wants_mine
-- =====================================================================

-- ---------------------------------------------------------------- 0. place, reach, and which club a shirt belongs to
-- A collector may say which country (and city) they are in. It is OPT-IN: until show_place is true the
-- country is used for nothing — not a filter, not a facet, not a label.
alter table public.worker_collector_profile add column if not exists country text;
alter table public.worker_collector_profile add column if not exists city text;
alter table public.worker_collector_profile add column if not exists city_key text;
alter table public.worker_collector_profile add column if not exists show_place boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_profile_place_chk') then
    alter table public.worker_collector_profile add constraint worker_collector_profile_place_chk check (
      (country is null or country ~ '^[A-Z]{2}$') and (city is null or char_length(city) between 1 and 40)
      and (city_key is null or city_key ~ '^[a-z0-9-]{1,40}$'));
  end if;
end $$;
-- how far a copy will travel: inside the seller's own country, or anywhere
alter table public.worker_collector_item add column if not exists ship_scope text not null default 'country';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_item_scope_chk') then
    alter table public.worker_collector_item add constraint worker_collector_item_scope_chk check (ship_scope in ('country', 'world'));
  end if;
end $$;

/* A shirt's club is the prefix of its catalogue slug: `olympiacos--1998-away` -> olympiacos.
   Hapoel Tel Aviv's photographed archive has plain slugs and no prefix. */
create or replace function public.worker_slug_club(p_slug text) returns text
language sql immutable as $$
  select case when position('--' in p_slug) > 1 then split_part(p_slug, '--', 1) else 'hapoeltelaviv' end
$$;

-- ---------------------------------------------------------------- 1. delivery
alter table public.worker_collector_item
  add column if not exists delivery text not null default 'both';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_item_delivery_chk') then
    alter table public.worker_collector_item
      add constraint worker_collector_item_delivery_chk check (delivery in ('local', 'ship', 'both'));
  end if;
end $$;
create index if not exists worker_collector_item_open_idx
  on public.worker_collector_item (opened_at desc, id desc) where state = 'held' and (for_sale or for_trade);

-- the public face of a copy now says how it can travel
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
    'seller', public.worker_collector_label(p_item.user_id)
  )
$$;


/* the public face of a collector: a number, a nickname if they chose one, their record — and a place, only if they opted in */
create or replace function public.worker_collector_label(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'handle', c.handle_no,
    'nickname', case when c.show_nickname then nullif(trim(p.display_name), '') end,
    'since', extract(year from p.since)::int,
    'completed', (select count(*) from public.worker_collector_connection k
                   where k.status = 'completed' and (k.initiator_id = p_user or k.recipient_id = p_user)),
    'trades', (select count(*) from public.worker_collector_connection k
                where k.status = 'completed' and k.kind = 'trade' and (k.initiator_id = p_user or k.recipient_id = p_user)),
    'sales', (select count(*) from public.worker_collector_connection k
               where k.status = 'completed' and k.kind = 'buy' and k.recipient_id = p_user),
    'items', (select count(*) from public.worker_collector_item i
               where i.user_id = p_user and i.state in ('held', 'reserved')),
    'place', case when c.show_place and c.country is not null
                  then jsonb_build_object('country', c.country, 'city', c.city) end
  )
  from public.worker_collector_profile c
  join public.worker_profile p on p.id = c.user_id
  where c.user_id = p_user
$$;

create or replace function public.worker_item_delivery_set(p_item uuid, p_delivery text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_delivery is null or p_delivery not in ('local', 'ship', 'both') then return public.worker_fail('bad_value'); end if;
  update public.worker_collector_item set delivery = p_delivery, updated_at = now()
   where id = p_item and user_id = v_me and state in ('held', 'reserved');
  if not found then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'delivery', p_delivery);
end $$;

create or replace function public.worker_item_reach_set(p_item uuid, p_scope text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_scope is null or p_scope not in ('country', 'world') then return public.worker_fail('bad_value'); end if;
  update public.worker_collector_item set ship_scope = p_scope, updated_at = now()
   where id = p_item and user_id = v_me and state in ('held', 'reserved');
  if not found then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'shipScope', p_scope);
end $$;

/* may this copy travel to a buyer in p_country — the seller must ship, and either ship worldwide or share the buyer's country (only if the seller shows their place) */
create or replace function public.worker_item_reaches(i public.worker_collector_item, p_country text) returns boolean
language sql stable security definer set search_path = public as $$
  select i.delivery in ('ship', 'both')
     and (i.ship_scope = 'world'
          or exists (select 1 from public.worker_collector_profile c
                      where c.user_id = i.user_id and c.show_place and c.country = p_country))
$$;

-- ---------------------------------------------------------------- 2. requests
alter table public.worker_collector_want add column if not exists mode text not null default 'any';
alter table public.worker_collector_want add column if not exists delivery text not null default 'both';
alter table public.worker_collector_want add column if not exists public_request boolean not null default false;
alter table public.worker_collector_want add column if not exists public_note text;
-- the budget is PRIVATE: no public function ever returns it
alter table public.worker_collector_want add column if not exists max_price numeric(10, 2);
alter table public.worker_collector_want add column if not exists currency text not null default 'EUR';
alter table public.worker_collector_want add column if not exists updated_at timestamptz not null default now();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_want_shape_chk') then
    alter table public.worker_collector_want add constraint worker_collector_want_shape_chk check (
      mode in ('buy', 'swap', 'any') and delivery in ('local', 'ship', 'both')
      and currency in ('ILS', 'EUR', 'USD')
      and (max_price is null or max_price > 0)
      and (public_note is null or char_length(public_note) <= 140));
  end if;
end $$;
create index if not exists worker_collector_want_public_idx
  on public.worker_collector_want (created_at desc, id desc) where public_request;

-- ---------------------------------------------------------------- 3. saved searches
create table if not exists public.worker_collector_search (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.worker_profile(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  query      jsonb not null,
  notify     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists worker_collector_search_user_idx on public.worker_collector_search (user_id);
alter table public.worker_collector_search enable row level security;
revoke all on public.worker_collector_search from anon, authenticated;

-- ---------------------------------------------------------------- 4. the query language
/* the elements of one array key that pass a regex, deduplicated, capped */
create or replace function public.worker_q_arr(p jsonb, p_key text, p_re text, p_max integer) returns text[]
language sql immutable as $$
  select coalesce(array(
    select distinct e from jsonb_array_elements_text(
      case when jsonb_typeof(p -> p_key) = 'array' then p -> p_key else '[]'::jsonb end) e
     where e ~ p_re limit p_max), '{}')
$$;

/* a query, cleaned: only the keys the market understands, only values that are real */
create or replace function public.worker_market_q(p jsonb) returns jsonb
language plpgsql immutable as $$
declare
  r jsonb := '{}'::jsonb;
  v text[];
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
  if p ->> 'delivery' in ('local', 'ship') then r := r || jsonb_build_object('delivery', p ->> 'delivery'); end if;
  if jsonb_typeof(p -> 'maxPrice') = 'number' and (p ->> 'maxPrice')::numeric > 0 then
    r := r || jsonb_build_object('maxPrice', least((p ->> 'maxPrice')::numeric, 1000000),
                                 'currency', case when p ->> 'currency' in ('ILS', 'EUR', 'USD') then p ->> 'currency' else 'EUR' end);
  end if;
  return r;
end $$;

/* may this viewer see this copy at all */
create or replace function public.worker_item_visible(i public.worker_collector_item, p_me uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select i.state = 'held' and (i.for_sale or i.for_trade)
     and (p_me is null or not public.worker_blocked(p_me, i.user_id))
$$;

/* does a copy fit a (cleaned) query — the ONE predicate search, facets and saved-search alerts share */
create or replace function public.worker_item_matches(i public.worker_collector_item, q jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select (not q ? 'slugs' or i.archive_slug in (select jsonb_array_elements_text(q -> 'slugs')))
     and (not q ? 'clubs' or public.worker_slug_club(i.archive_slug) in (select jsonb_array_elements_text(q -> 'clubs')))
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

/*
 * The market, searched on the server. Returns the page, the next cursor and the facet counts
 * (each dimension counted with every OTHER filter applied, so a chip says what choosing it would leave).
 * Newest first; the cursor is (opened_at, id), so a copy opened mid-scroll never repeats or skips.
 */
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
                 select public.worker_slug_club(i.archive_slug) club, count(*) c from public.worker_collector_item i
                  where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q - 'clubs')
                  group by 1) s), '{}'::jsonb),
      'countries', coalesce((select jsonb_object_agg(s.country, s.c) from (
                 select c.country, count(*) c from public.worker_collector_item i
                  join public.worker_collector_profile c on c.user_id = i.user_id and c.show_place and c.country is not null
                  where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q - 'countries')
                  group by c.country) s), '{}'::jsonb),
      'reachable', (select count(*) from public.worker_collector_item i
                     where v_q ? 'reach' and public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q)),
      'slugs', coalesce((select jsonb_object_agg(s.archive_slug, s.c) from (
                 select i.archive_slug, count(*) c from public.worker_collector_item i
                  where public.worker_item_visible(i, auth.uid()) and public.worker_item_matches(i, v_q - 'slugs')
                  group by i.archive_slug) s), '{}'::jsonb)
    )
  );
end $$;

-- ---------------------------------------------------------------- 5. saved searches
create or replace function public.worker_search_save(p_name text, p_query jsonb, p_notify boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_q jsonb := public.worker_market_q(p_query);
  v_id uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if v_q = '{}'::jsonb then return public.worker_fail('bad_value'); end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 40 then return public.worker_fail('bad_value'); end if;
  perform public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'search_save', 30, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  if (select count(*) from public.worker_collector_search where user_id = v_me) >= 20 then
    return public.worker_fail('wishlist_full');
  end if;
  insert into public.worker_collector_search (user_id, name, query, notify)
    values (v_me, trim(p_name), v_q, coalesce(p_notify, true)) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.worker_search_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object('ok', true, 'searches', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', s.id, 'name', s.name, 'query', s.query, 'notify', s.notify, 'createdAt', s.created_at,
             'open', (select count(*) from public.worker_collector_item i
                       where public.worker_item_visible(i, v_me) and public.worker_item_matches(i, s.query)))
           order by s.created_at desc)
      from public.worker_collector_search s where s.user_id = v_me), '[]'::jsonb));
end $$;

create or replace function public.worker_search_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  delete from public.worker_collector_search where id = p_id and user_id = v_me;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.worker_search_notify_set(p_id uuid, p_notify boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  update public.worker_collector_search set notify = coalesce(p_notify, true) where id = p_id and user_id = v_me;
  return jsonb_build_object('ok', true);
end $$;

/* a copy that opens tells whoever saved a search it fits — one alert per person per copy (shared with the wishlist alert) */
create or replace function public.worker_search_alert() returns trigger
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if new.state <> 'held' or not (new.for_sale or new.for_trade) or (old.for_sale or old.for_trade) then
    return new;
  end if;
  for s in
    select distinct on (c.user_id) c.user_id, c.id, c.name from public.worker_collector_search c
     where c.notify and c.user_id <> new.user_id and not public.worker_blocked(new.user_id, c.user_id)
       and public.worker_item_matches(new, c.query)
     order by c.user_id, c.created_at
     limit 200
  loop
    insert into public.worker_notification (user_id, kind, payload, dedupe_key)
    values (s.user_id, 'COLLECTOR_WANT_MATCHED',
            jsonb_build_object('itemId', new.id, 'archiveSlug', new.archive_slug,
                               'forSale', new.for_sale, 'forTrade', new.for_trade,
                               'searchId', s.id, 'searchName', s.name),
            'want:' || new.id::text)
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end loop;
  return new;
end $$;
drop trigger if exists worker_collector_item_search_alert on public.worker_collector_item;
create trigger worker_collector_item_search_alert after update of for_sale, for_trade on public.worker_collector_item
  for each row execute function public.worker_search_alert();

-- ---------------------------------------------------------------- 6. requests ("wanted")
/* open or edit a request. Public: shirt + size + mode + a short note. The budget never leaves the table. */
create or replace function public.worker_want_request(
  p_slug text, p_kit text default null, p_size text default null, p_mode text default 'any',
  p_max_price numeric default null, p_currency text default 'EUR', p_delivery text default 'both',
  p_note text default null, p_public boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_id uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not public.worker_slug_ok(p_slug) then return public.worker_fail('bad_slug'); end if;
  if not public.worker_kit_ok(p_kit) then return public.worker_fail('bad_kit'); end if;
  perform public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'want_request', 40, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  if not exists (select 1 from public.worker_collector_want where user_id = v_me and archive_slug = p_slug)
     and (select count(*) from public.worker_collector_want where user_id = v_me) >= 400 then
    return public.worker_fail('wishlist_full');
  end if;
  if coalesce(p_public, false)
     and not exists (select 1 from public.worker_collector_want where user_id = v_me and archive_slug = p_slug and public_request)
     and (select count(*) from public.worker_collector_want where user_id = v_me and public_request) >= 20 then
    return public.worker_fail('wishlist_full');
  end if;
  begin
    insert into public.worker_collector_want
      (user_id, archive_slug, kit_id, preferred_size, mode, max_price, currency, delivery, public_note, public_request, updated_at)
    values (v_me, p_slug, p_kit, p_size, coalesce(p_mode, 'any'), p_max_price, coalesce(p_currency, 'EUR'),
            coalesce(p_delivery, 'both'), nullif(trim(p_note), ''), coalesce(p_public, false), now())
    on conflict (user_id, archive_slug) do update set
      kit_id = coalesce(excluded.kit_id, worker_collector_want.kit_id),
      preferred_size = excluded.preferred_size, mode = excluded.mode, max_price = excluded.max_price,
      currency = excluded.currency, delivery = excluded.delivery, public_note = excluded.public_note,
      public_request = excluded.public_request, updated_at = now()
    returning id into v_id;
  exception when check_violation then
    return public.worker_fail('bad_value');
  end;
  return jsonb_build_object('ok', true, 'id', v_id, 'public', coalesce(p_public, false));
end $$;

create or replace function public.worker_want_public_set(p_want uuid, p_public boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if coalesce(p_public, false)
     and (select count(*) from public.worker_collector_want where user_id = v_me and public_request and id <> p_want) >= 20 then
    return public.worker_fail('wishlist_full');
  end if;
  update public.worker_collector_want set public_request = coalesce(p_public, false), updated_at = now()
   where id = p_want and user_id = v_me;
  if not found then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

/* the requester's own requests — the only place the budget is returned, and only to its owner */
create or replace function public.worker_wants_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object('ok', true, 'wants', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', w.id, 'archiveSlug', w.archive_slug, 'kitId', w.kit_id, 'size', w.preferred_size, 'mode', w.mode,
      'delivery', w.delivery, 'note', w.public_note, 'public', w.public_request,
      'maxPrice', w.max_price, 'currency', w.currency, 'createdAt', w.created_at,
      'available', (select count(*) from public.worker_collector_item i
                     where public.worker_item_visible(i, v_me) and i.user_id <> v_me
                       and public.worker_same_shirt(w.archive_slug, w.kit_id, i.archive_slug, i.kit_id)
                       and (w.preferred_size is null or i.size = w.preferred_size))
    ) order by w.created_at desc)
    from public.worker_collector_want w where w.user_id = v_me), '[]'::jsonb));
end $$;

/* the wanted board: public requests only, without budget and without any user id */
-- (the signature grew a trailing p_clubs: drop the old one so the two never coexist as an overload)
drop function if exists public.worker_wanted_list(jsonb, integer, timestamptz, uuid);
create or replace function public.worker_wanted_list(
  p_slugs jsonb default null, p_limit integer default 24, p_after_at timestamptz default null, p_after_id uuid default null,
  p_clubs jsonb default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_slugs jsonb := public.worker_market_q(jsonb_build_object('slugs', p_slugs)) -> 'slugs';
  v_clubs jsonb := public.worker_market_q(jsonb_build_object('clubs', p_clubs)) -> 'clubs';
  v_rows jsonb;
  v_n integer;
  v_last record;
begin
  select count(*), coalesce(jsonb_agg(row_j order by created_at desc, id desc) filter (where rn <= v_limit), '[]'::jsonb)
    into v_n, v_rows
  from (
    select w.id, w.created_at,
           row_number() over (order by w.created_at desc, w.id desc) rn,
           jsonb_build_object(
             'id', w.id, 'archiveSlug', w.archive_slug, 'kitId', w.kit_id, 'size', w.preferred_size,
             'mode', w.mode, 'delivery', w.delivery, 'note', w.public_note, 'createdAt', w.created_at,
             'requester', public.worker_collector_label(w.user_id),
             'mine', w.user_id = v_me,
             -- the viewer's own copies that would answer this request (ids only; the requester sees them in a notification)
             'myMatches', case when v_me is null then '[]'::jsonb else coalesce((
                select jsonb_agg(i.id) from (
                  select i2.id from public.worker_collector_item i2
                   where i2.user_id = v_me and i2.state = 'held' and (i2.for_sale or i2.for_trade)
                     and public.worker_same_shirt(w.archive_slug, w.kit_id, i2.archive_slug, i2.kit_id)
                     and (w.preferred_size is null or i2.size = w.preferred_size)
                   limit 3) i), '[]'::jsonb) end
           ) row_j
      from public.worker_collector_want w
     where w.public_request
       and (v_me is null or not public.worker_blocked(v_me, w.user_id))
       and (v_slugs is null or w.archive_slug in (select jsonb_array_elements_text(v_slugs)))
       and (v_clubs is null or public.worker_slug_club(w.archive_slug) in (select jsonb_array_elements_text(v_clubs)))
       and (p_after_id is null or (w.created_at, w.id) < (coalesce(p_after_at, 'epoch'::timestamptz), p_after_id))
     order by w.created_at desc, w.id desc
     limit v_limit + 1) q;

  return jsonb_build_object(
    'ok', true, 'wanted', v_rows,
    'next', case when v_n > v_limit then (
      select jsonb_build_object('at', x.created_at, 'id', x.id) from (
        select w.created_at, w.id from public.worker_collector_want w
         where w.public_request and (v_me is null or not public.worker_blocked(v_me, w.user_id))
           and (v_slugs is null or w.archive_slug in (select jsonb_array_elements_text(v_slugs)))
           and (v_clubs is null or public.worker_slug_club(w.archive_slug) in (select jsonb_array_elements_text(v_clubs)))
           and (p_after_id is null or (w.created_at, w.id) < (coalesce(p_after_at, 'epoch'::timestamptz), p_after_id))
         order by w.created_at desc, w.id desc limit v_limit) x
       order by x.created_at asc, x.id asc limit 1) else null end,
    'total', (select count(*) from public.worker_collector_want w
               where w.public_request and (v_me is null or not public.worker_blocked(v_me, w.user_id))
                 and (v_slugs is null or w.archive_slug in (select jsonb_array_elements_text(v_slugs)))
                 and (v_clubs is null or public.worker_slug_club(w.archive_slug) in (select jsonb_array_elements_text(v_clubs))))
  );
end $$;

/* "I have it": offer one of my open copies to a public request. The requester is told; nothing else happens. */
create or replace function public.worker_want_respond(p_want uuid, p_item uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  w public.worker_collector_want;
  i public.worker_collector_item;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into w from public.worker_collector_want where id = p_want and public_request;
  if not found then return public.worker_fail('not_found'); end if;
  if w.user_id = v_me or public.worker_blocked(v_me, w.user_id) then return public.worker_fail('not_found'); end if;
  select * into i from public.worker_collector_item where id = p_item and user_id = v_me and state = 'held' and (for_sale or for_trade);
  if not found then return public.worker_fail('not_found'); end if;
  if not public.worker_same_shirt(w.archive_slug, w.kit_id, i.archive_slug, i.kit_id) then return public.worker_fail('bad_value'); end if;
  if w.preferred_size is not null and i.size is distinct from w.preferred_size then return public.worker_fail('bad_value'); end if;
  if not public.worker_rate_ok(v_me, 'want_respond', 30, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  perform public.worker_notify(w.user_id, 'COLLECTOR_WANT_MATCHED',
    jsonb_build_object('itemId', i.id, 'archiveSlug', i.archive_slug, 'forSale', i.for_sale, 'forTrade', i.for_trade,
                       'wantId', w.id, 'answer', true),
    'wantresp:' || w.id::text || ':' || i.id::text);
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- 7. grants (this file's functions only)
do $grants$
declare
  v_fn record;
  v_public text[] := array['worker_market_search', 'worker_wanted_list'];
  v_member text[] := array['worker_item_delivery_set', 'worker_item_reach_set', 'worker_search_save', 'worker_search_list', 'worker_search_delete',
                           'worker_search_notify_set', 'worker_want_request', 'worker_want_public_set', 'worker_wants_mine',
                           'worker_want_respond'];
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any(v_public || v_member)
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = any(v_public) then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    else
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
  -- helpers and the trigger are internal: nobody calls them from outside
  for v_fn in
    select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('worker_q_arr', 'worker_market_q', 'worker_item_visible',
                                                  'worker_item_matches', 'worker_search_alert', 'worker_slug_club', 'worker_item_reaches')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
  end loop;
  -- worker_item_public was replaced above: it keeps the closed grants the collector file gave it
  revoke all on function public.worker_item_public(public.worker_collector_item) from public, anon, authenticated;
end
$grants$;
