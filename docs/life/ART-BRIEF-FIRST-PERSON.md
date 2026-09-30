# THE WORKER LIFE — בריף גרפי: גוף ראשון + השלמות (4.9.2026, ערב)

*המשך ל-`ART-BRIEF-COMPLETE.md`. אותם כללי-ברזל (חלק 1 שם): אין אנשים ברקעים שנועדו להליכה, אין טקסט קריא, אפס צהוב, PNG במידה המדויקת. כאן יש יוצא-דופן אחד מפורש: **פנורמות של קהל** מותרות עם אנשים — כמסה, בלי פנים בחזית.*

---

## 0. מה נבנה עכשיו, ולמה זה צריך גרפיקה

| מנגנון | מה השחקן עושה | מה חסר |
|---|---|---|
| **A. מבט-פנורמה** (Myst/Firewatch) | ברגעים נבחרים המסך הופך למבט מעיני פוגי: גוררים / מטים את הטלפון כדי להסתכל סביב, נוגעים במה שמעניין | 8 פנורמות רחבות (סעיף 1) |
| **B. המנהרה בגוף ראשון** (ראיקאסטינג, רגע אחד) | הולכים לתוך המנהרה של בלומפילד, הקירות מתקרבים, הרעש גדל — ואז הפתיחה לפנורמת ההתגלות | 6 טקסטורות + 3 ספרייטים (סעיף 2) |
| **C. קלוז-אפ בשיחה** | ברגעי שיא לוח-הפנים גדל למסך מלא, קולנועי | 8 פורטרטים קולנועיים (סעיף 3) |
| **D. השלמות כלליות** | מסך פתיחה, אייקון, מפה מצוירת, הקופסה האדומה, הבעות לכל הדוברים הראשיים, קהל לאוסישקין | סעיף 4 |

---

## 1. פנורמות · **4096×1024** · גליליות, ניתנות לחיבור מקצה לקצה

**מה זה טכנית:** תמונה רחבה ביחס 4:1, "cylindrical panorama, 360°": הקצה השמאלי והימני חייבים להתחבר בלי תפר (seamless horizontally). האופק בגובה **48%** מהתמונה בכל הפנורמות (כך שהמצלמה "עומדת" באותו גובה). בלי עיוות fisheye, בלי עדשה רחבה מעוותת — מבט טבעי, כאילו מסתובבים במקום.

**בלוק לכל פנורמה (להעתיק לראש):**
```
360-degree CYLINDRICAL PANORAMA, 4096 x 1024 px, aspect 4:1. The left and right
edges MUST join seamlessly (the image wraps around the viewer). Horizon at 48% of
the height. Natural perspective, no fisheye, no lens distortion. Photorealistic
painted matte style matching THE WORKER LIFE (sun-bleached plaster, dust, worn
concrete, painted texture — not a photo, not 3D, not cartoon). Cooler and flatter
than looks right. NO YELLOW anywhere (no gold, mustard, hi-vis). No readable text.
```

### 1.1 `panoReveal` — פי המנהרה, בלומפילד מלא, 24.5.1986
הרגע הכי חשוב במשחק, עכשיו מעיני הילד. **קהל מותר** — כמסה.
```
[BLOCK] Standing at the mouth of a dark concrete stand tunnel at Bloomfield,
Jaffa, May 1986, late afternoon, the moment of stepping out. Ahead: blinding
low sun over a full open football ground — packed terraces of people in red
and white seen as colour and movement (no faces near the camera, no individual
in the foreground), floodlight pylons, a green pitch below, the far stand's
roof. Left and right: the crowd on OUR terrace close by, backs and shoulders,
scarves, paper in the air. Behind (the seam side): the dark tunnel mouth we
came from, concrete, a bare bulb. Dust and glare in the air. Emotion: a child
seeing this for the first time.
```

### 1.2 `panoTerrace1986` — על היציע, בין האנשים, לפני השער
```
[BLOCK] Standing on a concrete terrace step at Bloomfield, 1986, a child's eye
height (1.2 m) — adults tower around, seen from below: backs, elbows, scarves,
a transistor radio held to an ear, a rolled newspaper. Ahead through a gap in
the bodies: the pitch, green, the far stand. Left/right: the terrace curving
away, crowd thickening. Behind: the top of the terrace, a fence, sky. Hard low
light from the front-left. No faces closer than two metres, no readable text,
no yellow.
```

