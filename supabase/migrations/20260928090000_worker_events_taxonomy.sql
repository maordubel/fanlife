-- =====================================================================
-- THE WORKER — טקסונומיית האירועים של "עולם אדום אחד" (28.9.2026)
-- =====================================================================
--
-- **קובץ עצמאי, קטן, ורץ אחרי 20260925090000_worker_events.sql.** הוא לא יוצר טבלה ולא
-- פונקציה: הוא מחליף **רק** את ה-check על עמודת name בטבלה worker_event, כדי שהרשימה הסגורה
-- תכיל את שמות האירועים של תוכנית האב (§37): run_start, run_complete,
-- result_view, archive_open, entity_follow, life_chapter_complete, share_*, challenge_*,
-- stand_*, daily_*.
--
-- **הרשימה כאן והרשימה ב-lib/analytics/events.ts (EVENT_NAMES) הן אותה רשימה** —
-- `tests/events-schema.test.ts` משווה אותן. שם אירוע חדש = שורה בשני המקומות.
-- כל השמות הישנים נשארים: אף שורה קיימת לא נפסלת. gate_open של המסמך הוא gate_view הקיים —
-- שם שני לאותו רגע היה מפצל ספירה אחת לשתיים.
--
-- **הפרויקט משותף עם DUBID** (כלל 89): נוגע רק ב-worker_event, לא ב-auth, ולא נותן
-- הרשאה לאף אחד. **הרצה חוזרת בטוחה** — drop constraint if exists ו-add באותה פקודה, כך שאין רגע בלי check.
-- נבדק ב-`scripts/db/verify.sh` (`supabase/tests/41-events-taxonomy.sql`).
-- =====================================================================

do $guard$
begin
  if to_regclass('public.worker_event') is null then
    raise exception 'run 20260925090000_worker_events.sql first';
  end if;
end
$guard$;

alter table public.worker_event
  drop constraint if exists worker_event_name_check,
  add constraint worker_event_name_check check (name in (
            'gate_view', 'gate_start', 'gate_step', 'gate_finish', 'gate_leave', 'share_click',
            'cross_link_click', 'blind_cow_started', 'blind_cow_hint_revealed',
            'blind_cow_guess_wrong', 'blind_cow_solved', 'blind_cow_gave_up',
            'blind_cow_duel_created', 'blind_cow_duel_shared', 'blind_cow_duel_joined',
            'blind_cow_duel_completed', 'blind_cow_result_shared', 'blind_cow_live_started',
            'run_start', 'run_complete', 'result_view', 'archive_open',
            'entity_follow', 'life_chapter_complete', 'share_open', 'share_created',
            'share_joined', 'challenge_created', 'challenge_joined', 'challenge_complete',
            'stand_created', 'stand_joined', 'stand_daily_complete', 'daily_open',
            'daily_item_complete', 'daily_complete',
            'rumble_reveal_start', 'rumble_reveal_complete', 'rumble_match_start', 'rumble_match_skip', 'rumble_goal_shown', 'rumble_match_complete'));

-- =====================================================================
-- בדיקה — התוצאה הנכונה:
--    event_names 42 · anon_can_read 0 · auth_triggers 0
-- =====================================================================
select
  (select count(*) from regexp_matches(pg_get_constraintdef(c.oid), '''[a-z_]+''', 'g')) as event_names,
  (select count(*) from (values ('select'), ('insert'), ('update'), ('delete')) as priv(p)
     where has_table_privilege('anon', 'public.worker_event', priv.p)) as anon_can_read,
  (select count(*) from pg_trigger t join pg_class k on k.oid = t.tgrelid join pg_namespace n on n.oid = k.relnamespace
     where n.nspname = 'auth' and not t.tgisinternal) as auth_triggers
  from pg_constraint c
 where c.conrelid = 'public.worker_event'::regclass and c.conname = 'worker_event_name_check';
