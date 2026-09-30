# THE WORKER LIFE — הבריף הגרפי המלא (4.9.2026)

*מסמך אחד, מסודר לפי דחיפות, עם פרומט מדויק לכל פריט. מחליף את `ART-PROMPTS.md` (שנשאר כארכיון). כל פרומט מוכן להעתקה כמו שהוא. כל מה שכתוב "קיים" — נבדק מול הקבצים בריפו ב-4.9.2026.*

---

## 0. מה המצב, במספרים

### רקעים
| מפתח | מה יש בריפו | מה צריך | סטטוס |
|---|---|---|---|
| `street`, `streetEast`, `gate7`, `stand`, `kitchen`, `kiosk`, `ussExt`, `ussHall`, `ussHallPre`, `ground`, `undercroft` | 1600 רוחב | — | ✅ הרף |
| `approach` (הדרך), `corridor` (המנהרה), `pitch` (המגרש) | 1600 רוחב, נמוכים (532–616) | ✅ עובד; רצועות שמיים/קרקע נוצרות אוטומטית | ✅ |
| **`bedroom`** | **543×417 — מוגדל ×3, מטושטש. הרקע היחיד שנשאר מלוח קונספט, והוא החדר הראשון שרואים ב-1986, ב-1990 ובמעבר בין השנים** | 1600×900 | ❌ **הכי דחוף** |
| **`living`** (הסלון) | 1105×737 (×1.45) | 1600×900 | ❌ |
| **`reveal`** (כרטיס ההתגלות) | 1348×470 (×1.2) | 1600×900 | ❌ |
| **חדר 1990** | אין (משתמשים בחדר 1986 + חפצים) | 1600×900 | ❌ |
| **רחוב 1990** | אין (אותו רחוב 1986) | 1600×625 | ❌ |
| **כיתה** (שלב ב׳, מערכה ב׳ — 11.3.1991) | אין | 1600×900 | ❌ חוסם את המערכה הבאה |
| **חצר/שער בית הספר** | אין | 1600×900 | ❌ |
| **שכבות פרלקסה** לרחוב, לדרך, לשער 7, ליציע | אין | 3 שכבות לכל אחד | ❌ (זה מה שנותן "עומק" בנייד) |

