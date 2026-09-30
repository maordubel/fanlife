-- =====================================================================
-- THE WORKER — הארון, שוק האדומים והמכירה הפומבית (22.9.2026)
-- =====================================================================
--
-- **הקובץ השני שמריצים**, אחרי `20260922090000_worker_shared_project.sql`. הוא מניח שהקובץ
-- ההוא כבר רץ (הטבלה worker_profile), ועוצר עם משפט ברור אם לא.
--
-- מה זה: מפרט האספנות של 22.9.2026 — "יש לי / מחפש", הארון, התאמות, שיחה פנימית, הצעות,
-- עסקה שהושלמה, קישורים לחנויות, ומכירה פומבית. שלושה עקרונות, וכל הקובץ נגזר מהם:
--
--   · **הארכיון הוא מקור האמת על הדגם; כאן נשמר רק העותק הפיזי.** פריט באוסף מצביע על
--     `archive_slug` (שם הקובץ של התצלום בארכיון, `vp-1985-away`) ועל `kit_id` של ה-Kit Master
--     כשיש. עונה, יצרן, ספונסר ותמונה לא מועתקים לכאן (מפרט §72).
--   · **שום קריאה ישירה מהטבלאות.** אין grant לאף טבלה. כל קריאה וכל כתיבה עוברות בפונקציות
--     `security definer`, שבודקות בעצמן מי שואל. כך אי אפשר לקרוא שיחה של אחרים, לראות מספר
--     טלפון, או לגלות את מחיר המינימום של מכירה פומבית — הטבלה לא עונה לאף אחד.
--   · **חשבון אמיתי בלבד לכל פעולה בשוק.** בפרויקט המשותף עם DUBID מופעלת התחברות אנונימית
--     (נבדק ב-22.9.2026), ומשתמש אנונימי מקבל את התפקיד authenticated. לכן כל פעולת שוק בודקת
--     גם `is_anonymous` בטוקן — אחרת כל אחד היה יוצר חשבונות אנונימיים בלולאה ומציף הודעות.
--
-- **הפרויקט משותף עם DUBID** (כלל 89): כל אובייקט מתחיל ב-worker_, אין שום דבר על auth.
-- החריג היחיד מחוץ ל-public הוא האחסון לתמונות: דלי אחד בשם `worker-collector` ושלוש מדיניות
-- בשם worker_* על storage.objects, שכולן מוגבלות לדלי הזה בלבד — הן לא מוסיפות גישה לשום
-- דלי של DUBID.
--
-- **אין כאן תשלום, עמלה או תרומה** (מפרט §39, §50). התרומה מוצגת באפליקציה אחרי עסקה שהושלמה,
-- ואין לה טבלה עד שנבחר ספק תשלום.
--
-- **הרצה חוזרת בטוחה**, ונבדקה פעמיים ברצף על Postgres 16 מקומי עם auth ו-storage מדומים,
-- הטבלאות של DUBID לצד, ומשתמש אנונימי שמנסה כל פעולה.
--
-- **בסוף הקובץ יש שאילתת בדיקה.** התוצאה הנכונה:
--   `collector_tables 18 · collector_functions 72 · anon_can_write 0 · auth_triggers 0`

do $guard$
begin
  if to_regclass('public.worker_profile') is null then
    raise exception 'הריצו קודם את 20260922090000_worker_shared_project.sql — הטבלה worker_profile חסרה';
  end if;
end
$guard$;

-- =====================================================================
-- 0. מי שואל — משתמש אמיתי, ומנהל
-- =====================================================================

/* המשתמש המחובר, רק אם הוא לא אנונימי. null אחרת. */
create or replace function public.worker_market_uid() returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    then auth.uid()
  end
$$;

create table if not exists public.worker_admin (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  note     text check (note is null or char_length(note) <= 200)
);

/* האם השואל מנהל. כל פונקציית ניהול קוראת לזה בשורה הראשונה. */
create or replace function public.worker_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.worker_admin where user_id = public.worker_market_uid())
$$;

-- מונה ניסיונות: נכתב גם כשהפעולה נדחית, כי הדחייה מוחזרת כערך ולא כשגיאה (אחרת הוא נמחק).
create table if not exists public.worker_rate_event (
  id      bigint generated always as identity primary key,
  user_id uuid not null,
  action  text not null check (char_length(action) <= 32),
  at      timestamptz not null default now()
);
create index if not exists worker_rate_event_idx on public.worker_rate_event (user_id, action, at desc);

/* true כשהמשתמש עוד בתוך המכסה; רושם את הניסיון בכל מקרה. */
create or replace function public.worker_rate_ok(p_user uuid, p_action text, p_limit integer, p_window interval)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  select count(*) into v_count from public.worker_rate_event
    where user_id = p_user and action = p_action and at > now() - p_window;
  insert into public.worker_rate_event (user_id, action) values (p_user, p_action);
  delete from public.worker_rate_event where at < now() - interval '3 days';
  return v_count < p_limit;
end $$;

-- =====================================================================
-- 1. הפרופיל של האספן — מספר, ולא שם
-- =====================================================================
create sequence if not exists public.worker_collector_handle_seq start 1001;

create table if not exists public.worker_collector_profile (
  user_id           uuid primary key references public.worker_profile(id) on delete cascade,
  -- "אספן #1842". המספר הוא הזהות הציבורית היחידה בשוק (מפרט §19).
  handle_no         integer not null unique default nextval('public.worker_collector_handle_seq'),
  -- להציג את הכינוי מהכרטיס במקום המספר — רק אם האספן בחר בזה.
  show_nickname     boolean not null default false,
  closet_visibility text not null default 'private' check (closet_visibility in ('public', 'link_only', 'private')),
  share_token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at        timestamptz not null default now()
);

