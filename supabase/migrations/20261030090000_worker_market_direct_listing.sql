-- THE WORKER / FAN LIFE — direct listing (owner plan 30.10.2026): List a shirt without owning it in the closet.
-- Additive only. A copy is a collector item; whether it is part of the closet is now its own flag (`in_closet`).
--   * every existing item stays in the closet (default true) — nothing is moved, hidden or renamed
--   * worker_market_publish   — one transaction: the copy, its photos and its terms; retry-safe (idempotency key)
--   * worker_listings_mine    — what I have on offer, closet or not
--   * worker_listing_set      — pause / resume / sold / swapped / take off / add to closet
-- Run AFTER 20261009250000_worker_privacy.sql (the last file that defines worker_closet_mine / worker_closet_view).
-- Rule 89: worker_-prefixed, idempotent, no auth-schema objects.

-- ---------------------------------------------------------------- 1. columns
alter table public.worker_collector_item add column if not exists in_closet boolean not null default true;
alter table public.worker_collector_item add column if not exists idem_key text;
alter table public.worker_collector_item add column if not exists looking_for text;
alter table public.worker_collector_item add column if not exists paused_sale boolean not null default false;
alter table public.worker_collector_item add column if not exists paused_trade boolean not null default false;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_item_direct_chk') then
    alter table public.worker_collector_item add constraint worker_collector_item_direct_chk check (
      (idem_key is null or char_length(idem_key) between 16 and 64)
      and (looking_for is null or char_length(looking_for) <= 200));
  end if;
end $c$;
create unique index if not exists worker_collector_item_idem_idx
  on public.worker_collector_item (user_id, idem_key) where idem_key is not null;
create index if not exists worker_collector_item_direct_idx
  on public.worker_collector_item (user_id, state) where in_closet = false;

-- ---------------------------------------------------------------- 2. the public face also says what a swapper looks for
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
    'lookingFor', case when p_item.for_trade then p_item.looking_for end,
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

-- ---------------------------------------------------------------- 3. the closet shows only closet copies
create or replace function public.worker_closet_mine() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_profile public.worker_collector_profile;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  v_profile := public.worker_collector_touch(v_me);
  return jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'handle', v_profile.handle_no,
      'identityMode', v_profile.identity_mode,
      'nickname', v_profile.public_nickname,
      'showNickname', v_profile.identity_mode = 'nickname',
      'visibility', v_profile.closet_visibility,
      'shareToken', v_profile.share_token),
    'label', public.worker_collector_label(v_me),
    'items', (select coalesce(jsonb_agg(public.worker_item_owner(i) order by i.created_at desc), '[]'::jsonb)
                from public.worker_collector_item i where i.user_id = v_me and i.state <> 'removed' and i.in_closet),
    'wants', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', w.id, 'archiveSlug', w.archive_slug, 'kitId', w.kit_id,
                'preferredSize', w.preferred_size, 'notes', w.notes, 'createdAt', w.created_at,
                'available', (select count(*) from public.worker_collector_item i
                               where public.worker_same_shirt(i.archive_slug, i.kit_id, w.archive_slug, w.kit_id)
                                 and i.state = 'held' and (i.for_sale or i.for_trade) and i.user_id <> v_me
                                 and not public.worker_blocked(v_me, i.user_id))
              ) order by w.created_at desc), '[]'::jsonb)
              from public.worker_collector_want w where w.user_id = v_me),
    'unread', (select count(*) from public.worker_notification n where n.user_id = v_me and n.read_at is null)
  );
end $$;

