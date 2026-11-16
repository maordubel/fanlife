-- FAN LIFE's own sales through Stripe (owner, 16.11.2026: "our own products — the video, the personal file — with our Stripe").
-- One row per order. RLS is on with no policies: only the server, with the service key, reads or writes it; the buyer reaches his
-- order through a secret token whose hash is kept here. Small by nature (one row per purchase); unpaid rows leave after two days.
create table if not exists public.worker_pay_orders (
  id             text primary key check (id ~ '^po_[A-Za-z0-9_-]{6,20}$'),
  kind           text not null check (kind in ('print-file','film')),
  recipe         jsonb not null,
  amount_cents   integer not null check (amount_cents > 0),
  currency       text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
  status         text not null default 'open' check (status in ('open','paid','fulfilled','failed','refunded','expired')),
  email          text,
  stripe_session text unique,
  stripe_payment text,
  token_hash     text not null,
  result         jsonb,
  error          text,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  fulfilled_at   timestamptz
);
alter table public.worker_pay_orders enable row level security;
revoke all on public.worker_pay_orders from anon, authenticated;
create index if not exists worker_pay_orders_status_created on public.worker_pay_orders (status, created_at);

-- retention: an order nobody paid (open or expired) is gone after two days; paid orders stay (they are the sales record)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'marketing:pay-orders-sweep';
    perform cron.schedule('marketing:pay-orders-sweep', '23 3 * * *',
      $q$delete from public.worker_pay_orders where status in ('open','expired') and created_at < now() - interval '2 days'$q$);
  end if;
end $$;
