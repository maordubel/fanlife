-- =====================================================================
-- THE WORKER — "היציע שלי": קבוצות חברים (28.9.2026)
-- =====================================================================
--
-- **קובץ עצמאי.** לא תלוי בקבצים שלפניו ולא נוגע בהם. מריצים אותו אחרון.
-- **אם מריצים שוב את 20260922120000_worker_collector_market.sql — מריצים אחריו גם את זה**:
-- הקובץ ההוא סוגר בסוף את ההרשאה לכל פונקציית worker_ שהוא לא מכיר, כולל אלה.
--
-- מה זה: ONE RED WORLD §8, §30–§35, §45, §48. יציע הוא קבוצת חברים שמשחקים את אותו
-- "היום בהפועל", רואים סיפור קבוצתי, ויכוח משותף, "השבוע ביציע", יעדים משותפים והקשר בין שניים.
-- בלי צ'אט, בלי הודעות פרטיות, בלי עוקבים (§45 "לא ב-MVP").
--
--   · **זהות בלי חשבון** — אותה בנייה של הדו-קרב בשער 10. השרת של THE WORKER מחזיק לכל
--     מכשיר מפתח אקראי בעוגייה httpOnly (`stand_me`) ושולח אותו לכאן; נשמר רק sha256 שלו.
--     אין עמודה של user_id, מייל או שם אמיתי, ואין שום דבר על auth — לכן גם משתמש רשום לא
--     יכול להיחשף דרך היציע: החשבון לא נכנס לכאן בכלל (§35, ומה ש-lib/portal/device.ts אומר:
--     המכשיר והחשבון לא נוסעים באותה בקשה לעולם).
--   · **הזהות הציבורית היחידה** היא כינוי שהחבר בחר, או "אדום #N" — N הוא מספר ההצטרפות
--     **בתוך היציע הזה** (לא מספר גלובלי), כך ששני יציעים לא יכולים לחבר את אותו אדם.
--   · **שום קריאה ישירה מהטבלאות.** RLS דלוק, אין policy ואין grant. כל פעולה היא פונקציית
--     `security definer` שמחזירה `{ ok }` או `{ ok:false, error }` כערך.
--   · **רק סכומים יוצאים.** הויכוח יוצא כספירה, והספירה יוצאת רק למי שכבר הצביע. הפרה
--     העיוורת יוצאת רק למי שכבר סיים את היומית — והתשובה עצמה לא נשמרת כאן בכלל.
--   · **המינימום.** לכל חבר ליום: אילו משלושת פריטי "היום בהפועל" נעשו, תוצאת הפרה היומית
--     (סטטוס, רמזים, טעויות), והבחירה בויכוח של היציע. לשבוע: אילו תחנות נסגרו. נמחק אחרי 60 יום.
--
-- **הפרויקט משותף עם DUBID** (כלל 89): כל אובייקט מתחיל ב-worker_, אין שום דבר על auth.
-- **הרצה חוזרת בטוחה**, ונבדקה פעמיים ברצף על Postgres 16 מקומי (`scripts/db/verify.sh`,
-- `supabase/tests/60-stand.sql`).
--
-- **בסוף הקובץ יש שאילתת בדיקה.** התוצאה הנכונה:
--   `stand_tables 6 · stand_open_functions 8 · anon_can_touch 0 · auth_triggers 0`

-- =====================================================================
-- 1. הטבלאות
-- =====================================================================
create table if not exists public.worker_stand (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[2-9A-HJ-NP-Z]{6}$'),
  name       text not null check (char_length(name) between 1 and 32),
  created_by text not null check (created_by ~ '^[0-9a-f]{64}$'),
  next_no    integer not null default 1 check (next_no >= 1),
  created_at timestamptz not null default now()
);

create table if not exists public.worker_stand_member (
  stand_id  uuid not null references public.worker_stand(id) on delete cascade,
  member    text not null check (member ~ '^[0-9a-f]{64}$'),
  public_no integer not null check (public_no >= 1),
  nickname  text check (nickname is null or char_length(nickname) between 1 and 20),
  joined_at timestamptz not null default now(),
  primary key (stand_id, member),
  unique (stand_id, public_no)
);
create index if not exists worker_stand_member_member_idx on public.worker_stand_member (member);

