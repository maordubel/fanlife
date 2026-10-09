\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- THE SHIRT HUB PRIVACY (stage A).
-- actors: A=f1 (Athens, shows place) · B=f2 (Berlin, shows place) · C=f3 (no place) · Z=f4 (stranger, blocked by A later)
insert into auth.users(id,email) values ('b1111111-9999-9999-9999-111111111111','a9@w9.test'),('b2222222-9999-9999-9999-222222222222','b9@w9.test'),('b3333333-9999-9999-9999-333333333333','c9@w9.test'),('b4444444-9999-9999-9999-444444444444','z9@w9.test') on conflict do nothing;
create temp table ctx9 (k text primary key, v text); grant all on ctx9 to public;
create or replace function pg_temp.call(p_uid text, p_sql text) returns jsonb
language plpgsql as $$
declare v jsonb;
begin
  if p_uid is null then
    execute 'set local role anon';
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{}', true);
  else
    execute 'set local role authenticated';
    perform set_config('request.jwt.claim.sub', p_uid, true);
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'is_anonymous', false)::text, true);
  end if;
  execute p_sql into v;
  execute 'reset role';
  return v;
exception when others then
  execute 'reset role';
  return jsonb_build_object('ok', false, 'error', 'EXC: ' || sqlerrm);
end $$;
create or replace function pg_temp.ok(p_label text, p_cond boolean, p_detail jsonb default null) returns text
language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FAIL %: %', p_label, p_detail; end if;
  return 'PASS ' || p_label;
end $$;
create or replace function pg_temp.open_item(p_uid text, p_slug text, p_price numeric) returns text
language plpgsql as $$
declare v_id text; v jsonb;
begin
  v_id := (pg_temp.call(p_uid, format($q$select public.worker_collector_have(%L)$q$, p_slug))) -> 'item' ->> 'id';
  v := pg_temp.call(p_uid, format($q$select public.worker_collector_item_update(%L, %L)$q$, v_id,
        '{"size":"l","condition":"good","itemType":"original_period","authenticityClaim":"original","forSale":true,"askingPrice":' || p_price || ',"currency":"EUR","openToOffers":true}'));
  if v ->> 'ok' <> 'true' then raise exception 'open_item failed: %', v; end if;
  return v_id;
end $$;

\set A '''b1111111-9999-9999-9999-111111111111'''
\set B '''b2222222-9999-9999-9999-222222222222'''
\set C '''b3333333-9999-9999-9999-333333333333'''

select pg_temp.call(:A, $q$select public.worker_closet_mine()$q$) ->> 'ok';
select pg_temp.call(:B, $q$select public.worker_closet_mine()$q$) ->> 'ok';
select pg_temp.call(:C, $q$select public.worker_closet_mine()$q$) ->> 'ok';
update public.worker_profile set display_name = 'Real Name' where id = 'b1111111-9999-9999-9999-111111111111'::uuid;
update public.worker_collector_profile set show_nickname = true where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid;

-- 1. the default is the number, and the account name is not a nickname
select pg_temp.ok('default identity is the number', (pg_temp.call(:A, $q$select public.worker_closet_mine()$q$)) -> 'profile' ->> 'identityMode' = 'number');
select pg_temp.ok('the account display name never becomes the nickname', (pg_temp.call(:A, $q$select public.worker_closet_mine()$q$)) -> 'label' ->> 'nickname' is null);

