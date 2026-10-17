/* worker_poll_cast — launch hardening (audit, 17.10.2026).
   The function accepted any text of any length from any anonymous caller, so one script could fill the table.
   Now: bounded lengths, a plain-id question, and a ceiling on how many different questions one device may hold.
   CREATE OR REPLACE keeps the existing grants. Safe to run more than once. Touches only worker_* objects (rule 89). */
create or replace function public.worker_poll_cast(
  p_device_id   text,
  p_question_id text,
  p_pick        text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_pick text := trim(coalesce(p_pick, ''));
begin
  if p_device_id is null or length(p_device_id) < 8 or length(p_device_id) > 64 then
    raise exception 'a vote needs a device id';
  end if;
  if p_question_id is null or p_question_id !~ '^[A-Za-z0-9:_./-]{1,80}$' then
    raise exception 'a vote needs a question';
  end if;
  if length(v_pick) = 0 or length(v_pick) > 120 then
    raise exception 'a vote needs a pick';
  end if;
  /* one device cannot hold an unbounded number of different questions */
  if not exists (select 1 from public.worker_poll_vote where device_id = p_device_id and question_id = p_question_id)
     and (select count(*) from public.worker_poll_vote where device_id = p_device_id) >= 400 then
    raise exception 'too many votes from this device';
  end if;
  insert into public.worker_poll_vote (device_id, question_id, pick, voted_at)
    values (p_device_id, p_question_id, v_pick, now())
    on conflict (device_id, question_id)
      do update set pick = excluded.pick, voted_at = now();
end $$;
