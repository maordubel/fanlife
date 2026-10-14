-- THE WORKER / FAN LIFE — managed listings (owner, 14.10.2026).
-- Real shirts whose owners the owner knows personally, listed under anonymous collector handles.
-- Whatever a buyer does about one of them (a request, a message, an offer) is ALSO sent to every
-- administrator, who passes it to the real owner by hand. Run AFTER 20260922120000_worker_collector_market.sql.
-- Rule 89: every object starts with worker_; nothing on auth except the five inert seller rows below
-- (no email, no password, no login — approved by the owner, 14.10.2026).

create table if not exists public.worker_market_managed (
  user_id uuid primary key references public.worker_profile(id) on delete cascade,
  note    text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);
alter table public.worker_market_managed enable row level security;
revoke all on public.worker_market_managed from anon, authenticated;

alter table public.worker_notification drop constraint if exists worker_notification_kind_check;
alter table public.worker_notification add constraint worker_notification_kind_check check (kind in (
  'COLLECTOR_WANT_MATCHED', 'COLLECTOR_ITEM_REQUESTED', 'COLLECTOR_REQUEST_ACCEPTED',
  'COLLECTOR_REQUEST_DECLINED', 'COLLECTOR_MESSAGE', 'COLLECTOR_OFFER_RECEIVED',
  'COLLECTOR_OFFER_ACCEPTED', 'COLLECTOR_OFFER_DECLINED', 'CONNECTION_COMPLETED',
  'CONNECTION_CANCELLED', 'AUCTION_SUBMITTED', 'AUCTION_APPROVED', 'AUCTION_REJECTED',
  'AUCTION_SCHEDULED', 'AUCTION_STARTED', 'AUCTION_OUTBID', 'AUCTION_ENDING',
  'AUCTION_WON', 'AUCTION_SOLD', 'AUCTION_UNSOLD', 'AUCTION_CANCELLED',
  'ITEM_SUSPENDED', 'REPORT_RECEIVED', 'MANAGED_ACTIVITY'));

/* Same as before, plus: a notification to a managed seller is copied to every administrator. */
create or replace function public.worker_notify(p_user uuid, p_kind text, p_payload jsonb, p_dedupe text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_handle integer;
begin
  if p_user is null or p_user = public.worker_market_uid() then return; end if;
  perform public.worker_touch_profile(p_user);
  insert into public.worker_notification (user_id, kind, payload, dedupe_key)
  values (p_user, p_kind, coalesce(p_payload, '{}'::jsonb), p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  if exists (select 1 from public.worker_market_managed where user_id = p_user) then
    select handle_no into v_handle from public.worker_collector_profile where user_id = p_user;
    insert into public.worker_notification (user_id, kind, payload, dedupe_key)
    select a.user_id, 'MANAGED_ACTIVITY',
           coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('event', p_kind, 'seller', v_handle),
           case when p_dedupe is null then null else left('managed:' || p_dedupe, 120) end
      from public.worker_admin a
     where a.user_id <> p_user
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;
end $$;

/* Five inert seller identities and their listings. Safe to run twice. */
do $seed$
declare
  r record;
  v_sql text;
begin
  for r in select * from (values
    ('7a1c0001-0000-4000-8000-000000000001'::uuid, 'stpauli--st-pauli-cof-k-19', 's', null::smallint, null::text,
       'St. Pauli third shirt, 2016/17 (Under Armour, congstar). Used, size S.', now() - interval '9 days'),
    ('7a1c0001-0000-4000-8000-000000000002'::uuid, 'celtic--celtic-cof-k-49', 'l', null::smallint, null::text,
       'Celtic home shirt, 2019/20 (New Balance, Dafabet — the yellow-logo sponsor). Used, size L.', now() - interval '6 days'),
    ('7a1c0001-0000-4000-8000-000000000003'::uuid, 'celtic--celtic-cof-k-27', 's', null::smallint, null::text,
       'Celtic home shirt, 2013/14 (Nike, Magners). Used, size S.', now() - interval '4 days'),
    ('7a1c0001-0000-4000-8000-000000000004'::uuid, 'aekathens--aek-athens-cof-k-45', null::text, null::smallint, null::text,
       'AEK Athens home shirt, 2022/23. Used, size not stated.', now() - interval '2 days'),
    ('7a1c0001-0000-4000-8000-000000000005'::uuid, 'olympiacos--olympiacos-w-k-2016-17-home', 'l', 8::smallint, 'Μπουχαλάκης',
       'Adidas Olympiacos 2016 collectible football shirt, Andreas Bouchalakis, size L. / Adidas Ολυμπιακός 2016 συλλεκτική ποδοσφαιρική φανέλα Ανδρέας Μπουχαλάκης, μέγεθος L.', now() - interval '1 day')
  ) as t(uid, slug, size, num, player, descr, at)
  loop
    if not exists (select 1 from auth.users where id = r.uid) then
      -- only the columns this project's auth.users has (a real project has all of them)
      select 'insert into auth.users (' || string_agg(format('%I', c), ', ') || ') values (' || string_agg(v, ', ') || ')'
        into v_sql
        from (values ('id', '$1'), ('instance_id', '''00000000-0000-0000-0000-000000000000'''), ('aud', '''authenticated'''),
                     ('role', '''authenticated'''), ('is_anonymous', 'true'), ('created_at', '$2'), ('updated_at', '$2')) as w(c, v)
       where exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = w.c);
      execute v_sql using r.uid, r.at;
    end if;
    perform public.worker_collector_touch(r.uid);
    insert into public.worker_market_managed (user_id, note) values (r.uid, 'Owner known personally to the administrator') on conflict do nothing;
    if not exists (select 1 from public.worker_collector_item where user_id = r.uid and archive_slug = r.slug) then
      insert into public.worker_collector_item
        (user_id, archive_slug, size, condition, item_type, authenticity_claim, player_name, player_number, description,
         for_sale, open_to_offers, currency, state, opened_at, created_at, updated_at)
      values (r.uid, r.slug, r.size, 'good', 'unknown', 'unsure', r.player, r.num, r.descr,
              true, true, 'EUR', 'held', r.at, r.at, r.at);
    end if;
  end loop;
end
$seed$;

comment on table public.worker_market_managed is 'THE WORKER — sellers whose listings are managed by an administrator; activity on them is copied to every administrator.';
