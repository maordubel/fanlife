\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- שער 10 — הדו-קרב, נבדק כמו שתוקפים. שני מכשירים בלי חשבון (anon), מפתח לכל אחד:
--   A = aaaa…  B = bbbb…  C = cccc… (שלישי, מנסה להיכנס לדו-קרב מלא)
create or replace function pg_temp.call(p_sql text) returns jsonb
language plpgsql as $$
declare v jsonb;
begin
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
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
create temp table ctx (k text primary key, v text);
grant all on ctx to anon;

-- 1. nobody outside reads or writes a blind-cow table, by the catalog
do $$
declare t text; v jsonb;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'worker\_blind\_cow\_%' loop
    foreach v in array array[
      pg_temp.call(format('select to_jsonb(count(*)) from public.%I', t)),
      pg_temp.call(format('with d as (delete from public.%I returning 1) select to_jsonb(count(*)) from d', t)),
      pg_temp.call(format('with u as (update public.%I set %I = %I returning 1) select to_jsonb(count(*)) from u', t,
        (select attname from pg_attribute where attrelid = format('public.%I', t)::regclass and attnum = 2),
        (select attname from pg_attribute where attrelid = format('public.%I', t)::regclass and attnum = 2)))] loop
      if coalesce(v ->> 'error', '') not like 'EXC: permission denied%' then
        raise exception 'FAIL table % answered: %', t, v;
      end if;
    end loop;
  end loop;
  raise notice 'PASS no read/update/delete on any blind-cow table';
end $$;
select pg_temp.ok('internal helpers are closed to anon',
  (pg_temp.call($q$select to_jsonb(public.worker_blind_cow_view(gen_random_uuid()))$q$) ->> 'error') like 'EXC: permission denied%');
select pg_temp.ok('a bad device key is refused as a value',
  pg_temp.call($q$select public.worker_blind_cow_duel_create('not-hex')$q$) ->> 'error' = 'bad_identity');

-- 2. A creates, B joins, C is turned away, A cannot take slot 2
insert into ctx select 'token', pg_temp.call($q$select public.worker_blind_cow_duel_create(repeat('a', 32), 'יוסף')$q$) ->> 'token';
select pg_temp.ok('the token is 32 hex', (select v from ctx where k = 'token') ~ '^[0-9a-f]{32}$');
select pg_temp.ok('only its hash is stored', not exists (select 1 from public.worker_blind_cow_duel where public_token_hash = (select v from ctx where k = 'token')));
select pg_temp.ok('A re-joining gets slot 1 back', (pg_temp.call(format($q$select public.worker_blind_cow_duel_join(repeat('a', 32), %L)$q$, (select v from ctx where k = 'token'))) ->> 'slot') = '1');
select pg_temp.ok('B joins slot 2', (pg_temp.call(format($q$select public.worker_blind_cow_duel_join(repeat('b', 32), %L, 'אופיר')$q$, (select v from ctx where k = 'token'))) ->> 'slot') = '2');
select pg_temp.ok('C finds it full', pg_temp.call(format($q$select public.worker_blind_cow_duel_join(repeat('c', 32), %L)$q$, (select v from ctx where k = 'token'))) ->> 'error' = 'full');
select pg_temp.ok('a wrong token finds nothing', pg_temp.call($q$select public.worker_blind_cow_duel_join(repeat('a', 32), repeat('0', 32))$q$) ->> 'error' = 'not_found');

-- 3. B plays first: one clue, the timer is the server's, refresh keeps it
insert into ctx select 'b1', pg_temp.call(format($q$select public.worker_blind_cow_run_start(repeat('b', 32), %L)$q$, (select v from ctx where k = 'token')))::text;
select pg_temp.ok('B sees exactly one clue', jsonb_array_length((select v::jsonb from ctx where k = 'b1') -> 'clues') = 1);
select pg_temp.ok('no answer while playing', ((select v::jsonb from ctx where k = 'b1') ->> 'answer') is null);
select pg_temp.ok('B start again = same clock', (pg_temp.call(format($q$select public.worker_blind_cow_run_start(repeat('b', 32), %L)$q$, (select v from ctx where k = 'token'))) ->> 'startedAt') = ((select v::jsonb from ctx where k = 'b1') ->> 'startedAt'));
select pg_temp.ok('B reveals clue 2', jsonb_array_length(pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('b', 32), %L, 1)$q$, (select v from ctx where k = 'token'))) -> 'clues') = 2);
select pg_temp.ok('a double tap does not open a third', (pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('b', 32), %L, 1)$q$, (select v from ctx where k = 'token'))) ->> 'hintsUsed') = '2');
select pg_temp.ok('B reveals clue 3', (pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('b', 32), %L, 2)$q$, (select v from ctx where k = 'token'))) ->> 'hintsUsed') = '3');
-- a wrong guess (a real id that is not the answer), twice: one mistake
insert into ctx select 'answer', q.target_player_id from public.worker_blind_cow_duel d
  join public.worker_blind_cow_question q on q.question_id = d.question_id and q.version = d.question_version limit 1;
