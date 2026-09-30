# THE WORKER LIFE — מה שאני צריך שתייצר, ולמה

*3.9.2026. כל פרומט כאן מוכן להעתקה. הם מסודרים לפי כמה זה דחוף באמת.*

---

## למה זה נפתח עכשיו — הביקורת שלך צודקת, והנה המספרים

בדקתי כל רקע במשחק מול הגודל שבו הוא **באמת מוצג** (המנוע מותח כל רקע ל-1600 פיקסלים):

| רקע | מה יש | הגדלה בפועל | מצב |
|---|---|---|---|
| **המטבח** | 372×450 | **×4.3** | מטושטש. הכי גרוע במשחק |
| **הקיוסק** | 518×476 | **×3.1** | מטושטש |
| **חדר השינה** | 543×417 | **×3.0** | מטושטש |
| היציע (`stand`) | 1017×508 | ×1.6 | חיתוך מלוח |
| אוסישקין חוץ/פנים | ~1020×450 | ×1.6 | חיתוך מלוח |
| המגרש | 1068×530 | ×1.5 | חיתוך מלוח |
| הסלון | 1105×737 | ×1.45 | חיתוך מלוח |
| המנהרה | 1111×543 | ×1.44 | חיתוך מלוח |
| ההתגלות (`reveal`) | 1348×470 | ×1.2 | חיתוך מלוח |
| **הרחוב · הדרך · שער 7** | 1600 | ×1.0 | **מצויר לצורך. זה הרף** |

**11 מתוך 15 הרקעים הם עדיין חיתוכים מלוחות קונספט.** ארבעה שציירת בספטמבר הם היחידים
שנראים כמו משחק. זה כל הפער — ולא צריך לגעת בשורת קוד אחת כדי לסגור אותו: אני מחליף קובץ
ומכייל מחדש את רצועת ההליכה.

---

# חלק 0 — הכללים שחלים על **כל** פרומט כאן

העתק את הבלוק הזה לתחילת כל פרומט של רקע. הוא מה שגורם לקבצים ליפול ישר לתוך המנוע.

```
STYLE: photorealistic painted matte background, cinematic adventure-game art.
South Tel Aviv / Jaffa, 1986. Sun-bleached plaster, iron shutters, dust, worn
concrete, exposed wiring, aged paint. Hand-painted texture, not photography,
not 3D render, not illustration, not cartoon.

CRITICAL — no people. Not one figure, not a silhouette, not a shadow of a person.
The characters are separate sprites the engine places on top. A painted person
in the background can never move, and every one of them has to be erased by hand.

CRITICAL — no text. No signs with lettering, no posters with words, no numbers,
no graffiti with readable characters. Shapes and colour only. All text in this
game comes from a translation file; a painted Hebrew sign that says the wrong
thing is a bug I cannot fix without repainting.

COLOUR: cooler and flatter than looks right. The engine applies its own warm
grade and vignette on top, so a frame that looks perfect on its own comes out
orange in the game. Push the whites toward grey, keep contrast moderate,
leave the shadows open.

NO YELLOW. Absolutely none — no gold, no mustard, no hi-vis, no yellow-green.
Yellow is the rival's colour and the build fails on a single yellow pixel.
Warm tones must be brick, rust, terracotta, ochre-brown, never yellow.

OUTPUT: PNG, exactly the pixel size stated below, no border, no frame,
no watermark, full bleed to all four edges.
```

**נגטיב לכל רקע** (אם המחולל שלך תומך):

```
people, person, figure, silhouette, crowd, human, text, letters, words, signage,
watermark, logo, frame, border, vignette, yellow, gold, mustard, HDR, oversaturated,
lens flare, modern cars, modern phones, air conditioners, satellite dishes, plastic
furniture, 3D render, cartoon, anime, illustration, sketch
```

**וזה החשוב טכנית — רצועת ההליכה.**
לכל חדר יש פס אופקי שבו הילד הולך. הפס הזה חייב להיות **רצפה פנויה**: בלי רהיטים, בלי
מדרגות, בלי חפצים. אם משהו עומד שם — או שהילד עובר דרכו או שהוא לא יכול להגיע לדלת.
בכל פרומט למטה כתוב במפורש איזה חלק מגובה התמונה הוא הפס הזה.