### 1.3 `panoUssHall` — אולם אוסישקין ריק, מקו החוץ (שבת, 1986/1990)
**חובה לצרף** את `ussishkin-empty-main-stand.png` ו-`ussishkin-empty-cream-stand.png` — אותו אולם, אותה גאומטריה.
```
[BLOCK] Standing on the sideline of the Ussishkin hall, Tel Aviv, on an empty
Saturday. Attach the two reference paintings: this is the SAME hall — corrugated
tin roof, red steel beams and stair diagonals, the high window strip with cold
daylight, the red-and-charcoal plastic-seat stand on one side, the cream stand
with a dark block of seats opposite, the narrow end wall with the old basket
bolted to it, service doors, a dark unlit scoreboard, worn reddish parquet
reflecting the windows, white court lines. Ahead: the red stand. Behind (seam):
the cream stand. Ends: the baskets. Empty. Dust in the light. No people, no
text, no yellow.
```

### 1.4 `panoUssDerby` — אותו אולם, ליל הדרבי 11.3.1991, מלא
```
[BLOCK] The SAME Ussishkin hall (attach the empty references — do not move a
beam, a stair or the basket) on a derby night, March 1991: every seat full, the
red stand a wall of red and white and raised arms, the cream stand dense with
people, standing rows along the sideline in front of us, smoke and dust in the
beams of the roof lights, the window strip black (night). Ahead: the red stand
erupting. Behind: the cream stand. Court: two teams warming up as small figures
mid-distance, plain red kit and plain white kit, NO numbers, NO names. Heat,
noise, closeness. No faces near the camera, no readable text, no yellow.
```

### 1.5 `panoKitchen90` — שולחן המטבח, 12.5.1990, מהכיסא של פוגי
**לצרף** `kitchen.png` (הרקע הקיים): אותו מטבח, מבפנים.
```
[BLOCK] Sitting at the small kitchen table of the same flat (attach kitchen.png:
same cupboards, sink, window with the shutter, fridge, tiled floor), May 1990,
Saturday noon. Ahead on the table, close and large: an open newspaper sports
page with a league table drawn as grey blocks (NO legible characters), a pencil,
a coffee glass, a transistor radio with a bent aerial. Across the table: an
EMPTY chair pulled out. Left: the window light. Right: the fridge and the door
to the living room. Behind (seam): the sink and the counter. No people, no text,
no yellow.
```

### 1.6 `panoBedroomMorning90` — הבוקר אחרי, 13.5.1990, מהמיטה
**לצרף** `bedroom90.png`.
```
[BLOCK] Lying-then-sitting up in the bed of the same room (attach bedroom90.png),
seven in the morning, grey-blue light through the half-open shutter, the fan
still, the wall of pinned pages, the chest of drawers by the open door, a school
bag on the floor with the end of a red-and-white scarf sticking out of it.
Behind (seam): the bed's headboard and the wall. Quiet, tired, ordinary. No
people, no text, no yellow.
```

### 1.7 `panoGate7` — מול שער 7 בתוך הדוחק, 1990 לפני הכניסה
**לצרף** `gate7.png`. קהל מותר.
```
[BLOCK] Standing in the crowd outside gate seven of Bloomfield (attach gate7.png:
same concrete pillars, turnstile bank, the orange door), May 1990, an hour
before kickoff, a twelve-year-old's eye height. Adults close on every side,
backs and shoulders, a hand holding two tickets up, a steward's dark jacket at
the turnstile ahead, the dark portal beyond it. Behind (seam): the road we came
by, more people arriving. No faces closer than two metres, no text, no yellow.
```

### 1.8 `panoClassroom` — מהשולחן בכיתה, מרץ 1991
**לצרף** `classroom.png`.
```
[BLOCK] Sitting at a desk in the third row of the same classroom (attach
classroom.png), March 1991, mid-morning. Ahead: the backs of two pupils' heads,
the teacher's empty desk, the chalkboard with chalk marks that read as marks and
NOT as letters. Left: the tall windows, hard light in bands. Right: the corkboard
wall. Behind (seam): the back wall and the door. On OUR desk, close and large: an
open exercise book (squared paper, scribble not letters), a pencil case, and a
small folded note. No people in front of the camera, no readable text, no yellow.
```

---

## 2. המנהרה בגוף ראשון · טקסטורות **1024×1024 ניתנות לריצוף** + ספרייטים

מנוע ראיקאסטינג קטן מצייר מסדרון מהטקסטורות האלה. כל טקסטורה: מרובעת, **tileable בכל הכיוונים**, בלי צל של אור-נקודה (הכיוון של האור נעשה בקוד), בלי טקסט, בלי צהוב.

