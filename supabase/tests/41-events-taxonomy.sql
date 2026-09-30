\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- טקסונומיית האירועים (28.9.2026) — שם ישן ושם חדש נכנסים, שם זר לא, ו-anon עדיין רק כותב.
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

delete from public.worker_event;

select pg_temp.ok('the old names still enter, the new ones enter, a stranger does not',
  (select (v ->> 'kept') = '4' and (v ->> 'skipped') = '1' from (select
    pg_temp.as_role('anon', $q$select public.worker_events_record('dddddddd-4444', '[
     {"name":"gate_view","gate":"/trivia"},
     {"name":"run_complete","gate":"/trivia","value":9},
     {"name":"result_view","gate":"/blind-cow","detail":"high"},
     {"name":"entity_follow","gate":"/trivia","detail":"archive"},
     {"name":"gate_open","gate":"/trivia"}]')$q$) as v) s));

select pg_temp.ok('every plan name is accepted by the check',
  (select bool_and(pg_get_constraintdef(c.oid) like '%''' || n || '''%')
     from pg_constraint c,
          unnest(array['run_start','run_complete','result_view','archive_open','entity_follow','life_chapter_complete',
                       'share_open','share_created','share_joined','challenge_created','challenge_joined','challenge_complete',
                       'stand_created','stand_joined','stand_daily_complete','daily_open','daily_item_complete','daily_complete']) n
    where c.conrelid = 'public.worker_event'::regclass and c.conname = 'worker_event_name_check'));

select pg_temp.ok('anon still reads nothing',
  coalesce(pg_temp.as_role('anon', 'select to_jsonb(count(*)) from public.worker_event') ->> 'error', '') like 'EXC: permission denied%');

delete from public.worker_event;
