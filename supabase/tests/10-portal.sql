\set ON_ERROR_STOP 1
-- helper: expect failure
create or replace function pg_temp.expect_fail(p_sql text, p_role text, p_uid text default null) returns text language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid,''), true);
  begin
    execute p_sql;
  exception when others then
    reset role;
    return 'ok-refused: ' || sqlerrm;
  end;
  reset role;
  raise exception 'SHOULD HAVE FAILED as %: %', p_role, p_sql;
end $$;

begin;
-- 1. anon can write nothing and read nothing, catalog-driven over every worker_ table
do $$ declare t text; r text; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename like 'worker\_%' loop
    r := pg_temp.expect_fail(format('insert into public.%I default values', t), 'anon');
    r := pg_temp.expect_fail(format('select 1 from public.%I limit 1', t), 'anon');
    r := pg_temp.expect_fail(format('delete from public.%I', t), 'authenticated', '11111111-1111-1111-1111-111111111111');
  end loop;
  raise notice 'anon/auth direct writes refused on all worker_ tables';
end $$;
-- 2. authenticated cannot insert its own card or a run directly, cannot read the ballot
select pg_temp.expect_fail($q$insert into public.worker_profile(id) values ('11111111-1111-1111-1111-111111111111')$q$, 'authenticated', '11111111-1111-1111-1111-111111111111');
select pg_temp.expect_fail($q$insert into public.worker_gate_run(user_id,gate,idempotency_key) values ('11111111-1111-1111-1111-111111111111','/xi','k')$q$, 'authenticated', '11111111-1111-1111-1111-111111111111');
select pg_temp.expect_fail($q$select * from public.worker_poll_vote$q$, 'authenticated', '11111111-1111-1111-1111-111111111111');
select pg_temp.expect_fail($q$select public.worker_touch_profile('11111111-1111-1111-1111-111111111111')$q$, 'authenticated', '11111111-1111-1111-1111-111111111111');
select pg_temp.expect_fail($q$select public.worker_profile_ensure()$q$, 'anon');
commit;

-- 3. user A signs in: ensure creates, ensure again returns the same row
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select id, member_no, since from public.worker_profile_ensure();
select count(*) as a_rows_after_second_ensure from (select public.worker_profile_ensure()) x;
-- 4. runs are idempotent
select * from public.worker_record_run('run-1','/trivia/europe',120,12,9,42,'2026-09-20');
select * from public.worker_record_run('run-1','/trivia/europe',999,12,12,42,'2026-09-20');
select count(*) as runs, max(score) as score from public.worker_gate_run;
select since as since_moved_back from public.worker_profile;
-- 5. card edits: member_no frozen, newest wins
update public.worker_profile set member_no='TIK-0417', card='{"gate":"5"}', card_edited_at='2026-09-21T10:00Z', display_name='מאור';
update public.worker_profile set card='{"gate":"11"}', card_edited_at='2026-09-20T10:00Z', display_name='ישן';
select member_no, card, display_name from public.worker_profile;
reset role;
begin;
select pg_temp.expect_fail($q$update public.worker_profile set member_no='TIK-9999'$q$, 'authenticated', '11111111-1111-1111-1111-111111111111');
commit;
-- 6. collect + marks
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select public.worker_collect('kits', array['kit-1985-86-home','kit-1985-86-home','kit-1999-00-away']) as new_items;
select public.worker_collect('kits', array['kit-1985-86-home']) as new_again;
select public.worker_mark_questions('[{"q":"q_0123456789ab","topic":"europe","w":2,"r":0,"last":"w","at":"2026-09-20T10:00Z"},{"q":"bad","last":"w"}]') as marked;
select public.worker_mark_questions('[{"q":"q_0123456789ab","topic":"europe","w":1,"r":1,"last":"r","at":"2026-09-21T10:00Z"}]') as marked2;
select question_id, wrong, "right", last_outcome from public.worker_question_mark;
reset role;
-- 7. ballot: anon casts, anon tallies, nobody reads rows
set role anon; select set_config('request.jwt.claim.sub','', false);
select public.worker_poll_cast('device-aaaa-1','best-xi','p_000000000001');
select public.worker_poll_cast('device-aaaa-1','best-xi','p_000000000002');
select public.worker_poll_cast('device-bbbb-2','best-xi','p_000000000002');
select * from public.worker_poll_tally('best-xi');
reset role;
-- 8. royal rumble live: A hosts, B (a DUBID user) joins only because B opens the game
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
create temp table if not exists rr_ctx(room uuid, code text) ; grant all on rr_ctx to public;
insert into rr_ctx select room_id, code from public.worker_rr_create_room(least(1000::bigint, (1000::bigint # 1597463007::bigint)), 1000);
select pg_temp.expect_fail('select public.worker_rr_lock((select room from rr_ctx), 1000, ''["a","b","c","d","e"]'')', 'authenticated', '11111111-1111-1111-1111-111111111111');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
select room_id is not null as joined from public.worker_rr_join_room((select code from rr_ctx), 1000, 1000);
select status from public.worker_rr_lock((select room from rr_ctx), 1000, '["a","b","c","d","e"]');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select status, starts_at is not null as has_start from public.worker_rr_lock((select room from rr_ctx), 1000, '["f","g","h","i","j"]');
select status, is_host, opponent_joined, you_ready, opponent_ready from public.worker_rr_state((select room from rr_ctx));
reset role;
update public.worker_rr_room set starts_at = now() - interval '1 second';
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select host_picks, guest_picks from public.worker_rr_claim((select room from rr_ctx));
select count(*) as a_sees_rooms from public.worker_rr_room;
reset role;
-- a third user sees nothing
set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false);
select count(*) as stranger_sees_rooms from public.worker_rr_room;
select count(*) as stranger_sees_cards from public.worker_profile;
reset role;
-- 9. DUBID untouched: B has no Worker card (B only played RR, which references auth.users, not the card); DUBID tables as they were
select (select count(*) from public.worker_profile) as worker_cards,
       (select count(*) from auth.users) as auth_users,
       (select count(*) from public.profiles) as dubid_profiles;
select has_table_privilege('anon','public.profiles','insert') as dubid_grants_untouched;
