\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- שער 10 — הדו-קרב החי (25.9.2026): Ready Room, רגע פתיחה אחד, ואותה תוצאה כמו הדו-קרב
-- האסינכרוני. שני מכשירים anon (A = aaaa…, B = bbbb…) ושלישי שלא הוזמן (C).
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
create or replace function pg_temp.tk(p_k text default 'token') returns text language sql as $$ select v from ctx where k = p_k $$;

-- 0. still closed: the new columns did not open a table
select pg_temp.ok('anon still cannot read the duel table',
  (pg_temp.call($q$select to_jsonb(count(*)) from public.worker_blind_cow_duel where live_go_at is null$q$) ->> 'error') like 'EXC: permission denied%');

-- 1. the room: A creates, the state says nobody else is here
insert into ctx select 'token', pg_temp.call($q$select public.worker_blind_cow_duel_create(repeat('a', 32), 'יוסף')$q$) ->> 'token';
select pg_temp.ok('A is in the room alone', (select v -> 'them' is null or jsonb_typeof(v -> 'them') = 'null' from (select pg_temp.call(format($q$select public.worker_blind_cow_live_state(repeat('a', 32), %L)$q$, pg_temp.tk())) as v) s));
select pg_temp.ok('C, not joined, sees nothing', pg_temp.call(format($q$select public.worker_blind_cow_live_state(repeat('c', 32), %L)$q$, pg_temp.tk())) ->> 'error' = 'not_joined');
select pg_temp.ok('C cannot ready a room he is not in', pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('c', 32), %L)$q$, pg_temp.tk())) ->> 'error' = 'not_joined');
select pg_temp.ok('a bad key is refused as a value', pg_temp.call(format($q$select public.worker_blind_cow_live_state('nope', %L)$q$, pg_temp.tk())) ->> 'error' = 'bad_identity');

-- 2. A ready alone: no go time; start is refused
select pg_temp.ok('A ready', (pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('a', 32), %L)$q$, pg_temp.tk())) ->> 'meReady') = 'true');
select pg_temp.ok('one side ready sets no go time', (pg_temp.call(format($q$select public.worker_blind_cow_live_state(repeat('a', 32), %L)$q$, pg_temp.tk())) ->> 'goAt') is null);
select pg_temp.ok('start before both are ready = not_ready', pg_temp.call(format($q$select public.worker_blind_cow_live_start(repeat('a', 32), %L)$q$, pg_temp.tk())) ->> 'error' = 'not_ready');
select pg_temp.ok('A can take it back', (pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('a', 32), %L, false)$q$, pg_temp.tk())) ->> 'meReady') = 'false');

-- 3. B joins; both ready → one go time, four seconds out, the same for both
select pg_temp.ok('B joins', (pg_temp.call(format($q$select public.worker_blind_cow_duel_join(repeat('b', 32), %L, 'אופיר')$q$, pg_temp.tk())) ->> 'slot') = '2');
select pg_temp.ok('A sees B in the room, not ready', (pg_temp.call(format($q$select public.worker_blind_cow_live_state(repeat('a', 32), %L)$q$, pg_temp.tk())) -> 'them' ->> 'ready') = 'false');
select pg_temp.ok('B ready', (pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('b', 32), %L)$q$, pg_temp.tk())) ->> 'meReady') = 'true');
insert into ctx select 'go', pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('a', 32), %L)$q$, pg_temp.tk())) ->> 'goAt';
select pg_temp.ok('both ready → a go time', pg_temp.tk('go') is not null);
select pg_temp.ok('about four seconds from now', (pg_temp.tk('go')::bigint - (extract(epoch from now()) * 1000)::bigint) between 3000 and 4500);
select pg_temp.ok('B reads the same go time', (pg_temp.call(format($q$select public.worker_blind_cow_live_state(repeat('b', 32), %L)$q$, pg_temp.tk())) ->> 'goAt') = pg_temp.tk('go'));
select pg_temp.ok('ready again does not move it', (pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('b', 32), %L, false)$q$, pg_temp.tk())) ->> 'goAt') = pg_temp.tk('go'));

-- 4. too early is a value, with the go time and the server clock
select pg_temp.ok('start before go = too_early, with goAt', (select v ->> 'error' = 'too_early' and v ->> 'goAt' = pg_temp.tk('go') and v ? 'serverNow'
  from (select pg_temp.call(format($q$select public.worker_blind_cow_live_start(repeat('a', 32), %L)$q$, pg_temp.tk())) as v) s));
select pg_temp.ok('no clue has left before go', not exists (select 1 from public.worker_blind_cow_run r join public.worker_blind_cow_duel d on d.id = r.duel_id
  where d.public_token_hash = public.worker_blind_cow_token_hash(pg_temp.tk())));

