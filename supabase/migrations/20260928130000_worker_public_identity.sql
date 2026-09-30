-- =====================================================================
-- THE WORKER — הזהות הציבורית: "אדום #N" או כינוי (ONE RED WORLD §35, 28.9.2026)
-- =====================================================================
--
-- המפרט: "משתמש רשום יכול להופיע באנונימיות מלאה. להפריד accountIdentity מ-publicSupporterIdentity.
-- קבוצה יכולה לראות 'אדום #7' בלי לדעת email/name."
--
--   · **שלוש עמודות על worker_profile, בתוספת בלבד.** `public_mode` ('anonymous' | 'nickname',
--     ברירת המחדל אנונימי — פרטיות היא מצב ההתחלה, לא הגדרה שמחפשים), `public_nickname`
--     (עד 18 תווים, כמו השם על החולצה), `public_edited_at` (העריכה החדשה מנצחת בין מכשירים).
--   · **`supporter_no` — המספר של "אדום #N".** מונפק פעם אחת מרצף משלו, ואז קפוא, כמו
--     `member_no` (כלל 76): טריגר זורק על כל שינוי של מספר שכבר נכתב. הוא לא נגזר מ-id, לא
--     מ-member_no ולא מסדר ההרשמה לפרויקט המשותף — רק ממתי שהאדם ביקש זהות ציבורית ב-THE WORKER.
--   · **אין grant חדש לעמודות.** ה-grant update הקיים על worker_profile מונה עמודות, והעמודות
--     האלה לא בו — כתיבה רק דרך `worker_public_identity_set` (security definer).
--   · **`worker_public_label(uuid)` היא הדרך היחידה של משטח ציבורי (יציע, כרטיס קבוצה) לדעת
--     מי מישהו.** היא מחזירה תווית ומספר — לעולם לא id, מייל או display_name של החשבון. היא
--     לא פתוחה לאף תפקיד: פונקציה אחרת של THE WORKER (security definer) קוראת לה.
--
-- **תלוי ב-`20260922090000_worker_shared_project.sql`.** אם מריצים שוב את
-- `20260922120000_worker_collector_market.sql` — מריצים אחריו גם את זה (הוא סוגר הרשאות לכל
-- פונקציית worker_ שהוא לא מכיר). **הפרויקט משותף עם DUBID** (כללים 89, 90): הכול worker_,
-- שום דבר על auth. **הרצה חוזרת בטוחה.** נבדק ב-`scripts/db/verify.sh` →
-- `supabase/tests/60-public-identity.sql`.
--
-- שורת הבדיקה בסוף: `public_columns 4 · public_functions 4 · anon_can_call 0 · auth_triggers 0`.
-- =====================================================================

create sequence if not exists public.worker_supporter_no_seq start 1;

alter table public.worker_profile add column if not exists supporter_no integer;
alter table public.worker_profile add column if not exists public_mode text not null default 'anonymous';
alter table public.worker_profile add column if not exists public_nickname text;
alter table public.worker_profile add column if not exists public_edited_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_profile_supporter_no_key') then
    alter table public.worker_profile add constraint worker_profile_supporter_no_key unique (supporter_no);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'worker_profile_public_mode_check') then
    alter table public.worker_profile add constraint worker_profile_public_mode_check
      check (public_mode in ('anonymous', 'nickname'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'worker_profile_public_nickname_check') then
    alter table public.worker_profile add constraint worker_profile_public_nickname_check
      check (public_nickname is null or char_length(public_nickname) between 1 and 18);
  end if;
end $$;

/*
 * מספר שנכתב לא זז, והעריכה הציבורית החדשה מנצחת. c_ — רץ אחרי a_ (member_no) ו-b_ (הכרטיס).
 */
create or replace function public.worker_profile_keep_public() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.supporter_no is not null and new.supporter_no is distinct from old.supporter_no then
    raise exception 'supporter_no cannot be re-issued: % is already this supporter''s number', old.supporter_no;
  end if;
  if old.public_edited_at is not null
     and (new.public_edited_at is null or new.public_edited_at < old.public_edited_at) then
    new.public_mode      := old.public_mode;
    new.public_nickname  := old.public_nickname;
    new.public_edited_at := old.public_edited_at;
  end if;
  return new;
end $$;

drop trigger if exists worker_profile_c_public on public.worker_profile;
create trigger worker_profile_c_public before update on public.worker_profile
  for each row execute function public.worker_profile_keep_public();

/* הכינוי כפי שהוא נשמר: רווחים מקוצצים, ריק = אין. */
create or replace function public.worker_clean_nickname(p text) returns text
language sql immutable set search_path = public as $$
  select nullif(left(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), 18), '')