---

# חלק 1 — הרקעים. לפי סדר דחיפות

## 1.1 המטבח · `kitchen` — **הכי דחוף, ×4.3 הגדלה**

**גודל: 2048 × 1152 (16:9)**

```
[הדבק כאן את חלק 0]

A small working-class kitchen in a Jaffa flat, 1986. Straight-on three-quarter
view from just inside the doorway, camera at an adult's chest height, wide lens.

LAYOUT, as fractions of the frame width, right to left:
· 0.00–0.22  the doorway back to the living room: a plain wooden door frame,
             open, darker room beyond it.
· 0.22–0.55  the work counter: chipped formica top, an enamel sink under a
             small window, a dish rack, a kettle, a tin of oil, a bread board.
· 0.55–0.80  a tall pale-green metal cabinet and an old fridge with a rounded
             top and a chrome handle.
· 0.80–1.00  a small square table against the wall with an oilcloth cover in a
             faded red-and-white check, two mismatched wooden chairs pushed in,
             and a folded newspaper lying on it.

VERTICAL: floor tiles from 0.76 to 1.00 of the frame height — small octagonal
terrazzo, worn, slightly uneven. Walls above, painted a pale institutional
green to waist height and whitewash above, with the join line visible.

WALK BAND: the horizontal strip from 0.76 to 0.95 of the frame height must be
CLEAR FLOOR across the full width. Nothing standing in it. The table and chairs
sit ABOVE 0.76 against the wall, not out in the room.

LIGHT: late morning through the window over the sink, cool and flat, no direct
sun patch on the floor. One bare bulb hanging, switched off.

DETAIL that makes it 1986 Israel: a paraffin heater in a corner, a wall-mounted
bottle opener, a plastic soda siphon, a wire basket of eggs, a calendar page
with no readable text (shapes only), a small tiled splashback.
```

---

## 1.2 הקיוסק · `kiosk` — **×3.1 הגדלה**

**גודל: 2048 × 1152 (16:9)**

```
[הדבק כאן את חלק 0]

The INSIDE of a small neighbourhood kiosk in Jaffa, 1986, seen from where a
customer stands. Camera at a child's eye height — low, about 1.2 metres —
looking slightly up at the counter. This low camera is important: the whole
scene is an eight-year-old at a counter he can barely see over.

LAYOUT, right to left:
· 0.00–0.18  the doorway out to the street, bright daylight beyond, the edge
             of a striped awning visible.
· 0.18–0.72  the counter itself, running across the frame: a scratched wooden
             top at about 0.62 of the frame height, a glass-fronted case
             underneath with sweets in open boxes, a set of scales, a cigarette
             rack behind, a small till.
· 0.72–1.00  shelving to the ceiling: glass soda bottles in wooden crates,
             tinned goods, cigarette cartons, a stack of newspapers.

VERTICAL: worn stone floor from 0.84 to 1.00.

WALK BAND: 0.84 to 0.96 of the frame height, clear floor across the full width.
The counter must END above it — the child walks in FRONT of the counter.

LIGHT: dim inside, one fluorescent tube overhead giving a flat cool light, and
strong daylight spilling in from the doorway on the right creating the only
bright area. The contrast between the two is the whole picture.

DETAIL: a wall telephone, a fly strip, a crate of empty bottles on the floor
against the counter base, a rubber mat, an ice-cream chest freezer with a
rounded lid, a stack of folded newspapers tied with string.
```

---

## 1.3 חדר השינה · `bedroom` — **×3.0 הגדלה**

**גודל: 2048 × 1152 (16:9)**

