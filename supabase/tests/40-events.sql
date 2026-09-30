\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- המדידה (25.9.2026) — נבדקת כמו שתוקפים: anon כותב רק דרך הפונקציה, לא קורא שום דבר,
-- לא מגיע לסיכומים; service_role מסכם. המבקר הוא hash יומי, לא המזהה.
create or replace function pg_temp.as_role(p_role text, p_sql text) returns jsonb
language plpgsql as $$
declare v jsonb;
begin
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', '', true);
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

-- a clean slate for this file (a second run must not see the first run's rows)
delete from public.worker_event;

-- 1. by the catalog: anon and authenticated neither read nor write any event table
do $$
declare t text; r text; v jsonb;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'worker\_event%' loop
    foreach r in array array['anon', 'authenticated'] loop
      foreach v in array array[
        pg_temp.as_role(r, format('select to_jsonb(count(*)) from public.%I', t)),
        pg_temp.as_role(r, format('with d as (delete from public.%I returning 1) select to_jsonb(count(*)) from d', t)),
        pg_temp.as_role(r, format($q$with i as (insert into public.%I (day) values (current_date) returning 1) select to_jsonb(count(*)) from i$q$, t))] loop
        if coalesce(v ->> 'error', '') not like 'EXC: permission denied%' then
          raise exception 'FAIL % on % answered: %', r, t, v;
        end if;
      end loop;
    end loop;
  end loop;
  raise notice 'PASS no read/insert/delete on any event table for anon/authenticated';
end $$;

select pg_temp.ok('anon cannot sum', (pg_temp.as_role('anon', $q$select to_jsonb(count(*)) from public.worker_events_funnel(30)$q$) ->> 'error') like 'EXC: permission denied%');
select pg_temp.ok('authenticated cannot sum', (pg_temp.as_role('authenticated', $q$select public.worker_events_blind_cow(30)$q$) ->> 'error') like 'EXC: permission denied%');
select pg_temp.ok('anon cannot read the salt', (pg_temp.as_role('anon', $q$select to_jsonb(public.worker_events_salt())$q$) ->> 'error') like 'EXC: permission denied%');

-- 2. the write, as a value
select pg_temp.ok('a bad device is refused as a value',
  pg_temp.as_role('anon', $q$select public.worker_events_record('not a device!', '[{"name":"gate_view","gate":"/goal"}]')$q$) ->> 'error' = 'bad_device');
select pg_temp.ok('an empty batch is refused', pg_temp.as_role('anon', $q$select public.worker_events_record('aaaaaaaa-1111', '[]')$q$) ->> 'error' = 'empty');
select pg_temp.ok('26 events is too big', pg_temp.as_role('anon', format($q$select public.worker_events_record('aaaaaaaa-1111', %L)$q$,
  (select jsonb_agg(jsonb_build_object('name', 'gate_step', 'gate', '/goal', 'step', g)) from generate_series(1, 26) g))) ->> 'error' = 'too_big');

select pg_temp.ok('A: view, start, two steps, leave at 2 — kept 5',
  (pg_temp.as_role('anon', $q$select public.worker_events_record('aaaaaaaa-1111', '[
     {"name":"gate_view","gate":"/goal","detail":"direct"},
     {"name":"gate_start","gate":"/goal"},
     {"name":"gate_step","gate":"/goal","step":1},
     {"name":"gate_step","gate":"/goal","step":2},
     {"name":"gate_leave","gate":"/goal","step":2}]')$q$) ->> 'kept') = '5');
select pg_temp.ok('B: view, start, finish; bad rows skipped, not thrown',
  (select v ->> 'kept' = '3' and v ->> 'skipped' = '4' from (select pg_temp.as_role('anon', $q$select public.worker_events_record('bbbbbbbb-2222', '[
     {"name":"gate_view","gate":"/goal"},
     {"name":"gate_start","gate":"/goal"},
     {"name":"gate_finish","gate":"/goal","value":78},
     {"name":"drop_table","gate":"/goal"},
     {"name":"gate_view","gate":"https://evil"},
     {"name":"gate_step","gate":"/goal","step":100000},
     {"name":"share_click","gate":"/goal","detail":"<script>"}]')$q$) as v) s));
select pg_temp.ok('C: view only (bounced)',
  (pg_temp.as_role('authenticated', $q$select public.worker_events_record('cccccccc-3333', '[{"name":"gate_view","gate":"/goal"},{"name":"gate_view","gate":"/blind-cow"}]')$q$) ->> 'ok') = 'true');
select pg_temp.ok('blind cow events',
  (pg_temp.as_role('anon', $q$select public.worker_events_record('aaaaaaaa-1111', '[
     {"name":"gate_view","gate":"/blind-cow"},
     {"name":"blind_cow_started","gate":"/blind-cow","detail":"solo"},
     {"name":"blind_cow_hint_revealed","gate":"/blind-cow","step":2},
     {"name":"blind_cow_solved","gate":"/blind-cow","step":3,"value":18400},
     {"name":"blind_cow_duel_created","gate":"/blind-cow"},
     {"name":"blind_cow_duel_joined","gate":"/blind-cow"}]')$q$) ->> 'kept') = '6');

-- 3. privacy: nothing of the device is stored
select pg_temp.ok('the device id is nowhere in the table',
  not exists (select 1 from public.worker_event where visitor like '%aaaaaaaa%' or coalesce(detail, '') like '%aaaaaaaa%'));
select pg_temp.ok('one device = one visitor hash today', (select count(distinct visitor) from public.worker_event) = 3);
select pg_temp.ok('the hash is not sha256 of the id alone',
  not exists (select 1 from public.worker_event where visitor = encode(sha256(convert_to('aaaaaaaa-1111', 'UTF8')), 'hex')));
select pg_temp.ok('one salt, today''s', (select count(*) from public.worker_event_salt) = 1);
insert into public.worker_event_salt values (current_date - 5, 'old') on conflict do nothing;
delete from public.worker_event_salt where day = (now() at time zone 'Asia/Jerusalem')::date;
select pg_temp.ok('a new day mints a salt',
  (pg_temp.as_role('anon', $q$select public.worker_events_record('aaaaaaaa-1111', '[{"name":"gate_view","gate":"/xi"}]')$q$) ->> 'ok') = 'true');
select pg_temp.ok('…and forgets the ones older than yesterday', not exists (select 1 from public.worker_event_salt where salt = 'old'));
select pg_temp.ok('…and the same device is a new visitor after it', (select count(distinct visitor) from public.worker_event) = 4);

-- 4. the rate limit counts rows, so it survives a refused call
select pg_temp.ok('240 a minute, then slow_down as a value',
  (select bool_and(r ->> 'ok' = 'true') from (
     select pg_temp.as_role('anon', format($q$select public.worker_events_record('dddddddd-4444', %L)$q$,
       (select jsonb_agg(jsonb_build_object('name', 'gate_step', 'gate', '/trivia', 'step', g)) from generate_series(1, 24) g))) as r
       from generate_series(1, 10)) x)
  and pg_temp.as_role('anon', $q$select public.worker_events_record('dddddddd-4444', '[{"name":"gate_view","gate":"/trivia"}]')$q$) ->> 'error' = 'slow_down');

-- 5. the sums, as service_role
select pg_temp.ok('funnel for /goal: 3 in, 2 started, 1 finished, 33.3%, one leave at step 2',
  (select v @> '[{"gate":"/goal","visitors":3,"starters":2,"finishers":1,"finish_rate":33.3,"leaves":1,"top_leave_step":2}]'::jsonb
     from (select pg_temp.as_role('service_role', $q$select jsonb_agg(to_jsonb(f)) from public.worker_events_funnel(30) f$q$) as v) s),
  (select pg_temp.as_role('service_role', $q$select jsonb_agg(to_jsonb(f)) from public.worker_events_funnel(30) f$q$)));
select pg_temp.ok('daily rows per gate',
  (select (v -> 0 ->> 'visitors') is not null from (select pg_temp.as_role('service_role', $q$select jsonb_agg(to_jsonb(d)) from public.worker_events_daily(7) d$q$) as v) s));
select pg_temp.ok('blind cow summary: avg hints 3, median 18.4s, join rate 100',
  (select v ->> 'avgHintsToSolve' = '3.00' and (v ->> 'medianSolveMs')::numeric = 18400 and (v ->> 'duelJoinRate')::numeric = 100
     from (select pg_temp.as_role('service_role', $q$select public.worker_events_blind_cow(30)$q$) as v) s),
  (select pg_temp.as_role('service_role', $q$select public.worker_events_blind_cow(30)$q$)));

-- leave nothing behind
delete from public.worker_event;
