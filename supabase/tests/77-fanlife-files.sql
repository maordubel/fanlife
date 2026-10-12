\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- FAN LIFE files (12.10.2026) — as an attacker: neither anon nor a signed-in user can read or write a single row; the server
-- (service_role) can, and a save conditioned on a stale etag changes nothing.
create or replace function pg_temp.try(p_role text, p_sql text) returns text language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  execute p_sql;
  execute 'reset role';
  return 'allowed';
exception when others then execute 'reset role'; return 'refused';
end $$;
create or replace function pg_temp.ok(p_label text, p_cond boolean) returns text language plpgsql as $$
begin if not coalesce(p_cond,false) then raise exception 'FAIL %', p_label; end if; return 'PASS ' || p_label; end $$;

delete from public.worker_fanlife_files where name like 'test/%';
select pg_temp.ok('anon cannot read',  pg_temp.try('anon', 'select count(*) from public.worker_fanlife_files') = 'refused');
select pg_temp.ok('anon cannot write', pg_temp.try('anon', $q$insert into public.worker_fanlife_files(name,body,etag) values ('test/a','x','e')$q$) = 'refused');
select pg_temp.ok('a signed-in user cannot read',  pg_temp.try('authenticated', 'select count(*) from public.worker_fanlife_files') = 'refused');
select pg_temp.ok('a signed-in user cannot write', pg_temp.try('authenticated', $q$update public.worker_fanlife_files set body='x'$q$) = 'refused');
select pg_temp.ok('the server can write', pg_temp.try('service_role', $q$insert into public.worker_fanlife_files(name,body,etag) values ('test/control.json','{"v":1}','"e1"')$q$) = 'allowed');
-- compare-and-swap: a save built on a stale etag matches no row
update public.worker_fanlife_files set body='{"v":2}', etag='"e2"' where name='test/control.json' and etag='"stale"';
select pg_temp.ok('a stale save changes nothing', (select body from public.worker_fanlife_files where name='test/control.json') = '{"v":1}');
update public.worker_fanlife_files set body='{"v":2}', etag='"e2"' where name='test/control.json' and etag='"e1"';
select pg_temp.ok('a save on the read etag lands', (select etag from public.worker_fanlife_files where name='test/control.json') = '"e2"');
select pg_temp.ok('a path cannot climb', pg_temp.try('service_role', $q$insert into public.worker_fanlife_files(name,body,etag) values ('../x','x','e')$q$) = 'refused');
delete from public.worker_fanlife_files where name like 'test/%';
