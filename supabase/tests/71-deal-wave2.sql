\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- THE SHIRT HUB Wave 2 — bundle, counter keeps the bundle, handover, sent, feedback.
-- actors: S=e1 seller · B=e2 buyer · Z=e3 stranger
insert into auth.users(id,email) values ('e1111111-1111-1111-1111-111111111111','s2@x.test'),('e2222222-2222-2222-2222-222222222222','b2@x.test'),('e3333333-3333-3333-3333-333333333333','z2@x.test') on conflict do nothing;
create temp table ctx2 (k text primary key, v text); grant all on ctx2 to public;
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
\set S '''e1111111-1111-1111-1111-111111111111'''
\set B '''e2222222-2222-2222-2222-222222222222'''
\set Z '''e3333333-3333-3333-3333-333333333333'''

insert into ctx2 select 'i1', pg_temp.open_item(:S, 'deal-test-aaa-1', 100);
insert into ctx2 select 'i2', pg_temp.open_item(:S, 'deal-test-bbb-2', 60);
insert into ctx2 select 'i3', pg_temp.open_item(:S, 'deal-test-ccc-3', 40);
insert into ctx2 select 'c', (pg_temp.call(:B, format($q$select public.worker_connect(%L, 'buy')$q$, (select v from ctx2 where k='i1')))) ->> 'connectionId';
select pg_temp.ok('B opened a connection', (select v from ctx2 where k='c') is not null);
select pg_temp.ok('S accepts it', (pg_temp.call(:S, format($q$select public.worker_connection_respond(%L, true)$q$, (select v from ctx2 where k='c')))) ->> 'ok' = 'true');

select pg_temp.ok('a bundle needs another copy', (pg_temp.call(:B, format($q$select public.worker_bundle_offer(%L, 150, 'EUR', null)$q$, (select v from ctx2 where k='c')))) ->> 'error' = 'bad_items');
select pg_temp.ok('a stranger cannot bundle', (pg_temp.call(:Z, format($q$select public.worker_bundle_offer(%L, 150, 'EUR', array[%L]::uuid[])$q$, (select v from ctx2 where k='c'), (select v from ctx2 where k='i2')))) ->> 'error' = 'not_found');
select pg_temp.ok('B bundles two copies', (pg_temp.call(:B, format($q$select public.worker_bundle_offer(%L, 150, 'EUR', array[%L]::uuid[])$q$, (select v from ctx2 where k='c'), (select v from ctx2 where k='i2')))) ->> 'ok' = 'true');
insert into ctx2 select 'o1', (select id::text from public.worker_collector_offer where connection_id = (select v from ctx2 where k='c')::uuid and status='open');
select pg_temp.ok('the bundle carries the extra copy', (select count(*) from public.worker_collector_offer_item where offer_id = (select v from ctx2 where k='o1')::uuid) = 1);
select pg_temp.ok('S counters and it stays a bundle', (pg_temp.call(:S, format($q$select public.worker_offer_respond(%L, 'counter', 170)$q$, (select v from ctx2 where k='o1')))) ->> 'ok' = 'true'
  and (select count(*) from public.worker_collector_offer_item oi join public.worker_collector_offer o on o.id = oi.offer_id
        where o.status = 'open' and o.connection_id = (select v from ctx2 where k='c')::uuid) = 1);
insert into ctx2 select 'o2', (select id::text from public.worker_collector_offer where connection_id = (select v from ctx2 where k='c')::uuid and status='open');
select pg_temp.ok('the old offer is countered, not left open', (select status from public.worker_collector_offer where id = (select v from ctx2 where k='o1')::uuid) = 'countered');
select pg_temp.ok('the deal extras list the seller''s other copy', jsonb_array_length((pg_temp.call(:B, format($q$select public.worker_deal_extras(%L)$q$, (select v from ctx2 where k='c')))) -> 'bundleItems') = 2);
select pg_temp.ok('a stranger reads nothing of the deal', (pg_temp.call(:Z, format($q$select public.worker_deal_extras(%L)$q$, (select v from ctx2 where k='c')))) ->> 'error' = 'not_found');
select pg_temp.ok('B accepts the counter', (pg_temp.call(:B, format($q$select public.worker_offer_respond(%L, 'accept')$q$, (select v from ctx2 where k='o2')))) ->> 'ok' = 'true');
select pg_temp.ok('both copies are reserved', (select count(*) from public.worker_collector_item where state = 'reserved' and archive_slug in ('deal-test-aaa-1', 'deal-test-bbb-2')) = 2);
select pg_temp.ok('the third copy is untouched', (select state from public.worker_collector_item where archive_slug = 'deal-test-ccc-3') = 'held');

