-- =====================================================================
-- THE SHIRT HUB — privacy (stage A of FANLIFE-PRIVACY-REST-OF-WORLD-PLAN-2026-10-09).
--   1. identity is a MODE of the collector (number · nickname · anonymous), with a nickname of its own that is
--      never the account's display name, unique after normalisation, and screened against impersonation
--   2. anonymous is consistent by construction: the closet is private, the share link dies, the place is hidden —
--      in one statement; no half-anonymous state exists
--   3. the closet shows a SELECTION the collector chose (`in_display`), not everything they own
--   4. photos live under an OPAQUE path (`p/<32 hex>`) in a public bucket; nothing in a path or a JSON answer says
--      whose it is. The old bucket stops being public; the owner's browser moves their old photos across
--   5. block / report work from a conversation or an item, so an anonymous counterpart can still be blocked
-- Runs AFTER 20261009240000_worker_rest_of_world.sql. worker_-prefixed, idempotent, nothing on auth.
-- =====================================================================

-- ---------------------------------------------------------------- 1. identity
alter table public.worker_collector_profile
  add column if not exists identity_mode text not null default 'number',
  add column if not exists public_nickname text,
  add column if not exists nickname_key text;

do $c$ begin
  alter table public.worker_collector_profile drop constraint if exists worker_collector_profile_identity_mode_check;
  alter table public.worker_collector_profile add constraint worker_collector_profile_identity_mode_check
    check (identity_mode in ('number', 'nickname', 'anonymous'));
  alter table public.worker_collector_profile drop constraint if exists worker_collector_profile_public_nickname_check;
  alter table public.worker_collector_profile add constraint worker_collector_profile_public_nickname_check
    check (public_nickname is null or char_length(public_nickname) between 3 and 20);
  alter table public.worker_collector_profile drop constraint if exists worker_collector_profile_nickname_mode;
  alter table public.worker_collector_profile add constraint worker_collector_profile_nickname_mode
    check (identity_mode <> 'nickname' or public_nickname is not null);
end $c$;
create unique index if not exists worker_collector_profile_nick_idx
  on public.worker_collector_profile (nickname_key) where nickname_key is not null;

/* "adm1n" and "admin" are the same name. Lower-case, drop separators, fold the look-alike digits. */
create or replace function public.worker_nick_key(p_raw text) returns text
language sql immutable as $$
  select translate(lower(regexp_replace(coalesce(p_raw, ''), '[[:space:]_.\-]+', '', 'g')), '013457@$', 'oieastas')
$$;