```
[הדבק כאן את חלק 0]

A boy's bedroom in a small Jaffa flat, 1986, shared with nobody. Straight-on
view from the doorway, camera at a child's standing eye height, wide lens.
This is the first room of the game and the first thing anyone sees.

LAYOUT, right to left:
· 0.00–0.16  the bedroom door, open, hallway beyond.
· 0.16–0.42  a single iron-framed bed against the wall, grey blanket pulled up
             badly, one flat pillow, a folded football shirt on the end of it.
· 0.42–0.60  a small wooden chest of drawers, the top drawer very slightly
             open, a tin box and a comb on top.
· 0.60–0.78  a window with the shutter half down, slats casting a soft striped
             light, a strip of street visible through the gap.
· 0.78–1.00  a wall with a bare patch where a poster is meant to go — leave a
             clean rectangle of empty wall about 0.20 wide and 0.28 tall,
             centred at about 0.88 across and 0.30 down. THE POSTER IS A
             SEPARATE ASSET AND THE GAME PLACES IT THERE. Do not paint one.

VERTICAL: worn terrazzo floor from 0.82 to 1.00, a small threadbare rug.

WALK BAND: 0.84 to 0.97 of the frame height, clear floor across the full width.
The bed and the drawers sit against the wall ABOVE it.

LIGHT: early Saturday morning. Shutter light in soft horizontal bars across the
floor and the bed. Cool, quiet, blue-grey shadows. Nothing dramatic.

DETAIL: a school satchel on the floor by the drawers, a pair of worn trainers
side by side, a plastic football under the bed with only a curve of it showing,
a chipped enamel light switch, a crack in the plaster.
```

---

## 1.4 הסלון · `living`

**גודל: 2048 × 1152 (16:9)**

```
[הדבק כאן את חלק 0]

The living room of a small working-class Jaffa flat, 1986. Straight-on view
from the hallway, camera at adult chest height, wide lens.

LAYOUT, right to left:
· 0.00–0.14  the way back to the bedroom and kitchen — a dark hallway opening.
· 0.14–0.44  a low sofa with a woven brown-and-rust cover, two flattened
             cushions, a folded blanket over one arm.
· 0.44–0.60  a heavy armchair angled slightly toward the corner, clearly the
             one chair in the house that belongs to one person. An ashtray on
             a stool beside it. THIS CHAIR MATTERS — the whole chapter comes
             back to it. Make it the most specific object in the frame.
· 0.60–0.76  a low wooden table with a lace cloth, a radio with a fabric
             speaker grille and two round dials, a glass ashtray.
· 0.76–1.00  the front door of the flat: a solid wooden door with a small
             frosted-glass panel high up, a metal handle, a key hanging on a
             nail beside it. Bright daylight visible through the frosted panel —
             this door has to read as the way OUT even from across the room.

VERTICAL: floor from 0.74 to 1.00, patterned terrazzo tiles.

WALK BAND: 0.74 to 0.97 of the frame height, clear floor across the full width.
All furniture sits above the line or hard against the walls.

LIGHT: mid-morning. Flat, even, cool. The brightest thing in the frame is the
frosted panel of the front door.

DETAIL: a framed photograph on the wall with no readable content, a rug worn
through in a track between the sofa and the door, an electric fan on the floor,
a bookshelf with a few books and a stack of folded newspapers.
```

---

## 1.5 המגרש · `pitch`

**גודל: 2048 × 787 (2.6:1)**

```
[הדבק כאן את חלק 0]

A rough neighbourhood football pitch behind the buildings in Jaffa, 1986. Not
a real pitch — a beaten patch of dirt and gravel between apartment blocks.
Camera at an adult's eye height, standing at one edge, wide lens.

LAYOUT, right to left:
· 0.00–0.20  the gap between two buildings you arrive through, deep shadow.
· 0.20–0.70  the playing surface: packed dirt, patches of gravel, a few tufts
             of dry grass at the edges, tyre-worn tracks, one bald area where
             a goalmouth clearly is.
· 0.55–0.72  a goal made of scaffolding poles with no net, leaning slightly.
· 0.70–1.00  a low breeze-block wall about waist height with a chain-link fence
             above it, apartment balconies rising behind, laundry lines.

VERTICAL: the ground runs from 0.66 to 1.00. Horizon and buildings above.

WALK BAND: 0.68 to 0.94 of the frame height, clear open ground across the full
width. The goal sits at the far edge of it, not in the middle of the walk.

LIGHT: early afternoon, high sun, but overcast-bright rather than harsh —
diffuse, cool, with soft short shadows. No hard sun patches.

DETAIL: two stones marking a goal on the near side, a punctured ball against
the wall, a bicycle leaning on the fence, an oil drum, dry weeds along the base
of the wall, a faded painted line nobody has repainted for ten years.
```

