\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- "היציע שלי" — נבדק כמו שתוקפים. ארבעה מכשירים בלי חשבון (anon), מפתח לכל אחד:
--   A = aaaa… (פותח)  B = bbbb…  C = cccc…  D = dddd… (אורח עם הקישור, לא נכנס)
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
insert into ctx values ('today', public.worker_stand_today()::text),
  ('week', (public.worker_stand_today() - (extract(isodow from public.worker_stand_today())::integer - 1))::text),
  ('hashA', public.worker_stand_me(repeat('a', 32)));

-- 1. nobody outside reads or writes a stand table, by the catalog
do $$
declare t text; v jsonb;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'worker\_stand%' loop
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
  raise notice 'PASS no read/update/delete on any stand table';
end $$;
select pg_temp.ok('no stand table has a user id, email or name column',
  not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name like 'worker\_stand%'
               and column_name ~ '(user|email|mail|phone|real_name|account)'));
select pg_temp.ok('internal helpers are closed to anon',
  (pg_temp.call($q$select to_jsonb(public.worker_stand_rate_ok('x', 'y', 1, interval '1 hour'))$q$) ->> 'error') like 'EXC: permission denied%'
  and (pg_temp.call($q$select to_jsonb(public.worker_stand_code())$q$) ->> 'error') like 'EXC: permission denied%'
  and (pg_temp.call($q$select to_jsonb(public.worker_stand_of('x', 'ABCDEF'))$q$) ->> 'error') like 'EXC: permission denied%');
select pg_temp.ok('a bad device key is refused as a value',
  pg_temp.call($q$select public.worker_stand_create('not-hex', 'היציע')$q$) ->> 'error' = 'bad_identity');
select pg_temp.ok('an empty name is refused',
  pg_temp.call($q$select public.worker_stand_create(repeat('a', 32), '   ')$q$) ->> 'error' = 'bad_name');

-- 2. A opens a stand; B and C join; D only looks
insert into ctx select 'code', pg_temp.call($q$select public.worker_stand_create(repeat('a', 32), 'שער 5 · השורה השלישית', 'אבי')$q$) ->> 'code';
select pg_temp.ok('the invite code is six unambiguous characters', (select v from ctx where k = 'code') ~ '^[2-9A-HJ-NP-Z]{6}$');
select pg_temp.ok('only the hash of the key is stored',
  not exists (select 1 from public.worker_stand_member where member = repeat('a', 32))
  and exists (select 1 from public.worker_stand_member where member = (select v from ctx where k = 'hashA')));
select pg_temp.ok('B joins as number 2',
  (pg_temp.call(format($q$select public.worker_stand_join(repeat('b', 32), %L)$q$, (select v from ctx where k = 'code'))) ->> 'no') = '2');
select pg_temp.ok('the code is case-insensitive and B re-joining keeps number 2',
  (pg_temp.call(format($q$select public.worker_stand_join(repeat('b', 32), %L, 'בני')$q$, lower((select v from ctx where k = 'code')))) ->> 'no') = '2');
select pg_temp.ok('C joins as number 3',
  (pg_temp.call(format($q$select public.worker_stand_join(repeat('c', 32), %L, 'c@mail.com')$q$, (select v from ctx where k = 'code'))) ->> 'no') = '3');
select pg_temp.ok('an email in the nickname loses its @',
  (select nickname from public.worker_stand_member where public_no = 3) = 'cmail.com');
select pg_temp.ok('a wrong code finds nothing',
  pg_temp.call($q$select public.worker_stand_join(repeat('b', 32), 'ZZZZZZ')$q$) ->> 'error' = 'not_found'
  and pg_temp.call($q$select public.worker_stand_join(repeat('b', 32), 'O0I1xx')$q$) ->> 'error' = 'not_found');
insert into ctx select 'peek', pg_temp.call(format($q$select public.worker_stand_peek(repeat('d', 32), %L)$q$, (select v from ctx where k = 'code')))::text;
select pg_temp.ok('the guest sees the name and a count, and is not a member',
  (select v::jsonb from ctx where k = 'peek') ->> 'members' = '3' and (select v::jsonb from ctx where k = 'peek') ->> 'member' = 'false');
