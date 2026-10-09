\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- THE SHIRT HUB Wave 3 — place, circles, the pipe, identification help.
-- actors: A=f1 (Athens, shows place) · B=f2 (Berlin, shows place) · C=f3 (no place) · Z=f4 (stranger, blocked by A later)
insert into auth.users(id,email) values ('f1111111-1111-1111-1111-111111111111','a3@x.test'),('f2222222-2222-2222-2222-222222222222','b3@x.test'),('f3333333-3333-3333-3333-333333333333','c3@x.test'),('f4444444-4444-4444-4444-444444444444','z3@x.test') on conflict do nothing;
create temp table ctx3 (k text primary key, v text); grant all on ctx3 to public;
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
\set A '''f1111111-1111-1111-1111-111111111111'''
\set B '''f2222222-2222-2222-2222-222222222222'''
\set C '''f3333333-3333-3333-3333-333333333333'''
\set Z '''f4444444-4444-4444-4444-444444444444'''

-- ---- place
select pg_temp.ok('anon cannot set a place', (pg_temp.call(null, $q$select public.worker_place_set('GR','Athens',true)$q$)) is null or (pg_temp.call(null, $q$select public.worker_place_set('GR','Athens',true)$q$)) ->> 'ok' is distinct from 'true');
select pg_temp.ok('a bad country is refused', (pg_temp.call(:A, $q$select public.worker_place_set('Greece','Athens',true)$q$)) ->> 'error' = 'bad_value');
select pg_temp.ok('A sets Athens', (pg_temp.call(:A, $q$select public.worker_place_set('gr','Athens',true)$q$)) ->> 'country' = 'GR');
select pg_temp.ok('B sets Berlin', (pg_temp.call(:B, $q$select public.worker_place_set('DE','Berlin',true)$q$)) ->> 'cityKey' = 'berlin');
select pg_temp.ok('a name in another script still gets a key', (pg_temp.call(:C, $q$select public.worker_place_set('IL','תל אביב',false)$q$)) ->> 'cityKey' ~ '^c[0-9a-f]{8}$');
select pg_temp.ok('C chose not to show it', (pg_temp.call(:C, $q$select public.worker_place_mine()$q$)) ->> 'show' = 'false');

-- ---- shirts
insert into ctx3 select 'a1', pg_temp.open_item(:A, 'olympiacos--1998-away', 90);
insert into ctx3 select 'b1', pg_temp.open_item(:B, 'bayern--1996-home', 70);
insert into ctx3 select 'c1', pg_temp.open_item(:C, 'olympiacos--2001-home', 50);

-- ---- reach & circles
select pg_temp.ok('a club circle counts its shirts', (pg_temp.call(null, $q$select public.worker_circle_overview('club','olympiacos')$q$)) ->> 'shirts' = '2');
select pg_temp.ok('a country circle counts only people who chose to show it', (pg_temp.call(null, $q$select public.worker_circle_overview('country','GR')$q$)) ->> 'shirts' = '1');
select pg_temp.ok('a hidden place is not a circle', (pg_temp.call(null, $q$select public.worker_circle_overview('country','IL')$q$)) ->> 'shirts' = '0');
select pg_temp.ok('a city circle knows its name', (pg_temp.call(null, $q$select public.worker_circle_overview('city','berlin')$q$)) ->> 'label' = 'Berlin');
select pg_temp.ok('a bad key is refused', (pg_temp.call(null, $q$select public.worker_circle_overview('club','Bad Key!')$q$)) ->> 'error' = 'bad_value');
select pg_temp.ok('anon is not following anything', (pg_temp.call(null, $q$select public.worker_circle_overview('club','olympiacos')$q$)) ->> 'following' = 'false');
select pg_temp.ok('B follows Olympiacos', jsonb_array_length((pg_temp.call(:B, $q$select public.worker_circle_set('club','olympiacos',true)$q$)) -> 'circles') = 1);
select pg_temp.ok('following twice is still one', jsonb_array_length((pg_temp.call(:B, $q$select public.worker_circle_set('club','olympiacos',true)$q$)) -> 'circles') = 1);
select pg_temp.ok('and it shows as followed', (pg_temp.call(:B, $q$select public.worker_circle_overview('club','olympiacos')$q$)) ->> 'following' = 'true');
select pg_temp.ok('a bad circle kind is refused', (pg_temp.call(:B, $q$select public.worker_circle_set('galaxy','x',true)$q$)) ->> 'error' = 'bad_value');