---

## 1.6 היציע · `stand` — **הרגע הכי חשוב במשחק**

**גודל: 2560 × 985 (2.6:1) — גדול יותר בכוונה, זה מסך הגמר**

```
[הדבק כאן את חלק 0]

Inside Bloomfield Stadium, 1986, from the terrace at gate 7 — standing in the
crowd, at a CHILD'S eye height, looking out over the pitch. Late afternoon.

This is the payoff shot of the entire chapter. Everything else in the game is
walking toward this frame.

CRITICAL EXCEPTION TO "NO PEOPLE": this frame needs a crowd, because a stadium
without one is a photograph of concrete. BUT — the crowd must be the FAR side
of the ground and the middle distance only, small, blurred, impressionistic,
never individual faces, and NOTHING in the near foreground. The near terrace
steps must be EMPTY, because that is where the game stands the child and his
father, and they are separate sprites.

LAYOUT:
· 0.00–0.16 of the height: the roof edge of the far stand, floodlight pylons
  breaking the skyline, a pale late-afternoon sky going warm at the edges.
· 0.16–0.42: the far stand, packed, a wash of red and cream and skin tones at
  a distance, banners as blocks of colour with NO readable text, smoke from
  a flare drifting across.
· 0.42–0.72: the pitch — worn green, more brown than green at the ends, the
  markings faded, the whole thing seen at an angle from behind one goal.
· 0.72–0.86: the near touchline, an advertising hoarding (blank panels, no
  text), a photographer's bench, the perimeter wall.
· 0.86–1.00: THE NEAR TERRACE, EMPTY. Concrete steps, a steel crush barrier
  running across at about 0.90, litter, a scarf tied to the barrier.

WALK BAND: 0.86 to 0.97 of the frame height. Empty concrete terracing across
the full width. The crush barrier is the only thing in it and it must run
horizontally so a child can stand behind it.

LIGHT: 17:40, sun low and behind the far stand, so the far side is rim-lit and
the near terrace is in shadow. The pitch catches the last of the light. Cool
shadow in the foreground, warm light across the grass. Floodlights on but not
yet dominant.

MOOD: enormous. The frame should make an eight-year-old feel small.
```

---

## 1.7 המנהרה · `corridor`

**גודל: 2048 × 787 (2.6:1)**

```
[הדבק כאן את חלק 0]

The players' tunnel / terrace access passage at Bloomfield, 1986. A dark
concrete passage seen from inside, looking OUT toward the light of the stand.
Camera at a child's eye height, walking through.

LAYOUT: the passage runs away from the camera to a bright opening centred at
about 0.52 across and occupying 0.30 to 0.78 of the frame height. Everything
else is dark concrete: rough shuttered walls, a low ceiling with a conduit and
two caged bulbs, a puddle on the floor reflecting the opening.

The opening at the end must be BLOWN OUT — pure light, almost no detail, so
that walking toward it reads as walking into something.

VERTICAL: floor from 0.58 to 1.00, wet concrete, worn smooth in the middle.

WALK BAND: 0.60 to 0.94 of the frame height, clear floor down the middle of
the passage.

LIGHT: two dim caged bulbs, and the enormous overexposed opening at the end.
Nearly monochrome — cold grey concrete — with the light at the end the only
warm thing in the frame.

DETAIL: a steel handrail along one wall, a drain grate, chipped paint at
knee height where thousands of people have brushed past, a stack of folded
crush barriers against a wall.
```

---

## 1.8 ההתגלות · `reveal` — כרטיס מעבר, לא מיקום

**גודל: 2560 × 985 (2.6:1)**