create or replace function public.worker_closet_view(p_handle integer, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_p public.worker_collector_profile;
begin
  select * into v_p from public.worker_collector_profile where handle_no = p_handle;
  if not found then return public.worker_fail('not_found'); end if;
  if v_p.user_id is distinct from auth.uid() then
    if v_p.identity_mode = 'anonymous' or v_p.closet_visibility = 'private' then return public.worker_fail('not_found'); end if;
    if v_p.closet_visibility = 'link_only' and coalesce(p_token, '') <> v_p.share_token then
      return public.worker_fail('not_found');
    end if;
  end if;
  return jsonb_build_object(
    'ok', true,
    'label', public.worker_collector_label(v_p.user_id),
    'mine', v_p.user_id = coalesce(public.worker_market_uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'archiveSlug', i.archive_slug, 'kitId', i.kit_id, 'itemType', i.item_type,
                'playerName', i.player_name, 'playerNumber', i.player_number,
                'forTrade', i.for_trade and i.state = 'held', 'forSale', i.for_sale and i.state = 'held',
                'id', case when i.state = 'held' and (i.for_sale or i.for_trade) then i.id end
              ) order by i.archive_slug), '[]'::jsonb)
              from public.worker_collector_item i
             where i.user_id = v_p.user_id and i.state in ('held', 'reserved') and i.in_closet
               and (i.in_display or (i.state = 'held' and (i.for_sale or i.for_trade)))),
    'wants', (select coalesce(jsonb_agg(w.archive_slug order by w.archive_slug), '[]'::jsonb)
              from public.worker_collector_want w where w.user_id = v_p.user_id)
  );
end $$;

