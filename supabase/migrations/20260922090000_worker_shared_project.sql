-- =====================================================================
-- THE WORKER — צד השחקן, בפרויקט Supabase שמשותף עם DUBID (22.9.2026)
-- =====================================================================
--
-- **הקובץ היחיד שצריך להריץ.** הוא מחליף את ארבעת הקבצים של 17.9–21.9 (portal_identity,
-- royal_rumble_live, gates_progress, question_mark), שלא הורצו אף פעם והפכו לקבצים ריקים.
-- גם שבעת קבצי הארכיון של 31.8–6.9 ריקים עכשיו: הם עברו ל-supabase/archive-schema/, כי האתר
-- לא קורא אותם והם יוצרים ב-public שמות כלליים שאין להם מקום בפרויקט משותף.
--
-- ## למה קובץ חדש, ולא הרצה של הישנים
--
-- מאור מריץ את THE WORKER על **אותו פרויקט Supabase של DUBID** (הפרויקט "Dubid",
-- ref afxpjfxwpdjvlmuoawda). נבדק במסד עצמו ב-22.9.2026, לפני שנכתבה שורה:
--   · ל-DUBID יש סכמות משלו: core, game, shared, ובתוך public הטבלאות arenas, bets,
--     profiles, questions, system_configs והפונקציות handle_updated_at, pending_rewards,
--     server_now.
--   · אין אף טריגר על auth.users.
--   · אף אובייקט של THE WORKER לא קיים עדיין. ההרצה של 21.9 נעצרה בשורה הראשונה, כמו שתוכננה.
--
-- הקבצים הישנים כתבו שלושה דברים שאסור לכתוב בפרויקט משותף:
--   1. **טריגר על auth.users** (`on_auth_user_created` → `handle_new_user`). השם הוא השם
--      של התבנית הרשמית של Supabase, כלומר השם שהכי סביר שאפליקציה אחרת כבר משתמשת בו.
--      והטריגר רץ על **כל** הרשמה בפרויקט, גם של DUBID. תקלה בו הייתה מפילה את ההרשמה
--      ל-DUBID, ובלי תקלה הוא היה יוצר כרטיס של הפועל לכל משתמש של DUBID.
--   2. **Backfill מ-auth.users**: שורת כרטיס לכל משתמש שקיים בפרויקט, כלומר לכל משתמשי DUBID.
--   3. **שמות גנריים ב-public**: app_profile, gate_run, poll_vote, profile_item.
--
-- ## שלושה כללים, והם מה שהקובץ הזה עושה
--
--   · **כל אובייקט של THE WORKER מתחיל ב-`worker_`.** טבלאות, פונקציות, טריגרים, מדיניות
--     ואינדקסים. אין שם ב-public שיכול להתנגש בשם של DUBID, ואפשר לראות במבט אחד מה שייך למה.
--     נשארים ב-public כי זו הסכמה היחידה שחשופה ל-API בלי שינוי בלוח הבקרה, ופיצ'ר שדורש
--     צעד ידני שאף אחד לא עושה הוא פיצ'ר שלא קיים.
--   · **שום דבר על auth.** אין טריגר ואין backfill. הכרטיס נוצר בפעם הראשונה שהאדם נכנס
--     ל-THE WORKER, דרך `worker_profile_ensure()` שהאפליקציה קוראת לה אחרי ההתחברות. משתמש
--     של DUBID שלא פתח את THE WORKER אף פעם לא מקבל שורה כאן.
--   · **הכתיבה עוברת בפונקציות בלבד** (`security definer`), והטבלאות פתוחות לקריאה רק לבעלים.
--     חריג אחד, מכוון: הבעלים מעדכן את הכרטיס שלו ישירות, ורק בעמודות המותרות. שני
--     טריגרים שומרים שמספר המנוי לא מונפק מחדש ושהעריכה החדשה מנצחת.
--
-- **הרצה חוזרת בטוחה:** הקובץ מוסיף בלבד, ורץ פעמיים ברצף בלי שינוי (נבדק על Postgres 16
-- מקומי, עם סכמת auth מדומה ועם הטבלאות של DUBID לצידו).
--
-- **בסוף הקובץ יש שאילתת בדיקה.** התוצאה הנכונה: `worker_tables 7 · worker_functions 15 · auth_triggers 0`.

