\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- "הייתי שם" (25.9.2026) — נבדק כמו שתוקפים: אין גישה לטבלה לאף תפקיד, anon לא קורא לפונקציות,
-- כל משתמש רואה רק את השורות שלו, והמיזוג "המאוחר מנצח" זהה למכשיר.
create or replace function pg_temp.as_user(p_role text, p_sub text, p_sql text) returns jsonb
language plpgsql as $$
declare v jsonb;
begin
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  execute p_sql into v;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  return v;
exception when others then
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  return jsonb_build_object('ok', false, 'error', 'EXC: ' || sqlerrm);
end $$;
create or replace function pg_temp.ok(p_label text, p_cond boolean, p_detail jsonb default null) returns text
language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FAIL %: %', p_label, p_detail; end if;
  return 'PASS ' || p_label;
end $$;

-- a clean slate (a second run must not see the first run's rows)
delete from public.worker_away_been;

-- 1. the table, by the catalog: nobody but the definer touches it
do $$
declare r text; v jsonb;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach v in array array[
      pg_temp.as_user(r, '11111111-1111-1111-1111-111111111111', $q$select to_jsonb(count(*)) from public.worker_away_been$q$),
      pg_temp.as_user(r, '11111111-1111-1111-1111-111111111111',
        $q$with i as (insert into public.worker_away_been (user_id, visit_id, been, at) values ('11111111-1111-1111-1111-111111111111', 'visit:m_000000000001', true, now()) returning 1) select to_jsonb(count(*)) from i$q$),
      pg_temp.as_user(r, '11111111-1111-1111-1111-111111111111', $q$with d as (delete from public.worker_away_been returning 1) select to_jsonb(count(*)) from d$q$)] loop
      if coalesce(v ->> 'error', '') not like 'EXC: permission denied%' then
        raise exception 'FAIL % on worker_away_been answered: %', r, v;
      end if;
    end loop;
  end loop;
  raise notice 'PASS no select/insert/delete on worker_away_been for anon/authenticated';
end $$;

select pg_temp.ok('anon cannot list', (pg_temp.as_user('anon', null, $q$select public.worker_away_been_list()$q$) ->> 'error') like 'EXC: permission denied%');
select pg_temp.ok('anon cannot set', (pg_temp.as_user('anon', null, $q$select public.worker_away_been_set('[]')$q$) ->> 'error') like 'EXC: permission denied%');
select pg_temp.ok('authenticated without a sub is signed_out',
  pg_temp.as_user('authenticated', null, $q$select public.worker_away_been_list()$q$) ->> 'error' = 'signed_out');

-- 2. writes, as values
select pg_temp.ok('a non-array is refused', pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.worker_away_been_set('{"v":"visit:m_1"}')$q$) ->> 'error' = 'shape');
select pg_temp.ok('501 rows is too big', pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111', format($q$select public.worker_away_been_set(%L)$q$,
  (select jsonb_agg(jsonb_build_object('v', 'visit:m_' || lpad(g::text, 12, '0'), 'b', true)) from generate_series(1, 501) g))) ->> 'error' = 'too_big');

select pg_temp.ok('A ticks three, one bad id and one bad flag skipped',
  (pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111', $q$select public.worker_away_been_set('[
     {"v":"visit:m_26a26d7e5164","b":true,"at":"2026-09-20T10:00:00Z"},
     {"v":"visit:m_ade940e178c3","b":true,"at":"2026-09-20T10:00:00Z"},
     {"v":"visit:m_05035a203a47","b":true,"at":"2026-09-20T10:00:00Z"},
     {"v":"DROP TABLE","b":true},
     {"v":"visit:m_05035a203a48","b":"yes"}]')$q$)) @> '{"ok":true,"kept":3,"skipped":2}');

select pg_temp.ok('B ticks one of the same visits',
  (pg_temp.as_user('authenticated', '22222222-2222-2222-2222-222222222222', $q$select public.worker_away_been_set('[
     {"v":"visit:m_26a26d7e5164","b":true,"at":"2026-09-21T10:00:00Z"}]')$q$)) @> '{"ok":true,"kept":1}');

-- 3. each sees only their own
select pg_temp.ok('A lists exactly three rows',
  jsonb_array_length(pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111', $q$select public.worker_away_been_list()$q$) -> 'rows') = 3);
select pg_temp.ok('B lists exactly one row',
  jsonb_array_length(pg_temp.as_user('authenticated', '22222222-2222-2222-2222-222222222222', $q$select public.worker_away_been_list()$q$) -> 'rows') = 1);

-- 4. the merge: newer wins, older loses, a tie keeps "been", the future is clamped
-- (each write is its own statement, so no check can be planned before the write it checks)
select pg_temp.ok('older un-tick accepted as a value', (pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.worker_away_been_set('[{"v":"visit:m_26a26d7e5164","b":false,"at":"2026-09-19T10:00:00Z"}]')$q$) ->> 'ok')::boolean);
select pg_temp.ok('an older un-tick does not undo a newer tick',
  (select been from public.worker_away_been where user_id = '11111111-1111-1111-1111-111111111111' and visit_id = 'visit:m_26a26d7e5164'));
select pg_temp.ok('newer un-tick accepted', (pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.worker_away_been_set('[{"v":"visit:m_ade940e178c3","b":false,"at":"2026-09-22T10:00:00Z"}]')$q$) ->> 'ok')::boolean);
select pg_temp.ok('a newer un-tick wins',
  (select not been from public.worker_away_been where user_id = '11111111-1111-1111-1111-111111111111' and visit_id = 'visit:m_ade940e178c3'));
select pg_temp.ok('tie accepted', (pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.worker_away_been_set('[{"v":"visit:m_ade940e178c3","b":true,"at":"2026-09-22T10:00:00Z"}]')$q$) ->> 'ok')::boolean);
select pg_temp.ok('a tie keeps been=true',
  (select been from public.worker_away_been where user_id = '11111111-1111-1111-1111-111111111111' and visit_id = 'visit:m_ade940e178c3'));
select pg_temp.ok('future accepted', (pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111',
  $q$select public.worker_away_been_set('[{"v":"visit:m_05035a203a47","b":false,"at":"2099-01-01T00:00:00Z"}]')$q$) ->> 'ok')::boolean);
select pg_temp.ok('a future timestamp is clamped to now',
  (select at <= now() + interval '1 second' and not been from public.worker_away_been
    where user_id = '11111111-1111-1111-1111-111111111111' and visit_id = 'visit:m_05035a203a47'));
select pg_temp.ok('B''s row is untouched by A''s writes',
  (select been and at = '2026-09-21T10:00:00Z'::timestamptz from public.worker_away_been
    where user_id = '22222222-2222-2222-2222-222222222222' and visit_id = 'visit:m_26a26d7e5164'));

-- 5. the writer made the profile row, and nothing hangs on auth
select pg_temp.ok('the account got a worker_profile row',
  exists (select 1 from public.worker_profile where id = '22222222-2222-2222-2222-222222222222'));
select pg_temp.ok('no trigger on auth',
  not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'auth' and not t.tgisinternal));
select pg_temp.ok('RLS is on', (select relrowsecurity from pg_class where oid = 'public.worker_away_been'::regclass));
