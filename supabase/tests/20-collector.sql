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

insert into public.worker_admin (user_id) values ('44444444-4444-4444-4444-444444444444') on conflict do nothing;

-- 1. the catalog-driven attack: nobody outside reads or writes a collector table
do $$
declare t text; v jsonb;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'worker\_%'
             and tablename not in ('worker_profile', 'worker_gate_run', 'worker_profile_item', 'worker_question_mark', 'worker_rr_room', 'worker_rr_entry', 'worker_poll_vote') loop
    foreach v in array array[
      pg_temp.call(null, format('select to_jsonb(count(*)) from public.%I', t)),
      pg_temp.call('11111111-1111-1111-1111-111111111111', format('select to_jsonb(count(*)) from public.%I', t)),
      pg_temp.call('11111111-1111-1111-1111-111111111111', format('with d as (delete from public.%I returning 1) select to_jsonb(count(*)) from d', t))] loop
      if coalesce(v ->> 'error', '') not like 'EXC: permission denied%' then
        raise exception 'FAIL table % answered: %', t, v;
      end if;
    end loop;
  end loop;
  raise notice 'PASS no read/delete on any collector table, anon or signed in';
end $$;

-- 2. guests read the public side
select pg_temp.ok('guest signals', (pg_temp.call(null, $q$select public.worker_shirt_signals(array['vp-1985-away','BAD SLUG'])$q$) ? 'vp-1985-away'));
select pg_temp.ok('guest cannot open a closet of their own', pg_temp.denied(null, 'select public.worker_closet_mine()'));
select pg_temp.ok('guest market is a list', jsonb_typeof(pg_temp.call(null, 'select public.worker_market_list()')) = 'array');
-- 3. an anonymous JWT (DUBID's anonymous sign-in) is refused by every market write
select pg_temp.ok('anonymous jwt cannot "have"', (pg_temp.call('55555555-5555-5555-5555-555555555555', $q$select public.worker_collector_have('vp-1985-away')$q$, true)) ->> 'error' = 'auth_required');
select pg_temp.ok('anonymous jwt cannot bid', (pg_temp.call('55555555-5555-5555-5555-555555555555', $q$select public.worker_auction_bid(gen_random_uuid(), 100)$q$, true)) ->> 'error' = 'auth_required');
select pg_temp.ok('anonymous jwt cannot upload', pg_temp.denied('55555555-5555-5555-5555-555555555555', $q$with ins as (insert into storage.objects (bucket_id, name) values ('worker-collector', '55555555-5555-5555-5555-555555555555/x/y.webp') returning 1) select to_jsonb(count(*)) from ins$q$, true));

-- 4. have / want / open
select pg_temp.ok('B wants 1985 away', (pg_temp.call('22222222-2222-2222-2222-222222222222', $q$select public.worker_collector_want_set('vp-1985-away', true)$q$)) ->> 'wanting' = 'true');
create temp table ctx (k text primary key, v text); grant all on ctx to public;
insert into ctx select 'itemA', (pg_temp.call('11111111-1111-1111-1111-111111111111', $q$select public.worker_collector_have('vp-1985-away')$q$)) -> 'item' ->> 'id';
select pg_temp.ok('have is idempotent', (pg_temp.call('11111111-1111-1111-1111-111111111111', $q$select public.worker_collector_have('vp-1985-away')$q$)) ->> 'created' = 'false');
select pg_temp.ok('opening needs details', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_item_update(%L, '{"forSale": true}')$q$, (select v from ctx where k='itemA')))) ->> 'error' = 'details_required');
select pg_temp.ok('a replica cannot claim original', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_item_update(%L, '{"itemType":"replica","authenticityClaim":"original"}')$q$, (select v from ctx where k='itemA')))) ->> 'error' = 'replica_claim');
select pg_temp.ok('unknown keys refused', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_item_update(%L, '{"userId":"x"}')$q$, (select v from ctx where k='itemA')))) ->> 'error' = 'bad_key');
select pg_temp.ok('open for sale', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_item_update(%L, '{"size":"l","condition":"good","itemType":"original_period","authenticityClaim":"original","forSale":true,"askingPrice":300}')$q$, (select v from ctx where k='itemA')))) ->> 'ok' = 'true');
select pg_temp.ok('B heard it appeared', (select count(*) from public.worker_notification where user_id='22222222-2222-2222-2222-222222222222' and kind='COLLECTOR_WANT_MATCHED') = 1);
select pg_temp.ok('market lists it, with a handle and no user id', (select bool_and(not (x ? 'userId') and (x -> 'seller' ? 'handle')) from jsonb_array_elements(pg_temp.call(null, 'select public.worker_market_list()')) x));
select pg_temp.ok('signals count it', ((pg_temp.call(null, $q$select public.worker_shirt_signals(array['vp-1985-away'])$q$)) -> 'vp-1985-away' ->> 'forSale')::int = 1);

