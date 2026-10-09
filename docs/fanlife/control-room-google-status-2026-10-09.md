# Control room "busy" fix, Google sign-in, storage connection (9.10.2026)

## Done in code (branch `control-room-fix`)
- `lib/master/store.ts`: a change that loses the write race now waits (jittered, growing pause) and re-applies, up to 14 attempts instead of 5 instant ones; the audit-archive append does the same (10). "The control room is busy" now needs ~10s of continuous collisions. Test: `tests/master/storage.test.ts` (6 collisions in a row still saves).
- Google sign-in on the hub: `components/fanlife/me/GoogleAccount.tsx` on `/me` (uses the existing `signInWithGoogle` + `/auth/callback`; English copy `account.*` in `messages/en.fanlife.json`). Hidden when Supabase is not connected.
- Restored club-page strings (`cardKicker`, `wallKicker`, `todayKicker`, `entranceTap`, …) that hub-compact had removed by mistake (tsc was red on `app/clubs/[slug]/page.tsx`).

## Needs the owner (secrets and account settings; not enterable by Claude)
1. Supabase (project Dubid) → Integrations → Vercel → connect to project `fanlife`: sets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` with no copying. Redeploy.
2. `THESPORTSDB_KEY`: Vercel → fanlife → Settings → Environment Variables, and GitHub → fanlife → Settings → Secrets → Actions. (Free test key `123` is rate-limited; own key preferred.)
3. Google: Google Cloud → OAuth client (Web) with redirect URI `https://afxpjfxwpdjvlmuoawda.supabase.co/auth/v1/callback`; Supabase → Authentication → Sign In / Providers → Google → paste client id and secret.
4. Supabase → Authentication → URL Configuration → add Redirect URL `https://fanlife.dubelteam.com/auth/callback`. Do NOT change the Site URL (DUBID's, rule 89).
5. Note: the service-role key gives full access to the shared project including DUBID.