/* ok + the cleaned nickname + its key, or the reason it cannot be used. Never says who holds a taken one. */
create or replace function public.worker_nick_check(p_raw text, p_user uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_nick text := regexp_replace(trim(coalesce(p_raw, '')), '[[:space:]]+', ' ', 'g');
  v_key text;
  v_alt text;
  v_plain text := lower(regexp_replace(trim(coalesce(p_raw, '')), '[[:space:]_.\-]+', '', 'g'));
begin
  if char_length(v_nick) < 3 then return public.worker_fail('nick_short'); end if;
  if char_length(v_nick) > 20 then return public.worker_fail('nick_long'); end if;
  if v_nick !~ '^[A-Za-z0-9א-ת _.\-]+$' or v_nick !~ '[A-Za-zא-ת]' then return public.worker_fail('nick_chars'); end if;
  v_key := public.worker_nick_key(v_nick);
  -- a "1" may stand for an i or an l: screen both readings
  v_alt := translate(lower(regexp_replace(v_nick, '[[:space:]_.\-]+', '', 'g')), '013457@$', 'oleastas');
  if v_key ~ '(admin|moderat|staff|official|fanlife|dubel|theworker|אדמין|מנהל|צוות|תמיכה|רשמי|מודרטור)'
     or v_alt ~ '(admin|moderat|staff|official|fanlife|dubel|theworker|אדמין|מנהל|צוות|תמיכה|רשמי|מודרטור)'
     or v_plain ~ '^(support|system|help|team|mod|owner|אספן|collector|anonymous|anon|אנונימי|אדום)[0-9]*$' then
    return public.worker_fail('nick_reserved');
  end if;
  if exists (select 1 from public.worker_collector_profile c
              where c.nickname_key = v_key and c.user_id is distinct from p_user) then
    return public.worker_fail('nick_taken');
  end if;
  return jsonb_build_object('ok', true, 'nick', v_nick, 'key', v_key);
end $$;

/* One-time carry-over: a collector who had chosen to show their name keeps showing it — but as a nickname of its
   own from now on. A name that does not pass today's rules (short, reserved, already taken) falls back to the number. */
do $carry$
declare v_row record; v_chk jsonb;
begin
  for v_row in
    select c.user_id, trim(p.display_name) as nick
      from public.worker_collector_profile c join public.worker_profile p on p.id = c.user_id
     where c.show_nickname and c.public_nickname is null and c.identity_mode = 'number'
       and nullif(trim(p.display_name), '') is not null
  loop
    v_chk := public.worker_nick_check(v_row.nick, v_row.user_id);
    if coalesce((v_chk ->> 'ok')::boolean, false) then
      update public.worker_collector_profile
         set identity_mode = 'nickname', public_nickname = v_chk ->> 'nick', nickname_key = v_chk ->> 'key'
       where user_id = v_row.user_id;
    end if;
  end loop;
end $carry$;

/* Anonymous means no place either — enforced where the row is written, so no code path can forget. */
create or replace function public.worker_profile_consistency() returns trigger
language plpgsql as $$
begin
  if new.identity_mode = 'anonymous' then
    new.show_place := false;
    new.closet_visibility := 'private';
  end if;
  if new.identity_mode <> 'nickname' then
    new.public_nickname := null;
    new.nickname_key := null;
  end if;
  return new;
end $$;
drop trigger if exists worker_profile_consistency on public.worker_collector_profile;
create trigger worker_profile_consistency before insert or update on public.worker_collector_profile
  for each row execute function public.worker_profile_consistency();

/* How a collector looks to everyone else. Anonymous = no number, no name, no record, no place: nothing to link on. */
create or replace function public.worker_collector_label(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when c.identity_mode = 'anonymous' then
    jsonb_build_object('handle', null, 'anonymous', true, 'nickname', null, 'since', null,
                       'completed', 0, 'trades', 0, 'sales', 0, 'items', 0)
  else
    jsonb_build_object(
      'handle', c.handle_no,
      'nickname', case when c.identity_mode = 'nickname' then c.public_nickname end,
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
                    then jsonb_build_object('country', c.country, 'city', c.city) end)
  end
  from public.worker_collector_profile c
  join public.worker_profile p on p.id = c.user_id
  where c.user_id = p_user
$$;

-- ---------------------------------------------------------------- 3. what the closet shows
alter table public.worker_collector_item add column if not exists in_display boolean not null default true;
alter table public.worker_collector_item alter column in_display set default false;

create or replace function public.worker_item_owner(p_item public.worker_collector_item) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.worker_item_public(p_item) - 'seller' || jsonb_build_object(
    'suspendedReason', p_item.suspended_reason,
    'createdAt', p_item.created_at,
    'inDisplay', p_item.in_display,
    'openConnections', (select count(*) from public.worker_collector_connection k
                         where k.item_id = p_item.id and k.status in ('requested', 'accepted', 'negotiating', 'agreed')),
    'lot', (select jsonb_build_object('id', l.id, 'status', l.status) from public.worker_auction_lot l
             where l.item_id = p_item.id and l.status in ('pending_approval', 'scheduled', 'awaiting_completion')
             limit 1),
    'wanters', (select count(*) from public.worker_collector_want w
                 where w.archive_slug = p_item.archive_slug and w.user_id <> p_item.user_id)
  )
$$;

/* Choose which shirts the closet shows. Adding a shirt never shows it; a listed shirt is public anyway. */
create or replace function public.worker_collector_display_set(p_items uuid[], p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid(); v_n integer;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_items is null or cardinality(p_items) not between 1 and 600 then return public.worker_fail('bad_value'); end if;
  update public.worker_collector_item set in_display = coalesce(p_on, false)
   where user_id = v_me and id = any (p_items) and state in ('held', 'reserved');
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'changed', v_n, 'on', coalesce(p_on, false));
end $$;

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
                from public.worker_collector_item i where i.user_id = v_me and i.state <> 'removed'),
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

/* Another collector's closet — only if public, or by link with the token. Private and anonymous are both "not found". */
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
             where i.user_id = v_p.user_id and i.state in ('held', 'reserved')
               and (i.in_display or (i.state = 'held' and (i.for_sale or i.for_trade)))),
    'wants', (select coalesce(jsonb_agg(w.archive_slug order by w.archive_slug), '[]'::jsonb)
              from public.worker_collector_want w where w.user_id = v_p.user_id)
  );
end $$;