```
[הדבק כאן את חלק 0]

Bloomfield Stadium 1986 seen for the first time by a child stepping out of a
dark tunnel into the stand. This is a TRANSITION CARD, not a place — it plays
for five seconds and slowly scales up. Nobody walks in it, so there is no walk
band and no empty floor requirement.

Compose it like the first frame of a film: the mouth of the tunnel as a dark
frame around the edges of the picture, and the ground exploding with light in
the middle. Crowd, colour, smoke, floodlight pylons, the pitch below.

Crowd in the middle and far distance only, impressionistic, no faces, no text
on any banner. The dark tunnel frame occupies the outer 0.12 of every edge.

LIGHT: the strongest contrast in the whole game. Near-black at the edges,
blazing at the centre.

MOOD: the moment the noise arrives.
```

---

## 1.9 בלומפילד מבחוץ, רחב · `ground`

**גודל: 2048 × 787 (2.6:1)**

```
[הדבק כאן את חלק 0]

Bloomfield Stadium from outside, 1986, seen from across the road — the whole
ground in one frame, not the gate. Late afternoon.

The floodlight pylons are the most important thing in this picture. Four
lattice steel towers, tall and thin, each with a rectangular head of lamps in
rows. Get them right and everything else can be approximate.

LAYOUT: the stadium occupies 0.15 to 0.80 of the frame height and runs across
the full width — a low concrete bowl with a red-painted roof edge, pylons
rising well above it at roughly 0.18, 0.38, 0.62 and 0.84 across.
Below 0.80: the road, a pavement, a low wall, parked cars of the period.

WALK BAND: 0.82 to 0.96 of the frame height, clear pavement across the width.

LIGHT: low sun from the left, long shadows across the road, the pylons
catching the last light on their west faces. Sky pale and cooling.

DETAIL: crush barriers stacked against a wall, a bus stop, a kiosk shutter
down, weeds through the pavement cracks, a hand-painted wall with no readable
text.
```

---

## 1.10 + 1.11 אוסישקין · `ussExt`, `ussHall`

**גודל: 2048 × 787 (2.6:1) לכל אחד**

```
[הדבק כאן את חלק 0]

(A) ussExt — the outside of a small municipal sports hall in Tel Aviv, 1970s
build, seen from the street. Flat concrete façade, a row of high windows with
metal frames, double doors under a small canopy, a few steps up. A tarmac
forecourt below with painted lines nobody maintains. Cypress trees at one edge.

WALK BAND: 0.80 to 0.95 of the frame height, clear tarmac across the width.
Steps and doors sit above it.

(B) ussHall — the INSIDE of the same hall: a basketball court under a barrel
roof with exposed steel trusses and hanging lamps. Worn wooden floor with faded
painted lines. Wooden fold-out bleachers along one side, mostly folded away.
Backboard and hoop at the far end. High windows letting in flat daylight.

WALK BAND: 0.78 to 0.95 of the frame height, clear floor across the width.

LIGHT for both: flat, cool, institutional. Nothing dramatic. These are the
memorial wing and they should feel quiet and slightly too empty.
```

---

# חלק 2 — פוגי. שלושה קבצים, והם הכי דחופים אחרי המטבח

**רקע ירוק לכל הגיליונות:** `#00B140` שטוח לגמרי, בלי גרדיאנט, בלי ויניאט, בלי צל על
הרקע. הצל של הדמות — אם יש — חייב להיות **מתחת לרגליים בלבד ועל הדמות**, לא על הירוק.

**רווחים:** בין דמות לדמות חייב להיות רווח נקי של ירוק ברוחב 40 פיקסלים לפחות. הסקריפט
שלי חותך על הרווחים — אם יד של אחד נוגעת בכתף של השני, שניהם יוצאים דמות אחת.

---

## 2.1 גיליון הליכה של פוגי — 8 פריימים

**גודל: 2560 × 640. שורה אחת. שמונה דמויות.**

