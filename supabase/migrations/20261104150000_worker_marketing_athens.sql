-- Marketing runs on Athens time (owner, 4.11.2026). Rewrites the live definitions of the four marketing functions that
-- named a time zone, in place: same body, 'Europe/Athens' instead of the old zone. Read live, never recreated from a
-- repo file (ecosystem-sync). Idempotent: a function that no longer names the old zone is left alone.
do $$
declare f record; def text;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.prokind = 'f'
      and (n.nspname, p.proname) in (('marketing','dispatch'),('marketing','render'),('public','worker_marketing_live_data'),('public','worker_marketing_today'))
      and p.prosrc like '%Asia/Jerusalem%'
  loop
    def := replace(pg_get_functiondef(f.oid), 'Asia/Jerusalem', 'Europe/Athens');
    execute def;
  end loop;
end $$;
