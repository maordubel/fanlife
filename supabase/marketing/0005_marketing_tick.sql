-- FAN LIFE social plan — pg_cron ticks the site (see supabase/migrations/20261026090000_worker_marketing_tick.sql).

create table if not exists marketing.ticks (
  nonce   uuid primary key default gen_random_uuid(),
  made_at timestamptz not null default now(),
  used_at timestamptz,
  probe   boolean not null default false
);
revoke all on marketing.ticks from public, anon, authenticated;
alter table marketing.ticks enable row level security;

-- The tick. Idle minutes cost one insert and nothing leaves the database.
create or replace function marketing.tick(p_probe boolean default false)
returns bigint language plpgsql security definer set search_path = '' as $$
declare n uuid;
begin
  delete from marketing.ticks where made_at < now() - interval '1 day';
  if not p_probe and not exists (select 1 from marketing.posts p where p.status = 'pending' and p.send_at <= now()) then
    return null;
  end if;
  insert into marketing.ticks (probe) values (p_probe) returning nonce into n;
  return net.http_post(
    url := 'https://fanlife.dubelteam.com/api/marketing/tick',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('nonce', n),
    timeout_milliseconds := 60000);
end $$;
revoke all on function marketing.tick(boolean) from public, anon, authenticated;

select cron.schedule('marketing:tick', '*/5 * * * *', $c$select marketing.tick()$c$)
where not exists (select 1 from cron.job where jobname = 'marketing:tick');
