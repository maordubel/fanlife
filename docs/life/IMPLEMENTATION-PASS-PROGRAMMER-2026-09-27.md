# THE WORKER LIFE — IMPLEMENTATION PASS
## Programmer Build Spec · Screen by Screen · Action by Action
### 27.09.2026

> מטרת המסמך: **לבצע**. לא עוד אודיט ולא עוד מסמך תסריט.
>
> כל סעיף כאן מתייחס למסך קיים/חדש, לפעולה קונקרטית של השחקן, ל-state שנכתב, ל-fail-forward ול-QA. אין להוסיף עמודי prototype נפרדים. הכול נכנס לתוך LIFE הקיים ובאותה ארכיטקטורה.

---

# 0. NON-NEGOTIABLE IMPLEMENTATION CONTRACT

## 0.1 לא לבנות מערכת משחק חדשה
להשתמש במערכות הקיימות:
- `CHAPTERS` — registry, start, next, bridge, match ritual.
- `Beat[]` — `lines`, `talk`, `card`, `toast`, `travel`, `ending`, `pano`, `sound`, `sfx`, `crowd`, `match`, `presence`, `cutscene`, `actorCue`, `hud`.
- Conversations/choices — שיחה עם אופציות אמיתיות.
- `StoryDirector` — `MUST`, `DILEMMA`, `PRE_MATCH`.
- `WorldScene` / `scenes.ts` / `rooms2000.ts` — actors, hotspots, exits, layers, `artByEra`, `repaints`.
- `matchRitual`, `missReason`, `filmPlayback`, Red Box, route flags, promises, relationships, money, time.

## 0.2 כל מסך חייב לעבוד לפי state machine פשוט
לכל מסך להגדיר לפחות:
1. `enter` — מה קורה בכניסה.
2. `available actions` — 1 primary + עד 2 secondary.
3. `commit` — הרגע שבו בחירה ננעלת.
4. `visible consequence` — משהו משתנה בעולם.
5. `close` — מעבר ברור למסך הבא / auto-transition.
6. `fallback` — מה קורה אם השחקן לא עושה כלום / יוצא / מאחר.

## 0.3 Choice Budget
- משימה קצרה: 2 אופציות אמיתיות.
- משימת dilemma: 3 אופציות לכל היותר בזמן אמת + אפשרות `לא עכשיו/לוותר` אם היא משמעותית.
- משימת strategy: 3–4 approaches, אבל **אין אפשרות להשלים הכול**.
- שיחה רגשית: 2–3 תגובות שונות בטון/קשר, לא 5 כפתורים.
- אין “טוב/רע/נייטרלי” קוסמטי. כל אופציה חייבת לשנות אחד מאלה: זמן / כסף / קשר / promise / presence / reputation / route proof / object / later callback.

## 0.4 Fail-forward
אסור `Game Over` בגלל בחירת סיפור רגילה. כישלון הוא:
- הגעה מאוחרת;
- חצי הצלחה;
- מישהו אחר עשה במקומך;
- איבדת הזדמנות אבל קיבלת סצנה אחרת;
- נוצר חוב/מבוכה/זיכרון אחר;
- היסטוריה ממשיכה בכל מקרה.

## 0.5 No dead air
- 3 שניות: להבין חדר/יציאה/אדם חשוב.
- 8 שניות: verb ראשון.
- 12–15 שניות בלי פעולה: NPC/world hint.
- אחרי שכל meaningful action נגמר: אין לחכות לשעון. `travel/card/ending/clock advance` טבעי.

## 0.6 Input correctness
- לחיצה שפתחה choice לא רשאית לבחור מיד את הבחירה הראשונה.
- לחסום input עד pointer-up + frame/tick חדש, לא workaround של 900ms.
- touch targets נפרדים גם אם sprites חופפים.
- modal/dialogue לא מכסה hotspot/exit הנדרש להמשך.

## 0.7 Variation requirement
בכל פרק לבחור לפחות **שני משתנים מעבר** מתוך:
- route;
- partner/family;
- presence/miss;
- money;
- promise history;
- prior object/memory;
- distance/abroad;
- leadership/delegation;
- regular supporter.
אם פרק קורא flags אבל מציג אותה סצנה בדיוק — הוא לא נחשב ממומש.

---

# 1. FILE/ARCHITECTURE WORK PLAN

## Core files to extend, not replace
- `lib/life/content/chapters.ts`
- chapter-specific content files (`chapterStageA.ts`, 2000–2026 files)
- `lib/life/storyDirector.ts`
- `lib/life/world/scenes.ts`
- `lib/life/world/rooms2000.ts`
- `lib/life/world/placeLifecycle.ts`
- `lib/life/runtime/WorldScene.ts`
- shared interactions for calendar / evidence / suitcase / ticket / owner board
- tests under `tests/life-*.test.ts`

## Add shared primitives only when 3+ chapters use them
Recommended reusable components/systems:
1. `PressureChoiceSheet` — timed/limited-capacity 2–4 choices.
2. `EvidenceBoard` — FACT / HEARD / OPINION / VERIFIED.
3. `CommitmentCalendar` — promises + limited slots.
4. `PhysicalDecisionSheet` — ticket/contract/ownership paper-like decision.
5. `ObjectCarryChoice` — choose memory item(s) to carry.
6. `WorldTaskCluster` — 3–5 visible tasks, player can complete N.
7. `MomentObservation` — Gate 5/8-derived player/ball/sequence observation.

Do not create a component for a mechanic used once if normal Beat/Conversation/Hotspot data can do it.

---

# 1.1 P0 TECHNICAL BLOCKERS BEFORE CONTENT PASS

1. **2024 swallowed choice input** — remove the 900ms probe workaround as a UX dependency. Opening a decision must consume the pointer/touch and choices become armed only after pointer-up / next input cycle. Add rapid-tap regression test.
2. **Stage A age sprites** — code may continue to fall back safely, but mark A1–A6 visual QA blocked until 5/6/7-year-old Pogi assets land.
3. **Transition authority** — every chapter must have exactly one authoritative close path. Any ending card, travel, film skip, or miss path must converge through it.
4. **Director coverage** — add DILEMMA definitions only for true simultaneous conflicts. Do not turn every chapter into a top-screen objective card.
5. **No free-time escape while story is live** — preserve `storyHoldsTheMoment`; every new MUST/DILEMMA destination must be reachable or have an explicit blocked reason.

---

# 2. CHAPTER-BY-CHAPTER IMPLEMENTATION