-- 5. the clock passes go (moved back, as the async test moves started_at)
update public.worker_blind_cow_duel set live_go_at = now() - interval '2 seconds' where public_token_hash = public.worker_blind_cow_token_hash(pg_temp.tk());
insert into ctx select 'a1', pg_temp.call(format($q$select public.worker_blind_cow_live_start(repeat('a', 32), %L)$q$, pg_temp.tk()))::text;
select pg_temp.ok('A plays: one clue, no answer', ((select v::jsonb from ctx where k = 'a1') ->> 'status') = 'playing'
  and jsonb_array_length((select v::jsonb from ctx where k = 'a1') -> 'clues') = 1 and ((select v::jsonb from ctx where k = 'a1') ->> 'answer') is null);
-- B joins a second later: his clock still starts at go
select pg_temp.ok('B starts late — the same startedAt as A', (pg_temp.call(format($q$select public.worker_blind_cow_live_start(repeat('b', 32), %L)$q$, pg_temp.tk())) ->> 'startedAt')
  = ((select v::jsonb from ctx where k = 'a1') ->> 'startedAt'));
select pg_temp.ok('start again = the same run', (pg_temp.call(format($q$select public.worker_blind_cow_live_start(repeat('a', 32), %L)$q$, pg_temp.tk())) ->> 'startedAt')
  = ((select v::jsonb from ctx where k = 'a1') ->> 'startedAt'));
select pg_temp.ok('ready after the start changes nothing', (select v ->> 'meStarted' = 'true' and v ->> 'goAt' is not null
  from (select pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('a', 32), %L, false)$q$, pg_temp.tk())) as v) s));

-- 6. the SAME seven functions play it out, and the same referee decides
insert into ctx select 'answer', q.target_player_id from public.worker_blind_cow_duel d
  join public.worker_blind_cow_question q on q.question_id = d.question_id and q.version = d.question_version
 where d.public_token_hash = public.worker_blind_cow_token_hash(pg_temp.tk());
select pg_temp.ok('A reveals clue 2 through the async function', (pg_temp.call(format($q$select public.worker_blind_cow_run_reveal(repeat('a', 32), %L, 1)$q$, pg_temp.tk())) ->> 'hintsUsed') = '2');
select pg_temp.ok('A solves', (pg_temp.call(format($q$select public.worker_blind_cow_run_guess(repeat('a', 32), %L, %L)$q$, pg_temp.tk(), pg_temp.tk('answer'))) ->> 'status') = 'solved');
select pg_temp.ok('B gives up', (pg_temp.call(format($q$select public.worker_blind_cow_run_give_up(repeat('b', 32), %L)$q$, pg_temp.tk())) ->> 'status') = 'gave_up');
insert into ctx select 'sa', pg_temp.call(format($q$select public.worker_blind_cow_duel_state(repeat('a', 32), %L)$q$, pg_temp.tk()))::text;
select pg_temp.ok('completed, A wins, weighted = raw + 15s', (select v ->> 'status' = 'completed' and v ->> 'winner' = 'me'
  and (v -> 'me' ->> 'weightedTimeMs')::bigint = (v -> 'me' ->> 'rawElapsedMs')::bigint + 15000 from (select (select v::jsonb from ctx where k = 'sa') as v) s));
select pg_temp.ok('A''s raw time runs from go (≥ 2 s)', ((select v::jsonb from ctx where k = 'sa') -> 'me' ->> 'rawElapsedMs')::bigint >= 2000);

-- 7. a duel already played async cannot turn live
insert into ctx select 'token2', pg_temp.call($q$select public.worker_blind_cow_duel_create(repeat('a', 32))$q$) ->> 'token';
select pg_temp.ok('B joins duel 2', (pg_temp.call(format($q$select public.worker_blind_cow_duel_join(repeat('b', 32), %L)$q$, pg_temp.tk('token2'))) ->> 'slot') = '2');
select pg_temp.ok('A starts async', (pg_temp.call(format($q$select public.worker_blind_cow_run_start(repeat('a', 32), %L)$q$, pg_temp.tk('token2'))) ->> 'status') = 'playing');
select pg_temp.ok('then B cannot ready a live room', pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('b', 32), %L)$q$, pg_temp.tk('token2'))) ->> 'error' = 'started');
update public.worker_blind_cow_duel set expires_at = now() - interval '1 minute' where public_token_hash = public.worker_blind_cow_token_hash(pg_temp.tk('token2'));
select pg_temp.ok('an expired room is refused', pg_temp.call(format($q$select public.worker_blind_cow_live_ready(repeat('b', 32), %L)$q$, pg_temp.tk('token2'))) ->> 'error' = 'expired');

-- 8. leave no rows behind
delete from public.worker_blind_cow_run_event;
delete from public.worker_blind_cow_duel_slot;
delete from public.worker_blind_cow_run;
delete from public.worker_blind_cow_duel;
select 'PASS clean';
