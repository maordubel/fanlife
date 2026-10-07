# FAN LIFE — PROJECT BIBLE
## תנ״ך הפרויקט · Source of Truth
**גרסה:** 1.0  
**תאריך:** 30.09.2026  
**בעלים:** Dubel Team  
**סטטוס:** Active Architecture & Execution Plan

---

# 0. מטרת המסמך

זהו מסמך ה־**Source of Truth** של Fan Life.

מטרתו למנוע סטיות, כפילויות, החלטות חוזרות וריפקטורים מיותרים.  
כל פיתוח חדש, מיגרציה, מחקר, חבילת מועדון, שער, מסך אדמין או שינוי ארכיטקטוני חייב להתאים למסמך זה.

אם קיימת סתירה בין מסמך ישן, prototype, README ישן או החלטה קודמת — **המסמך הזה גובר**, אלא אם נכתבה החלטה חדשה מפורשת.

---

# 1. מהו Fan Life

Fan Life הוא מנוע משחק והיסטוריה רב־מועדוני.

המטרה:

> **מנוע אחד, חוויה אחת, מספר בלתי מוגבל של מועדונים — כאשר מועדון הוא DATA ולא CODE.**

כל מועדון מקבל:

- זהות חזותית משלו
- שפה וכיוון כתיבה
- היסטוריה מאומתת
- שחקנים
- משחקים
- חולצות
- תארים
- אצטדיונים
- יריבויות
- תרבות אוהדים
- שערי משחק
- ארכיון
- ציר זמן
- LIFE

Fan Life אינו Fork של 14 משחקים שונים.

הוא:

```text
ONE ENGINE
ONE CODEBASE
ONE DEPLOYMENT
ONE DATABASE
MANY CLUB PACKS
```

---

# 2. היחס ל־The Worker

## The Worker נשאר מוצר עצמאי

The Worker:

- נשאר בריפו עצמאי
- נשאר ב־Vercel עצמאי
- ממשיך להתפתח כמוצר עצמאי
- אינו הופך ל־branch של Fan Life
- Fan Life אינו משנה אותו ישירות

## Fan Life כן משתמש במה שכבר נבנה

Fan Life נולד מתוך The Worker ולכן רשאי להשתמש ב:

- מנועי המשחקים
- מודלי הנתונים
- מנוע LIFE
- מערכות QA
- ידע היסטורי
- תשתיות ingestion
- Design patterns
- assets מותרים
- fixtures
- tests
- adapters

אבל:

> אין תלות אוטומטית בזמן ריצה בין הפרויקטים.

שינויים מ־The Worker נכנסים ל־Fan Life רק דרך תהליך יזום ומבוקר.

---

# 3. מצב הפרויקט הנוכחי

Fan Life כבר אינו רק תכנון.

קיימים כיום:

- Repository עצמאי: `maordubel/fanlife`
- Master portal
- Admin
- Test Lab
- 14-club Registry
- Host → Club middleware
- `/ground` עבור חוויית Hapoel המקורית
- Hapoel club hub
- Zrinjski research pack
- Research queue
- Wikipedia/Wikidata research flow
- local evaluation DB
- The Worker engine/content imported
- Upstream update tooling
- QA / typecheck / build / test infrastructure

### הפער המרכזי

ה־Portal יודע לזהות מועדון.

המנוע עצמו עדיין נושא הנחות רבות של Hapoel Tel Aviv.

לכן המשימה הקריטית ביותר היא:

> **להפריד בין מנוע המשחקים לבין נתוני הפועל.**

---

# 4. חוק העל של הארכיטקטורה

## שום Gate לא מכיר מועדון ספציפי

אסור לקוד משותף לכתוב:

```ts
import hapoelPlayers from ...
```

אסור:

```ts
if (club === 'hapoel-tel-aviv') ...
```

אלא אם מדובר ב־Adapter מוגדר או ב־exception מתועד.

כל Gate חייב לקבל מידע דרך contract אחיד:

```text
Request
  ↓
Club Resolver
  ↓
ClubData
  ↓
Gate / LIFE / Archive / UI
```

---

# 5. ארכיטקטורת יעד

