\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- THE SHIRT HUB Wave 3 — place, circles, the pipe, identification help.
-- actors: A=f1 (Athens, shows place) · B=f2 (Berlin, shows place) · C=f3 (no place) · Z=f4 (stranger, blocked by A later)
insert into auth.users(id,email) values ('a1111111-7777-7777-7777-111111111111','a7@x.test'),('a2222222-7777-7777-7777-222222222222','b7@x.test'),('a3333333-7777-7777-7777-333333333333','c7@x.test'),('a4444444-7777-7777-7777-444444444444','z7@x.test') on conflict do nothing;
create temp table ctx7 (k text primary key, v text); grant all on ctx7 to public;
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
\set A '''a1111111-7777-7777-7777-111111111111'''
\set B '''a2222222-7777-7777-7777-222222222222'''

-- ONE CLOSET, TWO APPS — a shirt assembled in a game
select pg_temp.ok('anon cannot add a game shirt', (pg_temp.call(null, $q$select public.worker_collector_have_game('gametest-bbb-2')$q$)) ->> 'ok' is distinct from 'true');
insert into ctx7 select 'g1', (pg_temp.call(:A, $q$select public.worker_collector_have_game('gametest-aaa-1')$q$)) -> 'item' ->> 'id';
select pg_temp.ok('A gets a closet item', (select v from ctx7 where k='g1') is not null);
select pg_temp.ok('asking again does not make a second copy', (pg_temp.call(:A, $q$select public.worker_collector_have_game('gametest-aaa-1')$q$)) ->> 'created' = 'false');
select pg_temp.ok('the closet knows it is a game shirt', (pg_temp.call(:A, $q$select public.worker_game_items_mine()$q$)) -> 'items' ? (select v from ctx7 where k='g1'));
select pg_temp.ok('a game shirt cannot be offered for sale', (pg_temp.call(:A, format($q$select public.worker_collector_item_update(%L, %L)$q$, (select v from ctx7 where k='g1'),
  '{"size":"l","condition":"good","itemType":"original_period","authenticityClaim":"original","forSale":true,"askingPrice":50,"currency":"EUR","openToOffers":true}'))) ->> 'ok' is distinct from 'true');
select pg_temp.ok('the public "have" count ignores game shirts', ((pg_temp.call(null, $q$select public.worker_shirt_signals(array['gametest-aaa-1'])$q$)) -> 'gametest-aaa-1' ->> 'have') = '0');
select pg_temp.ok('A still sees it as theirs', ((pg_temp.call(:A, $q$select public.worker_shirt_signals(array['gametest-aaa-1'])$q$)) -> 'gametest-aaa-1' ->> 'youHave') = 'true');
select pg_temp.ok('B cannot confirm A''s shirt', (pg_temp.call(:B, format($q$select public.worker_collector_confirm_owned(%L)$q$, (select v from ctx7 where k='g1')))) ->> 'ok' is distinct from 'true');
select pg_temp.ok('A confirms they own it', (pg_temp.call(:A, format($q$select public.worker_collector_confirm_owned(%L)$q$, (select v from ctx7 where k='g1')))) ->> 'ok' = 'true');
select pg_temp.ok('now it can be offered', (pg_temp.call(:A, format($q$select public.worker_collector_item_update(%L, %L)$q$, (select v from ctx7 where k='g1'),
  '{"size":"l","condition":"good","itemType":"original_period","authenticityClaim":"original","forSale":true,"askingPrice":50,"currency":"EUR","openToOffers":true}'))) ->> 'ok' = 'true');
select pg_temp.ok('and the public count sees it', ((pg_temp.call(null, $q$select public.worker_shirt_signals(array['gametest-aaa-1'])$q$)) -> 'gametest-aaa-1' ->> 'have') = '1');
select pg_temp.ok('a real copy is never turned into a game shirt', (pg_temp.call(:A, $q$select public.worker_collector_have_game('gametest-aaa-1')$q$)) ->> 'created' = 'false');
