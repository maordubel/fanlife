\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- DIRECT LISTING (30.10.2026): publish without a closet copy, idempotency, my listings, closet isolation.
-- actors: A (seller) · B (buyer)
insert into auth.users(id,email) values ('a1111111-7979-7979-7979-111111111111','a79@t.test'),('a2222222-7979-7979-7979-222222222222','b79@t.test') on conflict do nothing;
create temp table c79 (k text primary key, v text); grant all on c79 to public;
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
create or replace function pg_temp.slot(p_uid text) returns text
language plpgsql as $$
declare v_path text;
begin
  v_path := (pg_temp.call(p_uid, $q$select public.worker_photo_slot('webp')$q$)) ->> 'path';
  insert into storage.objects (bucket_id, name) values ('worker-collector-pub', v_path);
  return v_path;
end $$;
\set A '\'a1111111-7979-7979-7979-111111111111\''
\set B '\'a2222222-7979-7979-7979-222222222222\''

-- anonymous callers are refused
select pg_temp.ok('anon cannot publish', (pg_temp.call(null, $q$select public.worker_market_publish('0123456789abcdef0123', '{"mode":"sell"}'::jsonb)$q$)) ->> 'ok' is distinct from 'true');

-- A. a Boca shirt that is not in the closet, sold
insert into c79 select 'p1', pg_temp.slot(:A);
select pg_temp.ok('case A: Boca, free text club, sell',
  (pg_temp.call(:A, format($q$select public.worker_market_publish('keyboca00000000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','country','AR','season','1999/00','mode','sell','price','250','currency','EUR','photos',json_build_array((select v from c79 where k='p1'))))))
  ->> 'ok' = 'true');
insert into c79 select 'a', (select id::text from public.worker_collector_item where user_id = :A::uuid and idem_key = 'keyboca00000000000001');
select pg_temp.ok('the listing is public', (pg_temp.call(null, format($q$select public.worker_market_item(%L)$q$, (select v from c79 where k='a')))) ->> 'ok' = 'true');
select pg_temp.ok('it is NOT in the closet', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_closet_mine()$q$)) -> 'items') = 0);
select pg_temp.ok('it IS in my listings', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_listings_mine()$q$)) -> 'listings') = 1);
select pg_temp.ok('a new club waits in review', (select status from public.worker_club_library where name = 'Boca Juniors' limit 1) in ('review','market','active'));

-- idempotency: retry or double tap is the same listing
select pg_temp.ok('same key = same listing', (pg_temp.call(:A, format($q$select public.worker_market_publish('keyboca00000000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','mode','sell','price','250','photos',json_build_array((select v from c79 where k='p1'))))))
  ->> 'created' = 'false');
select pg_temp.ok('still one row', (select count(*) from public.worker_collector_item where user_id = :A::uuid) = 1);

-- validation
select pg_temp.ok('no photo, no listing', (pg_temp.call(:A, $q$select public.worker_market_publish('keynophoto00000000001', '{"clubName":"Boca Juniors","mode":"swap"}'::jsonb)$q$)) ->> 'error' = 'photos_required');
insert into c79 select 'p2', pg_temp.slot(:A);
select pg_temp.ok('sell without a price is refused', (pg_temp.call(:A, format($q$select public.worker_market_publish('keynoprice0000000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','mode','sell','photos',json_build_array((select v from c79 where k='p2'))))))
  ->> 'error' = 'price_required');
select pg_temp.ok('a bad mode is refused', (pg_temp.call(:A, format($q$select public.worker_market_publish('keybadmode0000000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','mode','none','photos',json_build_array((select v from c79 where k='p2'))))))
  ->> 'ok' is distinct from 'true');
select pg_temp.ok('someone else''s photo slot is refused', (pg_temp.call(:B, format($q$select public.worker_market_publish('keyforeign0000000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','mode','swap','photos',json_build_array((select v from c79 where k='p2'))))))
  ->> 'error' = 'bad_path');
select pg_temp.ok('a replica cannot claim to be original', (pg_temp.call(:A, format($q$select public.worker_market_publish('keyreplica000000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','mode','swap','itemType','replica','authenticityClaim','original','photos',json_build_array((select v from c79 where k='p2'))))))
  ->> 'ok' is distinct from 'true');
select pg_temp.ok('nothing was left behind by the refusals', (select count(*) from public.worker_collector_item where user_id = :A::uuid) = 1);

-- swap, unknown season, also add to the closet (explicit); two copies = two listings
select pg_temp.ok('swap with an unknown season, added to the closet on request',
  (pg_temp.call(:A, format($q$select public.worker_market_publish('keyswap000000000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','mode','swap','lookingFor','a River shirt','addToCloset',true,'photos',json_build_array((select v from c79 where k='p2'))))))
  ->> 'ok' = 'true');