insert into ctx select 'wrong', case when (select v from ctx where k = 'answer') = 'p_0000000000' then 'p_1111111111' else 'p_0000000000' end;
select pg_temp.ok('B guesses wrong', (pg_temp.call(format($q$select public.worker_blind_cow_run_guess(repeat('b', 32), %L, %L)$q$, (select v from ctx where k = 'token'), (select v from ctx where k = 'wrong'))) ->> 'wrongGuesses') = '1');
select pg_temp.ok('the same wrong name twice is one mistake', (pg_temp.call(format($q$select public.worker_blind_cow_run_guess(repeat('b', 32), %L, %L)$q$, (select v from ctx where k = 'token'), (select v from ctx where k = 'wrong'))) ->> 'wrongGuesses') = '1');
select pg_temp.ok('a malformed id is refused', pg_temp.call(format($q$select public.worker_blind_cow_run_guess(repeat('b', 32), %L, 'x')$q$, (select v from ctx where k = 'token'))) ->> 'error' = 'bad_player');
-- 18.4 seconds on the clock, then the right man
update public.worker_blind_cow_run set started_at = now() - interval '18.4 seconds' where anon_id = public.worker_blind_cow_me(repeat('b', 32));
insert into ctx select 'b2', pg_temp.call(format($q$select public.worker_blind_cow_run_guess(repeat('b', 32), %L, %L)$q$, (select v from ctx where k = 'token'), (select v from ctx where k = 'answer')))::text;
select pg_temp.ok('B solved', (select v::jsonb from ctx where k = 'b2') ->> 'status' = 'solved');
select pg_temp.ok('B sees the answer and all ten clues now', ((select v::jsonb from ctx where k = 'b2') ->> 'answer') = (select v from ctx where k = 'answer')
  and jsonb_array_length((select v::jsonb from ctx where k = 'b2') -> 'clues') = 10);
select pg_temp.ok('weighted = raw + 2×15s + 1×5s', ((select v::jsonb from ctx where k = 'b2') ->> 'weightedTimeMs')::bigint
  = ((select v::jsonb from ctx where k = 'b2') ->> 'rawElapsedMs')::bigint + 35000);
select pg_temp.ok('a guess after the whistle changes nothing', (pg_temp.call(format($q$select public.worker_blind_cow_run_guess(repeat('b', 32), %L, %L)$q$, (select v from ctx where k = 'token'), (select v from ctx where k = 'wrong'))) ->> 'weightedTimeMs') = ((select v::jsonb from ctx where k = 'b2') ->> 'weightedTimeMs'));

-- 4. A has not played: B's result is hidden from A; A's (none yet) from B is null
select pg_temp.ok('A cannot see B''s result before A finishes', (pg_temp.call(format($q$select public.worker_blind_cow_duel_state(repeat('a', 32), %L)$q$, (select v from ctx where k = 'token'))) -> 'opponent' ->> 'result') is null);
select pg_temp.ok('…but A knows B finished', (pg_temp.call(format($q$select public.worker_blind_cow_duel_state(repeat('a', 32), %L)$q$, (select v from ctx where k = 'token'))) -> 'opponent' ->> 'finished') = 'true');
select pg_temp.ok('A''s state carries no answer', (pg_temp.call(format($q$select public.worker_blind_cow_duel_state(repeat('a', 32), %L)$q$, (select v from ctx where k = 'token')))::text) not like '%' || (select v from ctx where k = 'answer') || '%');