## 1. A1 · Prologue · 1.6.1983 — הזיכרון הראשון
**Choice budget:** 2–3 meaningful responses; no fake success/fail.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — כניסה לזיכרון
**Presentation:** HUD כבוי. רק רעש קהל, דגלים, כתפיים של קובי. המצלמה נמוכה יחסית — העולם נראה גדול על ילד בן 5.  
**Scene/art:** NEW/ADAPT: יציע 1983 צפוף, crop קרוב יותר מה-stand הרגיל; קובי ופוגי כשחקנים נפרדים  
**Player verb(s):** להסתכל/לגעת בצעיף/להיצמד/לכסות אוזניים. כל פעולה מייצרת memory אחר.  
**Required options (4):** `להסתכל` · `לגעת בצעיף` · `להיצמד` · `לכסות אוזניים. כל פעולה מייצרת memory אחר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** הכיף הוא sensory discovery, לא objective. אחרי 8–10 שניות בלי קלט הקהל זז וקובי משנה תנוחה.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — הקהל קופץ
**Presentation:** דחיפה קצרה של crowd, ניירות, דגל עובר בפריים.  
**Scene/art:** REUSE אותה תמונה + crowd dressing/foreground  
**Player verb(s):** לקפוץ / לקפוא / לצחוק / להיצמד לקובי.  
**Required options (4):** `לקפוץ` · `לקפוא` · `לצחוק` · `להיצמד לקובי`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** מיקרו-בחירה רגשית; אין QTE ואין כישלון.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — יציאה
**Presentation:** הסאונד נשאר חצי שנייה אחרי fade.  
**Scene/art:** REUSE + fade אל Red Memory card  
**Player verb(s):** בחירת הזיכרון נוצרת אוטומטית ממה שעשה.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** לא להשאיר את השחקן לחפש 'איך מסיימים'.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW: close 1983 terrace composition if current stand cannot support a five-year-old shoulder-level shot.

## 2. A2 · a2-alley — שתי סיבות לצאת
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — מטבח
**Presentation:** רחל במטבח, לחם/פתק/שעון גלוי; קול של אופיר מבחוץ.  
**Scene/art:** REUSE kitchen  
**Player verb(s):** לשמוע את שתי הדרישות. כפתורי objective לא יהיו menu אלא hotspots: דלת לרחוב / פתק אצל רחל.  
**Required options (2):** `לשמוע את שתי הדרישות. כפתורי objective לא יהיו menu אלא hotspots: דלת לרחוב` · `פתק אצל רחל`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** האתגר מתחיל מיד: שתי מטרות מתנגשות.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — רחוב/סמטה
**Presentation:** החבר'ה והמגרש נראים במרחק; דרך לקיוסק בכיוון השני.  
**Scene/art:** REUSE street + ADAPT afternoon dressing  
**Player verb(s):** השחקן בוחר ברגליים לאן ללכת. שעון מופיע רק אחרי יציאה.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** הכיף הוא agency גיאוגרפי — אין 'בחר A/B'.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — קיוסק או מגרש
**Presentation:** בקיוסק רפי פעיל; במגרש 45–60 שניות highlights.  
**Scene/art:** REUSE kiosk / pitch  
**Player verb(s):** קנייה/משחק/הבטחה.  
**Required options (3):** `קנייה` · `משחק` · `הבטחה`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** מחיר = זמן. אם שיחק קודם, החבר'ה משתנים; אם קנה קודם, מגיע מאוחר.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — חזרה הביתה
**Presentation:** רחל מגיבה לתוצאה בפועל.  
**Scene/art:** REUSE kitchen dusk variant via dressing  
**Player verb(s):** לתת לחם / להסביר / לשתוק.  
**Required options (3):** `לתת לחם` · `להסביר` · `לשתוק`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** השלכה אנושית במקום popup.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: street afternoon dressing + visible clock cue; no new full background.

## 3. A3 · a3-hall — הבית האדום השני
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — רחוב עם אפי
**Presentation:** אפי מגיע ביוזמת NPC עם כדור; pin של אוסישקין עדיין לא מוכר.  
**Scene/art:** REUSE street  
**Player verb(s):** ללכת איתו / לשאול תוך כדי הליכה / לדחות.  
**Required options (3):** `ללכת איתו` · `לשאול תוך כדי הליכה` · `לדחות`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** השיחה צריכה לקרות בתנועה, לא tree סטטי.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — הדרך
**Presentation:** אפי מתקדם קצת לפני פוגי; intersection אחד.  
**Scene/art:** REUSE route/street segments; ADAPT signage/late afternoon  
**Player verb(s):** לעקוב / לבחור פנייה / להגיע לבד אם למד מספיק.  
**Required options (3):** `לעקוב` · `לבחור פנייה` · `להגיע לבד אם למד מספיק`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** אתגר ניווט קטן; wrong turn עולה זמן בלבד.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — אוסישקין מבחוץ
**Presentation:** הבניין נראה לפני שנכנסים; ריח/גריל/קהל באמצעות props ו-sound.  
**Scene/art:** REUSE ussExt  
**Player verb(s):** להסתכל / לדבר עם אפי / להיכנס.  
**Required options (3):** `להסתכל` · `לדבר עם אפי` · `להיכנס`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** רגע reveal, קצר.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — אולם
**Presentation:** לפני המשחק: סדרן, קיוסק, דלת חדר הלבשה מתחת ליציע.  
**Scene/art:** REUSE ussHallPre/ussHall  
**Player verb(s):** יש זמן ל-2 מתוך 4: פרקט, סדרן, קיוסק, חדר הלבשה.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** scarcity הופך exposition לחקירה.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: route wayfinding layer. Existing Ussishkin art should be kept.

## 4. A4 · a4-shirt — החולצה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — חדר/פחית
**Presentation:** הפחית מתחת למיטה, החולצה כרעיון דרך חלון/פתק, לא modal.  
**Scene/art:** REUSE bedroom  
**Player verb(s):** לספור או רק להבין שאין מספיק.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** Tactile opening; כסף נהיה מוחשי.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — שכונה כ-work loop
**Presentation:** 3 opportunities נראות בעולם, לא quest list.  
**Scene/art:** REUSE street+kiosk+pitch  
**Player verb(s):** לבחור עד 2 עבודות + פיתוי Supergoal.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** אין grind; כל פעולה 30–50 שניות.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — family collision
**Presentation:** ארנק/צורך משפחתי נכנס לפני הקנייה.  
**Scene/art:** REUSE kitchen/living  
**Player verb(s):** לתת / חלק / לשמור / promise.  
**Required options (4):** `לתת` · `חלק` · `לשמור` · `promise`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** כסף מקבל מחיר רגשי.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — קיוסק/מתנה
**Presentation:** פוגי מניח כסף. קובי נכנס מהרחוב ביוזמת actorCue.  
**Scene/art:** REUSE kiosk  
**Player verb(s):** לסיים את העסקה; אין 'בחר לקבל מתנה'.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** הפתעה רגשית, לא reward screen.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background. Add small shirt-window/price prop if missing.

## 5. A5 · a5-first — בחולצה שלך
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — חדר + ritual
**Presentation:** החולצה על הכיסא, גדולה עליו. wardrobe sheet נפתח רק בנגיעה.  
**Scene/art:** REUSE bedroom  
**Player verb(s):** ללבוש; לבחור צעיף/בלי.  
**Required options (2):** `ללבוש; לבחור צעיף` · `בלי`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** הכיף = ownership.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — רחוב social test
**Presentation:** חבר צוחק שהיא גדולה; ילד אחר רוצה למדוד; מבוגר מזהה.  
**Scene/art:** REUSE street; ADAPT matchday dressing  
**Player verb(s):** לשמור עליה / לתת לחבר / לשחק איתה בכדור.  
**Required options (3):** `לשמור עליה` · `לתת לחבר` · `לשחק איתה בכדור`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** החולצה הופכת לסיפור, לא cosmetic.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — בדרך למשחק
**Presentation:** כתם/גשם/אבק קטן לפי בחירה.  
**Scene/art:** REUSE route  
**Player verb(s):** להגן על החולצה או לא.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** מחיר הוא condition/memory, לא stats.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — memory close
**Presentation:** החולצה נשמרת במצב שלה.  
**Scene/art:** REUSE close-up prop card  
**Player verb(s):** אין עוד פעולה.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** callback נולד פיזית.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: matchday street dressing. No new full backdrop.

## 6. A6 · a6-radio — אכזבה רגילה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — מטבח/חדר
**Presentation:** טרנזיסטור קיים על השולחן; גשם/תריסים; קובי או לבד.  
**Scene/art:** REUSE kitchen/home  
**Player verb(s):** להחזיק/להקשיב/לכבות.  
**Required options (3):** `להחזיק` · `להקשיב` · `לכבות`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** התחלה מיידית, בלי לחפש objective.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — קליטה נעלמת
**Presentation:** static עולה; מיקום פוגי/אנטנה משנה clarity.  
**Scene/art:** REUSE same + audio-driven interaction  
**Player verb(s):** לעמוד ליד חלון / להזיז רדיו / להתקשר לעמית / לוותר.  
**Required options (4):** `לעמוד ליד חלון` · `להזיז רדיו` · `להתקשר לעמית` · `לוותר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** מיני-אתגר אודיו של 45–60 שניות.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — aftermath
**Presentation:** אין score reward; רק תגובה אנושית.  
**Scene/art:** REUSE living/bedroom  
**Player verb(s):** להישאר עם קובי / לחזור לחדר / שיחה קצרה.  
**Required options (3):** `להישאר עם קובי` · `לחזור לחדר` · `שיחה קצרה`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** אכזבה הופכת לאינטימיות.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: rain/night window layer + radio static system; no new art.

## 7. A7 · a7-week — השבוע שלפני
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — רחוב
**Presentation:** אנשים מדברים על המשחק הבא; פוגי קולט שהפעם הוא חייב להגיע.  
**Scene/art:** REUSE street  
**Player verb(s):** לשאול/לשמוע/ללכת הביתה.  
**Required options (3):** `לשאול` · `לשמוע` · `ללכת הביתה`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** Need נוצר בעולם.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — בית negotiation
**Presentation:** קובי ורחל בתנועה; אין dialogue tree על מסך שחור.  
**Scene/art:** REUSE kitchen/living  
**Player verb(s):** לבקש ישירות / דרך רחל / להציע מטלה / לשקר.  
**Required options (4):** `לבקש ישירות` · `דרך רחל` · `להציע מטלה` · `לשקר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** כל בחירה יוצרת constraint ממשי ל-A8.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — plan B
**Presentation:** אם סורב, אופיר/עמית זמינים לזמן קצר.  
**Scene/art:** REUSE bedroom/street  
**Player verb(s):** לקבוע שעה/מקום/מי מביא מה.  
**Required options (3):** `לקבוע שעה` · `מקום` · `מי מביא מה`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** הבחירה מייצרת spawn/time/debt למחרת.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background. Add paper-plan prop.

## 8. A8 · 1986 — להגיע לבלומפילד
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — חדר ritual
**Presentation:** חולצה/צעיף/מפתח אם קיים; מצב A7 כבר מורגש.  
**Scene/art:** REUSE bedroom  
**Player verb(s):** להתארגן מהר.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** אין checklist ארוך — 2–3 פריטים.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — route
**Presentation:** family/friends/late/risk משנים actors, crowd density וזמן.  
**Scene/art:** REUSE street + route  
**Player verb(s):** לנוע, לפתור חסימה, אולי לשלם/לבקש עזרה.  
**Required options (2):** `לנוע, לפתור חסימה, אולי לשלם` · `לבקש עזרה`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** route אמיתי, לא dialogue skin.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — Gate 7
**Presentation:** שלוש דרכי כניסה: אדם / ידע / תזמון, במרחב.  
**Scene/art:** REUSE gate7  
**Player verb(s):** לדבר/להמתין לרגע/להשתמש במה שיודע.  
**Required options (3):** `לדבר` · `להמתין לרגע` · `להשתמש במה שיודע`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** אתגר מרכזי.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — יציע
**Presentation:** קהל חי; no wandering after meaningful actions exhausted.  
**Scene/art:** REUSE stand80s + crowd dressing  
**Player verb(s):** להתמקם / למצוא קובי / לראות historical beat.  
**Required options (3):** `להתמקם` · `למצוא קובי` · `לראות historical beat`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** היסטוריה היא convergence.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S5 — אחרי
**Presentation:** קובי יוזם את הצעד האחרון לפי route.  
**Scene/art:** REUSE stand/outside variant  
**Player verb(s):** להיפגש.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** היפוך ישולם ב-2026.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background if approved 1986 set is complete; possibly ADAPT crowd-density layers.

## 9. B1 · 1990 — כמה צריך?
**Choice budget:** 3–4 strategic approaches, but only 1–2 can be completed before the pressure closes.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — מטבח
**Presentation:** עיתון/רדיו/פתק חשבון.  
**Scene/art:** REUSE kitchen + TABLE_RADIO  
**Player verb(s):** לאסוף מקור ראשון.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** מיד ברור שהמידע חלקי.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — בלומפילד/סביבה
**Presentation:** המשחק המקומי מתקדם; שמועות מיבנה מגיעות מאנשים.  
**Scene/art:** REUSE old Bloomfield/route  
**Player verb(s):** לבחור אם להישאר ולראות או לצאת לטלפון ציבורי.  
**Required options (2):** `לבחור אם להישאר ולראות` · `לצאת לטלפון ציבורי`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** כל אימות עולה דקות.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — information board
**Presentation:** פתק ידני: הפועל / יבנה / הפרש, KNOWN-RUMOR-VERIFIED.  
**Scene/art:** NEW UI overlay, not background  
**Player verb(s):** לגרור ידיעה למקום הנכון; לא quiz.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** אתגר הבנה בזמן אמת.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — crowd resolution
**Presentation:** הקהל מבין לפני/אחרי פוגי לפי איכות המקורות.  
**Scene/art:** REUSE stand90s/old stand  
**Player verb(s):** להגיב/להתקשר.  
**Required options (2):** `להגיב` · `להתקשר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** journalist seed.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW UI: handwritten parallel-score notebook. ADAPT: public phone prop / 1990 matchday crowd.