/* הפרופיל של השואל, נוצר אם אין — פנימי. */
create or replace function public.worker_collector_touch(p_user uuid) returns public.worker_collector_profile
language plpgsql security definer set search_path = public as $$
declare v_row public.worker_collector_profile;
begin
  perform public.worker_touch_profile(p_user);
  insert into public.worker_collector_profile (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into v_row from public.worker_collector_profile where user_id = p_user;
  return v_row;
end $$;

-- =====================================================================
-- 2. העותק הפיזי — "יש לי"
-- =====================================================================
create table if not exists public.worker_collector_item (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.worker_profile(id) on delete cascade,
  -- שם הקובץ של התצלום בארכיון, בלי סיומת: vp-1985-away, fka-2016-17-home
  archive_slug          text not null check (archive_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  kit_id                text check (kit_id is null or kit_id ~ '^kit-[0-9]{4}-[0-9]{2}-[a-z0-9-]{2,24}$'),
  size                  text check (size is null or size in ('kids', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl')),
  condition             text check (condition is null or condition in ('mint', 'excellent', 'good', 'worn', 'damaged')),
  item_type             text not null default 'unknown'
                        check (item_type in ('original_period', 'official_reissue', 'replica', 'fan_reproduction', 'unknown')),
  -- מה שהמוכר טוען. The Worker לא מאמת (מפרט §9).
  authenticity_claim    text check (authenticity_claim is null or authenticity_claim in ('original', 'match_worn', 'unsure', 'replica')),
  player_name           text check (player_name is null or char_length(player_name) <= 40),
  player_number         smallint check (player_number is null or player_number between 0 and 99),
  personalization_notes text check (personalization_notes is null or char_length(personalization_notes) <= 200),
  description           text check (description is null or char_length(description) <= 1500),
  for_trade             boolean not null default false,
  for_sale              boolean not null default false,
  asking_price          numeric(10, 2) check (asking_price is null or asking_price > 0),
  currency              text not null default 'ILS' check (currency in ('ILS', 'EUR', 'USD')),
  open_to_offers        boolean not null default true,
  -- held: בארון · reserved: סוכמה עסקה · sold / traded: עזב · removed: נמחק מהארון · suspended: הושעה
  state                 text not null default 'held'
                        check (state in ('held', 'reserved', 'sold', 'traded', 'removed', 'suspended')),
  suspended_reason      text check (suspended_reason is null or char_length(suspended_reason) <= 300),
  opened_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- רפליקה לא טוענת שהיא מקורית. הבדיקה בטבלה, כי היא חייבת להחזיק גם מול עדכון ידני.
  constraint worker_collector_item_replica_honest check (
    not (item_type in ('replica', 'fan_reproduction') and authenticity_claim in ('original', 'match_worn'))
  )
);
create index if not exists worker_collector_item_user_idx on public.worker_collector_item (user_id, state);
create index if not exists worker_collector_item_slug_idx on public.worker_collector_item (archive_slug, state);
create index if not exists worker_collector_item_kit_idx on public.worker_collector_item (kit_id) where kit_id is not null;

create table if not exists public.worker_collector_photo (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.worker_collector_item(id) on delete cascade,
  user_id      uuid not null references public.worker_profile(id) on delete cascade,
  -- <user>/<item>/<file>.webp בתוך הדלי worker-collector
  storage_path text not null unique
               check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$'),
  sort_order   smallint not null default 0 check (sort_order between 0 and 20),
  created_at   timestamptz not null default now()
);
create index if not exists worker_collector_photo_item_idx on public.worker_collector_photo (item_id, sort_order);

-- =====================================================================
-- 3. "מחפש"
-- =====================================================================
create table if not exists public.worker_collector_want (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.worker_profile(id) on delete cascade,
  archive_slug   text not null check (archive_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  kit_id         text check (kit_id is null or kit_id ~ '^kit-[0-9]{4}-[0-9]{2}-[a-z0-9-]{2,24}$'),
  preferred_size text check (preferred_size is null or preferred_size in ('kids', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl')),
  notes          text check (notes is null or char_length(notes) <= 300),
  created_at     timestamptz not null default now(),
  unique (user_id, archive_slug)
);
create index if not exists worker_collector_want_slug_idx on public.worker_collector_want (archive_slug);

-- =====================================================================
-- 4. חיבור, שיחה, הצעה
-- =====================================================================
create table if not exists public.worker_collector_connection (
  id                uuid primary key default gen_random_uuid(),
  initiator_id      uuid not null references public.worker_profile(id) on delete cascade,
  recipient_id      uuid not null references public.worker_profile(id) on delete cascade,
  item_id           uuid references public.worker_collector_item(id) on delete set null,
  kind              text not null check (kind in ('buy', 'trade')),
  status            text not null default 'requested'
                    check (status in ('requested', 'accepted', 'negotiating', 'agreed', 'completed', 'declined', 'cancelled', 'reported')),
  initiator_done_at timestamptz,
  recipient_done_at timestamptz,
  initiator_read_at timestamptz,
  recipient_read_at timestamptz,
  last_message_at   timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint worker_collector_connection_two_people check (initiator_id <> recipient_id)
);
create index if not exists worker_collector_connection_initiator_idx on public.worker_collector_connection (initiator_id, last_message_at desc);
create index if not exists worker_collector_connection_recipient_idx on public.worker_collector_connection (recipient_id, last_message_at desc);
create unique index if not exists worker_collector_connection_open_idx
  on public.worker_collector_connection (initiator_id, item_id)
  where status in ('requested', 'accepted', 'negotiating', 'agreed');

create table if not exists public.worker_collector_message (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.worker_collector_connection(id) on delete cascade,
  sender_id     uuid references public.worker_profile(id) on delete set null,
  kind          text not null default 'text' check (kind in ('text', 'offer', 'system', 'photo_request')),
  body          text check (body is null or char_length(body) <= 1000),
  meta          jsonb check (meta is null or octet_length(meta::text) <= 2048),
  created_at    timestamptz not null default now()
);
create index if not exists worker_collector_message_thread_idx on public.worker_collector_message (connection_id, created_at);

create table if not exists public.worker_collector_offer (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.worker_collector_connection(id) on delete cascade,
  sender_id     uuid not null references public.worker_profile(id) on delete cascade,
  kind          text not null check (kind in ('price', 'trade')),
  amount        numeric(10, 2) check (amount is null or amount > 0),
  currency      text not null default 'ILS' check (currency in ('ILS', 'EUR', 'USD')),
  status        text not null default 'open'
                check (status in ('open', 'accepted', 'declined', 'countered', 'withdrawn', 'superseded')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint worker_collector_offer_shape check (kind = 'trade' or amount is not null)
);
create index if not exists worker_collector_offer_thread_idx on public.worker_collector_offer (connection_id, created_at);

create table if not exists public.worker_collector_offer_item (
  offer_id uuid not null references public.worker_collector_offer(id) on delete cascade,
  item_id  uuid not null references public.worker_collector_item(id) on delete cascade,
  primary key (offer_id, item_id)
);

create table if not exists public.worker_collector_block (
  blocker_id uuid not null references public.worker_profile(id) on delete cascade,
  blocked_id uuid not null references public.worker_profile(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint worker_collector_block_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.worker_collector_report (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.worker_profile(id) on delete cascade,
  reported_id     uuid references public.worker_profile(id) on delete set null,
  connection_id   uuid references public.worker_collector_connection(id) on delete set null,
  item_id         uuid references public.worker_collector_item(id) on delete set null,
  lot_id          uuid,
  reason          text not null check (reason in ('scam', 'fake', 'abuse', 'spam', 'other')),
  details         text check (details is null or char_length(details) <= 1000),
  status          text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  handled_by      uuid,
  handled_at      timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 500),
  created_at      timestamptz not null default now()
);
create index if not exists worker_collector_report_status_idx on public.worker_collector_report (status, created_at desc);

-- =====================================================================
-- 5. חנויות — הרשמית קודמת, רפליקה מסומנת, ואף קישור לא נושא עמלה
-- =====================================================================
create table if not exists public.worker_merchant_offer (
  id                     uuid primary key default gen_random_uuid(),
  archive_slug           text check (archive_slug is null or archive_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  kit_id                 text check (kit_id is null or kit_id ~ '^kit-[0-9]{4}-[0-9]{2}-[a-z0-9-]{2,24}$'),
  season_label           text check (season_label is null or season_label ~ '^[0-9]{4}/[0-9]{2}$'),
  merchant_name          text not null check (char_length(merchant_name) between 1 and 80),
  merchant_type          text not null check (merchant_type in ('club_store', 'retro_store', 'other')),
  offer_type             text not null check (offer_type in ('official', 'official_reissue', 'replica', 'external_new')),
  title_he               text check (title_he is null or char_length(title_he) <= 160),
  price                  numeric(10, 2) check (price is null or price > 0),
  currency               text not null default 'ILS' check (currency in ('ILS', 'EUR', 'USD')),
  -- בלי פרמטרים של שותפים (מפרט §27): utm, ref, aff, tag — הבדיקה בטבלה עצמה.
  product_url            text not null check (
                           product_url ~ '^https://[^\s]+$'
                           and product_url !~* '[?&](utm_[a-z]+|ref|aff|affiliate|tag|partner|clickid)='),
  image_url              text check (image_url is null or image_url ~ '^https://[^\s]+$'),
  availability           text not null default 'unknown' check (availability in ('in_stock', 'out_of_stock', 'unknown')),
  last_checked_at        date,
  is_official_club_store boolean not null default false,
  is_active              boolean not null default true,
  sort_rank              smallint not null default 100,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint worker_merchant_offer_target check (archive_slug is not null or kit_id is not null or season_label is not null),
  -- "רשמי" רק מחנות המועדון או כהוצאה רשמית; רפליקה לעולם לא מסומנת כחנות המועדון.
  constraint worker_merchant_offer_honest check (
    (offer_type <> 'official' or is_official_club_store)
    and (offer_type <> 'replica' or not is_official_club_store)
  )
);
create unique index if not exists worker_merchant_offer_url_idx on public.worker_merchant_offer (product_url, coalesce(archive_slug, ''), coalesce(kit_id, ''), coalesce(season_label, ''));

-- =====================================================================
-- 6. המכירה הפומבית
-- =====================================================================
create table if not exists public.worker_auction_lot (
  id                 uuid primary key default gen_random_uuid(),
  seller_id          uuid not null references public.worker_profile(id) on delete cascade,
  item_id            uuid not null references public.worker_collector_item(id) on delete cascade,
  title              text not null check (char_length(title) between 3 and 120),
  description        text not null check (char_length(description) between 20 and 3000),
  start_price        numeric(10, 2) not null check (start_price > 0),
  -- מחיר המינימום לא נחשף לאף אחד מלבד המוכר והמנהל (מפרט §37)
  reserve_price      numeric(10, 2) check (reserve_price is null or reserve_price > 0),
  min_increment      numeric(10, 2) not null default 10 check (min_increment > 0),
  currency           text not null default 'ILS' check (currency in ('ILS', 'EUR', 'USD')),
  requested_hours    integer not null default 72 check (requested_hours between 24 and 336),
  starts_at          timestamptz,
  ends_at            timestamptz,
  anti_snipe_seconds integer not null default 120 check (anti_snipe_seconds between 30 and 600),
  status             text not null default 'pending_approval'
                     check (status in ('pending_approval', 'scheduled', 'awaiting_completion', 'completed', 'ended', 'cancelled', 'rejected')),
  approved_by        uuid,
  approved_at        timestamptz,
  decision_note      text check (decision_note is null or char_length(decision_note) <= 500),
  bid_count          integer not null default 0,
  current_price      numeric(10, 2),
  leader_id          uuid references public.worker_profile(id) on delete set null,
  leader_max         numeric(10, 2),
  winner_id          uuid references public.worker_profile(id) on delete set null,
  winning_amount     numeric(10, 2),
  seller_done_at     timestamptz,
  winner_done_at     timestamptz,
  -- השיחה בין הזוכה למוכר — נפתחת בסגירה, כדי שיהיה להם איפה לתאם (מפרט §39)
  connection_id      uuid references public.worker_collector_connection(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint worker_auction_lot_reserve check (reserve_price is null or reserve_price >= start_price),
  constraint worker_auction_lot_window check (starts_at is null or ends_at is null or ends_at > starts_at)
);
alter table public.worker_auction_lot add column if not exists connection_id uuid
  references public.worker_collector_connection(id) on delete set null;
create index if not exists worker_auction_lot_status_idx on public.worker_auction_lot (status, ends_at);
create unique index if not exists worker_auction_lot_item_open_idx on public.worker_auction_lot (item_id)
  where status in ('pending_approval', 'scheduled', 'awaiting_completion');

create table if not exists public.worker_auction_bid (
  id          uuid primary key default gen_random_uuid(),
  lot_id      uuid not null references public.worker_auction_lot(id) on delete cascade,
  bidder_id   uuid not null references public.worker_profile(id) on delete cascade,
  -- המחיר שההצעה הזאת הביאה אליו
  amount      numeric(10, 2) not null check (amount > 0),
  -- התקרה שהמציע הגדיר (Max Bid) — פרטית
  max_amount  numeric(10, 2) not null check (max_amount >= amount),
  is_proxy    boolean not null default false,
  status      text not null default 'active' check (status in ('active', 'voided')),
  voided_by   uuid,
  voided_note text check (voided_note is null or char_length(voided_note) <= 300),
  created_at  timestamptz not null default now()
);
create index if not exists worker_auction_bid_lot_idx on public.worker_auction_bid (lot_id, created_at);

create table if not exists public.worker_auction_watch (
  lot_id     uuid not null references public.worker_auction_lot(id) on delete cascade,
  user_id    uuid not null references public.worker_profile(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lot_id, user_id)
);

-- =====================================================================
-- 7. התראות, ויומן ביקורת
-- =====================================================================
create table if not exists public.worker_notification (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.worker_profile(id) on delete cascade,
  kind       text not null check (kind in (
               'COLLECTOR_WANT_MATCHED', 'COLLECTOR_ITEM_REQUESTED', 'COLLECTOR_REQUEST_ACCEPTED',
               'COLLECTOR_REQUEST_DECLINED', 'COLLECTOR_MESSAGE', 'COLLECTOR_OFFER_RECEIVED',
               'COLLECTOR_OFFER_ACCEPTED', 'COLLECTOR_OFFER_DECLINED', 'CONNECTION_COMPLETED',
               'CONNECTION_CANCELLED', 'AUCTION_SUBMITTED', 'AUCTION_APPROVED', 'AUCTION_REJECTED',
               'AUCTION_SCHEDULED', 'AUCTION_STARTED', 'AUCTION_OUTBID', 'AUCTION_ENDING',
               'AUCTION_WON', 'AUCTION_SOLD', 'AUCTION_UNSOLD', 'AUCTION_CANCELLED',
               'ITEM_SUSPENDED', 'REPORT_RECEIVED')),
  -- מפתח שמונע התראה כפולה על אותו אירוע (למשל AUCTION_ENDING פעם אחת ללוט)
  dedupe_key text check (dedupe_key is null or char_length(dedupe_key) <= 120),
  payload    jsonb not null default '{}'::jsonb check (octet_length(payload::text) <= 2048),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists worker_notification_user_idx on public.worker_notification (user_id, created_at desc);
create unique index if not exists worker_notification_dedupe_idx on public.worker_notification (user_id, dedupe_key) where dedupe_key is not null;

create table if not exists public.worker_audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null check (char_length(action) <= 40),
  entity     text not null check (char_length(entity) <= 40),
  entity_id  uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists worker_audit_log_entity_idx on public.worker_audit_log (entity, entity_id, created_at);

-- =====================================================================
-- 8. טריגרים — זמן עדכון, ויומן ביקורת שיושב על הטבלה עצמה
-- =====================================================================
-- היומן על הטבלה ולא בתוך הפונקציות: כך הוא תופס גם עדכון ידני מה-SQL Editor, שהוא בדיוק
-- השינוי שהכי שווה לתעד, ואי אפשר לשכוח אותו בפונקציה הבאה שתיכתב.

create or replace function public.worker_touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.worker_audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_diff jsonb := '{}'::jsonb;
  v_key text;
begin
  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at' and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_array(v_old -> v_key, v_new -> v_key));
      end if;
    end loop;
    if v_diff = '{}'::jsonb then return new; end if;
  elsif tg_op = 'INSERT' then
    v_diff := v_new;
  else
    v_diff := v_old;
  end if;
  insert into public.worker_audit_log (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), lower(tg_op), tg_table_name,
          nullif(coalesce(v_new, v_old) ->> 'id', '')::uuid, v_diff);
  return coalesce(new, old);
end $$;

do $triggers$
declare v_table text;
begin
  foreach v_table in array array['worker_collector_item', 'worker_collector_connection', 'worker_auction_lot', 'worker_merchant_offer'] loop
    execute format('drop trigger if exists worker_touch_%1$s on public.%1$I', v_table);
    execute format('create trigger worker_touch_%1$s before update on public.%1$I for each row execute function public.worker_touch_updated_at()', v_table);
  end loop;
  foreach v_table in array array['worker_auction_lot', 'worker_auction_bid', 'worker_collector_report', 'worker_merchant_offer', 'worker_admin'] loop
    execute format('drop trigger if exists worker_audit_%1$s on public.%1$I', v_table);
    execute format('create trigger worker_audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.worker_audit_row()', v_table);
  end loop;
end
$triggers$;

-- השעיה והחזרה של פריט נרשמות ביומן; שינוי מחיר או מידה של אספן בארון שלו לא.
create or replace function public.worker_audit_item_state() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.state = 'suspended') is distinct from (new.state = 'suspended') then
    insert into public.worker_audit_log (actor_id, action, entity, entity_id, detail)
    values (auth.uid(), case when new.state = 'suspended' then 'suspend' else 'unsuspend' end,
            'worker_collector_item', new.id,
            jsonb_build_object('from', old.state, 'to', new.state, 'reason', new.suspended_reason));
  end if;
  return new;
end $$;
drop trigger if exists worker_audit_item_state on public.worker_collector_item;
create trigger worker_audit_item_state after update on public.worker_collector_item
  for each row execute function public.worker_audit_item_state();

-- =====================================================================
-- 9. עזרים פנימיים
-- =====================================================================
/* איך אספן נראה לאחרים: מספר, או כינוי אם בחר. לעולם לא מזהה, מייל או טלפון. */
create or replace function public.worker_collector_label(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'handle', c.handle_no,
    'nickname', case when c.show_nickname then nullif(trim(p.display_name), '') end,
    'since', extract(year from p.since)::int,
    'completed', (select count(*) from public.worker_collector_connection k
                   where k.status = 'completed' and (k.initiator_id = p_user or k.recipient_id = p_user)),
    'trades', (select count(*) from public.worker_collector_connection k
                where k.status = 'completed' and k.kind = 'trade' and (k.initiator_id = p_user or k.recipient_id = p_user)),
    'sales', (select count(*) from public.worker_collector_connection k
               where k.status = 'completed' and k.kind = 'buy' and k.recipient_id = p_user),
    'items', (select count(*) from public.worker_collector_item i
               where i.user_id = p_user and i.state in ('held', 'reserved'))
  )
  from public.worker_collector_profile c
  join public.worker_profile p on p.id = c.user_id
  where c.user_id = p_user
$$;


/* התראה. לעולם לא לעצמך; מפתח כפילות מונע אותה התראה פעמיים. */
create or replace function public.worker_notify(p_user uuid, p_kind text, p_payload jsonb, p_dedupe text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = public.worker_market_uid() then return; end if;
  -- מנהל שמעולם לא פתח את THE WORKER עדיין אין לו כרטיס; התראה אליו פותחת אותו.
  perform public.worker_touch_profile(p_user);
  insert into public.worker_notification (user_id, kind, payload, dedupe_key)
  values (p_user, p_kind, coalesce(p_payload, '{}'::jsonb), p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;

/* חסימה, לשני הכיוונים. */
create or replace function public.worker_blocked(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.worker_collector_block
                  where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a))
$$;

create or replace function public.worker_item_photos(p_item uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(storage_path order by sort_order, created_at), '[]'::jsonb)
  from public.worker_collector_photo where item_id = p_item
$$;

/* פריט כפי שאחרים רואים אותו: בלי מזהה בעלים. */
create or replace function public.worker_item_public(p_item public.worker_collector_item) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_item.id,
    'archiveSlug', p_item.archive_slug,
    'kitId', p_item.kit_id,
    'size', p_item.size,
    'condition', p_item.condition,
    'itemType', p_item.item_type,
    'authenticityClaim', p_item.authenticity_claim,
    'playerName', p_item.player_name,
    'playerNumber', p_item.player_number,
    'personalization', p_item.personalization_notes,
    'description', p_item.description,
    'forTrade', p_item.for_trade,
    'forSale', p_item.for_sale,
    'askingPrice', p_item.asking_price,
    'currency', p_item.currency,
    'openToOffers', p_item.open_to_offers,
    'state', p_item.state,
    'photos', public.worker_item_photos(p_item.id),
    'openedAt', p_item.opened_at,
    'seller', public.worker_collector_label(p_item.user_id)
  )
$$;

/* פריט של השואל: כמו הציבורי, ועוד מה שרק הבעלים רואה. */
create or replace function public.worker_item_owner(p_item public.worker_collector_item) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.worker_item_public(p_item) - 'seller' || jsonb_build_object(
    'suspendedReason', p_item.suspended_reason,
    'createdAt', p_item.created_at,
    'openConnections', (select count(*) from public.worker_collector_connection k
                         where k.item_id = p_item.id and k.status in ('requested', 'accepted', 'negotiating', 'agreed')),
    'lot', (select jsonb_build_object('id', l.id, 'status', l.status) from public.worker_auction_lot l
             where l.item_id = p_item.id and l.status in ('pending_approval', 'scheduled', 'awaiting_completion')
             limit 1),
    'wanters', (select count(*) from public.worker_collector_want w
                 where w.archive_slug = p_item.archive_slug and w.user_id <> p_item.user_id)
  )
$$;

/* אותה חולצה: אותו תצלום בארכיון, או אותו kit_id כששני הצדדים יודעים אותו. */
create or replace function public.worker_same_shirt(p_slug_a text, p_kit_a text, p_slug_b text, p_kit_b text) returns boolean
language sql immutable as $$
  select p_slug_a = p_slug_b or (p_kit_a is not null and p_kit_b is not null and p_kit_a = p_kit_b)
$$;

/* תשובה אחידה לכישלון: ערך, לא שגיאה — כך מונה הניסיונות נשמר (מיומנות server-authority). */
create or replace function public.worker_fail(p_error text, p_extra jsonb default '{}'::jsonb) returns jsonb
language sql immutable as $$
  select jsonb_build_object('ok', false, 'error', p_error) || coalesce(p_extra, '{}'::jsonb)
$$;

create or replace function public.worker_slug_ok(p_slug text) returns boolean
language sql immutable as $$ select coalesce(p_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$', false) $$;

create or replace function public.worker_kit_ok(p_kit text) returns boolean
language sql immutable as $$ select p_kit is null or p_kit ~ '^kit-[0-9]{4}-[0-9]{2}-[a-z0-9-]{2,24}$' $$;

-- =====================================================================
-- 10. אותות בארכיון — כמה יש, כמה מחפשים (ספירות בלבד, פתוח גם לאורחים)
-- =====================================================================
create or replace function public.worker_shirt_signals(p_slugs text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  with s as (
    select distinct slug from unnest(coalesce(p_slugs, '{}'::text[])) as slug
    where public.worker_slug_ok(slug)
    limit 240
  )
  select coalesce(jsonb_object_agg(s.slug, jsonb_build_object(
    'have', (select count(distinct i.user_id) from public.worker_collector_item i
              where i.archive_slug = s.slug and i.state in ('held', 'reserved')),
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

-- =====================================================================
-- 11. הארון שלי
-- =====================================================================
create or replace function public.worker_closet_mine() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_profile public.worker_collector_profile;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  v_profile := public.worker_collector_touch(v_me);
  return jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'handle', v_profile.handle_no,
      'showNickname', v_profile.show_nickname,
      'visibility', v_profile.closet_visibility,
      'shareToken', v_profile.share_token),
    'label', public.worker_collector_label(v_me),
    'items', (select coalesce(jsonb_agg(public.worker_item_owner(i) order by i.created_at desc), '[]'::jsonb)
                from public.worker_collector_item i where i.user_id = v_me and i.state <> 'removed'),
    'wants', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', w.id, 'archiveSlug', w.archive_slug, 'kitId', w.kit_id,
                'preferredSize', w.preferred_size, 'notes', w.notes, 'createdAt', w.created_at,
                'available', (select count(*) from public.worker_collector_item i
                               where public.worker_same_shirt(i.archive_slug, i.kit_id, w.archive_slug, w.kit_id)
                                 and i.state = 'held' and (i.for_sale or i.for_trade) and i.user_id <> v_me
                                 and not public.worker_blocked(v_me, i.user_id))
              ) order by w.created_at desc), '[]'::jsonb)
              from public.worker_collector_want w where w.user_id = v_me),
    'unread', (select count(*) from public.worker_notification n where n.user_id = v_me and n.read_at is null)
  );
end $$;

/* ארון של אספן אחר — רק אם פתוח לכולם, או בקישור עם הטוקן. פרטי = "לא נמצא", בלי לגלות שהוא קיים. */
create or replace function public.worker_closet_view(p_handle integer, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_p public.worker_collector_profile;
begin
  select * into v_p from public.worker_collector_profile where handle_no = p_handle;
  if not found then return public.worker_fail('not_found'); end if;
  if v_p.user_id is distinct from auth.uid() then
    if v_p.closet_visibility = 'private' then return public.worker_fail('not_found'); end if;
    if v_p.closet_visibility = 'link_only' and coalesce(p_token, '') <> v_p.share_token then
      return public.worker_fail('not_found');
    end if;
  end if;
  return jsonb_build_object(
    'ok', true,
    'label', public.worker_collector_label(v_p.user_id),
    -- הבעלים רואה את הארון שלו כמו שאחרים רואים אותו, ויודע שזה הוא
    'mine', v_p.user_id = coalesce(public.worker_market_uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'archiveSlug', i.archive_slug, 'kitId', i.kit_id, 'itemType', i.item_type,
                'playerName', i.player_name, 'playerNumber', i.player_number,
                'forTrade', i.for_trade and i.state = 'held', 'forSale', i.for_sale and i.state = 'held',
                'id', case when i.state = 'held' and (i.for_sale or i.for_trade) then i.id end
              ) order by i.archive_slug), '[]'::jsonb)
              from public.worker_collector_item i where i.user_id = v_p.user_id and i.state in ('held', 'reserved')),
    'wants', (select coalesce(jsonb_agg(w.archive_slug order by w.archive_slug), '[]'::jsonb)
              from public.worker_collector_want w where w.user_id = v_p.user_id)
  );
end $$;

/* "יש לי" — לחיצה אחת. אם כבר יש עותק, מחזיר אותו; עותק נוסף רק כשמבקשים במפורש. */
create or replace function public.worker_collector_have(p_slug text, p_kit text default null, p_new_copy boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_item public.worker_collector_item;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not public.worker_slug_ok(p_slug) then return public.worker_fail('bad_slug'); end if;
  if not public.worker_kit_ok(p_kit) then return public.worker_fail('bad_kit'); end if;
  perform public.worker_collector_touch(v_me);
  if not coalesce(p_new_copy, false) then
    select * into v_item from public.worker_collector_item
      where user_id = v_me and archive_slug = p_slug and state in ('held', 'reserved', 'suspended')
      order by created_at limit 1;
    if found then
      return jsonb_build_object('ok', true, 'created', false, 'item', public.worker_item_owner(v_item));
    end if;
  end if;
  if (select count(*) from public.worker_collector_item where user_id = v_me and state <> 'removed') >= 600 then
    return public.worker_fail('closet_full');
  end if;
  if not public.worker_rate_ok(v_me, 'have', 200, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  insert into public.worker_collector_item (user_id, archive_slug, kit_id) values (v_me, p_slug, p_kit)
    returning * into v_item;
  -- מי שסימן "יש לי" כבר לא מחפש אותה. אפשר להחזיר ל"מחפש" בלחיצה.
  delete from public.worker_collector_want where user_id = v_me and archive_slug = p_slug;
  return jsonb_build_object('ok', true, 'created', true, 'item', public.worker_item_owner(v_item));
end $$;

/* מוציא עותק מהארון. לא כשהוא באמצע עסקה או במכירה פומבית. */
create or replace function public.worker_collector_unhave(p_item uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_item public.worker_collector_item;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into v_item from public.worker_collector_item where id = p_item and user_id = v_me for update;
  if not found then return public.worker_fail('not_found'); end if;
  if v_item.state not in ('held', 'suspended')
     or exists (select 1 from public.worker_collector_connection k
                 where k.item_id = p_item and k.status in ('requested', 'accepted', 'negotiating', 'agreed'))
     or exists (select 1 from public.worker_auction_lot l
                 where l.item_id = p_item and l.status in ('pending_approval', 'scheduled', 'awaiting_completion')) then
    return public.worker_fail('busy');
  end if;
  update public.worker_collector_item set state = 'removed', for_sale = false, for_trade = false where id = p_item;
  return jsonb_build_object('ok', true);
end $$;

/* "מחפש" — הדלקה וכיבוי. */
create or replace function public.worker_collector_want_set(
  p_slug text, p_on boolean, p_kit text default null, p_size text default null, p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not public.worker_slug_ok(p_slug) then return public.worker_fail('bad_slug'); end if;
  if not public.worker_kit_ok(p_kit) then return public.worker_fail('bad_kit'); end if;
  if not coalesce(p_on, false) then
    delete from public.worker_collector_want where user_id = v_me and archive_slug = p_slug;
    return jsonb_build_object('ok', true, 'wanting', false);
  end if;
  perform public.worker_collector_touch(v_me);
  if (select count(*) from public.worker_collector_want where user_id = v_me) >= 400 then
    return public.worker_fail('wishlist_full');
  end if;
  begin
    insert into public.worker_collector_want (user_id, archive_slug, kit_id, preferred_size, notes)
      values (v_me, p_slug, p_kit, p_size, nullif(trim(p_notes), ''))
      on conflict (user_id, archive_slug) do update
        set kit_id = coalesce(excluded.kit_id, worker_collector_want.kit_id),
            preferred_size = excluded.preferred_size, notes = excluded.notes;
  exception when check_violation then
    return public.worker_fail('bad_value');
  end;
  return jsonb_build_object('ok', true, 'wanting', true);
end $$;

/*
 * עריכת עותק. רק המפתחות המותרים; פתיחה למכירה או להחלפה דורשת מידה, מצב וסוג (מפרט §7),
 * ופתיחה ראשונה מתריעה למי שמחפש את אותה חולצה (עד 200 התראות).
 */
create or replace function public.worker_collector_item_update(p_item uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_old public.worker_collector_item;
  v_new public.worker_collector_item;
  v_was_open boolean;
  v_now_open boolean;
  v_missing text[] := '{}';
  v_key text;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then return public.worker_fail('bad_patch'); end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('size', 'condition', 'itemType', 'authenticityClaim', 'playerName', 'playerNumber',
                     'personalization', 'description', 'forTrade', 'forSale', 'askingPrice', 'currency', 'openToOffers') then
      return public.worker_fail('bad_key', jsonb_build_object('key', v_key));
    end if;
  end loop;
  select * into v_old from public.worker_collector_item where id = p_item and user_id = v_me for update;
  if not found then return public.worker_fail('not_found'); end if;
  if v_old.state = 'suspended' then return public.worker_fail('suspended'); end if;
  if v_old.state <> 'held' then return public.worker_fail('busy'); end if;

  v_new := v_old;
  if p_patch ? 'size' then v_new.size := nullif(p_patch ->> 'size', ''); end if;
  if p_patch ? 'condition' then v_new.condition := nullif(p_patch ->> 'condition', ''); end if;
  if p_patch ? 'itemType' then v_new.item_type := coalesce(nullif(p_patch ->> 'itemType', ''), 'unknown'); end if;
  if p_patch ? 'authenticityClaim' then v_new.authenticity_claim := nullif(p_patch ->> 'authenticityClaim', ''); end if;
  if p_patch ? 'playerName' then v_new.player_name := nullif(trim(p_patch ->> 'playerName'), ''); end if;
  if p_patch ? 'playerNumber' then
    begin v_new.player_number := nullif(p_patch ->> 'playerNumber', '')::smallint;
    exception when others then return public.worker_fail('bad_value', jsonb_build_object('key', 'playerNumber')); end;
  end if;
  if p_patch ? 'personalization' then v_new.personalization_notes := nullif(trim(p_patch ->> 'personalization'), ''); end if;
  if p_patch ? 'description' then v_new.description := nullif(trim(p_patch ->> 'description'), ''); end if;
  if p_patch ? 'forTrade' then v_new.for_trade := coalesce((p_patch ->> 'forTrade')::boolean, false); end if;
  if p_patch ? 'forSale' then v_new.for_sale := coalesce((p_patch ->> 'forSale')::boolean, false); end if;
  if p_patch ? 'askingPrice' then
    begin v_new.asking_price := nullif(p_patch ->> 'askingPrice', '')::numeric(10, 2);
    exception when others then return public.worker_fail('bad_value', jsonb_build_object('key', 'askingPrice')); end;
  end if;
  if p_patch ? 'currency' then v_new.currency := coalesce(nullif(p_patch ->> 'currency', ''), 'ILS'); end if;
  if p_patch ? 'openToOffers' then v_new.open_to_offers := coalesce((p_patch ->> 'openToOffers')::boolean, true); end if;

  v_was_open := v_old.for_sale or v_old.for_trade;
  v_now_open := v_new.for_sale or v_new.for_trade;
  if v_now_open then
    if v_new.size is null then v_missing := array_append(v_missing, 'size'); end if;
    if v_new.condition is null then v_missing := array_append(v_missing, 'condition'); end if;
    if v_new.item_type = 'unknown' then v_missing := array_append(v_missing, 'itemType'); end if;
    if array_length(v_missing, 1) > 0 then
      return public.worker_fail('details_required', jsonb_build_object('missing', to_jsonb(v_missing)));
    end if;
    if v_new.for_sale and v_new.asking_price is null and not v_new.open_to_offers then
      return public.worker_fail('price_required');
    end if;
  end if;

  begin
    update public.worker_collector_item set
      size = v_new.size, condition = v_new.condition, item_type = v_new.item_type,
      authenticity_claim = v_new.authenticity_claim, player_name = v_new.player_name,
      player_number = v_new.player_number, personalization_notes = v_new.personalization_notes,
      description = v_new.description, for_trade = v_new.for_trade, for_sale = v_new.for_sale,
      asking_price = v_new.asking_price, currency = v_new.currency, open_to_offers = v_new.open_to_offers,
      opened_at = case when v_now_open and not v_was_open then now() when not v_now_open then null else opened_at end
    where id = p_item
    returning * into v_new;
  exception when check_violation then
    return public.worker_fail(case when sqlerrm like '%replica_honest%' then 'replica_claim' else 'bad_value' end);
  end;

  if v_now_open and not v_was_open then
    perform public.worker_notify(w.user_id, 'COLLECTOR_WANT_MATCHED',
      jsonb_build_object('itemId', v_new.id, 'archiveSlug', v_new.archive_slug,
                         'forSale', v_new.for_sale, 'forTrade', v_new.for_trade),
      'want:' || v_new.id::text)
    from (select distinct w.user_id from public.worker_collector_want w
           where public.worker_same_shirt(w.archive_slug, w.kit_id, v_new.archive_slug, v_new.kit_id)
             and w.user_id <> v_me and not public.worker_blocked(v_me, w.user_id)
           limit 200) w;
  end if;
  return jsonb_build_object('ok', true, 'item', public.worker_item_owner(v_new));
end $$;

/* תמונה שהועלתה לדלי — נרשמת לעותק. הנתיב חייב להתחיל במשתמש ובעותק, והקובץ חייב להיות שם. */
create or replace function public.worker_collector_photo_add(p_item uuid, p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_count integer;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not exists (select 1 from public.worker_collector_item where id = p_item and user_id = v_me and state in ('held', 'reserved')) then
    return public.worker_fail('not_found');
  end if;
  if p_path is null or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$'
     or split_part(p_path, '/', 1) <> v_me::text or split_part(p_path, '/', 2) <> p_item::text then
    return public.worker_fail('bad_path');
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'worker-collector' and o.name = p_path) then
    return public.worker_fail('not_uploaded');
  end if;
  select count(*) into v_count from public.worker_collector_photo where item_id = p_item;
  if v_count >= 8 then return public.worker_fail('too_many_photos'); end if;
  insert into public.worker_collector_photo (item_id, user_id, storage_path, sort_order)
    values (p_item, v_me, p_path, v_count)
    on conflict (storage_path) do nothing;
  return jsonb_build_object('ok', true, 'photos', public.worker_item_photos(p_item));
end $$;

/* מוחק את השורה ומחזיר את הנתיב, כדי שהאפליקציה תמחק את הקובץ מהדלי. */
create or replace function public.worker_collector_photo_remove(p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_item uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  delete from public.worker_collector_photo where storage_path = p_path and user_id = v_me returning item_id into v_item;
  if v_item is null then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'path', p_path, 'photos', public.worker_item_photos(v_item));
end $$;

create or replace function public.worker_collector_photo_order(p_item uuid, p_paths text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not exists (select 1 from public.worker_collector_item where id = p_item and user_id = v_me) then
    return public.worker_fail('not_found');
  end if;
  update public.worker_collector_photo p set sort_order = least(o.pos - 1, 20)
    from unnest(p_paths) with ordinality as o(path, pos)
    where p.item_id = p_item and p.storage_path = o.path;
  return jsonb_build_object('ok', true, 'photos', public.worker_item_photos(p_item));
end $$;

/* פרטיות הארון, הצגת כינוי, והחלפת קישור השיתוף. */
create or replace function public.worker_collector_settings(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_p public.worker_collector_profile;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  v_p := public.worker_collector_touch(v_me);
  if p_patch ? 'visibility' then
    if (p_patch ->> 'visibility') not in ('public', 'link_only', 'private') then return public.worker_fail('bad_value'); end if;
    v_p.closet_visibility := p_patch ->> 'visibility';
  end if;
  if p_patch ? 'showNickname' then v_p.show_nickname := coalesce((p_patch ->> 'showNickname')::boolean, false); end if;
  if coalesce((p_patch ->> 'rotateToken')::boolean, false) then
    v_p.share_token := replace(gen_random_uuid()::text, '-', '');
  end if;
  update public.worker_collector_profile
     set closet_visibility = v_p.closet_visibility, show_nickname = v_p.show_nickname, share_token = v_p.share_token
   where user_id = v_me;
  return jsonb_build_object('ok', true, 'visibility', v_p.closet_visibility,
                            'showNickname', v_p.show_nickname, 'shareToken', v_p.share_token);
end $$;

-- =====================================================================
-- 12. שוק האדומים — מה זמין, ומה מתאים לך
-- =====================================================================
create or replace function public.worker_market_list(
  p_slug text default null, p_kind text default null, p_limit integer default 60, p_before timestamptz default null
) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.worker_item_public(i) || jsonb_build_object('mine', i.user_id = auth.uid())
                            order by i.opened_at desc nulls last), '[]'::jsonb)
  from (
    select * from public.worker_collector_item i
     where i.state = 'held' and (i.for_sale or i.for_trade)
       and (p_slug is null or i.archive_slug = p_slug)
       and (p_kind is null or (p_kind = 'sale' and i.for_sale) or (p_kind = 'trade' and i.for_trade))
       and (p_before is null or i.opened_at < p_before)
       and (auth.uid() is null or not public.worker_blocked(auth.uid(), i.user_id))
     order by i.opened_at desc nulls last
     limit least(greatest(coalesce(p_limit, 60), 1), 100)
  ) i
$$;

create or replace function public.worker_market_item(p_item uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_item public.worker_collector_item;
  v_me uuid := auth.uid();
begin
  select * into v_item from public.worker_collector_item where id = p_item;
  if not found then return public.worker_fail('not_found'); end if;
  if v_item.user_id is distinct from v_me then
    if v_item.state not in ('held', 'reserved') or not (v_item.for_sale or v_item.for_trade)
       or (v_me is not null and public.worker_blocked(v_me, v_item.user_id)) then
      -- מי שכבר בשיחה על הפריט רואה אותו גם אחרי שנסגר
      if not exists (select 1 from public.worker_collector_connection k
                      where k.item_id = p_item and v_me in (k.initiator_id, k.recipient_id)) then
        return public.worker_fail('not_found');
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'ok', true,
    'item', public.worker_item_public(v_item) || jsonb_build_object('mine', v_item.user_id = v_me),
    'connectionId', (select k.id from public.worker_collector_connection k
                      where k.item_id = p_item and k.initiator_id = v_me
                        and k.status in ('requested', 'accepted', 'negotiating', 'agreed') limit 1)
  );
end $$;

/*
 * מנוע ההתאמות (מפרט §13): החלפה כמעט מושלמת, החולצה שחיפשת הופיעה, מי רוצה חולצה שיש לך,
 * ומכירה פומבית של חולצה ברשימה שלך. כל הזהויות הן תוויות — אף פעם לא מזהה משתמש.
 */
create or replace function public.worker_market_matches() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object(
    'ok', true,
    'perfectSwaps', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'theirs', public.worker_item_public(t), 'mine', public.worker_item_owner(m))), '[]'::jsonb)
      from (
        select distinct on (t.id) t.id as tid, m.id as mid
          from public.worker_collector_item t
          join public.worker_collector_want mw on mw.user_id = v_me
               and public.worker_same_shirt(mw.archive_slug, mw.kit_id, t.archive_slug, t.kit_id)
          join public.worker_collector_want tw on tw.user_id = t.user_id
          join public.worker_collector_item m on m.user_id = v_me and m.state = 'held' and m.for_trade
               and public.worker_same_shirt(tw.archive_slug, tw.kit_id, m.archive_slug, m.kit_id)
         where t.user_id <> v_me and t.state = 'held' and t.for_trade
           and not public.worker_blocked(v_me, t.user_id)
         order by t.id, m.created_at
         limit 20
      ) pair
      join public.worker_collector_item t on t.id = pair.tid
      join public.worker_collector_item m on m.id = pair.mid
    ),
    'wanted', (
      select coalesce(jsonb_agg(public.worker_item_public(i) order by i.opened_at desc), '[]'::jsonb)
      from (
        select distinct on (i.id) i.* from public.worker_collector_item i
          join public.worker_collector_want w on w.user_id = v_me
               and public.worker_same_shirt(w.archive_slug, w.kit_id, i.archive_slug, i.kit_id)
         where i.user_id <> v_me and i.state = 'held' and (i.for_sale or i.for_trade)
           and not public.worker_blocked(v_me, i.user_id)
         order by i.id limit 40
      ) i
    ),
    'wantedByOthers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'item', public.worker_item_owner(m),
        'wanters', (select count(distinct w.user_id) from public.worker_collector_want w
                     where w.user_id <> v_me and public.worker_same_shirt(w.archive_slug, w.kit_id, m.archive_slug, m.kit_id)),
        'wantersWithTrades', (select count(distinct w.user_id) from public.worker_collector_want w
                     where w.user_id <> v_me and public.worker_same_shirt(w.archive_slug, w.kit_id, m.archive_slug, m.kit_id)
                       and exists (select 1 from public.worker_collector_item x
                                    where x.user_id = w.user_id and x.state = 'held' and x.for_trade))
      ) order by m.created_at desc), '[]'::jsonb)
      from public.worker_collector_item m
      where m.user_id = v_me and m.state = 'held'
        and exists (select 1 from public.worker_collector_want w
                     where w.user_id <> v_me and public.worker_same_shirt(w.archive_slug, w.kit_id, m.archive_slug, m.kit_id))
    ),
    'auctions', (
      select coalesce(jsonb_agg(public.worker_lot_brief(l) order by l.ends_at), '[]'::jsonb)
      from public.worker_auction_lot l
      join public.worker_collector_item i on i.id = l.item_id
      where l.status = 'scheduled' and l.ends_at > now() and l.seller_id <> v_me
        and exists (select 1 from public.worker_collector_want w
                     where w.user_id = v_me and public.worker_same_shirt(w.archive_slug, w.kit_id, i.archive_slug, i.kit_id))
    )
  );
end $$;

-- =====================================================================
-- 13. חיבור ושיחה — בתוך The Worker, בלי פרטי קשר (מפרט §14–§18)
-- =====================================================================
create or replace function public.worker_connection_counterpart(p_conn public.worker_collector_connection, p_me uuid)
returns uuid language sql immutable as $$
  select case when p_conn.initiator_id = p_me then p_conn.recipient_id else p_conn.initiator_id end
$$;

create or replace function public.worker_system_message(p_conn uuid, p_code text, p_meta jsonb default null) returns void
language sql security definer set search_path = public as $$
  insert into public.worker_collector_message (connection_id, sender_id, kind, body, meta)
  values (p_conn, null, 'system', p_code, p_meta);
  update public.worker_collector_connection set last_message_at = now() where id = p_conn;
$$;

create or replace function public.worker_connect(p_item uuid, p_kind text, p_body text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_item public.worker_collector_item;
  v_conn uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_kind not in ('buy', 'trade') then return public.worker_fail('bad_kind'); end if;
  select * into v_item from public.worker_collector_item where id = p_item;
  if not found or v_item.state <> 'held' then return public.worker_fail('not_available'); end if;
  if v_item.user_id = v_me then return public.worker_fail('own_item'); end if;
  if (p_kind = 'buy' and not v_item.for_sale) or (p_kind = 'trade' and not v_item.for_trade) then
    return public.worker_fail('not_available');
  end if;
  if public.worker_blocked(v_me, v_item.user_id) then return public.worker_fail('not_available'); end if;
  select id into v_conn from public.worker_collector_connection
    where initiator_id = v_me and item_id = p_item and status in ('requested', 'accepted', 'negotiating', 'agreed');
  if found then return jsonb_build_object('ok', true, 'connectionId', v_conn, 'existing', true); end if;
  if not public.worker_rate_ok(v_me, 'connect', 20, interval '1 day') then return public.worker_fail('slow_down'); end if;
  perform public.worker_collector_touch(v_me);
  insert into public.worker_collector_connection (initiator_id, recipient_id, item_id, kind, initiator_read_at)
    values (v_me, v_item.user_id, p_item, p_kind, now())
    returning id into v_conn;
  if nullif(trim(coalesce(p_body, '')), '') is not null then
    insert into public.worker_collector_message (connection_id, sender_id, kind, body)
      values (v_conn, v_me, 'text', left(trim(p_body), 1000));
  end if;
  perform public.worker_notify(v_item.user_id, 'COLLECTOR_ITEM_REQUESTED',
    jsonb_build_object('connectionId', v_conn, 'itemId', p_item, 'archiveSlug', v_item.archive_slug,
                       'kind', p_kind, 'from', public.worker_collector_label(v_me) -> 'handle'),
    'req:' || v_conn::text);
  return jsonb_build_object('ok', true, 'connectionId', v_conn, 'existing', false);
end $$;

create or replace function public.worker_connection_respond(p_conn uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn for update;
  if not found or v_c.recipient_id <> v_me then return public.worker_fail('not_found'); end if;
  if v_c.status <> 'requested' then return public.worker_fail('bad_state'); end if;
  update public.worker_collector_connection
     set status = case when p_accept then 'accepted' else 'declined' end, recipient_read_at = now()
   where id = p_conn;
  perform public.worker_system_message(p_conn, case when p_accept then 'accepted' else 'declined' end);
  perform public.worker_notify(v_c.initiator_id,
    case when p_accept then 'COLLECTOR_REQUEST_ACCEPTED' else 'COLLECTOR_REQUEST_DECLINED' end,
    jsonb_build_object('connectionId', p_conn), 'resp:' || p_conn::text);
  return jsonb_build_object('ok', true, 'status', case when p_accept then 'accepted' else 'declined' end);
end $$;

create or replace function public.worker_message_send(p_conn uuid, p_body text, p_kind text default 'text') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
  v_other uuid;
  v_body text := left(trim(coalesce(p_body, '')), 1000);
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_kind not in ('text', 'photo_request') then return public.worker_fail('bad_kind'); end if;
  if p_kind = 'text' and v_body = '' then return public.worker_fail('empty'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn for update;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  if v_c.status not in ('requested', 'accepted', 'negotiating', 'agreed') then return public.worker_fail('closed'); end if;
  v_other := public.worker_connection_counterpart(v_c, v_me);
  if public.worker_blocked(v_me, v_other) then return public.worker_fail('closed'); end if;
  if not public.worker_rate_ok(v_me, 'message', 60, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  insert into public.worker_collector_message (connection_id, sender_id, kind, body)
    values (p_conn, v_me, p_kind, nullif(v_body, ''));
  update public.worker_collector_connection set
    last_message_at = now(),
    -- תשובה של המקבל לבקשה היא קבלה שלה
    status = case when v_c.status = 'requested' and v_me = v_c.recipient_id then 'accepted' else status end,
    initiator_read_at = case when v_me = initiator_id then now() else initiator_read_at end,
    recipient_read_at = case when v_me = recipient_id then now() else recipient_read_at end
  where id = p_conn;
  perform public.worker_notify(v_other, 'COLLECTOR_MESSAGE', jsonb_build_object('connectionId', p_conn),
    'msg:' || p_conn::text || ':' || to_char(date_trunc('hour', now()), 'YYYYMMDDHH24'));
  return jsonb_build_object('ok', true);
end $$;

/* הצעת מחיר או הצעת החלפה. הצעה חדשה של אותו צד מחליפה את הפתוחה שלו. */
create or replace function public.worker_offer_make(
  p_conn uuid, p_kind text, p_amount numeric default null, p_currency text default 'ILS', p_items uuid[] default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
  v_offer uuid;
  v_other uuid;
  v_slugs jsonb;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_kind not in ('price', 'trade') then return public.worker_fail('bad_kind'); end if;
  if coalesce(p_currency, 'ILS') not in ('ILS', 'EUR', 'USD') then return public.worker_fail('bad_currency'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn for update;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  if v_c.status not in ('requested', 'accepted', 'negotiating') then return public.worker_fail('closed'); end if;
  v_other := public.worker_connection_counterpart(v_c, v_me);
  if public.worker_blocked(v_me, v_other) then return public.worker_fail('closed'); end if;
  if p_kind = 'price' and (p_amount is null or p_amount <= 0 or p_amount > 99999999) then return public.worker_fail('bad_amount'); end if;
  -- רק מי שביקש מציע חולצות שלו בתמורה; המחזיק נותן את החולצה שעליה השיחה
  if p_kind = 'trade' and v_me <> v_c.initiator_id then return public.worker_fail('bad_items'); end if;
  if p_kind = 'trade' then
    if p_items is null or cardinality(p_items) = 0 or cardinality(p_items) > 6 then return public.worker_fail('bad_items'); end if;
    if (select count(*) from public.worker_collector_item
         where id = any(p_items) and user_id = v_me and state = 'held') <> cardinality(p_items) then
      return public.worker_fail('bad_items');
    end if;
  end if;
  if not public.worker_rate_ok(v_me, 'offer', 30, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  update public.worker_collector_offer set status = 'superseded', responded_at = now()
   where connection_id = p_conn and sender_id = v_me and status = 'open';
  insert into public.worker_collector_offer (connection_id, sender_id, kind, amount, currency)
    values (p_conn, v_me, p_kind, case when p_kind = 'price' then round(p_amount, 2) end, coalesce(p_currency, 'ILS'))
    returning id into v_offer;
  if p_kind = 'trade' then
    insert into public.worker_collector_offer_item (offer_id, item_id) select v_offer, unnest(p_items);
    select coalesce(jsonb_agg(archive_slug), '[]'::jsonb) into v_slugs from public.worker_collector_item where id = any(p_items);
  end if;
  insert into public.worker_collector_message (connection_id, sender_id, kind, meta)
    values (p_conn, v_me, 'offer', jsonb_build_object('offerId', v_offer, 'kind', p_kind,
            'amount', case when p_kind = 'price' then round(p_amount, 2) end, 'currency', coalesce(p_currency, 'ILS'),
            'items', v_slugs));
  update public.worker_collector_connection set status = 'negotiating', last_message_at = now() where id = p_conn;
  perform public.worker_notify(v_other, 'COLLECTOR_OFFER_RECEIVED',
    jsonb_build_object('connectionId', p_conn, 'offerId', v_offer, 'kind', p_kind,
                       'amount', case when p_kind = 'price' then round(p_amount, 2) end, 'currency', coalesce(p_currency, 'ILS')),
    'offer:' || v_offer::text);
  return jsonb_build_object('ok', true, 'offerId', v_offer);
end $$;

/* הצד השני עונה: לקבל, לדחות, או להציע מחיר נגדי. קבלה שומרת את הפריטים לעסקה. */
create or replace function public.worker_offer_respond(p_offer uuid, p_action text, p_amount numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_o public.worker_collector_offer;
  v_c public.worker_collector_connection;
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
  update public.worker_collector_offer set status = 'countered', responded_at = now() where id = p_offer;
  return public.worker_offer_make(v_c.id, 'price', p_amount, v_o.currency, null);
end $$;

/*
 * שלבי העסקה: 'agreed' (סיכמנו), 'done' (הצד שלי הושלם — שני הצדדים = COMPLETED),
 * 'cancel' (ביטול / לא הסתדר). השלמה מסמנת את הפריטים כנמכרו או הוחלפו, וסוגרת חיבורים אחרים עליהם.
 */
create or replace function public.worker_connection_step(p_conn uuid, p_step text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
  v_other uuid;
  v_offer uuid;
  v_final text;
  v_lot uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_step not in ('agreed', 'done', 'cancel') then return public.worker_fail('bad_step'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn for update;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  v_other := public.worker_connection_counterpart(v_c, v_me);
  -- שיחה של זוכה ומוכר: הלוט מחזיק את ההשלמה; ביטול עובר דרך המנהל (מפרט §39, §65)
  select id into v_lot from public.worker_auction_lot where connection_id = p_conn and status = 'awaiting_completion';
  if v_lot is not null then
    if p_step = 'done' then return public.worker_auction_complete(v_lot); end if;
    if p_step = 'cancel' then return public.worker_fail('busy'); end if;
    return jsonb_build_object('ok', true, 'status', 'agreed');
  end if;
  select id into v_offer from public.worker_collector_offer where connection_id = p_conn and status = 'accepted'
    order by responded_at desc limit 1;

  if p_step = 'agreed' then
    if v_c.status not in ('accepted', 'negotiating', 'agreed') then return public.worker_fail('bad_state'); end if;
    if not exists (select 1 from public.worker_collector_item where id = v_c.item_id and state in ('held', 'reserved')) then
      return public.worker_fail('items_gone');
    end if;
    update public.worker_collector_connection set status = 'agreed' where id = p_conn;
    update public.worker_collector_item set state = 'reserved' where id = v_c.item_id and state = 'held';
    perform public.worker_system_message(p_conn, 'agreed');
    return jsonb_build_object('ok', true, 'status', 'agreed');
  end if;

  if p_step = 'cancel' then
    if v_c.status in ('completed', 'declined', 'cancelled') then return public.worker_fail('bad_state'); end if;
    update public.worker_collector_connection set status = 'cancelled' where id = p_conn;
    update public.worker_collector_item set state = 'held'
     where state = 'reserved' and (id = v_c.item_id or id in (select item_id from public.worker_collector_offer_item where offer_id = v_offer));
    update public.worker_collector_offer set status = 'withdrawn', responded_at = now() where connection_id = p_conn and status = 'open';
    perform public.worker_system_message(p_conn, 'cancelled');
    perform public.worker_notify(v_other, 'CONNECTION_CANCELLED', jsonb_build_object('connectionId', p_conn), 'cancel:' || p_conn::text);
    return jsonb_build_object('ok', true, 'status', 'cancelled');
  end if;

  -- done
  if v_c.status <> 'agreed' then return public.worker_fail('bad_state'); end if;
  update public.worker_collector_connection set
    initiator_done_at = case when v_me = initiator_id then coalesce(initiator_done_at, now()) else initiator_done_at end,
    recipient_done_at = case when v_me = recipient_id then coalesce(recipient_done_at, now()) else recipient_done_at end
  where id = p_conn
  returning * into v_c;
  if v_c.initiator_done_at is null or v_c.recipient_done_at is null then
    perform public.worker_system_message(p_conn, 'half_done');
    return jsonb_build_object('ok', true, 'status', 'agreed', 'waitingForOther', true);
  end if;
  v_final := case when v_c.kind = 'trade' then 'traded' else 'sold' end;
  update public.worker_collector_connection set status = 'completed' where id = p_conn;
  update public.worker_collector_item set state = v_final, for_sale = false, for_trade = false
   where id = v_c.item_id or id in (select item_id from public.worker_collector_offer_item where offer_id = v_offer);
  -- חיבורים אחרים על אותם פריטים נסגרים
  update public.worker_collector_connection k set status = 'cancelled'
   where k.id <> p_conn and k.status in ('requested', 'accepted', 'negotiating', 'agreed')
     and (k.item_id = v_c.item_id or k.item_id in (select item_id from public.worker_collector_offer_item where offer_id = v_offer));
  perform public.worker_system_message(p_conn, 'completed');
  perform public.worker_notify(v_other, 'CONNECTION_COMPLETED', jsonb_build_object('connectionId', p_conn, 'kind', v_c.kind),
    'done:' || p_conn::text);
  return jsonb_build_object('ok', true, 'status', 'completed', 'kind', v_c.kind);
end $$;

create or replace function public.worker_my_connections() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object('ok', true, 'connections', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.id, 'kind', k.kind, 'status', k.status,
      'role', case when k.initiator_id = v_me then 'initiator' else 'recipient' end,
      'counterpart', public.worker_collector_label(public.worker_connection_counterpart(k, v_me)),
      'item', (select public.worker_item_public(i) - 'seller' from public.worker_collector_item i where i.id = k.item_id),
      'lastMessageAt', k.last_message_at,
      'unread', k.last_message_at > coalesce(case when k.initiator_id = v_me then k.initiator_read_at else k.recipient_read_at end, '-infinity'::timestamptz)
                and exists (select 1 from public.worker_collector_message m
                             where m.connection_id = k.id and m.created_at = k.last_message_at
                               and m.sender_id is distinct from v_me),
      'myDone', case when k.initiator_id = v_me then k.initiator_done_at else k.recipient_done_at end is not null,
      'theirDone', case when k.initiator_id = v_me then k.recipient_done_at else k.initiator_done_at end is not null
    ) order by k.last_message_at desc), '[]'::jsonb)
    from public.worker_collector_connection k
    where v_me in (k.initiator_id, k.recipient_id)
  ));
end $$;

/* השיחה עצמה — רק לשני הצדדים. קריאה מסמנת נקרא. */
create or replace function public.worker_connection_thread(p_conn uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_c public.worker_collector_connection;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn;
  if not found or v_me not in (v_c.initiator_id, v_c.recipient_id) then return public.worker_fail('not_found'); end if;
  update public.worker_collector_connection set
    initiator_read_at = case when v_me = initiator_id then now() else initiator_read_at end,
    recipient_read_at = case when v_me = recipient_id then now() else recipient_read_at end
  where id = p_conn;
  update public.worker_notification set read_at = now()
   where user_id = v_me and read_at is null and payload ->> 'connectionId' = p_conn::text;
  return public.worker_thread_payload(v_c, v_me);
end $$;

create or replace function public.worker_thread_payload(v_c public.worker_collector_connection, v_me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok', true,
    'connection', jsonb_build_object(
      'id', v_c.id, 'kind', v_c.kind, 'status', v_c.status,
      'role', case when v_c.initiator_id = v_me then 'initiator' when v_c.recipient_id = v_me then 'recipient' else 'observer' end,
      'myDone', case when v_c.initiator_id = v_me then v_c.initiator_done_at else v_c.recipient_done_at end is not null,
      'theirDone', case when v_c.initiator_id = v_me then v_c.recipient_done_at else v_c.initiator_done_at end is not null,
      'createdAt', v_c.created_at,
      'lotId', (select l.id from public.worker_auction_lot l where l.connection_id = v_c.id limit 1)),
    'initiator', public.worker_collector_label(v_c.initiator_id),
    'recipient', public.worker_collector_label(v_c.recipient_id),
    'item', (select public.worker_item_public(i) - 'seller' from public.worker_collector_item i where i.id = v_c.item_id),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', m.id, 'kind', m.kind, 'body', m.body, 'meta', m.meta, 'createdAt', m.created_at,
                   'from', case when m.sender_id is null then 'system'
                                when m.sender_id = v_c.initiator_id then 'initiator' else 'recipient' end
                 ) order by m.created_at), '[]'::jsonb)
                 from (select * from public.worker_collector_message where connection_id = v_c.id
                        order by created_at desc limit 300) m),
    'offers', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', o.id, 'kind', o.kind, 'amount', o.amount, 'currency', o.currency, 'status', o.status,
                 'from', case when o.sender_id = v_c.initiator_id then 'initiator' else 'recipient' end,
                 'createdAt', o.created_at,
                 'items', (select coalesce(jsonb_agg(public.worker_item_public(i) - 'seller'), '[]'::jsonb)
                             from public.worker_collector_offer_item oi join public.worker_collector_item i on i.id = oi.item_id
                            where oi.offer_id = o.id)
               ) order by o.created_at), '[]'::jsonb)
               from public.worker_collector_offer o where o.connection_id = v_c.id)
  )
$$;

/* חסימה לפי מספר אספן. חסימה סוגרת כל חיבור פתוח בין השניים. */
create or replace function public.worker_block_set(p_handle integer, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_target uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select user_id into v_target from public.worker_collector_profile where handle_no = p_handle;
  if v_target is null or v_target = v_me then return public.worker_fail('not_found'); end if;
  perform public.worker_collector_touch(v_me);
  if coalesce(p_on, false) then
    insert into public.worker_collector_block (blocker_id, blocked_id) values (v_me, v_target) on conflict do nothing;
    update public.worker_collector_connection set status = 'cancelled'
     where status in ('requested', 'accepted', 'negotiating', 'agreed')
       and ((initiator_id = v_me and recipient_id = v_target) or (initiator_id = v_target and recipient_id = v_me));
    update public.worker_collector_item i set state = 'held'
     where i.state = 'reserved' and i.user_id in (v_me, v_target)
       and not exists (select 1 from public.worker_collector_connection k
                        where k.item_id = i.id and k.status = 'agreed')
       and not exists (select 1 from public.worker_auction_lot l
                        where l.item_id = i.id and l.status = 'awaiting_completion');
  else
    delete from public.worker_collector_block where blocker_id = v_me and blocked_id = v_target;
  end if;
  return jsonb_build_object('ok', true, 'blocked', coalesce(p_on, false));
end $$;

create or replace function public.worker_report(
  p_reason text, p_details text default null, p_connection uuid default null, p_item uuid default null,
  p_lot uuid default null, p_handle integer default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_reported uuid;
  v_id uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_reason not in ('scam', 'fake', 'abuse', 'spam', 'other') then return public.worker_fail('bad_reason'); end if;
  if not public.worker_rate_ok(v_me, 'report', 10, interval '1 day') then return public.worker_fail('slow_down'); end if;
  if p_connection is not null then
    select public.worker_connection_counterpart(k, v_me) into v_reported from public.worker_collector_connection k
     where k.id = p_connection and v_me in (k.initiator_id, k.recipient_id);
    if v_reported is null then return public.worker_fail('not_found'); end if;
    update public.worker_collector_connection set status = 'reported'
     where id = p_connection and status in ('requested', 'accepted', 'negotiating');
  elsif p_item is not null then
    select user_id into v_reported from public.worker_collector_item where id = p_item;
  elsif p_lot is not null then
    select seller_id into v_reported from public.worker_auction_lot where id = p_lot;
  elsif p_handle is not null then
    select user_id into v_reported from public.worker_collector_profile where handle_no = p_handle;
  end if;
  if v_reported is null or v_reported = v_me then return public.worker_fail('not_found'); end if;
  perform public.worker_collector_touch(v_me);
  insert into public.worker_collector_report (reporter_id, reported_id, connection_id, item_id, lot_id, reason, details)
    values (v_me, v_reported, p_connection, p_item, p_lot, p_reason, nullif(left(trim(coalesce(p_details, '')), 1000), ''))
    returning id into v_id;
  perform public.worker_notify(a.user_id, 'REPORT_RECEIVED', jsonb_build_object('reportId', v_id, 'reason', p_reason), 'report:' || v_id::text)
    from public.worker_admin a;
  return jsonb_build_object('ok', true, 'reportId', v_id);
end $$;

-- =====================================================================
-- 14. המכירה הפומבית — אירוע, לא מודעה (מפרט §28–§39)
-- =====================================================================

/* השלב כפי שהקהל רואה אותו, מחושב מהשעון. */
create or replace function public.worker_lot_phase(p_lot public.worker_auction_lot) returns text
language sql stable as $$
  select case
    when p_lot.status = 'scheduled' and now() < p_lot.starts_at then 'upcoming'
    when p_lot.status = 'scheduled' and now() < p_lot.ends_at then 'live'
    when p_lot.status = 'scheduled' then 'closing'
    when p_lot.status = 'pending_approval' then 'pending'
    else p_lot.status
  end
$$;

create or replace function public.worker_lot_brief(p_lot public.worker_auction_lot) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_lot.id, 'title', p_lot.title, 'phase', public.worker_lot_phase(p_lot),
    'archiveSlug', i.archive_slug, 'kitId', i.kit_id,
    'photo', (select p.storage_path from public.worker_collector_photo p where p.item_id = i.id order by p.sort_order limit 1),
    'currency', p_lot.currency, 'startPrice', p_lot.start_price,
    'currentPrice', coalesce(p_lot.current_price, p_lot.start_price),
    'bidCount', p_lot.bid_count, 'startsAt', p_lot.starts_at, 'endsAt', p_lot.ends_at,
    'reserveSet', p_lot.reserve_price is not null,
    'reserveMet', p_lot.reserve_price is null or coalesce(p_lot.current_price, 0) >= p_lot.reserve_price
  )
  from public.worker_collector_item i where i.id = p_lot.item_id
$$;

/* סגירה עצלה: כשלוט שזמנו עבר נקרא או נוגעים בו, הוא נסגר כאן — בלי שום משימה מתוזמנת. */
create or replace function public.worker_auction_settle(p_lot uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_l public.worker_auction_lot;
  v_conn uuid;
begin
  select * into v_l from public.worker_auction_lot where id = p_lot for update;
  if not found or v_l.status <> 'scheduled' or now() < v_l.ends_at then return; end if;
  if v_l.bid_count > 0 and v_l.leader_id is not null
     and (v_l.reserve_price is null or v_l.current_price >= v_l.reserve_price) then
    -- ערוץ לזוכה ולמוכר: חיבור 'agreed' על הפריט, כמו עסקה שסוכמה בשוק. ההשלמה עוברת דרך הלוט.
    select id into v_conn from public.worker_collector_connection
     where initiator_id = v_l.leader_id and item_id = v_l.item_id
       and status in ('requested', 'accepted', 'negotiating', 'agreed');
    if v_conn is null then
      insert into public.worker_collector_connection (initiator_id, recipient_id, item_id, kind, status)
        values (v_l.leader_id, v_l.seller_id, v_l.item_id, 'buy', 'agreed')
        returning id into v_conn;
    else
      update public.worker_collector_connection set status = 'agreed' where id = v_conn;
    end if;
    update public.worker_auction_lot
       set status = 'awaiting_completion', winner_id = leader_id, winning_amount = current_price, connection_id = v_conn
     where id = p_lot;
    update public.worker_collector_item set state = 'reserved' where id = v_l.item_id and state = 'held';
    perform public.worker_system_message(v_conn, 'auction_won',
      jsonb_build_object('lotId', p_lot, 'amount', v_l.current_price, 'currency', v_l.currency));
    perform public.worker_notify(v_l.leader_id, 'AUCTION_WON',
      jsonb_build_object('lotId', p_lot, 'connectionId', v_conn, 'amount', v_l.current_price, 'currency', v_l.currency),
      'won:' || p_lot::text);
    perform public.worker_notify(v_l.seller_id, 'AUCTION_SOLD',
      jsonb_build_object('lotId', p_lot, 'connectionId', v_conn, 'amount', v_l.current_price, 'currency', v_l.currency),
      'sold:' || p_lot::text);
  else
    update public.worker_auction_lot set status = 'ended' where id = p_lot;
    perform public.worker_notify(v_l.seller_id, 'AUCTION_UNSOLD',
      jsonb_build_object('lotId', p_lot, 'reserveMissed', v_l.bid_count > 0), 'unsold:' || p_lot::text);
  end if;
end $$;

create or replace function public.worker_auction_settle_due() returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  for v_id in select id from public.worker_auction_lot where status = 'scheduled' and ends_at <= now() limit 50 loop
    perform public.worker_auction_settle(v_id);
  end loop;
end $$;

/* בקשה להעמיד פריט למכירה פומבית. המנהל מאשר וקובע מועד (מפרט §30, §32). */
create or replace function public.worker_auction_submit(
  p_item uuid, p_title text, p_description text, p_start numeric, p_reserve numeric default null,
  p_currency text default 'ILS', p_hours integer default 72, p_increment numeric default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_item public.worker_collector_item;
  v_lot uuid;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into v_item from public.worker_collector_item where id = p_item and user_id = v_me for update;
  if not found then return public.worker_fail('not_found'); end if;
  if v_item.state <> 'held' then return public.worker_fail('busy'); end if;
  if v_item.size is null or v_item.condition is null or v_item.item_type = 'unknown' then
    return public.worker_fail('details_required');
  end if;
  if (select count(*) from public.worker_collector_photo where item_id = p_item) < 2 then
    return public.worker_fail('photos_required');
  end if;
  if exists (select 1 from public.worker_auction_lot where item_id = p_item
              and status in ('pending_approval', 'scheduled', 'awaiting_completion'))
     or exists (select 1 from public.worker_collector_connection where item_id = p_item and status = 'agreed') then
    return public.worker_fail('busy');
  end if;
  if not public.worker_rate_ok(v_me, 'auction_submit', 5, interval '1 day') then return public.worker_fail('slow_down'); end if;
  begin
    insert into public.worker_auction_lot (seller_id, item_id, title, description, start_price, reserve_price,
                                           currency, requested_hours, min_increment)
      values (v_me, p_item, trim(p_title), trim(p_description), round(p_start, 2), round(p_reserve, 2),
              coalesce(p_currency, 'ILS'), coalesce(p_hours, 72),
              coalesce(round(p_increment, 2), greatest(round(p_start * 0.05, 0), 5)))
      returning id into v_lot;
  exception when check_violation or not_null_violation then
    return public.worker_fail('bad_value');
  end;
  perform public.worker_notify(a.user_id, 'AUCTION_SUBMITTED', jsonb_build_object('lotId', v_lot), 'submit:' || v_lot::text)
    from public.worker_admin a;
  return jsonb_build_object('ok', true, 'lotId', v_lot);
end $$;

/* המוכר מושך את הבקשה — לפני אישור, או לפני ההצעה הראשונה. */
create or replace function public.worker_auction_withdraw(p_lot uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_l public.worker_auction_lot;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into v_l from public.worker_auction_lot where id = p_lot and seller_id = v_me for update;
  if not found then return public.worker_fail('not_found'); end if;
  if not (v_l.status = 'pending_approval' or (v_l.status = 'scheduled' and v_l.bid_count = 0)) then
    return public.worker_fail('bad_state');
  end if;
  update public.worker_auction_lot set status = 'cancelled', decision_note = 'withdrawn by seller' where id = p_lot;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.worker_auction_list(p_scope text default 'open') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  perform public.worker_auction_settle_due();
  return jsonb_build_object('ok', true, 'lots', (
    select coalesce(jsonb_agg(public.worker_lot_brief(l) order by coalesce(l.ends_at, l.created_at)), '[]'::jsonb)
    from public.worker_auction_lot l
    where case coalesce(p_scope, 'open')
      when 'open' then l.status = 'scheduled'
      when 'recent' then l.status in ('awaiting_completion', 'completed', 'ended') and l.updated_at > now() - interval '30 days'
      when 'mine' then v_me is not null and (l.seller_id = v_me or exists (
                         select 1 from public.worker_auction_bid b where b.lot_id = l.id and b.bidder_id = v_me))
      else false end
    limit 100
  ));
end $$;

/* מצב הלוט לקהל: מחיר, מספר הצעות, האם המינימום הושג — בלי המינימום עצמו ובלי זהות המציעים. */
create or replace function public.worker_auction_state(p_lot uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_l public.worker_auction_lot;
  v_item public.worker_collector_item;
begin
  perform public.worker_auction_settle(p_lot);
  select * into v_l from public.worker_auction_lot where id = p_lot;
  if not found or (v_l.status in ('pending_approval', 'rejected') and v_l.seller_id is distinct from v_me) then
    return public.worker_fail('not_found');
  end if;
  select * into v_item from public.worker_collector_item where id = v_l.item_id;
  return jsonb_build_object(
    'ok', true,
    'lot', public.worker_lot_brief(v_l) || jsonb_build_object(
      'description', v_l.description, 'minIncrement', v_l.min_increment,
      'antiSnipeSeconds', v_l.anti_snipe_seconds, 'requestedHours', v_l.requested_hours,
      'minNext', case when v_l.bid_count = 0 then v_l.start_price else v_l.current_price + v_l.min_increment end,
      'isSeller', v_l.seller_id = v_me,
      'leading', v_me is not null and v_l.leader_id = v_me,
      'yourMax', (select max(b.max_amount) from public.worker_auction_bid b
                   where b.lot_id = p_lot and b.bidder_id = v_me and b.status = 'active' and not b.is_proxy),
      'watching', exists (select 1 from public.worker_auction_watch w where w.lot_id = p_lot and w.user_id = v_me),
      'watchers', (select count(*) from public.worker_auction_watch w where w.lot_id = p_lot),
      'won', v_me is not null and v_l.winner_id = v_me,
      'winningAmount', case when v_me in (v_l.winner_id, v_l.seller_id) then v_l.winning_amount end,
      'reservePrice', case when v_me = v_l.seller_id then v_l.reserve_price end,
      'decisionNote', case when v_me = v_l.seller_id then v_l.decision_note end,
      'sellerDone', v_l.seller_done_at is not null, 'winnerDone', v_l.winner_done_at is not null,
      'connectionId', case when v_me in (v_l.winner_id, v_l.seller_id) then v_l.connection_id end),
    'item', public.worker_item_public(v_item),
    'bids', (select coalesce(jsonb_agg(jsonb_build_object(
               'amount', b.amount, 'at', b.created_at, 'proxy', b.is_proxy,
               'bidder', ranks.n, 'you', b.bidder_id = v_me
             ) order by b.created_at desc), '[]'::jsonb)
             from (select * from public.worker_auction_bid where lot_id = p_lot and status = 'active'
                    order by created_at desc limit 40) b
             join (select bidder_id, row_number() over (order by min(created_at)) as n
                     from public.worker_auction_bid where lot_id = p_lot group by bidder_id) ranks
               on ranks.bidder_id = b.bidder_id)
  );
end $$;

/*
 * הצעה — עם Max Bid (מפרט §35): המערכת מציעה בשמך עד התקרה, בצעדי ההעלאה של הלוט.
 * המוכר לא יכול להציע על הפריט שלו (§38). הצעה בדקות האחרונות מאריכה את השעון (§36).
 */
create or replace function public.worker_auction_bid(p_lot uuid, p_max numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_l public.worker_auction_lot;
  v_max numeric(10, 2) := round(p_max, 2);
  v_min numeric(10, 2);
  v_price numeric(10, 2);
  v_prev_leader uuid;
  v_leading boolean;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  perform public.worker_auction_settle(p_lot);
  select * into v_l from public.worker_auction_lot where id = p_lot for update;
  if not found then return public.worker_fail('not_found'); end if;
  if public.worker_lot_phase(v_l) <> 'live' then return public.worker_fail('not_live'); end if;
  if v_l.seller_id = v_me then return public.worker_fail('own_lot'); end if;
  if public.worker_blocked(v_me, v_l.seller_id) then return public.worker_fail('not_live'); end if;
  if v_max is null or v_max <= 0 or v_max > 99999999 then return public.worker_fail('bad_amount'); end if;
  if not public.worker_rate_ok(v_me, 'bid', 30, interval '10 minutes') then return public.worker_fail('slow_down'); end if;
  perform public.worker_collector_touch(v_me);
  v_min := case when v_l.bid_count = 0 then v_l.start_price else v_l.current_price + v_l.min_increment end;
  v_prev_leader := v_l.leader_id;

  if v_l.leader_id = v_me then
    if v_max <= v_l.leader_max then return public.worker_fail('raise_above_your_max', jsonb_build_object('yourMax', v_l.leader_max)); end if;
    v_price := v_l.current_price;
    if v_l.reserve_price is not null and v_price < v_l.reserve_price and v_max >= v_l.reserve_price then
      v_price := v_l.reserve_price;
    end if;
    insert into public.worker_auction_bid (lot_id, bidder_id, amount, max_amount) values (p_lot, v_me, v_price, v_max);
    update public.worker_auction_lot set leader_max = v_max, current_price = v_price where id = p_lot;
    v_leading := true;
  elsif v_max < v_min then
    return public.worker_fail('too_low', jsonb_build_object('minNext', v_min));
  elsif v_l.leader_id is null then
    v_price := v_l.start_price;
    if v_l.reserve_price is not null and v_max >= v_l.reserve_price then v_price := greatest(v_price, v_l.reserve_price); end if;
    insert into public.worker_auction_bid (lot_id, bidder_id, amount, max_amount) values (p_lot, v_me, v_price, v_max);
    update public.worker_auction_lot set leader_id = v_me, leader_max = v_max, current_price = v_price,
           bid_count = bid_count + 1 where id = p_lot;
    v_leading := true;
  elsif v_max > v_l.leader_max then
    v_price := least(v_max, v_l.leader_max + v_l.min_increment);
    if v_l.reserve_price is not null and v_price < v_l.reserve_price and v_max >= v_l.reserve_price then
      v_price := v_l.reserve_price;
    end if;
    insert into public.worker_auction_bid (lot_id, bidder_id, amount, max_amount) values (p_lot, v_me, v_price, v_max);
    update public.worker_auction_lot set leader_id = v_me, leader_max = v_max, current_price = v_price,
           bid_count = bid_count + 1 where id = p_lot;
    perform public.worker_notify(v_prev_leader, 'AUCTION_OUTBID',
      jsonb_build_object('lotId', p_lot, 'price', v_price, 'currency', v_l.currency));
    v_leading := true;
  else
    -- התקרה של המוביל גבוהה או שווה: הוא נשאר מוביל, והמחיר עולה עד מעט מעל ההצעה החדשה.
    v_price := least(v_l.leader_max, v_max + v_l.min_increment);
    insert into public.worker_auction_bid (lot_id, bidder_id, amount, max_amount) values (p_lot, v_me, v_max, v_max);
    insert into public.worker_auction_bid (lot_id, bidder_id, amount, max_amount, is_proxy)
      values (p_lot, v_l.leader_id, v_price, v_l.leader_max, true);
    update public.worker_auction_lot set current_price = v_price, bid_count = bid_count + 2 where id = p_lot;
    v_leading := false;
  end if;

  -- Anti-sniping: הצעה בחלון האחרון מאריכה את הסיום לאורך החלון מעכשיו.
  update public.worker_auction_lot
     set ends_at = greatest(ends_at, now() + make_interval(secs => anti_snipe_seconds))
   where id = p_lot and ends_at - now() < make_interval(secs => anti_snipe_seconds);
  insert into public.worker_auction_watch (lot_id, user_id) values (p_lot, v_me) on conflict do nothing;

  return jsonb_build_object('ok', true, 'leading', v_leading) || jsonb_build_object('state', public.worker_auction_state(p_lot));
end $$;

create or replace function public.worker_auction_watch(p_lot uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not exists (select 1 from public.worker_auction_lot where id = p_lot and status = 'scheduled') then
    return public.worker_fail('not_found');
  end if;
  perform public.worker_collector_touch(v_me);
  if coalesce(p_on, false) then
    insert into public.worker_auction_watch (lot_id, user_id) values (p_lot, v_me) on conflict do nothing;
  else
    delete from public.worker_auction_watch where lot_id = p_lot and user_id = v_me;
  end if;
  return jsonb_build_object('ok', true, 'watching', coalesce(p_on, false));
end $$;

/* הזוכה והמוכר מסמנים שהעסקה הושלמה. שניהם = COMPLETED. התשלום ביניהם — מחוץ למערכת (§39). */
create or replace function public.worker_auction_complete(p_lot uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_l public.worker_auction_lot;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  perform public.worker_auction_settle(p_lot);
  select * into v_l from public.worker_auction_lot where id = p_lot for update;
  if not found or v_me not in (v_l.seller_id, v_l.winner_id) then return public.worker_fail('not_found'); end if;
  if v_l.status <> 'awaiting_completion' then return public.worker_fail('bad_state'); end if;
  update public.worker_auction_lot set
    seller_done_at = case when v_me = seller_id then coalesce(seller_done_at, now()) else seller_done_at end,
    winner_done_at = case when v_me = winner_id then coalesce(winner_done_at, now()) else winner_done_at end
  where id = p_lot returning * into v_l;
  update public.worker_collector_connection
     set initiator_done_at = v_l.winner_done_at, recipient_done_at = v_l.seller_done_at
   where id = v_l.connection_id;
  if v_l.seller_done_at is null or v_l.winner_done_at is null then
    if v_l.connection_id is not null then perform public.worker_system_message(v_l.connection_id, 'half_done'); end if;
    return jsonb_build_object('ok', true, 'status', 'awaiting_completion', 'waitingForOther', true);
  end if;
  update public.worker_auction_lot set status = 'completed' where id = p_lot;
  update public.worker_collector_item set state = 'sold', for_sale = false, for_trade = false where id = v_l.item_id;
  if v_l.connection_id is not null then
    update public.worker_collector_connection set status = 'completed' where id = v_l.connection_id;
    perform public.worker_system_message(v_l.connection_id, 'completed');
  end if;
  -- חיבורים אחרים על הפריט נסגרים, כמו בהשלמה בשוק
  update public.worker_collector_connection k set status = 'cancelled'
   where k.item_id = v_l.item_id and k.id is distinct from v_l.connection_id
     and k.status in ('requested', 'accepted', 'negotiating', 'agreed');
  perform public.worker_notify(case when v_me = v_l.seller_id then v_l.winner_id else v_l.seller_id end,
    'CONNECTION_COMPLETED', jsonb_build_object('lotId', p_lot, 'kind', 'auction'), 'lotdone:' || p_lot::text);
  return jsonb_build_object('ok', true, 'status', 'completed');
end $$;

-- =====================================================================
-- 15. התראות — נוצרות באירוע, ומה שתלוי בשעון נוצר כשמסתכלים
-- =====================================================================
create or replace function public.worker_notifications(p_limit integer default 50) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  perform public.worker_auction_settle_due();
  -- מכירה שהתחילה, ומכירה שנסגרת בשעה הקרובה — למי שעוקב או הציע. פעם אחת ללוט.
  perform public.worker_notify(v_me, 'AUCTION_STARTED', jsonb_build_object('lotId', l.id, 'endsAt', l.ends_at), 'start:' || l.id::text)
    from public.worker_auction_lot l
   where l.status = 'scheduled' and l.starts_at <= now() and l.ends_at > now() and l.seller_id <> v_me
     and exists (select 1 from public.worker_auction_watch w where w.lot_id = l.id and w.user_id = v_me);
  perform public.worker_notify(v_me, 'AUCTION_ENDING', jsonb_build_object('lotId', l.id, 'endsAt', l.ends_at), 'ending:' || l.id::text)
    from public.worker_auction_lot l
   where l.status = 'scheduled' and l.ends_at > now() and l.ends_at <= now() + interval '1 hour' and l.seller_id <> v_me
     and (exists (select 1 from public.worker_auction_watch w where w.lot_id = l.id and w.user_id = v_me)
          or exists (select 1 from public.worker_auction_bid b where b.lot_id = l.id and b.bidder_id = v_me));
  return jsonb_build_object(
    'ok', true,
    'unread', (select count(*) from public.worker_notification where user_id = v_me and read_at is null),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', n.id, 'kind', n.kind, 'payload', n.payload, 'read', n.read_at is not null, 'at', n.created_at
              ) order by n.created_at desc), '[]'::jsonb)
              from (select * from public.worker_notification where user_id = v_me
                     order by created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200)) n)
  );
end $$;

create or replace function public.worker_notifications_read(p_ids uuid[] default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  update public.worker_notification set read_at = now()
   where user_id = v_me and read_at is null and (p_ids is null or id = any(p_ids));
  delete from public.worker_notification where user_id = v_me and created_at < now() - interval '180 days';
  return jsonb_build_object('ok', true);
end $$;

-- =====================================================================
-- 16. חנויות — קריאה ציבורית, הרשמית קודמת (מפרט §23)
-- =====================================================================
create or replace function public.worker_merchant_offers(p_slug text default null, p_kit text default null, p_season text default null)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'archiveSlug', o.archive_slug, 'kitId', o.kit_id, 'seasonLabel', o.season_label,
    'merchantName', o.merchant_name, 'merchantType', o.merchant_type, 'offerType', o.offer_type,
    'title', o.title_he, 'price', o.price, 'currency', o.currency, 'productUrl', o.product_url,
    'imageUrl', o.image_url, 'availability', o.availability, 'lastCheckedAt', o.last_checked_at,
    'isOfficialClubStore', o.is_official_club_store
  ) order by o.is_official_club_store desc,
             array_position(array['official', 'official_reissue', 'external_new', 'replica'], o.offer_type),
             o.sort_rank, o.price nulls last), '[]'::jsonb)
  from public.worker_merchant_offer o
  where o.is_active
    and ((p_slug is null and p_kit is null and p_season is null)
         or o.archive_slug = p_slug or o.kit_id = p_kit or o.season_label = p_season)
$$;

-- =====================================================================
-- 17. ניהול — כל פונקציה בודקת בשורה הראשונה (מפרט §65)
-- =====================================================================
create or replace function public.worker_admin_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  perform public.worker_auction_settle_due();
  return jsonb_build_object('ok', true,
    'openReports', (select count(*) from public.worker_collector_report where status = 'open'),
    'pendingLots', (select count(*) from public.worker_auction_lot where status = 'pending_approval'),
    'liveLots', (select count(*) from public.worker_auction_lot where status = 'scheduled'),
    'awaitingLots', (select count(*) from public.worker_auction_lot where status = 'awaiting_completion'),
    'collectors', (select count(*) from public.worker_collector_profile),
    'items', (select count(*) from public.worker_collector_item where state in ('held', 'reserved')),
    'listed', (select count(*) from public.worker_collector_item where state = 'held' and (for_sale or for_trade)),
    'completed', (select count(*) from public.worker_collector_connection where status = 'completed'),
    'merchantOffers', (select count(*) from public.worker_merchant_offer where is_active));
end $$;

create or replace function public.worker_admin_lots(p_status text default 'pending_approval') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  return jsonb_build_object('ok', true, 'lots', (
    select coalesce(jsonb_agg(public.worker_lot_brief(l) || jsonb_build_object(
      'status', l.status, 'description', l.description, 'reservePrice', l.reserve_price,
      'requestedHours', l.requested_hours, 'minIncrement', l.min_increment,
      'seller', public.worker_collector_label(l.seller_id),
      'item', (select public.worker_item_public(i) from public.worker_collector_item i where i.id = l.item_id),
      'decisionNote', l.decision_note, 'createdAt', l.created_at,
      -- ההצעות עם המזהה שלהן, כדי שמנהל יוכל לבטל אחת (עם סיבה). בלי התקרה הפרטית (§35).
      'bids', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', b.id, 'amount', b.amount, 'proxy', b.is_proxy, 'status', b.status, 'at', b.created_at,
                 'bidder', public.worker_collector_label(b.bidder_id)
               ) order by b.created_at desc), '[]'::jsonb)
               from public.worker_auction_bid b where b.lot_id = l.id)
    ) order by l.created_at), '[]'::jsonb)
    from public.worker_auction_lot l where p_status is null or l.status = p_status
  ));