```text
fanlife.dubelteam.com
│
├── Portal
│
├── Admin
│
└── <club>.fanlife.dubelteam.com
      │
      ▼
   Middleware
      │
      ▼
 Club Resolver
      │
      ▼
 ClubData Provider
      │
 ┌────┴───────────────┐
 ▼                    ▼
Compiled Club Pack    Legacy/Native Adapter
 ▼                    ▼
        Unified ClubData
              │
              ▼
        Shared Game Engine
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
    Gates   Archive   LIFE
```

---

# 6. Deployment

## החלטה נעולה

**פריסה אחת לכל Fan Life.**

לא:

- Vercel נפרד לכל מועדון
- Build נפרד לכל מועדון
- Repository נפרד לכל מועדון

כן:

- GitHub אחד
- Vercel אחד
- domain אחד
- wildcard subdomains
- middleware אחד
- registry אחד

דוגמאות:

```text
fanlife.dubelteam.com
hapoeltelaviv.fanlife.dubelteam.com
zrinjski.fanlife.dubelteam.com
olympiacos.fanlife.dubelteam.com
atalanta.fanlife.dubelteam.com
```

Unknown subdomain:

```text
→ neutral portal
```

לא מנחשים מועדון.

---

# 7. Registry

Registry הוא רשימת המועדונים המורשים.

הוא כולל לכל מועדון לפחות:

```ts
id
subdomain
displayName
city
country
initials
primaryColor
wave
pack
status
```

### חוק

אין לוגיקה המבוססת על:

```ts
clubCount === 14
```

המערכת חייבת להיות מוכנה ל־15, 30 או 100 מועדונים בלי שינוי מבני.

---

# 8. ClubData Contract

זהו החלק הקריטי ביותר של M1.

יש להגדיר interface אחד שממנו כל המערכת קוראת.

דוגמה רעיונית:

```ts
interface ClubData {
  identity
  locales
  theme
  rivals
  competitions
  seasons
  players
  matches
  trophies
  kits
  stadiums
  places
  culture
  archive
  timeline
  gates
  life
  sources
  readiness
}
```

לא כל מועדון חייב למלא כל field.

החסר הוא מצב תקין.

---

# 9. Hapoel Adapter

הפועל לא עוברת מחקר מחדש.

אבל היא **כן חייבת לעבור דרך אותו ClubData contract**.

מבנה:

```text
Existing The Worker Data
        ↓
Hapoel Adapter
        ↓
ClubData
        ↓
Fan Life Engine
```

המטרה:

> Gate לא יודע אם המידע הגיע מ־JSON חדש, Supabase, The Worker legacy data או Pack Compiler.

הפועל היא:

> **Golden Reference Club**

כל feature חדש נבדק לפחות מולה.

---

# 10. Club Pack

מועדון חדש הוא Data Package.

מבנה יעד מוצע:

```text
club-packs/
  <club-id>/
    manifest.json
    identity.json
    rivals.json
    competitions.json
    seasons.json
    players.json
    matches.json
    trophies.json
    stadiums.json
    places.json
    kits.json
    culture.json
    archive/
    timeline/
    gates/
    life/
    sources/
    research-gaps.json
```

חבילה יכולה להיות חלקית.

היא חייבת לעבור compiler ו־validation לפני שהיא playable.

---

# 11. Pack Compiler

תפקיד ה־Compiler:

1. לקרוא Club Pack
2. לבצע schema validation
3. לנרמל identifiers
4. לנרמל מספרים
5. לנרמל confidence
6. לבדוק referential integrity
7. לבדוק sources
8. לבדוק contradictions
9. לחשב readiness
10. להפיק `ClubData`

### חוק

המנוע לא צריך להבין פורמטים גולמיים.

רק compiler/adapters עושים normalization.

---

# 12. שכבות הידע

לכל מועדון שלוש שכבות.

## Layer 1 — Historical Data

כולל:

- players
- matches
- seasons
- trophies
- lineups
- stadiums
- kits
- competitions
- transfers כאשר רלוונטי

## Layer 2 — Culture

כולל:

- rivalries
- supporter groups
- songs metadata
- traditions
- neighborhoods
- meeting points
- stadium rituals
- symbols
- fan terminology

## Layer 3 — LIFE

כולל:

- historical anchors
- eras
- places
- cultural behaviors
- family context
- local routines
- national context
- club-specific narrative material

---

# 13. אמת, מקורות וביטחון

