# 18 · מפת המוצר — שער ← מסלול ← מצב ← זרע ← התמדה ← שיתוף ← ארכיון ← LIFE ← בדיקות

ONE RED WORLD §39, P0.4 (28.9.2026). **נגזר מהקוד, לא מהזיכרון**: כל תא נקרא מהקבצים שהוא
מצטט, ב-main של אותו יום. מספר בפרוזה הוא טענה על הקוד והוא מתיישן (כללים 45, 73) — כשהמפה
והקוד חלוקים, הקוד צודק והמפה היא הבאג.

איך לקרוא את העמודות:

- **מצב** — איפה המסך מחזיק את מה שהשחקן עשה, בדפדפן.
- **זרע / רוטציה** — האם המסלול קורא `?seed=` ו-`?r=` דרך `lib/rotation/round.ts` (`roundFrom`).
  כשהשער `seeded: true` ב-`lib/gates.ts`, הלוחית על הקיר היא `PlayLink` שמקדם את הסמן של המכשיר.
- **התמדה** — מקומי (`localStorage`, תמיד בתוך try/catch) מול Supabase (`worker_*` בלבד, כלל 89).
  "פרופיל" = `lib/profile/store.ts` (`worker.profile.v1`) דרך `emit()` של `lib/profile/events.ts`,
  שמסונכרן ל-`worker_gate_run` / `worker_profile_item` ע"י `lib/portal/sync.ts` כשמחוברים.
- **שיתוף** — `ShareRow kind=…` (`lib/share/copy.ts`; `SEEDLESS` = קישור בלי זרע), או מנגנון משלו.
- **ארכיון** — קישורים שנבנים ב-`lib/links/index.ts` (המקום היחיד שבונה href לשער אחר) או
  `?at=` לשער 12.
- **LIFE** — המכניקה ב-`lib/mechanics/types.ts` שפותחת את לוח השער מתוך חדר (`Embedded`,
  בלי שיתוף ובלי רשומה), או קישור בין השניים.