-- 5. A plays: same question, same first clue; 2 more clues then solved at 54.2 − 45 = 9.2 s? (A: 4 clues, 9.2 s)
insert into ctx select 'a1', pg_temp.call(format($q$select public.worker_blind_cow_run_start(repeat('a', 32), %L)$q$, (select v from ctx where k = 'token')))::text;
select pg_temp.ok('both sides get the same first clue', ((select v::jsonb from ctx where k = 'a1') -> 'clues' -> 0) = ((select v::jsonb from ctx where k = 'b2') -> 'clues' -> 0));
select pg_temp.ok('A clue 2', (pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('a', 32), %L, 1)$q$, (select v from ctx where k = 'token'))) ->> 'hintsUsed') = '2');
select pg_temp.ok('A clue 3', (pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('a', 32), %L, 2)$q$, (select v from ctx where k = 'token'))) ->> 'hintsUsed') = '3');
select pg_temp.ok('A clue 4', (pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('a', 32), %L, 3)$q$, (select v from ctx where k = 'token'))) ->> 'hintsUsed') = '4');
update public.worker_blind_cow_run set started_at = now() - interval '9.2 seconds' where anon_id = public.worker_blind_cow_me(repeat('a', 32));
select pg_temp.ok('A solved', (pg_temp.call(format($q$select public.worker_blind_cow_run_guess(repeat('a', 32), %L, %L)$q$, (select v from ctx where k = 'token'), (select v from ctx where k = 'answer'))) ->> 'status') = 'solved');
insert into ctx select 'sa', pg_temp.call(format($q$select public.worker_blind_cow_duel_state(repeat('a', 32), %L)$q$, (select v from ctx where k = 'token')))::text;
select pg_temp.ok('the duel is completed', (select v::jsonb from ctx where k = 'sa') ->> 'status' = 'completed');
select pg_temp.ok('A now sees B''s result', ((select v::jsonb from ctx where k = 'sa') -> 'opponent' -> 'result' ->> 'hintsUsed') = '3');
-- יוסף (B): 3 clues · 18.4 s + 1 wrong → 53.4; אופיר (A): 4 clues · 9.2 s → 54.2 — B wins
select pg_temp.ok('A: 4 clues · 9.2 s → about 54.2', abs(((select v::jsonb from ctx where k = 'sa') -> 'me' ->> 'weightedTimeMs')::bigint - 54200) < 400);
select pg_temp.ok('B wins on weighted time', (select v::jsonb from ctx where k = 'sa') ->> 'winner' = 'them');
select pg_temp.ok('B sees himself winning', (pg_temp.call(format($q$select public.worker_blind_cow_duel_state(repeat('b', 32), %L)$q$, (select v from ctx where k = 'token'))) ->> 'winner') = 'me');

-- 6. give up, timeout and expiry
insert into ctx select 'token2', pg_temp.call($q$select public.worker_blind_cow_duel_create(repeat('a', 32))$q$) ->> 'token';
select pg_temp.ok('a guest cannot start a duel he has not joined', pg_temp.call(format($q$select public.worker_blind_cow_run_start(repeat('c', 32), %L)$q$, (select v from ctx where k = 'token2'))) ->> 'error' = 'not_joined');
select pg_temp.ok('A starts duel 2', (pg_temp.call(format($q$select public.worker_blind_cow_run_start(repeat('a', 32), %L)$q$, (select v from ctx where k = 'token2'))) ->> 'status') = 'playing');
update public.worker_blind_cow_run set started_at = now() - interval '3 minutes' where duel_id = (select id from public.worker_blind_cow_duel order by created_at desc limit 1);
select pg_temp.ok('past 120 s the run is a timeout, cut at 120 s', (pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('a', 32), %L, 1)$q$, (select v from ctx where k = 'token2'))) ->> 'rawElapsedMs') = '120000');
select pg_temp.ok('C joins duel 2', (pg_temp.call(format($q$select public.worker_blind_cow_duel_join(repeat('c', 32), %L)$q$, (select v from ctx where k = 'token2'))) ->> 'slot') = '2');
select pg_temp.ok('C starts and gives up', (pg_temp.call(format($q$select public.worker_blind_cow_run_start(repeat('c', 32), %L)$q$, (select v from ctx where k = 'token2'))) ->> 'status') = 'playing'
  and (pg_temp.call(format($q$select public.worker_blind_cow_run_give_up(repeat('c', 32), %L)$q$, (select v from ctx where k = 'token2'))) ->> 'status') = 'gave_up');
select pg_temp.ok('nobody solved: no winner is invented', (pg_temp.call(format($q$select public.worker_blind_cow_duel_state(repeat('c', 32), %L)$q$, (select v from ctx where k = 'token2'))) ->> 'winner') = 'none');
insert into ctx select 'token3', pg_temp.call($q$select public.worker_blind_cow_duel_create(repeat('a', 32))$q$) ->> 'token';
update public.worker_blind_cow_duel set expires_at = now() - interval '1 minute' where public_token_hash = public.worker_blind_cow_token_hash((select v from ctx where k = 'token3'));
select pg_temp.ok('after 7 days the link is expired', pg_temp.call(format($q$select public.worker_blind_cow_duel_join(repeat('b', 32), %L)$q$, (select v from ctx where k = 'token3'))) ->> 'error' = 'expired');
select pg_temp.ok('events were written', (select count(*) from public.worker_blind_cow_run_event) >= 10);

-- 7. leave no rows behind — a second run of this file must see what the first saw
delete from public.worker_blind_cow_run_event;
delete from public.worker_blind_cow_duel_slot;
delete from public.worker_blind_cow_run;
delete from public.worker_blind_cow_duel;
select 'PASS clean';