## כלל יסוד

> לא ממציאים.

אם מידע לא קיים:

```text
unknown
```

לא:

```text
educated guess
```

## כל Fact מכיל

```text
value
sources[]
confidence
status
researchedAt
approvedAt
approvedBy
notes
```

## Confidence

```text
0 = unknown / unsupported
1 = weak / single uncertain source
2 = supported
3 = strongly verified
```

## Status

```text
draft
review
approved
rejected
deep_research
```

### Gameplay Rule

רק:

```text
status === approved
AND confidence >= 2
```

רשאי להזין Game Generator.

---

# 14. Source Ledger

כל עובדה היסטורית חשובה וכל asset משמעותי חייבים מקור.

Source כולל:

```text
source_id
url
publisher
title
retrieved_at
source_type
reliability
blocked
blocked_reason
notes
```

אם אתר חוסם automation:

- לא עוקפים בכוח
- מסמנים blocked
- ניתן לבצע human browser research
- העובדה אינה הופכת למאומתת רק כי “ידוע שזה נכון”

---

# 15. התאמת שמות

אסור fuzzy matching אוטומטי עבור canonical identities.

נכון:

```text
alias table
```

לדוגמה:

```text
"PAOK FC"
"PAOK Thessaloniki"
"Π.Α.Ο.Κ."
→ paok
```

לא:

```text
stringSimilarity > 0.82
```

שמות שאינם מזוהים עוברים review.

---

# 16. Database

## החלטה

Supabase אחד.

לא DB נפרד לכל מועדון.

כל טבלה שהיא club-owned מקבלת:

```text
club_id
```

## חובה

- foreign keys נכונים
- indexes שמתחילים ב־club_id במקומות רלוונטיים
- RLS
- tenant isolation tests
- audit logging
- server-derived club context

## אסור

לקבל `club_id` מהלקוח ולסמוך עליו.

השרת קובע tenant מתוך host / session / trusted route context.

---

# 17. Tenant Isolation

יש להוסיף test suite קבוע:

```text
Club A cannot read Club B
Club A cannot update Club B
Club A cannot delete Club B
Club A cannot join into Club B records
Club A cannot call an RPC that leaks Club B
```

הבדיקות חייבות לכלול:

- direct selects
- joins
- RPC
- storage metadata
- achievements
- user progress
- multiplayer
- admin-scoped actions

---

# 18. User Account

חשבון אחד לכל Fan Life.

המשתמש יכול לעבור בין מועדונים בלי לפתוח חשבון חדש.

החשבון כולל:

```text
user
club memberships / preferences
progress per club
achievements per club
global achievements
identity / anonymity settings
```

אין להניח שהמשתמש “שייך” למועדון אחד בלבד.

---

# 19. Internationalization

## English היא שפת בסיס טכנית

לא hardcode עברית בתוך Gate.

כל string צריך לעבור i18n.

### Locale layers

```text
UI language
Club default language
Content source language
```

הם לא בהכרח זהים.

## תמיכה נדרשת

- Hebrew
- English
- Greek
- Croatian/Bosnian/Serbian Latin
- Cyrillic readiness
- German
- Italian

## Direction

```text
rtl / ltr
```

נגזר מ־locale ולא מהמועדון באופן קשיח.

---

# 20. Theme System

כל מועדון מגדיר:

```text
primary
secondary
background
surface
text
muted
accent
rivalForbiddenColors
fonts
patterns
```

אין CSS קשיח של Hapoel במנוע הכללי.

---

# 21. חוק הצבע היריב

## כלל

Forbidden Color:

```text
Main Rival Identity Colors
MINUS
Club Identity Colors
```

אם לא נשאר צבע:

```text
no forbidden color
```

## פטור היסטורי

נכס אמיתי יכול להציג צבע אסור אם:

- הוא היסטורי
- הוא מתועד
- יש provenance/source
- מדובר בצילום/חולצה/סמל/מסמך/ספונסר אמיתי

## בדיקות

נדרש scanner אוטומטי שמזהה שימוש בעייתי בצבע אסור בממשק.

---

# 22. Rivalry

לכל מועדון יכולה להיות:

```text
primaryRival
secondaryRivals[]
```

אבל Gate “Derby” דורש primary rival מאושר.