-- =====================================================================
-- 1. worker_profile — הכרטיס
-- =====================================================================
create table if not exists public.worker_profile (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text check (display_name is null or char_length(display_name) <= 18),
  -- מספר המנוי מ-lib/game/member.ts (TIK-0417). ריק עד שמכשיר תובע אותו, ואז קפוא.
  member_no      text unique,
  -- מאז — היום הראשון ששיחק, בכל מכשיר. זז רק אחורה.
  since          date not null default current_date,
  -- הכרטיס של שער 10: שער בית, מאז, איך התחיל, מקום ראשון, ערכים (lib/profile/card.ts).
  card           jsonb check (card is null or (jsonb_typeof(card) = 'object' and octet_length(card::text) <= 2048)),
  card_edited_at timestamptz,
  shirt_number   smallint check (shirt_number is null or shirt_number between 1 and 99),
  -- החותם של שער 7: מזהה שחקן, קוד עמדה, מפתחות נימוק. לא הבחירות בקלפי.
  supporter      jsonb check (supporter is null or (jsonb_typeof(supporter) = 'object' and octet_length(supporter::text) <= 2048)),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

/*
 * שתי עובדות שלא נכתבות מחדש: מספר המנוי קפוא מרגע שנכתב, ו-since הוא תמיד המוקדם מבין השניים.
 * השם מתחיל ב-a_ כי טריגרים מאותו סוג רצים לפי סדר האלפבית, וזה חייב לרוץ ראשון.
 */
create or replace function public.worker_profile_keep_identity() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.member_no is not null and new.member_no is distinct from old.member_no then
    raise exception 'member_no cannot be re-issued: % is already on this card', old.member_no;
  end if;
  new.since := least(old.since, new.since);
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists worker_profile_a_identity on public.worker_profile;
create trigger worker_profile_a_identity before update on public.worker_profile
  for each row execute function public.worker_profile_keep_identity();

/*
 * העריכה החדשה מנצחת. השם, המספר והכרטיס הם יחידה אחת, ועדכון שנושא card_edited_at ישן
 * יותר משאיר את מה שכבר כאן. לחותם של שער 7 יש שעון משלו, sealedOn, והחדש מנצח.
 */
create or replace function public.worker_profile_keep_newest_card() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.card_edited_at is not null
     and (new.card_edited_at is null or new.card_edited_at < old.card_edited_at) then
    new.card           := old.card;
    new.card_edited_at := old.card_edited_at;
    new.shirt_number   := old.shirt_number;
    new.display_name   := old.display_name;
  end if;
  if old.supporter is not null
     and (new.supporter is null
          or coalesce(new.supporter ->> 'sealedOn', '') < coalesce(old.supporter ->> 'sealedOn', '')) then
    new.supporter := old.supporter;
  end if;
  return new;
end $$;

drop trigger if exists worker_profile_b_newest_card on public.worker_profile;
create trigger worker_profile_b_newest_card before update on public.worker_profile
  for each row execute function public.worker_profile_keep_newest_card();

-- =====================================================================
-- 2. worker_gate_run — סבב שהסתיים, ומעשה של יום
-- =====================================================================
create table if not exists public.worker_gate_run (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.worker_profile(id) on delete cascade,
  -- נתיב השער כפי ש-gateId() כותב אותו: /xi, /kits/build, /trivia/europe
  gate            text not null check (gate like '/%' and char_length(gate) <= 64),
  seed            bigint check (seed is null or seed > 0),
  score           integer  not null default 0 check (score >= 0),
  asked           smallint not null default 0 check (asked >= 0),
  correct         smallint not null default 0 check (correct >= 0),
  played_on       date not null default current_date,
  played_at       timestamptz not null default now(),
  -- מפתח שהלקוח מייצר פעם אחת לסבב (או deed:<gate>:<day> למעשה), ושולח שוב בכל ניסיון חוזר
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 128),
  created_at      timestamptz not null default now(),
  constraint worker_gate_run_correct_sane check (correct <= asked),
  unique (user_id, idempotency_key)
);

create index if not exists worker_gate_run_user_idx on public.worker_gate_run (user_id, played_on desc);