## 10. B2 · 1991 — יש עוד בית
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — classroom
**Presentation:** מחברת/מורה/שעון; אפי מחכה אחרי הלימודים.  
**Scene/art:** REUSE classroom  
**Player verb(s):** לסיים/לחתוך/להשאיר הודעה.  
**Required options (3):** `לסיים` · `לחתוך` · `להשאיר הודעה`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** בית ספר הוא cost אמיתי.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — route to Ussishkin
**Presentation:** כבר מכיר את המקום; אין reveal חוזר.  
**Scene/art:** REUSE route/street  
**Player verb(s):** להביא חבר / ללכת לבד / לאחר.  
**Required options (3):** `להביא חבר` · `ללכת לבד` · `לאחר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** קצב.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — hall job
**Presentation:** קiosk/סדרן/חדר הלבשה; משימה practical אחת.  
**Scene/art:** REUSE ussHall  
**Player verb(s):** להעביר crate/פתק/לעזור.  
**Required options (3):** `להעביר crate` · `פתק` · `לעזור`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** הרגשת שייכות במקום exposition.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background. Classroom dressing might need 1991 details.

## 11. B3 · 1993-cup — הגביע אדום
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — ticket scarcity
**Presentation:** כרטיסים/אוטובוס/משפחה מתנגשים.  
**Scene/art:** REUSE home/kiosk  
**Player verb(s):** להשיג דרך אחת; אולי לוותר על memorabilia.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** resource puzzle.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — travel
**Presentation:** חברים/משפחה לפי route.  
**Scene/art:** REUSE bus/route if existing; otherwise NEW bus interior  
**Player verb(s):** לשמור מקום / לעזור למישהו / לבחור מי יושב לידך.  
**Required options (3):** `לשמור מקום` · `לעזור למישהו` · `לבחור מי יושב לידך`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** social friction.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — arena arrival
**Presentation:** קהל/כניסה.  
**Scene/art:** ADAPT/NEW 1993 basketball final exterior/interior if current hall art mismatches  
**Player verb(s):** להגיע בזמן/מאוחר.  
**Required options (2):** `להגיע בזמן` · `מאוחר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** arrival is gameplay.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — aftermath
**Presentation:** גביע fixed; personal payoff.  
**Scene/art:** REUSE event interior + memory card  
**Player verb(s):** מי מקבל את השיחה/חפץ.  
**Required options (2):** `מי מקבל את השיחה` · `חפץ`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** sets up Galil contrast.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW if no period-accurate 1993 arena exists: one basketball venue backdrop + entrance crop.

## 12. B4 · 1993-galil — הבית נשבר
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — post-game hall
**Presentation:** כיסאות מתרוקנים, sound decays.  
**Scene/art:** ADAPT ussHall or relevant away-hall with emptied crowd  
**Player verb(s):** להישאר/לנוע.  
**Required options (2):** `להישאר` · `לנוע`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no menu.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — three problems
**Presentation:** אפי קפוא; ילד מחפש מבוגר; ציוד צריך לצאת.  
**Scene/art:** REUSE hall + actors  
**Player verb(s):** אפשר לטפל רק בשניים לפני האוטובוס.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** limited-capacity challenge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — bus/departure
**Presentation:** מה שלא פתרת נראה.  
**Scene/art:** REUSE/NEW bus interior  
**Player verb(s):** לשבת ליד אפי/מישהו אחר.  
**Required options (2):** `לשבת ליד אפי` · `מישהו אחר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** consequence without 'failure'.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: post-loss empty hall. If away venue unavailable, new neutral 1993 basketball hall.

## 13. B5 · 1995-sinai — המספר שבע על הקיר
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — bedroom wall
**Presentation:** poster/pin already hotspot. radio/newspaper atmosphere.  
**Scene/art:** REUSE bedroom90  
**Player verb(s):** להשאיר/להוריד/לקרוא.  
**Required options (3):** `להשאיר` · `להוריד` · `לקרוא`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** private stance first.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — Gate 7 environment
**Presentation:** באנר/וויכוח/חסימה; claims attributed to NPCs.  
**Scene/art:** REUSE gate/stand90s; ADAPT protest dressing  
**Player verb(s):** להצטרף ליצור / להתבונן / להגן על אדם / לעבור מקום.  
**Required options (4):** `להצטרף ליצור` · `להתבונן` · `להגן על אדם` · `לעבור מקום`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** action not opinion poll.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — changed gate
**Presentation:** השער עצמו נסגר/גישה משתנה.  
**Scene/art:** ADAPT closed Gate 7 dressing  
**Player verb(s):** למצוא דרך אחרת/לחזור.  
**Required options (2):** `למצוא דרך אחרת` · `לחזור`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** world proves conflict.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — wall callback
**Presentation:** הפוסטר/נעץ משקפים מה עשה.  
**Scene/art:** REUSE bedroom90  
**Player verb(s):** אין forced moral conclusion.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** identity memory.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: Gate 7 protest/closed-state layers. No new geometry unless current gate cannot show closure.

## 14. B6 · 1996-army — אין מקום אחד לעמוד בו
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — base/shift
**Presentation:** לוח משמרות, מפקד, טלפון.  
**Scene/art:** NEW if absent: simple 1990s military duty room/gate  
**Player verb(s):** לבקש swap / אישור / לשקר / להישאר.  
**Required options (4):** `לבקש swap` · `אישור` · `לשקר` · `להישאר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** hard choice immediately.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — transport
**Presentation:** הסעה/טרמפ/שעון.  
**Scene/art:** REUSE route/bus; ADAPT hitchhike roadside  
**Player verb(s):** לקבל/לסרב/לרדת.  
**Required options (3):** `לקבל` · `לסרב` · `לרדת`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** time-money-legal triangle.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — match presence or miss
**Presentation:** לא כל route מגיע ליציע.  
**Scene/art:** REUSE stadium/home/radio according to route  
**Player verb(s):** לשחק את מה שכן קרה.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** miss is content.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — return to base
**Presentation:** איחור/חוב לחבר/עייפות.  
**Scene/art:** REUSE/NEW base gate night  
**Player verb(s):** להסביר/לשאת consequence.  
**Required options (2):** `להסביר` · `לשאת consequence`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** callback years later.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW: military gate/guard-room 1996; ADAPT roadside/hitchhike dressing.

## 15. B7 · 1997-basket — גם האולם יכול לרדת
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Ussishkin
**Presentation:** משחק/רדיו/כניסה מאוחרת לפי presence.  
**Scene/art:** REUSE ussHall  
**Player verb(s):** למצוא מקום/אפי.  
**Required options (2):** `למצוא מקום` · `אפי`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** dynamic presence.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — after loss
**Presentation:** ציוד/אנשים/שקט.  
**Scene/art:** REUSE hall emptied  
**Player verb(s):** לעזור לפרק / להישאר / להתווכח / לצאת.  
**Required options (4):** `לעזור לפרק` · `להישאר` · `להתווכח` · `לצאת`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** community proof is earned after result.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — outside
**Presentation:** מעט אנשים נשארו.  
**Scene/art:** REUSE ussExt night  
**Player verb(s):** ללכת עם אפי או לבד.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** short emotional close.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: 1997 night/crowd-empty variants; no new full art.