| מפתח | פרומט (הוסף: `seamless tileable texture, 1024x1024, flat even lighting, painted photoreal, no text, no yellow`) |
|---|---|
| `texTunnelWall` | rough poured concrete wall of a 1960s stadium tunnel, damp stains, flaking grey paint to hip height, a faded painted red band at the top |
| `texTunnelWallPoster` | the same wall with a torn fly-posted paper sheet, red blocks, no lettering |
| `texTunnelFloor` | wet grey concrete floor, litter (crushed paper cups, a sunflower-seed shell drift), a painted white line |
| `texTunnelCeiling` | low concrete ceiling with a rusted cable tray and a caged bulb fixture (unlit) |
| `texTunnelSteps` | wide concrete steps going up toward light, worn edges, a steel handrail |
| `texTunnelDoor` | a steel service door in the concrete, dark red paint, riveted, no sign |

**ספרייטים** (PNG שקוף, 512×1024, דמות שלמה, מהחזית ומהגב — ראיקאסטינג מצייר "בילבורד"):
```
Green screen #00B140. Photorealistic painted style of the attached pogi.png.
TUNNEL PEOPLE, 1986, seen from BEHIND (walking away into the light) — four
adults: a man in a red scarf, a woman with a bag, a teenager in a white shirt,
an old man with a cap. Then the same four seen from the FRONT. Full body, feet
included, same height, 40px gaps. One sheet 4096x1024.
```
+ **`spriteBulb`**: a caged tunnel bulb, lit, warm-white with a soft glow, 256×256 transparent PNG. + **`spriteLightEnd`**: the blinding daylight at the tunnel's end as a soft white-to-transparent radial glow, 1024×1024 transparent PNG (no yellow — white/cream only).

---

## 3. קלוז-אפים קולנועיים · **1080×1350** (פורטרייט 4:5) · לרגעי השיא

לא לוח-פנים על קרם — **תמונה מלאה**: פנים מקרוב, המקום מטושטש מאחור, אור של אותו רגע. הפנים חייבות להיות **אותו אדם** כמו הרפרנס (לצרף `faceKobi.png`, `faceRachel90.png` וכו׳). בלי טקסט, בלי צהוב.

| מפתח | הרגע | פרומט |
|---|---|---|
| `cuKobiWhere` | "איפה היית?!" — 1990, אחרי השריקה | Kobi (attach faceKobi + kobi90-cheer), hoarse, eyes wet, half-laughing half-furious, hand reaching toward camera, terrace of red behind him blurred, late sun |
| `cuKobiTable` | "נו, כמה צריך?" — 1990, המטבח | Kobi across the kitchen table, newspaper folded, pencil behind ear, looking up over the paper at the camera, patient and amused, kitchen window light |
| `cuRachelNu` | "נו?" — הדלת של הבית, ערב | Rachel 1990 (attach faceRachel90) in the doorway, arms folded, one eyebrow up, hall light behind her, warm |
| `cuRachelWatch` | "ראיתי מה השעה" — 1991, לילה | Rachel looking at her wristwatch then at the camera, kitchen at night, one lamp, tired and not angry |
| `cuPogiReveal` | הילד רואה את בלומפילד — 1986 | Pogi age 8 (attach facePogi-wide) lit from the front by stadium glare, mouth open, eyes huge, dark tunnel behind him |
| `cuOfir90` | "בא לאוסישקין השבוע?" | Ofir 1990 (attach faceOfir / ofir90) grinning sideways at the camera in a school corridor, morning light |
| `cuTeacherShare` | "יש משהו שאתה רוצה לחלוק עם הכיתה?" | The teacher (attach faceTeacher-glasses) looking over her glasses straight at the camera, chalkboard behind, chalk in hand |
| `cuUsherNight` | "לילה טוב, פוגי." | The usher (attach usher.png) at the hall door at night, half in shadow, a small nod, the lit hall behind |

---

## 4. השלמות כלליות (בלי קשר לגוף ראשון)

### 4.1 מסך פתיחה — key art · **1600×900** ו-**1080×1920**
שתי גרסאות של אותה תמונה (רוחב לדסקטופ, אנכי לנייד — לא חיתוך, קומפוזיציה מחדש). זה הדבר הראשון שכל שחקן רואה.
```
Key art for THE WORKER LIFE. A small boy in a red t-shirt (attach pogi.png —
the same child) seen from behind, standing at the top of a concrete terrace
step, looking down at a full sunlit football ground; a man's hand (his father's,
attach kobi.png) resting on his shoulder from the edge of the frame. Red and
white everywhere in the crowd below as colour, no faces. Late-afternoon glare,
dust, paper in the air. Painted photoreal, cooler than it looks right, NO TEXT
(the title is a separate layer), no yellow. Two compositions: 1600x900 and
1080x1920 (portrait: the boy lower, the ground rising above him).
```