Rivalry היא Category C:

> לא מאושרת אוטומטית.

דורשת human approval.

---

# 23. Gate Readiness

כל Gate מקבל readiness.

```text
READY
PARTIAL
LOCKED
HIDDEN
```

## אסור

להציג Gate שבור.

## דוגמה

```text
Trivia:
needs 60 approved questions

All-Time XI:
needs X verified players by position

Historic Lineup:
needs N full lineups

Kit Builder:
needs verified visual kit metadata

Derby:
needs approved rival + enough derby matches
```

Readiness מחושב אוטומטית.

---

# 24. Gate Migration Strategy

לא ממירים 13 Gates יחד.

סדר:

1. לבחור Gate פשוט
2. להעביר אותו ל־ClubData
3. להריץ על Hapoel
4. להריץ על Zrinjski
5. להריץ על Olympiacos
6. לפתור assumptions
7. לקבע pattern
8. לעבור Gate הבא

### שלושת Clubs של הארכיטקטורה

#### Hapoel Tel Aviv

- Hebrew
- RTL
- huge dataset
- hand-authored
- complex

#### Zrinjski

- sparse
- smaller dataset
- LTR
- verifies missing-data behavior

#### Olympiacos

- Greek
- richer history
- different alphabet
- non-Israeli football culture

אם Gate עובד נכון בשלושתם — הארכיטקטורה סבירה.

---

# 25. סדר התאמת Gates

## Wave A — Data-first

להתחיל עם:

- Timeline
- Archive
- All-Time XI
- Trivia

המטרה: לייצב ClubData.

## Wave B — Logic-heavy

- Blind Cow
- Royal Rumble
- Polls
- Memory

## Wave C — Asset-heavy

- Kit Builder
- Kit Collection
- Historic Match Lineup
- Goal Reconstruction
- Derby

אלה דורשים תוכן ידני ועבודת asset רבה יותר.

---

# 26. LIFE — עקרון

מנוע LIFE משותף.

תוכן LIFE אינו משותף באופן שטוח.

אסור ליצור:

```text
generic football life template
+
club name replacement
```

זה ירגיש מלאכותי.

---

# 27. LIFE — שלוש שכבות

כל Beat מורכב מ:

```text
Universal Human Beat
        +
Club Culture Variant
        +
Historical Anchor
```

### דוגמה

Universal:

```text
First match with father
```

Culture:

```text
איך מגיעים
מה אוכלים
מה שרים
מי יושב איפה
מה אומרים אחרי הפסד
איך נראית השכונה
```

Historical Anchor:

```text
actual date
actual opponent
actual stadium
actual score
actual event
```

---

# 28. LIFE DNA

לכל מועדון יש `life/culture-dna`.

כולל לדוגמה:

```text
family football culture
matchday transport
food
neighborhoods
ticket culture
stadium geography
supporter language
rival weeks
away travel
economic context
national service / education context
club crises
celebration rituals
defeat rituals
media habits by era
```

זה מה שמונע LIFE גנרי.

---

# 29. LIFE Activation Threshold

LIFE של מועדון חדש לא נפתח רק כי קיימים שמונה events.

נדרש מינימום של:

- historical anchors
- culture DNA
- valid eras
- places
- club identity
- functioning chapter
- no-dead-end test
- source coverage

ניתן להתחיל בסף ראשוני של 8 anchors, אבל הוא אינו מספיק לבדו.

---

# 30. Hapoel LIFE

Hapoel LIFE נשאר hand-authored.

לא “מנרמלים” אותו לתבנית גנרית.

כן:

- עוטפים אותו ב־adapter
- מפרידים engine/content
- מגדירים contracts
- משתמשים בו כ־Gold Standard

---

# 31. Research Pipeline

```text
Source Discovery
      ↓
Fetch
      ↓
Raw Evidence
      ↓
Normalization
      ↓
Canonical Mapping
      ↓
Cross-check
      ↓
Conflict Detection
      ↓
Proposal
      ↓
Human Review
      ↓
Approved Fact
      ↓
Compiler
      ↓
Gameplay
```

---

# 32. סוגי מחקר

## A — Automatic Safe

לדוגמה:

- dates
- scores
- competition names
- player birth dates
- stadium capacities כאשר קיימים מקורות טובים

## B — Suggested