## 16. B8 · 1998-laces — השרוכים
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — how you receive it
**Presentation:** המשחק המקביל של הפועל והחדשות מתערבבים.  
**Scene/art:** REUSE stand/home/kiosk/radio based on state  
**Player verb(s):** לצפות/לשמוע/להגיע מאוחר.  
**Required options (3):** `לצפות` · `לשמוע` · `להגיע מאוחר`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** presence matters.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — Moment Puzzle
**Presentation:** freeze-frame schematics, timeline fragments.  
**Scene/art:** NEW UI using Gate 5/8 player+ball mechanic  
**Player verb(s):** מי נגע / לאן הלך / מה ראית.  
**Required options (3):** `מי נגע` · `לאן הלך` · `מה ראית`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** skill = observation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — rumor terrace
**Presentation:** אנשים אומרים דברים שונים.  
**Scene/art:** REUSE kiosk/street  
**Player verb(s):** לסמן HEARD vs SAW vs BELIEVE.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no objective motive truth.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — Red Box note
**Presentation:** הזיכרון נשמר בניסוח אישי.  
**Scene/art:** REUSE bedroom90  
**Player verb(s):** לא חובה לבחור conspiracy.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** long callback.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW UI composition only; reuse Gate 5/8 visual system.

## 17. B9 · 1999-basket — זה לא נגמר כשעולים
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — celebration
**Presentation:** קהל, רעש, הצלחה.  
**Scene/art:** REUSE ussHall  
**Player verb(s):** לחגוג 20–30 sec.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** earned joy.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — clock cuts in
**Presentation:** 4 needs appear physically: cleanup, count, ride, tomorrow setup.  
**Scene/art:** REUSE same, crowd layers disappear  
**Player verb(s):** לבחור עד 2.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** challenge is responsibility.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — consequence
**Presentation:** NPCs did remaining tasks, not always perfectly.  
**Scene/art:** REUSE hall/outside  
**Player verb(s):** לראות/להגיב.  
**Required options (2):** `לראות` · `להגיב`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** world works without player.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT crowd-to-empty layer transition.

## 18. B10 · 1999-cup — שש עשרה שנה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — wardrobe/old shirt
**Presentation:** first shirt/objects visible before leaving.  
**Scene/art:** REUSE bedroom90  
**Player verb(s):** לבחור what to wear/carry.  
**Required options (2):** `לבחור what to wear` · `carry`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** callback tangible.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — travel/entry
**Presentation:** family/friends/collector/terrace alters party and obligation.  
**Scene/art:** REUSE route/venue  
**Player verb(s):** solve ticket/seat/memento friction.  
**Required options (3):** `solve ticket` · `seat` · `memento friction`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no branch skins.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — match/film
**Presentation:** short playable setup then history.  
**Scene/art:** REUSE venue + optional historical film  
**Player verb(s):** watch/skip film after setup.  
**Required options (2):** `watch` · `skip film after setup`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** respect pacing.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — Kobi beat
**Presentation:** Kobi notices object only if actually carried.  
**Scene/art:** REUSE outside/home  
**Player verb(s):** respond.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** memory payoff.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: Likely reuse; add period crowd/venue dressing.

## 19. B11a · 2000-title — ארבעה ימים
**Choice budget:** 3–4 strategic approaches, but only 1–2 can be completed before the pressure closes.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — street/pitch
**Presentation:** phones/radio/rumors; world now faster than 1990.  
**Scene/art:** REUSE pitchSmall/street  
**Player verb(s):** decide source trust.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** echo B1 with technological progression.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — confirmation
**Presentation:** notifications are diegetic, not app-like modern UI.  
**Scene/art:** NEW lightweight phone/radio overlay  
**Player verb(s):** cross-check / stay present.  
**Required options (2):** `cross-check` · `stay present`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** information challenge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — celebration
**Presentation:** who gets first hug/call.  
**Scene/art:** REUSE street/kiosk  
**Player verb(s):** act, not dialogue list.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** relationship payoff.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop; period phone prop/UI.

## 20. B11b · 2000-double — הדאבל
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — four-day fatigue setup
**Presentation:** bed/red box/work obligation physical hotspots.  
**Scene/art:** REUSE bedroom00  
**Player verb(s):** sleep / box / work choice.  
**Required options (3):** `sleep` · `box` · `work choice`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** fatigue from title shown through available time.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — route to final
**Presentation:** tickets/work/person constraints.  
**Scene/art:** REUSE route/venue  
**Player verb(s):** resolve one problem.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** compact.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — final
**Presentation:** historical penalties fixed.  
**Scene/art:** REUSE venue + film layer  
**Player verb(s):** presence + reaction.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no mini-game pretending player controls result.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — night transition
**Presentation:** shoes, silence, family.  
**Scene/art:** REUSE home adult/parents  
**Player verb(s):** choose person/bed.  
**Required options (2):** `choose person` · `bed`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** flows directly to bridge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new full background.

## 21. C00 · 2000-bridge — מה שאחרי
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — living room night
**Presentation:** no victory UI; family mundane after huge night.  
**Scene/art:** REUSE living/home  
**Player verb(s):** talk to one person / sleep.  
**Required options (2):** `talk to one person` · `sleep`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** decompression.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — Red Box
**Presentation:** max 3 highlighted items, not museum.  
**Scene/art:** REUSE bedroom00 + RedBoxSheet  
**Player verb(s):** touch one/two items.  
**Required options (2):** `touch one` · `two items`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** nostalgia without UI dump.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — kiosk/work seed
**Presentation:** Rafi offers concrete shift; friends offer team; other seeds appear through people.  
**Scene/art:** REUSE kioskNight  
**Player verb(s):** commit or decline.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** route seed through action.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new art.

## 22. C01 · 2000-team — צריך שם עד מחר
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — pitchSmall
**Presentation:** friends physically spaced; roster board as paper prop.  
**Scene/art:** REUSE pitchSmall  
**Player verb(s):** choose players/captain/pay split.  
**Required options (3):** `choose players` · `captain` · `pay split`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** talent/reliability chemistry.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — 2 highlights
**Presentation:** only key moments.  
**Scene/art:** REUSE pitchSmall + Gate 5 movement system  
**Player verb(s):** position/pass/shot decisions.  
**Required options (3):** `position` · `pass` · `shot decisions`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** 60 sec max each.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — sideline
**Presentation:** bad team name/argument/payback.  
**Scene/art:** REUSE pitchSmall edge  
**Player verb(s):** settle who pays / apologize / keep joke.  
**Required options (3):** `settle who pays` · `apologize` · `keep joke`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** callback stored.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background. New compact roster paper UI.

## 23. C02 · 2001-terrace — לא מי שצועק הכי חזק
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Gate 5 prep
**Presentation:** fabric/paint/people missing.  
**Scene/art:** REUSE gate5/bloomOldGates  
**Player verb(s):** pick 2 tasks.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** opening time visible.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — craft
**Presentation:** banner/stencil tactile.  
**Scene/art:** REUSE Gate 4 shirt/builder interaction language  
**Player verb(s):** cut/place/paint limited pieces.  
**Required options (3):** `cut` · `place` · `paint limited pieces`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** fun physical creation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — gate opens
**Presentation:** unfinished work remains unfinished.  
**Scene/art:** REUSE gate5 + crowd layers  
**Player verb(s):** take credit / share / blame / stay quiet.  
**Required options (4):** `take credit` · `share` · `blame` · `stay quiet`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** leadership consequence.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT gate5 prep-state; no new geometry.

## 24. C03 · 2002-europe — העולם שמע עלינו
**Choice budget:** 3–4 strategic approaches, but only 1–2 can be completed before the pressure closes.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — travel board
**Presentation:** Europe arc as physical wall/map, not menu.  
**Scene/art:** REUSE home/kiosk + NEW paper map overlay  
**Player verb(s):** choose which trip deserves money/time.  
**Required options (2):** `choose which trip deserves money` · `time`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** macro strategy.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — episode vignettes
**Presentation:** Chelsea/Lokomotiv/Parma compressed.  
**Scene/art:** REUSE travel/airport/away-neutral where possible; ADAPT city cards  
**Player verb(s):** one concrete friction per episode.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no repetitive travel planner.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — Milan decision
**Presentation:** ticket cost/work/friend/journalist/contact all collide.  
**Scene/art:** REUSE home/work + NEW/ADAPT airport/away street if needed  
**Player verb(s):** choose travel method or full home alternative.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** major quest.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — match convergence
**Presentation:** history fixed.  
**Scene/art:** ADAPT neutral European stand + film  
**Player verb(s):** experience according to route.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** all routes emotionally complete.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW: reusable early-2000s European transit/airport terminal if absent; use city arrival cards rather than bespoke city backdrops for every trip.

## 25. C04 · 2002-desk — לכתוב או להיות צודק
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Allenby/work desk
**Presentation:** notes, recorder, phone.  
**Scene/art:** REUSE allenby  
**Player verb(s):** collect 3 evidence cards.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** visual investigation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — evidence board
**Presentation:** cards have provenance icons.  
**Scene/art:** NEW UI FACT/HEARD/OPINION  
**Player verb(s):** publish/verify/call/kill.  
**Required options (4):** `publish` · `verify` · `call` · `kill`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** speed has benefit; accuracy has cost.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — publish
**Presentation:** headline/response arrives.  
**Scene/art:** REUSE desk  
**Player verb(s):** commit.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** sets 2006.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW evidence-card UI; no new background.

