-- Broken Collective · the reader's journey (owner, 23.11.2026: "full automation for the whole purchase — pleasant, reliable
-- and fun", after a paid paperback reached the press without the reader hearing about it).
-- mails: the letter ledger, one key per letter ({"press":{"at":…,"id":…}} or {"press":{"at":…,"err":…,"n":2}}). A letter is
--        sent once; a failed one is tried again by the tick until it goes or has failed five times.
-- lulu_checked_at: when the tick last asked Lulu about the job itself (so a missed webhook never leaves an order behind).
alter table public.worker_book_orders add column if not exists mails jsonb not null default '{}'::jsonb;
alter table public.worker_book_orders add column if not exists lulu_checked_at timestamptz;

-- orders paid before the ledger existed already told the owner about themselves
update public.worker_book_orders set mails = mails || jsonb_build_object('sale', jsonb_build_object('at', now(), 'id', 'before-ledger'))
 where paid_at is not null and not (mails ? 'sale');

-- the tick: every 5 minutes the server sends stuck orders on, asks Lulu about printing jobs and sends any letter that is owed.
-- The door does only owed work and throttles itself, so it needs no secret (as marketing:pay-files-make).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'marketing:book-tick';
    perform cron.schedule('marketing:book-tick', '*/5 * * * *',
      $q$select net.http_post(url := 'https://fanlife.dubelteam.com/api/book/tick', body := '{}'::jsonb, timeout_milliseconds := 110000)
         where exists (select 1 from public.worker_book_orders where status in ('paid','printing','shipped','done') and created_at > now() - interval '60 days')$q$);
  end if;
end $$;