$$;

/*
 * התווית הציבורית של אדם. כינוי רק כשהוא בחר בכינוי וגם יש כינוי; אחרת "אדום #N".
 * אין כאן id, מייל או display_name — זה כל מה שמשטח ציבורי יודע.
 */
create or replace function public.worker_public_label(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when p.id is null then jsonb_build_object('label', 'אדום', 'no', null, 'mode', 'anonymous')
    when p.public_mode = 'nickname' and p.public_nickname is not null
      then jsonb_build_object('label', p.public_nickname, 'no', p.supporter_no, 'mode', 'nickname')
    else jsonb_build_object(
      'label', case when p.supporter_no is null then 'אדום' else 'אדום #' || p.supporter_no end,
      'no', p.supporter_no, 'mode', 'anonymous')
  end
  from (select 1) one
  left join public.worker_profile p on p.id = p_user
$$;

/* הזהות הציבורית שלי: המצב, הכינוי, המספר, התווית וזמן העריכה. מנפיקה מספר אם אין. */
create or replace function public.worker_public_identity_me() returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v public.worker_profile%rowtype;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'signed_out'); end if;
  perform public.worker_touch_profile(v_user);
  update public.worker_profile set supporter_no = nextval('public.worker_supporter_no_seq')
   where id = v_user and supporter_no is null;
  select * into v from public.worker_profile where id = v_user;
  return jsonb_build_object('ok', true,
    'mode', v.public_mode, 'nickname', v.public_nickname, 'no', v.supporter_no,
    'editedAt', v.public_edited_at, 'label', public.worker_public_label(v_user) -> 'label');
end $$;

/*
 * p_mode 'anonymous' | 'nickname', p_nickname עד 18 תווים, p_at — זמן העריכה במכשיר.
 * עריכה ישנה מזו שבחשבון לא דורסת (הטריגר); at מהעתיד מקוצץ ל-now().
 * מחזירה ערך ולא זורקת — הלקוח שקט כשאין חשבון.
 */
create or replace function public.worker_public_identity_set(p_mode text, p_nickname text, p_at timestamptz)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_nick text := public.worker_clean_nickname(p_nickname);
begin
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'signed_out'); end if;
  if p_mode is null or p_mode not in ('anonymous', 'nickname') then
    return jsonb_build_object('ok', false, 'error', 'mode');
  end if;
  if p_mode = 'nickname' and v_nick is null then
    return jsonb_build_object('ok', false, 'error', 'nickname_required');
  end if;
  perform public.worker_touch_profile(v_user);
  update public.worker_profile
     set public_mode = p_mode,
         public_nickname = v_nick,
         public_edited_at = least(coalesce(p_at, now()), now()),
         supporter_no = coalesce(supporter_no, nextval('public.worker_supporter_no_seq'))
   where id = v_user;
  return public.worker_public_identity_me();
end $$;

revoke all on function public.worker_profile_keep_public()                        from public, anon, authenticated;
revoke all on function public.worker_clean_nickname(text)                          from public, anon, authenticated;
revoke all on function public.worker_public_label(uuid)                            from public, anon, authenticated;
revoke all on function public.worker_public_identity_me()                          from public, anon, authenticated;
revoke all on function public.worker_public_identity_set(text, text, timestamptz)  from public, anon, authenticated;
grant execute on function public.worker_public_identity_me()                         to authenticated;
grant execute on function public.worker_public_identity_set(text, text, timestamptz) to authenticated;

comment on column public.worker_profile.supporter_no is
  'THE WORKER — המספר של "אדום #N". מונפק פעם אחת (worker_public_identity_me/_set) וקפוא (worker_profile_c_public).';
comment on column public.worker_profile.public_mode is
  'THE WORKER — איך האדם מופיע ביציע ובכרטיס קבוצה: anonymous ("אדום #N", ברירת מחדל) או nickname.';
comment on function public.worker_public_label(uuid) is
  'THE WORKER — התווית הציבורית של אדם (כינוי או "אדום #N") ומספרו. לעולם לא id, מייל או שם חשבון. לא פתוחה לאף תפקיד.';

-- =====================================================================
-- בדיקה — התוצאה הנכונה: public_columns 4 · public_functions 4 · anon_can_call 0 · auth_triggers 0
-- =====================================================================
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'worker_profile'
     and column_name in ('supporter_no', 'public_mode', 'public_nickname', 'public_edited_at')) as public_columns,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in
      ('worker_profile_keep_public', 'worker_public_label', 'worker_public_identity_me', 'worker_public_identity_set')) as public_functions,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'worker_public%' and has_function_privilege('anon', p.oid, 'execute')) as anon_can_call,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers;