## 26. C05 · 2006-home — ריח של בית
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Ussishkin alive
**Presentation:** 96:71 derby/joy context; dense crowd through layers.  
**Scene/art:** REUSE ussHall; ADAPT 2004 full-night dressing  
**Player verb(s):** choose two pregame acts.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** positive memory before loss.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — prep
**Presentation:** confetti/banner/kiosk.  
**Scene/art:** REUSE hall  
**Player verb(s):** perform one tactile task.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** fun creation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — game beat
**Presentation:** brief, loud, joyous.  
**Scene/art:** REUSE hall + crowd/film optional  
**Player verb(s):** watch/react.  
**Required options (2):** `watch` · `react`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** do not overstay.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — object
**Presentation:** one confetti/paper remains in pocket.  
**Scene/art:** REUSE hall  
**Player verb(s):** keep/drop.  
**Required options (2):** `keep` · `drop`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** future demolition callback.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT: full 2004 Ussishkin crowd/night state.

## 27. C06 · 2006-desk — התיקון
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Allenby
**Presentation:** affected person/temptation differs by 2002 state.  
**Scene/art:** REUSE allenby  
**Player verb(s):** listen.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** branch-specific opening.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — correction layout
**Presentation:** prominent/small/call/defend; verified route gets a new tempting scoop instead.  
**Scene/art:** REUSE evidence UI  
**Player verb(s):** choose cost.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** real consequence.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — aftermath
**Presentation:** editor/person responds.  
**Scene/art:** REUSE desk/street  
**Player verb(s):** accept.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** professional identity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background.

## 28. C07 · 2007-table — הדף מהקיוסק
**Choice budget:** 3–4 strategic approaches, but only 1–2 can be completed before the pressure closes.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — community room
**Presentation:** table full of papers; NPCs enter with their own tasks.  
**Scene/art:** REUSE community-room  
**Player verb(s):** pick 2–3 packages.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** limited capacity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — work stations
**Presentation:** phones/list/money/hall/players/registration.  
**Scene/art:** REUSE same backdrop with hotspot clusters  
**Player verb(s):** perform short distinct interactions.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** variety without room hopping.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — progress wall
**Presentation:** NPC-completed items appear too.  
**Scene/art:** NEW small physical corkboard overlay  
**Player verb(s):** review what moved without you.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** world agency.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT community-room props; new corkboard UI only.

## 29. C08 · 2007-registered — חודש אחד
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — registration
**Presentation:** short joy, no confetti reward spam.  
**Scene/art:** REUSE community-room  
**Player verb(s):** sign/hold paper/call person.  
**Required options (3):** `sign` · `hold paper` · `call person`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** creation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — phone call
**Presentation:** tone changes; demolition news.  
**Scene/art:** REUSE same  
**Player verb(s):** answer.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** hard cut.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — walk to Ussishkin
**Presentation:** no fast travel; only ambient micro-events.  
**Scene/art:** REUSE street/ussExt, HUD off gradually  
**Player verb(s):** walk.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** controlled pacing, not wandering.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — demolition
**Presentation:** machines/dust as layers/video; no collectibles ping.  
**Scene/art:** ADAPT/NEW ussExt demolition state  
**Player verb(s):** stand/photo/help/talk/take justified paper or nothing.  
**Required options (5):** `stand` · `photo` · `help` · `talk` · `take justified paper or nothing`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** grief not gamified.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S5 — map lifecycle
**Presentation:** place becomes 'המקום כבר איננו'.  
**Scene/art:** REUSE map UI  
**Player verb(s):** none.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** world permanently changes.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW/ADAPT: demolition exterior state. Existing hall art retained for memory.

## 30. C09 · 2007-key — מי פותח מחר
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — empty new hall
**Presentation:** wide empty frame, key sound emphasized.  
**Scene/art:** REUSE hall-new  
**Player verb(s):** walk to Efi.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** space does emotional work.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — key handoff
**Presentation:** take/share/refuse/hand to Efi.  
**Scene/art:** REUSE same + close prop overlay  
**Player verb(s):** physically drag/tap recipient or leave key.  
**Required options (2):** `physically drag` · `tap recipient or leave key`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** symbol becomes obligation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — door
**Presentation:** whoever owns responsibility locks/opens.  
**Scene/art:** REUSE hall-new  
**Player verb(s):** perform or watch.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** pays in 2009.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background. Add close key prop.

## 31. C10 · 2009-up — עלינו. יש מי שיסגור?
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — celebration
**Presentation:** short joy.  
**Scene/art:** REUSE hall-new + crowd  
**Player verb(s):** celebrate.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** contrast.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — emptying hall
**Presentation:** lock/clean/child/delegate appear.  
**Scene/art:** REUSE same with crowd removal  
**Player verb(s):** choose one or delegate.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** leadership challenge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — last light
**Presentation:** if delegated, someone else closes.  
**Scene/art:** REUSE hall-new dim state  
**Player verb(s):** leave.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** proves system > martyrdom.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT dim/empty hall state.

## 32. C11 · 2010-cup — אל תתחיל לחשב
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — calendar collision
**Presentation:** work/partner/friends/match.  
**Scene/art:** REUSE homeAdult + calendar UI from 2013 lite  
**Player verb(s):** cancel/renegotiate one.  
**Required options (2):** `cancel` · `renegotiate one`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** creates debt for Teddy.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — ritual/route
**Presentation:** what you promised changes who appears.  
**Scene/art:** REUSE wardrobe + street  
**Player verb(s):** prepare/go.  
**Required options (2):** `prepare` · `go`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** continuity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — cup beat
**Presentation:** fixed history.  
**Scene/art:** REUSE venue/film  
**Player verb(s):** react/call.  
**Required options (2):** `react` · `call`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** short.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — four-days-later hook
**Presentation:** Oli/Teddy plan arrives.  
**Scene/art:** REUSE phone prop  
**Player verb(s):** answer later/now.  
**Required options (2):** `answer later` · `now`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** bridge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new full background.

## 33. C12 · 2010-teddy — עד שהטלפון נופל
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — street/travel
**Presentation:** Oli has seat/ride constraints.  
**Scene/art:** REUSE street + bus/route  
**Player verb(s):** join/solve seat/money.  
**Required options (3):** `join` · `solve seat` · `money`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** road-trip energy.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — Teddy arrival
**Presentation:** phone and crowd provide parallel info.  
**Scene/art:** NEW if no Teddy/away-stand: one generic away-stand with 2010 dressing  
**Player verb(s):** find people/spot.  
**Required options (2):** `find people` · `spot`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** anticipation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — final minutes
**Presentation:** UI strips away; crowd/noise carry tension.  
**Scene/art:** REUSE same  
**Player verb(s):** watch/react only.  
**Required options (2):** `watch` · `react only`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** forced presence, no score sim.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — aftermath
**Presentation:** phone falls, hug, call Kobi.  
**Scene/art:** REUSE stand/outside  
**Player verb(s):** choose first call/hug.  
**Required options (2):** `choose first call` · `hug`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** callback to 1983/2026.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW: Teddy/away stand 2010 if absent. This is worth bespoke art.

## 34. C13 · 2010-qualify — עוד לא הוגרלה עיר
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — kiosk planning
**Presentation:** passport/leave/budget/host shown as 3 physical constraints.  
**Scene/art:** REUSE kiosk/homeAdult  
**Player verb(s):** solve max 3.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** admin compressed.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — packing
**Presentation:** one memory item only.  
**Scene/art:** REUSE homeAdult + suitcase overlay  
**Player verb(s):** choose item.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** personalizes Europe.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — host/travel fork
**Presentation:** travel or host international visitors.  
**Scene/art:** REUSE airport/transit or Allenby/home  
**Player verb(s):** commit.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** route opening.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: Reuse transit background proposed for 2002. New suitcase UI.

## 35. C14 · 2010-friends — לא כל צעיף הוא אותה עמדה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Allenby
**Presentation:** Roma arrives with Lina/Nico plus practical need.  
**Scene/art:** REUSE allenby  
**Player verb(s):** hear request.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** NPC initiative.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — competing obligation
**Presentation:** ticket/bed/translation vs existing work/relationship promise.  
**Scene/art:** REUSE street/home  
**Player verb(s):** solve one yourself, delegate another, refuse.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** social challenge through action.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — late table
**Presentation:** conversation about differences happens after deeds.  
**Scene/art:** REUSE allenby night  
**Player verb(s):** talk naturally.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no politics quiz.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT Allenby night table/guest dressing; no new backdrop.

## 36. C15 · 2010-anthem — המנגינה הזאת
**Choice budget:** 2–3 meaningful responses; no fake success/fail.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — first anthem
**Presentation:** one fully interactive vignette.  
**Scene/art:** REUSE home/venue  
**Player verb(s):** choose who/where, ritual.  
**Required options (2):** `choose who` · `where, ritual`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** strongest beat.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — Benfica
**Presentation:** 30–45 sec montage + one reaction.  
**Scene/art:** REUSE film/venue  
**Player verb(s):** call/share.  
**Required options (2):** `call` · `share`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** historical high.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — Lyon
**Presentation:** different person/location based on life.  
**Scene/art:** REUSE home/venue  
**Player verb(s):** watch final beat.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** season closes without repetition.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new background.

