\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- Hub ballot (19.10.2026): no table access for anyone, one vote per account / per device, guests apart, only totals out.
create or replace function pg_temp.as_user(p_role text, p_sub text, p_anon boolean, p_sql text) returns jsonb
language plpgsql as $$
declare v jsonb;
begin
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  perform set_config('request.jwt.claims', case when p_sub is null then '' else json_build_object('sub', p_sub, 'is_anonymous', p_anon)::text end, true);
  execute p_sql into v;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  return v;
exception when others then
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  return jsonb_build_object('ok', false, 'error', 'EXC: ' || sqlerrm);
end $$;
create or replace function pg_temp.ok(p_label text, p_cond boolean, p_detail jsonb default null) returns text
language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FAIL %: %', p_label, p_detail; end if;
  return 'PASS ' || p_label;
end $$;

delete from public.worker_hub_vote;

do $$
declare r text; v jsonb;
begin
  foreach r in array array['anon','authenticated'] loop
    foreach v in array array[
      pg_temp.as_user(r, '11111111-1111-1111-1111-111111111111', false, $q$select to_jsonb(count(*)) from public.worker_hub_vote$q$),
      pg_temp.as_user(r, '11111111-1111-1111-1111-111111111111', false, $q$with d as (delete from public.worker_hub_vote returning 1) select to_jsonb(count(*)) from d$q$)] loop
      if coalesce(v ->> 'error', '') not like 'EXC: permission denied%' then raise exception 'FAIL % reached worker_hub_vote: %', r, v; end if;
    end loop;
  end loop;
  raise notice 'PASS no table access for anon/authenticated';
end $$;

-- a guest: one vote per device, changing the mind moves it
select pg_temp.ok('guest votes', pg_temp.as_user('anon', null, false, $q$select public.worker_hub_vote_cast('next-club','paok','device-aaaaaaaa')$q$) ->> 'kind' = 'guest');
do $$ begin perform pg_temp.as_user('anon', null, false, $q$select public.worker_hub_vote_cast('next-club','celtic','device-aaaaaaaa')$q$); end $$;
select pg_temp.ok('same device votes again: still one row, moved', (select count(*) from public.worker_hub_vote) = 1 and (select club_id from public.worker_hub_vote) = 'celtic');
select pg_temp.ok('guest without a device is refused', pg_temp.as_user('anon', null, false, $q$select public.worker_hub_vote_cast('next-club','paok',null)$q$) ->> 'error' = 'device');
select pg_temp.ok('a bad club is refused', pg_temp.as_user('anon', null, false, $q$select public.worker_hub_vote_cast('next-club','Not A Club!','device-bbbbbbbb')$q$) ->> 'error' = 'club');
select pg_temp.ok('a short device id is refused', pg_temp.as_user('anon', null, false, $q$select public.worker_hub_vote_cast('next-club','paok','short')$q$) ->> 'error' = 'device');

-- an anonymous Supabase session is a guest, not an account
select pg_temp.ok('anonymous session counts as guest', pg_temp.as_user('authenticated', '22222222-2222-2222-2222-222222222222', true, $q$select public.worker_hub_vote_cast('next-club','paok','device-bbbbbbbb')$q$) ->> 'kind' = 'guest');

-- a signed-in person: one vote per account, from any device; replaces the guest vote of the device they used
select pg_temp.ok('account votes', pg_temp.as_user('authenticated', '33333333-3333-3333-3333-333333333333', false, $q$select public.worker_hub_vote_cast('next-club','paok','device-aaaaaaaa')$q$) ->> 'kind' = 'account');
select pg_temp.ok('their old guest vote on that device is gone', (select count(*) from public.worker_hub_vote where kind='guest' and club_id='celtic') = 0);
do $$ begin perform pg_temp.as_user('authenticated', '33333333-3333-3333-3333-333333333333', false, $q$select public.worker_hub_vote_cast('next-club','olympiacos','device-cccccccc')$q$); end $$;
select pg_temp.ok('account on a second device is still one vote', (select count(*) from public.worker_hub_vote where kind='account') = 1);
select pg_temp.ok('mine reads the account vote on any device', pg_temp.as_user('authenticated', '33333333-3333-3333-3333-333333333333', false, $q$select public.worker_hub_vote_mine('next-club','device-zzzzzzzz')$q$) ->> 'club' = 'olympiacos');
select pg_temp.ok('mine reads a guest vote by device', pg_temp.as_user('anon', null, false, $q$select public.worker_hub_vote_mine('next-club','device-bbbbbbbb')$q$) ->> 'club' = 'paok');

-- another ballot is another count
do $$ begin perform pg_temp.as_user('anon', null, false, $q$select public.worker_hub_vote_cast('other-ballot','paok','device-aaaaaaaa')$q$); end $$;
select pg_temp.ok('ballots are separate', (select count(*) from public.worker_hub_vote where ballot='next-club') = 2);

-- nothing identifies a voter in the table or in the tally
select pg_temp.ok('no raw uid or device id is stored', not exists (
  select 1 from public.worker_hub_vote where voter_hash like '%3333%' or voter_hash like '%device%' or coalesce(device_hash,'') like '%device%'));
select pg_temp.ok('tally: accounts and guests apart', (
  select jsonb_agg(to_jsonb(t) order by t.club_id) from public.worker_hub_vote_tally('next-club') t)
  = '[{"club_id":"olympiacos","account_votes":1,"guest_votes":0},{"club_id":"paok","account_votes":0,"guest_votes":1}]'::jsonb);
select pg_temp.ok('anon can read the tally', jsonb_typeof(pg_temp.as_user('anon', null, false, $q$select to_jsonb(count(*)) from public.worker_hub_vote_tally('next-club')$q$)) = 'number');
select pg_temp.ok('one device cannot hold 21 ballots', (
  select count(*) from (select pg_temp.as_user('anon', null, false, format($q$select public.worker_hub_vote_cast(%L,'paok','device-dddddddd')$q$, 'b' || g)) r from generate_series(1,25) g) s
  where r ->> 'error' = 'too_many') = 5);