```
Character sheet, green screen #00B140, flat, no gradient.

The same eight-year-old boy in all eight frames — and he MUST be the boy in the
attached `pogi.png` and `pogi-side.png`: dark straight-curly hair over the
forehead, red t-shirt with the small white club badge on the chest, long blue
jeans, white trainers with green stripes. NOT shorts, NOT plain shirt, NOT
socks — the first delivery (3.9.2026) drew a different, younger boy in shorts
and was shelved for that reason alone. South Tel Aviv, 1986. Photorealistic
painted style matching the attached reference of the same character.

EIGHT FRAMES OF A WALK CYCLE, SEEN FROM THE SIDE, WALKING TO THE LEFT.
Full body, feet included, head to toe inside the frame, all eight at exactly
the same height and the same distance from camera.

The eight poses in order:
1. contact — left foot forward and flat, right foot back on the toe
2. down    — weight over the left leg, body at its lowest, right foot lifting
3. pass    — right leg swinging through beside the left, body rising
4. up      — body at its highest, right foot about to reach forward
5. contact — right foot forward and flat, left foot back on the toe
6. down    — weight over the right leg, body at its lowest
7. pass    — left leg swinging through
8. up      — body at its highest, left foot about to reach forward

Arms swing opposite to the legs. The head bobs slightly with the body. This is
a child's walk — a little loose, a little fast, not a march.

Even 40px green gaps between frames. Nothing overlapping.
```

---

## 2.2 פוגי נער — גיל 13–15

**גודל: 2048 × 1024. שתי שורות של שבע.**

```
Character sheet, green screen #00B140, flat.

The SAME boy as the attached reference, now thirteen or fourteen. Taller,
thinner, longer limbs, the face lengthening, hair still dark and curly but
longer and deliberately untidy. Tel Aviv, early 1990s. He should be
recognisably the same person as the eight-year-old — same eyes, same jaw.

Clothes: a faded red club t-shirt or a plain long-sleeve, jeans or tracksuit
bottoms, cheap trainers. Nothing branded, nothing with readable text.

ROW 1 — seven standing poses, full body, head to toe:
front · three-quarter · side (facing left) · back · walking (side) ·
hands in pockets, shoulders up · arms folded, chin down

ROW 2 — seven more:
sitting on a wall, feet hanging · leaning on a wall, one foot up ·
crouched, elbows on knees · shouting, both arms up · scarf held above his head
with two hands · looking back over his shoulder · walking away (back view)

Even 40px green gaps. All figures the same height and camera distance.
```

---

## 2.3 לוח פנים של פוגי — לתיבת הדיאלוג

**גודל: 1536 × 512. שורה אחת. שש פנים.**

```
Portrait plate sheet. NOT green screen — plain warm cream background #EDE6D8,
flat, no texture.

Six head-and-shoulders portraits of the SAME eight-year-old boy from the
attached reference, painted in the same photorealistic style. Head fills about
70% of each cell height. Shoulders visible. Warm cream ground behind each.

The six: neutral · half-smile · wide-eyed / surprised · shouting with joy ·
looking down, disappointed · three-quarter, looking off to the side.

Even 40px gaps between portraits.
```

---

# חלק 2ב׳ — שלוש דמויות שעדיין מצוירות בסגנון הישן (דחוף, נראה בכל משחק)

בסריקה של 3.9.2026 של כל דמות שהמשחק מציב על הבמה, שלוש בלבד נשארו חיתוכים מלוח
הקונספט הראשון — ראש גדול, קו-מתאר צבוע, "צ'יבי" — ועומדות ליד פוגי, אופיר ועמית
הפוטוריאליסטיים: **קרן** (הרחוב), **אפי** (המגרש), **בעל הקיוסק** (`oldMan`, הוחלף
זמנית באחד ה-adults). כל אחת מהן שוברת את התמונה יותר מכל רקע חסר. מפרט אחד לשלושתן:

**גודל: 2048 × 1024 לדמות. שתי שורות. אותו סגנון ואותו גובה-מצלמה כמו הרפרנס של פוגי.**