/* "I have one" must not hand back a listing-only copy as the closet's copy */
create or replace function public.worker_collector_have(p_slug text, p_kit text default null, p_new_copy boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_item public.worker_collector_item;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not public.worker_slug_ok(p_slug) then return public.worker_fail('bad_slug'); end if;
  if not public.worker_kit_ok(p_kit) then return public.worker_fail('bad_kit'); end if;
  perform public.worker_collector_touch(v_me);
  if not coalesce(p_new_copy, false) then
    select * into v_item from public.worker_collector_item
      where user_id = v_me and archive_slug = p_slug and in_closet and state in ('held', 'reserved', 'suspended')
      order by created_at limit 1;
    if found then
      return jsonb_build_object('ok', true, 'created', false, 'item', public.worker_item_owner(v_item));
    end if;
  end if;
  if (select count(*) from public.worker_collector_item where user_id = v_me and state <> 'removed' and in_closet) >= 600 then
    return public.worker_fail('closet_full');
  end if;
  if not public.worker_rate_ok(v_me, 'have', 200, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  insert into public.worker_collector_item (user_id, archive_slug, kit_id) values (v_me, p_slug, p_kit)
    returning * into v_item;
  delete from public.worker_collector_want where user_id = v_me and archive_slug = p_slug;
  return jsonb_build_object('ok', true, 'created', true, 'item', public.worker_item_owner(v_item));
end $$;

-- ---------------------------------------------------------------- 4. publish: one transaction
/*
  p_data keys (all optional unless said):
    clubKey | clubName (+country)   — a library club, or a name typed by the seller (kept in review, never checked automatically)
    archiveSlug, kitId              — optional link to a shirt in the archive (a suggestion the seller accepted)
    season (2-20 chars), variant, maker, size, condition, itemType, authenticityClaim, playerName, playerNumber, description
    mode: 'sell' | 'swap' | 'both'  (required)      price + currency (required for sell/both unless openToOffers)
    openToOffers, lookingFor (swap), delivery local|ship|both, shipScope country|world
    photos: array of opaque paths from worker_photo_slot (1..8, at least one required)
    addToCloset: boolean (default false — a direct listing never enters the closet unless asked)
*/
create or replace function public.worker_market_publish(p_key text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_d jsonb := coalesce(p_data, '{}'::jsonb);
  v_item public.worker_collector_item;
  v_mode text := v_d ->> 'mode';
  v_sale boolean;
  v_trade boolean;
  v_price numeric(10, 2);
  v_cur text := coalesce(nullif(v_d ->> 'currency', ''), 'ILS');
  v_open boolean := coalesce((v_d ->> 'openToOffers')::boolean, false);
  v_slug text := nullif(v_d ->> 'archiveSlug', '');
  v_kit text := nullif(v_d ->> 'kitId', '');
  v_club_key text := nullif(v_d ->> 'clubKey', '');
  v_name text := nullif(btrim(coalesce(v_d ->> 'clubName', '')), '');
  v_country text := nullif(v_d ->> 'country', '');
  v_season text := nullif(btrim(coalesce(v_d ->> 'season', '')), '');
  v_variant text := nullif(v_d ->> 'variant', '');
  v_maker text := nullif(btrim(coalesce(v_d ->> 'maker', '')), '');
  v_delivery text := coalesce(nullif(v_d ->> 'delivery', ''), 'both');
  v_scope text := coalesce(nullif(v_d ->> 'shipScope', ''), 'country');
  v_paths text[];
  v_path text;
  v_pos integer := 0;
  v_number smallint;
  v_iid uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_key is null or char_length(p_key) not between 16 and 64 then return public.worker_fail('bad_key'); end if;

  -- retry or double tap: the same key is the same listing
  select * into v_item from public.worker_collector_item where user_id = v_me and idem_key = p_key;
  if found then
    return jsonb_build_object('ok', true, 'created', false, 'listingId', v_item.id, 'status', 'live', 'item', public.worker_item_owner(v_item));
  end if;

  if v_mode not in ('sell', 'swap', 'both') then return public.worker_fail('bad_value', jsonb_build_object('key', 'mode')); end if;
  v_sale := v_mode in ('sell', 'both');
  v_trade := v_mode in ('swap', 'both');
  if v_cur not in ('ILS', 'EUR', 'USD') then return public.worker_fail('bad_value', jsonb_build_object('key', 'currency')); end if;
  if v_d ? 'price' and nullif(v_d ->> 'price', '') is not null then
    begin v_price := (v_d ->> 'price')::numeric(10, 2);
    exception when others then return public.worker_fail('bad_value', jsonb_build_object('key', 'price')); end;
    if v_price <= 0 then return public.worker_fail('bad_value', jsonb_build_object('key', 'price')); end if;
  end if;
  if v_sale and v_price is null and not v_open then return public.worker_fail('price_required'); end if;
  if not v_sale then v_price := null; v_open := false; end if;
  if v_delivery not in ('local', 'ship', 'both') then return public.worker_fail('bad_value', jsonb_build_object('key', 'delivery')); end if;
  if v_scope not in ('country', 'world') then return public.worker_fail('bad_value', jsonb_build_object('key', 'shipScope')); end if;
  if v_slug is not null and not public.worker_slug_ok(v_slug) then return public.worker_fail('bad_slug'); end if;
  if v_kit is not null and not public.worker_kit_ok(v_kit) then return public.worker_fail('bad_kit'); end if;
  if v_season is not null and char_length(v_season) not between 2 and 20 then return public.worker_fail('bad_value', jsonb_build_object('key', 'season')); end if;
  if v_variant is not null and v_variant not in ('home', 'away', 'third', 'goalkeeper', 'training', 'special', 'other') then
    return public.worker_fail('bad_value', jsonb_build_object('key', 'variant'));
  end if;
  if v_maker is not null and char_length(v_maker) not between 1 and 30 then return public.worker_fail('bad_value', jsonb_build_object('key', 'maker')); end if;
  if nullif(v_d ->> 'size', '') is not null and (v_d ->> 'size') not in ('kids', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl') then
    return public.worker_fail('bad_value', jsonb_build_object('key', 'size'));
  end if;
  if nullif(v_d ->> 'condition', '') is not null and (v_d ->> 'condition') not in ('mint', 'excellent', 'good', 'worn', 'damaged') then
    return public.worker_fail('bad_value', jsonb_build_object('key', 'condition'));
  end if;
  if coalesce(nullif(v_d ->> 'itemType', ''), 'unknown') not in ('original_period', 'official_reissue', 'replica', 'fan_reproduction', 'unknown') then
    return public.worker_fail('bad_value', jsonb_build_object('key', 'itemType'));
  end if;
  if nullif(v_d ->> 'authenticityClaim', '') is not null and (v_d ->> 'authenticityClaim') not in ('original', 'match_worn', 'unsure', 'replica') then
    return public.worker_fail('bad_value', jsonb_build_object('key', 'authenticityClaim'));
  end if;
  if nullif(v_d ->> 'playerNumber', '') is not null then
    begin v_number := (v_d ->> 'playerNumber')::smallint;
    exception when others then return public.worker_fail('bad_value', jsonb_build_object('key', 'playerNumber')); end;
  end if;

  -- photos: opaque slots I own, really uploaded; at least one real photo of this copy
  select coalesce(array_agg(x), '{}') into v_paths from jsonb_array_elements_text(coalesce(v_d -> 'photos', '[]'::jsonb)) x;
  if nullif(v_d ->> 'itemId', '') is not null then
    begin v_iid := (v_d ->> 'itemId')::uuid; exception when others then return public.worker_fail('bad_value', jsonb_build_object('key', 'itemId')); end;
  end if;
  if cardinality(v_paths) + coalesce((select count(*) from public.worker_collector_photo p where p.item_id = v_iid and p.user_id = v_me), 0) < 1 then
    return public.worker_fail('photos_required');
  end if;
  if cardinality(v_paths) > 8 then return public.worker_fail('too_many_photos'); end if;
  foreach v_path in array v_paths loop
    if not public.worker_photo_is_opaque(v_path) or not public.worker_photo_slot_owned(v_path) then return public.worker_fail('bad_path'); end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'worker-collector-pub' and o.name = v_path) then
      return public.worker_fail('not_uploaded');
    end if;
  end loop;

  -- which club: the archive shirt's, a library club, or a name the seller typed (a candidate in review)
  if v_iid is not null then
    null; -- the closet copy already knows its shirt
  elsif v_slug is not null then
    v_club_key := null;
  elsif v_club_key is not null then
    if not exists (select 1 from public.worker_club_library l where l.key = v_club_key and l.merged_into is null) then return public.worker_fail('not_found'); end if;
  else
    if v_name is null or char_length(v_name) not between 2 and 60 then return public.worker_fail('club_required'); end if;
    if v_country is not null and v_country !~ '^[A-Z]{2}$' then return public.worker_fail('bad_value', jsonb_build_object('key', 'country')); end if;
    select l.key into v_club_key from public.worker_club_library l
     where l.merged_into is null and (lower(l.name) = lower(v_name) or exists (select 1 from unnest(l.aliases) a where lower(a) = lower(v_name)))
     order by l.name limit 1;
    if v_club_key is null then
      v_club_key := left(regexp_replace(lower(v_name), '[^a-z0-9]+', '', 'g'), 30);
      if char_length(v_club_key) < 2 then v_club_key := 'club' || substr(md5(v_name), 1, 8); end if;
      insert into public.worker_club_library (key, name, country, status) values (v_club_key, v_name, v_country, 'review') on conflict (key) do nothing;
    end if;
  end if;

  perform public.worker_collector_touch(v_me);
  if (select count(*) from public.worker_collector_item where user_id = v_me and in_closet = false and state in ('held', 'reserved')) >= 200 then
    return public.worker_fail('listings_full');
  end if;
  if not public.worker_rate_ok(v_me, 'publish', 30, interval '1 hour') then return public.worker_fail('slow_down'); end if;

  -- "choose from my closet": the same copy gets its terms — never a second row for one physical shirt
  if v_iid is not null then
    select * into v_item from public.worker_collector_item where id = v_iid and user_id = v_me for update;
    if not found then return public.worker_fail('not_found'); end if;
    if v_item.state <> 'held' then return public.worker_fail('busy'); end if;
    if exists (select 1 from public.worker_auction_lot l where l.item_id = v_iid and l.status in ('pending_approval', 'scheduled', 'awaiting_completion')) then
      return public.worker_fail('busy');
    end if;
    update public.worker_collector_item set
      for_sale = v_sale, for_trade = v_trade, asking_price = v_price, currency = v_cur, open_to_offers = v_open,
      looking_for = case when v_trade then nullif(left(btrim(coalesce(v_d ->> 'lookingFor', '')), 200), '') end,
      delivery = v_delivery, ship_scope = v_scope, paused_sale = false, paused_trade = false,
      size = coalesce(nullif(v_d ->> 'size', ''), size), condition = coalesce(nullif(v_d ->> 'condition', ''), condition),
      item_type = case when nullif(v_d ->> 'itemType', '') is not null then v_d ->> 'itemType' else item_type end,
      authenticity_claim = coalesce(nullif(v_d ->> 'authenticityClaim', ''), authenticity_claim),
      description = coalesce(nullif(left(btrim(coalesce(v_d ->> 'description', '')), 1500), ''), description),
      idem_key = p_key, opened_at = now(), updated_at = now()
     where id = v_iid returning * into v_item;
    select count(*) into v_pos from public.worker_collector_photo where item_id = v_iid;
    foreach v_path in array v_paths loop
      exit when v_pos >= 8;
      insert into public.worker_collector_photo (item_id, user_id, storage_path, sort_order) values (v_iid, v_me, v_path, v_pos)
        on conflict (storage_path) do nothing;
      v_pos := v_pos + 1;
    end loop;
    return jsonb_build_object('ok', true, 'created', false, 'listingId', v_item.id, 'status', 'live', 'item', public.worker_item_owner(v_item));
  end if;

  begin
    insert into public.worker_collector_item (
      user_id, archive_slug, kit_id, club_key, club_label, season_label, variant, maker, size, condition, item_type,
      authenticity_claim, player_name, player_number, description, for_sale, for_trade, asking_price, currency,
      open_to_offers, looking_for, delivery, ship_scope, in_closet, idem_key, opened_at)
    values (
      v_me, v_slug, v_kit, v_club_key, case when v_slug is null then coalesce(v_name, null) end, v_season, v_variant, v_maker,
      nullif(v_d ->> 'size', ''), nullif(v_d ->> 'condition', ''), coalesce(nullif(v_d ->> 'itemType', ''), 'unknown'),
      nullif(v_d ->> 'authenticityClaim', ''), nullif(left(btrim(coalesce(v_d ->> 'playerName', '')), 40), ''), v_number,
      nullif(left(btrim(coalesce(v_d ->> 'description', '')), 1500), ''), v_sale, v_trade, v_price, v_cur,
      v_open, case when v_trade then nullif(left(btrim(coalesce(v_d ->> 'lookingFor', '')), 200), '') end, v_delivery, v_scope,
      coalesce((v_d ->> 'addToCloset')::boolean, false), p_key, now())
    returning * into v_item;
  exception
    when unique_violation then
      select * into v_item from public.worker_collector_item where user_id = v_me and idem_key = p_key;
      return jsonb_build_object('ok', true, 'created', false, 'listingId', v_item.id, 'status', 'live', 'item', public.worker_item_owner(v_item));
    when check_violation then
      return public.worker_fail(case when sqlerrm like '%replica_honest%' then 'replica_claim' else 'bad_value' end);
  end;

  foreach v_path in array v_paths loop
    insert into public.worker_collector_photo (item_id, user_id, storage_path, sort_order) values (v_item.id, v_me, v_path, v_pos)
      on conflict (storage_path) do nothing;
    v_pos := v_pos + 1;
  end loop;

  if v_item.archive_slug is not null then
    perform public.worker_notify(w.user_id, 'COLLECTOR_WANT_MATCHED',
      jsonb_build_object('itemId', v_item.id, 'archiveSlug', v_item.archive_slug, 'forSale', v_item.for_sale, 'forTrade', v_item.for_trade),
      'want:' || v_item.id::text)
    from (select distinct w.user_id from public.worker_collector_want w
           where public.worker_same_shirt(w.archive_slug, w.kit_id, v_item.archive_slug, v_item.kit_id)
             and w.user_id <> v_me and not public.worker_blocked(v_me, w.user_id)
           limit 200) w;
  end if;
  return jsonb_build_object('ok', true, 'created', true, 'listingId', v_item.id, 'status', 'live', 'item', public.worker_item_owner(v_item));
end $$;

-- ---------------------------------------------------------------- 5. my listings
create or replace function public.worker_listings_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object('ok', true, 'listings', (
    select coalesce(jsonb_agg(public.worker_item_owner(i) || jsonb_build_object(
             'inCloset', i.in_closet,
             'paused', (i.paused_sale or i.paused_trade) and not (i.for_sale or i.for_trade),
             'lookingFor', i.looking_for,
             'updatedAt', i.updated_at) order by i.updated_at desc), '[]'::jsonb)
      from public.worker_collector_item i
     where i.user_id = v_me and i.state in ('held', 'reserved', 'sold', 'traded', 'suspended')
       and (i.for_sale or i.for_trade or i.paused_sale or i.paused_trade or not i.in_closet or i.state in ('sold', 'traded'))));
end $$;

create or replace function public.worker_listing_set(p_item uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_i public.worker_collector_item;
  v_busy boolean;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_action not in ('pause', 'resume', 'sold', 'traded', 'remove', 'closet_add') then return public.worker_fail('bad_value'); end if;
  select * into v_i from public.worker_collector_item where id = p_item and user_id = v_me for update;
  if not found then return public.worker_fail('not_found'); end if;
  if v_i.state = 'suspended' then return public.worker_fail('suspended'); end if;
  v_busy := exists (select 1 from public.worker_collector_connection k where k.item_id = p_item and k.status in ('requested', 'accepted', 'negotiating', 'agreed'))
         or exists (select 1 from public.worker_auction_lot l where l.item_id = p_item and l.status in ('pending_approval', 'scheduled', 'awaiting_completion'));
  if p_action = 'closet_add' then
    if v_i.state not in ('held', 'reserved') then return public.worker_fail('busy'); end if;
    update public.worker_collector_item set in_closet = true, updated_at = now() where id = p_item;
  elsif p_action = 'pause' then
    if v_i.state <> 'held' or not (v_i.for_sale or v_i.for_trade) then return public.worker_fail('busy'); end if;
    update public.worker_collector_item set paused_sale = v_i.for_sale, paused_trade = v_i.for_trade, for_sale = false, for_trade = false, opened_at = null, updated_at = now() where id = p_item;
  elsif p_action = 'resume' then
    if v_i.state <> 'held' or not (v_i.paused_sale or v_i.paused_trade) then return public.worker_fail('nothing_to_resume'); end if;
    update public.worker_collector_item set for_sale = paused_sale, for_trade = paused_trade, paused_sale = false, paused_trade = false, opened_at = now(), updated_at = now() where id = p_item;
  elsif p_action in ('sold', 'traded') then
    if v_i.state not in ('held', 'reserved') then return public.worker_fail('busy'); end if;
    update public.worker_collector_item set state = p_action, for_sale = false, for_trade = false, paused_sale = false, paused_trade = false, updated_at = now() where id = p_item;
  else -- remove
    if v_i.state not in ('held', 'suspended') or v_busy then return public.worker_fail('busy'); end if;
    if v_i.in_closet then
      update public.worker_collector_item set for_sale = false, for_trade = false, paused_sale = false, paused_trade = false, opened_at = null, updated_at = now() where id = p_item;
    else
      update public.worker_collector_item set state = 'removed', for_sale = false, for_trade = false, paused_sale = false, paused_trade = false, opened_at = null, updated_at = now() where id = p_item;
    end if;
  end if;
  select * into v_i from public.worker_collector_item where id = p_item;
  return jsonb_build_object('ok', true, 'item', public.worker_item_owner(v_i) || jsonb_build_object('inCloset', v_i.in_closet));
end $$;

-- ---------------------------------------------------------------- 6. grants: members only
do $g$
declare v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('worker_market_publish', 'worker_listings_mine', 'worker_listing_set', 'worker_closet_mine', 'worker_closet_view', 'worker_collector_have')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = 'worker_closet_view' then execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    else execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
  revoke all on function public.worker_item_public(public.worker_collector_item) from public, anon, authenticated;
end $g$;

select 'direct_listing ok' as check;
