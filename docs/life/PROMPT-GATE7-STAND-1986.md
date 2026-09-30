# שער 7 · הפרומט המדויק · `stand.png` (מחליף את הקיים)

*5.9.2026. שתי התמונות שלך (היציע, ואז היציע + שלטי הפרסומת + ספסל המחליפים) הן **המקור**.
המבנה לא משתנה — רק הצבע, התקופה, ומה שהמנוע חייב כדי להעמיד עליו אנשים.*

---

## 1. מה אני מייצר ולמה דווקא ככה

הזווית שלך היא **מהדשא אל היציע**. זה בדיוק מה שצריך: היציע הופך ל"רצפה" של הסצנה —
הילד הולך לרוחב על המדרגות, האוהדים יושבים/עומדים על שורות מעליו, והמצלמה מסתכלת עליו
מהצד של המגרש. לכן:

- **המדרגות = משטח ההליכה.** הן חייבות לרוץ **אופקית ובמרווחים אחידים** לכל הרוחב, אחרת
  ספרייט של אוהד "צף" בין שתי מדרגות.
- **הציור ריק מאנשים.** כל אדם בפריים הוא ספרייט שאני מציב — כולל האוהדים, כולל אבא.
  אדם מצויר לא זז, ולא אפשר לעבור מאחוריו.
- **הגדר, שלטי הפרסומת, הספסל והדשא נשארים בתחתית** ומתחת לקו ההליכה: הילד עומד
  **מאחורי** הגדר תמיד, וזה מה שנותן את התחושה שהוא ביציע ולא על המגרש.

**גודל: 2560 × 1440 (16:9).** אני מקטין ל־1600×900 — בדיוק המידות של `stand.png` היום,
כך שהחדר לא זז ואף חדר אחר לא נוגע בזה.

---

## 2. הפרומט — להעתיק כמו שהוא

```
STYLE: photorealistic painted matte background, cinematic adventure-game art.
Bloomfield Stadium, Tel Aviv, 1986 — the Gate 7 home terrace, seen from the
pitch. Hand-painted texture, not photography, not 3D render, not illustration,
not cartoon. Sun-bleached concrete, worn paint, rust, dust.

REFERENCE: reproduce the attached photograph's ARCHITECTURE EXACTLY — the same
stand, the same proportions, the same elements in the same places. Do not
redesign it, do not add tiers, do not change the roofline, do not move the
stairways. The only changes are the ones listed under CHANGES below.

CAMERA: standing on the grass at the edge of the pitch, straight on to the
stand, at an adult's eye height. The stand fills the frame. No pitch markings,
no goal, no other stand, no sky beyond the treeline.

STRUCTURE — copy from the reference, top to bottom (fractions of frame height):
· 0.00-0.06  a narrow band of pale sky and, at the RIGHT EDGE ONLY, the lower
             legs of a steel floodlight pylon — grey lattice, rising out of
             frame. Nothing else in the sky.
· 0.06-0.16  the treeline behind the ground, seen through the fence: dense
             dusty green eucalyptus and ficus, deep and cool, never yellow-green.
· 0.16-0.24  the perimeter fence along the top of the terrace: slim vertical
             posts dividing it into even bays, fine steel mesh in each bay, a
             horizontal rail top and bottom. Three or four flat RED advertising
             panels mounted in the bays — plain red rectangles with a thin white
             border, COMPLETELY BLANK, no lettering, no logo, no symbol.
             Under the fence: a solid dark RED band — the back wall of the terrace.
· 0.24-0.86  THE TERRACE ITSELF. About twenty concrete steps, worn white-grey,
             running the full width of the frame, each step slightly bowed so
             the middle of the stand sits a little lower than the ends. The
             treads must be EVENLY SPACED IN PERSPECTIVE: the topmost tread is
             thin, the bottom tread about 2.2x its height, the change smooth
             and regular all the way down. Cracks, patched concrete, water
             stains, sunflower-seed shells and litter caught at the step edges.
             Cutting through them, painted RED:
               - a stairway rising diagonally at about x 0.07-0.17
               - a stairway rising diagonally at about x 0.60-0.67
               - a stepped red block at the far right, x 0.93-1.00
             At about x 0.28-0.38, sitting in the lower-middle of the terrace,
             the ENTRANCE MOUTH: a dark rectangular opening with a red canopy
             roof over it and white tubular handrails around the sides — exactly
             as in the reference photograph.
· 0.86-0.92  the pitch-side barrier: a white vertical-bar railing running the
             full width, standing on a low wall painted in red and white
             vertical stripes.
· 0.92-0.97  the advertising hoardings at the foot of the stand: a continuous
             run of old painted plank boards, each a flat block of colour —
             cream, faded teal, brick red, dusty blue, off-white, grey-green.
             The paint is chipped and sun-faded. ABSOLUTELY NO LETTERING, no
             words, no logos, no numbers — colour blocks only.
             In the middle, at x 0.40-0.62, THE HOME DUGOUT: a metal-framed
             shelter with a flat roof and a translucent greenish-grey back panel,
             a row of eight plastic bucket seats inside, mounted on a low base
             with mesh below. It is EMPTY — no coach, no substitutes, no people.
             Kit bags, two water bottles and a folded tracksuit on the seats.
· 0.97-1.00  a thin strip of pitch: deep, cool green grass, mown in bands.
             Green only — never yellow-green, never olive, never sunlit lime.

CHANGES FROM THE REFERENCE (and nothing else):
1. Every claret / maroon / burgundy surface becomes HAPOEL RED — a deep,
   slightly dusty red. The stairways, the top band, the striped wall, the
   canopy over the entrance mouth, the fence panels.
2. The period is 1986, not today: painted plank hoardings instead of modern
   printed boards, no plastic, no digital signage, no modern branding anywhere.
3. Add the floodlight pylon legs at the right edge (item 0.00-0.06 above).
4. Everything is EMPTY. No people anywhere in the frame — not on the steps, not
   in the dugout, not behind the fence, not a silhouette, not a shadow of one.

CRITICAL — no people. Not one figure, not a silhouette, not a shadow of a
person. Every human in this scene is a sprite the engine places on top. The
steps must be completely clear so that people can be stood on them.

CRITICAL — no text. No lettering on the hoardings, none on the fence panels,
no numbers on the steps, no graffiti with readable characters. Shapes and
colour only.

CRITICAL — the steps must be clean and unobstructed across the FULL WIDTH
between 0.60 and 0.86 of the height. Nothing may cross that zone: no barrier,
no post, no bin, no cable. That is where the child walks.

COLOUR: cooler and flatter than looks right. The engine applies its own warm
grade on top. Push the whites toward grey, keep contrast moderate, leave the
shadows open.

NO YELLOW. Absolutely none — no gold, no mustard, no hi-vis, no yellow-green,
no sunlit lime grass. Yellow is the rival's colour and the build fails on it.
Warm tones must be brick, rust, terracotta, ochre-brown, never yellow.

LIGHT: late afternoon, the sun high and slightly to the left and behind the
camera, so the face of the stand is evenly lit and the steps cast small, short
shadows. No long dramatic shadows, no lens flare, no bloom — an even, honest
light, because the game lights this scene itself.

OUTPUT: PNG, exactly 2560 x 1440, no border, no frame, no watermark, full
bleed to all four edges.
```

