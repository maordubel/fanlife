-- =====================================================================
-- THE WORKER — מדידה בסיסית: כמה נכנסים לכל שער, ואיפה עוזבים (25.9.2026)
-- =====================================================================
--
-- **קובץ עצמאי.** לא תלוי באף קובץ אחר ולא נוגע בהם. מריצים אותו אחרי שלושת הקבצים של
-- 22–24.9. **אם מריצים שוב את 20260922120000_worker_collector_market.sql — מריצים אחריו גם
-- את זה** (הקובץ ההוא סוגר בסוף את ההרשאה לכל פונקציית worker_ שהוא לא מכיר).
--
-- מה זה: מאור, 25.9.2026 — "לחבר מדידה בסיסית (כמה נכנסים לכל שער, איפה עוזבים)".
-- מדידה של האתר עצמו, בלי שירות צד שלישי:
--
--   · **אין מידע אישי.** אין user id, אין מייל, אין IP, אין user-agent. שורה היא: יום, שם
--     אירוע מרשימה סגורה, שער (נתיב), מספר שלב, מילה קצרה ומספר אחד.
--   · **המבקר הוא hash שמתחלף כל יום.** המכשיר שולח את המזהה האקראי שהפורטל כבר מחזיק
--     (`worker.device.v1`); כאן נשמר רק sha256(מלח-היום | מזהה). המלח נוצר פעם ביום בטבלה
--     שאין לה grant, ומלח של יותר מיומיים נמחק — כך שאחרי יומיים אי אפשר, גם למי שמחזיק את
--     המסד, לחבר שורה למכשיר או שני ימים של אותו מכשיר זה לזה. "מבקרים" = מבקר-יום.
--   · **כתיבה רק דרך פונקציה.** RLS דלוק, אין policy ואין grant לטבלאות.
--     `worker_events_record` (security definer) בודקת כל שדה, עד 25 אירועים בקריאה ועד 240
--     בדקה למבקר, ומחזירה `{ ok }`/`{ ok:false, error }` כערך — לא כשגיאה.
--   · **הקריאה — רק לשרת.** שלוש פונקציות הסיכום פתוחות ל-service_role בלבד (דף /qa/stats
--     בשרת של THE WORKER). anon ו-authenticated לא רואים אף מספר.
--
-- **הפרויקט משותף עם DUBID** (כלל 89): כל אובייקט מתחיל ב-worker_, אין שום דבר על auth.
-- **הרצה חוזרת בטוחה**, ונבדקה פעמיים ברצף על Postgres 16 מקומי עם auth מדומה
-- (`scripts/db/verify.sh`, `supabase/tests/40-events.sql`).
-- =====================================================================

create table if not exists public.worker_event_salt (
  day  date primary key,
  salt text not null
);

create table if not exists public.worker_event (
  id      bigint generated always as identity primary key,
  day     date not null,
  at      timestamptz not null default now(),
  visitor text not null check (visitor ~ '^[0-9a-f]{64}$'),
  name    text not null check (name in (
            'gate_view', 'gate_start', 'gate_step', 'gate_finish', 'gate_leave',
            'share_click', 'cross_link_click',
            'blind_cow_started', 'blind_cow_hint_revealed', 'blind_cow_guess_wrong', 'blind_cow_solved',
            'blind_cow_gave_up', 'blind_cow_duel_created', 'blind_cow_duel_shared', 'blind_cow_duel_joined',
            'blind_cow_duel_completed', 'blind_cow_result_shared', 'blind_cow_live_started')),
  gate    text not null check (gate ~ '^/[a-z0-9/-]{0,48}$'),
  step    integer check (step between 0 and 999),
  detail  text check (detail ~ '^[a-z0-9_:.-]{1,48}$'),
  value   bigint check (value between -1000000 and 100000000)
);
create index if not exists worker_event_day_gate_idx on public.worker_event (day, gate, name);
create index if not exists worker_event_visitor_idx on public.worker_event (visitor, at desc);

-- =====================================================================
-- 1. הכתיבה — אחת, פתוחה לכולם, מחזירה ערך
-- =====================================================================

