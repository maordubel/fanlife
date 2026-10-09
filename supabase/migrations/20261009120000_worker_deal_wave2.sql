-- FAN LIFE · shirt hub wave 2 — the deal itself.
-- Runs after 20261009090000. Every object starts with worker_ (rule 89); nothing touches auth.
-- Adds on top of offers/agreed/done that already exist:
--   · bundles  — a price for several of one seller's copies, either side can counter it
--   · handover — how the two of you will hand it over (meet / post), and "I've sent mine"
--   · feedback — one short word each, after a completed deal; only counts are public

alter table public.worker_collector_connection
  add column if not exists handover_method text check (handover_method is null or handover_method in ('meet', 'ship')),
  add column if not exists handover_note text check (handover_note is null or char_length(handover_note) <= 140),
  add column if not exists handover_at timestamptz,
  add column if not exists initiator_sent_at timestamptz,
  add column if not exists recipient_sent_at timestamptz;

create table if not exists public.worker_collector_feedback (
  connection_id uuid not null references public.worker_collector_connection(id) on delete cascade,
  author_id     uuid not null references public.worker_profile(id) on delete cascade,
  about_id      uuid not null references public.worker_profile(id) on delete cascade,
  rating        text not null check (rating in ('good', 'fine', 'bad')),
  note          text check (note is null or char_length(note) <= 140),
  created_at    timestamptz not null default now(),
  primary key (connection_id, author_id),
  constraint worker_collector_feedback_two check (author_id <> about_id)
);
create index if not exists worker_collector_feedback_about_idx on public.worker_collector_feedback (about_id);
alter table public.worker_collector_feedback enable row level security;
revoke all on public.worker_collector_feedback from public, anon, authenticated;

/* A price for several of the seller's copies. Either side may call it: the buyer proposes, the
   seller counters. The items are always the SELLER'S (the connection's recipient) and the
   connection's own item is always part of the bundle. */