-- יום של חבר — אחד לכל חבר ליום, לא ליציע: חבר בשלושה יציעים מדווח פעם אחת.
create table if not exists public.worker_stand_day (
  member      text not null check (member ~ '^[0-9a-f]{64}$'),
  day         date not null,
  slots       text[] not null default '{}' check (slots <@ array['remember', 'choose', 'discover']::text[]),
  bc_status   text check (bc_status is null or bc_status in ('solved', 'gave_up', 'timeout')),
  bc_hints    smallint check (bc_hints is null or bc_hints between 1 and 10),
  bc_wrong    smallint check (bc_wrong is null or bc_wrong between 0 and 50),
  debate_id   text check (debate_id is null or debate_id ~ '^[a-z0-9-]{1,48}$'),
  debate_pick text check (debate_pick is null or debate_pick ~ '^[A-Za-z0-9_:.-]{1,64}$'),
  updated_at  timestamptz not null default now(),
  primary key (member, day)
);

create table if not exists public.worker_stand_week (
  member     text not null check (member ~ '^[0-9a-f]{64}$'),
  week_start date not null check (extract(isodow from week_start) = 1),
  stations   text[] not null default '{}' check (stations <@ array['g2', 'g3', 'g4', 'g6', 'g8', 'g10', 'g13']::text[]),
  updated_at timestamptz not null default now(),
  primary key (member, week_start)
);

-- "שלח ליציע": שער, קישור לריצה, שורת תוצאה. לא הודעה — 48 תווים, בלי שורה חדשה, בלי כתובת.
create table if not exists public.worker_stand_post (
  id         bigint generated always as identity primary key,
  stand_id   uuid not null references public.worker_stand(id) on delete cascade,
  member     text not null check (member ~ '^[0-9a-f]{64}$'),
  gate       smallint not null check (gate between 1 and 13),
  href       text not null check (char_length(href) <= 600
               and href ~ '^/[a-z0-9-]+(/[A-Za-z0-9_-]+)*(\?[A-Za-z0-9=&_.:-]*)?$'),
  headline   text not null check (char_length(headline) between 1 and 48 and headline !~ '[[:cntrl:]<>@]'),
  created_at timestamptz not null default now()
);
create index if not exists worker_stand_post_stand_idx on public.worker_stand_post (stand_id, id desc);

create table if not exists public.worker_stand_rate (
  id     bigint generated always as identity primary key,
  member text not null,
  action text not null check (char_length(action) <= 16),
  at     timestamptz not null default now()
);
create index if not exists worker_stand_rate_idx on public.worker_stand_rate (member, action, at desc);

-- =====================================================================
-- 2. עזרים פנימיים — אף אחד מבחוץ לא קורא להם
-- =====================================================================
create or replace function public.worker_stand_fail(p_error text) returns jsonb
language sql immutable as $$ select jsonb_build_object('ok', false, 'error', p_error) $$;

/* המפתח של המכשיר → המזהה שנשמר. null למפתח שאינו 32–64 תווי hex. */
create or replace function public.worker_stand_me(p_me text) returns text
language sql immutable as $$
  select case when p_me ~ '^[0-9a-f]{32,64}$'
    then encode(sha256(convert_to('worker-stand|' || p_me, 'UTF8')), 'hex') end
$$;

create or replace function public.worker_stand_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Jerusalem')::date $$;

/* true כשעוד בתוך המכסה; רושם את הניסיון בכל מקרה. */
create or replace function public.worker_stand_rate_ok(p_member text, p_action text, p_limit integer, p_window interval)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  select count(*) into v_count from public.worker_stand_rate
    where member = p_member and action = p_action and at > now() - p_window;
  insert into public.worker_stand_rate (member, action) values (p_member, p_action);
  delete from public.worker_stand_rate where at < now() - interval '2 days';
  return v_count < p_limit;
end $$;

/* כינוי: בלי תווי בקרה, בלי < > @ (שלא ייכנס מייל בטעות), עד 20 תווים. ריק = null. */
create or replace function public.worker_stand_clean_nick(p_nick text) returns text
language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_nick, ''), '[[:cntrl:]<>@]', '', 'g')), 20), '')
$$;

create or replace function public.worker_stand_code() returns text
language plpgsql volatile as $$
declare
  v_abc constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_raw bytea;
  v_out text;