-- 5. connect, talk, offer, counter, accept, complete twice
insert into ctx select 'conn', (pg_temp.call('22222222-2222-2222-2222-222222222222', format($q$select public.worker_connect(%L, 'buy', 'שלום, עוד אצלך?')$q$, (select v from ctx where k='itemA')))) ->> 'connectionId';
select pg_temp.ok('own item cannot be requested', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_connect(%L, 'buy')$q$, (select v from ctx where k='itemA')))) ->> 'error' = 'own_item');
select pg_temp.ok('a stranger cannot read the thread', (pg_temp.call('33333333-3333-3333-3333-333333333333', format($q$select public.worker_connection_thread(%L)$q$, (select v from ctx where k='conn')))) ->> 'error' = 'not_found');
select pg_temp.ok('a stranger cannot post in it', (pg_temp.call('33333333-3333-3333-3333-333333333333', format($q$select public.worker_message_send(%L, 'hi')$q$, (select v from ctx where k='conn')))) ->> 'error' = 'not_found');
select pg_temp.ok('A answers (accepts by replying)', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_message_send(%L, 'כן')$q$, (select v from ctx where k='conn')))) ->> 'ok' = 'true');
select pg_temp.ok('the holder cannot offer his own shirts in trade', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_offer_make(%L, 'trade', null, 'ILS', array[%L]::uuid[])$q$, (select v from ctx where k='conn'), (select v from ctx where k='itemA')))) ->> 'error' = 'bad_items');
insert into ctx select 'offer1', (pg_temp.call('22222222-2222-2222-2222-222222222222', format($q$select public.worker_offer_make(%L, 'price', 250)$q$, (select v from ctx where k='conn')))) ->> 'offerId';
select pg_temp.ok('B cannot accept his own offer', (pg_temp.call('22222222-2222-2222-2222-222222222222', format($q$select public.worker_offer_respond(%L, 'accept')$q$, (select v from ctx where k='offer1')))) ->> 'error' = 'not_found');
insert into ctx select 'offer2', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_offer_respond(%L, 'counter', 280)$q$, (select v from ctx where k='offer1')))) ->> 'offerId';
select pg_temp.ok('B accepts the counter', (pg_temp.call('22222222-2222-2222-2222-222222222222', format($q$select public.worker_offer_respond(%L, 'accept')$q$, (select v from ctx where k='offer2')))) ->> 'status' = 'agreed');
select pg_temp.ok('item is reserved', (select state from public.worker_collector_item where id = (select v from ctx where k='itemA')::uuid) = 'reserved');
select pg_temp.ok('one side done is not done', (pg_temp.call('22222222-2222-2222-2222-222222222222', format($q$select public.worker_connection_step(%L, 'done')$q$, (select v from ctx where k='conn')))) ->> 'waitingForOther' = 'true');
select pg_temp.ok('both sides done = completed', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_connection_step(%L, 'done')$q$, (select v from ctx where k='conn')))) ->> 'status' = 'completed');
select pg_temp.ok('item sold', (select state from public.worker_collector_item where id = (select v from ctx where k='itemA')::uuid) = 'sold');
select pg_temp.ok('A shows one sale', ((pg_temp.call('11111111-1111-1111-1111-111111111111', 'select public.worker_closet_mine()')) -> 'label' ->> 'sales')::int = 1);