select pg_temp.ok('handover method is checked', (pg_temp.call(:B, format($q$select public.worker_handover_set(%L, 'teleport')$q$, (select v from ctx2 where k='c')))) ->> 'error' = 'bad_method');
select pg_temp.ok('a stranger cannot set handover', (pg_temp.call(:Z, format($q$select public.worker_handover_set(%L, 'meet')$q$, (select v from ctx2 where k='c')))) ->> 'error' = 'not_found');
select pg_temp.ok('B sets handover to post', (pg_temp.call(:B, format($q$select public.worker_handover_set(%L, 'ship', 'Athens, tracked')$q$, (select v from ctx2 where k='c')))) ->> 'ok' = 'true');
select pg_temp.ok('S sees it', (pg_temp.call(:S, format($q$select public.worker_deal_extras(%L)$q$, (select v from ctx2 where k='c')))) -> 'handover' ->> 'method' = 'ship');
select pg_temp.ok('S marks sent once', (pg_temp.call(:S, format($q$select public.worker_handover_sent(%L)$q$, (select v from ctx2 where k='c')))) ->> 'ok' = 'true'
  and (pg_temp.call(:S, format($q$select public.worker_handover_sent(%L)$q$, (select v from ctx2 where k='c')))) ->> 'already' = 'true');
select pg_temp.ok('B sees theirSent', (pg_temp.call(:B, format($q$select public.worker_deal_extras(%L)$q$, (select v from ctx2 where k='c')))) ->> 'theirSent' = 'true');

select pg_temp.ok('feedback is closed before completion', (pg_temp.call(:B, format($q$select public.worker_feedback_give(%L, 'good')$q$, (select v from ctx2 where k='c')))) ->> 'error' = 'bad_state');
select pg_temp.ok('both finish', (pg_temp.call(:B, format($q$select public.worker_connection_step(%L, 'done')$q$, (select v from ctx2 where k='c')))) ->> 'waitingForOther' = 'true'
  and (pg_temp.call(:S, format($q$select public.worker_connection_step(%L, 'done')$q$, (select v from ctx2 where k='c')))) ->> 'status' = 'completed');
select pg_temp.ok('both copies are sold', (select count(*) from public.worker_collector_item where state = 'sold' and archive_slug in ('deal-test-aaa-1', 'deal-test-bbb-2')) = 2);
select pg_temp.ok('rating is checked', (pg_temp.call(:B, format($q$select public.worker_feedback_give(%L, 'great')$q$, (select v from ctx2 where k='c')))) ->> 'error' = 'bad_rating');
select pg_temp.ok('B leaves feedback', (pg_temp.call(:B, format($q$select public.worker_feedback_give(%L, 'good', 'Fast and careful')$q$, (select v from ctx2 where k='c')))) ->> 'ok' = 'true');
select pg_temp.ok('only once', (pg_temp.call(:B, format($q$select public.worker_feedback_give(%L, 'bad')$q$, (select v from ctx2 where k='c')))) ->> 'error' = 'already_given');
select pg_temp.ok('S reads the note, B does not', (pg_temp.call(:S, format($q$select public.worker_deal_extras(%L)$q$, (select v from ctx2 where k='c')))) -> 'feedbackReceived' ->> 'note' = 'Fast and careful'
  and (pg_temp.call(:B, format($q$select public.worker_deal_extras(%L)$q$, (select v from ctx2 where k='c')))) -> 'feedbackReceived' = 'null'::jsonb
  and (pg_temp.call(:B, format($q$select public.worker_deal_extras(%L)$q$, (select v from ctx2 where k='c')))) ->> 'feedbackGiven' = 'true');
insert into ctx2 select 'sum', (pg_temp.call(null, format($q$select public.worker_feedback_summary(%s)$q$, (select handle_no from public.worker_collector_profile where user_id = 'e1111111-1111-1111-1111-111111111111'))))::text;
select pg_temp.ok('the public summary has counts only', (select v from ctx2 where k='sum')::jsonb ->> 'good' = '1' and (select v from ctx2 where k='sum') !~ 'Fast');
select pg_temp.ok('no anon access to the table', not has_table_privilege('anon', 'public.worker_collector_feedback', 'select'));
select pg_temp.ok('anon cannot call the deal functions', not has_function_privilege('anon', 'public.worker_bundle_offer(uuid,numeric,text,uuid[])', 'execute'));
