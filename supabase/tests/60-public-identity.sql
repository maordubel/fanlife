\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- הזהות הציבורית (28.9.2026, ONE RED WORLD §35) — נבדק כמו שתוקפים: העמודות לא נכתבות ישירות,
-- anon לא מגיע לשום דבר, התווית לא נושאת id/מייל/שם חשבון, המספר קפוא, העריכה החדשה מנצחת.
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

-- two accounts, as the stub's auth.users knows them
insert into auth.users (id, email) values
  ('61111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('62222222-2222-2222-2222-222222222222', 'b@example.test')
on conflict (id) do nothing;
delete from public.worker_profile where id in ('61111111-1111-1111-1111-111111111111', '62222222-2222-2222-2222-222222222222');

-- 1. anon calls nothing
select pg_temp.ok('anon cannot read its identity',
  (pg_temp.as_user('anon', '', $q$select public.worker_public_identity_me()$q$) ->> 'error') like 'EXC:%');
select pg_temp.ok('anon cannot set an identity',
  (pg_temp.as_user('anon', '', $q$select public.worker_public_identity_set('nickname', 'x', now())$q$) ->> 'error') like 'EXC:%');
select pg_temp.ok('nobody may call the label directly (anon)',
  (pg_temp.as_user('anon', '', $q$select public.worker_public_label('61111111-1111-1111-1111-111111111111')$q$) ->> 'error') like 'EXC:%');
select pg_temp.ok('nobody may call the label directly (authenticated)',
  (pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111', $q$select public.worker_public_label('62222222-2222-2222-2222-222222222222')$q$) ->> 'error') like 'EXC:%');

-- 2. signed out through the RPC is a value, not a throw
select pg_temp.ok('signed out is a value',
  pg_temp.as_user('authenticated', '', $q$select public.worker_public_identity_me()$q$) ->> 'error' = 'signed_out');

-- 3. first read: anonymous by default, a number is issued, the label is "אדום #N"
select pg_temp.ok('default is anonymous with a number',
  (select (v ->> 'mode') = 'anonymous' and (v ->> 'no') is not null and (v ->> 'label') = 'אדום #' || (v ->> 'no')
     from (select pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111', $q$select public.worker_public_identity_me()$q$) v) x),
  pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111', $q$select public.worker_public_identity_me()$q$));
select pg_temp.ok('a second read keeps the same number',
  (select count(distinct supporter_no) = 1 and bool_and(supporter_no is not null) from public.worker_profile
    where id = '61111111-1111-1111-1111-111111111111')
  and (pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111', $q$select public.worker_public_identity_me()$q$) ->> 'no')::int
      = (select supporter_no from public.worker_profile where id = '61111111-1111-1111-1111-111111111111'));
select pg_temp.ok('two people, two numbers',
  (pg_temp.as_user('authenticated', '62222222-2222-2222-2222-222222222222', $q$select public.worker_public_identity_me()$q$) ->> 'no')
  is distinct from (select supporter_no::text from public.worker_profile where id = '61111111-1111-1111-1111-111111111111'));

-- 4. the columns are not writable directly
select pg_temp.ok('public_mode not directly writable',
  (pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$with u as (update public.worker_profile set public_mode = 'nickname' returning 1) select to_jsonb(count(*)) from u$q$) ->> 'error') like 'EXC:%');
select pg_temp.ok('supporter_no not directly writable',
  (pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$with u as (update public.worker_profile set supporter_no = 1 returning 1) select to_jsonb(count(*)) from u$q$) ->> 'error') like 'EXC:%');

-- 5. nickname: set, cleaned, required when chosen, shown by the label
select pg_temp.ok('nickname mode needs a nickname',
  pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$select public.worker_public_identity_set('nickname', '   ', '2026-09-28T10:00Z')$q$) ->> 'error' = 'nickname_required');
select pg_temp.ok('an unknown mode is refused',
  pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$select public.worker_public_identity_set('public', 'x', '2026-09-28T10:00Z')$q$) ->> 'error' = 'mode');
select pg_temp.ok('nickname set and trimmed',
  pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$select public.worker_public_identity_set('nickname', '  שער   5  ', '2026-09-28T10:00Z')$q$) ->> 'label' = 'שער 5');
select pg_temp.ok('the label (for a stand) is the nickname',
  public.worker_public_label('61111111-1111-1111-1111-111111111111') ->> 'label' = 'שער 5');

-- 6. the older edit loses, the newer wins, a future clock is clamped
select pg_temp.ok('an older edit does not overwrite',
  pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$select public.worker_public_identity_set('anonymous', null, '2026-09-27T10:00Z')$q$) ->> 'mode' = 'nickname');
select pg_temp.ok('a newer edit goes anonymous again',
  pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$select public.worker_public_identity_set('anonymous', 'שער 5', '2026-09-28T11:00Z')$q$) ->> 'label' like 'אדום #%');
select pg_temp.ok('the nickname is kept while anonymous, but the label hides it',
  (select public_nickname = 'שער 5' from public.worker_profile where id = '61111111-1111-1111-1111-111111111111')
  and public.worker_public_label('61111111-1111-1111-1111-111111111111') ->> 'label' like 'אדום #%');
select pg_temp.ok('a future clock is clamped to now',
  (pg_temp.as_user('authenticated', '61111111-1111-1111-1111-111111111111',
    $q$select public.worker_public_identity_set('anonymous', null, '2099-01-01T00:00Z')$q$) ->> 'editedAt')::timestamptz <= now());

-- 7. the number is frozen even for the owner of the database
do $$ begin
  begin
    update public.worker_profile set supporter_no = supporter_no + 1000 where id = '61111111-1111-1111-1111-111111111111';
    raise exception 'FAIL supporter_no moved';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select 'PASS supporter_no is frozen';

-- 8. the label never carries an id, an email or the account's display name
update public.worker_profile set display_name = 'Real Name' where id = '62222222-2222-2222-2222-222222222222';
select pg_temp.ok('the label has only label/no/mode',
  (select array_agg(k order by k) from jsonb_object_keys(public.worker_public_label('62222222-2222-2222-2222-222222222222')) k)
    = array['label', 'mode', 'no']);
select pg_temp.ok('the label never says the email or the account name',
  public.worker_public_label('62222222-2222-2222-2222-222222222222')::text not like '%example.test%'
  and public.worker_public_label('62222222-2222-2222-2222-222222222222')::text not like '%Real Name%'
  and public.worker_public_label('62222222-2222-2222-2222-222222222222')::text not like '%62222222%');
select pg_temp.ok('an unknown person is plain אדום',
  public.worker_public_label('00000000-0000-0000-0000-00000000dead') ->> 'label' = 'אדום');

-- 9. nothing on auth
select pg_temp.ok('no trigger on auth',
  (select count(*) = 0 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and not t.tgisinternal));