/* המלח של היום (שעון ישראל). נוצר בפעם הראשונה שמישהו שואל; ישן מיומיים נמחק. */
create or replace function public.worker_events_salt() returns text
language plpgsql volatile security definer set search_path = public as $$
declare v_day date := (now() at time zone 'Asia/Jerusalem')::date; v_salt text;
begin
  select salt into v_salt from public.worker_event_salt where day = v_day;
  if found then return v_salt; end if;
  insert into public.worker_event_salt (day, salt) values (v_day, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (day) do nothing;
  delete from public.worker_event_salt where day < v_day - 1;
  select salt into v_salt from public.worker_event_salt where day = v_day;
  return v_salt;
end $$;

/*
 * p_device — המזהה האקראי של המכשיר (uuid, 8–64 תווים [0-9a-f-]).
 * p_events — [{ name, gate, step?, detail?, value? }] × עד 25.
 * שורה שאינה עומדת בכללים מדולגת ונספרת ב-skipped; אף שגיאה לא נזרקת.
 */
create or replace function public.worker_events_record(p_device text, p_events jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'Asia/Jerusalem')::date;
  v_visitor text;
  v_recent integer;
  v_event jsonb;
  v_name text; v_gate text; v_step integer; v_detail text; v_value bigint;
  v_kept integer := 0; v_skipped integer := 0;
begin
  if p_device is null or p_device !~ '^[0-9a-f-]{8,64}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_device');
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  if jsonb_array_length(p_events) > 25 or octet_length(p_events::text) > 8192 then
    return jsonb_build_object('ok', false, 'error', 'too_big');
  end if;
  v_visitor := encode(sha256(convert_to(public.worker_events_salt() || '|' || p_device, 'UTF8')), 'hex');
  -- the rows themselves are the counter, so a refused call cannot roll it back
  select count(*) into v_recent from public.worker_event
   where visitor = v_visitor and at > now() - interval '1 minute';
  if v_recent + jsonb_array_length(p_events) > 240 then
    return jsonb_build_object('ok', false, 'error', 'slow_down');
  end if;
  for v_event in select * from jsonb_array_elements(p_events) loop
    begin
      if jsonb_typeof(v_event) <> 'object' then raise exception 'shape'; end if;
      v_name := v_event ->> 'name';
      v_gate := v_event ->> 'gate';
      v_step := case when jsonb_typeof(v_event -> 'step') = 'number' then (v_event ->> 'step')::numeric::integer end;
      v_detail := nullif(v_event ->> 'detail', '');
      v_value := case when jsonb_typeof(v_event -> 'value') = 'number' then round((v_event ->> 'value')::numeric)::bigint end;
      insert into public.worker_event (day, visitor, name, gate, step, detail, value)
      values (v_day, v_visitor, v_name, v_gate, v_step, v_detail, v_value);
      v_kept := v_kept + 1;
    exception when others then
      v_skipped := v_skipped + 1;
    end;
  end loop;
  return jsonb_build_object('ok', true, 'kept', v_kept, 'skipped', v_skipped);
end $$;

-- =====================================================================
-- 2. הסיכומים — ל-service_role בלבד
-- =====================================================================

/* לכל יום ושער: מבקרים, מתחילים, מסיימים (מבקרים שונים), ושיתופים. */
create or replace function public.worker_events_daily(p_days integer default 30)
returns table (day date, gate text, visitors bigint, starters bigint, finishers bigint, shares bigint)
language sql stable security definer set search_path = public as $$
  select e.day, e.gate,
         count(distinct e.visitor) filter (where e.name = 'gate_view'),
         count(distinct e.visitor) filter (where e.name = 'gate_start'),
         count(distinct e.visitor) filter (where e.name = 'gate_finish'),
         count(*) filter (where e.name = 'share_click')
    from public.worker_event e
   where e.day > (now() at time zone 'Asia/Jerusalem')::date - greatest(1, least(coalesce(p_days, 30), 400))
   group by e.day, e.gate
   order by e.day desc, e.gate
$$;

/*
 * המשפך לכל שער על פני התקופה: נכנסו → התחילו → סיימו (מבקר-יום), אחוז סיום, כמה עזבו
 * באמצע, השלב שהכי הרבה עוזבים בו, וקישורים שנלחצו ממנו ואליו.
 */
create or replace function public.worker_events_funnel(p_days integer default 30)
returns table (gate text, visitors bigint, starters bigint, finishers bigint, finish_rate numeric,
               leaves bigint, top_leave_step integer, top_leave_count bigint, cross_clicks bigint, shares bigint)
