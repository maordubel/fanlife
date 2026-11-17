-- Applied to Football Master on 17.11.2026.
-- Broken Collective's own sales through FAN LIFE's Stripe (owner, 17.11.2026): tips to keep the writing going, and the
-- paperback printed and posted by Lulu. One row per checkout. RLS on, no policies: only the server (service key) reads or
-- writes. Small by nature; an unpaid row leaves after two days, paid rows stay (they are the sales record).
create table if not exists public.worker_book_orders (
  id             text primary key check (id ~ '^bk_[A-Za-z0-9_-]{6,20}$'),
  kind           text not null check (kind in ('tip','paperback','tee','cap')),
  lang           text not null check (lang in ('he','en')),
  region         text check (region in ('il','eu','na','world')),
  ship           text check (ship in ('standard','express')),
  variant        text,
  amount_cents   integer not null check (amount_cents > 0),
  currency       text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
  status         text not null default 'open'
                 check (status in ('open','paid','printing','shipped','done','failed','refunded','expired','canceled')),
  email          text,
  stripe_session text unique,
  stripe_payment text,
  lulu_job       bigint unique,
  printify_order text unique,
  lulu_status    text,
  lulu_cost      text,
  tracking       jsonb,
  error          text,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  shipped_at     timestamptz
);
alter table public.worker_book_orders enable row level security;
revoke all on public.worker_book_orders from anon, authenticated;
create index if not exists worker_book_orders_status_created on public.worker_book_orders (status, created_at);

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('book:orders-sweep','marketing:book-orders-sweep');
    perform cron.schedule('marketing:book-orders-sweep', '37 3 * * *',
      $q$delete from public.worker_book_orders where status in ('open','expired') and created_at < now() - interval '2 days'$q$);
  end if;
end $$;