begin
  for attempt in 1..8 loop
    v_raw := uuid_send(gen_random_uuid());
    v_out := '';
    for i in 0..5 loop
      v_out := v_out || substr(v_abc, 1 + (get_byte(v_raw, i) % 32), 1);
    end loop;
    if not exists (select 1 from public.worker_stand where code = v_out) then return v_out; end if;
  end loop;
  return null;
end $$;

/* היציע לפי קוד, רק אם השואל חבר בו. */
create or replace function public.worker_stand_of(p_member text, p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select s.id from public.worker_stand s
    join public.worker_stand_member m on m.stand_id = s.id and m.member = p_member
   where s.code = upper(p_code)
$$;

-- =====================================================================
-- 3. יצירה, הצטרפות, עזיבה, הצצה
-- =====================================================================
create or replace function public.worker_stand_create(p_me text, p_name text, p_nick text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.worker_stand_me(p_me);
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>@]', '', 'g')), 32);
  v_code text;
  v_id uuid;
begin
  if v_me is null then return public.worker_stand_fail('bad_identity'); end if;
  if v_name = '' then return public.worker_stand_fail('bad_name'); end if;
  if not public.worker_stand_rate_ok(v_me, 'create', 5, interval '1 day') then
    return public.worker_stand_fail('slow_down');
  end if;
  if (select count(*) from public.worker_stand_member where member = v_me) >= 12 then
    return public.worker_stand_fail('too_many');
  end if;
  v_code := public.worker_stand_code();
  if v_code is null then return public.worker_stand_fail('busy'); end if;
  insert into public.worker_stand (code, name, created_by, next_no) values (v_code, v_name, v_me, 2)
    returning id into v_id;
  insert into public.worker_stand_member (stand_id, member, public_no, nickname)
    values (v_id, v_me, 1, public.worker_stand_clean_nick(p_nick));
  return jsonb_build_object('ok', true, 'code', v_code, 'name', v_name, 'no', 1);
end $$;

/* הצטרפות — או עדכון הכינוי למי שכבר בפנים. */
create or replace function public.worker_stand_join(p_me text, p_code text, p_nick text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.worker_stand_me(p_me);
  v_stand public.worker_stand%rowtype;
  v_no integer;
  v_nick text := public.worker_stand_clean_nick(p_nick);
begin
  if v_me is null then return public.worker_stand_fail('bad_identity'); end if;
  if p_code is null or upper(p_code) !~ '^[2-9A-HJ-NP-Z]{6}$' then return public.worker_stand_fail('not_found'); end if;
  if not public.worker_stand_rate_ok(v_me, 'join', 30, interval '1 hour') then
    return public.worker_stand_fail('slow_down');
  end if;
  select * into v_stand from public.worker_stand where code = upper(p_code) for update;
  if not found then return public.worker_stand_fail('not_found'); end if;
  select public_no into v_no from public.worker_stand_member where stand_id = v_stand.id and member = v_me;
  if found then
    update public.worker_stand_member set nickname = v_nick where stand_id = v_stand.id and member = v_me;
    return jsonb_build_object('ok', true, 'code', v_stand.code, 'name', v_stand.name, 'no', v_no, 'already', true);
  end if;
  if (select count(*) from public.worker_stand_member where stand_id = v_stand.id) >= 60 then
    return public.worker_stand_fail('full');
  end if;
  if (select count(*) from public.worker_stand_member where member = v_me) >= 12 then
    return public.worker_stand_fail('too_many');
  end if;
  v_no := v_stand.next_no;
  update public.worker_stand set next_no = next_no + 1 where id = v_stand.id;
  insert into public.worker_stand_member (stand_id, member, public_no, nickname) values (v_stand.id, v_me, v_no, v_nick);
  return jsonb_build_object('ok', true, 'code', v_stand.code, 'name', v_stand.name, 'no', v_no, 'already', false);
end $$;

/* עזיבה. היציע האחרון שיוצא ממנו סוגר אותו (והפיד שלו איתו). */
create or replace function public.worker_stand_leave(p_me text, p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.worker_stand_me(p_me);
  v_id uuid;
begin
  if v_me is null then return public.worker_stand_fail('bad_identity'); end if;
  v_id := public.worker_stand_of(v_me, coalesce(p_code, ''));
  if v_id is null then return public.worker_stand_fail('not_member'); end if;
  delete from public.worker_stand_member where stand_id = v_id and member = v_me;
  delete from public.worker_stand_post where stand_id = v_id and member = v_me;
  if not exists (select 1 from public.worker_stand_member where stand_id = v_id) then
    delete from public.worker_stand where id = v_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

/* מה שאורח עם הקישור רואה: שם, כמה חברים, והאם הוא כבר בפנים. בלי אף חבר בשמו. */
create or replace function public.worker_stand_peek(p_me text, p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.worker_stand_me(p_me);
  v_stand public.worker_stand%rowtype;
begin
  if p_code is null or upper(p_code) !~ '^[2-9A-HJ-NP-Z]{6}$' then return public.worker_stand_fail('not_found'); end if;
  select * into v_stand from public.worker_stand where code = upper(p_code);
  if not found then return public.worker_stand_fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'code', v_stand.code, 'name', v_stand.name,
    'members', (select count(*) from public.worker_stand_member where stand_id = v_stand.id),
    'member', v_me is not null and exists (select 1 from public.worker_stand_member where stand_id = v_stand.id and member = v_me));
end $$;

/* היציעים שלי, עם מה שה-NowLayer צריך: כמה אחרים כבר שיחקו היום. */
create or replace function public.worker_stand_mine(p_me text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me text := public.worker_stand_me(p_me);
begin
  if v_me is null then return public.worker_stand_fail('bad_identity'); end if;
  return jsonb_build_object('ok', true, 'stands', coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', s.code, 'name', s.name, 'no', m.public_no, 'nick', m.nickname,
      'members', (select count(*) from public.worker_stand_member x where x.stand_id = s.id),
      'othersToday', (select count(*) from public.worker_stand_member x
                        join public.worker_stand_day d on d.member = x.member and d.day = public.worker_stand_today()
                       where x.stand_id = s.id and x.member <> v_me and cardinality(d.slots) > 0))
      order by m.joined_at)
      from public.worker_stand_member m join public.worker_stand s on s.id = m.stand_id
     where m.member = v_me), '[]'::jsonb));