## 37. L01 · 2011-people — לא תמונה שלך
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — ordinary task
**Presentation:** one character enters because of task, not romance menu.  
**Scene/art:** REUSE allenby/work/university/rehearsal  
**Player verb(s):** help/refuse/share responsibility.  
**Required options (3):** `help` · `refuse` · `share responsibility`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** chemistry through action.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — second environment
**Presentation:** another person has their own goal and may refuse Pogi.  
**Scene/art:** REUSE relevant room; ADAPT rehearsal/university if existing staged rooms cover it  
**Player verb(s):** ask/join/leave.  
**Required options (3):** `ask` · `join` · `leave`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** NPC agency.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — after-task invitation
**Presentation:** friendship/interest/distance inferred from behavior.  
**Scene/art:** REUSE street  
**Player verb(s):** accept/decline.  
**Required options (2):** `accept` · `decline`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no 'choose partner'.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT existing staged work/rehearsal rooms; NEW only if current NEW_ROOMS lacks a credible university/rehearsal composition.

## 38. L02 · 2012-cups — אותה הבטחה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — promise setup
**Presentation:** partner/friend says exact plan before match day.  
**Scene/art:** REUSE homeAdult  
**Player verb(s):** keep/renegotiate now.  
**Required options (2):** `keep` · `renegotiate now`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** wording persisted.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — match pressure
**Presentation:** invitation arrives; time visible.  
**Scene/art:** REUSE phone/street/home  
**Player verb(s):** keep / break / lie.  
**Required options (3):** `keep` · `break` · `lie`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** true cost.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — outcome
**Presentation:** match may be partial/missed and still full scene.  
**Scene/art:** REUSE chosen location  
**Player verb(s):** live consequence.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no moral popup.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new art.

## 39. L03 · 2012-five — חמש שנים וכמה מפתחות
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — responsibility board
**Presentation:** basket/terrace/journalism/work/creative all pull.  
**Scene/art:** REUSE home/kiosk + physical pinboard UI  
**Player verb(s):** choose one responsibility.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** you cannot do all.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — chosen task
**Presentation:** one concrete playable task.  
**Scene/art:** REUSE route-specific existing room  
**Player verb(s):** do it.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** identity grows.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — what happened without you
**Presentation:** 2 unattended systems visibly move.  
**Scene/art:** NEW montage card using existing stills  
**Player verb(s):** watch.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** world independence.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: New montage layout; no new backdrop.

## 40. T02 · 2012-terrace — מי פותח כשאתה לא בא
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Gate 5
**Presentation:** Yevgeny waits, doesn't ask for help — asks for role.  
**Scene/art:** REUSE gate5  
**Player verb(s):** approach.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** ego conflict.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — handoff station
**Presentation:** give authority / split scope / step down.  
**Scene/art:** REUSE gate5 + physical folder/key/fabric  
**Player verb(s):** hand object over.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** tactile leadership.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — test
**Presentation:** someone else makes a small decision while Pogi watches.  
**Scene/art:** REUSE gate5  
**Player verb(s):** intervene or let it stand.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** real delegation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new full art; add handoff props.

## 41. L04 · 2013-household — היומן שעל המקרר
**Choice budget:** 3–4 strategic approaches, but only 1–2 can be completed before the pressure closes.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — homeAdult kitchen/living
**Presentation:** calendar physically visible; people state needs.  
**Scene/art:** REUSE HOME_OWN  
**Player verb(s):** open calendar.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** home feels alive.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — calendar game
**Presentation:** 5 evenings, 7 demands; drag commitments.  
**Scene/art:** NEW/EXISTING calendar UI  
**Player verb(s):** schedule.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** core strategic challenge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — lived week
**Presentation:** consequences occur, not summarized.  
**Scene/art:** REUSE 2–3 existing rooms in fast snapshots  
**Player verb(s):** respond briefly.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** payoff.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — fridge
**Presentation:** calendar now marked/crossed.  
**Scene/art:** REUSE homeAdult  
**Player verb(s):** look/leave.  
**Required options (2):** `look` · `leave`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** memory of choices.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop. Polish calendar UI heavily.

## 42. N05–N06 · 2015-newhall — פותחים בית חדש
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — news at home
**Presentation:** phone photo of municipal inauguration; no Hapoel faces.  
**Scene/art:** REUSE homeAdult  
**Player verb(s):** phone / Red Box / close screen.  
**Required options (3):** `phone` · `Red Box` · `close screen`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** quiet personal reaction.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — empty Drive-In
**Presentation:** Efi calls Pogi early; empty seats, row search.  
**Scene/art:** REUSE hall-new  
**Player verb(s):** 2 of 4 things before crowd.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** time scarcity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — prep
**Presentation:** banner/confetti/families/not help.  
**Scene/art:** REUSE same  
**Player verb(s):** one task.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** tactile continuity with 2004.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — crowd arrives
**Presentation:** what you prepared appears.  
**Scene/art:** ADAPT hall-new crowd layer  
**Player verb(s):** watch.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** home is made by people.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S5 — first game beat
**Presentation:** short history card/film.  
**Scene/art:** REUSE same  
**Player verb(s):** react.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no extra lecture.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT hall-new empty→crowd states.

## 43. P01 · 2016-crisis — מה בעצם קרה
**Choice budget:** 3–4 strategic approaches, but only 1–2 can be completed before the pressure closes.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — kiosk information storm
**Presentation:** newspaper/phone/people contradict or repeat.  
**Scene/art:** REUSE kioskNight/day  
**Player verb(s):** inspect only 3 of 5 sources.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** information triage.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — human needs
**Presentation:** worker needs ride/payment info, fan asks what is true, friend needs help.  
**Scene/art:** REUSE street/kiosk  
**Player verb(s):** choose one main person.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** can't save everything.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — verified board
**Presentation:** facts separate from rumor.  
**Scene/art:** REUSE evidence UI from journalist but neutral  
**Player verb(s):** confirm what Pogi actually knows.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** clarity not exposition.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — go home
**Presentation:** unresolved problems remain with NPCs.  
**Scene/art:** REUSE street  
**Player verb(s):** leave/call.  
**Required options (2):** `leave` · `call`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** cost felt.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop. Reuse FACT/HEARD UI.

## 44. P02–P03 · 2017-after — המשפט הזה כבר שמעתי
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — kiosk aftermath
**Presentation:** nine points/relegation reality in environment.  
**Scene/art:** REUSE kiosk  
**Player verb(s):** talk/avoid.  
**Required options (2):** `talk` · `avoid`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** short.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — invitation to next match
**Presentation:** someone assumes Pogi will come.  
**Scene/art:** REUSE street/phone  
**Player verb(s):** say yes / break / take pause / remote.  
**Required options (4):** `say yes` · `break` · `take pause` · `remote`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** origin of distance/armchair.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — consequence
**Presentation:** friend reacts; calendar opens space if stepping back.  
**Scene/art:** REUSE relevant presence scene  
**Player verb(s):** live route shift.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** not a route menu.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new art.

## 45. K01–K03 · 2017-distance — העשור שלא היית בו
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — unread message
**Presentation:** phone buzz; scarf/TV in background.  
**Scene/art:** REUSE homeAdult  
**Player verb(s):** answer/ignore.  
**Required options (2):** `answer` · `ignore`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** snapshot 1.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — accidental match
**Presentation:** Pogi encounters game without seeking it.  
**Scene/art:** REUSE bar/home/TV using Allenby or living  
**Player verb(s):** stay/watch/leave.  
**Required options (3):** `stay` · `watch` · `leave`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** snapshot 2.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — invitation stops
**Presentation:** friend no longer asks; Pogi can initiate.  
**Scene/art:** REUSE street/phone  
**Player verb(s):** call first / accept silence.  
**Required options (2):** `call first` · `accept silence`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** snapshot 3.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — time jump
**Presentation:** distance becomes a life state, not punishment.  
**Scene/art:** REUSE RedBox/bridge card  
**Player verb(s):** none.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** compact.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop; phone/TV overlays.

## 46. R01 · 2018-return — עלינו, לא חזרנו אחורה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — news/promotion
**Presentation:** promotion fixed; someone who kept going appears.  
**Scene/art:** REUSE kiosk/home  
**Player verb(s):** approach/avoid.  
**Required options (2):** `approach` · `avoid`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** personal return question.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — changed Bloomfield world
**Presentation:** gates/cranes/return depending chapter time.  
**Scene/art:** ADAPT Bloomfield construction/reopening lifecycle already supported  
**Player verb(s):** walk/notice.  
**Required options (2):** `walk` · `notice`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** world changed.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — re-entry choice
**Presentation:** buy/attend/meet/keep distance.  
**Scene/art:** REUSE street  
**Player verb(s):** commit one step.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no instant reset of relationships.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: Use existing Bloomfield lifecycle/rebuilt repaint; do not create redundant background.

## 47. A01–A03 · 2019-armchair — השלט אצל אבא
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — home
**Presentation:** remote, food, family/work benefits visible.  
**Scene/art:** REUSE parents/homeAdult  
**Player verb(s):** choose to stay without shame.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** legitimate comfort.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — match from home
**Presentation:** chat/call interrupts; can focus or multitask.  
**Scene/art:** REUSE TV overlay  
**Player verb(s):** watch / help household / work.  
**Required options (3):** `watch` · `help household` · `work`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** benefit-cost tradeoff.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — after
**Presentation:** terrace group photo arrives; you also completed something personal.  
**Scene/art:** REUSE home  
**Player verb(s):** respond/share/ignore.  
**Required options (3):** `respond` · `share` · `ignore`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no 'bad fan' judgement.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop; stronger TV/photo UI.