select pg_temp.ok('the guest sees no member, number or nickname',
  (select v from ctx where k = 'peek') !~ '(אבי|בני|"no"|"nick"|[0-9a-f]{64})');
select pg_temp.ok('the guest cannot open the stand home',
  pg_temp.call(format($q$select public.worker_stand_home(repeat('d', 32), %L, null, null, null)$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'not_member');

-- 3. the report: only members, only today, only the known shapes, only upward
select pg_temp.ok('a guest in no stand stores nothing',
  pg_temp.call(format($q$select public.worker_stand_report(repeat('d', 32), %L::date, array['remember'], null, null, null, null, null, null, null)$q$, (select v from ctx where k = 'today'))) ->> 'error' = 'not_member'
  and not exists (select 1 from public.worker_stand_day where member = public.worker_stand_me(repeat('d', 32))));
select pg_temp.ok('yesterday is refused',
  pg_temp.call(format($q$select public.worker_stand_report(repeat('a', 32), %L::date - 1, array['remember'], null, null, null, null, null, null, null)$q$, (select v from ctx where k = 'today'))) ->> 'error' = 'bad_day');
select pg_temp.ok('A reports: a slot, a blind cow in 2 clues, a vote, and a forged slot is dropped',
  (pg_temp.call(format($q$select public.worker_stand_report(repeat('a', 32), %L::date, array['remember', 'hack'], 'solved', 2, 0, 'best-final', 'm_1', %L::date, array['g2', 'g10', 'g99'])$q$,
    (select v from ctx where k = 'today'), (select v from ctx where k = 'week'))) -> 'slots') = '["remember"]'::jsonb);
select pg_temp.ok('B reports all three, a blind cow in 5 clues, the same vote',
  (pg_temp.call(format($q$select public.worker_stand_report(repeat('b', 32), %L::date, array['remember', 'choose', 'discover'], 'solved', 5, 1, 'best-final', 'm_1', %L::date, array['g2'])$q$,
    (select v from ctx where k = 'today'), (select v from ctx where k = 'week'))) ->> 'ok') = 'true');
select pg_temp.ok('a week that is not this week is refused',
  pg_temp.call(format($q$select public.worker_stand_report(repeat('b', 32), %L::date, array['remember'], null, null, null, null, null, %L::date - 7, array['g2'])$q$,
    (select v from ctx where k = 'today'), (select v from ctx where k = 'week'))) ->> 'error' = 'bad_week');
insert into ctx select 'again', pg_temp.call(format($q$select public.worker_stand_report(repeat('a', 32), %L::date, array['choose'], 'solved', 1, 0, 'best-final', 'm_2', null, null)$q$, (select v from ctx where k = 'today')))::text;
select pg_temp.ok('slots only grow', ((select v::jsonb from ctx where k = 'again') -> 'slots') = '["choose", "remember"]'::jsonb);
select pg_temp.ok('a second blind-cow report cannot improve the first, and the first vote stands',
  (select bc_hints from public.worker_stand_day where member = (select v from ctx where k = 'hashA')) = 2
  and (select debate_pick from public.worker_stand_day where member = (select v from ctx where k = 'hashA')) = 'm_1');
insert into ctx select 'bad', pg_temp.call(format($q$select public.worker_stand_report(repeat('c', 32), %L::date, array['remember'], 'solved', 99, 0, 'Bad Id!', 'x', null, null)$q$, (select v from ctx where k = 'today')))::text;
select pg_temp.ok('a malformed blind cow or vote is ignored, not stored',
  ((select v::jsonb from ctx where k = 'bad') ->> 'ok') = 'true'
  and (select bc_status is null and debate_id is null from public.worker_stand_day where member = public.worker_stand_me(repeat('c', 32))));

-- 4. the stand home: the blind cow and the tally only for those who played/voted
insert into ctx select 'homeC', pg_temp.call(format($q$select public.worker_stand_home(repeat('c', 32), %L, 'best-final', %L::date, array['g2', 'g10', 'g3', 'g4', 'g8'])$q$,
  (select v from ctx where k = 'code'), (select v from ctx where k = 'week')))::text;
select pg_temp.ok('C has not played the blind cow: a count and nothing else',
  (select v::jsonb from ctx where k = 'homeC') -> 'blindCow' = '{"mine": false, "finished": 2}'::jsonb);
select pg_temp.ok('C has not voted: the number of voters and no tally',
  (select v::jsonb from ctx where k = 'homeC') -> 'debate' = '{"mine": false, "voters": 2}'::jsonb);
insert into ctx select 'homeA', pg_temp.call(format($q$select public.worker_stand_home(repeat('a', 32), %L, 'best-final', %L::date, array['g2', 'g10', 'g3', 'g4', 'g8'])$q$,
  (select v from ctx where k = 'code'), (select v from ctx where k = 'week')))::text;
select pg_temp.ok('A sees the group story from real rows',
  (select v::jsonb from ctx where k = 'homeA') -> 'today' = '{"all3": 1, "played": 3, "youPlayed": true}'::jsonb
  and ((select v::jsonb from ctx where k = 'homeA') ->> 'members') = '3');
select pg_temp.ok('A sees the blind cow: 2 solved, 1 before clue 4, A first',
  ((select v::jsonb from ctx where k = 'homeA') -> 'blindCow' ->> 'solved') = '2'
  and ((select v::jsonb from ctx where k = 'homeA') -> 'blindCow' ->> 'early') = '1'
  and ((select v::jsonb from ctx where k = 'homeA') -> 'blindCow' -> 'ranking' -> 0) = '{"no": 1, "you": true, "nick": "אבי", "hints": 2, "wrong": 0}'::jsonb);
select pg_temp.ok('A sees the tally: both on the same pick',
  ((select v::jsonb from ctx where k = 'homeA') -> 'debate') = '{"mine": true, "tally": [{"n": 2, "pick": "m_1"}], "yours": "m_1", "voters": 2}'::jsonb);
select pg_temp.ok('the week counts stations and the week players',
  ((select v::jsonb from ctx where k = 'homeA') -> 'week' -> 'stations') = '{"g2": 2, "g3": 0, "g4": 0, "g8": 0, "g10": 1}'::jsonb
  and ((select v::jsonb from ctx where k = 'homeA') -> 'week' ->> 'players') = '3'
  and ((select v::jsonb from ctx where k = 'homeA') -> 'week' ->> 'solved') = '2');
select pg_temp.ok('what the stand remembers: an earlier debate, agreed by both voters',
  (pg_temp.call(format($q$select public.worker_stand_home(repeat('a', 32), %L, 'another-day', null, null)$q$, (select v from ctx where k = 'code'))) -> 'remember' -> 'debates' -> 0)
    = '{"picks": [{"n": 2, "pick": "m_1"}], "debate": "best-final", "voters": 2}'::jsonb);
select pg_temp.ok('no hash, key or member id leaves the home',
  (select v from ctx where k = 'homeA') !~ '[0-9a-f]{64}' and (select v from ctx where k = 'homeA') !~ '"member"');

-- 5. שלח ליציע: a run link and a line, never a message
select pg_temp.ok('A posts a run to the stand',
  (pg_temp.call(format($q$select public.worker_stand_post(repeat('a', 32), %L, 2, '/c/Ab3_x', '9 מתוך 12')$q$, (select v from ctx where k = 'code'))) ->> 'ok') = 'true');
select pg_temp.ok('an outside link is refused',
  pg_temp.call(format($q$select public.worker_stand_post(repeat('a', 32), %L, 2, 'https://evil.example/x', 'x')$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'bad_post'
  and pg_temp.call(format($q$select public.worker_stand_post(repeat('a', 32), %L, 2, '//evil.example', 'x')$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'bad_post');
select pg_temp.ok('a message dressed as a headline is refused',
  pg_temp.call(format($q$select public.worker_stand_post(repeat('a', 32), %L, 2, '/trivia', repeat('א', 49))$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'bad_post'
  and pg_temp.call(format($q$select public.worker_stand_post(repeat('a', 32), %L, 2, '/trivia', E'שורה\nשנייה')$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'bad_post'
  and pg_temp.call(format($q$select public.worker_stand_post(repeat('a', 32), %L, 2, '/trivia', 'me@x.com')$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'bad_post'
  and pg_temp.call(format($q$select public.worker_stand_post(repeat('a', 32), %L, 14, '/trivia', 'x')$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'bad_post');
select pg_temp.ok('a guest cannot post into the stand',
  pg_temp.call(format($q$select public.worker_stand_post(repeat('d', 32), %L, 2, '/trivia', 'x')$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'not_member');
select pg_temp.ok('B posts the same run',
  (pg_temp.call(format($q$select public.worker_stand_post(repeat('b', 32), %L, 2, '/c/Ab3_x', '7 מתוך 12')$q$, (select v from ctx where k = 'code'))) ->> 'ok') = 'true');
insert into ctx select 'homeA2', pg_temp.call(format($q$select public.worker_stand_home(repeat('a', 32), %L, 'best-final', %L::date, array['g2'])$q$,
  (select v from ctx where k = 'code'), (select v from ctx where k = 'week')))::text;
select pg_temp.ok('the feed carries both, newest first, by public number only',
  jsonb_array_length((select v::jsonb from ctx where k = 'homeA2') -> 'feed') = 2
  and ((select v::jsonb from ctx where k = 'homeA2') -> 'feed' -> 0 ->> 'no') = '2'
  and ((select v::jsonb from ctx where k = 'homeA2') -> 'feed' -> 1 ->> 'mine') = 'true');
select pg_temp.ok('A and B: relationship facts, no win-loss column',
  ((select v::jsonb from ctx where k = 'homeA2') -> 'pairs' -> 0) @> '{"no": 2, "sameRuns": 1, "bcBoth": 1, "youEarlier": 1, "theyEarlier": 0, "debatesAgree": 1}'::jsonb
  and (select v from ctx where k = 'homeA2') !~ '"(wins|losses|won|lost)"');
select pg_temp.ok('mine: A is in one stand, and two others played today',
  (pg_temp.call($q$select public.worker_stand_mine(repeat('a', 32))$q$) -> 'stands' -> 0 ->> 'othersToday') = '2');

-- 6. leaving: the member, their posts, and the last one out closes the stand
select pg_temp.ok('B leaves', (pg_temp.call(format($q$select public.worker_stand_leave(repeat('b', 32), %L)$q$, (select v from ctx where k = 'code'))) ->> 'ok') = 'true');
select pg_temp.ok('B no longer opens the stand',
  pg_temp.call(format($q$select public.worker_stand_home(repeat('b', 32), %L, null, null, null)$q$, (select v from ctx where k = 'code'))) ->> 'error' = 'not_member');
select pg_temp.ok('B''s post went with B', (select count(*) from public.worker_stand_post) = 1);
select pg_temp.ok('B rejoining gets a new number, not the old one',
  (pg_temp.call(format($q$select public.worker_stand_join(repeat('b', 32), %L)$q$, (select v from ctx where k = 'code'))) ->> 'no') = '4');
select pg_temp.ok('A leaves', (pg_temp.call(format($q$select public.worker_stand_leave(repeat('a', 32), %L)$q$, (select v from ctx where k = 'code'))) ->> 'ok') = 'true');
select pg_temp.ok('B leaves again', (pg_temp.call(format($q$select public.worker_stand_leave(repeat('b', 32), %L)$q$, (select v from ctx where k = 'code'))) ->> 'ok') = 'true');
select pg_temp.ok('the stand stays while C is in it', exists (select 1 from public.worker_stand));
select pg_temp.ok('C leaves', (pg_temp.call(format($q$select public.worker_stand_leave(repeat('c', 32), %L)$q$, (select v from ctx where k = 'code'))) ->> 'ok') = 'true');
select pg_temp.ok('everybody out closes the stand and its feed',
  not exists (select 1 from public.worker_stand) and not exists (select 1 from public.worker_stand_post));

-- 7. flooding: five stands a day per device, then a refusal as a value
do $$
declare v jsonb; n int := 0;
begin
  for i in 1..7 loop
    v := pg_temp.call($q$select public.worker_stand_create(repeat('e', 32), 'יציע')$q$);
    exit when v ->> 'error' = 'slow_down';
    n := n + 1;
  end loop;
  if n <> 5 or v ->> 'error' is distinct from 'slow_down' then raise exception 'FAIL create limit: % then %', n, v; end if;
  raise notice 'PASS five stands a day per device, then slow_down';
end $$;