### 4.2 אייקון · **1024×1024**
```
App icon, 1024x1024, flat: a single red (#C4342F) square field with a small
cream (#EDE6D8) square inside it offset to the lower-left corner — nothing
else. No text, no gradient, no shadow, no rounded corners (the OS rounds it).
```
(זה הלוגו של המותג בצורתו הפשוטה ביותר; אם אתה מעדיף את הסמל הקיים מ-`/brand` — תגיד ואייצר ממנו.)

### 4.3 מפת השכונה, מצוירת ביד · **1600×1600**
המפה במשחק היא רשימה. עם ציור היא הופכת לחפץ — פוגי מצייר אותה במחברת.
```
A child's hand-drawn map of a South Tel Aviv / Jaffa neighbourhood in pencil
and red crayon on squared exercise-book paper, 1600x1600. Blocks as rough
rectangles, one long street left-to-right, a small square with a kiosk, a
football pitch as a green rectangle, a basketball hall as a box with a roof,
and at the far right a big oval stadium with little floodlight poles, all
drawn the way an eight-year-old draws. Arrows, an X, a little sun. NO letters
or words (labels come from the game). Paper texture, creases, a pencil
smudge. No yellow (the crayon is red; the "sun" is drawn in pencil).
```

### 4.4 הקופסה האדומה · **512×512 ×3**, PNG שקוף
`propRedBoxClosed` — a small red tin box with a hinged lid, scuffed, on nothing · `propRedBoxOpen` — the same box open, lid back, cream cloth lining, empty · `propRedBoxFull` — the same open box with a scarf end, a ticket stub and folded paper inside (no legible text).

### 4.5 הבעות לדוברים הראשיים · **1536×512 לכל אחד** (6 פנים על קרם, כמו הקיימים)
לכל אחד יש היום פלייט אחד; הדיאלוג צריך פנים שמשתנות. **לצרף את הפלייט הקיים** בכל פעם.
- `faceKobi-*`: neutral · warm smile · shouting with joy · worried · hoarse-laughing · looking away
- `faceRachel-*` (1986): neutral · half-smile · "what now" · warning · soft · tired
- `faceOfir-*`, `faceAmit-*`, `faceKeren-*` (1986): neutral · grin · shout · sulk · surprised · whisper
- `facePogi` קיים (5). **חסר:** `facePogi-scared`, `facePogi-proud`.
- `faceHero80-*` קיים (7). ✓

### 4.6 קהל לאוסישקין — שכבות שקופות · **1600×900** PNG
לליל הדרבי מניחים קהל על האולם הריק בלי לצייר את האולם מחדש. **לצרף** את הזווית המתאימה. שלוש שכבות לכל זווית (`ussMain`, `ussCream`):
- `<key>--crowdStand`: the seats of the stand in the attached painting FULL of people in red and white, drawn ONLY where the seats are, everything else transparent; aligned pixel-for-pixel to the painting.
- `<key>--crowdRail`: a standing row of supporters along the sideline rail in front of the stand, transparent elsewhere, feet on the floor line.
- `<key>--night`: the same painting's window strip painted black and the roof lights on — as a transparent overlay that only covers the windows and adds the light halos.

### 4.7 שחקני כדורסל — הקבוצה השנייה · **2048×768**
```
Green screen. Six basketball players in plain WHITE kit with a thin blue trim
(NOT yellow, NOT gold — plain white), NO numbers, NO lettering; same six poses as
the red sheet (ball on hip, dribble, shoot, stretch, walking away, hands on
knees). Same scale, 40px gaps.
```

### 4.8 חפצים קטנים שחסרים · 512×512 שקוף
`propHouseKey` (the key on a string — the 1986 lock has no picture!) · `propBottle` (glass deposit bottle) · `propTicket86` — כבר קיים כסריקה (`docTicket`) · `propTransistorHeld` (the transistor from above, in a hand-sized crop) · `propPocketMoney` (a 1990 banknote folded in four — NO legible numerals or portrait; treat as a folded pale-blue paper).

---

## 5. סדר עדיפות
1. `panoReveal`, `panoUssHall`, `panoKitchen90` (A רץ עליהן ראשון) · 2. טקסטורות המנהרה (B) · 3. קלוז-אפים `cuKobiWhere`, `cuPogiReveal`, `cuRachelNu` (C) · 4. key art + אייקון (4.1–4.2) · 5. המפה, הקופסה, המפתח · 6. הבעות (4.5) · 7. קהל אוסישקין + הקבוצה הלבנה (למערכה השנייה) · 8. שאר הפנורמות והקלוז-אפים.

**איך לשלוח:** אותה תיקייה, אותם שמות-מפתח, PNG במידה המדויקת. פנורמות — אחרי שאתה מייצר, לבדוק שהקצה השמאלי והימני מתחברים (להצמיד עותק ליד עותק).