דורש review:

- conflicting facts
- uncertain seasons
- kit metadata
- aliases
- incomplete lineup

## C — Owner Only

כולל:

- rivalries
- supporter groups
- sensitive claims about real people
- controversial history
- satire involving real people
- usage rights
- derogatory/hostile cultural content

---

# 33. Admin Philosophy

האדמין אינו Excel.

הוא:

> **Decision Console**

אסור להציג מאות rows ללא הקשר.

כל Review Card צריך לענות:

```text
מה מוצע?
מה המקורות?
למה אנחנו חושבים שזה נכון?
יש סתירה?
מה confidence?
מה ייפתח אם נאשר?
מה הסיכון?
```

---

# 34. Approval Queue

עדיפות לפי Impact.

דוגמה:

```text
Approve 12 facts
→ Trivia readiness 72% → 94%
```

עדיף על:

```text
12 records created at 08:32
```

Sort priority:

```text
1. Blocks production
2. Unlocks Gate
3. Conflict
4. High-value history
5. Asset rights
6. Routine facts
```

---

# 35. Bulk Approval

Bulk approve מותר רק כאשר:

- 2 independent sources
- no conflict
- confidence high
- parser certainty high
- schema valid
- not sensitive
- not rivalry/culture
- not real-person allegation
- not rights decision

אחרת:

```text
manual review
```

---

# 36. Audit Log

כל שינוי משמעותי נשמר.

```text
who
what
before
after
when
source
reason
```

כל approval ניתן ל־rollback.

---

# 37. Health Checks

האדמין צריך לזהות:

- dead source
- changed source
- contradiction
- orphan fact
- missing reference
- empty Gate
- falling readiness
- stale research
- duplicate identity
- illegal cross-club reference
- asset without rights
- forbidden color violation

---

# 38. Storage Strategy

## Git

רק:

- code
- schemas
- manifests
- small JSON fixtures
- docs
- tests

לא:

- מאות MB תמונות
- video
- heavy audio
- generated archives

## Supabase

- users
- progress
- facts
- approvals
- research metadata
- private metadata
- permissions

## Object Storage / CDN

Heavy public media:

- art
- photos
- videos
- audio
- kit images
- LIFE backgrounds

המימוש יכול להיות Supabase Storage או R2 בהתאם לעלות, אבל הממשק צריך להיות storage-agnostic.

---

# 39. Asset Manifest

כל asset מקבל:

```text
asset_id
club_id
type
url
hash
width
height
bytes
source
rights_status
historical_context
approved
```

---

# 40. Rights Ledger

זכויות הן data, לא הערה ידנית.

סטטוסים:

```text
owned
licensed
permission_granted
public_domain
fair_use_review
historical_reference_only
unknown
blocked
```

Production rule:

```text
unknown → cannot ship
```

אלא אם הוגדר exception מפורש ומאושר.

---

# 41. Logos

עד קבלת רשות:

- monogram
- initials
- abstract identity marks

אין להניח שזמינות לוגו באינטרנט = זכות שימוש.

---

# 42. Kit Photos

מותר לשמור metadata:

- colors
- sponsor
- manufacturer
- collar
- pattern
- season

תמונה עצמה דורשת rights status עצמאי.

---

# 43. Real People

עבור מידע על אדם אמיתי:

- facts בלבד כאשר מדובר במידע היסטורי
- מקור ברור
- הפרדה בין fact ל־storytelling
- טענות רגישות → Category C
- satire מסומן
- אין להציג speculation כעובדה

---

# 44. Performance

Fan Life אינו צריך לבצע מאות DB queries לכל page load.

מבנה מומלץ:

```text
Club Pack / DB
      ↓
Server Loader
      ↓
Normalized ClubData
      ↓
Cache
      ↓
Gate
```

נדרש:

- per-club cache
- versioned cache keys
- invalidation on approval/update
- compact payloads
- server-only access לנתונים שאינם נדרשים ללקוח

---

# 45. No Club Data Leakage

הלקוח לא מקבל dump של כל clubs.

ל־Club subdomain:

```text
deliver only needed club data
```

Portal רשאי לקבל registry-level summary בלבד.

---

# 46. Security

Production דורש:

- real authentication
- admin roles
- RLS
- server-side tenant resolution
- no evaluation admin mode
- secure secrets
- CSRF-safe mutations
- audit logs
- rate limits למחקר ו־admin operations

---

# 47. Evaluation Mode

Evaluation Mode הוא כלי פיתוח בלבד.

אסור production deployment שבו:

```text
every visitor = admin
```

לפני launch יש kill-switch ברור ל־evaluation mode.

---

# 48. Testing Philosophy

Fan Life חייב לשמור על תרבות בדיקות חזקה.

כל Feature רב־מועדוני נבדק לפחות ב:

```text
Hapoel
Zrinjski
Olympiacos
```

---

# 49. Test Categories

## Unit

- compiler
- adapters
- color rules
- readiness
- identity
- aliases

## Integration

- ClubData → Gate
- DB → ClubData
- Admin approval → Gameplay
- asset rights → render

## Security

- tenant isolation
- RLS
- admin roles

## Browser

- portal
- club subdomain
- RTL
- LTR
- mobile

## LIFE

- no dead ends
- no fake historical result
- anchors valid
- chapter complete

---

# 50. Golden Test

כל Gate צריך בדיקה דומה:

```text
same component
same route logic
same engine
different ClubData
```

אסור test שמריץ למעשה שלושה forks שונים.

---

# 51. CI

PR לא עובר אם נכשל:

```text
lint
typecheck
unit tests
integration tests
tenant tests
pack validation
source validation
asset provenance
forbidden-color scan
build
browser smoke
```

---

# 52. Upstream From The Worker

Fan Life רשאי לבדוק שינויים ב־The Worker.

אבל:

- לא auto-merge עיוור
- conflicts עוצרים
- architectural files דורשים review
- Fan Life-specific adapters אינם נדרסים

תהליך:

```text
detect
→ diff
→ classify
→ integrate
→ tests
→ PR
→ review
```

---

# 53. Shared Package — לא עכשיו

לא מוציאים מיד:

```text
@dubel/fanlife-engine
```

קודם מייצבים boundaries בתוך Fan Life.

מועמד עתידי:

```text
lib/fanlife-engine/
```

רק אחרי שה־APIs יציבים אפשר לחלץ package ששני הפרויקטים צורכים.

---

# 54. תיקיות יעד מומלצות

```text
lib/
  fanlife-engine/
  club/
  compiler/
  research/
  readiness/
  rights/
  i18n/
  theme/

club-packs/
content/
app/
components/
tests/
docs/
```

---

# 55. Milestone M0 — Freeze Decisions

## מטרה

לנעול ארכיטקטורה.

## משימות

- לאשר Project Bible
- להסיר מסמכים סותרים או לסמן deprecated
- לקבע Naming
- לקבע Registry
- לקבע deployment model
- לקבע DB model
- לקבע storage model

## Done

אין החלטה ארכיטקטונית בסיסית פתוחה.

---

# 56. Milestone M1 — TRUE MULTI-CLUB CORE

זהו השלב הבא והחשוב ביותר.

## משימות

1. להגדיר `ClubData`
2. לבנות server-side Club Resolver
3. לבנות `HapoelAdapter`
4. לבנות `PackCompiler`
5. לחבר Zrinjski
6. להוסיף Olympiacos minimal pack
7. לבחור Gate ראשון
8. להסיר ממנו Hapoel hardcoding
9. להפעיל אותו בשלושת Clubs
10. ליצור regression tests
11. למפות hardcoded imports שנותרו

## Done

אותו Gate עובד ללא fork ב:

```text
Hapoel
Zrinjski
Olympiacos
```

---

# 57. M1 Hard Rule

לא עוברים ל־M2 רק כי “רוב הדברים עובדים”.

נדרש להוכיח:

> Club switch משנה Data, לא Code.

---

# 58. Milestone M2 — Identity & Theme

## משימות

- theme contract
- fonts
- locale
- direction
- forbidden rival color
- historical asset exemptions
- visual scanner
- portal cards

## Done

שלושה מועדונים נראים שונים מתוך אותו UI engine.

---

# 59. Milestone M3 — Club Pack Standard

## משימות

- schema
- compiler
- validator
- version
- migrations
- source ledger integration
- readiness generation
- research gap generation

## Done

Club Pack חדש יכול להיכנס בלי שינוי engine.

---