### דמויות
| מי | מה יש | מה חסר |
|---|---|---|
| פוגי 8 (`pogi*`) | סט מלא | **גיליון הליכה של 8 פריימים שהוא אותו ילד** (המסירה הקודמת ציירה ילד אחר ונגנזה) |
| פוגי 12 (`hero80*`) | סט מלא כולל `hero80-walk` | גיליון הליכה של 8 פריימים |
| פוגי 13–15 (`hero90*`, `pogi90-*`) | סט מלא | — |
| קובי 1986 / 1990 (`kobi*`, `kobi90*`) | סט מלא | — |
| רחל | `rachel`, `rachel-smoke`, `rachel-tray` בלבד | **רחל 1990** (4 שנים מבוגרת) + עוד תנוחות |
| אופיר, עמית, קרן 1990 | סטים מלאים | — |
| **קרן 1986, אפי, בעל הקיוסק** (`keren`, `efi`, `oldMan`) | **חיתוכים בסגנון הישן (צ'יבי, ראש גדול) — עומדים ליד הפוטוריאליסטיים** | לצייר מחדש |
| **מורה** (1991) | אין | חוסם את הכיתה |
| **ילדי כיתה** (3–4 יושבים) | אין | חוסם את הכיתה |
| שחקני כדורסל בחימום (גנריים, אדום) | אין | לאוסישקין |
| מבוגרים/צעירים גנריים (`adultA/B`, `youngA/B`, `fanA–G`) | 28 | מספיק |

### פורטרטים (לתיבת הדיאלוג)
קיימים: פוגי (3 גילים), קובי, רחל, אופיר, עמית, קרן, אפי, אוהד, ילד, זקן, סיני, תקוה, חייל. **חסר:** רחל 1990, המורה, בעל הקיוסק (ב-`faceOldMan` הישן), ילד/ה מהכיתה.

### חפצים
קיימים: כדור (3), תיק (2), צעיף (3), טרנזיסטור, עיתון, כרטיס, ניירות, פוסטרים, סטיקר, דגל, כובע, שלט, מטבעות, קפה, ניירות. **חסר:** פתק מקופל, כדורסל, עטיפת אוכל, פיסת נייר קטנה, כרטיס אוסישקין, גזיר עיתון של הטבלה, שני חפצים לקופסה האדומה.

### פונטים — **תוקן בקוד, לא צריך ממך כלום**
ב-1.9.2026 טעינת הגופנים מגוגל הוחלפה ב-stub כדי שהבילד יעבור בלי רשת — וה-stub הזה עלה לאתר. **מאז כל האתר הוצג ב-Georgia ובגופן המערכת.** בדלתא 17 הגופנים מגיעים עם הריפו (`public/fonts/*.woff2`, 276KB): Frank Ruhl Libre 700/900 לכותרות, Miriam Libre 400/700 לשלטים, Heebo 400/500/800 לגוף, Courier Prime לשעון ולמספרים, Karantina 700 למספרי שער, Archivo לשורות הלטיניות. הבילד לא צריך רשת. גם הגדלתי במעט את הטקסט ב-HUD ובתיבת הדיאלוג. **אין פריט גרפי לייצר בסעיף הזה.**

---

## 1. הכללים שחלים על **כל** פרומט (העתק לראש כל פרומט של רקע)

```
STYLE: photorealistic painted matte background, cinematic adventure-game art.
South Tel Aviv / Jaffa, [YEAR]. Sun-bleached plaster, iron shutters, dust, worn
concrete, exposed wiring, aged paint. Hand-painted texture — not photography,
not 3D render, not illustration, not cartoon, not anime.

CRITICAL — no people. Not one figure, not a silhouette, not a shadow of a person.
Characters are separate sprites the engine places on top.

CRITICAL — no text. No readable lettering anywhere: no signs, posters, numbers,
graffiti with characters. Shapes and colour only. All text comes from the game.

COLOUR: cooler and flatter than looks right — the engine grades warm on top.
Whites toward grey, moderate contrast, open shadows.

NO YELLOW. None. No gold, mustard, hi-vis, yellow-green. Warm = brick, rust,
terracotta, ochre-brown. The build fails on a single yellow pixel.

WALK BAND: the horizontal strip of floor stated below must be EMPTY floor —
no furniture, steps, objects, kerbs crossing it. The child walks there.

OUTPUT: PNG, exactly the pixel size stated, full bleed, no border, no watermark.
```

**נגטיב לכל רקע:**
```
people, person, figure, silhouette, crowd, human, text, letters, words, signage,
watermark, logo, frame, border, vignette, yellow, gold, mustard, HDR, oversaturated,
lens flare, modern cars, modern phones, air conditioners, satellite dishes, plastic
furniture, 3D render, cartoon, anime, illustration, sketch
```

**כללים לדמויות (כל גיליון):** רקע ירוק שטוח `#00B140` בלי גרדיאנט, בלי צל על הירוק; רווח ירוק נקי של 40px לפחות בין דמות לדמות; כל הדמויות באותו גובה ובאותו מרחק מצלמה; רגליים בפריים; אותו סגנון צילומי-מצויר כמו `pogi.png` המצורף. **תמיד לצרף את קובץ הרפרנס של הדמות** (`pogi.png`, `kobi.png`, `rachel.png` וכו׳) — בלי רפרנס מקבלים אדם אחר.

**כללים לפורטרטים:** רקע קרם שטוח `#EDE6D8`, ראש ממלא ~70% מגובה התא, כתפיים נראות, 6 הבעות בשורה, 1536×512.

---

## 2. רקעים — לפי סדר

### 2.1 `bedroom` — חדר השינה 1986 · **1600×900** · הכי דחוף
זה החדר הראשון של המשחק, החדר שבו עוברות ארבע שנים במעבר, והחדר של הבוקר אחרי ההעפלה. הוא כרגע הרקע הגרוע ביותר במשחק (×3 הגדלה) והוא מופיע יותר מכל רקע אחר.

**רצועת ההליכה:** 84%–97% מגובה התמונה — רצפה ריקה (הרצפה עצמה יכולה להתחיל ב-68%; הרהיטים נגמרים לפני 82%). **הדלת:** בקצה שמאל, פתוחה לסלון (מ-x 0 עד 9%). **המיטה:** לאורך הקיר האחורי, משמאל למרכז. **מגירה/שידה:** קצה שמאל ליד הדלת (שם המפתח). **הקיר האחורי:** מלא — פוסטרים בלי טקסט, מדף, מאוורר. הרקע חייב להתאים לחפצים שהמנוע מוסיף מעל: תיק בית ספר על הרצפה מימין למיטה, כדור בפינה, צעיף על מסמר ליד הדלת.

```
[BLOCK 1] + South Tel Aviv, 1986.

Interior, a small boy's bedroom in a 1950s workers' housing flat, straight-on
view, eye level slightly above a child's head. 1600 x 900 px.

Back wall: cracked painted plaster in a faded pale green-grey, a single wooden
bed along it (left of centre) with a red-and-white checked blanket, a wooden
shelf above the bed crowded with small objects (no readable text), a standing
metal fan, a wall of pinned pages and pictures with NO lettering — colour
blocks only, red and white and grey. A small window top right with a shutter
half closed, hard afternoon light coming in low. A bedside cabinet with a lamp.
Left edge: a door frame, door open into a darker living room (0–8% of width).
Left, beside the door: a low chest of drawers, one drawer slightly open.
Floor: old terrazzo tiles, patterned, worn. Furniture ends at 82% of the
height; the bottom 18% of the image is EMPTY FLOOR from edge to edge.
Bare bulb hanging from the ceiling. Dust in the light. Lived-in, tidy-ish,
loved.
```

### 2.2 `living` — הסלון · **1600×900**
**רצועת ההליכה:** 73%–97%. **דלת לרחוב:** קצה שמאל (0–7%). **דלת למטבח:** 18–29%, פתח בקיר האחורי. **דלת לחדר:** קצה ימין (84–97%). הרהיטים: ספה ושולחן קפה **מאחורי** הרצועה, טלוויזיה על ארון משמאל, כורסה (של קובי) ליד הטלוויזיה — **ריקה**.
```
[BLOCK 1] + South Tel Aviv, 1986.

Interior, the living room of a modest workers' flat, straight-on, 1600 x 900 px.
Back wall: peeling pale plaster, a big window centre-right with a slatted blind
and thin curtains, hard low light. A worn brown sofa under the window with a
crocheted throw, a low wooden coffee table in front of it with a glass ashtray
and a folded newspaper (no readable text). Left: a wooden cabinet with a boxy
1980s television on it, a pennant-shaped cloth (red, NO letters) on the wall,
family photos in frames — faces indistinct. Left of the sofa: a deep armchair,
EMPTY. Two doorways in the back wall: one at 18–29% of width open to a kitchen,
one at 84–97% open to a bedroom; and the flat's front door at the far left
edge (0–7%). Floor: patterned terrazzo, a threadbare rug under the coffee table
ending BEFORE the walk band. Bottom 27% of the image is empty floor edge to edge.
Standing fan by the window. Warm, tired, clean.
```

### 2.3 `reveal` — ההתגלות · **1600×900**
כרטיס-מעבר, לא מיקום: הרגע שהילד יוצא מהמנהרה ורואה את בלומפילד המלא. אין רצועת הליכה. מותר קהל — אבל כמסה, בלי פנים ובלי דמות בודדת בחזית.
```
[BLOCK 1 without the "no people" line — crowd as a mass is allowed here,
no individual faces, no figure in the foreground] + Tel Aviv, May 1986.

Wide establishing frame, 1600 x 900 px, seen from the mouth of a dark stand
tunnel: the dark concrete arch of the tunnel frames the top and both sides of
the image (about 12% each side), and through it — blinding late-afternoon
light on a full football stadium. Old open terraces packed with people in
red and white, seen as colour and movement, not faces. Floodlight pylons.
A green pitch far below. The far stand's roof. Dust and glare in the air.
The feeling: a child seeing this for the first time. No text, no numbers,
no flags with lettering, no yellow.
```

### 2.4 חדר השינה 1990 · **1600×900** · `bedroom90`
אותו חדר, ארבע שנים אחרי. **אותה מצלמה, אותה דלת, אותה מיטה, אותה רצועה** כמו 2.1 — רק הדברים בו השתנו. המנוע מחליף בין השניים במעבר, אז ההתאמה חייבת להיות מדויקת.
```
[The same room, camera and layout as bedroom (attach it as reference)] +
South Tel Aviv, May 1990.

Four years later. Same bed, same window, same door, same chest of drawers,
same floor. Changed: the wall of pictures is denser and more red — pinned
pages, a scarf hung on a nail by the door, a cassette player on the shelf with
a pile of cassettes, a bigger school bag by the bed, sneakers under the bed,
a transistor radio on the bedside cabinet, the fan the same but older, the
blanket now plain dark red. The football in the corner is gone. Slightly less
tidy. Same light, same time of day. Bottom 32% empty floor. No readable text.
```

### 2.5 הרחוב 1990 · **1600×625** · `street90`
אותו רחוב, אותה מצלמה, אותן דלתות (בית 0–9%, קיוסק 23–33%, סמטת המגרש 42–51%, אוסישקין 72–79%, מזרחה 94–100%). רק הזמן זז.
```
[Attach street.png as reference: same street, same camera, same buildings,
same door positions] + South Tel Aviv, May 1990.

The same street four years on. The same facades, a little more peeled; a
different, slightly newer car parked (late-80s Subaru/Fiat shape, no plates);
the kiosk's awning replaced with a red-and-white one; fly-posted paper on the
wall by the alley in red and white blocks with NO readable text; a string of
red-and-white bunting across the street between two balconies; a bicycle
leaning on the wall; the graffiti wall repainted grey with faint red marks
(no letters). Same hard afternoon light. Same walk band (70–86% of height)
empty. No people. No text. No yellow.
```

### 2.6 הכיתה — 1991 · **1600×900** · `classroom` · חוסם את המערכה השנייה
כאן נפתחת מערכה ב׳ (הבריף §27): המורה כותבת על הלוח, פוגי משועמם, פתק נוחת על השולחן. **הלוח ריק** — הכתיבה תיעשה בקוד. **הרצועה:** 74%–98% — המעבר בין השולחנות לבין הקיר הקדמי (הלוח).
```
[BLOCK 1] + Tel Aviv, a state elementary school, March 1991.

Interior, a classroom seen from the back-left corner at a seated child's eye
height, 1600 x 900 px. Front wall: a large dark-green chalkboard, EMPTY — no
writing, not even smudges that read as letters; a teacher's wooden desk in
front of it with a pile of notebooks, a chair behind it, EMPTY. Above the
board: a strip of bare wall, a clock with no numerals, a small framed picture
(indistinct). Left wall: tall windows with metal frames and dusty glass, hard
morning light in slanting bands, a radiator under them. Right wall: a corkboard
with pinned papers (colour blocks, no text), a map with no lettering.
The room: four rows of paired wooden-and-steel school desks with attached
chairs, scratched, seen from behind, receding toward the board; school bags
hung on chair backs. The bottom 26% of the image is an EMPTY aisle of grey
terrazzo floor running left-to-right between the front row and the board.
Chalk dust in the light. Pale green paint to hip height, cream above. 1991,
not 2020: no projector, no plastic chairs, no posters with words.
```

### 2.7 חצר בית הספר / השער · **1600×900** · `schoolyard`
אחרי הכיתה (הבריף §29): מכאן מתפצל אחר-הצהריים — הביתה / חברים / קיוסק / כדורסל ברחוב / מידע.
```
[BLOCK 1] + Tel Aviv, March 1991.

Exterior, a school's front yard seen from just inside the gate, 1600 x 900 px.
A two-storey 1960s school building across the back — long, plain, concrete
balconies, rows of windows, a stairwell tower; pale plaster, stained. In the
yard: a cracked asphalt court with a single basketball hoop on a steel pole
(right of centre, backboard worn, net torn), faded painted lines, a low
concrete bench, a drinking fountain, two ficus trees casting hard shade, a
chain-link fence along the right edge. The gate: a wide iron gate at the far
LEFT edge (0–8%), open, the street beyond it bright. Walk band: the bottom 24%
is an empty strip of asphalt from edge to edge. Early afternoon, hot, dusty.
No people, no text, no yellow.
```

### 2.8 פרלקסה — שלוש שכבות לכל אחד מארבעה חוצים
זה מה שהופך "רקע שנגלל" ל"חדר עם עומק" בנייד (המודל: Very Little Nightmares). המנוע כבר יודע להזיז שכבות בקצב שונה — חסרות רק השכבות. **סדר:** `street` → `approach` (הדרך) → `gate7` → `stand`. לכל אחד שלושה קבצים **בדיוק בגודל הרקע הקיים ומיושרים אליו פיקסל-לפיקסל** (צייר מעל הקיים; אל תצייר מחדש):

| קובץ | מה יש בו | אלפא |
|---|---|---|
| `<key>--far.png` | שמיים, בניינים רחוקים, אופק, גגות — כל מה **שמאחורי** קו הקיר של רצועת ההליכה | אטום (מלא) |
| `<key>--mid.png` | הקיר/החזיתות בעומק הרצועה + הרצפה של הרצועה עצמה | **PNG עם שקיפות** — הכול מעל קו הגגות שקוף |
| `<key>--near.png` | 1–3 חפצים **בין המצלמה לרצועה**: עמוד תאורה, מכסה מנוע, מעקה, ענף — לא יותר מ-15% מהפריים | PNG עם שקיפות, רובו ריק |

```
Attached: <key>.png (the finished background). Produce THREE aligned layers at
exactly the same pixel size, splitting the attached image by depth — do not
repaint or restyle it, separate it:
1. FAR: everything behind the buildings' front faces — sky, distant rooftops,
   far facades. Fill in what the mid layer used to cover, so it is a complete
   opaque image on its own.
2. MID: the walkable ground strip and the walls/facades at its depth, on a
   transparent background. Fill in behind anything the near layer removes.
3. NEAR: one to three foreground objects only (a lamp post, a parked car's
   bonnet, a railing, a branch), on a transparent background, touching the
   bottom or side edges. At most 15% of the frame.
No people, no text, no yellow. PNG. Names: <key>--far.png, --mid.png, --near.png.
```

---

## 3. דמויות — לפי סדר

### 3.1 פוגי 8 — גיליון הליכה, 8 פריימים · **2560×640** · `pogi-w1..w8`
המסירה מ-3.9 ציירה ילד אחר במכנסיים קצרים ונגנזה. **לצרף `pogi.png` ו-`pogi-side.png`** ולוודא שזה אותו ילד לפני שמייצרים 8.
```
Character sheet, green screen #00B140, flat, no gradient.
The SAME eight-year-old boy as the attached pogi.png / pogi-side.png, in all
eight frames: dark curly hair over the forehead, red t-shirt with the small
white club badge, long blue jeans, white trainers with green stripes. NOT
shorts, NOT a plain shirt. Photorealistic painted style of the reference.
EIGHT FRAMES OF A WALK CYCLE, SIDE VIEW, WALKING TO THE LEFT, full body,
feet included, all eight at exactly the same height and camera distance:
1 contact (left foot forward flat, right back on toe) · 2 down (weight over
left, lowest) · 3 pass (right leg swinging through) · 4 up (highest, right
foot reaching) · 5 contact (right forward) · 6 down · 7 pass · 8 up.
Arms swing opposite the legs, slight head bob, a child's loose quick walk.
40px green gaps. Nothing overlapping.
```

### 3.2 פוגי 12 — גיליון הליכה, 8 פריימים · **2560×720** · `hero80-w1..w8`
אותו פרומט כמו 3.1, עם **`hero80.png` ו-`hero80-side.png`** כרפרנס: בן שתים-עשרה, חולצת טרנינג אדומה-לבנה, ג'ינס, אותם נעליים. גובה הפריים 720 (הוא גבוה יותר).

### 3.3 רחל 1990 · **2048×1024** · `rachel90-*`
בשלב ב׳ רחל היא זו שנותנת דמי כיס, ששואלת "נו?", ובמערכה השנייה — זו שקובעת שעת חזרה ואומרת "ראיתי מה השעה". צריך אותה בתנוחות שאין ב-1986.
```
Character sheet, green screen #00B140, flat. Attach rachel.png as reference.
The SAME woman as the attached reference, four years older (May 1990): same
face, hair a little shorter and greyer at the temples, a plain dark house
dress with a small print, an apron in some poses, flat sandals. Photorealistic
painted style of the reference. Full body, feet included, same height and
camera distance, 40px gaps.
ROW 1 (7): standing front · three-quarter · side (facing left) · back ·
arms folded · hands on hips · holding a folded banknote out.
ROW 2 (7): drying her hands on the apron · pointing to the door · looking at a
wristwatch · arms open (about to hug) · sitting at a table, hands around a cup ·
leaning in a doorway · calling out, one hand raised.
```
**+ פורטרטים** (1536×512, קרם): נייטרלי · חצי חיוך · מודאגת · "נו?" (גבה מורמת) · כועסת בשקט · מסתכלת הצידה.

### 3.4 קרן 1986, אפי, בעל הקיוסק — לצייר מחדש · **2048×1024 לדמות**
שלושתם עדיין חיתוכים בסגנון הצ'יבי הישן ועומדים ליד פוגי/אופיר/עמית הפוטוריאליסטיים. **לצרף `pogi.png` לרפרנס סגנון, ו-`keren90.png` לרפרנס פנים של קרן** (זו אותה ילדה, 4 שנים צעירה יותר).
```
Character sheet, green screen #00B140, flat. Photorealistic painted style of
the attached pogi.png. Full body, feet included, seven per row, 40px gaps.

KEREN (1986) — an eight-year-old girl, the same face as the attached keren90.png
but four years younger: dark hair in a ponytail, red-and-white striped t-shirt,
blue shorts, sandals.
ROW 1: front · three-quarter · side · back · sitting on a low wall, legs
dangling · arms crossed · pointing.
ROW 2: walking side-on, four strides · laughing · shouting · hands on hips.

EFI (1986) — a nine-year-old boy, big dark curls, plain red t-shirt, dark
shorts, scuffed trainers, a football under his arm in two poses.
ROW 1: front · three-quarter · side · back · crouching over a ball · kicking ·
arms wide.
ROW 2: walking side-on, four strides · dribbling · celebrating · sulking.

KIOSK OWNER — a man about sixty, heavy, grey moustache, white short-sleeved
shirt over a vest, dark slacks, reading glasses pushed up on his head.
ROW 1: front · three-quarter · side · back · leaning on a counter · handing
something over · reading a newspaper (no readable text).
ROW 2: pointing outside · arms folded · laughing · shrugging · counting coins ·
wiping the counter · sitting on a stool.
```
**+ פורטרט לבעל הקיוסק** (6 הבעות): נייטרלי · חיוך · "מה אתה רוצה" · מספר סיפור · מסתכל מעל המשקפיים · צוחק.

### 3.5 המורה — 1991 · **2048×1024** · `teacher-*` · חוסם את הכיתה
```
Character sheet, green screen #00B140, flat. Photorealistic painted style of
the attached pogi.png (style reference only).
A woman in her late forties, a Tel Aviv elementary-school teacher in March
1991: short dark hair with grey, glasses on a chain, a plain blouse and a
knitted cardigan, a long skirt, flat shoes, a piece of chalk in one hand in
some poses. Tired, not unkind. Full body, feet included, same height, 40px gaps.
ROW 1: standing front · three-quarter · side (facing left) · back (writing on a
board, arm up) · arms folded · holding a folded note between two fingers,
looking at it · looking over her glasses at the viewer.
ROW 2: pointing at a desk · hand out, palm up ("give it here") · sitting at a
desk marking · leaning on the desk edge · walking side-on, two strides ·
tapping a watch · turning back to the board.
```
**+ פורטרט** (6): נייטרלי · מעל המשקפיים · "יש משהו שאתה רוצה לחלוק עם הכיתה?" · עייפה · חצי חיוך · כועסת.

### 3.6 ילדי כיתה — 1991 · **2048×768** · `pupil-*`
יושבים, מהגב ומהצד — הם רהיטים חיים; לא מדברים. 
```
Character sheet, green screen #00B140, flat. Photorealistic painted style of
the attached hero80.png; twelve-year-olds, Tel Aviv, 1991.
ONE ROW of eight SEATED children, each on an invisible school chair (chair not
drawn), same scale, 40px gaps: four seen from behind (two boys, two girls —
different hair, plain t-shirts and sweatshirts, no logos or text), two seen in
profile facing left (one boy slumped, chin on hand; one girl writing), one
girl turning round in her seat to look back, one boy passing a folded note
sideways with a low hand.
```

### 3.7 כדורסלנים בחימום — גנריים · **2048×768** · `hooperRed-*`
לאולם לפני הטיפ-אוף (הבריף §36). **לא שחקן ספציפי, בלי מספר, בלי שם** — הזיהוי במשחק נעשה דרך קריאות הקהל, לא דרך ציור.
```
Character sheet, green screen #00B140, flat. Photorealistic painted style.
Six adult basketball players in a warm-up, Israel 1991: plain RED sleeveless
kit with white trim, NO numbers, NO lettering, white socks, high-top shoes.
Different builds and hair (one very tall, one stocky, one with a headband).
Same height scale, 40px gaps: standing with a ball on the hip · dribbling ·
shooting (arms up, ball leaving) · stretching a hamstring · walking away
(back view) · bent over, hands on knees.
```

### 3.8 סדרן אולם + מוכר במסדרון — 1991 · **1536×768** · `usher-*`, `hallVendor-*`
```
Character sheet, green screen #00B140, flat. Photorealistic painted style.
Two adults, Ussishkin hall, Tel Aviv, 1991, same scale, 40px gaps.
USHER — a man about fifty in a dark blue jacket with a cloth armband (no text),
grey trousers: standing · arm out blocking · pointing up the stairs · waving
someone through.
VENDOR — a young man in a white t-shirt and apron with a tray of wrapped food
hung from his neck: standing · handing a wrapper down · counting change ·
shouting his wares (mouth open, one hand up).
```

---

## 4. חפצים · **כל חפץ בנפרד, PNG שקוף, 512×512, החפץ ממלא ~80%**
בלי טקסט על שום חפץ — הכותרת של הזיכרון מגיעה מהמשחק.

| מפתח | מה | פרומט קצר (הוסף: `single object, painted photoreal, transparent PNG 512x512, no text, no yellow, soft ground shadow only`) |
|---|---|---|
| `propNote` | הפתק — "היום אוסישקין?" | a small sheet torn from a squared notebook, folded twice, slightly crumpled, blue ballpoint scribble seen as marks not letters |
| `propNoteOpen` | הפתק פתוח | the same sheet unfolded, creases visible, two short lines of blue scribble as illegible marks |
| `propBasketball` | כדורסל 1991 | a worn orange-brown rubber basketball, scuffed, dull, black seams |
| `propTicket91` | כרטיס לאולם | a small stub of thin card, red print blocks and a perforated edge, no digits |
| `propScorePaper` | "עשר הפרש" — פיסת נייר | a torn corner of newspaper with a pencil scrawl of two marks and a dash, seen as marks |
| `propWrapper` | עטיפת אוכל | a greasy paper wrapper, white with red stripes, half crumpled |
| `propClipping90` | גזיר הטבלה 1990 | a newspaper clipping of a league table — rows and columns as grey blocks, one row circled in pencil, NO legible characters |
| `propCassette` | קלטת | a black audio cassette with a hand-written paper label (scribble, no letters) |
| `propChalk` | גיר + מברשת | a stub of white chalk and a felt board eraser |
| `propBagStrap90` | תיק 1990 עם צעיף מציץ | a dark blue school bag half open with a red-and-white scarf end sticking out |

---

## 5. ממשק — מה כבר טופל ומה עוד אפשר
- **גופנים:** תוקן (סעיף 0). אם תרצה **לוגו/כותרת ראשית מצוירת** ל-`/life`: 1600×400, PNG שקוף, האותיות "The Worker" באדום על שקוף בסגנון שלט-פח מרוסק של שנות ה-80 — **זה הפריט היחיד שבו מותר טקסט**, וגם הוא אנגלית בלבד, בלי צהוב.
- **אייקון מפה/תפריט:** לא צריך — טקסט.
- **כרטיסי-כותרת** ("מאי 1990", "אוסישקין"): טקסט, לא צריך גרפיקה.

---

## 6. איך לשלוח, ובאיזה סדר

**סדר עדיפות מוחלט:**
1. `bedroom` 1600×900 (2.1) — משנה את המסך הראשון של המשחק.
2. גיליון ההליכה של פוגי 8 (3.1) + של פוגי 12 (3.2).
3. קרן/אפי/בעל הקיוסק מחדש (3.4).
4. `living`, `reveal` (2.2, 2.3).
5. **כל מה שחוסם את מערכה ב׳:** `classroom` (2.6), המורה (3.5), ילדי הכיתה (3.6), `schoolyard` (2.7), החפצים (4).
6. רחל 1990 (3.3), חדר 1990 (2.4), רחוב 1990 (2.5).
7. כדורסלנים, סדרן, מוכר (3.7, 3.8).
8. פרלקסה (2.8) — כשהכול קיים; זה השדרוג ולא הבסיס.

**פורמט:** PNG בגודל המדויק. שמות קבצים בדיוק כמו במפתחות למעלה. גיליונות ירוקים — קובץ אחד לגיליון; אני חותך. **תמיד לצרף רפרנס** של הדמות הקיימת כשמייצרים דמות קיימת.

**מה אני עושה עם כל קובץ:** `npm run art:finish` (הקטנה ל-1600, פלטה, de-yellow, רצועות המשך), חיתוך גיליונות, עדכון `manifest.json`, כיול רצועת-הליכה ומיקומים דרך `ERA=1990 npm run life:boards`, ובדיקת אפס-צהוב בבילד. אתה לא נוגע בקוד.