language sql stable security definer set search_path = public as $$
  with span as (
    select e.* from public.worker_event e
     where e.day > (now() at time zone 'Asia/Jerusalem')::date - greatest(1, least(coalesce(p_days, 30), 400))
  ),
  f as (
    select s.gate,
           count(distinct (s.day, s.visitor)) filter (where s.name = 'gate_view') as visitors,
           count(distinct (s.day, s.visitor)) filter (where s.name = 'gate_start') as starters,
           count(distinct (s.day, s.visitor)) filter (where s.name = 'gate_finish') as finishers,
           count(*) filter (where s.name = 'gate_leave') as leaves,
           count(*) filter (where s.name = 'cross_link_click') as cross_clicks,
           count(*) filter (where s.name = 'share_click') as shares
      from span s group by s.gate
  ),
  l as (
    select distinct on (s.gate) s.gate, s.step, count(*) as n
      from span s where s.name = 'gate_leave' and s.step is not null
     group by s.gate, s.step
     order by s.gate, count(*) desc, s.step
  )
  select f.gate, f.visitors, f.starters, f.finishers,
         case when f.visitors > 0 then round(100.0 * f.finishers / f.visitors, 1) end,
         f.leaves, l.step, l.n, f.cross_clicks, f.shares
    from f left join l on l.gate = f.gate
   order by f.visitors desc, f.gate
$$;

/* פרה עיוורת (מפרט §11): ספירה לכל אירוע, ממוצע רמזים לפתרון, חציון זמן, המרת הזמנה. */
create or replace function public.worker_events_blind_cow(p_days integer default 30)
returns jsonb
language sql stable security definer set search_path = public as $$
  with span as (
    select e.* from public.worker_event e
     where e.gate = '/blind-cow'
       and e.day > (now() at time zone 'Asia/Jerusalem')::date - greatest(1, least(coalesce(p_days, 30), 400))
  )
  select jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(name, n) from (select name, count(*) as n from span group by name) c), '{}'::jsonb),
    'avgHintsToSolve', (select round(avg(step)::numeric, 2) from span where name = 'blind_cow_solved' and step is not null),
    'medianSolveMs', (select percentile_cont(0.5) within group (order by value) from span where name = 'blind_cow_solved' and value is not null),
    'duelJoinRate', (select case when count(*) filter (where name = 'blind_cow_duel_created') > 0
                                 then round(100.0 * count(*) filter (where name = 'blind_cow_duel_joined')
                                            / count(*) filter (where name = 'blind_cow_duel_created'), 1) end from span),
    'duelCompleteRate', (select case when count(*) filter (where name = 'blind_cow_duel_joined') > 0
                                     then round(100.0 * count(*) filter (where name = 'blind_cow_duel_completed')
                                                / count(*) filter (where name = 'blind_cow_duel_joined'), 1) end from span)
  )
$$;

-- =====================================================================
-- 3. RLS והרשאות
-- =====================================================================
do $rls$
declare v_table text;
begin
  foreach v_table in array array['worker_event', 'worker_event_salt'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated', v_table);
  end loop;
end
$rls$;

do $sequences$
declare v_seq text;
begin
  for v_seq in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relkind = 'S' and c.relname like 'worker\_event\_%' loop
    execute format('revoke all on sequence public.%I from public, anon, authenticated', v_seq);
  end loop;
end
$sequences$;

do $functions$
declare v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_events\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = 'worker_events_record' then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    elsif v_fn.proname in ('worker_events_daily', 'worker_events_funnel', 'worker_events_blind_cow') then
      execute format('grant execute on function %s to service_role', v_fn.sig);
    end if;
  end loop;
end
$functions$;

-- =====================================================================
-- 4. בדיקה — התוצאה הנכונה:
--    event_tables 2 · event_functions 5 · anon_can_read 0 · anon_can_sum 0 · auth_triggers 0
-- =====================================================================
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename like 'worker\_event%') as event_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_events\_%') as event_functions,
  (select count(*) from pg_tables t where t.schemaname = 'public' and t.tablename like 'worker\_event%'
     and (has_table_privilege('anon', format('public.%I', t.tablename), 'select')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'insert')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'update')
          or has_table_privilege('anon', format('public.%I', t.tablename), 'delete'))) as anon_can_read,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('worker_events_daily', 'worker_events_funnel', 'worker_events_blind_cow', 'worker_events_salt')
       and has_function_privilege('anon', p.oid, 'execute')) as anon_can_sum,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers;