## 48. R03 · 2021-losses — הפסד שלא צריך שיעור
**Choice budget:** 2–3 meaningful responses; no fake success/fail.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — home viewing setup
**Presentation:** COVID-era/life context; person or solitude according to state.  
**Scene/art:** REUSE homeAdult  
**Player verb(s):** set who/where.  
**Required options (2):** `set who` · `where`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** personal framing.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — loss
**Presentation:** fixed result; no trivia.  
**Scene/art:** REUSE TV/film  
**Player verb(s):** watch/turn off early/stay.  
**Required options (3):** `watch` · `turn off early` · `stay`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** agency in coping.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — call
**Presentation:** someone calls, or Pogi calls first.  
**Scene/art:** REUSE same  
**Player verb(s):** answer/decline.  
**Required options (2):** `answer` · `decline`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** relationship memory.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new full art.

## 49. L07–L09 · 2021-promises — אמרת שתחזור
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — home promise returns
**Presentation:** old calendar/diary cue.  
**Scene/art:** REUSE homeAdult  
**Player verb(s):** someone cites exact promise.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** callback clarity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — with-child route
**Presentation:** first-match logistics and child's pace.  
**Scene/art:** REUSE home/street/venue  
**Player verb(s):** let child lead / rush / leave early.  
**Required options (3):** `let child lead` · `rush` · `leave early`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** parenthood is gameplay.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2b — no-child route
**Presentation:** equally dense promise to partner/family/work/person.  
**Scene/art:** REUSE home/street  
**Player verb(s):** show up / renegotiate / break.  
**Required options (3):** `show up` · `renegotiate` · `break`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** content parity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — evening
**Presentation:** memory closes differently, same weight.  
**Scene/art:** REUSE home  
**Player verb(s):** respond.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no 'missing family ending'.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT child-height staging; no new backdrop unless current venue cannot stage child safely.

## 50. X01 · 2021-suitcase — מה נכנס למזוודה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — bedroom/homeAdult
**Presentation:** objects placed around room, suitcase open.  
**Scene/art:** REUSE home  
**Player verb(s):** choose 2 emotional items + practical auto-filled.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** tactile nostalgia.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — Red Box
**Presentation:** items from 1983–2010 compete for slots.  
**Scene/art:** REUSE RedBoxSheet  
**Player verb(s):** take/leave.  
**Required options (2):** `take` · `leave`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** loss is meaningful.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — door
**Presentation:** person arrives/calls before departure.  
**Scene/art:** REUSE home doorway  
**Player verb(s):** say goodbye / promise.  
**Required options (2):** `say goodbye` · `promise`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** transition.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW suitcase overlay/prop; no backdrop.

## 51. Z01 · 2023-tournament — הילדים על הקו
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — pitchSmall
**Presentation:** kids/old friends, 2000 team-name callback.  
**Scene/art:** REUSE pitchSmall  
**Player verb(s):** organize/coach/watch.  
**Required options (3):** `organize` · `coach` · `watch`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** generational fun.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — ownership news enters
**Presentation:** conversation happens around practical event.  
**Scene/art:** REUSE sideline + phone/newspaper  
**Player verb(s):** verify/ask/ignore until later.  
**Required options (3):** `verify` · `ask` · `ignore until later`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** history enters life naturally.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — tournament moment
**Presentation:** one short player+ball decision involving kids.  
**Scene/art:** REUSE Gate 5 movement system  
**Player verb(s):** choose instruction/pass.  
**Required options (2):** `choose instruction` · `pass`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** gameplay.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — bench
**Presentation:** ownership question unresolved but thread seeded.  
**Scene/art:** REUSE pitch  
**Player verb(s):** talk.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no fact board yet.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop.

## 52. X02–X03 · 2023-abroad — אצלכם כבר התחיל
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — flat abroad
**Presentation:** Kobi video call, timezone cues, different window/city ambience.  
**Scene/art:** REUSE flat-abroad  
**Player verb(s):** answer/set stream.  
**Required options (2):** `answer` · `set stream`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** distance physical.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — derby viewing
**Presentation:** lag/notifications/door conflict.  
**Scene/art:** REUSE same + TV  
**Player verb(s):** mute phone / open door / keep watching.  
**Required options (3):** `mute phone` · `open door` · `keep watching`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** small friction.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — Alex at door
**Presentation:** visitor has own need.  
**Scene/art:** REUSE same  
**Player verb(s):** invite/ask to wait/leave stream.  
**Required options (3):** `invite` · `ask to wait` · `leave stream`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** life outside Hapoel exists.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT flat window/night ambience; no new backdrop.

## 53. Z04–Z05 · 2023-quiet — אין משימה לזה
**Choice budget:** 2–3 meaningful responses; no fake success/fail.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — ordinary day
**Presentation:** no objective text; one normal task underway.  
**Scene/art:** REUSE home/work/street based on life  
**Player verb(s):** do normal action.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** contrast.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — relegation reaches you
**Presentation:** 11.5.2024 result arrives.  
**Scene/art:** REUSE location + phone/radio  
**Player verb(s):** one action only: call/leave/go silent/finish work.  
**Required options (4):** `one action only: call` · `leave` · `go silent` · `finish work`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no gamified tragedy.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — where were you card
**Presentation:** records stadium/home/work/abroad/etc.  
**Scene/art:** NEW minimal memory card over current scene  
**Player verb(s):** confirm by natural state, not menu if known.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** personal history.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — silence
**Presentation:** NPC may sit/leave.  
**Scene/art:** REUSE scene, HUD minimal  
**Player verb(s):** walk to exit or transition auto after meaningful beat.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** no dead wandering.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop; memory-overlay only.

## 54. X04 · 2023-visit — יש לך יומיים, לא עשור
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — kiosk arrival
**Presentation:** 4 people/3 places show via messages and world, 48h visible.  
**Scene/art:** REUSE kiosk  
**Player verb(s):** choose first two commitments.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. start pressure only after control is handed to the player; make remaining time legible in-world/HUD.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** scarcity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — chosen place 1
**Presentation:** someone changed while away.  
**Scene/art:** REUSE existing location  
**Player verb(s):** play concrete task.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** reconnection.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — chosen place 2
**Presentation:** second payoff.  
**Scene/art:** REUSE existing location  
**Player verb(s):** act.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** can't see everyone.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — departure
**Presentation:** unseen person may send message.  
**Scene/art:** REUSE route/transit  
**Player verb(s):** reply/leave.  
**Required options (2):** `reply` · `leave`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** cost of distance.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop; 48h compact timeline UI.

## 55. T03 · 2024-terrace — היום אני עוזר לך
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Gate 5 modern
**Presentation:** people from T02 are competent now.  
**Scene/art:** REUSE STAND_NEW/gate5 repaint  
**Player verb(s):** arrive and see work already moving.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** payoff.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — problem
**Presentation:** one issue occurs; younger person proposes solution first.  
**Scene/art:** REUSE same  
**Player verb(s):** intervene / back them / take smaller role.  
**Required options (3):** `intervene` · `back them` · `take smaller role`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** ego vs relief.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — handoff echo
**Presentation:** Asaf/Yevgeny line callback through action.  
**Scene/art:** REUSE same  
**Player verb(s):** help physically.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** leadership maturity.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: ADAPT modern Gate 5 dressing; no new geometry.

## 56. I04 · 2024-lina — international callback
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — call/meeting
**Presentation:** Lina returns around concrete home/ownership discussion, not floating cameo.  
**Scene/art:** REUSE Allenby or flat/home  
**Player verb(s):** meet/answer.  
**Required options (2):** `meet` · `answer`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** thread reconnect.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — practical need
**Presentation:** translation/contact/ticket/visitor plan overlaps with Pogi's local obligation.  
**Scene/art:** REUSE street/kiosk  
**Player verb(s):** help/delegate/refuse.  
**Required options (3):** `help` · `delegate` · `refuse`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** meaningful choice.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — perspective
**Presentation:** conversation about 'home' follows what happened.  
**Scene/art:** REUSE same  
**Player verb(s):** talk.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** feeds 2024-home rather than detour.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop; integrate with existing 2024 locations.

## 57. H24 · 2024-home — איפה הבית?
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Safra / football ownership
**Presentation:** fact board is physical newspaper/phone cluster; statuses rumor→announced→signed→approved.  
**Scene/art:** REUSE kiosk  
**Player verb(s):** inspect only needed pieces; wrong answer doesn't fail.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** knowledge with purpose.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — Drive-In meeting
**Presentation:** fictional owners representative; supporters around room.  
**Scene/art:** REUSE hall-new/community-room  
**Player verb(s):** ask/leave/record stance.  
**Required options (3):** `ask` · `leave` · `record stance`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** real people don't deliver invented dialogue.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — ticket transfer decision
**Presentation:** transfer / don't / wait for arbitrator; clear consequences.  
**Scene/art:** REUSE home + NEW ticket decision sheet  
**Player verb(s):** commit.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** community conflict with no game-declared winner.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — Menora ride
**Presentation:** old first-shirt/Kobi callbacks can appear.  
**Scene/art:** REUSE bus/transit + NEW/ADAPT Menora exterior/large-hall if absent  
**Player verb(s):** ride/arrive.  
**Required options (2):** `ride` · `arrive`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** scale change must be visible.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S5 — first night
**Presentation:** seat scale, sound, distance from court.  
**Scene/art:** NEW/ADAPT large modern basketball arena if current hall-new cannot credibly become Menora  
**Player verb(s):** find seat / look for familiar faces / sit.  
**Required options (3):** `find seat` · `look for familiar faces` · `sit`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** question 'is this home?' is visual.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW likely required: Menora-scale arena interior/exterior. CRITICAL: fix swallowed-click race, never require 900ms user wait.