-- 6. perfect swap
do $$ begin perform 1; end $$;
select pg_temp.call('11111111-1111-1111-1111-111111111111', $q$select public.worker_collector_want_set('fka-1999-00-home', true)$q$) is not null;
insert into ctx select 'itemAX', (pg_temp.call('11111111-1111-1111-1111-111111111111', $q$select public.worker_collector_have('vp-1990-home')$q$)) -> 'item' ->> 'id';
select pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_item_update(%L, '{"size":"m","condition":"good","itemType":"original_period","forTrade":true}')$q$, (select v from ctx where k='itemAX'))) ->> 'ok';
select pg_temp.call('33333333-3333-3333-3333-333333333333', $q$select public.worker_collector_want_set('vp-1990-home', true)$q$) ->> 'ok';
insert into ctx select 'itemCY', (pg_temp.call('33333333-3333-3333-3333-333333333333', $q$select public.worker_collector_have('fka-1999-00-home')$q$)) -> 'item' ->> 'id';
select pg_temp.call('33333333-3333-3333-3333-333333333333', format($q$select public.worker_collector_item_update(%L, '{"size":"xl","condition":"mint","itemType":"official_reissue","forTrade":true}')$q$, (select v from ctx where k='itemCY'))) ->> 'ok';
select pg_temp.ok('A sees a perfect swap', jsonb_array_length((pg_temp.call('11111111-1111-1111-1111-111111111111', 'select public.worker_market_matches()')) -> 'perfectSwaps') = 1);

-- 7. photos and the bucket
insert into ctx values ('pathA', '11111111-1111-1111-1111-111111111111/' || (select v from ctx where k='itemAX') || '/' || gen_random_uuid() || '.webp');
select pg_temp.ok('A uploads into his own folder', not pg_temp.denied('11111111-1111-1111-1111-111111111111', format($q$with ins as (insert into storage.objects (bucket_id, name) values ('worker-collector', %L) returning 1) select to_jsonb(count(*)) from ins$q$, (select v from ctx where k='pathA'))));
select pg_temp.ok('A cannot upload into C''s folder', pg_temp.denied('11111111-1111-1111-1111-111111111111', format($q$with ins as (insert into storage.objects (bucket_id, name) values ('worker-collector', %L) returning 1) select to_jsonb(count(*)) from ins$q$, '33333333-3333-3333-3333-333333333333/x/y.webp')));
select pg_temp.ok('our policies do not open DUBID''s bucket', pg_temp.denied('11111111-1111-1111-1111-111111111111', $q$with ins as (insert into storage.objects (bucket_id, name) values ('dubid-avatars', '11111111-1111-1111-1111-111111111111/a.png') returning 1) select to_jsonb(count(*)) from ins$q$));
select pg_temp.ok('photo registered', jsonb_array_length((pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_photo_add(%L, %L)$q$, (select v from ctx where k='itemAX'), (select v from ctx where k='pathA')))) -> 'photos') = 1);
select pg_temp.ok('a photo that was never uploaded is refused', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_photo_add(%L, %L)$q$, (select v from ctx where k='itemAX'), '11111111-1111-1111-1111-111111111111/' || (select v from ctx where k='itemAX') || '/' || gen_random_uuid() || '.webp'))) ->> 'error' = 'not_uploaded');

