-- =====================================================================
-- ONE CLOSET, TWO APPS — a shirt built in THE WORKER's game becomes a closet item marked "built in the game".
-- Everything starts with worker_ (shared Supabase project with DUBID — rule 89); nothing touches auth.
-- Runs AFTER 20261009150000_worker_circles_wave3.sql. Idempotent: the verify script runs it twice.
--
--  1. worker_collector_item.origin — 'owned' (a real copy) or 'game' (assembled in a game). A game shirt is
--     shown in the closet with its tag, but the TABLE refuses to let it be offered for sale or trade until
--     its owner confirms they own a real one (worker_collector_confirm_owned).
--  2. worker_collector_have_game(slug, kit) — what the games call when a shirt is assembled. Never creates
--     a second copy, never overrides a real one, never removes the "wanted" mark (a built shirt is not a real shirt).
--  3. worker_game_items_mine() — which of my items are game shirts (the closet draws the tag from it).
--  4. worker_shirt_signals — public "have" counts only real copies; "youHave" still includes a game shirt.
-- =====================================================================

alter table public.worker_collector_item add column if not exists origin text not null default 'owned';

do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_item_origin_ok') then
    alter table public.worker_collector_item add constraint worker_collector_item_origin_ok
      check (origin in ('owned', 'game'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'worker_collector_item_game_not_offered') then
    alter table public.worker_collector_item add constraint worker_collector_item_game_not_offered
      check (not (origin = 'game' and (for_sale or for_trade)));
  end if;
end
$c$;

create or replace function public.worker_collector_have_game(p_slug text, p_kit text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_item public.worker_collector_item;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not public.worker_slug_ok(p_slug) then return public.worker_fail('bad_slug'); end if;
  if not public.worker_kit_ok(p_kit) then return public.worker_fail('bad_kit'); end if;
  perform public.worker_collector_touch(v_me);
  select * into v_item from public.worker_collector_item
    where user_id = v_me and archive_slug = p_slug and state in ('held', 'reserved', 'suspended')
    order by created_at limit 1;
  if found then
    return jsonb_build_object('ok', true, 'created', false, 'item', public.worker_item_owner(v_item));
  end if;
  if (select count(*) from public.worker_collector_item where user_id = v_me and state <> 'removed') >= 600 then
    return public.worker_fail('closet_full');
  end if;
  if not public.worker_rate_ok(v_me, 'have', 200, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  insert into public.worker_collector_item (user_id, archive_slug, kit_id, origin) values (v_me, p_slug, p_kit, 'game')
    returning * into v_item;
  return jsonb_build_object('ok', true, 'created', true, 'item', public.worker_item_owner(v_item));
end $$;

create or replace function public.worker_collector_confirm_owned(p_item uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  update public.worker_collector_item set origin = 'owned' where id = p_item and user_id = v_me and state in ('held', 'suspended');
  if not found then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.worker_game_items_mine() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'items', coalesce(jsonb_agg(i.id order by i.created_at), '[]'::jsonb))
    from public.worker_collector_item i
   where i.user_id = public.worker_market_uid() and i.origin = 'game' and i.state in ('held', 'reserved', 'suspended')
$$;

create or replace function public.worker_shirt_signals(p_slugs text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  with s as (
    select distinct slug from unnest(coalesce(p_slugs, '{}'::text[])) as slug
    where public.worker_slug_ok(slug)
    limit 240
  )
  select coalesce(jsonb_object_agg(s.slug, jsonb_build_object(
    'have', (select count(distinct i.user_id) from public.worker_collector_item i
              where i.archive_slug = s.slug and i.state in ('held', 'reserved') and i.origin = 'owned'),
    'want', (select count(*) from public.worker_collector_want w where w.archive_slug = s.slug),
    'forTrade', (select count(*) from public.worker_collector_item i
                  where i.archive_slug = s.slug and i.state = 'held' and i.for_trade),
    'forSale', (select count(*) from public.worker_collector_item i
                 where i.archive_slug = s.slug and i.state = 'held' and i.for_sale),
    'live', (select count(*) from public.worker_auction_lot l join public.worker_collector_item i on i.id = l.item_id
              where i.archive_slug = s.slug and l.status = 'scheduled' and l.ends_at > now()),
    'youHave', exists (select 1 from public.worker_collector_item i
                        where i.user_id = auth.uid() and i.archive_slug = s.slug and i.state in ('held', 'reserved', 'suspended')),
    'youWant', exists (select 1 from public.worker_collector_want w
                        where w.user_id = auth.uid() and w.archive_slug = s.slug)
  )), '{}'::jsonb)
  from s
$$;

do $grants$
declare
  v_fn record;
  v_public text[] := array['worker_shirt_signals'];
  v_member text[] := array['worker_collector_have_game', 'worker_collector_confirm_owned', 'worker_game_items_mine'];
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any(v_public || v_member)
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = any(v_public) then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    else
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
end
$grants$;