-- =====================================================================
-- 3. worker_poll_vote — הקלפי של שער 7: קול למכשיר, בלי משתמש, ובלי שום מדיניות
-- =====================================================================
-- הספירה ציבורית דרך worker_poll_tally, והשורות לא נקראות על ידי אף אחד (כלל 76).
create table if not exists public.worker_poll_vote (
  id          uuid primary key default gen_random_uuid(),
  device_id   text not null check (length(device_id) between 8 and 64),
  question_id text not null check (char_length(question_id) between 1 and 64),
  pick        text not null check (length(pick) between 1 and 120),
  voted_at    timestamptz not null default now(),
  unique (device_id, question_id)
);

create index if not exists worker_poll_vote_question_idx on public.worker_poll_vote (question_id);

-- =====================================================================
-- 4. worker_profile_item — האוספים, שגדלים בלבד
-- =====================================================================
create table if not exists public.worker_profile_item (
  user_id  uuid not null references public.worker_profile(id) on delete cascade,
  set_id   text not null check (set_id ~ '^[a-z0-9][a-z0-9._~-]{0,47}$'),
  item_id  text not null check (char_length(item_id) between 1 and 128 and item_id !~ '[[:cntrl:]]'),
  added_on date not null default current_date,
  primary key (user_id, set_id, item_id)
);

-- =====================================================================
-- 5. worker_question_mark — פנקס הנקמות של שער 2
-- =====================================================================
create table if not exists public.worker_question_mark (
  user_id       uuid not null references public.worker_profile(id) on delete cascade,
  question_id   text not null check (question_id ~ '^q_[0-9a-f]{12}$'),
  topic         text check (topic is null or char_length(topic) <= 32),
  wrong         integer not null default 0 check (wrong >= 0),
  "right"       integer not null default 0 check ("right" >= 0),
  last_outcome  text not null check (last_outcome in ('w', 'r')),
  last_at       timestamptz not null,
  updated_at    timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists worker_question_mark_pending_idx
  on public.worker_question_mark (user_id, last_at desc) where last_outcome = 'w';

-- =====================================================================
-- 6. worker_rr_room · worker_rr_entry — רויאל ראמבל חי, שער 9
-- =====================================================================
create table if not exists public.worker_rr_room (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  host_user_id  uuid not null references auth.users(id) on delete cascade,
  guest_user_id uuid references auth.users(id) on delete set null,
  match_seed    bigint not null check (match_seed between 0 and 4294967295),
  status        text not null default 'waiting' check (status in ('waiting','drafting','countdown','playing','finished','expired')),
  host_ready    boolean not null default false,
  guest_ready   boolean not null default false,
  starts_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '2 hours')
);

