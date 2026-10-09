\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- THE SHIRT HUB contributions (stage C). A=owner · B=another collector · E=editor (admin)
insert into auth.users(id,email) values ('c1111111-7777-7777-7777-111111111111','a6@w7.test'),('c2222222-7777-7777-7777-222222222222','b6@w7.test'),('c3333333-7777-7777-7777-333333333333','e6@w7.test') on conflict do nothing;
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

\set A '''c1111111-7777-7777-7777-111111111111'''
\set B '''c2222222-7777-7777-7777-222222222222'''
\set E '''c3333333-7777-7777-7777-333333333333'''

select pg_temp.call(:A, $q$select public.worker_closet_mine()$q$) ->> 'ok';
select pg_temp.call(:B, $q$select public.worker_closet_mine()$q$) ->> 'ok';
insert into public.worker_admin (user_id) values ('c3333333-7777-7777-7777-333333333333') on conflict do nothing;

-- a club in the library, two items, three photos (written as the owner would have, past the storage step)
insert into public.worker_club_library (key, name, country, aliases, status) values
  ('ctest1', 'Contrib FC', 'GR', '{}', 'review'), ('ctest2', 'Contrib Football Club', 'GR', '{"CFC"}', 'market') on conflict do nothing;
insert into ctx7 select 'item', (pg_temp.call(:A, $q$select public.worker_world_have('ctest1','Contrib FC','GR','1999/00','away',null)$q$)) -> 'item' ->> 'id';
insert into public.worker_photo_slot (path, user_id) values
  ('p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp', 'c1111111-7777-7777-7777-111111111111'),
  ('p/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp', 'c1111111-7777-7777-7777-111111111111') on conflict do nothing;
insert into public.worker_collector_photo (item_id, user_id, storage_path, sort_order)
  select (select v from ctx7 where k='item')::uuid, 'c1111111-7777-7777-7777-111111111111', s, n
    from (values ('p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp', 0), ('p/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp', 1)) t(s, n) on conflict do nothing;
insert into ctx7 select 'p1', id::text from public.worker_collector_photo where storage_path = 'p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp';
insert into ctx7 select 'p2', id::text from public.worker_collector_photo where storage_path = 'p/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp';

-- 1. no row = no consent
select pg_temp.ok('nothing is consented by default', (select bool_and(not (p ->> 'archiveUse')::boolean and (p ->> 'review') = 'none')
  from jsonb_array_elements((pg_temp.call(:A, $q$select public.worker_contributions_mine()$q$)) -> 'photos') p));
select pg_temp.ok('the queue is empty', jsonb_array_length((pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$)) -> 'items') = 0);

-- 2. only the owner may decide
select pg_temp.ok('B cannot consent for A', (pg_temp.call(:B, format($q$select public.worker_photo_consent_set(%L, true, false, 'none')$q$, (select v from ctx7 where k='p1')))) ->> 'error' = 'not_yours');
select pg_temp.ok('anon cannot', (pg_temp.call(null, format($q$select public.worker_photo_consent_set(%L, true, false, 'none')$q$, (select v from ctx7 where k='p1')))) ->> 'error' is not null);
select pg_temp.ok('a made-up credit is refused', (pg_temp.call(:A, format($q$select public.worker_photo_consent_set(%L, true, false, 'real-name')$q$, (select v from ctx7 where k='p1')))) ->> 'error' = 'bad_credit');
select pg_temp.ok('credit by nickname needs a nickname', (pg_temp.call(:A, format($q$select public.worker_photo_consent_set(%L, true, false, 'nickname')$q$, (select v from ctx7 where k='p1')))) ->> 'error' = 'credit_needs_nickname');

-- 3. consent → review
select pg_temp.ok('A grants archive use, anonymous credit', (pg_temp.call(:A, format($q$select public.worker_photo_consent_set(%L, true, false, 'anonymous')$q$, (select v from ctx7 where k='p1')))) ->> 'review' = 'pending');
select pg_temp.ok('the editor sees one', jsonb_array_length((pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$)) -> 'items') = 1);
select pg_temp.ok('the editor row names no owner', not ((pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$))::text ~* '(c1111111|user|handle|email|owner)'));
select pg_temp.ok('credit reads A collector', (pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$)) -> 'items' -> 0 ->> 'credit' = 'A collector');
select pg_temp.ok('club and season travel', (pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$)) -> 'items' -> 0 ->> 'season' = '1999/00');
select pg_temp.ok('marketing use alone does not reach review', (pg_temp.call(:A, format($q$select public.worker_photo_consent_set(%L, false, true, 'none')$q$, (select v from ctx7 where k='p2')))) ->> 'review' = 'none');
select pg_temp.ok('and the queue still has one', jsonb_array_length((pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$)) -> 'items') = 1);