**נגטיב:**

```
people, person, figure, silhouette, crowd, spectators, players, coach, human,
text, letters, words, signage, logo, branding, watermark, frame, border,
yellow, gold, mustard, yellow-green, lime, HDR, oversaturated, lens flare,
bloom, modern LED boards, plastic seats on the terrace, roof over the stand,
second tier, 3D render, cartoon, anime, illustration, sketch
```

---

## 3. איך למסור לי (בלי טרמינל)

1. צור את התמונה, שמור בשם **`stand.png`** בדיוק.
2. שים אותה בתיקייה `CURRENT-GRAPHICS-PART-1\DELTA-22\`.
3. תכתוב לי "היציע מוכן". אני עושה את השאר.

אם המחולל מוציא כמה גרסאות — שים את כולן שם עם `stand-1.png`, `stand-2.png` וכו',
ואני בוחר לפי המספרים (המדרגות האחידות הן הקריטריון, לא היופי).

---

## 4. מה אני עושה ברגע שהקובץ נכנס

| שלב | מה משתנה |
|---|---|
| ingest | הקטנה ל־1600×900, ניקוי פס הצהוב, פסי שמיים/רצפה, שורה במניפסט |
| רצועת הליכה | `band` מ־0.872–0.99 ל־**0.62–0.85** — הילד הולך על המדרגות, לא על פס דק בתחתית |
| גובה הילד | `size` מ־0.2/0.27 ל־**0.16/0.24** — אצטדיון גדול, ילד קטן |
| קהל | מ־16 ספרייטים ל־**כ־40**, על **10 שורות מדרגות** (y = 0.855, 0.80, 0.745, 0.69, 0.635, 0.58, 0.525, 0.47, 0.415, 0.36), כל אחד מדמות אחרת מגיליונות הקהל, כל אחד בקצב קפיצה משלו |
| אבא | קובי בשורה הרביעית (x 0.66, y 0.69) — צריך לטפס אליו במבט, וזה הסיום של שלב א׳ |
| הצעיף | על הגדר הלבנה משמאל (x 0.15, y 0.86) |
| היציאה | קצה שמאל, בתוך רצועת ההליכה |
| סורק הצהוב | הדשא יורד מ־30% מהפריים ל־3% — שתי התקלות הפתוחות ב־`life:play` אמורות להיסגר מעצמן |

---

## 5. מה עוד אצטרך בחבילה הבאה (קשור ישירות לפריים הזה)

| נכס | למה | גודל |
|---|---|---|
| `benchCoach.png` | המאמן ליד הספסל, עומד, גב לחצי — כדי שהספסל לא יהיה ריק | 400×900, רקע שקוף |
| `benchSubA/B/C.png` | שלושה מחליפים יושבים, חליפת אימון אדומה | 380×420, רקע שקוף |
| `linesman.png` | קו לאורך הגדר — תנועה בתחתית הפריים | 300×800, רקע שקוף |

הם ספרייטים ולא חלק מהציור, בדיוק מאותה סיבה: ספסל מצויר עם אנשים בתוכו נשאר קפוא
לנצח, וספרייט אפשר להוציא ב־1990 ולהחזיר ב־2000.
