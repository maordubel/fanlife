create function public.worker_marketing_queue_shop(p_product text, p_post jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('shop-promo:' || p_product, 0));

  select id into post_id
  from marketing.posts
  where main->'kit'->'data'->>'product' = p_product
    and main->'kit'->>'t' = 'SHOP'
    and status in ('pending', 'sending', 'sent')
    and send_at >= now() - interval '1 hour'
  order by send_at desc
  limit 1;

  if post_id is null then
    insert into marketing.posts(day, send_at, format, kind, main)
    values (0, clock_timestamp(), 'post', 'fixed', p_post)
    returning id into post_id;
  end if;

  return post_id;
end;
$$;

revoke all on function public.worker_marketing_queue_shop(text,jsonb) from public, anon, authenticated;
grant execute on function public.worker_marketing_queue_shop(text,jsonb) to service_role;