end $$;

-- =====================================================================
-- 4. הדיווח — מה המכשיר עשה היום (מונוטוני: רק מתווסף)
-- =====================================================================
create or replace function public.worker_stand_report(
  p_me text, p_day date, p_slots text[],
  p_bc_status text, p_bc_hints integer, p_bc_wrong integer,
  p_debate_id text, p_debate_pick text,
  p_week_start date, p_stations text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.worker_stand_me(p_me);
  v_today date := public.worker_stand_today();
  v_slots text[];
  v_stations text[];
  v_bc boolean;
  v_debate boolean;
begin
  if v_me is null then return public.worker_stand_fail('bad_identity'); end if;
  -- אורח שאינו חבר באף יציע: לא נשמר עליו כלום
  if not exists (select 1 from public.worker_stand_member where member = v_me) then
    return public.worker_stand_fail('not_member');
  end if;
  if p_day is distinct from v_today then return public.worker_stand_fail('bad_day'); end if;
  if not public.worker_stand_rate_ok(v_me, 'report', 120, interval '1 hour') then
    return public.worker_stand_fail('slow_down');
  end if;
  select coalesce(array_agg(distinct s order by s), '{}') into v_slots
    from unnest(coalesce(p_slots, '{}')) s where s in ('remember', 'choose', 'discover');
  v_bc := p_bc_status in ('solved', 'gave_up', 'timeout') and p_bc_hints between 1 and 10
          and coalesce(p_bc_wrong, 0) between 0 and 50;
  v_debate := p_debate_id ~ '^[a-z0-9-]{1,48}$' and p_debate_pick ~ '^[A-Za-z0-9_:.-]{1,64}$';

  insert into public.worker_stand_day as d (member, day, slots, bc_status, bc_hints, bc_wrong, debate_id, debate_pick)
  values (v_me, v_today, v_slots,
          case when v_bc then p_bc_status end, case when v_bc then p_bc_hints end,
          case when v_bc then coalesce(p_bc_wrong, 0) end,
          case when v_debate then p_debate_id end, case when v_debate then p_debate_pick end)
  on conflict (member, day) do update set
    slots = (select coalesce(array_agg(distinct s order by s), '{}') from unnest(d.slots || excluded.slots) s),
    -- הפרה היומית נסגרת פעם אחת: התוצאה הראשונה היא התוצאה
    bc_status = coalesce(d.bc_status, excluded.bc_status),
    bc_hints = coalesce(d.bc_hints, excluded.bc_hints),
    bc_wrong = coalesce(d.bc_wrong, excluded.bc_wrong),
    debate_id = coalesce(d.debate_id, excluded.debate_id),
    debate_pick = case when d.debate_id is null then excluded.debate_pick else d.debate_pick end,
    updated_at = now()
  returning d.slots into v_slots;

  if p_week_start is not null then
    if p_week_start <> v_today - (extract(isodow from v_today)::integer - 1) then
      return public.worker_stand_fail('bad_week');
    end if;
    select coalesce(array_agg(distinct s order by s), '{}') into v_stations
      from unnest(coalesce(p_stations, '{}')) s where s in ('g2', 'g3', 'g4', 'g6', 'g8', 'g10', 'g13');
    insert into public.worker_stand_week as w (member, week_start, stations) values (v_me, p_week_start, v_stations)
    on conflict (member, week_start) do update set
      stations = (select coalesce(array_agg(distinct s order by s), '{}') from unnest(w.stations || excluded.stations) s),
      updated_at = now();
  end if;

  delete from public.worker_stand_day where day < v_today - 60;
  delete from public.worker_stand_week where week_start < v_today - 63;
  return jsonb_build_object('ok', true, 'slots', to_jsonb(v_slots));
end $$;

-- =====================================================================
-- 5. "שלח ליציע"
-- =====================================================================
create or replace function public.worker_stand_post(p_me text, p_code text, p_gate integer, p_href text, p_headline text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.worker_stand_me(p_me);
  v_id uuid;
  v_head text := btrim(coalesce(p_headline, ''));
begin
  if v_me is null then return public.worker_stand_fail('bad_identity'); end if;
  v_id := public.worker_stand_of(v_me, coalesce(p_code, ''));
  if v_id is null then return public.worker_stand_fail('not_member'); end if;
  if p_gate is null or p_gate not between 1 and 13 then return public.worker_stand_fail('bad_post'); end if;
  if p_href is null or char_length(p_href) > 600
     or p_href !~ '^/[a-z0-9-]+(/[A-Za-z0-9_-]+)*(\?[A-Za-z0-9=&_.:-]*)?$' then
    return public.worker_stand_fail('bad_post');
  end if;
  if char_length(v_head) not between 1 and 48 or v_head ~ '[[:cntrl:]<>@]' then
    return public.worker_stand_fail('bad_post');
  end if;
  if not public.worker_stand_rate_ok(v_me, 'post', 30, interval '1 day') then
    return public.worker_stand_fail('slow_down');
  end if;
  insert into public.worker_stand_post (stand_id, member, gate, href, headline) values (v_id, v_me, p_gate, p_href, v_head);
  -- חמישים אחרונים ליציע; הפיד הוא מה שחזר מהמשחקים, לא ארכיון שיחה
  delete from public.worker_stand_post where stand_id = v_id and id not in
    (select id from public.worker_stand_post where stand_id = v_id order by id desc limit 50);
  return jsonb_build_object('ok', true);
end $$;

-- =====================================================================
-- 6. בית היציע — הכול מספירה של שורות אמיתיות, לחבר בלבד
-- =====================================================================
create or replace function public.worker_stand_home(p_me text, p_code text, p_debate text, p_week_start date, p_stations text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.worker_stand_me(p_me);
  v_id uuid;
  v_stand public.worker_stand%rowtype;
  v_today date := public.worker_stand_today();
  v_week date;
  v_stations text[];
  v_you jsonb;
  v_members integer;
  v_mine public.worker_stand_day%rowtype;
  v_bc jsonb;
  v_debate jsonb;
  v_voted boolean;
begin
  if v_me is null then return public.worker_stand_fail('bad_identity'); end if;
  v_id := public.worker_stand_of(v_me, coalesce(p_code, ''));
  if v_id is null then return public.worker_stand_fail('not_member'); end if;
  if not public.worker_stand_rate_ok(v_me, 'home', 240, interval '1 hour') then
    return public.worker_stand_fail('slow_down');
  end if;
  select * into v_stand from public.worker_stand where id = v_id;
  v_week := coalesce(p_week_start, v_today - (extract(isodow from v_today)::integer - 1));
  select coalesce(array_agg(distinct s), '{}') into v_stations
    from unnest(coalesce(p_stations, '{}')) s where s in ('g2', 'g3', 'g4', 'g6', 'g8', 'g10', 'g13');

  create temp table if not exists worker_stand_tmp_members (member text primary key, public_no integer, nickname text) on commit drop;
  truncate worker_stand_tmp_members;
  insert into worker_stand_tmp_members select member, public_no, nickname from public.worker_stand_member where stand_id = v_id;
  select count(*) into v_members from worker_stand_tmp_members;
  select jsonb_build_object('no', public_no, 'nick', nickname) into v_you from worker_stand_tmp_members where member = v_me;
  select * into v_mine from public.worker_stand_day where member = v_me and day = v_today;

  -- הפרה העיוורת: רק למי שכבר סיים את היומית שלו. לאחרים — כמה סיימו, ותו לא.
  if v_mine.bc_status is not null then
    select jsonb_build_object(
      'mine', true,
      'finished', count(*),
      'solved', count(*) filter (where d.bc_status = 'solved'),
      'early', count(*) filter (where d.bc_status = 'solved' and d.bc_hints <= 3),
      'ranking', coalesce((select jsonb_agg(r order by (r ->> 'hints')::int, (r ->> 'wrong')::int, (r ->> 'no')::int) from (
          select jsonb_build_object('no', m2.public_no, 'nick', m2.nickname, 'hints', d2.bc_hints, 'wrong', d2.bc_wrong,
                                    'you', m2.member = v_me) as r
            from worker_stand_tmp_members m2 join public.worker_stand_day d2 on d2.member = m2.member and d2.day = v_today
           where d2.bc_status = 'solved'
           order by d2.bc_hints, d2.bc_wrong, m2.public_no limit 5) top), '[]'::jsonb))
      into v_bc
      from worker_stand_tmp_members m join public.worker_stand_day d on d.member = m.member and d.day = v_today
     where d.bc_status is not null;
  else
    select jsonb_build_object('mine', false, 'finished', count(*)) into v_bc
      from worker_stand_tmp_members m join public.worker_stand_day d on d.member = m.member and d.day = v_today
     where d.bc_status is not null;
  end if;

  -- הויכוח: הבחירה האחרונה של כל חבר על הויכוח הזה; הספירה רק למי שהצביע.
  v_voted := p_debate is not null and exists (
    select 1 from public.worker_stand_day where member = v_me and debate_id = p_debate);
  with last_pick as (
    select distinct on (d.member) d.member, d.debate_pick
      from worker_stand_tmp_members m join public.worker_stand_day d on d.member = m.member
     where d.debate_id = p_debate
     order by d.member, d.day desc)
  select case when v_voted then jsonb_build_object('mine', true, 'voters', (select count(*) from last_pick),
      'yours', (select debate_pick from last_pick where member = v_me),
      'tally', coalesce((select jsonb_agg(jsonb_build_object('pick', debate_pick, 'n', n) order by n desc, debate_pick)
                          from (select debate_pick, count(*) as n from last_pick group by debate_pick) t), '[]'::jsonb))
    else jsonb_build_object('mine', false, 'voters', (select count(*) from last_pick)) end
    into v_debate;

  return jsonb_build_object(
    'ok', true, 'code', v_stand.code, 'name', v_stand.name, 'members', v_members, 'you', v_you,
    'today', (select jsonb_build_object(
        'played', count(*) filter (where cardinality(d.slots) > 0),
        'all3', count(*) filter (where cardinality(d.slots) = 3),
        'youPlayed', coalesce(bool_or(m.member = v_me and cardinality(d.slots) > 0), false))
      from worker_stand_tmp_members m left join public.worker_stand_day d on d.member = m.member and d.day = v_today),
    'blindCow', v_bc,
    'debate', v_debate,
    'remember', jsonb_build_object(
      'daysTogether', (select count(*) from (
          select d.day from worker_stand_tmp_members m join public.worker_stand_day d on d.member = m.member
           where d.day > v_today - 30 and cardinality(d.slots) > 0 group by d.day having count(*) >= 2) x),
      'debates', coalesce((
        with last_pick as (
          select distinct on (d.member, d.debate_id) d.member, d.debate_id, d.debate_pick
            from worker_stand_tmp_members m join public.worker_stand_day d on d.member = m.member
           where d.day > v_today - 30 and d.debate_id is not null and d.debate_id is distinct from p_debate
           order by d.member, d.debate_id, d.day desc),
        per as (select debate_id, debate_pick, count(*) as n from last_pick group by debate_id, debate_pick),
        tot as (select debate_id, sum(n) as voters, max(n) as top from per group by debate_id having sum(n) >= 2)
        select jsonb_agg(jsonb_build_object('debate', t.debate_id, 'voters', t.voters,
                 'picks', (select jsonb_agg(jsonb_build_object('pick', p.debate_pick, 'n', p.n) order by p.n desc, p.debate_pick)
                             from per p where p.debate_id = t.debate_id))
               order by t.voters desc, t.debate_id)
          from tot t), '[]'::jsonb)),
    'week', jsonb_build_object(
      'start', v_week,
      'players', (select count(distinct d.member) from worker_stand_tmp_members m join public.worker_stand_day d on d.member = m.member
                   where d.day >= v_week and d.day < v_week + 7 and cardinality(d.slots) > 0),
      'solved', (select count(*) from worker_stand_tmp_members m join public.worker_stand_day d on d.member = m.member
                  where d.day >= v_week and d.day < v_week + 7 and d.bc_status = 'solved'),
      'stations', coalesce((select jsonb_object_agg(s, (select count(*) from worker_stand_tmp_members m
                                join public.worker_stand_week w on w.member = m.member and w.week_start = v_week
                               where s = any(w.stations)))
                            from unnest(v_stations) s), '{}'::jsonb),
      'closedAll', (select count(*) from worker_stand_tmp_members m join public.worker_stand_week w on w.member = m.member
                     where w.week_start = v_week and cardinality(v_stations) > 0 and v_stations <@ w.stations)),
    'feed', coalesce((select jsonb_agg(jsonb_build_object('no', m.public_no, 'nick', m.nickname, 'gate', p.gate, 'href', p.href,
                        'headline', p.headline, 'at', p.created_at, 'mine', p.member = v_me) order by p.id desc)
                       from (select * from public.worker_stand_post where stand_id = v_id order by id desc limit 10) p
                       join worker_stand_tmp_members m on m.member = p.member), '[]'::jsonb),
    -- שניים שחולקים משחקים: עובדות על הקשר, לא טבלת ניצחונות (§33)
    'pairs', coalesce((
      with other as (select * from worker_stand_tmp_members where member <> v_me),
      facts as (
        select o.public_no, o.nickname,
          (select count(*) from public.worker_stand_day a join public.worker_stand_day b on b.day = a.day and b.member = o.member
            where a.member = v_me and cardinality(a.slots) > 0 and cardinality(b.slots) > 0) as days_both,
          (select count(*) from public.worker_stand_day a join public.worker_stand_day b on b.day = a.day and b.member = o.member
            where a.member = v_me and a.bc_status is not null and b.bc_status is not null) as bc_both,
          (select count(*) from public.worker_stand_day a join public.worker_stand_day b on b.day = a.day and b.member = o.member
            where a.member = v_me and b.bc_status = 'solved' and (a.bc_status <> 'solved' or b.bc_hints < a.bc_hints)) as they_earlier,
          (select count(*) from public.worker_stand_day a join public.worker_stand_day b on b.day = a.day and b.member = o.member
            where a.member = v_me and a.bc_status = 'solved' and (b.bc_status <> 'solved' or a.bc_hints < b.bc_hints)) as you_earlier,
          (select count(*) from (select distinct on (debate_id) debate_id, debate_pick from public.worker_stand_day
                                   where member = v_me and debate_id is not null order by debate_id, day desc) a
                             join (select distinct on (debate_id) debate_id, debate_pick from public.worker_stand_day
                                   where member = o.member and debate_id is not null order by debate_id, day desc) b
                               on b.debate_id = a.debate_id) as debates_both,
          (select count(*) from (select distinct on (debate_id) debate_id, debate_pick from public.worker_stand_day
                                   where member = v_me and debate_id is not null order by debate_id, day desc) a
                             join (select distinct on (debate_id) debate_id, debate_pick from public.worker_stand_day
                                   where member = o.member and debate_id is not null order by debate_id, day desc) b
                               on b.debate_id = a.debate_id and b.debate_pick = a.debate_pick) as debates_agree,
          (select count(distinct a.href) from public.worker_stand_post a join public.worker_stand_post b
             on b.href = a.href and b.stand_id = a.stand_id and b.member = o.member
            where a.stand_id = v_id and a.member = v_me) as same_runs
        from other o)
      select jsonb_agg(jsonb_build_object('no', public_no, 'nick', nickname, 'daysBoth', days_both, 'bcBoth', bc_both,
               'theyEarlier', they_earlier, 'youEarlier', you_earlier, 'debatesBoth', debates_both,
               'debatesAgree', debates_agree, 'sameRuns', same_runs)
             order by (same_runs + bc_both + debates_both) desc, public_no)
        from (select * from facts where same_runs + bc_both + debates_both >= 2
              order by (same_runs + bc_both + debates_both) desc, public_no limit 6) f), '[]'::jsonb)
  );
end $$;

-- =====================================================================
-- 7. RLS והרשאות — הטבלאות סגורות לגמרי; רק שמונה הפעולות פתוחות
-- =====================================================================
do $rls$
declare v_table text;
begin
  foreach v_table in array array['worker_stand', 'worker_stand_member', 'worker_stand_day', 'worker_stand_week',
                                 'worker_stand_post', 'worker_stand_rate'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated', v_table);
  end loop;
end
$rls$;

do $sequences$
declare v_seq text;
begin
  for v_seq in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relkind = 'S' and c.relname like 'worker\_stand\_%' loop
    execute format('revoke all on sequence public.%I from public, anon, authenticated', v_seq);
  end loop;
end
$sequences$;

do $functions$
declare
  v_fn record;
  v_open text[] := array['worker_stand_create', 'worker_stand_join', 'worker_stand_leave', 'worker_stand_peek',
                         'worker_stand_mine', 'worker_stand_report', 'worker_stand_post', 'worker_stand_home'];
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_stand\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = any(v_open) then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    end if;
  end loop;
end
$functions$;

comment on table public.worker_stand is
  'THE WORKER — היציע שלי: קבוצת חברים. קוד הזמנה ושם. בלי צ''אט.';
comment on table public.worker_stand_member is
  'THE WORKER — חבר ביציע: sha256 של מפתח מכשיר, מספר בתוך היציע, כינוי. בלי user_id, מייל או שם.';
comment on table public.worker_stand_day is
  'THE WORKER — יום של חבר: אילו פריטים של היום בהפועל, תוצאת הפרה היומית, הבחירה בוויכוח. נמחק אחרי 60 יום.';
comment on table public.worker_stand_week is
  'THE WORKER — השבוע ביציע: אילו תחנות החבר סגר השבוע.';
comment on table public.worker_stand_post is
  'THE WORKER — שלח ליציע: שער, קישור לריצה ושורת תוצאה. לא הודעה.';
comment on table public.worker_stand_rate is
  'THE WORKER — מונה ניסיונות ליציע, נמחק אחרי יומיים.';

-- =====================================================================
-- 8. בדיקה — התוצאה הנכונה: stand_tables 6 · stand_open_functions 8 · anon_can_touch 0 · auth_triggers 0
-- =====================================================================
select
  (select count(*) from pg_tables where schemaname = 'public'
     and tablename in ('worker_stand', 'worker_stand_member', 'worker_stand_day', 'worker_stand_week',
                       'worker_stand_post', 'worker_stand_rate')) as stand_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_stand\_%'
       and has_function_privilege('anon', p.oid, 'execute')) as stand_open_functions,
  (select count(*) from pg_tables t cross join (values ('select'), ('insert'), ('update'), ('delete')) as priv(p)
     where t.schemaname = 'public' and t.tablename like 'worker\_stand%'
       and (has_table_privilege('anon', format('public.%I', t.tablename), priv.p)
            or has_table_privilege('authenticated', format('public.%I', t.tablename), priv.p))) as anon_can_touch,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers;