# 60. Milestone M4 — Research & Admin

## משימות

- proposal cards
- evidence comparison
- impact score
- conflict queue
- bulk rules
- owner-only category
- audit log
- rollback
- health dashboard

## Done

עובדה חדשה עוברת:

```text
research
→ review
→ approval
→ compiler
→ Gate
```

ללא edit ידני בקוד.

---

# 61. Milestone M5 — Internationalization

## משימות

- extraction של Hebrew hardcoding
- English base strings
- Greek support
- RTL/LTR
- number/date formatting
- fonts
- pluralization
- club-specific terminology

## Done

אותו Gate מוצג נכון לפחות ב:

```text
Hebrew
English
Greek
```

ללא layout break.

---

# 62. Milestone M6 — Production Database

## משימות

- club_id migration
- RLS
- roles
- indexes
- composite FK where needed
- data migration
- user progress
- achievements
- tenant security tests

## Done

אין cross-club leak.

---

# 63. Milestone M7 — Media

## משימות

- object storage
- CDN
- asset manifest
- rights ledger
- lazy loading
- image optimization
- cache policy
- heavy asset removal from repo where possible

## Done

Build נשאר קל גם כשמוסיפים מועדון חדש.

---

# 64. Milestone M8 — Gate Migration

## משימות

להמיר את כל Gates ל־ClubData.

לכל Gate:

```text
requirements
readiness
fallback
tests
i18n
theme
rights
```

## Done

אין Gate שמייבא Hapoel data ישירות.

---

# 65. Milestone M9 — LIFE Modular

## משימות

- universal beats
- culture variants
- anchor contract
- era model
- LIFE DNA
- art archetypes
- chapter composer
- dead-end tests
- truth validator

## Pilot

Zrinjski או Olympiacos.

## Done

פרק LIFE מלא שאינו מרגיש template גנרי.

---

# 66. Milestone M10 — Portal

## משימות

- production portal
- club discovery
- account
- language
- global profile
- club progress
- deep links
- SEO
- metadata
- OG cards

---

# 67. Milestone M11 — Club Waves

## Wave 0

Hapoel Tel Aviv

## Wave 1

- Hapoel Petah Tikva
- Maccabi Haifa

## Wave 2

- Zrinjski Mostar

## Wave 3

- Olympiacos
- Panathinaikos
- AEK
- PAOK

## Wave 4

- Dinamo Zagreb
- Hajduk Split

## Wave 5

- Dortmund
- St. Pauli
- Leicester
- Atalanta

---

# 68. Club Launch Checklist

Club אינו playable רק כי הוא ב־Registry.

נדרש:

```text
identity ✅
theme ✅
localization ✅
sources ✅
players ✅
matches ✅
timeline ✅
minimum gates ✅
rights ✅
readiness ✅
QA ✅
```

---

# 69. מצב Club

מומלץ להגדיר:

```text
ANNOUNCED
RESEARCHING
IN_REVIEW
PARTIAL
PLAYABLE
FULL
PAUSED
```

Portal יכול להציג Club גם אם הוא עדיין לא playable.

---

# 70. Definition of Done — Feature

Feature נחשב Done רק כאשר:

- אינו hardcoded למועדון
- תומך missing data
- עבר i18n
- עבר RTL/LTR
- עבר tests
- עבר rights check אם יש asset
- עבר tenant check אם יש DB
- עובד בשלושת Clubs architecture
- מתועד

---

# 71. Definition of Done — Club

Club נחשב playable רק כאשר:

- אין fabricated facts
- כל Gameplay fact עומד confidence
- אין critical research gaps
- אין broken Gates
- אין unknown production rights
- theme שלם
- language שלמה
- mobile תקין
- readiness תקין
- לפחות Gate set מינימלי עובד

---

# 72. Anti-Patterns — אסור

## אסור 1

```text
copy Gate → rename → edit for club
```

## אסור 2

```text
if club === X
```

ב־shared engine ללא exception מוצדק.

## אסור 3

להכניס media כבדה ל־Git כי “זה זמני”.

## אסור 4

להמציא מידע כדי להשלים Gate.

## אסור 5

לפתוח Gate שאין לו data.

## אסור 6

לאשר rivalry אוטומטית.

## אסור 7

לסמוך על club_id מהלקוח.

