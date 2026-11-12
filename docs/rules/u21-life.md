## LIFE — הבמאי מכריע, החולצה הראשונה מתנה, אנשים יוזמים (דלתא 93, 27.9.2026)

מסמך הבעלים: THE-WORKER-DELTA-93-IMPLEMENTATION-BRIEF.
1. **הבמאי ממלא את ה-mandatory של הפותר.** `resolveLifeOpportunities` קורא ל-`directiveFor` ומחזיר
   `mandatory`/`story`/`primary` (`opportunityFromDirective`): PRE_MATCH › DILEMMA › MUST › STRONG › OPTIONAL
   › AMBIENT. כשיש mandatory — שום הצעת צד אינה `primary`; היא עדיין מדורגת (המתכנן והדיבאג קוראים אותה).
2. **כל משחק שהולכים אליו — טקס או `matchRitual: 'none'`.** `tests/life-match-ritual.test.ts` מחזיק את
   רשימת ימי המשחק. 1998-laces ו-2010-teddy נוספו; טדי רק למי שעלה לרכב (`MatchRitualDef.when`).
3. **החולצה הראשונה: הוא חוסך, הוא סופר, אבא משלם.** `rafi-a4` → "לספור על הדלפק" מרים `a4:ready-to-buy`
   בלבד → `rafi-a4-counter` → הביט `a4-kobi-arrives` (actorCue enter + approach) → `kobi-shirt-gift-a4`.
   שקל לא יוצא מהכיס. רק מי שהגיע בעצמו ל-30 ועמד בדלפק; בלי הצלה אחרי כישלון או אחרי שנתן לאמא.
   `life:first-shirt:gift` שורד לתמיד (ביו בארון, הקופסה, הישג, קולבקים); `a4:kobi-gave` ישן נקרא
   `a4:kobi-knows`. סוף `shirt` נושא `legacyUnless` — שמירה ישנה שקנתה בעצמה שומרת את המילים שלה.
4. **`actorCue` = הצגה בלבד** (`enter`/`approach`/`turn`/`leave`/`gesture`), ב-`WorldScene.actorCue`.
   שחקן חסר = no-op, שיחה/סרט/טקס פתוחים = המתנה (`whenFree`), מעבר חדר מנקה. אין כתיבה לשמירה. קובי A4,
   אפי בהריסה, אולי בטדי. תוכן אומר מי יוזם; `storyDirector` לא.
5. **`{a:'hud', visible}`** — ההריסה בלי HUD; `restoreHud` בכל יציאה (סוף ביט, סוף פרק, SHUTDOWN, init).
   `u:lossKind` נמחק; רק `USS_LOSS_KIND`.
6. **מרצ'נדייז:** החנות הרשמית `scope: 'general-store'`, כפתור "לחנות הרשמית של הפועל תל אביב" — אף פעם
   "לקניית החולצה"; רפליקה = "מצא רפליקה נוסטלגית" + גילוי תמיד.
7. **`lib/life/missReason.ts`** — `life:miss:<id>` = סיבה (`true` ישן = `choice`). בשימוש: 2010-teddy
   (`d10-miss`, כסף/בחירה), 2017-distance, 2021-promises. זיכרון NPC: `npc:<who>:<what>:<year>`.
8. **קולבקי חולצה** — `content/shirtCallbacks.ts` (`woreShirt`, `woreWhen`, `sameShirtAs`), REACTION אחד כל אחד.
9. **`?lifeDebug=1`** (לא בבילד פרודקשן) — `LifeDevOverlay`: פרק, חדר, דקה, במאי, יעדים, mandatory,
   primary, צד, טקס, מקומות, cue ממתין. בדיקות: `tests/life-delta-93.test.ts`.
10. **החולצה שקובי קונה היא `visa86`** — התצלום שמאור שלח ב-27.9.2026 (*"השתמש בחולצה זו בתור החולצה
    שפוגי מקבל מתנה מקובי"*), חתוך מהרקע ומהצל ב-`scripts/life/cut-first-shirt-2026-09-27.py`, הפס הזהוב
    של VISA הוחשך לחום (חוק 8, נמדד על הפענוח). `visa86` תלויה ברכבת מ-`a4-shirt`. חיים שקנו `tveria85`
    לפני כן שומרים אותה.
11. **סבב שני (27.9.2026):** `storyHoldsTheMoment` — זמן פנוי לא מציע לחכות בזמן טקס/דילמה, או כש-MUST
    מצביע על חדר אחר שאפשר ללכת אליו עכשיו. `ActorDef.initiative` — קובי ביציע של 1986 סוגר את
    המטרים האחרונים בעצמו (פעם בביקור, עד `found:kobi`). סרט הארכיון של 1983 (`FilmCut`) נושא את
    `FilmSkipButton`. QA: `node scripts/life/delta93-qa-probe.mjs` (A5 ארון · 2007 בלי HUD · שמירה ישנה).