| שער | מסלול | מצב | זרע / רוטציה | התמדה | שיתוף | ארכיון | LIFE | בדיקות |
|---|---|---|---|---|---|---|---|---|
| 1 הרכב כל הזמנים | `/xi` (`?tab=`) | `lib/xi/store.ts` (הגיליון) + `XIBuilder` | לא — משחק חופשי על כל הסגל (`seeded: false`) | מקומי `worker.xi.v1`; פרופיל דרך `emit` | `xi`, `worst` (SEEDLESS) | — | `allTimeXI` (`XIBuilder` מוטמע) | `xi`, `xi-challenge`, `xi-scout`, `player-shirt` |
| 2 אגף הטריוויות | `/trivia` (בוחר נושא, `?pick=`) · `/trivia/[topic]` · `/trivia/summary` (הפניה בלבד) | `TriviaRun` + `lib/game/session.ts` | כן — `/trivia/[topic]` קורא `roundFrom`, חפיסה לכל נושא (`PlayLink gate=/trivia/<topic>`); הבוחר עצמו לא (`seeded: false`) | פרופיל; סימוני שאלות `lib/profile/marks.ts` (`worker.marks.v1`) ↔ `worker_question_mark` (`lib/portal/marks-sync.ts`); ניקוד בשרת (`actions.ts`, כלל 4) | `trivia` | — | `trivia` | `trivia-run`, `game`, `question-master`, `marks`, `rotation` |
| 3 חידון ההרכב | `/lineup` | `LineupBoard` | כן — `roundFrom` | פרופיל (`TeamSheet` → `emit`) | `lineup` | — | `lineupQuiz` | `lineup`, `identity` |
| 4 משחק המדים | `/kits/build` | `KitGameRun` | כן — `roundFrom` | `lib/kit/collection.ts` (`worker.kits.v1`) — החולצה שהורכבה נכנסת לאוסף של שער 5; טוקן חתום מהשרת | `kit` | — | דרך `shirtDesigner` (`KitGameRun` מוטמע) | `kit-gate4`, `kit`, `kit-v3`, `kit-engine-v5`, `kit-master` |
| 5 אגף המדים (הקורבה) | `/kits` · `/kits/archive` · `/kits/closet` · `/kits/market` · `/kits/auction` · `/kits/admin` | `KitWing` (אוסף · כרטיס · מעצב); `lib/kit/studio-store.ts` | לא (`seeded: false`) | מקומי `worker.kits.v1`, `worker.kitStudio.v1`; הארון/השוק/המכירה ב-Supabase (`worker_collector_*`, `worker_auction_*`, כלל 90) | כרטיסי אספן (`closet`, `wanted`, `gaps`, SEEDLESS) | החולצה היא שורה בארכיון (`archive_slug`, `kit_id`) | `shirtDesigner` | `kit`, `kit-render`, `collector-closet`, `market`, `auction`, `merchant-seed` |
| 6 משחק הזיכרון | `/memory` | `MemoryBoard` | כן — `roundFrom` → `buildRound(seed, 6, cursor)` | פרופיל (`emit`) | `memory` | — | `memoryChallenge` | `memory`, `identity` |
| 7 הכרטיס שלי + הוויכוח של היציע | `/polls` (`?tab=debate`) · `/polls/board` | כרטיס: `BallotSheet`; ויכוח: `DebateStand` | כרטיס: לא. ויכוח: כן — `roundFrom` → `debateRound` (5 מתוך הבנק, `lib/polls/debates.ts`); `seeded: true` מ-28.9.2026 | כרטיס: `lib/polls/store.ts` (`worker.ballot.v1`, `.sealed`, `.reasons`); ויכוח: `lib/polls/debate-store.ts` (`worker.debate.v1`, `.reasons`); שניהם מטילים ל-`worker_poll_vote` דרך `worker_poll_cast` וסופרים ב-`worker_poll_tally` (ויכוח תחת `debate:<id>`), בלי משתמש (כלל 76); החותם → `book.supporter` | `polls` (SEEDLESS, מהמניפסט) · ויכוח: אין עדיין | אפשרויות רשימה נקראות מה-Match Master ומ-`trophies.json` (`lib/polls/debates-server.ts`) | `poll` (`QuestionStage` מוטמע) | `polls`, `polls-v3`, `terrace-debates`, `portal-sync` |
| 8 שחזור השער | `/goal` (`?g=`) | `GoalRun` | כן — `roundFrom`; `?g=` מחלק שער מסוים | פרופיל (`emit`) | `goal` | `goalLinks` (`CrossLinks`) — משחק, כובש, AWAY DAYS | `goalReconstruction` | `replay`, `goal-gesture`, `identity`, `links` |
| 9 רויאל ראמבל | `/royal-rumble` (`?room=`) | `RoyalRumbleRun` / `RoyalRumbleLiveRun`; היסטוריה מקומית של חמש אחרונות | כן — `roundFrom` → `royalRumbleRoundSeed(seed, r)` → `royalRumbleRoundDrafts` (מ-28.9.2026 ה-`r` משנה את הלוח) | פרופיל; חי: `worker_rr_room` / `worker_rr_entry` | `RoyalRumbleChallenge` (`navigator.share`, `seed`+`r`); קישור החדר החי נושא `seed`+`r`+`room` | — | `royalRumble` (`RoyalRumbleRun` מוטמע, חלון `before`) | `royal-rumble`, `royal-rumble-v2`, `royal-rumble-pricing`, `royal-rumble-round` |
| 10 פרה עיוורת | `/blind-cow` (`?mode=daily`, `?duel=`) | `BlindCowGame` | לא דרך `?seed=` — סולו מהשרת, היומי לפי `todayInIsrael()` (`lib/date/israel.ts`), דו-קרב לפי טוקן | עוגייה httpOnly מוצפנת; דו-קרב וריצות ב-`worker_blind_cow_*`; פרופיל (`emit`) | כרטיס `next/og` בלי שם ובלי id (`components/blind-cow/share.ts`) | `blindCowLinks` (`CrossLinks` בתוצאה) | — | `blind-cow`, `date-israel`, `links`, `share-card` |
| 11 משחק השנאה | `/derby` · `/derby/file` | `HateWall` / `BlackFile` | כן — `roundFrom` → `dealQueue(seed, cursor)` | פרופיל (`emit`) | `hate`, `file` | — | `hateHistory` (`HateWall` מוטמע) | `identity`, `game` |
| 12 הארכיון החי | `/archive` (`?at=`) | `ArchiveApp` (Today · Dig · Search · Mine · Trail) | כן — `roundFrom` → `todayDecks(todayInIsrael(), seed, cursor)` | פרופיל (`emit` — "שלי") | אין `ShareRow` | הוא עצמו; `ArchiveDrawer` → `CrossLinks` (`linksForEntity`) | `archive` (`LifeArchive` על `EntityCard`) | `archive`, `entity-graph`, `links`, `date-israel` |
| 13 החוט האדום | `/timeline` · `/timeline/order` | `ThreadBoard` / `TimelineBoard` | כן — `roundFrom` בשני המסלולים (`dealThreadRun`) | פרופיל (`emit`) | `timeline` | `ThreadBoard` מקשר `/archive?at=` | — | `thread`, `timeline`, `identity` |
| LIFE | `/life` (לא שער — לוחית מעל הקיר, כלל 39) | `lib/life/` — יומן אירועים append-only (`LifeEvent[]`) | זרע משלו בתוך השמירה (`rng.seeded`, `lib/life/rng.ts`) | מקומי `the-worker:life` (`lib/life/save.ts`, `SAVE_VERSION`); לא בסנכרון הפורטל | אין (כרטיסי LIFE לא מדפיסים ציון — `life-share`) | רק דרך `lib/life/anchor-server.ts` (כלל 39); `LifeArchive` | פותח את לוחות השערים (1, 3, 4/5, 6, 7, 8, 9, 11, 12, טריוויה) דרך `lib/mechanics/` + `app/life/mechanicActions.ts`; `/tik` (`KeptPanel`) מקשר ל-`/life` | ‎`life.test` + ‎108 קבצי `tests/life-*.test.ts` |
| היציע שלי (לא שער — קבוצות חברים, §8) | `/stand` · `/stand/<קוד>` | `components/stand/StandHome.tsx` (אורח / חבר) · `StandIndex` · `WeekCard` | היום בהפועל של התאריך; "השבוע ביציע" — 5 תחנות לפי שבוע ISO בישראל (`lib/stand/week.ts`) | מקומי `worker.stands.v1` (קודים ושמות בלבד); Supabase `worker_stand_*` דרך 8 פונקציות, מפתח מכשיר בעוגייה httpOnly `stand_me`, רק sha256 נשמר | `StandPost` בתוך `ShareRow` (שורה אחת): קישור הריצה + שורת התוצאה לפיד | "מה חזר מהארכיון" = פריט ה-discover של היום | — | `stand`, `supabase/tests/60-stand.sql`, `scripts/stand/invite-probe.mjs` |
| האזור האישי | `/tik` (אני) · `/tik/file` (התיק שלי) | `CardTabs` + `MeArea` / `FileArea` | לא | מקומי: כל המאגרים דרך `lib/profile/records.ts`; הזהות הציבורית `worker.public.v1` ↔ `worker_profile.public_*` / `supporter_no` (`lib/portal/public-sync.ts`) | `member` (כרטיס) | `KeptPanel`, דרכון LIFE → `/archive?at=` | דרכון LIFE (`fileExtras`, פרקים שהושלמו בלבד) | `personal-area`, `worker-card`, `portal-sync` |

## מה המפה חושפת (פתוח, לא תוקן במעבר הזה)

- **האזור האישי (28.9.2026, `docs/21-personal-area.md`):** מפת הזיכרון והזיכרונות קוראים את
  המכשיר בלבד; LIFE עדיין לא מסתנכרן, ולכן דרכון LIFE הוא של המכשיר.

- **שער 7 · הוויכוח אין לו שיתוף.** המפרט (§16) מבקש "אני לקחתי את X. מה אתה אומר?" — זה
  Phase 4 (SHARE V2); `polls` נשאר SEEDLESS כי הכרטיס שלי באמת אין לו סבב.
- **שערים 10 ו-13 לא נפתחים מתוך LIFE**, ושער 12 הוא היחיד שמחזיק "חווית את הרגע הזה ב-LIFE"
  בתוכנית (§21) — עוד לא בקוד: אין קישור מהארכיון חזרה לפרק.
- **שערים 1, 3, 4, 6, 11 לא מקשרים לארכיון** אף שהם יודעים משחק/שחקן/עונה — ה-Cross Gate Router
  של §21 הוא Phase 2.
- **LIFE לא מסתנכרן** לחשבון; השמירה היא של המכשיר.