select pg_temp.ok('the closet now shows exactly that one', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_closet_mine()$q$)) -> 'items') = 1);
insert into c79 select 'p3', pg_temp.slot(:A);
select pg_temp.ok('a second copy of the same model is its own listing',
  (pg_temp.call(:A, format($q$select public.worker_market_publish('keysecondcopy00000000001', %L::jsonb)$q$,
     json_build_object('clubName','Boca Juniors','season','1999/00','mode','both','price','180','currency','EUR','photos',json_build_array((select v from c79 where k='p3'))))))
  ->> 'ok' = 'true');
select pg_temp.ok('three listings now', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_listings_mine()$q$)) -> 'listings') = 3);
select pg_temp.ok('swap row says what it looks for', exists (select 1 from public.worker_collector_item where idem_key = 'keyswap000000000000001' and looking_for = 'a River shirt' and for_trade and not for_sale));

-- listing management
select pg_temp.ok('B cannot touch A''s listing', (pg_temp.call(:B, format($q$select public.worker_listing_set(%L, 'remove')$q$, (select v from c79 where k='a')))) ->> 'error' = 'not_found');
select pg_temp.ok('pause hides it', (pg_temp.call(:A, format($q$select public.worker_listing_set(%L, 'pause')$q$, (select v from c79 where k='a')))) ->> 'ok' = 'true');
select pg_temp.ok('paused is not public', (pg_temp.call(null, format($q$select public.worker_market_item(%L)$q$, (select v from c79 where k='a')))) ->> 'ok' is distinct from 'true');
select pg_temp.ok('paused stays in my listings', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_listings_mine()$q$)) -> 'listings') = 3);
select pg_temp.ok('resume brings it back', (pg_temp.call(:A, format($q$select public.worker_listing_set(%L, 'resume')$q$, (select v from c79 where k='a')))) ->> 'ok' = 'true');
select pg_temp.ok('public again', (pg_temp.call(null, format($q$select public.worker_market_item(%L)$q$, (select v from c79 where k='a')))) ->> 'ok' = 'true');
select pg_temp.ok('add to closet on demand', (pg_temp.call(:A, format($q$select public.worker_listing_set(%L, 'closet_add')$q$, (select v from c79 where k='a')))) ->> 'ok' = 'true');
select pg_temp.ok('mark sold', (pg_temp.call(:A, format($q$select public.worker_listing_set(%L, 'sold')$q$, (select v from c79 where k='a')))) ->> 'ok' = 'true');
select pg_temp.ok('sold is no longer public', (pg_temp.call(null, format($q$select public.worker_market_item(%L)$q$, (select v from c79 where k='a')))) ->> 'ok' is distinct from 'true');

-- closet shortcut: the same copy gets its terms (no duplicate row)
insert into c79 select 'closet', (pg_temp.call(:A, $q$select public.worker_collector_have('boca-juniors-1999-home')$q$)) -> 'item' ->> 'id';
select pg_temp.ok('closet copy exists', (select v from c79 where k='closet') is not null);
insert into c79 select 'p4', pg_temp.slot(:A);
select pg_temp.ok('closet copy lists with its own id, no second row',
  (pg_temp.call(:A, format($q$select public.worker_market_publish('keyclosetitem00000000001', %L::jsonb)$q$,
     json_build_object('itemId',(select v from c79 where k='closet'),'mode','sell','price','90','currency','ILS','photos',json_build_array((select v from c79 where k='p4'))))))
  ->> 'listingId' = (select v from c79 where k='closet'));
select pg_temp.ok('and it stays in the closet', (select in_closet from public.worker_collector_item where id = (select v from c79 where k='closet')::uuid));
select pg_temp.ok('B cannot publish A''s closet copy', (pg_temp.call(:B, format($q$select public.worker_market_publish('keystolen0000000000001', %L::jsonb)$q$,
     json_build_object('itemId',(select v from c79 where k='closet'),'mode','sell','price','1','photos',json_build_array((select v from c79 where k='p4'))))))
  ->> 'ok' is distinct from 'true');

-- grants
select pg_temp.ok('no direct table write for members', not has_table_privilege('authenticated', 'public.worker_collector_item', 'insert'));
select pg_temp.ok('publish is members only', has_function_privilege('authenticated', 'public.worker_market_publish(text,jsonb)', 'execute') and not has_function_privilege('anon', 'public.worker_market_publish(text,jsonb)', 'execute'));
