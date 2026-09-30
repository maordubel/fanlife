-- =====================================================================
-- THE WORKER — שער 10, פרה עיוורת: דו-קרב חי (25.9.2026)
-- =====================================================================
--
-- **רץ אחרי `20260924090000_worker_blind_cow.sql`, ורק אחריו** — הוא בודק את זה בשורה
-- הראשונה. **אם מריצים שוב את קובץ הדו-קרב או את 20260922120000_worker_collector_market.sql —
-- מריצים אחריהם גם את זה** (שניהם סוגרים בסוף את ההרשאה לכל פונקציית worker_ שהם לא מכירים).
--
-- מה זה: מפרט Gate 10 §2.4 — "אותו מודל נתונים בדיוק, עם Ready Room + countdown + Supabase
-- Realtime. אין צורך לבנות מנוע ניקוד נוסף; Live ו-Async משתמשים באותה תוצאה קנונית."
--
-- מה נוסף, ורק זה:
--   · שתי עמודות: `worker_blind_cow_duel.live_go_at` (רגע הפתיחה המשותף) ו-
--     `worker_blind_cow_duel_slot.live_ready_at` (הצד לחץ "מוכן").
--   · שלוש פונקציות security definer, כולן מחזירות ערך:
--       worker_blind_cow_live_ready(me, token, ready)  — מוכן/לא מוכן. כששני הצדדים מוכנים
--                                                         המסד קובע go_at = now() + 4 שניות.
--       worker_blind_cow_live_state(me, token)         — מי בחדר, מי מוכן, go_at, שעון השרת.
--       worker_blind_cow_live_start(me, token)         — פותח את הריצה של השואל עם
--                                                         started_at = go_at — אותו רגע לשניהם,
--                                                         מה שלא יהיה זמן הרשת. לפני go_at: 'too_early'.
--   · הרמזים, הניחוש, הוויתור, הסגירה והמנצח — שבע הפונקציות הקיימות, בלי שינוי.
--
-- Realtime: הערוץ הוא Broadcast/Presence בין שני הדפדפנים ("נגעתי — תשאל שוב"); הוא לא נושא
-- תוצאה ולא מצב. המצב תמיד נקרא מכאן. בלי Realtime המסך שואל כל 1.5 שניות — אותה תוצאה.
--
-- **הפרויקט משותף עם DUBID** (כלל 89): כל אובייקט מתחיל ב-worker_, אין שום דבר על auth.
-- **הרצה חוזרת בטוחה**, ונבדקה פעמיים ברצף על Postgres 16 מקומי
-- (`scripts/db/verify.sh`, `supabase/tests/31-blind-cow-live.sql`).
-- =====================================================================

do $guard$
begin
  if to_regclass('public.worker_blind_cow_duel') is null or to_regclass('public.worker_blind_cow_duel_slot') is null then
    raise exception 'run 20260924090000_worker_blind_cow.sql first — this file only adds the live room to it';
  end if;
end
$guard$;

alter table public.worker_blind_cow_duel add column if not exists live_go_at timestamptz;
alter table public.worker_blind_cow_duel_slot add column if not exists live_ready_at timestamptz;