-- ---- the pipe
select pg_temp.ok('the pipe needs a real account', (pg_temp.call(null, $q$select public.worker_pipe()$q$)) ->> 'ok' is distinct from 'true');
select pg_temp.ok('B wants the Olympiacos away shirt', (pg_temp.call(:B, $q$select public.worker_want_request('olympiacos--1998-away', null, 'l', 'any', 120, 'EUR', 'both', null, true)$q$)) ->> 'ok' = 'true');
select pg_temp.ok('B finds A''s copy in the pipe', jsonb_array_length((pg_temp.call(:B, $q$select public.worker_pipe()$q$)) -> 'found') = 1);
select pg_temp.ok('the route says cross-border, in facts', ((pg_temp.call(:B, $q$select public.worker_pipe()$q$)) -> 'found' -> 0 -> 'route' ->> 'crossBorder') = 'true');
select pg_temp.ok('and it reaches B only if A ships beyond the country', ((pg_temp.call(:B, $q$select public.worker_pipe()$q$)) -> 'found' -> 0 -> 'route' ->> 'reaches') = 'false');
select pg_temp.ok('A widens the reach to the world', (pg_temp.call(:A, format($q$select public.worker_item_reach_set(%L,'world')$q$, (select v from ctx3 where k='a1')))) ->> 'ok' = 'true');
select pg_temp.ok('now it reaches B', ((pg_temp.call(:B, $q$select public.worker_pipe()$q$)) -> 'found' -> 0 -> 'route' ->> 'reaches') = 'true');
select pg_temp.ok('the pipe never carries B''s budget', (pg_temp.call(:B, $q$select public.worker_pipe()$q$))::text !~ 'maxPrice|max_price');
select pg_temp.ok('A''s pipe shows B''s public request that A''s copy answers', jsonb_array_length((pg_temp.call(:A, $q$select public.worker_pipe()$q$)) -> 'answers') = 1);
select pg_temp.ok('B''s price ceiling hides a dearer copy', (
  select jsonb_array_length(public_found) = 1 from (select (pg_temp.call(:B, $q$select public.worker_pipe()$q$)) -> 'found' as public_found) s));
select pg_temp.ok('the club counter counts what is new in followed circles', ((pg_temp.call(:B, $q$select public.worker_pipe()$q$)) -> 'clubs' ->> 'olympiacos')::int = 2);

-- ---- a request that A's shirt answers shows in A's pipe
select pg_temp.ok('B opens a public request for an Olympiacos 2001 home', (pg_temp.call(:B, $q$select public.worker_want_request('olympiacos--2001-home', null, 'l', 'buy', 55, 'EUR', 'both', 'for my brother', true)$q$)) ->> 'ok' = 'true');
select pg_temp.ok('C''s copy answers it in C''s pipe', jsonb_array_length((pg_temp.call(:C, $q$select public.worker_pipe()$q$)) -> 'answers') = 1);
insert into ctx3 select 'hb', (select handle_no::text from public.worker_collector_profile where user_id = 'f2222222-2222-2222-2222-222222222222');
select pg_temp.ok('C blocks B', (pg_temp.call(:C, format($q$select public.worker_block_set(%s, true)$q$, (select v from ctx3 where k='hb')))) ->> 'ok' = 'true');
select pg_temp.ok('a blocked pair never sees each other in the pipe', jsonb_array_length((pg_temp.call(:C, $q$select public.worker_pipe()$q$)) -> 'answers') = 0);
select pg_temp.ok('nor in each other''s circles', (pg_temp.call(:C, $q$select public.worker_circle_overview('club','bayern')$q$)) ->> 'shirts' = '0');