## 58. Z06–Z07 · 2025-eurocup — מהאולם הקטן לאירופה
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — home/stream/travel setup
**Presentation:** basketball EuroCup run arrives with football promotion context.  
**Scene/art:** REUSE home/arena  
**Player verb(s):** choose who to share moment with.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** avoid dual-montage overload.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — final beat
**Presentation:** history fixed.  
**Scene/art:** REUSE large arena/film/TV according to presence  
**Player verb(s):** react/call.  
**Required options (2):** `react` · `call`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** triumph.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — personal collision
**Presentation:** celebration overlaps promise/work/family.  
**Scene/art:** REUSE home/phone  
**Player verb(s):** postpone/keep/renegotiate.  
**Required options (3):** `postpone` · `keep` · `renegotiate`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** victory costs time too.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — football return echo
**Presentation:** short, not another full climax.  
**Scene/art:** REUSE Bloomfield rebuilt/kiosk  
**Player verb(s):** one action.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** balances sports.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: Reuse 2024 large-arena asset; no second new arena.

## 59. J03 · 2025-interview — פעם אחת שואלים אותך
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — Allenby/interview desk
**Presentation:** fictional interviewer/representative; recorder/evidence visible.  
**Scene/art:** REUSE allenby/office  
**Player verb(s):** prepare 3 questions.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** 2002 mechanic returns.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — live interview
**Presentation:** FACT/HEARD/OPINION cards can be used to follow up.  
**Scene/art:** REUSE same + evidence UI  
**Player verb(s):** ask/press/drop.  
**Required options (3):** `ask` · `press` · `drop`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** professional challenge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — publish/after
**Presentation:** what he asks matters more than access.  
**Scene/art:** REUSE desk  
**Player verb(s):** choose headline/withhold.  
**Required options (2):** `choose headline` · `withhold`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** apex callback.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop.

## 60. OWNER · 2025-owner — המספר שלא כתוב על חולצה
**Choice budget:** 3–4 strategic approaches, but only 1–2 can be completed before the pressure closes.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — office
**Presentation:** budget, supporter rep, family/work message all present.  
**Scene/art:** REUSE office  
**Player verb(s):** inspect constraints.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** hard mode framing.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — impossible triangle
**Presentation:** money / sporting need / trust; cannot max all.  
**Scene/art:** NEW management board UI over office  
**Player verb(s):** allocate/commit.  
**Required options (2):** `allocate` · `commit`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** strategy challenge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — human meeting
**Presentation:** fictional roles react.  
**Scene/art:** REUSE office/community-room  
**Player verb(s):** negotiate/delegate.  
**Required options (2):** `negotiate` · `delegate`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** money does not solve trust.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — leave office
**Presentation:** personal cost arrives.  
**Scene/art:** REUSE street  
**Player verb(s):** accept/call.  
**Required options (2):** `accept` · `call`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** route remains life, not tycoon sim.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new full backdrop; new board UI.

## 61. X05 · 2025-abroad — הפעם אני מחכה לך
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — flat abroad
**Presentation:** invitation for 2026, suitcase memory nearby.  
**Scene/art:** REUSE flat-abroad  
**Player verb(s):** answer.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** callback.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — planning friction
**Presentation:** leave/money/work/Kobi conflict.  
**Scene/art:** REUSE calendar/budget UI  
**Player verb(s):** make concrete commitment or don't.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** promise has cost.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — window/quiet
**Presentation:** if committed, item from X01 comes out.  
**Scene/art:** REUSE flat  
**Player verb(s):** pack/set aside.  
**Required options (2):** `pack` · `set aside`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** emotional preparation.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new art.

## 62. F00–F01 · 2026-plan — לא מבטיחים לפני שסוגרים
**Choice budget:** 2–4 meaningful approaches across the chapter; at least two must change cost/state, not just dialogue.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — kiosk planning
**Presentation:** Kobi/travel plan; finances/work/family all read from life.  
**Scene/art:** REUSE kiosk  
**Player verb(s):** identify blockers.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** systems converge.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — plan board
**Presentation:** ticket/leave/meeting/reunion depending route.  
**Scene/art:** REUSE calendar + travel budget UI  
**Player verb(s):** solve blockers in any order.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** player's past matters.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — promise
**Presentation:** only after feasible plan can Pogi promise.  
**Scene/art:** REUSE street/home  
**Player verb(s):** call Kobi / don't yet.  
**Required options (2):** `call Kobi` · `don't yet`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** earned promise.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: No new backdrop; combine existing UIs.

## 63. F02–F04 · 2026-finale — היום אתה אחריי
**Choice budget:** 2–3 meaningful responses; no fake success/fail.  
**Chapter exit rule:** after the final meaningful consequence is seen, close/advance automatically or expose one unmistakable exit. Never require roaming for a hidden completion flag.

### S1 — bus station dawn
**Presentation:** Kobi now follows Pogi. suitcase/items visible.  
**Scene/art:** REUSE bus-station if existing; ADAPT dawn departure  
**Player verb(s):** check on Kobi, board bus.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** 1983 inversion starts visually.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S2 — travel
**Presentation:** small father-son interactions based on history.  
**Scene/art:** REUSE transit/bus  
**Player verb(s):** seat/help/tease/silence.  
**Required options (4):** `seat` · `help` · `tease` · `silence`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** warm gameplay.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S3 — Bulgaria arrival
**Presentation:** foreign signs, small trip friction.  
**Scene/art:** NEW if absent: one Botevgrad exterior/arena arrival, not whole city  
**Player verb(s):** navigate/meet reunion if earned.  
**Required options (2):** `navigate` · `meet reunion if earned`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** sense of journey.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S4 — event
**Presentation:** historical result is card/film, not win condition.  
**Scene/art:** REUSE/ADAPT arena  
**Player verb(s):** be present.  
**Required options:** if this is a direct action, give 1 primary verb + 1 optional context verb; if it is a choice, expose 2–3 mechanically different approaches.  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** personal story dominates.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

### S5 — final walk
**Presentation:** callbacks: shoulders, shirt, Ussishkin, promise, child/no-child, work, route.  
**Scene/art:** REUSE exterior/transit  
**Player verb(s):** choose final personal response/action.  
**Required options (2):** `choose final personal response` · `action`  
**Implementation sequence:**  
1. `enter`: stage actors/props first; wait ~300–700ms only for visual orientation, not for gameplay gating.  
2. expose the primary hotspot/actor/exit in the world; do not open a menu before the player sees the scene.  
3. keep time pressure off unless the scene explicitly earns it; challenge comes from choice/observation/social consequence.  
4. on commit, raise a dedicated state flag/event immediately before any long animation/cutscene.  
5. reflect the choice visually in the same scene whenever possible before transition.  
6. close with Beat `travel` / `ending` / next dialogue / auto-advance; never leave the player after the content is exhausted.  
**Fun/pressure target:** last line belongs to Kobi/Pogi, not trophy stats.  
**Fail-forward:** leaving early, missing timing, refusing, or doing nothing must resolve to a named alternate state and a short reaction—not a softlock.  
**QA:** fresh save; fast tap; stand still 20s; wrong exit; low money if relevant; no special route; replay from checkpoint.

#### Chapter implementation checklist
- [ ] At least one choice writes a persistent `life:` flag/event consumed later.
- [ ] At least one non-chosen/late path has bespoke reaction content.
- [ ] Regular-supporter path gets a complete scene, not a fallback summary.
- [ ] Route variants change actor/task/location/cost where relevant, not only text.
- [ ] History/result cannot be changed by player action.
- [ ] One visible consequence appears before chapter close.
- [ ] No passive wait after all meaningful actions are done.
- [ ] Mobile touch path tested at rapid input speed.
- [ ] Art dependency: NEW: Botevgrad arrival/arena exterior if absent; this finale deserves bespoke art.

---

# 3. ROUTE PARITY PASS — mandatory after chapter implementation

Run the same life through:
- Regular supporter
- Supporter leader / Ultras
- Basketball founder
- Journalist / international
- Owner
- Abroad / distance / return
- Parent
- No-child
- Work-first
- Relationship-first
- Low money
- High money
- Broken promises

For every route export a table:
`chapter | meaningful actions | unique screen | unique consequence | callback written | minutes active`.

**Failure condition:** any route repeatedly receives “same scene + two different lines” while another route receives mechanics/locations.

---

# 4. EXPERIENCE QA — not optional

For each chapter record screen video and answer:
1. What is the first thing the eye sees?
2. What is the first thing the hand can do?
3. Is there a decision before exposition exceeds ~20 seconds?
4. Is the challenge different from the previous chapter?
5. Does the world react before the ending card?
6. Can the player understand why a door/action is blocked?
7. Can the player miss content without breaking progression?
8. Does the next chapter start with a visually different image/energy?

A chapter that passes tests but is boring **fails this pass**.

---

# 5. DONE = playable, varied, emotionally legible

Do not mark a chapter DONE because:
- flags exist;
- dialogue exists;
- the ending card fires;
- a test proves no dead-end.

Mark it DONE only when:
- the player performs meaningful verbs;
- at least one choice costs something;
- not doing something also produces content;
- another person acts without waiting for Pogi;
- the environment changes in response;
- mobile interaction feels intentional;
- the chapter has a distinct rhythm from the chapters around it.
