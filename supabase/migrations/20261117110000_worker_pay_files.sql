-- THE PAID FILE IS MADE ONCE, STORED, THEN HANDED OVER (17.11.2026, owner: "the email and the link must not go out before the
-- file is ready"). A private bucket for the made files (read only through five-minute signed links the server hands out), and a
-- minute cron that wakes the maker only while a paid file is owed — the buyer's own order page and the webhook wake it first.
-- Size: ~1.5 MB a file on the 1 GB storage of the free tier; the maker's sweep drops files after 120 days (re-drawn on demand).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pay-files', 'pay-files', false, 26214400, array['image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'marketing:pay-files-make';
    perform cron.schedule('marketing:pay-files-make', '* * * * *',
      $q$select net.http_post(url := 'https://fanlife.dubelteam.com/api/pay/prepare', body := '{}'::jsonb, timeout_milliseconds := 110000)
         where exists (select 1 from public.worker_pay_orders where status = 'paid' and kind = 'print-file')$q$);
    perform cron.unschedule(jobid) from cron.job where jobname = 'marketing:pay-files-drop';
    perform cron.schedule('marketing:pay-files-drop', '41 3 * * *',
      $q$select net.http_post(url := 'https://fanlife.dubelteam.com/api/pay/prepare?drop=1', body := '{}'::jsonb, timeout_milliseconds := 60000)$q$);
  end if;
end $$;