-- ---------------------------------------------------------------- 2. settings
/* Visibility and the share link. Nickname/anonymous live in worker_collector_identity_set. */
create or replace function public.worker_collector_settings(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_p public.worker_collector_profile;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  v_p := public.worker_collector_touch(v_me);
  if p_patch ? 'visibility' then
    if (p_patch ->> 'visibility') not in ('public', 'link_only', 'private') then return public.worker_fail('bad_value'); end if;
    if v_p.identity_mode = 'anonymous' and (p_patch ->> 'visibility') <> 'private' then
      return public.worker_fail('anonymous_requires_private');
    end if;
    v_p.closet_visibility := p_patch ->> 'visibility';
  end if;
  if coalesce((p_patch ->> 'rotateToken')::boolean, false) then
    v_p.share_token := replace(gen_random_uuid()::text, '-', '');
  end if;
  update public.worker_collector_profile
     set closet_visibility = v_p.closet_visibility, share_token = v_p.share_token
   where user_id = v_me;
  return jsonb_build_object('ok', true, 'visibility', v_p.closet_visibility,
                            'showNickname', v_p.identity_mode = 'nickname', 'shareToken', v_p.share_token);
end $$;

/* How I appear to others. One statement, one outcome:
   anonymous while the closet is shared asks first (`confirm_private`), then makes the closet private, kills the old
   link and hides the place — together. */
create or replace function public.worker_collector_identity_set(
  p_mode text, p_nickname text default null, p_confirm boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_p public.worker_collector_profile;
  v_chk jsonb;
  v_token text;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_mode not in ('number', 'nickname', 'anonymous') then return public.worker_fail('bad_value'); end if;
  v_p := public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'identity', 30, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  v_token := v_p.share_token;
  if p_mode = 'nickname' then
    v_chk := public.worker_nick_check(coalesce(p_nickname, v_p.public_nickname), v_me);
    if not coalesce((v_chk ->> 'ok')::boolean, false) then return v_chk; end if;
    v_p.public_nickname := v_chk ->> 'nick';
    v_p.nickname_key := v_chk ->> 'key';
  elsif p_mode = 'anonymous' then
    if (v_p.closet_visibility <> 'private' or v_p.show_place) and not coalesce(p_confirm, false) then
      return public.worker_fail('confirm_private', jsonb_build_object('visibility', v_p.closet_visibility, 'place', v_p.show_place));
    end if;
    v_p.closet_visibility := 'private';
    v_token := replace(gen_random_uuid()::text, '-', '');
  end if;
  update public.worker_collector_profile
     set identity_mode = p_mode, public_nickname = v_p.public_nickname, nickname_key = v_p.nickname_key,
         closet_visibility = v_p.closet_visibility, share_token = v_token
   where user_id = v_me;
  select * into v_p from public.worker_collector_profile where user_id = v_me;
  return jsonb_build_object('ok', true, 'identityMode', v_p.identity_mode, 'nickname', v_p.public_nickname,
                            'visibility', v_p.closet_visibility, 'shareToken', v_p.share_token,
                            'label', public.worker_collector_label(v_me));
end $$;

-- ---------------------------------------------------------------- 5. block from a conversation or an item
drop function if exists public.worker_block_set(integer, boolean);
drop function if exists public.worker_block_set(integer, boolean, uuid, uuid);
create or replace function public.worker_block_set(
  p_handle integer default null, p_on boolean default true, p_connection uuid default null, p_item uuid default null,
  p_lot uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_target uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_connection is not null then
    select public.worker_connection_counterpart(k, v_me) into v_target from public.worker_collector_connection k
     where k.id = p_connection and v_me in (k.initiator_id, k.recipient_id);
  elsif p_item is not null then
    select user_id into v_target from public.worker_collector_item where id = p_item and state <> 'removed';
  elsif p_lot is not null then
    select seller_id into v_target from public.worker_auction_lot where id = p_lot;
  elsif p_handle is not null then
    select user_id into v_target from public.worker_collector_profile where handle_no = p_handle;
  end if;
  if v_target is null or v_target = v_me then return public.worker_fail('not_found'); end if;
  perform public.worker_collector_touch(v_me);
  if coalesce(p_on, false) then
    insert into public.worker_collector_block (blocker_id, blocked_id) values (v_me, v_target) on conflict do nothing;
    update public.worker_collector_connection set status = 'cancelled'
     where status in ('requested', 'accepted', 'negotiating', 'agreed')
       and ((initiator_id = v_me and recipient_id = v_target) or (initiator_id = v_target and recipient_id = v_me));
    update public.worker_collector_item i set state = 'held'
     where i.state = 'reserved' and i.user_id in (v_me, v_target)
       and not exists (select 1 from public.worker_collector_connection k
                        where k.item_id = i.id and k.status = 'agreed')
       and not exists (select 1 from public.worker_auction_lot l
                        where l.item_id = i.id and l.status = 'awaiting_completion');
  else
    delete from public.worker_collector_block where blocker_id = v_me and blocked_id = v_target;
  end if;
  return jsonb_build_object('ok', true, 'blocked', coalesce(p_on, false));
end $$;

-- ---------------------------------------------------------------- 4. photos under an opaque path
create or replace function public.worker_photo_is_opaque(p_path text) returns boolean
language sql immutable as $$ select coalesce(p_path ~ '^p/[0-9a-f]{32}\.(webp|jpg|png)$', false) $$;

/* A path reserved for one upload. The owner lives only here — never in a path, never in an answer. */
create table if not exists public.worker_photo_slot (
  path       text primary key check (path ~ '^p/[0-9a-f]{32}\.(webp|jpg|png)$'),
  user_id    uuid not null references public.worker_profile(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.worker_photo_slot enable row level security;
revoke all on public.worker_photo_slot from public, anon, authenticated;

do $c$ begin
  alter table public.worker_collector_photo drop constraint if exists worker_collector_photo_storage_path_check;
  alter table public.worker_collector_photo drop constraint if exists worker_photo_path_ok;
  alter table public.worker_collector_photo add constraint worker_photo_path_ok check (
    storage_path ~ '^p/[0-9a-f]{32}\.(webp|jpg|png)$'
    or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$');
end $c$;

create or replace function public.worker_photo_slot_owned(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.worker_photo_slot s where s.path = p_path and s.user_id = auth.uid())
$$;

create or replace function public.worker_photo_slot(p_ext text default 'webp') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid(); v_path text;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_ext not in ('webp', 'jpg', 'png') then return public.worker_fail('bad_value'); end if;
  perform public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'photo_slot', 120, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  v_path := 'p/' || replace(gen_random_uuid()::text, '-', '') || '.' || p_ext;
  insert into public.worker_photo_slot (path, user_id) values (v_path, v_me);
  return jsonb_build_object('ok', true, 'path', v_path);
end $$;

/* What anyone is shown: opaque paths only. */
create or replace function public.worker_item_photos(p_item uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(storage_path order by sort_order, created_at), '[]'::jsonb)
  from public.worker_collector_photo where item_id = p_item and public.worker_photo_is_opaque(storage_path)
$$;

create or replace function public.worker_lot_brief(p_lot public.worker_auction_lot) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_lot.id, 'title', p_lot.title, 'phase', public.worker_lot_phase(p_lot),
    'archiveSlug', i.archive_slug, 'kitId', i.kit_id,
    'photo', (select p.storage_path from public.worker_collector_photo p
               where p.item_id = i.id and public.worker_photo_is_opaque(p.storage_path) order by p.sort_order limit 1),
    'currency', p_lot.currency, 'startPrice', p_lot.start_price,
    'currentPrice', coalesce(p_lot.current_price, p_lot.start_price),
    'bidCount', p_lot.bid_count, 'startsAt', p_lot.starts_at, 'endsAt', p_lot.ends_at,
    'reserveSet', p_lot.reserve_price is not null,
    'reserveMet', p_lot.reserve_price is null or coalesce(p_lot.current_price, 0) >= p_lot.reserve_price
  )
  from public.worker_collector_item i where i.id = p_lot.item_id
$$;

create or replace function public.worker_collector_photo_add(p_item uuid, p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_count integer;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not exists (select 1 from public.worker_collector_item where id = p_item and user_id = v_me and state in ('held', 'reserved')) then
    return public.worker_fail('not_found');
  end if;
  if not public.worker_photo_is_opaque(p_path) or not public.worker_photo_slot_owned(p_path) then
    return public.worker_fail('bad_path');
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'worker-collector-pub' and o.name = p_path) then
    return public.worker_fail('not_uploaded');
  end if;
  select count(*) into v_count from public.worker_collector_photo where item_id = p_item;
  if v_count >= 8 then return public.worker_fail('too_many_photos'); end if;
  insert into public.worker_collector_photo (item_id, user_id, storage_path, sort_order)
    values (p_item, v_me, p_path, v_count)
    on conflict (storage_path) do nothing;
  return jsonb_build_object('ok', true, 'photos', public.worker_item_photos(p_item));
end $$;

/* The owner's old photos (path starts with their id) — the browser moves them into the opaque bucket one by one. */
create or replace function public.worker_photo_legacy() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object('ok', true, 'photos', (
    select coalesce(jsonb_agg(jsonb_build_object('itemId', p.item_id, 'path', p.storage_path) order by p.created_at), '[]'::jsonb)
      from public.worker_collector_photo p
     where p.user_id = v_me and not public.worker_photo_is_opaque(p.storage_path)));
end $$;

create or replace function public.worker_collector_photo_migrate(p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid(); v_item uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if public.worker_photo_is_opaque(p_old) or not public.worker_photo_is_opaque(p_new) or not public.worker_photo_slot_owned(p_new) then
    return public.worker_fail('bad_path');
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'worker-collector-pub' and o.name = p_new) then
    return public.worker_fail('not_uploaded');
  end if;
  update public.worker_collector_photo set storage_path = p_new
   where storage_path = p_old and user_id = v_me returning item_id into v_item;
  if v_item is null then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'old', p_old, 'path', p_new, 'photos', public.worker_item_photos(v_item));
end $$;

/* Identification-help photos: same opaque path, same slot. */
create or replace function public.worker_idreq_open(p_id uuid, p_photos text[], p_note text default null, p_club text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_path text;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_id is null or p_photos is null or cardinality(p_photos) not between 1 and 4 then return public.worker_fail('bad_value'); end if;
  if p_club is not null and p_club !~ '^[a-z0-9]{2,30}$' then return public.worker_fail('bad_value'); end if;
  foreach v_path in array p_photos loop
    if not public.worker_photo_is_opaque(v_path) or not public.worker_photo_slot_owned(v_path) then
      return public.worker_fail('bad_path');
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'worker-collector-pub' and o.name = v_path) then
      return public.worker_fail('not_uploaded');
    end if;
  end loop;
  perform public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'idreq_open', 6, interval '1 day') then return public.worker_fail('slow_down'); end if;
  if (select count(*) from public.worker_collector_idreq where user_id = v_me and status = 'open') >= 5 then
    return public.worker_fail('too_many');
  end if;
  insert into public.worker_collector_idreq (id, user_id, note, photos, club_hint)
    values (p_id, v_me, nullif(trim(p_note), ''), p_photos, p_club)
    on conflict (id) do nothing;
  if not found then return public.worker_fail('exists'); end if;
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;

-- the buckets: the old one stops being public (its paths name the owner); the new one carries opaque names only
do $storage$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema is missing — collector photos are disabled until it exists';
    return;
  end if;
  update storage.buckets set public = false where id = 'worker-collector';
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('worker-collector-pub', 'worker-collector-pub', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
    on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                                   allowed_mime_types = excluded.allowed_mime_types;
  -- old bucket: only the owner reads or deletes (to migrate); nobody uploads there any more
  execute 'drop policy if exists worker_collector_upload on storage.objects';
  execute 'drop policy if exists worker_collector_read on storage.objects';
  execute $p$create policy worker_collector_read on storage.objects for select to authenticated
    using (bucket_id = 'worker-collector' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  -- new bucket: an upload needs a slot the caller reserved; reading is public (the name says nothing)
  execute 'drop policy if exists worker_collector_pub_upload on storage.objects';
  execute $p$create policy worker_collector_pub_upload on storage.objects for insert to authenticated
    with check (bucket_id = 'worker-collector-pub' and public.worker_photo_slot_owned(name)
                and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)$p$;
  execute 'drop policy if exists worker_collector_pub_delete on storage.objects';
  execute $p$create policy worker_collector_pub_delete on storage.objects for delete to authenticated
    using (bucket_id = 'worker-collector-pub' and public.worker_photo_slot_owned(name))$p$;
  execute 'drop policy if exists worker_collector_pub_read on storage.objects';
  execute $p$create policy worker_collector_pub_read on storage.objects for select to anon, authenticated
    using (bucket_id = 'worker-collector-pub')$p$;
end
$storage$;

-- ---------------------------------------------------------------- grants
do $grants$
declare v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in (
       'worker_nick_key', 'worker_nick_check', 'worker_profile_consistency', 'worker_collector_label', 'worker_item_owner',
       'worker_collector_display_set', 'worker_closet_mine', 'worker_closet_view', 'worker_collector_settings',
       'worker_collector_identity_set', 'worker_block_set', 'worker_photo_is_opaque', 'worker_photo_slot_owned',
       'worker_photo_slot', 'worker_item_photos', 'worker_lot_brief', 'worker_collector_photo_add', 'worker_photo_legacy',
       'worker_collector_photo_migrate', 'worker_idreq_open')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname in ('worker_closet_view') then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    elsif v_fn.proname in ('worker_collector_display_set', 'worker_closet_mine', 'worker_collector_settings',
                           'worker_collector_identity_set', 'worker_block_set', 'worker_photo_slot', 'worker_photo_legacy',
                           'worker_collector_photo_add', 'worker_collector_photo_migrate', 'worker_idreq_open') then
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    elsif v_fn.proname = 'worker_photo_slot_owned' then
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
end
$grants$;