end $$;

/* אישור או דחייה של לוט. באישור: מועד התחלה, והתראה למי שמחפש את החולצה (עד 300). */
create or replace function public.worker_admin_lot_decide(p_lot uuid, p_approve boolean, p_starts_at timestamptz default null, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := public.worker_market_uid();
  v_l public.worker_auction_lot;
  v_item public.worker_collector_item;
  v_start timestamptz;
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  select * into v_l from public.worker_auction_lot where id = p_lot for update;
  if not found or v_l.status <> 'pending_approval' then return public.worker_fail('bad_state'); end if;
  if not coalesce(p_approve, false) then
    update public.worker_auction_lot set status = 'rejected', approved_by = v_admin, approved_at = now(),
           decision_note = left(p_note, 500) where id = p_lot;
    perform public.worker_notify(v_l.seller_id, 'AUCTION_REJECTED', jsonb_build_object('lotId', p_lot, 'note', left(p_note, 300)),
      'rejected:' || p_lot::text);
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
  v_start := greatest(coalesce(p_starts_at, now()), now());
  update public.worker_auction_lot set status = 'scheduled', approved_by = v_admin, approved_at = now(),
         starts_at = v_start, ends_at = v_start + make_interval(hours => requested_hours),
         decision_note = left(p_note, 500)
   where id = p_lot returning * into v_l;
  select * into v_item from public.worker_collector_item where id = v_l.item_id;
  perform public.worker_notify(v_l.seller_id, 'AUCTION_APPROVED',
    jsonb_build_object('lotId', p_lot, 'startsAt', v_l.starts_at, 'endsAt', v_l.ends_at), 'approved:' || p_lot::text);
  perform public.worker_notify(w.user_id, 'AUCTION_SCHEDULED',
    jsonb_build_object('lotId', p_lot, 'archiveSlug', v_item.archive_slug, 'startsAt', v_l.starts_at), 'sched:' || p_lot::text)
    from (select distinct w.user_id from public.worker_collector_want w
           where public.worker_same_shirt(w.archive_slug, w.kit_id, v_item.archive_slug, v_item.kit_id)
             and w.user_id <> v_l.seller_id limit 300) w;
  return jsonb_build_object('ok', true, 'status', 'scheduled', 'startsAt', v_l.starts_at, 'endsAt', v_l.ends_at);
end $$;

create or replace function public.worker_admin_lot_cancel(p_lot uuid, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_l public.worker_auction_lot;
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  if nullif(trim(coalesce(p_note, '')), '') is null then return public.worker_fail('note_required'); end if;
  select * into v_l from public.worker_auction_lot where id = p_lot for update;
  if not found or v_l.status not in ('pending_approval', 'scheduled', 'awaiting_completion') then
    return public.worker_fail('bad_state');
  end if;
  update public.worker_auction_lot set status = 'cancelled', decision_note = left(p_note, 500) where id = p_lot;
  update public.worker_collector_item set state = 'held' where id = v_l.item_id and state = 'reserved';
  if v_l.connection_id is not null then
    update public.worker_collector_connection set status = 'cancelled'
     where id = v_l.connection_id and status in ('requested', 'accepted', 'negotiating', 'agreed');
    perform public.worker_system_message(v_l.connection_id, 'cancelled');
  end if;
  perform public.worker_notify(u.user_id, 'AUCTION_CANCELLED', jsonb_build_object('lotId', p_lot), 'lotcancel:' || p_lot::text)
    from (select v_l.seller_id as user_id
          union select distinct bidder_id from public.worker_auction_bid where lot_id = p_lot) u;
  return jsonb_build_object('ok', true);
end $$;

/* מחשב מחדש את מצב הלוט מהצעות האנשים שנותרו פעילות — אחרי ביטול הצעה בידי מנהל. */
create or replace function public.worker_auction_recompute(p_lot uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_l public.worker_auction_lot;
  v_b record;
  v_leader uuid;
  v_leader_max numeric(10, 2);
  v_price numeric(10, 2);
  v_count integer := 0;
begin
  select * into v_l from public.worker_auction_lot where id = p_lot for update;
  for v_b in select bidder_id, max_amount from public.worker_auction_bid
              where lot_id = p_lot and status = 'active' and not is_proxy order by created_at loop
    v_count := v_count + 1;
    if v_leader is null then
      v_leader := v_b.bidder_id; v_leader_max := v_b.max_amount; v_price := v_l.start_price;
    elsif v_b.bidder_id = v_leader then
      v_leader_max := greatest(v_leader_max, v_b.max_amount);
    elsif v_b.max_amount > v_leader_max then
      v_price := least(v_b.max_amount, v_leader_max + v_l.min_increment);
      v_leader := v_b.bidder_id; v_leader_max := v_b.max_amount;
    else
      v_price := least(v_leader_max, v_b.max_amount + v_l.min_increment);
    end if;
    if v_l.reserve_price is not null and v_price < v_l.reserve_price and v_leader_max >= v_l.reserve_price then
      v_price := v_l.reserve_price;
    end if;
  end loop;
  update public.worker_auction_lot set leader_id = v_leader, leader_max = v_leader_max,
         current_price = v_price, bid_count = v_count where id = p_lot;
end $$;

create or replace function public.worker_admin_bid_void(p_bid uuid, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := public.worker_market_uid();
  v_lot uuid;
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  if nullif(trim(coalesce(p_note, '')), '') is null then return public.worker_fail('note_required'); end if;
  update public.worker_auction_bid set status = 'voided', voided_by = v_admin, voided_note = left(p_note, 300)
   where id = p_bid and status = 'active' returning lot_id into v_lot;
  if v_lot is null then return public.worker_fail('not_found'); end if;
  -- הצעות האוטומטיות שהמערכת הגישה בשם אותו מציע בטלות איתה; המצב נבנה מחדש מהאנשים.
  update public.worker_auction_bid b set status = 'voided', voided_by = v_admin, voided_note = 'replay after void'
   where b.lot_id = v_lot and b.is_proxy and b.status = 'active';
  perform public.worker_auction_recompute(v_lot);
  return jsonb_build_object('ok', true, 'state', public.worker_auction_state(v_lot));
end $$;

create or replace function public.worker_admin_reports(p_status text default 'open') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  return jsonb_build_object('ok', true, 'reports', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'reason', r.reason, 'details', r.details, 'status', r.status, 'createdAt', r.created_at,
      'reporter', public.worker_collector_label(r.reporter_id), 'reported', public.worker_collector_label(r.reported_id),
      'connectionId', r.connection_id, 'itemId', r.item_id, 'lotId', r.lot_id,
      'resolutionNote', r.resolution_note, 'handledAt', r.handled_at
    ) order by r.created_at desc), '[]'::jsonb)
    from public.worker_collector_report r where p_status is null or r.status = p_status
  ));
