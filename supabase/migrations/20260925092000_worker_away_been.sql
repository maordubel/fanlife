-- =====================================================================
-- THE WORKER — AWAY DAYS · "הייתי שם" (25.9.2026)
-- =====================================================================
--
-- מאור, 25.9.2026: "להוסיף ... כפתור 'הייתי שם'". מפרט GATE10-BLINDCOW-AWAYDAYS חלק ב' §30:
-- לכל ביקור במסע יש מתג "הייתי שם". אורח — נשמר במכשיר; מחובר — מסונכרן לחשבון.
--
--   · **טבלה אחת, שורה לביקור.** `worker_away_been` (user_id, visit_id) → been + at.
--     "הסרתי" היא שורה עם been=false, לא מחיקה — כך שני מכשירים שמתווכחים מגיעים לאותה
--     תשובה: **הצד עם ה-at המאוחר מנצח** (אותו מיזוג שהמכשיר עושה, `lib/away-days/been.ts`).
--     at מהעתיד (שעון מכשיר מקולקל) מקוצץ ל-now(), אחרת שורה אחת הייתה ננעלת לתמיד.
--   · **אין גישה ישירה לטבלה.** RLS דלוק, אין policy ואין grant. הקריאה והכתיבה רק דרך שתי
--     פונקציות security definer שקוראות auth.uid() בעצמן: `worker_away_been_list()` מחזירה את
--     השורות של המשתמש המחובר בלבד; `worker_away_been_set(p_rows)` כותבת עד 500 שורות.
--     שתיהן מחזירות `{ ok:false, error }` כערך ולא זורקות — הלקוח שקט כשאין חשבון.
--   · **anon לא מגיע לשום דבר.** שתי הפונקציות פתוחות ל-authenticated בלבד.
--
-- **תלוי ב-`20260922090000_worker_shared_project.sql`** (worker_profile, worker_touch_profile),
-- שכבר רץ בפרויקט. **אם מריצים שוב את `20260922120000_worker_collector_market.sql` — מריצים
-- אחריו גם את זה** (הקובץ ההוא סוגר בסוף את ההרשאה לכל פונקציית worker_ שהוא לא מכיר).
--
-- **הפרויקט משותף עם DUBID** (כלל 89): כל אובייקט מתחיל ב-worker_, אין שום trigger על auth.
-- **הרצה חוזרת בטוחה**; נבדקה פעמיים ברצף על Postgres 16 מקומי עם auth מדומה
-- (`scripts/db/verify.sh`, `supabase/tests/50-away-been.sql`).
-- =====================================================================

create table if not exists public.worker_away_been (
  user_id    uuid not null references public.worker_profile(id) on delete cascade,
  visit_id   text not null check (visit_id ~ '^visit:[a-z0-9_:.-]{1,80}$'),
  been       boolean not null,
  at         timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, visit_id)
);

comment on table public.worker_away_been is
  'AWAY DAYS "הייתי שם" (25.9.2026): one row per (account, visit). been=false is a kept un-tick, so the newer side wins on merge. Read/write only through worker_away_been_list / worker_away_been_set.';

/* השורות של המשתמש המחובר, כ-JSON: [{ v, b, at }]. */
create or replace function public.worker_away_been_list()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'signed_out');
  end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object('v', b.visit_id, 'b', b.been, 'at', b.at) order by b.visit_id)
      from public.worker_away_been b
     where b.user_id = v_user), '[]'::jsonb));
end $$;

/*
 * p_rows — [{ v: 'visit:…', b: true|false, at: iso }] × עד 500.
 * שורה עם at מאוחר יותר מזו שבטבלה מחליפה אותה; שווה או מוקדם — נשאר מה שיש (ובשוויון
 * been=true מנצח, כמו במכשיר). שורה פסולה מדולגת ונספרת ב-skipped.
 */
create or replace function public.worker_away_been_set(p_rows jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_row jsonb;
  v_visit text; v_been boolean; v_at timestamptz;
  v_kept integer := 0; v_skipped integer := 0;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'signed_out');
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'shape');
  end if;
  if jsonb_array_length(p_rows) > 500 or octet_length(p_rows::text) > 65536 then
    return jsonb_build_object('ok', false, 'error', 'too_big');
  end if;
  perform public.worker_touch_profile(v_user);

  for v_row in select * from jsonb_array_elements(p_rows) loop
    begin
      if jsonb_typeof(v_row) <> 'object' or jsonb_typeof(v_row -> 'b') <> 'boolean' then raise exception 'shape'; end if;
      v_visit := v_row ->> 'v';
      if v_visit is null or v_visit !~ '^visit:[a-z0-9_:.-]{1,80}$' then raise exception 'visit'; end if;
      v_been := (v_row ->> 'b')::boolean;
      v_at := least(coalesce((v_row ->> 'at')::timestamptz, now()), now());
      insert into public.worker_away_been (user_id, visit_id, been, at)
      values (v_user, v_visit, v_been, v_at)
      on conflict (user_id, visit_id) do update set
        been = case
                 when excluded.at > worker_away_been.at then excluded.been
                 when excluded.at = worker_away_been.at then (worker_away_been.been or excluded.been)
                 else worker_away_been.been end,
        at = greatest(worker_away_been.at, excluded.at),
        updated_at = now();
      v_kept := v_kept + 1;
    exception when others then
      v_skipped := v_skipped + 1;
    end;
  end loop;
  return jsonb_build_object('ok', true, 'kept', v_kept, 'skipped', v_skipped);
end $$;

-- =====================================================================
-- RLS והרשאות — אין גישה לטבלה, שתי הפונקציות ל-authenticated בלבד
-- =====================================================================
alter table public.worker_away_been enable row level security;
revoke all on public.worker_away_been from public, anon, authenticated;

do $functions$
declare v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('worker_away_been_list', 'worker_away_been_set')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    execute format('grant execute on function %s to authenticated', v_fn.sig);
  end loop;
end
$functions$;

-- =====================================================================
-- בדיקה — התוצאה הנכונה:
--    been_tables 1 · been_functions 2 · anon_can_touch 0 · anon_can_call 0 · auth_triggers 0
-- =====================================================================
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename = 'worker_away_been') as been_tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_away\_been\_%') as been_functions,
  (select count(*) from (values ('select'), ('insert'), ('update'), ('delete')) as priv(p)
     where has_table_privilege('anon', 'public.worker_away_been', priv.p)
        or has_table_privilege('authenticated', 'public.worker_away_been', priv.p)) as anon_can_touch,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'worker\_away\_been\_%'
       and has_function_privilege('anon', p.oid, 'execute')) as anon_can_call,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers;