-- 8. privacy of the closet
select pg_temp.ok('private closet is not found for a stranger', (pg_temp.call('33333333-3333-3333-3333-333333333333', format('select public.worker_closet_view(%s)', (select handle_no from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111')))) ->> 'error' = 'not_found');
select pg_temp.call('11111111-1111-1111-1111-111111111111', $q$select public.worker_collector_settings('{"visibility":"link_only"}')$q$) ->> 'ok';
select pg_temp.ok('link-only opens with the token', (pg_temp.call(null, format('select public.worker_closet_view(%s, %L)', (select handle_no from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111'), (select share_token from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111')))) ->> 'ok' = 'true');
select pg_temp.ok('the owner sees his own closet, and is told so', (pg_temp.call('11111111-1111-1111-1111-111111111111', format('select public.worker_closet_view(%s)', (select handle_no from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111')))) ->> 'mine' = 'true');
select pg_temp.ok('a guest with the link is not the owner', (pg_temp.call(null, format('select public.worker_closet_view(%s, %L)', (select handle_no from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111'), (select share_token from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111')))) ->> 'mine' = 'false');
select pg_temp.ok('link-only stays shut without it', (pg_temp.call(null, format('select public.worker_closet_view(%s, %L)', (select handle_no from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111'), 'nope'))) ->> 'error' = 'not_found');

-- 9. block
select pg_temp.call('33333333-3333-3333-3333-333333333333', format('select public.worker_block_set(%s, true)', (select handle_no from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111'))) ->> 'ok';
select pg_temp.ok('a blocked collector cannot request', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_connect(%L, 'trade')$q$, (select v from ctx where k='itemCY')))) ->> 'error' = 'not_available');
select pg_temp.ok('and does not see the listing', not exists (select 1 from jsonb_array_elements(pg_temp.call('11111111-1111-1111-1111-111111111111', 'select public.worker_market_list()')) x where x ->> 'id' = (select v from ctx where k='itemCY')));
select pg_temp.call('33333333-3333-3333-3333-333333333333', format('select public.worker_block_set(%s, false)', (select handle_no from public.worker_collector_profile where user_id='11111111-1111-1111-1111-111111111111'))) ->> 'ok';

-- 10. rate limit returns a value, and the count survives it
do $$
declare i int; r jsonb; begin
  for i in 1..25 loop
    r := pg_temp.call('22222222-2222-2222-2222-222222222222', format($q$select public.worker_report('spam', 'x', null, %L)$q$, (select ctx.v from ctx where k='itemCY')));
  end loop;
  if r ->> 'error' <> 'slow_down' then raise exception 'FAIL rate limit: %', r; end if;
  if (select count(*) from public.worker_rate_event where user_id='22222222-2222-2222-2222-222222222222' and action='report') < 25 then raise exception 'FAIL counter lost'; end if;
  raise notice 'PASS rate limit answers slow_down and keeps its count';
end $$;
select pg_temp.ok('admin was told about reports', (select count(*) from public.worker_notification where user_id='44444444-4444-4444-4444-444444444444' and kind='REPORT_RECEIVED') >= 1);

-- 11. auction
insert into ctx select 'itemAZ', (pg_temp.call('11111111-1111-1111-1111-111111111111', $q$select public.worker_collector_have('vp-1986-home')$q$)) -> 'item' ->> 'id';
select pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_item_update(%L, '{"size":"l","condition":"excellent","itemType":"original_period","authenticityClaim":"match_worn"}')$q$, (select v from ctx where k='itemAZ'))) ->> 'ok';
select pg_temp.ok('auction needs two photos', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_auction_submit(%L, 'חולצת 1986', 'חולצת משחק מהעונה של האליפות, עם כל התוויות.', 100, 400)$q$, (select v from ctx where k='itemAZ')))) ->> 'error' = 'photos_required');
do $$ declare p text; i int; begin
  for i in 1..2 loop
    p := '11111111-1111-1111-1111-111111111111/' || (select ctx.v from ctx where k='itemAZ') || '/' || gen_random_uuid() || '.webp';
    insert into storage.objects (bucket_id, name) values ('worker-collector', p);
    perform pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_collector_photo_add(%L, %L)$q$, (select ctx.v from ctx where k='itemAZ'), p));
  end loop; end $$;
insert into ctx select 'lot', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_auction_submit(%L, 'חולצת 1986', 'חולצת משחק מהעונה של האליפות, עם כל התוויות.', 100, 400, 'ILS', 24, 10)$q$, (select v from ctx where k='itemAZ')))) ->> 'lotId';
select pg_temp.ok('a pending lot is hidden from the public', (pg_temp.call(null, format('select public.worker_auction_state(%L)', (select v from ctx where k='lot')))) ->> 'error' = 'not_found');
select pg_temp.ok('a non-admin cannot approve', (pg_temp.call('22222222-2222-2222-2222-222222222222', format('select public.worker_admin_lot_decide(%L, true)', (select v from ctx where k='lot')))) ->> 'error' = 'forbidden');
select pg_temp.ok('admin approves', (pg_temp.call('44444444-4444-4444-4444-444444444444', format('select public.worker_admin_lot_decide(%L, true)', (select v from ctx where k='lot')))) ->> 'status' = 'scheduled');
select pg_temp.ok('the seller cannot bid', (pg_temp.call('11111111-1111-1111-1111-111111111111', format('select public.worker_auction_bid(%L, 500)', (select v from ctx where k='lot')))) ->> 'error' = 'own_lot');
select pg_temp.ok('too low is refused with the minimum', (pg_temp.call('22222222-2222-2222-2222-222222222222', format('select public.worker_auction_bid(%L, 50)', (select v from ctx where k='lot')))) ->> 'minNext' = '100.00');
select pg_temp.ok('B leads at the start price', (pg_temp.call('22222222-2222-2222-2222-222222222222', format('select public.worker_auction_bid(%L, 500)', (select v from ctx where k='lot')))) -> 'state' -> 'lot' ->> 'currentPrice' = '400.00');
select pg_temp.ok('reserve is met once a max reaches it, and the reserve itself is hidden', (select (s -> 'lot' ->> 'reserveMet')::boolean and not (s -> 'lot' ? 'reservePrice' and s -> 'lot' ->> 'reservePrice' is not null) from (select pg_temp.call(null, format('select public.worker_auction_state(%L)', (select v from ctx where k='lot'))) s) q));
select pg_temp.ok('C bids under B''s max: B keeps it, price rises past C', (select (r ->> 'leading') = 'false' and r -> 'state' -> 'lot' ->> 'currentPrice' = '460.00' from (select pg_temp.call('33333333-3333-3333-3333-333333333333', format('select public.worker_auction_bid(%L, 450)', (select v from ctx where k='lot'))) r) q));
update public.worker_auction_lot set ends_at = now() + interval '20 seconds' where id = (select v from ctx where k='lot')::uuid;
select pg_temp.ok('C tops B: C leads one step above B''s max', (select (r ->> 'leading') = 'true' and r -> 'state' -> 'lot' ->> 'currentPrice' = '510.00' from (select pg_temp.call('33333333-3333-3333-3333-333333333333', format('select public.worker_auction_bid(%L, 700)', (select v from ctx where k='lot'))) r) q));
select pg_temp.ok('a late bid pushed the clock to two minutes', (select ends_at > now() + interval '100 seconds' from public.worker_auction_lot where id = (select v from ctx where k='lot')::uuid));
select pg_temp.ok('B was told he was outbid', (select count(*) from public.worker_notification where user_id='22222222-2222-2222-2222-222222222222' and kind='AUCTION_OUTBID') >= 1);
select pg_temp.ok('the public never sees a max', (select bool_and(not (b ? 'max') and not (b ? 'max_amount')) from jsonb_array_elements(pg_temp.call(null, format('select public.worker_auction_state(%L)', (select v from ctx where k='lot'))) -> 'bids') b));
-- admin voids C's winning bid: the state is rebuilt from the people left
select pg_temp.ok('admin voids with a reason and B leads again', (select r -> 'state' -> 'lot' ->> 'currentPrice' from (select pg_temp.call('44444444-4444-4444-4444-444444444444', format('select public.worker_admin_bid_void(%L, %L)', (select id from public.worker_auction_bid where lot_id = (select ctx.v from ctx where k='lot')::uuid and bidder_id='33333333-3333-3333-3333-333333333333' and max_amount = 700), 'test')) as r) q) = '460.00');
select pg_temp.ok('admin sees each bid with its id, and no private max', (select bool_and((b ? 'id') and not (b ? 'max') and not (b ? 'maxAmount') and not (b ? 'max_amount')) and count(*) >= 3 from jsonb_array_elements((select l -> 'bids' from jsonb_array_elements(pg_temp.call('44444444-4444-4444-4444-444444444444', 'select public.worker_admin_lots(null)') -> 'lots') l where l ->> 'id' = (select v from ctx where k='lot'))) b));
select pg_temp.ok('a non-admin gets no bid ids', (pg_temp.call('22222222-2222-2222-2222-222222222222', 'select public.worker_admin_lots(null)')) ->> 'error' = 'forbidden');
select pg_temp.ok('the audit log saw the void', (select count(*) from public.worker_audit_log where entity='worker_auction_bid' and detail::text like '%voided%') >= 1);
update public.worker_auction_lot set starts_at = now() - interval '2 minutes', ends_at = now() - interval '1 second' where id = (select v from ctx where k='lot')::uuid;
select pg_temp.ok('the lot settles lazily on read', (pg_temp.call(null, format('select public.worker_auction_state(%L)', (select v from ctx where k='lot')))) -> 'lot' ->> 'phase' = 'awaiting_completion');
select pg_temp.ok('the win opens a conversation: winner asks, seller answers, already agreed', (select k.status = 'agreed' and k.initiator_id = l.winner_id and k.recipient_id = l.seller_id and k.item_id = l.item_id from public.worker_auction_lot l join public.worker_collector_connection k on k.id = l.connection_id where l.id = (select v from ctx where k='lot')::uuid));
insert into ctx select 'lotconn', connection_id::text from public.worker_auction_lot where id = (select v from ctx where k='lot')::uuid;
select pg_temp.ok('the two of them get the way in, and nobody else', (select (w -> 'lot' ->> 'connectionId') = (select v from ctx where k='lotconn') and (g -> 'lot' ->> 'connectionId') is null from (select pg_temp.call('11111111-1111-1111-1111-111111111111', format('select public.worker_auction_state(%L)', (select v from ctx where k='lot'))) w, pg_temp.call('33333333-3333-3333-3333-333333333333', format('select public.worker_auction_state(%L)', (select v from ctx where k='lot'))) g) q));
select pg_temp.ok('the thread knows its lot', (pg_temp.call('11111111-1111-1111-1111-111111111111', format('select public.worker_connection_thread(%L)', (select v from ctx where k='lotconn')))) -> 'connection' ->> 'lotId' = (select v from ctx where k='lot'));
select pg_temp.ok('nobody walks away from a won lot in the thread', (pg_temp.call('11111111-1111-1111-1111-111111111111', format($q$select public.worker_connection_step(%L, 'cancel')$q$, (select v from ctx where k='lotconn')))) ->> 'error' = 'busy');
select pg_temp.ok('the winner marks it done from the thread — the lot hears it', (select pg_temp.call((select winner_id::text from public.worker_auction_lot where id=(select v from ctx where k='lot')::uuid), format($q$select public.worker_connection_step(%L, 'done')$q$, (select v from ctx where k='lotconn')))) ->> 'waitingForOther' = 'true');
select pg_temp.ok('…and the lot heard it', (select winner_done_at is not null from public.worker_auction_lot where id = (select v from ctx where k='lot')::uuid));
select pg_temp.ok('completed', (pg_temp.call('11111111-1111-1111-1111-111111111111', format('select public.worker_auction_complete(%L)', (select v from ctx where k='lot')))) ->> 'status' = 'completed');
select pg_temp.ok('the conversation closed with the lot', (select status = 'completed' and initiator_done_at is not null and recipient_done_at is not null from public.worker_collector_connection where id = (select v from ctx where k='lotconn')::uuid));

-- 12. merchant offers: no affiliate, official only from the club
select pg_temp.ok('affiliate params are refused', (pg_temp.call('44444444-4444-4444-4444-444444444444', $q$select public.worker_admin_merchant_upsert('{"seasonLabel":"2026/27","merchantName":"x","merchantType":"club_store","offerType":"official","isOfficialClubStore":true,"productUrl":"https://shop.example/p?utm_source=a"}')$q$)) ->> 'error' = 'bad_value');
select pg_temp.ok('a replica cannot pose as the club store', (pg_temp.call('44444444-4444-4444-4444-444444444444', $q$select public.worker_admin_merchant_upsert('{"seasonLabel":"1999/00","merchantName":"x","merchantType":"retro_store","offerType":"replica","isOfficialClubStore":true,"productUrl":"https://retro.example/p"}')$q$)) ->> 'error' = 'bad_value');
select pg_temp.ok('a clean official row goes in', (pg_temp.call('44444444-4444-4444-4444-444444444444', $q$select public.worker_admin_merchant_upsert('{"seasonLabel":"2026/27","merchantName":"החנות הרשמית","merchantType":"club_store","offerType":"official","isOfficialClubStore":true,"productUrl":"https://shop.example/home"}')$q$)) ->> 'ok' = 'true');
select pg_temp.ok('guests read offers', jsonb_array_length(pg_temp.call(null, $q$select public.worker_merchant_offers(null, null, '2026/27')$q$)) >= 1);

-- 12b. the seeded shops (content/manual/merchant-offers.json): the migration ran twice, one row per product
select pg_temp.ok('the club store seed is in: four official 2026/27 shirts', (select count(*) from public.worker_merchant_offer where is_official_club_store and offer_type = 'official' and season_label = '2026/27' and product_url like 'https://shop.htafc.co.il/%') = 4);
select pg_temp.ok('the retro seed is in, every row a replica and never the club store', (select count(*) = 24 and bool_and(offer_type = 'replica' and not is_official_club_store) from public.worker_merchant_offer where merchant_type = 'retro_store'));
select pg_temp.ok('two runs of the migration kept one row per seeded product', (select count(*) = count(distinct product_url) from public.worker_merchant_offer where product_url like 'https://shop.htafc.co.il/%' or product_url like 'https://www.retro-jerseys.com/%'));
select pg_temp.ok('no seeded url carries a query string', not exists (select 1 from public.worker_merchant_offer where product_url like '%?%'));
select pg_temp.ok('the archive shirt answers with the club store first', (select (x -> 0 ->> 'isOfficialClubStore')::boolean from (select pg_temp.call(null, $q$select public.worker_merchant_offers('fka-2026-27-home')$q$) x) q));
select pg_temp.ok('a retro season answers with its replicas only', (select jsonb_array_length(x) >= 1 and not exists (select 1 from jsonb_array_elements(x) o where o ->> 'offerType' <> 'replica') from (select pg_temp.call(null, $q$select public.worker_merchant_offers(null, null, '1995/96')$q$) x) q));

-- 13. notifications
select pg_temp.ok('B has notifications', ((pg_temp.call('22222222-2222-2222-2222-222222222222', 'select public.worker_notifications()')) ->> 'unread')::int >= 1);
select pg_temp.ok('reading answers ok', (pg_temp.call('22222222-2222-2222-2222-222222222222', 'select public.worker_notifications_read()')) ->> 'ok' = 'true');
select pg_temp.ok('reading clears them', (select count(*) from public.worker_notification where user_id='22222222-2222-2222-2222-222222222222' and read_at is null) = 0);

-- 14. DUBID is untouched
select pg_temp.ok('the DUBID-only user has no collector rows', not exists (select 1 from public.worker_collector_profile where user_id = '55555555-5555-5555-5555-555555555555'));
select pg_temp.ok('DUBID grants untouched', has_table_privilege('anon', 'public.profiles', 'insert'));
select pg_temp.ok('no trigger on auth', (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and not t.tgisinternal) = 0);