-- ---- identification help
insert into ctx3 select 'rq', gen_random_uuid()::text;
insert into ctx3 select 'sl1', (pg_temp.call(:B, $q$select public.worker_photo_slot('webp')$q$)) ->> 'path';
insert into ctx3 select 'sl2', (pg_temp.call(:B, $q$select public.worker_photo_slot('webp')$q$)) ->> 'path';
insert into storage.objects (bucket_id, name) values ('worker-collector-pub', (select v from ctx3 where k='sl1')) on conflict do nothing;
select pg_temp.ok('a photo that was never uploaded is refused', (pg_temp.call(:B, format($q$select public.worker_idreq_open(%L, array[%L], 'old red shirt')$q$, (select v from ctx3 where k='rq'), (select v from ctx3 where k='sl2')))) ->> 'error' = 'not_uploaded');
select pg_temp.ok('a path in someone else''s folder is refused', (pg_temp.call(:B, format($q$select public.worker_idreq_open(%L, array[%L], 'x')$q$, (select v from ctx3 where k='rq'), 'f1111111-1111-1111-1111-111111111111/' || (select v from ctx3 where k='rq') || '/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp'))) ->> 'error' = 'bad_path');
select pg_temp.ok('B asks what shirt this is', (pg_temp.call(:B, format($q$select public.worker_idreq_open(%L, array[%L], 'old red shirt', 'olympiacos')$q$, (select v from ctx3 where k='rq'), (select v from ctx3 where k='sl1')))) ->> 'ok' = 'true');
select pg_temp.ok('the same id cannot be opened twice', (pg_temp.call(:B, format($q$select public.worker_idreq_open(%L, array[%L], 'again')$q$, (select v from ctx3 where k='rq'), (select v from ctx3 where k='sl1')))) ->> 'error' = 'exists');
select pg_temp.ok('anyone may read the open list', jsonb_array_length((pg_temp.call(null, $q$select public.worker_idreq_list(20)$q$)) -> 'requests') = 1);
select pg_temp.ok('the list says it is not mine to A', ((pg_temp.call(:A, $q$select public.worker_idreq_list(20)$q$)) -> 'requests' -> 0 ->> 'mine') = 'false');
select pg_temp.ok('A''s pipe counts one open question', ((pg_temp.call(:A, $q$select public.worker_pipe()$q$)) ->> 'help')::int = 1);
select pg_temp.ok('B cannot answer their own question', (pg_temp.call(:B, format($q$select public.worker_idreq_propose(%L, 'olympiacos--1998-away')$q$, (select v from ctx3 where k='rq')))) ->> 'error' = 'not_found');
select pg_temp.ok('A proposes an answer', (pg_temp.call(:A, format($q$select public.worker_idreq_propose(%L, 'olympiacos--1998-away', null, 'the hoop sleeves are 1998')$q$, (select v from ctx3 where k='rq')))) ->> 'ok' = 'true');
select pg_temp.ok('proposing again replaces, not duplicates', (pg_temp.call(:A, format($q$select public.worker_idreq_propose(%L, 'olympiacos--1999-home', null, 'actually 1999')$q$, (select v from ctx3 where k='rq')))) ->> 'ok' = 'true');
select pg_temp.ok('one proposal from A', (select count(*) from public.worker_collector_idprop) = 1);
select pg_temp.ok('A''s pipe no longer counts it', ((pg_temp.call(:A, $q$select public.worker_pipe()$q$)) ->> 'help')::int = 0);
select pg_temp.ok('B is told, without a new notification kind', (select count(*) from public.worker_notification where user_id = 'f2222222-2222-2222-2222-222222222222' and kind = 'COLLECTOR_MESSAGE' and payload ->> 'event' = 'id_proposal') = 1);
select pg_temp.ok('B sees every proposal', jsonb_array_length((pg_temp.call(:B, format($q$select public.worker_idreq_get(%L)$q$, (select v from ctx3 where k='rq')))) -> 'proposals') = 1);
select pg_temp.ok('Z (a bystander) sees none', jsonb_array_length((pg_temp.call(:Z, format($q$select public.worker_idreq_get(%L)$q$, (select v from ctx3 where k='rq')))) -> 'proposals') = 0);
insert into ctx3 select 'pp', (select id::text from public.worker_collector_idprop limit 1);
select pg_temp.ok('A cannot resolve B''s question', (pg_temp.call(:A, format($q$select public.worker_idreq_resolve(%L, %L)$q$, (select v from ctx3 where k='rq'), (select v from ctx3 where k='pp')))) ->> 'error' = 'not_found');
select pg_temp.ok('B picks the answer', (pg_temp.call(:B, format($q$select public.worker_idreq_resolve(%L, %L)$q$, (select v from ctx3 where k='rq'), (select v from ctx3 where k='pp')))) ->> 'archiveSlug' = 'olympiacos--1999-home');
select pg_temp.ok('A is told it helped', (select count(*) from public.worker_notification where user_id = 'f1111111-1111-1111-1111-111111111111' and payload ->> 'event' = 'id_solved') = 1);
select pg_temp.ok('a solved question leaves the open list', jsonb_array_length((pg_temp.call(null, $q$select public.worker_idreq_list(20)$q$)) -> 'requests') = 0);
select pg_temp.ok('and cannot be answered any more', (pg_temp.call(:A, format($q$select public.worker_idreq_propose(%L, 'olympiacos--1998-away')$q$, (select v from ctx3 where k='rq')))) ->> 'error' = 'not_found');

-- ---- doors
select pg_temp.ok('anon cannot call member functions', (
  select bool_and(not has_function_privilege('anon', p.oid, 'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in ('worker_place_set','worker_circle_set','worker_pipe','worker_idreq_open','worker_idreq_propose','worker_idreq_resolve','worker_idreq_mine','worker_circles_mine','worker_place_mine')));
select pg_temp.ok('anon cannot reach internals', (
  select bool_and(not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in ('worker_item_route','worker_idreq_row','worker_circle_query','worker_city_key','worker_circle_key_ok')));
select pg_temp.ok('no table is readable directly', (
  select bool_and(not has_table_privilege('authenticated', c.oid, 'select') and not has_table_privilege('anon', c.oid, 'select'))
    from pg_class c where c.relname in ('worker_collector_circle','worker_collector_idreq','worker_collector_idprop') and c.relkind='r'));
