-- =====================================================================
-- THE SHIRT HUB — server-side text search (T04). Runs AFTER 20261009090000_worker_market_search.sql.
-- Adds one key, `text`, to the query language. Everything is worker_-prefixed, idempotent (create or replace),
-- touches nothing on auth. The ONE predicate stays shared: search, facets and saved-search alerts all see it.
-- =====================================================================

/* a query, cleaned: only the keys the market understands, only values that are real */
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
               position(w in lower(replace(i.archive_slug, '-', ' ') || ' ' || coalesce(i.player_name, '') || ' '
                                   || coalesce(i.personalization_notes, '') || ' ' || coalesce(i.description, ''))) > 0
               or position(w in replace(lower(i.archive_slug), '-', '')) > 0)))
     and (not q ? 'slugs' or i.archive_slug in (select jsonb_array_elements_text(q -> 'slugs')))
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


select 'worker_market_q' as fn, (public.worker_market_q('{"text":"Maccabi  Haifa!"}'::jsonb)) as cleaned;