```
Character sheet, green screen #00B140, flat, no gradient.
Photorealistic painted style matching the attached reference of Pugi.
Full body, feet included, seven poses per row, even gaps, same height.

KEREN — an eight-year-old girl, dark hair in a ponytail, red-and-white striped
t-shirt, blue shorts, sandals. South Tel Aviv, 1986.
ROW 1: standing front · three-quarter · side · back · sitting on a low wall,
legs dangling · arms crossed · pointing.
ROW 2: walking side-on, four strides · laughing · shouting · hands on hips.

EFI — a nine-year-old boy, big dark curls, plain red t-shirt, dark shorts,
scuffed trainers, a football under his arm in two poses.
ROW 1: standing front · three-quarter · side · back · crouching over a ball ·
kicking · arms wide.
ROW 2: walking side-on, four strides · dribbling · celebrating · sulking.

KIOSK OWNER — a man about sixty, heavy, grey moustache, white short-sleeved
shirt over a vest, dark slacks, reading glasses pushed up. Behind a counter in
two poses.
ROW 1: standing front · three-quarter · side · back · leaning on the counter ·
handing something over · reading a newspaper.
ROW 2: pointing outside · arms folded · laughing · shrugging · counting coins ·
wiping the counter · sitting on a stool.
```

---

# חלק 3 — הדמויות שמופיעות בקוד ואין להן קובץ

46 שמות ב-`PLANNED_FIGURE` ב-`lib/life/runtime/art.ts` מחכים לקבצים. הם נחתכו פעם
מלוחות שלא הגיעו למאגר. **עדיף לצייר אותם מחדש בסגנון ספטמבר** מאשר לחפש את הלוחות
הישנים — עירוב של חיתוך מלוח ישן עם דמות מספטמבר הוא בדיוק הפער שפוגי בא לסגור.

## 3.1 משה סיני — הגיבור על הקיר

**גודל: 2048 × 1024. שתי שורות.**

```
Character sheet, green screen #00B140, flat.

An Israeli footballer of the mid-1980s, late twenties, athletic, dark hair,
moustache, in a plain RED and white football kit of the period — short shorts,
crew socks, low leather boots. No club crest, no sponsor, no number, no text
of any kind. Photorealistic painted style matching the attached references.

ROW 1 — in kit, full body, head to toe, seven poses:
standing front · standing three-quarter · side · back · running with the ball ·
striking the ball · arms raised in celebration

ROW 2 — same man in 1986 CIVILIAN clothes, seven poses:
standing front, open shirt and slacks · three-quarter, hands on hips ·
side, walking · leaning against something · pointing · seated · back view

Even 40px green gaps. All figures the same height.
```

## 3.2 שלום תקוה

**גודל: 2048 × 1024. שתי שורות.** אותו פרומט כמו 3.1, עם ההבדלים:

```
A different Israeli footballer of the mid-1980s — leaner, clean-shaven,
lighter build, hair straighter. Must be clearly a DIFFERENT PERSON from the
attached Sinai reference: different face, different build, different hair.

ROW 1 — home kit (red/white), seven poses as above.
ROW 2 — away kit (white with red trim), seven poses as above, plus one with
a captain's armband.
```

## 3.3 פוגי חייל — צה"ל, 1996

יש כבר גיליון חייל (`pogiIDF-*`). מה שחסר זה **הפוזות** שהקוד מבקש ואין להן קובץ:

**גודל: 2048 × 1024. שתי שורות של שבע.**

```
Character sheet, green screen #00B140, flat.

The same young man as the attached soldier reference, Israeli conscript, 1996.
Olive-green fatigues, boots, no insignia, no unit markings, no text, no flags.

ROW 1: standing at ease · standing to attention · side · back · marching ·
with a kitbag over one shoulder · sitting on a crate

ROW 2: tired, sitting with head back · shouting · tying a bootlace, crouched ·
walking away with the kitbag · leaning on a wall · looking at something in his
hand · standing with a beret in his hand

IMPORTANT: no weapons in any frame. No rifle, no holster, no ammunition.
```

## 3.4 אופיר בשנות ה-90

**גודל: 1536 × 512. שורה אחת, שבע פוזות.**

```
Character sheet, green screen #00B140, flat.

The same character as the attached 1986 Ofir reference, now about twenty.
Still the buzz cut — this is his one fixed feature and it must not change.
Taller, heavier in the shoulders. Early-90s Tel Aviv clothes: a plain
tracksuit top or a t-shirt, jeans.

Seven poses: standing front · three-quarter · side · back · sitting on a wall ·
arms folded · walking away.
```

---

# חלק 4 — שלב ב׳, 1990. תכין את זה מראש אם יש לך זמן