create table if not exists public.worker_rr_entry (
  room_id    uuid not null references public.worker_rr_room(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  offer_seed bigint not null check (offer_seed between 0 and 4294967295),
  picks      jsonb,
  ready      boolean not null default false,
  locked_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- =====================================================================
-- 7. RLS והרשאות — קריאה לבעלים בלבד, כתיבה דרך פונקציות
-- =====================================================================
-- ב-public של Supabase כל טבלה חדשה מקבלת ALL ל-anon ול-authenticated כברירת מחדל.
-- לכן מבטלים הכול קודם, ומחזירים רק מה שצריך.
alter table public.worker_profile       enable row level security;
alter table public.worker_gate_run      enable row level security;
alter table public.worker_poll_vote     enable row level security;
alter table public.worker_profile_item  enable row level security;
alter table public.worker_question_mark enable row level security;
alter table public.worker_rr_room       enable row level security;
alter table public.worker_rr_entry      enable row level security;

revoke all on public.worker_profile, public.worker_gate_run, public.worker_poll_vote,
              public.worker_profile_item, public.worker_question_mark,
              public.worker_rr_room, public.worker_rr_entry
  from anon, authenticated;

-- הכרטיס: הבעלים קורא, ומעדכן רק את העמודות האלה. אין insert (worker_profile_ensure) ואין delete.
grant select on public.worker_profile to authenticated;
grant update (display_name, member_no, since, card, card_edited_at, shirt_number, supporter)
  on public.worker_profile to authenticated;
drop policy if exists worker_profile_read on public.worker_profile;
create policy worker_profile_read on public.worker_profile
  for select to authenticated using (id = auth.uid());
drop policy if exists worker_profile_write on public.worker_profile;
create policy worker_profile_write on public.worker_profile
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant select on public.worker_gate_run to authenticated;
drop policy if exists worker_gate_run_read on public.worker_gate_run;
create policy worker_gate_run_read on public.worker_gate_run
  for select to authenticated using (user_id = auth.uid());

grant select on public.worker_profile_item to authenticated;
drop policy if exists worker_profile_item_read on public.worker_profile_item;
create policy worker_profile_item_read on public.worker_profile_item
  for select to authenticated using (user_id = auth.uid());

grant select on public.worker_question_mark to authenticated;
drop policy if exists worker_question_mark_read on public.worker_question_mark;
create policy worker_question_mark_read on public.worker_question_mark
  for select to authenticated using (user_id = auth.uid());

grant select on public.worker_rr_room, public.worker_rr_entry to authenticated;
drop policy if exists worker_rr_room_read on public.worker_rr_room;
create policy worker_rr_room_read on public.worker_rr_room
  for select to authenticated using (auth.uid() = host_user_id or auth.uid() = guest_user_id);
drop policy if exists worker_rr_entry_read on public.worker_rr_entry;
create policy worker_rr_entry_read on public.worker_rr_entry
  for select to authenticated using (auth.uid() = user_id);

-- worker_poll_vote: אין grant ואין מדיניות. בכוונה.

-- =====================================================================
-- 8. הפונקציות — כולן security definer, search_path קבוע, והמשתמש הוא תמיד auth.uid()
-- =====================================================================

/*
 * worker_profile_ensure — הכרטיס נוצר כאן, בפעם הראשונה שהאדם נכנס ל-THE WORKER.
 *
 * זה מחליף את הטריגר על auth.users. הוא אידמפוטנטי: קריאה שנייה מחזירה את אותה שורה.
 * השם מגוגל לא נכתב כאן אף פעם. הכינוי הוא מה שהאוהד הקליד בכרטיס (lib/portal/merge.ts),
 * והוא עולה בסנכרון.
 */
create or replace function public.worker_profile_ensure()
returns setof public.worker_profile
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'worker_profile_ensure requires a signed-in user';
  end if;
  insert into public.worker_profile (id) values (v_user) on conflict (id) do nothing;
  return query select * from public.worker_profile where id = v_user;
end $$;

/* הכרטיס של מי שקורא, אם אין עדיין — פנימי, לא ניתן לקריאה מבחוץ. */
create or replace function public.worker_touch_profile(p_user uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.worker_profile (id) values (p_user) on conflict (id) do nothing;
$$;

/* worker_record_run — סבב שהסתיים, פעם אחת, כמה פעמים שלא יישלח. */
create or replace function public.worker_record_run(
  p_key       text,
  p_gate      text,
  p_score     integer default 0,
  p_asked     integer default 0,
  p_correct   integer default 0,
  p_seed      bigint  default null,
  p_played_on date    default null
) returns table (run_id uuid, first_time boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_day  date := coalesce(p_played_on, current_date);
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'worker_record_run requires a signed-in user';
  end if;
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'worker_record_run requires an idempotency key';
  end if;
  perform public.worker_touch_profile(v_user);

  insert into public.worker_gate_run (user_id, gate, seed, score, asked, correct, played_on, idempotency_key)
    values (v_user, p_gate, p_seed, greatest(coalesce(p_score, 0), 0),
            greatest(coalesce(p_asked, 0), 0),
            least(greatest(coalesce(p_correct, 0), 0), greatest(coalesce(p_asked, 0), 0)),
            v_day, p_key)
    on conflict (user_id, idempotency_key) do nothing
    returning id into v_id;

  if v_id is null then
    select id into v_id from public.worker_gate_run
      where user_id = v_user and idempotency_key = p_key;
    return query select v_id, false;
    return;
  end if;

  update public.worker_profile set since = least(since, v_day) where id = v_user;
  return query select v_id, true;
end $$;

/* worker_poll_cast — מכשיר אחד, שאלה אחת, בחירה אחת. שינוי דעה מעדכן. */
create or replace function public.worker_poll_cast(
  p_device_id   text,
  p_question_id text,
  p_pick        text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_device_id is null or length(p_device_id) < 8 then
    raise exception 'a vote needs a device id';
  end if;
  if p_pick is null or length(trim(p_pick)) = 0 then
    raise exception 'a vote needs a pick';
  end if;
  insert into public.worker_poll_vote (device_id, question_id, pick, voted_at)
    values (p_device_id, p_question_id, trim(p_pick), now())
    on conflict (device_id, question_id)
      do update set pick = excluded.pick, voted_at = now();
end $$;

/* worker_poll_tally — ספירות, אף פעם לא מצביעים. */
create or replace function public.worker_poll_tally(p_question_id text)
returns table (pick text, votes bigint)
language sql stable security definer set search_path = public as $$
  select pick, count(*)::bigint as votes
  from public.worker_poll_vote
  where question_id = p_question_id
  group by pick
  order by count(*) desc, pick;
$$;

/* worker_collect — פריטים לאוסף של הקורא. אידמפוטנטי; מחזיר כמה היו חדשים. */
create or replace function public.worker_collect(p_set text, p_ids text[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_new  integer := 0;
begin
  if v_user is null then
    raise exception 'worker_collect requires a signed-in user';
  end if;
  if p_set is null or p_set !~ '^[a-z0-9][a-z0-9._~-]{0,47}$' then
    raise exception 'worker_collect: bad set id';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 500 then
    raise exception 'worker_collect: at most 500 ids per call';
  end if;
  perform public.worker_touch_profile(v_user);
  if (select count(*) from public.worker_profile_item where user_id = v_user) >= 20000 then
    raise exception 'worker_collect: this account already holds 20000 items';
  end if;
  insert into public.worker_profile_item (user_id, set_id, item_id)
    select v_user, p_set, item
      from (select distinct trim(raw) as item from unnest(p_ids) as raw) ids
     where item is not null
       and char_length(item) between 1 and 128
       and item !~ '[[:cntrl:]]'
    on conflict (user_id, set_id, item_id) do nothing;
  get diagnostics v_new = row_count;
  return v_new;
end $$;

/* worker_mark_questions — פנקס המכשיר, מאוחד לחשבון: מונים במקסימום, התוצאה של הצד החדש. */
create or replace function public.worker_mark_questions(p_marks jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_count integer := 0;
  v_item  jsonb;
begin
  if v_user is null then
    raise exception 'worker_mark_questions requires a signed-in user';
  end if;
  if p_marks is null or jsonb_typeof(p_marks) <> 'array' then
    raise exception 'worker_mark_questions expects a JSON array';
  end if;
  if jsonb_array_length(p_marks) > 2000 then
    raise exception 'worker_mark_questions takes at most 2000 marks';
  end if;
  perform public.worker_touch_profile(v_user);

  for v_item in select * from jsonb_array_elements(p_marks) loop
    if coalesce(v_item->>'q', '') !~ '^q_[0-9a-f]{12}$' or coalesce(v_item->>'last', '') not in ('w', 'r') then
      continue;
    end if;
    insert into public.worker_question_mark (user_id, question_id, topic, wrong, "right", last_outcome, last_at)
      values (
        v_user,
        v_item->>'q',
        left(nullif(v_item->>'topic', ''), 32),
        greatest(coalesce((v_item->>'w')::integer, 0), 0),
        greatest(coalesce((v_item->>'r')::integer, 0), 0),
        v_item->>'last',
        coalesce((v_item->>'at')::timestamptz, now())
      )
      on conflict (user_id, question_id) do update set
        wrong        = greatest(worker_question_mark.wrong, excluded.wrong),
        "right"      = greatest(worker_question_mark."right", excluded."right"),
        last_outcome = case when excluded.last_at > worker_question_mark.last_at
                            then excluded.last_outcome else worker_question_mark.last_outcome end,
        last_at      = greatest(worker_question_mark.last_at, excluded.last_at),
        topic        = coalesce(excluded.topic, worker_question_mark.topic),
        updated_at   = now();
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

/*
 * רויאל ראמבל חי — הפונקציות של 20.9, בשמות של THE WORKER ועל הטבלאות שלו.
 * תיקון אחד בדרך: בקובץ של 20.9 ההצטרפות לחדר כתבה `on conflict (room_id, user_id)`, ו-room_id
 * הוא גם שם של עמודת הפלט של הפונקציה, כך ש-Postgres עצר ב-"column reference is ambiguous"
 * ואף אורח לא יכול היה להיכנס לחדר. כאן זה `on conflict on constraint`, ונבדק מקומית עם שני משתמשים.
 */
create or replace function public.worker_rr_code() returns text
language sql volatile set search_path = public as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.worker_rr_create_room(p_match_seed bigint, p_offer_seed bigint)
returns table(room_id uuid, code text, match_seed bigint)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_room public.worker_rr_room%rowtype; v_code text; v_try integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_match_seed < 0 or p_match_seed > 4294967295 or p_offer_seed < 0 or p_offer_seed > 4294967295 then raise exception 'BAD_SEED'; end if;
  if p_match_seed <> least(p_offer_seed, (p_offer_seed # 1597463007::bigint)) then raise exception 'BAD_SEED_PAIR'; end if;
  loop
    v_try := v_try + 1; if v_try > 12 then raise exception 'ROOM_CODE_EXHAUSTED'; end if;
    v_code := public.worker_rr_code();
    begin
      insert into public.worker_rr_room(code, host_user_id, match_seed) values (v_code, v_uid, p_match_seed) returning * into v_room;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.worker_rr_entry(room_id, user_id, offer_seed) values (v_room.id, v_uid, p_offer_seed);
  return query select v_room.id, v_room.code, v_room.match_seed;
end; $$;

create or replace function public.worker_rr_join_room(p_code text, p_match_seed bigint, p_offer_seed bigint)
returns table(room_id uuid, code text, match_seed bigint)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_room public.worker_rr_room%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_match_seed < 0 or p_match_seed > 4294967295 or p_offer_seed < 0 or p_offer_seed > 4294967295 then raise exception 'BAD_SEED'; end if;
  if p_match_seed <> least(p_offer_seed, (p_offer_seed # 1597463007::bigint)) then raise exception 'BAD_SEED_PAIR'; end if;
  select * into v_room from public.worker_rr_room where worker_rr_room.code = upper(trim(p_code)) and expires_at > now() for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.match_seed <> p_match_seed then raise exception 'SEED_MISMATCH'; end if;
  if v_room.host_user_id = v_uid then return query select v_room.id, v_room.code, v_room.match_seed; return; end if;
  if v_room.guest_user_id is not null and v_room.guest_user_id <> v_uid then raise exception 'ROOM_FULL'; end if;
  if v_room.guest_user_id is null then
    update public.worker_rr_room set guest_user_id = v_uid, status = case when status='waiting' then 'drafting' else status end, updated_at=now() where id=v_room.id returning * into v_room;
  end if;
  insert into public.worker_rr_entry(room_id, user_id, offer_seed) values (v_room.id, v_uid, p_offer_seed) on conflict on constraint worker_rr_entry_pkey do nothing;
  return query select v_room.id, v_room.code, v_room.match_seed;
end; $$;

create or replace function public.worker_rr_lock(p_room_id uuid, p_offer_seed bigint, p_picks jsonb)
returns table(status text, host_ready boolean, guest_ready boolean, starts_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_room public.worker_rr_room%rowtype; v_host_ready boolean; v_guest_ready boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_picks) <> 'array' or jsonb_array_length(p_picks) <> 5 then raise exception 'BAD_PICKS'; end if;
  if (select count(distinct value) from jsonb_array_elements_text(p_picks)) <> 5 then raise exception 'DUPLICATE_PICKS'; end if;
  select * into v_room from public.worker_rr_room where id=p_room_id and expires_at>now() for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_uid <> v_room.host_user_id and v_uid is distinct from v_room.guest_user_id then raise exception 'NOT_A_PARTICIPANT'; end if;
  if least(p_offer_seed, (p_offer_seed # 1597463007::bigint)) <> v_room.match_seed then raise exception 'BAD_SEED_PAIR'; end if;
  if v_room.guest_user_id is null then raise exception 'WAITING_FOR_OPPONENT'; end if;
  update public.worker_rr_entry set offer_seed=p_offer_seed,picks=p_picks,ready=true,locked_at=coalesce(locked_at,now()),updated_at=now() where room_id=p_room_id and user_id=v_uid;
  select coalesce(bool_or(ready) filter (where user_id=v_room.host_user_id),false), coalesce(bool_or(ready) filter (where user_id=v_room.guest_user_id),false)
    into v_host_ready,v_guest_ready from public.worker_rr_entry where room_id=p_room_id;
  update public.worker_rr_room set host_ready=v_host_ready, guest_ready=v_guest_ready,
    status=case when v_host_ready and v_guest_ready then 'countdown' else 'drafting' end,
    starts_at=case when v_host_ready and v_guest_ready then coalesce(worker_rr_room.starts_at,now()+interval '4 seconds') else worker_rr_room.starts_at end,
    updated_at=now() where id=p_room_id
    returning worker_rr_room.status, worker_rr_room.host_ready, worker_rr_room.guest_ready, worker_rr_room.starts_at
    into status,host_ready,guest_ready,starts_at;
  return next;
end; $$;

create or replace function public.worker_rr_state(p_room_id uuid)
returns table(room_id uuid, code text, match_seed bigint, status text, is_host boolean, opponent_joined boolean, you_ready boolean, opponent_ready boolean, starts_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_room public.worker_rr_room%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.worker_rr_room where id=p_room_id;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_uid <> v_room.host_user_id and v_uid is distinct from v_room.guest_user_id then raise exception 'NOT_A_PARTICIPANT'; end if;
  return query select v_room.id,v_room.code,v_room.match_seed,case when v_room.expires_at<=now() then 'expired' else v_room.status end,
    v_uid=v_room.host_user_id,v_room.guest_user_id is not null,
    case when v_uid=v_room.host_user_id then v_room.host_ready else v_room.guest_ready end,
    case when v_uid=v_room.host_user_id then v_room.guest_ready else v_room.host_ready end,
    v_room.starts_at,v_room.expires_at;
end; $$;

create or replace function public.worker_rr_claim(p_room_id uuid)
returns table(match_seed bigint, host_user_id uuid, guest_user_id uuid, host_offer_seed bigint, guest_offer_seed bigint, host_picks jsonb, guest_picks jsonb, starts_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_room public.worker_rr_room%rowtype; v_host public.worker_rr_entry%rowtype; v_guest public.worker_rr_entry%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.worker_rr_room where id=p_room_id and expires_at>now() for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_uid <> v_room.host_user_id and v_uid is distinct from v_room.guest_user_id then raise exception 'NOT_A_PARTICIPANT'; end if;
  if not v_room.host_ready or not v_room.guest_ready or v_room.starts_at is null then raise exception 'NOT_READY'; end if;
  if now() < v_room.starts_at then raise exception 'COUNTDOWN'; end if;
  select * into v_host from public.worker_rr_entry where room_id=p_room_id and user_id=v_room.host_user_id;
  select * into v_guest from public.worker_rr_entry where room_id=p_room_id and user_id=v_room.guest_user_id;
  if v_host.picks is null or v_guest.picks is null then raise exception 'MISSING_PICKS'; end if;
  update public.worker_rr_room set status='playing',updated_at=now() where id=p_room_id and status='countdown';
  return query select v_room.match_seed,v_room.host_user_id,v_room.guest_user_id,v_host.offer_seed,v_guest.offer_seed,v_host.picks,v_guest.picks,v_room.starts_at;
end; $$;

-- מי רשאי להריץ מה. ב-public כל פונקציה חדשה פתוחה ל-PUBLIC כברירת מחדל, ולכן סוגרים הכול קודם.
revoke all on function public.worker_profile_keep_identity()                                   from public, anon, authenticated;
revoke all on function public.worker_profile_keep_newest_card()                                from public, anon, authenticated;
revoke all on function public.worker_profile_ensure()                                          from public, anon, authenticated;
revoke all on function public.worker_touch_profile(uuid)                                       from public, anon, authenticated;
revoke all on function public.worker_record_run(text,text,integer,integer,integer,bigint,date) from public, anon, authenticated;
revoke all on function public.worker_poll_cast(text,text,text)                                 from public, anon, authenticated;
revoke all on function public.worker_poll_tally(text)                                          from public, anon, authenticated;
revoke all on function public.worker_collect(text, text[])                                     from public, anon, authenticated;
revoke all on function public.worker_mark_questions(jsonb)                                     from public, anon, authenticated;
revoke all on function public.worker_rr_code()                                                 from public, anon, authenticated;
revoke all on function public.worker_rr_create_room(bigint,bigint)                             from public, anon, authenticated;
revoke all on function public.worker_rr_join_room(text,bigint,bigint)                          from public, anon, authenticated;
revoke all on function public.worker_rr_lock(uuid,bigint,jsonb)                                from public, anon, authenticated;
revoke all on function public.worker_rr_state(uuid)                                            from public, anon, authenticated;
revoke all on function public.worker_rr_claim(uuid)                                            from public, anon, authenticated;

grant execute on function public.worker_profile_ensure()                                          to authenticated;
grant execute on function public.worker_record_run(text,text,integer,integer,integer,bigint,date) to authenticated;
grant execute on function public.worker_collect(text, text[])                                     to authenticated;
grant execute on function public.worker_mark_questions(jsonb)                                     to authenticated;
grant execute on function public.worker_rr_create_room(bigint,bigint)                             to authenticated;
grant execute on function public.worker_rr_join_room(text,bigint,bigint)                          to authenticated;
grant execute on function public.worker_rr_lock(uuid,bigint,jsonb)                                to authenticated;
grant execute on function public.worker_rr_state(uuid)                                            to authenticated;
grant execute on function public.worker_rr_claim(uuid)                                            to authenticated;
-- הקלפי פתוחה גם למי שלא נרשם: דרישה לחשבון כדי להצביע הייתה הופכת קלפי אנונימית למזוהה.
grant execute on function public.worker_poll_cast(text,text,text) to anon, authenticated;
grant execute on function public.worker_poll_tally(text)          to anon, authenticated;

-- =====================================================================
-- 9. מה כל דבר — בעברית, כמו בכל קובץ בתיקייה
-- =====================================================================
comment on table public.worker_profile is
  'THE WORKER — הכרטיס: שורה לכל מי שנכנס ל-THE WORKER (לא לכל משתמש בפרויקט המשותף עם DUBID). '
  'נוצרת ב-worker_profile_ensure. מספר מנוי שלא מונפק מחדש, מאז שרק הולך אחורה, והכרטיס של שער 10.';
comment on table public.worker_gate_run is
  'THE WORKER — סבב שהסתיים, או מעשה של יום (deed:<gate>:<day>). נכתב רק דרך worker_record_run.';
comment on table public.worker_poll_vote is
  'THE WORKER — הקלפי של שער 7: קול אחד למכשיר לכל שאלה, בלי משתמש ובלי מדיניות. '
  'נכנס דרך worker_poll_cast ויוצא רק כספירה דרך worker_poll_tally.';
comment on table public.worker_profile_item is
  'THE WORKER — האוספים: שורה לכל פריט. רק גדל, דרך worker_collect. הסרה היא אוסף שני או אסימון זוגיות.';
comment on table public.worker_question_mark is
  'THE WORKER — פנקס הנקמות של שער 2: לכל אדם ולכל שאלה, כמה פעמים נשאלה, כמה פעמים טעה ומה קרה בפעם האחרונה.';
comment on table public.worker_rr_room is
  'THE WORKER — חדר של רויאל ראמבל חי (שער 9), שני שחקנים, פג אחרי שעתיים.';
comment on table public.worker_rr_entry is
  'THE WORKER — מה שכל שחקן נעל בחדר של רויאל ראמבל חי.';
comment on function public.worker_profile_ensure() is
  'THE WORKER — יוצר את הכרטיס של המשתמש המחובר אם אין, ומחזיר אותו. מחליף טריגר על auth.users, שבפרויקט משותף אסור.';

-- =====================================================================
-- 10. בדיקה — התוצאה הנכונה: worker_tables 7 · worker_functions 15 · auth_triggers 0
-- =====================================================================
-- נספר לפי שם, כדי שהשורה תישאר נכונה גם אחרי שקובץ הארון (20260922120000) רץ לצידו.
select
  (select count(*) from pg_tables where schemaname = 'public'
     and tablename in ('worker_profile', 'worker_gate_run', 'worker_poll_vote', 'worker_profile_item',
                       'worker_question_mark', 'worker_rr_room', 'worker_rr_entry')) as worker_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('worker_profile_keep_identity', 'worker_profile_keep_newest_card', 'worker_profile_ensure',
                         'worker_touch_profile', 'worker_record_run', 'worker_poll_cast', 'worker_poll_tally',
                         'worker_collect', 'worker_mark_questions', 'worker_rr_code', 'worker_rr_create_room',
                         'worker_rr_join_room', 'worker_rr_lock', 'worker_rr_state', 'worker_rr_claim')) as worker_functions,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers;