## אסור 8

לערבב research draft עם approved gameplay data.

## אסור 9

להכריז Club playable על בסיס manifest בלבד.

## אסור 10

להפוך Hapoel ל־special case קבוע.

---

# 73. סדר העבודה המעשי מעכשיו

## STEP 1

ליצור מסמך `ClubData` מפורט.

## STEP 2

Audit של כל ה־direct Hapoel imports.

לסווג:

```text
identity
players
matches
kits
archive
life
theme
text
```

## STEP 3

Hapoel Adapter.

## STEP 4

Zrinjski Compiler.

## STEP 5

Olympiacos minimal research pack.

## STEP 6

Timeline migration.

## STEP 7

All-Time XI migration.

## STEP 8

Trivia migration.

## STEP 9

Theme + i18n.

## STEP 10

Supabase multi-tenancy.

רק אחר כך מרחיבים תוכן לכל 14 Clubs.

---

# 74. Priority Matrix

## P0 — Blockers

- ClubData
- Hapoel Adapter
- Pack Compiler
- server Club Resolver
- tenant model

## P1 — Core Product

- Gate migrations
- i18n
- theme
- readiness
- admin approval flow

## P2 — Scale

- automated research
- media pipeline
- additional clubs
- LIFE composer

## P3 — Polish

- animations
- advanced social sharing
- marketing extras
- cosmetic enhancements

---

# 75. השאלה שכל PR חייב לענות עליה

לפני Merge:

> האם השינוי הזה מקרב אותנו לכך שמועדון הוא DATA ולא CODE?

אם לא — צריך להסביר למה הוא עדיין נכון.

---

# 76. שלושת מדדי הבריאות החשובים

## 1. Engine Purity

כמה Hapoel-specific imports נשארו בתוך shared engine?

היעד:

```text
0
```

## 2. Club Readiness

כמה מהמוצר עובד בכל Club?

## 3. Verified Coverage

איזה אחוז מה־Gameplay Data מאושר ובביטחון 2+?

---

# 77. מדדים מומלצים לאדמין

לכל Club:

```text
Historical coverage
Verified facts
Research gaps
Gate readiness
Rights coverage
Localization coverage
Asset coverage
LIFE readiness
Broken sources
Conflicts
```

---

# 78. עיקרון UX

Fan Life אינו “Database עם משחקים”.

המשתמש צריך להרגיש:

> זה המשחק של המועדון שלי.

לכן איכות תרבותית חשובה כמו כמות נתונים.

---

# 79. עיקרון תוכן

מידע היסטורי הוא Skeleton.

תרבות היא Personality.

LIFE הוא Emotion.

השילוב ביניהם הוא Fan Life.

---

# 80. משפט הסיום של הפרויקט

> **Build the engine once. Research the truth carefully. Let every club feel native.**

או בעברית:

> **מנוע אחד. אמת אחת לכל עובדה. וכל מועדון מרגיש כאילו המשחק נבנה רק בשבילו.**

---

# 81. NEXT EXECUTION BLOCK

המשימה הבאה לפיתוח:

```text
FAN LIFE M1 — TRUE MULTI-CLUB CORE
```

Deliverables:

1. `ClubData` specification
2. direct-import audit
3. `HapoelAdapter`
4. `PackCompiler`
5. `ClubResolver`
6. Zrinjski compatibility
7. Olympiacos minimal pack
8. first Gate migrated
9. 3-club test suite
10. migration report

לא להתחיל כרגע:

- LIFE art generation לכל 14 המועדונים
- full research לכל 14
- production auth
- advanced marketing
- heavy polish

עד שה־M1 מוכח.

---

# 82. Canonical Decision Summary

```text
ONE REPO                 ✅
ONE VERCEL               ✅
ONE SUPABASE              ✅
ONE ENGINE                ✅
ONE USER ACCOUNT          ✅
MULTI-TENANT              ✅
CLUB = DATA               ✅
HAPOEL = GOLDEN ADAPTER   ✅
NO AUTO FABRICATION       ✅
HUMAN APPROVAL            ✅
RIGHTS LEDGER             ✅
HEAVY MEDIA OUTSIDE GIT   ✅
LIFE = HUMAN + CULTURE + HISTORY ✅
```

---

**END OF PROJECT BIBLE**
