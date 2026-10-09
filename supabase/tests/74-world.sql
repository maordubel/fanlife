\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- THE SHIRT HUB REST OF THE WORLD.
-- actors: A=f1 (Athens, shows place) · B=f2 (Berlin, shows place) · C=f3 (no place) · Z=f4 (stranger, blocked by A later)
insert into auth.users(id,email) values ('a1111111-8888-8888-8888-111111111111','a7@w8.test'),('a2222222-8888-8888-8888-222222222222','b7@w8.test'),('a3333333-8888-8888-8888-333333333333','c7@w8.test'),('a4444444-8888-8888-8888-444444444444','z7@w8.test') on conflict do nothing;
create temp table ctx8 (k text primary key, v text); grant all on ctx8 to public;
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

\set A '''a1111111-8888-8888-8888-111111111111'''
\set B '''a2222222-8888-8888-8888-222222222222'''

select pg_temp.ok('the library answers a guest', (pg_temp.call(null, $q$select public.worker_club_search('boca')$q$)) -> 'clubs' -> 0 ->> 'key' = 'boca');
select pg_temp.ok('an alias finds the club', (pg_temp.call(null, $q$select public.worker_club_search('man utd')$q$)) -> 'clubs' -> 0 ->> 'key' = 'manchesterunited');
select pg_temp.ok('a guest cannot list a world shirt', (pg_temp.call(null, $q$select public.worker_world_have('boca','Boca Juniors','AR')$q$)) ->> 'ok' is distinct from 'true');
insert into ctx8 select 'w1', (pg_temp.call(:A, $q$select public.worker_world_have('boca','Boca Juniors','AR','1981','home','Adidas')$q$)) -> 'item' ->> 'id';
select pg_temp.ok('A lists a Boca shirt with no archive slug', (select v from ctx8 where k='w1') is not null);
select pg_temp.ok('the item says it is a world copy', (pg_temp.call(:A, $q$select public.worker_world_have('boca','Boca Juniors','AR','1981','home','Adidas')$q$)) -> 'item' -> 'world' ->> 'club' = 'Boca Juniors');
select pg_temp.ok('a bad kit is refused', (pg_temp.call(:A, $q$select public.worker_world_have('boca','Boca Juniors','AR','1981','nonsense')$q$)) ->> 'ok' is distinct from 'true');
select pg_temp.ok('an unknown library key is refused', (pg_temp.call(:A, $q$select public.worker_world_have('zzzzzz',null,null)$q$)) ->> 'ok' is distinct from 'true');
select pg_temp.ok('a new club name becomes a candidate in review', (pg_temp.call(:B, $q$select public.worker_world_have(null,'FC Nowhere United','NO')$q$)) ->> 'ok' = 'true');
select pg_temp.ok('a candidate club is not offered to the public yet', not (pg_temp.call(null, $q$select public.worker_club_search('nowhere')$q$))::text like '%Nowhere%');
select pg_temp.ok('the same new name does not make a second club', (select count(*) from public.worker_club_library where lower(name) like 'fc nowhere%') = 1);
select pg_temp.ok('open it for sale', (pg_temp.call(:A, format($q$select public.worker_collector_item_update(%L, %L)$q$, (select v from ctx8 where k='w1'),
  '{"size":"l","condition":"good","itemType":"original_period","authenticityClaim":"match_worn","forSale":true,"askingPrice":120,"currency":"EUR","openToOffers":true}'))) ->> 'ok' = 'true');
select pg_temp.ok('world scope finds it', ((pg_temp.call(null, $q$select public.worker_market_search('{"scope":"world"}')$q$)) -> 'facets' ->> 'total')::int >= 1);
select pg_temp.ok('game scope does not', not (pg_temp.call(null, $q$select public.worker_market_search('{"scope":"game"}')$q$))::text like '%Boca Juniors%');
select pg_temp.ok('club filter by library key', (pg_temp.call(null, $q$select public.worker_market_search('{"scope":"world","clubs":["boca"]}')$q$)) -> 'items' -> 0 -> 'world' ->> 'clubKey' = 'boca');
select pg_temp.ok('text finds by alias-free club words', (pg_temp.call(null, $q$select public.worker_market_search('{"text":"boca"}')$q$)) -> 'items' -> 0 ->> 'id' = (select v from ctx8 where k='w1'));
select pg_temp.ok('facets split game and world', (pg_temp.call(null, $q$select public.worker_market_search('{}')$q$)) -> 'facets' -> 'scope' ? 'world');
select pg_temp.ok('no user id leaks in a world search', not (pg_temp.call(null, $q$select public.worker_market_search('{"scope":"world"}')$q$))::text like '%userId%');