הפרק הבא זה הילד בגיל 12, 1990. הוא צריך **את אותו רחוב, ארבע שנים אחרי**:

```
[חלק 0, ואז:]

THE SAME STREET as the attached 1986 reference frame — same buildings, same
kiosk, same doorway, same camera position, same lens, same framing — but four
years later, in 1990.

What changed: the kiosk has a new metal shutter and a fresh coat of paint. One
building has been re-rendered and is now a different shade. There is a satellite
dish on one balcony. The cars at the kerb are early-90s models. The wiring is
messier. A wall that was blank is now covered in layers of torn posters (no
readable text). The tree is noticeably bigger.

What must NOT change: the position of every doorway, the kiosk opening, the
alley, and the road east. The game walks a child through the same coordinates.

Same size as the reference: 2048 × 787.
```

אותו רעיון, אותה מסגרת בדיוק, ל: **הסלון**, **שער 7** ו**המטבח** ב-1990.

---

# חלק 4ב׳ — 1990 רץ עכשיו. מה חסר לו כדי להיראות כמו 1990

השלב השני נבנה על אותם חדרים של 1986 עם אנשים אחרים בהם. הקוד יודע להחליף רקע לפי שנה
(`era` על כל דבר בחדר); מה שאין לו הוא ציורים של 1990. לפי סדר החשיבות:

## 4ב.1 הרחוב ב-1990 — אותו רחוב, אחרת
**גודל: 1600 × 625, כמו `street.png`. אותה זווית בדיוק.** אותם בניינים, אותה פינה עם
הקיר, אותו קיוסק — ארבע שנים מאוחר יותר: מכוניות של 1990 (סובארו, אוטוביאנקי), מודעות
"מחזור אחרון" על העמוד, כביסה, אנטנות, קצת יותר שחיקה. בלי אנשים. בלי צהוב.

## 4ב.2 חדר השינה ב-1990
**גודל: 1600 × 900 (החדר הישן הוא 543px ומטושטש — לצייר מחדש גם ל-1986).** אותו חדר,
אותה מיטה — אבל: פוסטרים של הפועל במקום ציורי ילדים, תיק בית ספר גדול, קלטות, צעיף על
מסמר ליד הדלת, הכדור נעלם. שתי גרסאות מאותה זווית: 1986 (נקי, ילד) ו-1990 (מלא, נער).

## 4ב.3 רחל ב-1990
**גודל: 2048 × 1024.** אותה אישה מ-`faceRachel`, ארבע שנים מאוחר יותר, פוטוריאליסטי כמו
קובי. שורה 1: עומדת · ידיים משולבות · עם סל כביסה · מצביעה · יושבת · פרופיל · מהגב.
שורה 2: במטבח ליד השיש · מוזגת · מדברת בטלפון · מחייכת · מרימה גבה · צוחקת · דלת.

## 4ב.4 בעל הקיוסק (כבר במפרט 2ב׳) — ב-1990 הוא אותו אדם, יותר אפור.

---

# חלק 5 — איך לשלוח

- **PNG בלבד**, ברזולוציה המקורית. לא JPG — הצהוב חוזר בדחיסה, זה כלל 27 במאגר.
- שם קובץ באנגלית, בלי רווחים: `kitchen.png`, `pogi-walk.png`, `sinai.png`.
- אם יצאו כמה גרסאות — שלח את כולן. אני בוחר לפי איך שהן נראות **אחרי** הגרייד של
  המנוע, וזה לא תמיד היפה ביותר לבד.
- **אל תעשה תיקון צבע.** אני מריץ הכול דרך אותו צינור (הסרת צהוב, פלטה, הסרת שוליים),
  ותמונה שכבר תוקנה עוברת את זה פעמיים.

---

## מה אני עושה בזמן שאתה מייצר

הכול כאן הוא **החלפת קובץ**. אין שורת קוד אחת שצריכה להשתנות: המנוע מקבל מפתח, קורא
תמונה, וכל קואורדינטה בעולם היא שבר מגובה התמונה ולא פיקסל. כשהקבצים מגיעים אני מריץ את
הצינור, מכייל מחדש את רצועות ההליכה, ומריץ את הבדיקות.