/* מצב החדר כפי שהשואל רואה אותו. אין בו תוצאה — רק מי בפנים ומי מוכן. */
create or replace function public.worker_blind_cow_live_state(p_me text, p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me text := public.worker_blind_cow_me(p_me);
  v_duel public.worker_blind_cow_duel;
  v_mine public.worker_blind_cow_duel_slot;
  v_other public.worker_blind_cow_duel_slot;
begin
  if v_me is null then return public.worker_blind_cow_fail('bad_identity'); end if;
  select * into v_duel from public.worker_blind_cow_duel where public_token_hash = public.worker_blind_cow_token_hash(p_token);
  if not found then return public.worker_blind_cow_fail('not_found'); end if;
  select * into v_mine from public.worker_blind_cow_duel_slot where duel_id = v_duel.id and anon_id = v_me;
  if not found then return public.worker_blind_cow_fail('not_joined'); end if;
  select * into v_other from public.worker_blind_cow_duel_slot where duel_id = v_duel.id and anon_id is distinct from v_me
   order by slot limit 1;
  return jsonb_build_object(
    'ok', true,
    'mySlot', v_mine.slot,
    'meReady', v_mine.live_ready_at is not null,
    'meStarted', v_mine.run_id is not null,
    'them', case when v_other.id is null then null else jsonb_build_object(
      'name', v_other.display_name,
      'ready', v_other.live_ready_at is not null,
      'started', v_other.run_id is not null) end,
    'goAt', case when v_duel.live_go_at is not null then (extract(epoch from v_duel.live_go_at) * 1000)::bigint end,
    'expired', v_duel.expires_at < now(),
    'serverNow', (extract(epoch from now()) * 1000)::bigint
  );
end $$;

/*
 * מוכן / לא מוכן. רק לפני שמישהו התחיל לשחק (חי או לא), רק לפני שנקבע רגע הפתיחה, ורק
 * כשהדו-קרב בתוקף. כששני המקומות מוכנים — go_at נקבע פעם אחת (עדכון מותנה, לא בדיקה-ואז-כתיבה).
 */
create or replace function public.worker_blind_cow_live_ready(p_me text, p_token text, p_ready boolean default true)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_slot public.worker_blind_cow_duel_slot := public.worker_blind_cow_my_slot(p_me, p_token);
  v_duel public.worker_blind_cow_duel;
begin
  if v_slot.id is null then return public.worker_blind_cow_fail('not_joined'); end if;
  select * into v_duel from public.worker_blind_cow_duel where id = v_slot.duel_id for update;
  if v_duel.expires_at < now() then return public.worker_blind_cow_fail('expired'); end if;
  if v_duel.live_go_at is null then
    if exists (select 1 from public.worker_blind_cow_duel_slot where duel_id = v_duel.id and run_id is not null) then
      return public.worker_blind_cow_fail('started');
    end if;
    update public.worker_blind_cow_duel_slot
       set live_ready_at = case when coalesce(p_ready, true) then coalesce(live_ready_at, now()) end
     where id = v_slot.id;
    update public.worker_blind_cow_duel d
       set live_go_at = now() + interval '4 seconds'
     where d.id = v_duel.id and d.live_go_at is null
       and (select count(*) from public.worker_blind_cow_duel_slot s
             where s.duel_id = d.id and s.live_ready_at is not null) = 2;
  end if;
  return public.worker_blind_cow_live_state(p_me, p_token);
end $$;

/*
 * הפתיחה. אותה ריצה בדיוק כמו worker_blind_cow_run_start — אותה שאלה, אותם רמזים, אותה גרסת
 * ניקוד — רק שהשעון מתחיל ב-go_at לשני הצדדים. קריאה חוזרת מחזירה את אותה ריצה.
 */
create or replace function public.worker_blind_cow_live_start(p_me text, p_token text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_slot public.worker_blind_cow_duel_slot := public.worker_blind_cow_my_slot(p_me, p_token);
  v_duel public.worker_blind_cow_duel;
  v_run uuid;
begin
  if v_slot.id is null then return public.worker_blind_cow_fail('not_joined'); end if;
  select * into v_duel from public.worker_blind_cow_duel where id = v_slot.duel_id;
  if v_slot.run_id is not null then
    perform public.worker_blind_cow_settle(v_slot.run_id);
    return jsonb_build_object('ok', true) || public.worker_blind_cow_view(v_slot.run_id);
  end if;
  if v_duel.live_go_at is null then return public.worker_blind_cow_fail('not_ready'); end if;
  if now() < v_duel.live_go_at then
    return public.worker_blind_cow_fail('too_early')
      || jsonb_build_object('goAt', (extract(epoch from v_duel.live_go_at) * 1000)::bigint,
                            'serverNow', (extract(epoch from now()) * 1000)::bigint);
  end if;
  perform 1 from public.worker_blind_cow_duel_slot where id = v_slot.id for update;
  select run_id into v_run from public.worker_blind_cow_duel_slot where id = v_slot.id;
  if v_run is null then
    insert into public.worker_blind_cow_run (mode, duel_id, question_id, question_version, user_id, anon_id, scoring_version, started_at)
    values ('duel', v_duel.id, v_duel.question_id, v_duel.question_version, v_slot.user_id, v_slot.anon_id, v_duel.scoring_version, v_duel.live_go_at)
    returning id into v_run;
    update public.worker_blind_cow_duel_slot set run_id = v_run where id = v_slot.id;
    insert into public.worker_blind_cow_run_event (run_id, kind, hint, at) values (v_run, 'START', 1, v_duel.live_go_at);
  end if;
  perform public.worker_blind_cow_settle(v_run);
  return jsonb_build_object('ok', true, 'live', true) || public.worker_blind_cow_view(v_run);
end $$;

-- =====================================================================
-- הרשאות — שלוש החדשות פתוחות; אף טבלה לא נפתחה
-- =====================================================================
do $functions$
declare v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('worker_blind_cow_live_state', 'worker_blind_cow_live_ready', 'worker_blind_cow_live_start')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
  end loop;
end
$functions$;

-- =====================================================================
-- בדיקה — התוצאה הנכונה:
--    live_functions 3 · live_columns 2 · blind_cow_functions 18 · anon_can_write 0 · auth_triggers 0
-- =====================================================================
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_blind\_cow\_live\_%'
       and has_function_privilege('anon', p.oid, 'execute')) as live_functions,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and column_name in ('live_go_at', 'live_ready_at')
       and table_name in ('worker_blind_cow_duel', 'worker_blind_cow_duel_slot')) as live_columns,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_blind\_cow\_%') as blind_cow_functions,
  (select count(*) from pg_tables t where t.schemaname = 'public' and t.tablename like 'worker\_blind\_cow\_%'
     and (has_table_privilege('anon', format('public.%I', t.tablename), 'select')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'insert')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'update')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'delete'))) as anon_can_write,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers;