-- 4. editors only
select pg_temp.ok('a collector is not an editor', (pg_temp.call(:A, $q$select public.worker_admin_contribution_queue()$q$)) ->> 'error' = 'forbidden');
select pg_temp.ok('nor can they review', (pg_temp.call(:A, format($q$select public.worker_admin_contribution_review(%L,'approved',null)$q$, (select v from ctx7 where k='p1')))) ->> 'error' = 'forbidden');
select pg_temp.ok('a rejection needs a reason', (pg_temp.call(:E, format($q$select public.worker_admin_contribution_review(%L,'rejected',null)$q$, (select v from ctx7 where k='p1')))) ->> 'error' = 'note_required');
select pg_temp.ok('the editor approves', (pg_temp.call(:E, format($q$select public.worker_admin_contribution_review(%L,'approved','good scan')$q$, (select v from ctx7 where k='p1')))) ->> 'ok' = 'true');
select pg_temp.ok('A sees it approved', (select p ->> 'review' from jsonb_array_elements((pg_temp.call(:A, $q$select public.worker_contributions_mine()$q$)) -> 'photos') p where p ->> 'id' = (select v from ctx7 where k='p1')) = 'approved');
select pg_temp.ok('changing credit keeps an approval', (pg_temp.call(:A, format($q$select public.worker_photo_consent_set(%L, true, true, 'anonymous')$q$, (select v from ctx7 where k='p1')))) ->> 'review' = 'approved');

-- 5. withdrawing takes it out of review at once, and is logged
select pg_temp.ok('A withdraws', (pg_temp.call(:A, format($q$select public.worker_photo_consent_set(%L, false, false, 'anonymous')$q$, (select v from ctx7 where k='p1')))) ->> 'review' = 'none');
select pg_temp.ok('no consent means no credit', (select p ->> 'credit' from jsonb_array_elements((pg_temp.call(:A, $q$select public.worker_contributions_mine()$q$)) -> 'photos') p where p ->> 'id' = (select v from ctx7 where k='p1')) = 'none');
select pg_temp.ok('the queue is empty again', jsonb_array_length((pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$)) -> 'items') = 0);
select pg_temp.ok('the editor cannot review a withdrawn photo', (pg_temp.call(:E, format($q$select public.worker_admin_contribution_review(%L,'approved',null)$q$, (select v from ctx7 where k='p1')))) ->> 'error' = 'not_found');
select pg_temp.ok('every decision is on the log', (select count(*) from public.worker_photo_consent_log where photo_id = (select v from ctx7 where k='p1')::uuid) >= 3);

-- 6. nickname credit
select pg_temp.call(:A, $q$select public.worker_collector_identity_set('nickname','Archive Hero')$q$);
select pg_temp.ok('with a nickname, credit by it', (pg_temp.call(:A, format($q$select public.worker_photo_consent_set(%L, true, false, 'nickname')$q$, (select v from ctx7 where k='p1')))) ->> 'ok' = 'true');
select pg_temp.ok('the editor reads the nickname', (pg_temp.call(:E, $q$select public.worker_admin_contribution_queue()$q$)) -> 'items' -> 0 ->> 'credit' = 'Archive Hero');

-- 7. club merge
select pg_temp.ok('a collector cannot merge', (pg_temp.call(:A, $q$select public.worker_admin_club_merge('ctest1','ctest2')$q$)) ->> 'error' = 'forbidden');
select pg_temp.ok('not into itself', (pg_temp.call(:E, $q$select public.worker_admin_club_merge('ctest1','ctest1')$q$)) ->> 'error' = 'same_club');
select pg_temp.ok('unknown club', (pg_temp.call(:E, $q$select public.worker_admin_club_merge('ctest1','nope')$q$)) ->> 'error' = 'not_found');
select pg_temp.ok('the editor merges', (pg_temp.call(:E, $q$select public.worker_admin_club_merge('ctest1','ctest2')$q$)) ->> 'moved' = '1');
select pg_temp.ok('the item now belongs to the kept club', (select club_key from public.worker_collector_item where id = (select v from ctx7 where k='item')::uuid) = 'ctest2');
select pg_temp.ok('the old name stays findable', (select 'Contrib FC' = any(aliases) from public.worker_club_library where key = 'ctest2'));
select pg_temp.ok('the old entry points at the kept one', (select merged_into from public.worker_club_library where key = 'ctest1') = 'ctest2');
select pg_temp.ok('no second merge of a merged club', (pg_temp.call(:E, $q$select public.worker_admin_club_merge('ctest1','ctest2')$q$)) ->> 'error' = 'already_merged');

-- 8. the tables are closed
select pg_temp.ok('no direct reads', (pg_temp.call(:A, $q$select (select count(*) from public.worker_photo_consent)::text::jsonb$q$)) ->> 'error' like 'EXC:%');
select pg_temp.ok('anon cannot run the owner functions', not has_function_privilege('anon', 'public.worker_contributions_mine()'::regprocedure, 'execute'));