end $$;

create or replace function public.worker_admin_report_resolve(p_report uuid, p_status text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  if p_status not in ('reviewed', 'actioned', 'dismissed') then return public.worker_fail('bad_status'); end if;
  update public.worker_collector_report set status = p_status, handled_by = public.worker_market_uid(),
         handled_at = now(), resolution_note = left(p_note, 500)
   where id = p_report;
  if not found then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

/* קריאת שיחה שדווחה — רק למנהל, ונרשמת ביומן, כי זו קריאה של מידע פרטי. */
create or replace function public.worker_admin_connection_view(p_conn uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_c public.worker_collector_connection;
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  select * into v_c from public.worker_collector_connection where id = p_conn;
  if not found then return public.worker_fail('not_found'); end if;
  if not exists (select 1 from public.worker_collector_report where connection_id = p_conn) then
    return public.worker_fail('not_reported');
  end if;
  insert into public.worker_audit_log (actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'read', 'worker_collector_connection', p_conn, null);
  return public.worker_thread_payload(v_c, null);
end $$;

create or replace function public.worker_admin_item_suspend(p_item uuid, p_on boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_item public.worker_collector_item;
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  select * into v_item from public.worker_collector_item where id = p_item for update;
  if not found then return public.worker_fail('not_found'); end if;
  if coalesce(p_on, false) then
    if nullif(trim(coalesce(p_reason, '')), '') is null then return public.worker_fail('note_required'); end if;
    update public.worker_collector_item set state = 'suspended', for_sale = false, for_trade = false,
           suspended_reason = left(p_reason, 300) where id = p_item;
    update public.worker_collector_connection set status = 'cancelled'
     where item_id = p_item and status in ('requested', 'accepted', 'negotiating', 'agreed');
    perform public.worker_notify(v_item.user_id, 'ITEM_SUSPENDED', jsonb_build_object('itemId', p_item, 'reason', left(p_reason, 300)));
  else
    update public.worker_collector_item set state = 'held', suspended_reason = null where id = p_item and state = 'suspended';
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.worker_admin_merchant_list() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  return jsonb_build_object('ok', true, 'offers', (
    select coalesce(jsonb_agg(to_jsonb(o) order by o.is_active desc, o.sort_rank, o.created_at), '[]'::jsonb)
    from public.worker_merchant_offer o));
end $$;

create or replace function public.worker_admin_merchant_upsert(p_offer jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  begin
    if p_offer ? 'id' and nullif(p_offer ->> 'id', '') is not null then
      update public.worker_merchant_offer set
        archive_slug = nullif(p_offer ->> 'archiveSlug', ''), kit_id = nullif(p_offer ->> 'kitId', ''),
        season_label = nullif(p_offer ->> 'seasonLabel', ''),
        merchant_name = p_offer ->> 'merchantName', merchant_type = p_offer ->> 'merchantType',
        offer_type = p_offer ->> 'offerType', title_he = nullif(p_offer ->> 'title', ''),
        price = nullif(p_offer ->> 'price', '')::numeric, currency = coalesce(nullif(p_offer ->> 'currency', ''), 'ILS'),
        product_url = p_offer ->> 'productUrl', image_url = nullif(p_offer ->> 'imageUrl', ''),
        availability = coalesce(nullif(p_offer ->> 'availability', ''), 'unknown'),
        last_checked_at = nullif(p_offer ->> 'lastCheckedAt', '')::date,
        is_official_club_store = coalesce((p_offer ->> 'isOfficialClubStore')::boolean, false),
        is_active = coalesce((p_offer ->> 'isActive')::boolean, true),
        sort_rank = coalesce(nullif(p_offer ->> 'sortRank', '')::smallint, 100)
      where id = (p_offer ->> 'id')::uuid returning id into v_id;
    else
      insert into public.worker_merchant_offer (archive_slug, kit_id, season_label, merchant_name, merchant_type,
        offer_type, title_he, price, currency, product_url, image_url, availability, last_checked_at,
        is_official_club_store, is_active, sort_rank)
      values (nullif(p_offer ->> 'archiveSlug', ''), nullif(p_offer ->> 'kitId', ''), nullif(p_offer ->> 'seasonLabel', ''),
        p_offer ->> 'merchantName', p_offer ->> 'merchantType', p_offer ->> 'offerType', nullif(p_offer ->> 'title', ''),
        nullif(p_offer ->> 'price', '')::numeric, coalesce(nullif(p_offer ->> 'currency', ''), 'ILS'),
        p_offer ->> 'productUrl', nullif(p_offer ->> 'imageUrl', ''),
        coalesce(nullif(p_offer ->> 'availability', ''), 'unknown'), nullif(p_offer ->> 'lastCheckedAt', '')::date,
        coalesce((p_offer ->> 'isOfficialClubStore')::boolean, false), coalesce((p_offer ->> 'isActive')::boolean, true),
        coalesce(nullif(p_offer ->> 'sortRank', '')::smallint, 100))
      returning id into v_id;
    end if;
  exception when check_violation or not_null_violation or invalid_text_representation or unique_violation then
    return public.worker_fail('bad_value', jsonb_build_object('detail', sqlerrm));
  end;
  if v_id is null then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.worker_admin_audit(p_limit integer default 100, p_entity text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  return jsonb_build_object('ok', true, 'entries', (
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'action', a.action, 'entity', a.entity,
             'entityId', a.entity_id, 'detail', a.detail, 'at', a.created_at,
             'actor', case when a.actor_id is null then null else public.worker_collector_label(a.actor_id) end)
           order by a.id desc), '[]'::jsonb)
    from (select * from public.worker_audit_log where p_entity is null or entity = p_entity
           order by id desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) a));
end $$;

/* האם השואל מנהל — כדי שהאפליקציה תדע אם להציג את מסך הניהול. ההרשאה עצמה נבדקת בכל פונקציה. */
create or replace function public.worker_admin_whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'admin', public.worker_is_admin())
$$;

-- =====================================================================
-- 18. RLS והרשאות — הטבלאות סגורות לגמרי; רק פונקציות
-- =====================================================================
do $rls$
declare v_table text;
begin
  foreach v_table in array array[
    'worker_admin', 'worker_rate_event', 'worker_collector_profile', 'worker_collector_item',
    'worker_collector_photo', 'worker_collector_want', 'worker_collector_connection', 'worker_collector_message',
    'worker_collector_offer', 'worker_collector_offer_item', 'worker_collector_block', 'worker_collector_report',
    'worker_merchant_offer', 'worker_auction_lot', 'worker_auction_bid', 'worker_auction_watch',
    'worker_notification', 'worker_audit_log'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from anon, authenticated', v_table);
  end loop;
end
$rls$;

-- רצפים: אף אחד מבחוץ לא מושך מספר אספן או מספר שורה.
do $sequences$
declare v_seq text;
begin
  for v_seq in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relkind = 'S' and c.relname like 'worker\_%' loop
    execute format('revoke all on sequence public.%I from anon, authenticated', v_seq);
  end loop;
end
$sequences$;

-- פונקציות: הכול סגור, ואז פותחים בשם. קריאה ציבורית — ספירות, השוק, ארון פתוח, מכירות, חנויות.
do $functions$
declare
  v_fn record;
  v_public text[] := array['worker_shirt_signals', 'worker_market_list', 'worker_market_item', 'worker_closet_view',
                           'worker_auction_list', 'worker_auction_state', 'worker_merchant_offers'];
  v_member text[] := array['worker_closet_mine', 'worker_collector_have', 'worker_collector_unhave',
                           'worker_collector_want_set', 'worker_collector_item_update', 'worker_collector_photo_add',
                           'worker_collector_photo_remove', 'worker_collector_photo_order', 'worker_collector_settings',
                           'worker_market_matches', 'worker_connect', 'worker_connection_respond', 'worker_message_send',
                           'worker_offer_make', 'worker_offer_respond', 'worker_connection_step', 'worker_my_connections',
                           'worker_connection_thread', 'worker_block_set', 'worker_report', 'worker_auction_submit',
                           'worker_auction_withdraw', 'worker_auction_bid', 'worker_auction_watch', 'worker_auction_complete',
                           'worker_notifications', 'worker_notifications_read', 'worker_admin_overview', 'worker_admin_lots',
                           'worker_admin_lot_decide', 'worker_admin_lot_cancel', 'worker_admin_bid_void', 'worker_admin_reports',
                           'worker_admin_report_resolve', 'worker_admin_connection_view', 'worker_admin_item_suspend',
                           'worker_admin_merchant_list', 'worker_admin_merchant_upsert', 'worker_admin_audit',
                           'worker_admin_whoami'];
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_%'
       and p.proname not in ('worker_profile_keep_identity', 'worker_profile_keep_newest_card', 'worker_profile_ensure',
                             'worker_touch_profile', 'worker_record_run', 'worker_poll_cast', 'worker_poll_tally',
                             'worker_collect', 'worker_mark_questions', 'worker_rr_code', 'worker_rr_create_room',
                             'worker_rr_join_room', 'worker_rr_lock', 'worker_rr_state', 'worker_rr_claim')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = any(v_public) then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    elsif v_fn.proname = any(v_member) then
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
end
$functions$;

-- =====================================================================
-- 19. אחסון תמונות — דלי אחד, ושלוש מדיניות שמוגבלות אליו בלבד
-- =====================================================================
-- התמונות ציבוריות (הן תמונות של מודעה), הנתיב מתחיל במשתמש, ורק הבעלים מעלה או מוחק.
-- עד 2MB לקובץ, WebP/JPEG/PNG בלבד. האפליקציה מקטינה ל-WebP לפני העלאה.
do $storage$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema is missing — collector photos are disabled until it exists';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('worker-collector', 'worker-collector', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
    on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                                   allowed_mime_types = excluded.allowed_mime_types;
  execute 'drop policy if exists worker_collector_upload on storage.objects';
  execute $p$create policy worker_collector_upload on storage.objects for insert to authenticated
    with check (bucket_id = 'worker-collector'
                and (storage.foldername(name))[1] = (select auth.uid())::text
                and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)$p$;
  execute 'drop policy if exists worker_collector_delete on storage.objects';
  execute $p$create policy worker_collector_delete on storage.objects for delete to authenticated
    using (bucket_id = 'worker-collector' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  execute 'drop policy if exists worker_collector_read on storage.objects';
  execute $p$create policy worker_collector_read on storage.objects for select to anon, authenticated
    using (bucket_id = 'worker-collector')$p$;
end
$storage$;

-- =====================================================================
-- 20. מה כל דבר — בעברית
-- =====================================================================
comment on table public.worker_admin is 'THE WORKER — מנהלי השוק. אין שום דרך להוסיף מנהל מבחוץ; שורה נכנסת רק מה-SQL Editor.';
comment on table public.worker_rate_event is 'THE WORKER — ניסיונות פעולה, למכסות. נשמר גם כשהפעולה נדחתה, ונמחק אחרי שלושה ימים.';
comment on table public.worker_collector_profile is 'THE WORKER — האספן: מספר ציבורי (אספן #1842), פרטיות הארון וקישור שיתוף. בלי שם, מייל או טלפון.';
comment on table public.worker_collector_item is 'THE WORKER — עותק פיזי של חולצה מהארכיון: "יש לי". מצביע על archive_slug ועל kit_id; לא מעתיק את הדגם.';
comment on table public.worker_collector_photo is 'THE WORKER — תמונות של עותק, בדלי worker-collector. עד שמונה לעותק.';
comment on table public.worker_collector_want is 'THE WORKER — "מחפש": חולצה מהארכיון שהאספן רוצה.';
comment on table public.worker_collector_connection is 'THE WORKER — חיבור בין שני אספנים על פריט: בקשה, משא ומתן, סיכום, השלמה כפולה.';
comment on table public.worker_collector_message is 'THE WORKER — הודעות בתוך חיבור. רק שני הצדדים קוראים, דרך worker_connection_thread.';
comment on table public.worker_collector_offer is 'THE WORKER — הצעת מחיר או הצעת החלפה בתוך חיבור. אין תשלום במערכת.';
comment on table public.worker_collector_offer_item is 'THE WORKER — הפריטים שמוצעים בהצעת החלפה.';
comment on table public.worker_collector_block is 'THE WORKER — חסימה בין אספנים. סוגרת חיבורים פתוחים ומסתירה מודעות לשני הכיוונים.';
comment on table public.worker_collector_report is 'THE WORKER — דיווח על אספן, פריט, שיחה או מכירה פומבית. מנהל מטפל, והטיפול נרשם ביומן.';
comment on table public.worker_merchant_offer is 'THE WORKER — קישורים לחנויות: הרשמית קודמת, רפליקה מסומנת. בלי פרמטרים של שותפים ובלי עמלה.';
comment on table public.worker_auction_lot is 'THE WORKER — לוט במכירה פומבית: בקשה, אישור מנהל, חלון זמן, מחיר מינימום נסתר, זוכה.';
comment on table public.worker_auction_bid is 'THE WORKER — הצעות במכירה פומבית, עם תקרה פרטית (Max Bid). הצעה לא נמחקת — רק מבוטלת בידי מנהל, עם סיבה.';
comment on table public.worker_auction_watch is 'THE WORKER — מי עוקב אחרי לוט (עקוב / הזכר לי).';
comment on table public.worker_notification is 'THE WORKER — התראות לאספן. נוצרות באירוע; מה שתלוי בשעון נוצר כשהאספן בודק.';
comment on table public.worker_audit_log is 'THE WORKER — יומן ביקורת: לוטים, הצעות, דיווחים, חנויות, מנהלים, השעיות. נכתב בטריגר על הטבלה.';

-- =====================================================================
-- 21. מנהל ראשון — שורה אחת, מה-SQL Editor, עם המייל שלך במקום YOUR-EMAIL
-- =====================================================================
--   insert into public.worker_admin (user_id)
--   select id from auth.users where email = 'YOUR-EMAIL' on conflict do nothing;

-- >>> merchant-seed · נוצר מ-content/manual/merchant-offers.json ב-scripts/collector/merchant-seed.ts — לא לערוך ביד
-- =====================================================================
-- 21ב. חנויות שנבדקו — זרע (מפרט §22–§27, §77)
-- =====================================================================
-- 28 מוצרים שנקראו ב-2026-09-22: 4 מהחנות הרשמית של המועדון (official), 24 שחזורים
-- (replica — לעולם לא "רשמי", גם כשהחנות עצמה כותבת כך). הכתובות בלי שום פרמטר, בלי עמלה.
-- הרצה חוזרת לא משכפלת ולא דורסת: on conflict על האינדקס הייחודי של הטבלה. מנהל שעדכן מחיר או
-- כיבה שורה — התיקון שלו נשאר. המקור והנימוקים: content/manual/merchant-offers.json.
insert into public.worker_merchant_offer (archive_slug, kit_id, season_label, merchant_name, merchant_type, offer_type, title_he, price, currency, product_url, image_url, availability, last_checked_at, is_official_club_store, is_active, sort_rank)
values
  ('fka-2026-27-home', null, '2026/27', 'החנות הרשמית של הפועל תל אביב', 'club_store', 'official', 'חולצת המשחק הרשמית – מדי הבית | עונת 2026/27', 270, 'ILS', 'https://shop.htafc.co.il/product/red-match-t-shirt/', null, 'in_stock', date '2026-09-22', true, true, 10),
  ('fka-2026-27-home', null, '2026/27', 'החנות הרשמית של הפועל תל אביב', 'club_store', 'official', 'חולצת המשחק הרשמית – מדי הבית | עונת 2026/27 ילדים', 210, 'ILS', 'https://shop.htafc.co.il/product/red-match-t-shirt-kids/', null, 'in_stock', date '2026-09-22', true, true, 20),
  ('fka-2026-27-away', null, '2026/27', 'החנות הרשמית של הפועל תל אביב', 'club_store', 'official', 'חולצת המשחק הרשמית – מדי החוץ | עונת 2026/27', 270, 'ILS', 'https://shop.htafc.co.il/product/white-match-t-shirt/', null, 'in_stock', date '2026-09-22', true, true, 10),
  ('fka-2026-27-away', null, '2026/27', 'החנות הרשמית של הפועל תל אביב', 'club_store', 'official', 'חולצת המשחק הרשמית – מדי החוץ | עונת 2026/27 ילדים', 210, 'ILS', 'https://shop.htafc.co.il/product/white-match-t-shirt-kids/', null, 'in_stock', date '2026-09-22', true, true, 20),
  (null, null, '2010/11', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 2010/11', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-2010-2011-home-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1980/81', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1980/81', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1980-1981-retro-jersey', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '2010/11', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת החוץ 2010/11', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-shirt-2010-2011-away-retro-jerseys-%D7%97%D7%95%D7%9C%D7%A6%D7%94-%D7%A9%D7%9C-%D7%94%D7%A4%D7%95%D7%A2%D7%9C-%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1999/00', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1999/00', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1999-2000-home-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1986/87', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1986/87', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1986-1987-home-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1997/98', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת החוץ 1997/98', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-away-1998-1998-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '2002/03', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 2002/03', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-2002-2003-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1989/90', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1989/90', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1989-1990-home-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1997/98', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1997/98', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1997-1998-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1992/93', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1992/93', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1992-1993-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1994/95', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1994/95', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1994-1995-home-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1995/96', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1995/96', 50, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-shirt-1995-1996-home-retro-jerseys-%D7%97%D7%95%D7%9C%D7%A6%D7%94-%D7%A9%D7%9C-%D7%94%D7%A4%D7%95%D7%A2%D7%9C-%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91', null, 'unknown', date '2026-09-22', false, true, 100),
  (null, null, '1994/95', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1994/95', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1994-1995-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1995/96', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת החוץ 1995/96', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-shirt-1995-1996-away-retro-jerseys-%D7%97%D7%95%D7%9C%D7%A6%D7%94-%D7%A9%D7%9C-%D7%94%D7%A4%D7%95%D7%A2%D7%9C-%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91', null, 'unknown', date '2026-09-22', false, true, 100),
  (null, null, '1993/94', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1993/94', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1993-1994-home-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1989/90', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת החוץ 1989/90', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1989-1990-away-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1991/92', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת החוץ 1991/92', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1991-1992-away-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1991/92', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1991/92', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1991-1992-home-retro-jerseys', null, 'in_stock', date '2026-09-22', false, true, 100),
  (null, null, '1997/98', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת החוץ 1997/98', 50, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-away-1997-1998-retro-jerseys', null, 'unknown', date '2026-09-22', false, true, 100),
  (null, null, '1994/95', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1994/95', 60, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1994-1995-retro-jersey', null, 'unknown', date '2026-09-22', false, true, 100),
  (null, null, '1995/96', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1995/96', 50, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1995-1996-retro-jerseys-1', null, 'unknown', date '2026-09-22', false, true, 100),
  (null, null, '1995/96', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1995/96', 50, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1995-1996-retro-jerseys', null, 'unknown', date '2026-09-22', false, true, 100),
  (null, null, '1993/94', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1993/94', 50, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-home-1993-1994-retro-jersey', null, 'unknown', date '2026-09-22', false, true, 100),
  (null, null, '1995/96', 'Retro Jerseys', 'retro_store', 'replica', 'שחזור של חולצת הבית 1995/96', 50, 'EUR', 'https://www.retro-jerseys.com/products/hapoel-tel-aviv-1995-1996-home-retro-jerseys', null, 'unknown', date '2026-09-22', false, true, 100)
on conflict (product_url, (coalesce(archive_slug, '')), (coalesce(kit_id, '')), (coalesce(season_label, ''))) do nothing;
-- <<< merchant-seed

-- =====================================================================
-- 22. בדיקה — התוצאה הנכונה: collector_tables 18 · collector_functions 72 · anon_can_write 0 · auth_triggers 0
-- =====================================================================
select
  (select count(*) from pg_tables where schemaname = 'public'
     and tablename in ('worker_admin', 'worker_rate_event', 'worker_collector_profile', 'worker_collector_item',
                       'worker_collector_photo', 'worker_collector_want', 'worker_collector_connection',
                       'worker_collector_message', 'worker_collector_offer', 'worker_collector_offer_item',
                       'worker_collector_block', 'worker_collector_report', 'worker_merchant_offer',
                       'worker_auction_lot', 'worker_auction_bid', 'worker_auction_watch',
                       'worker_notification', 'worker_audit_log')) as collector_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_%'
       and p.proname not in ('worker_profile_keep_identity', 'worker_profile_keep_newest_card', 'worker_profile_ensure',
                             'worker_touch_profile', 'worker_record_run', 'worker_poll_cast', 'worker_poll_tally',
                             'worker_collect', 'worker_mark_questions', 'worker_rr_code', 'worker_rr_create_room',
                             'worker_rr_join_room', 'worker_rr_lock', 'worker_rr_state', 'worker_rr_claim')) as collector_functions,
  (select count(*) from pg_tables t where t.schemaname = 'public' and t.tablename like 'worker\_%'
     and (has_table_privilege('anon', format('public.%I', t.tablename), 'insert')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'update')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'delete'))) as anon_can_write,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers;
