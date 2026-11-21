create function public.fanlife_registration_counts(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', count(*),
    'recent', count(*) filter (
      where created_at >= p_from::timestamp at time zone 'Europe/Athens'
        and created_at < (p_to + 1)::timestamp at time zone 'Europe/Athens'
    )
  )
  from auth.users
  where is_anonymous is not true and deleted_at is null;
$$;

revoke all on function public.fanlife_registration_counts(date,date) from public, anon, authenticated;
grant execute on function public.fanlife_registration_counts(date,date) to service_role;