create or replace function public.worker_bundle_offer(
  p_conn uuid, p_amount numeric, p_currency text, p_items uuid[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
  v_other uuid;
  v_offer uuid;
  v_all uuid[];
  v_slugs jsonb;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if coalesce(p_currency, 'EUR') not in ('ILS', 'EUR', 'USD') then return public.worker_fail('bad_currency'); end if;
  if p_amount is null or p_amount <= 0 or p_amount > 99999999 then return public.worker_fail('bad_amount'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn for update;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  if v_c.kind <> 'buy' or v_c.status not in ('requested', 'accepted', 'negotiating') then return public.worker_fail('closed'); end if;
  v_other := public.worker_connection_counterpart(v_c, v_me);
  if public.worker_blocked(v_me, v_other) then return public.worker_fail('closed'); end if;
  select array(select distinct x from unnest(coalesce(p_items, '{}'::uuid[]) || array[v_c.item_id]) x where x is not null) into v_all;
  if cardinality(v_all) < 2 or cardinality(v_all) > 6 then return public.worker_fail('bad_items'); end if;
  if (select count(*) from public.worker_collector_item
       where id = any(v_all) and user_id = v_c.recipient_id and state = 'held' and for_sale) <> cardinality(v_all) then
    return public.worker_fail('bad_items');
  end if;
  if not public.worker_rate_ok(v_me, 'offer', 30, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  update public.worker_collector_offer set status = 'superseded', responded_at = now()
   where connection_id = p_conn and sender_id = v_me and status = 'open';
  insert into public.worker_collector_offer (connection_id, sender_id, kind, amount, currency)
    values (p_conn, v_me, 'price', round(p_amount, 2), coalesce(p_currency, 'EUR'))
    returning id into v_offer;
  insert into public.worker_collector_offer_item (offer_id, item_id)
    select v_offer, x from unnest(v_all) x where x <> v_c.item_id;
  select coalesce(jsonb_agg(archive_slug), '[]'::jsonb) into v_slugs from public.worker_collector_item where id = any(v_all);
  insert into public.worker_collector_message (connection_id, sender_id, kind, meta)
    values (p_conn, v_me, 'offer', jsonb_build_object('offerId', v_offer, 'kind', 'price', 'bundle', true,
            'amount', round(p_amount, 2), 'currency', coalesce(p_currency, 'EUR'), 'items', v_slugs));
  update public.worker_collector_connection set status = 'negotiating', last_message_at = now() where id = p_conn;
  perform public.worker_notify(v_other, 'COLLECTOR_OFFER_RECEIVED',
    jsonb_build_object('connectionId', p_conn, 'offerId', v_offer, 'kind', 'price', 'bundle', true,
                       'amount', round(p_amount, 2), 'currency', coalesce(p_currency, 'EUR')),
    'offer:' || v_offer::text);
  return jsonb_build_object('ok', true, 'offerId', v_offer);
end $$;

/* The existing respond, with one change: a counter to a bundle stays a bundle. */
create or replace function public.worker_offer_respond(p_offer uuid, p_action text, p_amount numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_o public.worker_collector_offer;
  v_c public.worker_collector_connection;
  v_items uuid[];
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_action not in ('accept', 'decline', 'counter') then return public.worker_fail('bad_action'); end if;
  select * into v_o from public.worker_collector_offer where id = p_offer for update;
  if not found then return public.worker_fail('not_found'); end if;
  select * into v_c from public.worker_collector_connection where id = v_o.connection_id for update;
  if v_me not in (v_c.initiator_id, v_c.recipient_id) or v_o.sender_id = v_me then return public.worker_fail('not_found'); end if;
  if v_o.status <> 'open' or v_c.status not in ('requested', 'accepted', 'negotiating') then return public.worker_fail('closed'); end if;

  if p_action = 'accept' then
    if exists (select 1 from public.worker_collector_offer_item oi join public.worker_collector_item i on i.id = oi.item_id
                where oi.offer_id = p_offer and i.state <> 'held') then
      return public.worker_fail('items_gone');
    end if;
    if not exists (select 1 from public.worker_collector_item where id = v_c.item_id and state = 'held') then
      return public.worker_fail('items_gone');
    end if;
    update public.worker_collector_offer set status = 'accepted', responded_at = now() where id = p_offer;
    update public.worker_collector_connection set status = 'agreed' where id = v_c.id;
    update public.worker_collector_item set state = 'reserved'
     where id = v_c.item_id or id in (select item_id from public.worker_collector_offer_item where offer_id = p_offer);
    perform public.worker_system_message(v_c.id, 'offer_accepted', jsonb_build_object('offerId', p_offer));
    perform public.worker_notify(v_o.sender_id, 'COLLECTOR_OFFER_ACCEPTED',
      jsonb_build_object('connectionId', v_c.id, 'offerId', p_offer), 'accepted:' || p_offer::text);
    return jsonb_build_object('ok', true, 'status', 'agreed');
  elsif p_action = 'decline' then
    update public.worker_collector_offer set status = 'declined', responded_at = now() where id = p_offer;
    perform public.worker_system_message(v_c.id, 'offer_declined', jsonb_build_object('offerId', p_offer));
    perform public.worker_notify(v_o.sender_id, 'COLLECTOR_OFFER_DECLINED',
      jsonb_build_object('connectionId', v_c.id, 'offerId', p_offer), 'declined:' || p_offer::text);
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;
  -- counter
  if p_amount is null or p_amount <= 0 then return public.worker_fail('bad_amount'); end if;
  select array_agg(item_id) into v_items from public.worker_collector_offer_item where offer_id = p_offer;
  update public.worker_collector_offer set status = 'countered', responded_at = now() where id = p_offer;
  if v_o.kind = 'price' and v_items is not null then
    return public.worker_bundle_offer(v_c.id, p_amount, v_o.currency, v_items);
  end if;
  return public.worker_offer_make(v_c.id, 'price', p_amount, v_o.currency, null);
end $$;

/* How the two of you hand it over. Either side can set it while the deal is agreed; the other sees it. */
create or replace function public.worker_handover_set(p_conn uuid, p_method text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_method not in ('meet', 'ship') then return public.worker_fail('bad_method'); end if;
  if p_note is not null and char_length(p_note) > 140 then return public.worker_fail('bad_note'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn for update;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  if v_c.status <> 'agreed' then return public.worker_fail('bad_state'); end if;
  update public.worker_collector_connection
     set handover_method = p_method, handover_note = nullif(btrim(p_note), ''), handover_at = now()
   where id = p_conn;
  perform public.worker_system_message(p_conn, 'handover_set', jsonb_build_object('method', p_method));
  perform public.worker_notify(public.worker_connection_counterpart(v_c, v_me), 'COLLECTOR_MESSAGE',
    jsonb_build_object('connectionId', p_conn, 'event', 'handover'), 'handover:' || p_conn::text || ':' || p_method);
  return jsonb_build_object('ok', true, 'method', p_method);
end $$;

/* "I've handed over / posted my side." Idempotent, once per side. */
create or replace function public.worker_handover_sent(p_conn uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn for update;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  if v_c.status <> 'agreed' then return public.worker_fail('bad_state'); end if;
  if (v_me = v_c.initiator_id and v_c.initiator_sent_at is not null)
     or (v_me = v_c.recipient_id and v_c.recipient_sent_at is not null) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  update public.worker_collector_connection set
    initiator_sent_at = case when v_me = initiator_id then now() else initiator_sent_at end,
    recipient_sent_at = case when v_me = recipient_id then now() else recipient_sent_at end
  where id = p_conn;
  perform public.worker_system_message(p_conn, 'handover_sent', null);
  perform public.worker_notify(public.worker_connection_counterpart(v_c, v_me), 'COLLECTOR_MESSAGE',
    jsonb_build_object('connectionId', p_conn, 'event', 'sent'), 'sent:' || p_conn::text || ':' || v_me::text);
  return jsonb_build_object('ok', true);
end $$;

/* One word each after a completed deal. The note is read only by the person it is about. */
create or replace function public.worker_feedback_give(p_conn uuid, p_rating text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_rating not in ('good', 'fine', 'bad') then return public.worker_fail('bad_rating'); end if;
  if p_note is not null and char_length(p_note) > 140 then return public.worker_fail('bad_note'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  if v_c.status <> 'completed' then return public.worker_fail('bad_state'); end if;
  insert into public.worker_collector_feedback (connection_id, author_id, about_id, rating, note)
    values (p_conn, v_me, public.worker_connection_counterpart(v_c, v_me), p_rating, nullif(btrim(p_note), ''))
    on conflict (connection_id, author_id) do nothing;
  if not found then return public.worker_fail('already_given'); end if;
  return jsonb_build_object('ok', true);
end $$;

/* Everything the deal panels need, in one call. Participants only. */
create or replace function public.worker_deal_extras(p_conn uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
  v_mine boolean;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  v_mine := v_me = v_c.initiator_id;
  return jsonb_build_object('ok', true,
    'status', v_c.status, 'kind', v_c.kind,
    'role', case when v_mine then 'initiator' else 'recipient' end,
    'handover', case when v_c.handover_method is null then null else jsonb_build_object(
        'method', v_c.handover_method, 'note', v_c.handover_note, 'at', v_c.handover_at) end,
    'mySent', (case when v_mine then v_c.initiator_sent_at else v_c.recipient_sent_at end) is not null,
    'theirSent', (case when v_mine then v_c.recipient_sent_at else v_c.initiator_sent_at end) is not null,
    'feedbackGiven', exists (select 1 from public.worker_collector_feedback where connection_id = p_conn and author_id = v_me),
    'feedbackReceived', (select jsonb_build_object('rating', f.rating, 'note', f.note)
                           from public.worker_collector_feedback f where f.connection_id = p_conn and f.about_id = v_me),
    -- the seller's other open copies, for a bundle (the buyer's view; the seller sees the same list)
    'bundleItems', (select coalesce(jsonb_agg(public.worker_item_public(i) - 'seller' order by i.opened_at desc), '[]'::jsonb)
                      from public.worker_collector_item i
                     where i.user_id = v_c.recipient_id and i.state = 'held' and i.for_sale
                       and i.id is distinct from v_c.item_id)
  );
end $$;

/* Public: counts only — never a note, never who said it. */
create or replace function public.worker_feedback_summary(p_handle integer) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true,
    'good', count(*) filter (where f.rating = 'good'),
    'fine', count(*) filter (where f.rating = 'fine'),
    'bad',  count(*) filter (where f.rating = 'bad'))
  from public.worker_collector_feedback f
  join public.worker_collector_profile p on p.user_id = f.about_id
  where p.handle_no = p_handle
$$;

do $grants$
declare v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('worker_bundle_offer', 'worker_offer_respond', 'worker_handover_set',
       'worker_handover_sent', 'worker_feedback_give', 'worker_deal_extras', 'worker_feedback_summary')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.sig like 'worker_feedback_summary%' then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    else
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
end
$grants$;
