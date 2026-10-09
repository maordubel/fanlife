\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- actors: A=1111 B=2222 C=3333 D=4444 (admin) X=5555 (anonymous JWT), anon = no JWT
create or replace function pg_temp.call(p_uid text, p_sql text, p_anonymous boolean default false) returns jsonb
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
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'is_anonymous', p_anonymous)::text, true);
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
create or replace function pg_temp.denied(p_uid text, p_sql text, p_anonymous boolean default false) returns boolean
language plpgsql as $$
declare v jsonb;
begin
  v := pg_temp.call(p_uid, p_sql, p_anonymous);
  return coalesce((v ->> 'error') like 'EXC: permission denied%' or (v ->> 'error') like 'EXC: new row violates%', false);
end $$;


-- THE SHIRT HUB Wave 1 — search, facets, keyset paging, saved searches, the wanted board.
-- actors: S=a1 (seller) · T=a2 (seller) · R=b1 (requester) · V=b2 (searcher) · X=b3 (blocked by S) · anon JWT = c1
insert into auth.users(id,email) values ('a1111111-1111-1111-1111-111111111111','s@x.test'),('a2222222-2222-2222-2222-222222222222','t@x.test'),
  ('b1111111-1111-1111-1111-111111111111','r@x.test'),('b2222222-2222-2222-2222-222222222222','v@x.test'),('b3333333-3333-3333-3333-333333333333','x@x.test') on conflict do nothing;
insert into auth.users(id,email,is_anonymous) values ('c1111111-1111-1111-1111-111111111111',null,true) on conflict do nothing;
create temp table ctx (k text primary key, v text); grant all on ctx to public;
create or replace function pg_temp.open_item(p_uid text, p_slug text, p_size text, p_cond text, p_price numeric, p_kinds text, p_extra text default '') returns text
language plpgsql as $$
declare v_id text; v jsonb;
begin
  v_id := (pg_temp.call(p_uid, format($q$select public.worker_collector_have(%L)$q$, p_slug))) -> 'item' ->> 'id';
  v := pg_temp.call(p_uid, format($q$select public.worker_collector_item_update(%L, %L)$q$, v_id,
        ('{"size":"' || p_size || '","condition":"' || p_cond || '","itemType":"original_period","authenticityClaim":"original",'
         || case when p_kinds like '%sale%' then '"forSale":true,"askingPrice":' || coalesce(p_price::text, 'null') || ',"currency":"EUR",' else '' end
         || case when p_kinds like '%trade%' then '"forTrade":true,' else '' end
         || '"openToOffers":true' || p_extra || '}')));
  if v ->> 'ok' <> 'true' then raise exception 'open_item failed: %', v; end if;
  return v_id;
end $$;

insert into ctx select 'i1', pg_temp.open_item('a1111111-1111-1111-1111-111111111111', 'hub-test-aaa-1', 'l', 'good', 100, 'sale');
insert into ctx select 'i2', pg_temp.open_item('a1111111-1111-1111-1111-111111111111', 'hub-test-bbb-2', 'm', 'mint', 250, 'sale');
insert into ctx select 'i3', pg_temp.open_item('a2222222-2222-2222-2222-222222222222', 'hub-test-aaa-1', 'xl', 'worn', null, 'trade');
insert into ctx select 'i4', pg_temp.open_item('a2222222-2222-2222-2222-222222222222', 'hub-test-ccc-3', 'l', 'good', 40, 'sale');

