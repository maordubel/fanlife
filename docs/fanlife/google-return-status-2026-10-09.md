# Google sign-in returns home + preview banner (2026-10-09)
- Cause of "lands on DUBID": redirectTo carried `?next=…`; Supabase allow-list match is exact, so it fell back to the Site URL (DUBID's). Fix in code: redirectTo is the bare `/auth/callback` (already allowed); the return path rides in cookie `fl_next` (10 min), read + cleared by the callback, validated by `safePath`. Owner also added `https://fanlife.dubelteam.com/**` in Supabase. Site URL untouched.
- `Shell` shows the OPEN PREVIEW strip only when `evaluationMode()`.
- `club-signature` test comment reworded (was red on main).
- Files: lib/portal/sync.ts, app/auth/callback/route.ts, components/master/Shell.tsx, app/magazine.css, tests/google-return.test.ts.