-- 2. nickname rules
select pg_temp.ok('too short is refused', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','ab')$q$)) ->> 'error' = 'nick_short');
select pg_temp.ok('too long is refused', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','abcdefghijklmnopqrstuvwxyz')$q$)) ->> 'error' = 'nick_long');
select pg_temp.ok('an email-like name is refused', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','me@mail.com')$q$)) ->> 'error' = 'nick_chars');
select pg_temp.ok('digits only is refused', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','12345')$q$)) ->> 'error' = 'nick_chars');
select pg_temp.ok('staff names are reserved', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','Admin')$q$)) ->> 'error' = 'nick_reserved');
select pg_temp.ok('look-alikes are reserved too', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','Adm1n Team')$q$)) ->> 'error' = 'nick_reserved');
select pg_temp.ok('a fake collector number is refused', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','אספן 1842')$q$)) ->> 'error' = 'nick_reserved');
select pg_temp.ok('a word that merely contains support is fine', (pg_temp.call(:C, $q$select public.worker_collector_identity_set('nickname','Supporter99')$q$)) ->> 'ok' = 'true');
select pg_temp.ok('A takes a nickname', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','Red Fan 77')$q$)) ->> 'ok' = 'true');
select pg_temp.ok('the label carries it', (pg_temp.call(:A, $q$select public.worker_closet_mine()$q$)) -> 'label' ->> 'nickname' = 'Red Fan 77');
select pg_temp.ok('the same name after normalising is taken', (pg_temp.call(:B, $q$select public.worker_collector_identity_set('nickname','redfan_77')$q$)) ->> 'error' = 'nick_taken');
select pg_temp.ok('the answer for a taken name does not say who', not (pg_temp.call(:B, $q$select public.worker_collector_identity_set('nickname','redfan_77')$q$))::text like '%b1111111%');
select pg_temp.ok('nickname mode without a nickname is impossible', (select count(*) from public.worker_collector_profile where identity_mode = 'nickname' and public_nickname is null) = 0);
select pg_temp.ok('choosing the number again forgets the nickname', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('number')$q$)) -> 'label' ->> 'nickname' is null);
select pg_temp.ok('and frees the name', (pg_temp.call(:B, $q$select public.worker_collector_identity_set('nickname','Red Fan 77')$q$)) ->> 'ok' = 'true');
select pg_temp.call(:B, $q$select public.worker_collector_identity_set('number')$q$) ->> 'ok';

-- 3. anonymous is one consistent state
select pg_temp.ok('A makes the closet public', (pg_temp.call(:A, $q$select public.worker_collector_settings('{"visibility":"public"}')$q$)) ->> 'visibility' = 'public');
update public.worker_collector_profile set country = 'GR', city = 'Athens', city_key = 'athens', show_place = true where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid;
select pg_temp.ok('anonymous while shared asks first', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('anonymous')$q$)) ->> 'error' = 'confirm_private');
select pg_temp.ok('and changed nothing', (select identity_mode || closet_visibility from public.worker_collector_profile where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid) = 'numberpublic');
insert into ctx9 select 'oldtoken', share_token from public.worker_collector_profile where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid;
insert into ctx9 select 'handleA', handle_no::text from public.worker_collector_profile where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid;
select pg_temp.ok('confirmed: anonymous', (pg_temp.call(:A, $q$select public.worker_collector_identity_set('anonymous', null, true)$q$)) ->> 'identityMode' = 'anonymous');
select pg_temp.ok('the closet became private', (select closet_visibility from public.worker_collector_profile where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid) = 'private');
select pg_temp.ok('the place is hidden', (select show_place from public.worker_collector_profile where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid) = false);
select pg_temp.ok('the old share link died', (select share_token from public.worker_collector_profile where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid) <> (select v from ctx9 where k='oldtoken'));
select pg_temp.ok('closet view of an anonymous collector is "not found"', (pg_temp.call(:B, format($q$select public.worker_closet_view(%s)$q$, (select v from ctx9 where k='handleA')))) ->> 'error' = 'not_found');
select pg_temp.ok('even with the old token', (pg_temp.call(:B, format($q$select public.worker_closet_view(%s, %L)$q$, (select v from ctx9 where k='handleA'), (select v from ctx9 where k='oldtoken')))) ->> 'error' = 'not_found');
select pg_temp.ok('anonymous cannot reopen the closet', (pg_temp.call(:A, $q$select public.worker_collector_settings('{"visibility":"public"}')$q$)) ->> 'error' = 'anonymous_requires_private');
update public.worker_collector_profile set show_place = true where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid;
select pg_temp.ok('even a direct write cannot show a place while anonymous', (select show_place from public.worker_collector_profile where user_id = 'b1111111-9999-9999-9999-111111111111'::uuid) = false);

-- 4. an anonymous seller leaks nothing
insert into ctx9 select 'item', pg_temp.open_item(:A, 'vp-1990-home', 80);
select pg_temp.ok('the seller label is anonymous', (pg_temp.call(:C, format($q$select public.worker_market_item(%L)$q$, (select v from ctx9 where k='item')))) -> 'item' -> 'seller' ->> 'anonymous' = 'true');
select pg_temp.ok('no number on the seller', (pg_temp.call(:C, format($q$select public.worker_market_item(%L)$q$, (select v from ctx9 where k='item')))) -> 'item' -> 'seller' -> 'handle' = 'null'::jsonb);
select pg_temp.ok('no owner id anywhere in the item', not (pg_temp.call(:C, format($q$select public.worker_market_item(%L)$q$, (select v from ctx9 where k='item'))))::text like '%b1111111-9999%');
select pg_temp.ok('no owner id anywhere in search', not (pg_temp.call(null, $q$select public.worker_market_search('{}')$q$))::text like '%b1111111-9999%');
select pg_temp.ok('no owner id anywhere in the list', not (pg_temp.call(null, $q$select public.worker_market_list()$q$))::text like '%b1111111-9999%');
select pg_temp.ok('the place filter cannot find an anonymous seller', not (pg_temp.call(null, $q$select public.worker_market_search('{"countries":["GR"]}')$q$))::text like '%vp-1990-home%');
insert into ctx9 select 'conn', (pg_temp.call(:C, format($q$select public.worker_connect(%L, 'buy', 'hello')$q$, (select v from ctx9 where k='item')))) ->> 'connectionId';
select pg_temp.ok('a conversation shows the counterpart anonymous', (pg_temp.call(:C, format($q$select public.worker_connection_thread(%L)$q$, (select v from ctx9 where k='conn')))::text) like '%"anonymous": true%');
select pg_temp.ok('and no owner id', not (pg_temp.call(:C, format($q$select public.worker_connection_thread(%L)$q$, (select v from ctx9 where k='conn')))::text) like '%b1111111-9999%');
select pg_temp.ok('C can block an anonymous seller from the conversation', (pg_temp.call(:C, format($q$select public.worker_block_set(null, true, %L)$q$, (select v from ctx9 where k='conn')))) ->> 'ok' = 'true');
select pg_temp.ok('and unblock from the item', (pg_temp.call(:C, format($q$select public.worker_block_set(null, false, null, %L)$q$, (select v from ctx9 where k='item')))) ->> 'ok' = 'true');
select pg_temp.ok('the old two-argument call still works', (pg_temp.call(:C, format($q$select public.worker_block_set(%s, false)$q$, (select v from ctx9 where k='handleA')))) ->> 'ok' = 'true');

-- 5. the closet shows a selection
select pg_temp.call(:A, $q$select public.worker_collector_identity_set('number')$q$) ->> 'ok';
select pg_temp.call(:A, $q$select public.worker_collector_settings('{"visibility":"public"}')$q$) ->> 'ok';
insert into ctx9 select 'keep', (pg_temp.call(:A, $q$select public.worker_collector_have('fka-1999-00-home')$q$)) -> 'item' ->> 'id';
select pg_temp.ok('a new shirt is not on display', ((pg_temp.call(:A, $q$select public.worker_closet_mine()$q$)) -> 'items') @> jsonb_build_array(jsonb_build_object('inDisplay', false)));
select pg_temp.ok('the public closet shows only what is for sale', jsonb_array_length((pg_temp.call(:B, format($q$select public.worker_closet_view(%s)$q$, (select v from ctx9 where k='handleA')))) -> 'items') = 1);
select pg_temp.ok('display on', (pg_temp.call(:A, format($q$select public.worker_collector_display_set(array[%L]::uuid[], true)$q$, (select v from ctx9 where k='keep')))) ->> 'changed' = '1');
select pg_temp.ok('now two are shown', jsonb_array_length((pg_temp.call(:B, format($q$select public.worker_closet_view(%s)$q$, (select v from ctx9 where k='handleA')))) -> 'items') = 2);
select pg_temp.ok('B cannot change what A shows', (pg_temp.call(:B, format($q$select public.worker_collector_display_set(array[%L]::uuid[], false)$q$, (select v from ctx9 where k='keep')))) ->> 'changed' = '0');
select pg_temp.ok('display off', (pg_temp.call(:A, format($q$select public.worker_collector_display_set(array[%L]::uuid[], false)$q$, (select v from ctx9 where k='keep')))) ->> 'changed' = '1');
select pg_temp.ok('back to one', jsonb_array_length((pg_temp.call(:B, format($q$select public.worker_closet_view(%s)$q$, (select v from ctx9 where k='handleA')))) -> 'items') = 1);

-- 6. old photos stay hidden until the owner moves them
insert into ctx9 select 'legacy', 'b1111111-9999-9999-9999-111111111111/' || (select v from ctx9 where k='item') || '/' || gen_random_uuid() || '.webp';
insert into public.worker_collector_photo (item_id, user_id, storage_path, sort_order) values ((select v from ctx9 where k='item')::uuid, 'b1111111-9999-9999-9999-111111111111'::uuid, (select v from ctx9 where k='legacy'), 0);
select pg_temp.ok('a legacy path is never shown to anyone', not (pg_temp.call(null, format($q$select public.worker_market_item(%L)$q$, (select v from ctx9 where k='item'))))::text like '%b1111111-9999%');
select pg_temp.ok('the owner is told what to move', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_photo_legacy()$q$)) -> 'photos') = 1);
select pg_temp.ok('nobody else is told', jsonb_array_length((pg_temp.call(:B, $q$select public.worker_photo_legacy()$q$)) -> 'photos') = 0);
insert into ctx9 select 'slot', (pg_temp.call(:A, $q$select public.worker_photo_slot('webp')$q$)) ->> 'path';
select pg_temp.ok('moving needs the file to be there', (pg_temp.call(:A, format($q$select public.worker_collector_photo_migrate(%L, %L)$q$, (select v from ctx9 where k='legacy'), (select v from ctx9 where k='slot')))) ->> 'error' = 'not_uploaded');
insert into storage.objects (bucket_id, name) values ('worker-collector-pub', (select v from ctx9 where k='slot'));
select pg_temp.ok('B cannot move A''s photo', (pg_temp.call(:B, format($q$select public.worker_collector_photo_migrate(%L, %L)$q$, (select v from ctx9 where k='legacy'), (select v from ctx9 where k='slot')))) ->> 'error' = 'bad_path');
select pg_temp.ok('A moves it', (pg_temp.call(:A, format($q$select public.worker_collector_photo_migrate(%L, %L)$q$, (select v from ctx9 where k='legacy'), (select v from ctx9 where k='slot')))) ->> 'ok' = 'true');
select pg_temp.ok('now the item shows the opaque path', (pg_temp.call(null, format($q$select public.worker_market_item(%L)$q$, (select v from ctx9 where k='item')))) -> 'item' -> 'photos' ->> 0 = (select v from ctx9 where k='slot'));
select pg_temp.ok('and nothing is left to move', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_photo_legacy()$q$)) -> 'photos') = 0);

-- 7. the old bucket is closed to the public
select pg_temp.ok('the old bucket is not public', (select public from storage.buckets where id = 'worker-collector') = false);
select pg_temp.ok('the new bucket is', (select public from storage.buckets where id = 'worker-collector-pub') = true);