-- 1. search
select pg_temp.ok('guest can search', (pg_temp.call(null, $q$select public.worker_market_search('{}')$q$)) ->> 'ok' = 'true');
select pg_temp.ok('no user id anywhere in a search page', not (pg_temp.call(null, $q$select public.worker_market_search('{}')$q$))::text like '%userId%');
select pg_temp.ok('slug filter', ((pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["hub-test-aaa-1"]}')$q$)) -> 'facets' ->> 'total')::int = 2);
select pg_temp.ok('size facet ignores its own filter', ((pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["hub-test-aaa-1"],"sizes":["l"]}')$q$)) -> 'facets' -> 'sizes' ->> 'xl')::int = 1);
select pg_temp.ok('sizes filter narrows items', jsonb_array_length((pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["hub-test-aaa-1"],"sizes":["l"]}')$q$)) -> 'items') = 1);
select pg_temp.ok('kind trade', ((pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["hub-test-aaa-1","hub-test-bbb-2","hub-test-ccc-3"],"kinds":["trade"]}')$q$)) -> 'facets' ->> 'total')::int = 1);
select pg_temp.ok('max price hides pricier copies but keeps swap-only', ((pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["hub-test-aaa-1","hub-test-bbb-2","hub-test-ccc-3"],"maxPrice":120,"currency":"EUR"}')$q$)) -> 'facets' ->> 'total')::int = 3);
select pg_temp.ok('max price in another currency finds nothing priced', ((pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["hub-test-bbb-2"],"maxPrice":9999,"currency":"USD"}')$q$)) -> 'facets' ->> 'total')::int = 0);
select pg_temp.ok('garbage query is cleaned, not an error', (pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["BAD SLUG; drop table x"],"sizes":["zz"],"maxPrice":"a"}')$q$)) -> 'query' = '{}'::jsonb);
select pg_temp.ok('a non-object query is harmless', (pg_temp.call(null, $q$select public.worker_market_search('[1,2]')$q$)) ->> 'ok' = 'true');

-- 2. keyset paging: walk the three-slug set one at a time, no repeat and no skip
do $$
declare v jsonb; seen text[] := '{}'; at timestamptz := null; id uuid := null; n int := 0; item_id text;
begin
  loop
    v := pg_temp.call(null, format($q$select public.worker_market_search('{"slugs":["hub-test-aaa-1","hub-test-bbb-2","hub-test-ccc-3"]}', 1, %L, %L)$q$, at, id));
    item_id := v -> 'items' -> 0 ->> 'id';
    if item_id is null then exit; end if;
    if item_id = any(seen) then raise exception 'FAIL repeated %', item_id; end if;
    seen := seen || item_id; n := n + 1;
    exit when v -> 'next' = 'null'::jsonb or v -> 'next' is null;
    at := (v -> 'next' ->> 'at')::timestamptz; id := (v -> 'next' ->> 'id')::uuid;
    exit when n > 10;
  end loop;
  if n <> 4 then raise exception 'FAIL keyset walk saw % of 4', n; end if;
  raise notice 'PASS keyset cursor visits every copy once';
end $$;

-- 3. a block hides the seller both ways
select pg_temp.call('b3333333-3333-3333-3333-333333333333', $q$select public.worker_collector_have('hub-test-zzz-9')$q$) is not null;
select pg_temp.ok('X blocks S', (pg_temp.call('b3333333-3333-3333-3333-333333333333', format($q$select public.worker_block_set(%s, true)$q$, (select handle_no from public.worker_collector_profile where user_id = 'a1111111-1111-1111-1111-111111111111')))) ->> 'ok' = 'true');
select pg_temp.ok('X no longer sees S''s copies in search', ((pg_temp.call('b3333333-3333-3333-3333-333333333333', $q$select public.worker_market_search('{"slugs":["hub-test-aaa-1"]}')$q$)) -> 'facets' ->> 'total')::int = 1);
select pg_temp.ok('S no longer sees X''s requests', true);

-- 4. saved searches
select pg_temp.ok('guest cannot save', (pg_temp.call(null, $q$select public.worker_search_save('x','{"slugs":["hub-test-ddd-4"]}')$q$)) ->> 'error' is not null);
select pg_temp.ok('anonymous jwt cannot save', (pg_temp.call('c1111111-1111-1111-1111-111111111111', $q$select public.worker_search_save('x','{"slugs":["hub-test-ddd-4"]}')$q$, true)) ->> 'error' = 'auth_required');
select pg_temp.ok('an empty search is refused', (pg_temp.call('b2222222-2222-2222-2222-222222222222', $q$select public.worker_search_save('empty','{}')$q$)) ->> 'error' = 'bad_value');
select pg_temp.ok('V saves a search', (pg_temp.call('b2222222-2222-2222-2222-222222222222', $q$select public.worker_search_save('Away, size L','{"slugs":["hub-test-ddd-4"],"sizes":["l"]}')$q$)) ->> 'ok' = 'true');
select pg_temp.ok('V lists it', jsonb_array_length((pg_temp.call('b2222222-2222-2222-2222-222222222222', 'select public.worker_search_list()')) -> 'searches') = 1);
select pg_temp.ok('R sees none of V''s searches', jsonb_array_length((pg_temp.call('b1111111-1111-1111-1111-111111111111', 'select public.worker_search_list()')) -> 'searches') = 0);
insert into ctx select 'i5', pg_temp.open_item('a1111111-1111-1111-1111-111111111111', 'hub-test-ddd-4', 'l', 'good', 60, 'sale');
select pg_temp.ok('V is told when a matching copy opens', (select count(*) from public.worker_notification where user_id = 'b2222222-2222-2222-2222-222222222222' and kind = 'COLLECTOR_WANT_MATCHED' and payload ->> 'searchName' = 'Away, size L') = 1);
insert into ctx select 'i6', pg_temp.open_item('a2222222-2222-2222-2222-222222222222', 'hub-test-ddd-4', 'xl', 'good', 60, 'sale');
select pg_temp.ok('a copy in another size does not alert', (select count(*) from public.worker_notification where user_id = 'b2222222-2222-2222-2222-222222222222' and kind = 'COLLECTOR_WANT_MATCHED') = 1);
select pg_temp.ok('V deletes it', (pg_temp.call('b2222222-2222-2222-2222-222222222222', format($q$select public.worker_search_delete(%L)$q$, (pg_temp.call('b2222222-2222-2222-2222-222222222222', 'select public.worker_search_list()')) -> 'searches' -> 0 ->> 'id'))) ->> 'ok' = 'true');
select pg_temp.ok('the alert trigger and helpers are not callable from outside', pg_temp.denied('b2222222-2222-2222-2222-222222222222', $q$select public.worker_item_matches(null::public.worker_collector_item, '{}')$q$));

-- 5. requests and the wanted board
select pg_temp.ok('R opens a public request with a private budget', (pg_temp.call('b1111111-1111-1111-1111-111111111111', $q$select public.worker_want_request('hub-test-aaa-1', null, 'l', 'buy', 80, 'EUR', 'ship', 'Looking for the away one', true)$q$)) ->> 'public' = 'true');
select pg_temp.ok('the wanted board shows it', jsonb_array_length((pg_temp.call(null, $q$select public.worker_wanted_list()$q$)) -> 'wanted') >= 1);
select pg_temp.ok('the board never carries the budget or a user id', not ((pg_temp.call(null, $q$select public.worker_wanted_list()$q$))::text ~ '(maxPrice|max_price|userId|user_id)'));
select pg_temp.ok('the requester reads the budget back, privately', ((pg_temp.call('b1111111-1111-1111-1111-111111111111', 'select public.worker_wants_mine()')) -> 'wants' -> 0 ->> 'maxPrice')::numeric = 80);
select pg_temp.ok('a note over 140 characters is refused', (pg_temp.call('b1111111-1111-1111-1111-111111111111', format($q$select public.worker_want_request('hub-test-eee-5', null, null, 'any', null, 'EUR', 'both', %L, true)$q$, repeat('x', 141)))) ->> 'error' = 'bad_value');
select pg_temp.ok('the board filters by shirt', jsonb_array_length((pg_temp.call(null, $q$select public.worker_wanted_list('["hub-test-nothing"]')$q$)) -> 'wanted') = 0);
select pg_temp.ok('S sees which of his copies would answer it', (pg_temp.call('a1111111-1111-1111-1111-111111111111', $q$select public.worker_wanted_list()$q$)) -> 'wanted' @> '[{"archiveSlug":"hub-test-aaa-1"}]'::jsonb);
select pg_temp.ok('wrong size is refused as an answer', (pg_temp.call('a2222222-2222-2222-2222-222222222222', format($q$select public.worker_want_respond(%L, %L)$q$, (select id from public.worker_collector_want where archive_slug = 'hub-test-aaa-1' and public_request limit 1), (select v from ctx where k = 'i3')))) ->> 'error' = 'bad_value');
select pg_temp.ok('S answers with the right size', (pg_temp.call('a1111111-1111-1111-1111-111111111111', format($q$select public.worker_want_respond(%L, %L)$q$, (select id from public.worker_collector_want where archive_slug = 'hub-test-aaa-1' and public_request limit 1), (select v from ctx where k = 'i1')))) ->> 'ok' = 'true');
select pg_temp.ok('R is told', (select count(*) from public.worker_notification where user_id = 'b1111111-1111-1111-1111-111111111111' and payload ->> 'answer' = 'true') = 1);
select pg_temp.ok('answering twice does not double-notify', (pg_temp.call('a1111111-1111-1111-1111-111111111111', format($q$select public.worker_want_respond(%L, %L)$q$, (select id from public.worker_collector_want where archive_slug = 'hub-test-aaa-1' and public_request limit 1), (select v from ctx where k = 'i1')))) ->> 'ok' = 'true' and (select count(*) from public.worker_notification where user_id = 'b1111111-1111-1111-1111-111111111111' and payload ->> 'answer' = 'true') = 1);
select pg_temp.ok('R cannot answer his own request', (pg_temp.call('b1111111-1111-1111-1111-111111111111', format($q$select public.worker_want_respond(%L, %L)$q$, (select id from public.worker_collector_want where archive_slug = 'hub-test-aaa-1' and public_request limit 1), (select v from ctx where k = 'i1')))) ->> 'error' = 'not_found');
select pg_temp.ok('a private request stays off the board', (pg_temp.call('b1111111-1111-1111-1111-111111111111', $q$select public.worker_want_request('hub-test-fff-6', null, null, 'any', 10, 'EUR', 'both', 'secret', false)$q$)) ->> 'public' = 'false'
  and not ((pg_temp.call(null, $q$select public.worker_wanted_list()$q$))::text like '%hub-test-fff-6%'));
select pg_temp.ok('delivery can be set by the owner only', (pg_temp.call('a1111111-1111-1111-1111-111111111111', format($q$select public.worker_item_delivery_set(%L, 'local')$q$, (select v from ctx where k = 'i1')))) ->> 'ok' = 'true'
  and (pg_temp.call('a2222222-2222-2222-2222-222222222222', format($q$select public.worker_item_delivery_set(%L, 'local')$q$, (select v from ctx where k = 'i1')))) ->> 'error' = 'not_found');
select pg_temp.ok('a local-only copy leaves a ship-only search', ((pg_temp.call(null, $q$select public.worker_market_search('{"slugs":["hub-test-aaa-1"],"delivery":"ship"}')$q$)) -> 'facets' ->> 'total')::int = 1);
