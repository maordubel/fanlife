# CLASSIFIED — תיק הגרפיקה (מנה A: ערכת הסדרה + FILE 01 · מנה B: FILE 02)

**FanLife: Football Stories · CLASSIFIED** — הסיפורים שמאחורי הקלעים של הכדורגל, מסופרים בקול הקריין שלנו ומלווים בקומיקס חי.
המסמך הזה הוא כל מה שצריך כדי לייצר את הציורים. אני עושה את השאר: התנועה, המצלמה, העומק, האפקטים, הקריינות, המוזיקה והעריכה.

---

## איך עובדים (פעם אחת, לפני הכול)

1. **כלי:** ChatGPT (יצירת תמונות) או Gemini (Nano Banana). להיצמד לכלי אחד לכל הסדרה, כדי שהסגנון לא יזוז.
2. **קודם תמונת העוגן:** מייצרים את **S01** (למטה) עד שהיא מושלמת בעיניך. מאותו רגע **מצרפים את S01 לכל פרומפט** ("use the attached image as the style reference"). זה מה שמחזיק את כל הפרק באותו סגנון.
3. **דמויות:** כשמופיעה דמות שיש לה כרטיס דמות (CH-…), מצרפים גם את כרטיס הדמות. בסך הכול 2–3 תמונות ייחוס לכל פרומפט.
4. **פורמט:** 16:9 רוחבי (אם יש בחירה: הגודל הגדול ביותר). פרומפט שמסומן **9:16** הוא אנכי, לשורטס.
5. **בלי טקסט בתמונה.** אם הכלי בכל זאת כתב משהו (שלט, עיתון, מספר על חולצה), לבקש "remove all text" או לייצר מחדש. את כל הכיתובים אני מוסיף בקוד, בפונטים של FAN LIFE.
6. **אנשים אמיתיים:** אף ציור לא דומה לאדם אמיתי. רוב הדמויות מאחור, בצללית או בחצי פרופיל. זה גם בטוח משפטית וגם נראה קולנועי יותר.
7. **בלי דם ובלי פציעה גרפית.** את הכאב אני מראה עם אפקטים קומיקסיים בקוד (SMASH!, כוכבים, פיצוץ).
8. **שמות קבצים:** בדיוק כמו בעמודה "קובץ" (למשל `f01-p03-camp.png`). כך אני יודע לאן כל תמונה שייכת.
9. **העלאה:** לתיקיית הדרייב של FAN LIFE, תת-תיקייה חדשה
   `06_CLASSIFIED/FILE-01-the-bottle/` (ובהמשך `06_CLASSIFIED/FILE-02-maksimir/`).
   כשמנה עלתה, כותבים לי "עלה". מהרגע הזה הכול אצלי.
10. **לא מושלם?** עדיף לייצר 2–3 וריאציות ולהעלות את כולן (`f01-p03-camp-b.png` וכו'). אני אבחר לפי התנועה.

### בלוק הסגנון (כבר כלול בכל פרומפט, כאן רק להבנה)
> Prestige graphic-novel panel at feature-animation quality. Bold confident ink linework with varied line weight, hand-printed halftone dot shading and a slight print misregistration, on warm cream newsprint. Limited process-ink palette — ink black, vermilion red, process cyan, deep navy, cream paper — with ONE accent colour per panel. Cinematic film-camera composition, dramatic light, rich texture, expressive movement.

### בלוק החובה (כבר כלול בכל פרומפט)
> No text, letters, numbers, logos, crests, brand names or watermarks anywhere. Every person is an invented, anonymous character — no likeness of any real person. No blood, no gore.

**שלוש לשוניות הטון** (כל תיק מסומן באחת):
- **LAUGH**: ציאן, קליל, טיימינג של קומדיה.
- **WAR**: ורמיליון, עשן ולילה.
- **HEART**: נייבי, שקט, הרבה אוויר בפריים.

---

# מנה A1 — ערכת הסדרה (פעם אחת לכל הסדרה)

| # | קובץ | מה זה |
|---|---|---|
| S01 | `s01-style-anchor.png` | תמונת העוגן לסגנון. **הכי חשובה.** |
| S02 | `s02-dossier.png` | רקע "התיק החסוי" לפתיח של כל פרק |
| S03 | `s03-tab-laugh.png` | רקע לשונית LAUGH |
| S04 | `s04-tab-war.png` | רקע לשונית WAR |
| S05 | `s05-tab-heart.png` | רקע לשונית HEART |

**S01 — `s01-style-anchor.png`** (16:9)
```
Prestige graphic-novel panel at feature-animation quality. Bold confident ink linework with varied line weight, hand-printed halftone dot shading and a slight print misregistration, on warm cream newsprint. Limited process-ink palette — ink black, vermilion red, process cyan, deep navy, cream paper — with vermilion as the one accent colour. Cinematic film-camera composition, dramatic light, rich texture, expressive movement.
SCENE: A floodlit old football stadium at night seen from high in the stands. A packed terrace of supporters in the foreground, seen from behind, scarves raised, mid-chant, breath steaming in cold air. Four tall floodlight pylons blaze through drifting smoke; the pitch glows below. A single red flare burns in the crowd and lights the faces around it in warm vermilion while the rest of the night stays navy and ink.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere. Every person is an invented, anonymous character — no likeness of any real person. No blood, no gore. Widescreen 16:9.
```

**S02 — `s02-dossier.png`** (16:9)
```
Same graphic-novel style as the attached reference (ink linework, halftone dots, process inks on cream newsprint).
SCENE: Top-down view of a worn wooden desk under a single hard desk lamp in a dark room. In the centre, a thick buff-coloured case-file folder tied with string, slightly open; old photographs, a ticket stub, a torn match programme and a football boot lace spill out of it. A magnifying glass and a cup of black coffee at the edge. Deep shadows, film-noir mood, one vermilion accent. Leave the folder cover plain and empty (a stamp will be added later).
No text, letters, numbers, logos, crests, brand names or watermarks anywhere. Widescreen 16:9.
```

**S03 — `s03-tab-laugh.png`** (16:9)
```
Same graphic-novel style as the attached reference.
An abstract comic-book background: bursting cyan and cream sunray stripes from the centre, scattered halftone dots, a few cartoon speed lines and small stars, light and playful, like the splash page of a 1970s football comic. No characters.
No text, letters, numbers, logos or watermarks. Widescreen 16:9.
```

**S04 — `s04-tab-war.png`** (16:9)
```
Same graphic-novel style as the attached reference.
An abstract comic-book background: rolling smoke over a dark navy night, vermilion glow from below as if from flares, sparks and embers drifting, heavy halftone shadows, tense and cinematic. No characters.
No text, letters, numbers, logos or watermarks. Widescreen 16:9.
```

**S05 — `s05-tab-heart.png`** (16:9)
```
Same graphic-novel style as the attached reference.
An abstract comic-book background: a quiet deep-navy dusk sky over an empty terrace silhouette, soft halftone gradient, a few drifting snow-like specks of light, lots of empty space, gentle and melancholic. No characters.
No text, letters, numbers, logos or watermarks. Widescreen 16:9.
```

---

# מנה A2 — FILE 01 · THE BOTTLE (LAUGH)

**הסיפור:** שישי, 17 במאי 2002, מחנה האימונים של ספרד במונטקסטיו שליד חרס. שוער ספרד והמועמד לשער הראשון במונדיאל (קניזארס, בן 32, ולנסיה) יוצא מהמקלחת. בקבוק קולון מזכוכית נשבר, ושבר חותך את גיד הבוהן הימנית. שבועיים לפני המונדיאל הוא בחוץ. הכפפות עוברות לשוער בן 21 (קסיאס). שבועיים אחר כך, בסואון, הוא עוצר פנדל במשחק ושניים בדו-קרב מול אירלנד, ונולד "סן איקר".

**פלטה:** ציאן כצבע הדגש; רגעי השבר באדום.

### כרטיסי דמות (קודם אותם)
| # | קובץ |
|---|---|
| CH1 | `f01-ch-keeper.png` |
| CH2 | `f01-ch-kid.png` |

**CH1 — `f01-ch-keeper.png`**
```
Same graphic-novel style as the attached reference.
CHARACTER SHEET on a plain cream background: an invented, anonymous goalkeeper in his early thirties — tall, broad-shouldered, short dark-brown hair, light stubble — shown three times side by side: from behind, in profile, and in three-quarter view with the face mostly turned away. He wears a plain red training top and dark training shorts, goalkeeper gloves tucked in his waistband. Consistent proportions in all three views. Not a likeness of any real person.
No text, letters, numbers, logos, crests or watermarks.
```

**CH2 — `f01-ch-kid.png`**
```
Same graphic-novel style as the attached reference.
CHARACTER SHEET on a plain cream background: an invented, anonymous 21-year-old goalkeeper — slim, boyish, short dark hair — shown three times: from behind, in profile, and three-quarter view with the face mostly turned away. Plain long-sleeved green goalkeeper jersey, black shorts, goalkeeper gloves. Not a likeness of any real person.
No text, letters, numbers, logos, crests or watermarks.
```

### הפאנלים (לפי סדר הסרט)
בכל פרומפט מצרפים את S01. כשכתוב **[+CH1]** / **[+CH2]**, מצרפים גם את כרטיס הדמות.

| # | קובץ | רגע בסיפור |
|---|---|---|
| P01 | `f01-p01-slip.png` | פתיחה קרה: הבקבוק מחליק |
| P02 | `f01-p02-bottle-hero.png` | שער הפרק: הבקבוק כ"ראיה" |
| P03 | `f01-p03-camp.png` | מחנה האימונים בחרס |
| P04 | `f01-p04-training-dive.png` | השוער הראשון באימון [+CH1] |
| P05 | `f01-p05-the-kid.png` | הצעיר בשער השני [+CH2] |
| P06 | `f01-p06-final-bench.png` | גמר אלופות: הצעיר עולה מהספסל [+CH2] |
| P07 | `f01-p07-room-evening.png` | חדר במלון, ערב שישי [+CH1] |
| P08 | `f01-p08-reach.png` | יד מושטת לבקבוק [+CH1] |
| P09 | `f01-p09-foot-catch.png` | גרסה א': הרגל מנסה לעצור |
| P10 | `f01-p10-sink-smash.png` | גרסה ב': הבקבוק מתנפץ בכיור |
| P11 | `f01-p11-shards.png` | אחרי: רסיסים ורגל יחפה |
| P12 | `f01-p12-hospital.png` | ניתוח בלילה, חרס |
| P13 | `f01-p13-crutches.png` | מסיבת עיתונאים על קביים [+CH1] |
| P14 | `f01-p14-phone.png` | השוער שמוזעק מהבית |
| P15 | `f01-p15-suwon.png` | סואון, 16 ביוני 2002 |
| P16 | `f01-p16-penalty-save.png` | הצעיר עוצר פנדל [+CH2] |
| P17 | `f01-p17-shootout-line.png` | דו-קרב פנדלים |
| P18 | `f01-p18-pile-on.png` | הקבוצה קופצת עליו [+CH2] |
| P19 | `f01-p19-kiosk.png` | בוקר במדריד: העיתונים |
| P20 | `f01-p20-empty-shelf.png` | סיום: המדף הריק |
| V1 | `f01-v1-short-cover.png` | שורט, 9:16 |
| V2 | `f01-v2-short-cover.png` | שורט, 9:16 |

**P01 — `f01-p01-slip.png`**
```
Same graphic-novel style as the attached reference, cyan accent.
EXTREME CLOSE-UP, slow-motion comedy beat: a wet male hand in a steamy hotel bathroom as a heavy faceted glass cologne bottle slips out of its fingers. Water droplets frozen in mid-air, a curl of steam, the bottle tilting past the point of no return, a glint of light on the glass. Shallow depth of field, tiled wall soft behind. Comic motion lines around the bottle.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere — the bottle has no label. No likeness of any real person. No blood. Widescreen 16:9.
```

**P02 — `f01-p02-bottle-hero.png`**
```
Same graphic-novel style as the attached reference, cyan accent with one vermilion glint.
A heavy faceted glass cologne bottle with a dark stopper stands alone on a white bathroom shelf, lit like evidence in a crime film: a hard spotlight from above, long dramatic shadow, a cone of light in a dark room, tiny halftone sparkle on the glass. Centred hero composition with empty space around it.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere — the bottle is unlabelled. Widescreen 16:9.
```

**P03 — `f01-p03-camp.png`**
```
Same graphic-novel style as the attached reference, cyan accent.
ESTABLISHING SHOT, late afternoon in southern Spain, May: a low white Andalusian-style hotel with terracotta roofs beside a lush green golf course and a football training pitch, tall palm trees, long golden shadows, a hot hazy sky. A team bus parked by the entrance, tiny figures of players walking to training. Calm before the storm.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere — no signs. No likeness of any real person. Widescreen 16:9.
```

**P04 — `f01-p04-training-dive.png`** [+CH1]
```
Same graphic-novel style as the attached references; the goalkeeper is the character from the attached character sheet. Cyan accent.
ACTION: on a sunlit training pitch, the goalkeeper launches into a full-length diving save, body horizontal in mid-air, gloves stretched to a ball at the top corner of a training goal, seen from the side and slightly behind so his face is turned away. Spray of grass, motion lines, other players blurred in the background.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P05 — `f01-p05-the-kid.png`** [+CH2]
```
Same graphic-novel style as the attached references; the young goalkeeper is the character from the attached character sheet. Cyan accent.
At the far goal of the same sunny training pitch, the slim young goalkeeper in the green jersey stands on his goal line, seen from directly behind through the net, watching the senior keeper train in the distance. Quiet, patient, waiting for his chance. The net mesh frames the shot in the foreground.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P06 — `f01-p06-final-bench.png`** [+CH2]
```
Same graphic-novel style as the attached references; the young goalkeeper is the character from the attached character sheet. Vermilion accent.
NIGHT, a huge old Scottish stadium packed for a European final, floodlights blazing, confetti-ready crowd. Seen from behind the dugout: the young goalkeeper pulls on his gloves and jogs out of the dugout onto the touchline to come on as a substitute, while an injured keeper is helped off in the distance. Electric, sudden, a door opening.
No text, letters, numbers, logos, crests, brand names, advertising boards or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P07 — `f01-p07-room-evening.png`** [+CH1]
```
Same graphic-novel style as the attached references; the man is the goalkeeper from the attached character sheet. Cyan accent.
EVENING in a hotel room: orange sunset light through the blinds, a neatly made bed with a red training top and goalkeeper gloves laid out on it, a sports bag on the floor. The goalkeeper, wrapped in a white towel, walks toward the steaming bathroom door, seen from behind. Ordinary, peaceful, a little too peaceful.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P08 — `f01-p08-reach.png`** [+CH1]
```
Same graphic-novel style as the attached references; the man is the goalkeeper from the attached character sheet. Cyan accent.
Inside the steamy bathroom, seen from behind and slightly below: the tall goalkeeper, towel round his waist, reaches up for a heavy unlabelled glass cologne bottle on a shelf above the sink. Fogged mirror, droplets on tiles, warm light. The bottle is the brightest thing in the frame.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P09 — `f01-p09-foot-catch.png`**
```
Same graphic-novel style as the attached reference, cyan accent, comedy timing.
FLOOR-LEVEL CLOSE-UP on a bathroom tile floor: a bare male foot shoots out sideways in a desperate goalkeeper reflex to cushion a falling heavy glass bottle that is a few centimetres above the toes. Exaggerated squash-and-stretch, motion lines, frozen droplets, the instant before impact.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere. No blood. Widescreen 16:9.
```

**P10 — `f01-p10-sink-smash.png`**
```
Same graphic-novel style as the attached reference, vermilion burst accent.
CLOSE-UP: a heavy unlabelled glass bottle hits the hard edge of a white porcelain sink and bursts into dozens of glittering shards, frozen mid-explosion, cologne spraying like a firework, radial comic impact lines. No person in frame.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere. No blood. Widescreen 16:9.
```

**P11 — `f01-p11-shards.png`**
```
Same graphic-novel style as the attached reference, cyan accent with vermilion.
AFTERMATH, floor level: glass shards scattered across wet white bathroom tiles; a bare foot pulled back with toes curled in shock, seen from the side; a towel dropped on the floor. Tense comic stillness, drops still falling.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere. No blood, no wound visible. Widescreen 16:9.
```

**P12 — `f01-p12-hospital.png`**
```
Same graphic-novel style as the attached reference, cyan accent.
NIGHT, a 2002 Spanish provincial hospital corridor: green-white fluorescent lights, a trolley being wheeled fast through swinging doors toward an operating theatre, two doctors in scrubs seen from behind, shadows stretching on the floor. Urgent but not gory.
No text, letters, numbers, logos, signs, brand names or watermarks anywhere. No likeness of any real person. No blood. Widescreen 16:9.
```

**P13 — `f01-p13-crutches.png`** [+CH1]
```
Same graphic-novel style as the attached references; the man is the goalkeeper from the attached character sheet. Cyan accent.
A small press room: the goalkeeper sits behind a table crowded with microphones, seen in profile from the side with his face turned down, his right foot in a white cast resting on a chair, crutches leaning on the table. A wall of journalists and camera flashes bursting in the foreground, blurred.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere — no names on the microphones. No likeness of any real person. Widescreen 16:9.
```

**P14 — `f01-p14-phone.png`**
```
Same graphic-novel style as the attached reference, cyan accent.
A small sunny flat on the Mediterranean coast: an old 2002 mobile phone vibrating and lighting up on a kitchen table next to a pair of goalkeeper gloves and a half-eaten breakfast; through the window, a city by the sea. Nobody in frame — just the call that changes a summer.
No text, letters, numbers, logos, brand names or watermarks anywhere — the phone screen shows only light. Widescreen 16:9.
```

**P15 — `f01-p15-suwon.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
ESTABLISHING SHOT, a hot summer evening at a brand-new South Korean World Cup stadium in 2002: a sweeping modern roof, a sea of supporters in red on one side and green on the other, floodlights coming on as the sky turns from orange to navy. Huge, modern, electric.
No text, letters, numbers, logos, crests, brand names, flags with symbols, advertising boards or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P16 — `f01-p16-penalty-save.png`** [+CH2]
```
Same graphic-novel style as the attached references; the young goalkeeper is the character from the attached character sheet, now in a plain dark-grey goalkeeper jersey. Vermilion accent.
SEEN FROM BEHIND THE TAKER, a penalty at night: a penalty taker in a plain green shirt (back to camera) has just struck the ball, and the young goalkeeper is at full stretch diving to his right, palms pushing the ball away. Floodlit, explosive, comic impact lines around the ball.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere — no numbers on shirts. No likeness of any real person. Widescreen 16:9.
```

**P17 — `f01-p17-shootout-line.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
NIGHT, a penalty shootout: two rows of footballers stand arm in arm along the halfway line, seen from behind — plain red shirts on the left, plain green shirts on the right — looking toward a distant goal under blazing floodlights. Unbearable tension, crowd as a dark wall.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere — no numbers on shirts. No likeness of any real person. Widescreen 16:9.
```

**P18 — `f01-p18-pile-on.png`** [+CH2]
```
Same graphic-novel style as the attached references; the young goalkeeper is the character from the attached character sheet (plain dark-grey goalkeeper jersey). Vermilion accent.
PURE JOY: the young goalkeeper is buried under teammates in plain red shirts who leap onto him on the pitch, arms everywhere, seen from a low angle, faces hidden in the pile; confetti and floodlight flares above. Comic burst energy.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere — no numbers on shirts. No likeness of any real person. Widescreen 16:9.
```

**P19 — `f01-p19-kiosk.png`**
```
Same graphic-novel style as the attached reference, cyan accent.
EARLY MORNING in a Madrid street, June 2002: a classic green newspaper kiosk with stacks of newspapers whose front pages show only big blurred photos and abstract shapes, a few people in summer clothes reading papers as they walk, seen from behind. Warm morning light on old buildings.
No text, letters, numbers, logos, mastheads, brand names or watermarks anywhere — newspapers must have NO readable writing. No likeness of any real person. Widescreen 16:9.
```

**P20 — `f01-p20-empty-shelf.png`**
```
Same graphic-novel style as the attached reference, cyan accent.
The same bathroom shelf from earlier, now empty and clean, morning light, a single small glint where the bottle used to stand, the fogged mirror clearing. Quiet, ironic, the end of the story.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere. Widescreen 16:9.
```

**V1 — `f01-v1-short-cover.png`** (9:16)
```
Same graphic-novel style as the attached reference, cyan accent.
VERTICAL 9:16 hero image: a heavy unlabelled glass cologne bottle falling through the frame from top to bottom with motion lines, steam and droplets, a bare foot waiting at the very bottom of the frame, dramatic overhead light. Leave the top third calmer for a title.
No text, letters, numbers, logos, labels, brand names or watermarks anywhere. No blood. Vertical 9:16.
```

**V2 — `f01-v2-short-cover.png`** (9:16) [+CH2]
```
Same graphic-novel style as the attached references; the young goalkeeper is the character from the attached character sheet (plain dark-grey goalkeeper jersey). Vermilion accent.
VERTICAL 9:16: the young goalkeeper seen from behind, standing in a floodlit goal at night, arms wide, enormous crowd in front of him, light rays from above like a saint. Leave the top third calmer for a title.
No text, letters, numbers, logos, crests, brand names or watermarks anywhere. No likeness of any real person. Vertical 9:16.
```

---

# מנה B — FILE 02 · MAKSIMIR (WAR)

**הסיפור כפי שאומת:**
- 13 במאי 1990, אצטדיון מקסימיר בזאגרב, שבועות אחרי הבחירות הרב-מפלגתיות הראשונות בקרואטיה.
- כ-3,000 אוהדי הכוכב האדום הגיעו, בהנהגת ארקאן (שהואשם אחר כך בבית הדין של האו"ם ונרצח ב-2000 לפני משפט).
- אוהדי דינמו פרצו את הגדר **שלהם** אל הדשא. המשטרה הסתערה עם אלות, גז מדמיע ומכת"זים. חלק מהיציע עלה באש.
- **המשחק לא נערך מעולם.**
- הקפטן בן ה-21 תקף שוטר שהיכה אוהד, ונענש בהשעיה שבגללה החמיץ את מונדיאל 1990.
- בקרואטיה זוכרים את היום כ"היום שבו התחילה המלחמה". היסטוריונים רואים בו סימפטום ולא סיבה. הסרט יספר את שני הצדדים.

**כללים מיוחדים לפרק הזה:**
- **לא משחזרים את התמונה המפורסמת** של הבעיטה. רק קומפוזיציה שלנו: מרחוק, מאחור, דרך עשן.
- אין סמלים לאומיים, דגלים עם סמלים, כתובות או צבעי מדים מזוהים מעבר ל"כחול" ו"אדום-לבן" כלליים.
- בלי פצועים מדממים. האלימות מוצגת כצלליות, עשן, חפצים עפים ומחסומים קורסים.

| # | קובץ | רגע בסיפור |
|---|---|---|
| CH3 | `f02-ch-captain.png` | כרטיס דמות: הקפטן |
| P01 | `f02-p01-cold-open.png` | פתיחה: השחקן באוויר, עשן |
| P02 | `f02-p02-city-1990.png` | זאגרב, אביב 1990 |
| P03 | `f02-p03-stadium-dusk.png` | מקסימיר מתמלא |
| P04 | `f02-p04-away-end.png` | יציע האורחים |
| P05 | `f02-p05-seats-torn.png` | מושבים נתלשים |
| P06 | `f02-p06-fence-breaks.png` | הגדר נפרצת |
| P07 | `f02-p07-police-line.png` | שורת המשטרה |
| P08 | `f02-p08-tear-gas.png` | גז מדמיע על הדשא |
| P09 | `f02-p09-water-cannon.png` | מכת"זית |
| P10 | `f02-p10-captain-sees.png` | הקפטן רואה [+CH3] |
| P11 | `f02-p11-the-leap.png` | הזינוק, מרחוק [+CH3] |
| P12 | `f02-p12-shield.png` | האוהדים מגוננים עליו [+CH3] |
| P13 | `f02-p13-fire.png` | היציע בוער |
| P14 | `f02-p14-scoreboard.png` | לוח התוצאות הריק |
| P15 | `f02-p15-dawn.png` | שחר אחרי |
| P16 | `f02-p16-tv-summer.png` | קיץ 1990: המונדיאל בטלוויזיה |
| P17 | `f02-p17-memorial.png` | 13 במאי היום: פרחים |
| V1 | `f02-v1-short-cover.png` | שורט, 9:16 |

**CH3 — `f02-ch-captain.png`**
```
Same graphic-novel style as the attached reference.
CHARACTER SHEET on a plain cream background: an invented, anonymous 21-year-old footballer — lean, athletic, short dark hair — shown three times: from behind, in profile, and three-quarter view with the face mostly turned away. Plain royal-blue football shirt with no badge and no number, white shorts, blue socks, captain's armband as a plain white band. Not a likeness of any real person.
No text, letters, numbers, logos, crests or watermarks.
```

**P01 — `f02-p01-cold-open.png`** [+CH3]
```
Same graphic-novel style as the attached references; the player is the character from the attached character sheet. Vermilion accent, war-film mood.
NIGHT, a stadium pitch swallowed by white tear-gas smoke lit by floodlights; seen from far behind and above, a lone footballer in a plain blue shirt is caught in mid-air, leaping into the smoke toward a dark line of helmeted riot police silhouettes. Sparks, debris, flying seats, a burning glow on the horizon. Epic, chaotic, frozen moment.
No text, letters, numbers, logos, crests, symbols, flags or watermarks anywhere. No likeness of any real person. No blood. Widescreen 16:9.
```

**P02 — `f02-p02-city-1990.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
ESTABLISHING SHOT, a Central European city in spring 1990: grey socialist-era apartment blocks and old Austro-Hungarian rooftops, a tram crossing a square, crowds of people gathered in the street with hand-made placards whose surfaces are blank, tension in the air, storm clouds over the city.
No text, letters, numbers, logos, symbols, flags or watermarks anywhere — placards are blank. No likeness of any real person. Widescreen 16:9.
```

**P03 — `f02-p03-stadium-dusk.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
DUSK, an old concrete Eastern European football stadium filling up: long open terraces, high wire fences between the stands and the running track, floodlight pylons flickering on, tens of thousands of silhouettes, smoke from flares beginning to rise. Ominous, heavy sky.
No text, letters, numbers, logos, crests, advertising, flags with symbols or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P04 — `f02-p04-away-end.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
The away section of the terrace, seen from below: a dense mass of travelling supporters in red and white scarves, fists in the air, chanting, flares burning red, one tall dark figure in a leather jacket standing above them seen only from behind as a silhouette, directing them. Menacing, theatrical.
No text, letters, numbers, logos, crests, symbols, flags with symbols or watermarks anywhere. No likeness of any real person. Widescreen 16:9.
```

**P05 — `f02-p05-seats-torn.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
CLOSE ACTION: hands ripping plastic stadium seats from their concrete steps and blank advertising boards being torn down and hurled; seats spinning through the air toward the camera with motion lines. Faces out of frame.
No text, letters, numbers, logos, brand names or watermarks anywhere — boards are blank. No blood. Widescreen 16:9.
```

**P06 — `f02-p06-fence-breaks.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
The home terrace: a tall wire fence buckles and collapses as a wave of supporters in blue pours over it onto the running track and the pitch, seen from pitch level looking up; bodies in silhouette, scarves, smoke, floodlights behind. A dam breaking.
No text, letters, numbers, logos, crests, symbols, flags with symbols or watermarks anywhere. No likeness of any real person. No blood. Widescreen 16:9.
```

**P07 — `f02-p07-police-line.png`**
```
Same graphic-novel style as the attached reference, navy and vermilion.
A line of riot police in helmets, visors and long batons, shields raised, advancing across the grass toward the camera through drifting smoke, seen from a low angle; floodlights flaring behind their helmets. Faceless, heavy, mechanical.
No text, letters, numbers, logos, insignia, symbols or watermarks anywhere — no words on shields or uniforms. No blood. Widescreen 16:9.
```

**P08 — `f02-p08-tear-gas.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
Canisters of tear gas arcing through the floodlit night and bursting into thick white clouds over the pitch; silhouettes of running people, coats over their mouths, a goal frame half-hidden in the smoke. Eerie and beautiful in a terrible way.
No text, letters, numbers, logos, symbols or watermarks anywhere. No likeness of any real person. No blood. Widescreen 16:9.
```

**P09 — `f02-p09-water-cannon.png`**
```
Same graphic-novel style as the attached reference, navy accent.
A boxy armoured water-cannon truck rolls onto the running track blasting a powerful arc of water into the crowd behind a fence, spray glittering in the floodlights, people scattering. Industrial, cold, overwhelming.
No text, letters, numbers, logos, insignia, symbols or watermarks anywhere — no writing on the truck. No blood. Widescreen 16:9.
```

**P10 — `f02-p10-captain-sees.png`** [+CH3]
```
Same graphic-novel style as the attached references; the player is the character from the attached character sheet. Vermilion accent.
OVER-THE-SHOULDER: from just behind the young captain in his plain blue shirt, we see what he sees — through smoke, a policeman raising a baton over a young supporter lying on the grass. The captain's fists tighten. Freeze-frame before a decision.
No text, letters, numbers, logos, insignia, crests or watermarks anywhere. No likeness of any real person. No blood. Widescreen 16:9.
```

**P11 — `f02-p11-the-leap.png`** [+CH3]
```
Same graphic-novel style as the attached references; the player is the character from the attached character sheet. Vermilion accent.
WIDE SHOT FROM HIGH IN THE STANDS (not a close-up): far below on the smoky pitch, a tiny figure in a plain blue shirt springs into the air toward a helmeted policeman; around them, chaos — smoke, scattered seats, running silhouettes. The moment is small in the frame, the scale of the riot is huge.
No text, letters, numbers, logos, insignia, crests or watermarks anywhere. No likeness of any real person. No blood. Widescreen 16:9.
```

**P12 — `f02-p12-shield.png`** [+CH3]
```
Same graphic-novel style as the attached references; the player is the character from the attached character sheet. Vermilion accent.
A ring of supporters in jackets and scarves links arms around the young captain in his plain blue shirt, shielding him as they hurry him away across the pitch through smoke, seen from behind. Loyalty, urgency, a crowd turned into a wall.
No text, letters, numbers, logos, crests, symbols or watermarks anywhere. No likeness of any real person. No blood. Widescreen 16:9.
```

**P13 — `f02-p13-fire.png`**
```
Same graphic-novel style as the attached reference, vermilion accent.
Part of an old wooden-and-concrete stand on fire at night: orange flames climbing the terraces, black smoke rising into the floodlights, embers drifting across an empty pitch littered with debris.
No text, letters, numbers, logos or watermarks anywhere. No people visible. Widescreen 16:9.
```

**P14 — `f02-p14-scoreboard.png`**
```
Same graphic-novel style as the attached reference, navy accent.
An old stadium scoreboard at night, completely dark and blank, half hidden in drifting smoke, a single floodlight behind it. The game that never started. Silent and haunting.
No text, letters, numbers, logos or watermarks anywhere — the scoreboard is blank. Widescreen 16:9.
```

**P15 — `f02-p15-dawn.png`**
```
Same graphic-novel style as the attached reference, navy accent with a thin vermilion dawn.
DAWN the next morning: the empty stadium, torn fences, scorched seats, scattered shoes and scarves on the wet grass, smoke still rising thinly, a pale sky. Total silence.
No text, letters, numbers, logos, symbols or watermarks anywhere. No people. Widescreen 16:9.
```

**P16 — `f02-p16-tv-summer.png`**
```
Same graphic-novel style as the attached reference, navy accent.
SUMMER 1990: a dim living room, an old cathode-ray television showing a sunny World Cup match as a blur of green and tiny players; in front of it, an empty armchair with a plain blue football shirt folded on it. Absence, consequence.
No text, letters, numbers, logos, crests or watermarks anywhere — the TV picture has no graphics. Widescreen 16:9.
```

**P17 — `f02-p17-memorial.png`**
```
Same graphic-novel style as the attached reference, navy accent.
TODAY: a stone memorial wall outside a football stadium, its surface plain and blank, covered with fresh flowers, blue scarves and candles; a few people stand in silence, seen from behind, heads bowed. Dignified and quiet.
No text, letters, numbers, logos, crests, symbols or watermarks anywhere — the memorial carries no writing. No likeness of any real person. Widescreen 16:9.
```

**V1 — `f02-v1-short-cover.png`** (9:16) [+CH3]
```
Same graphic-novel style as the attached references; the player is the character from the attached character sheet. Vermilion accent.
VERTICAL 9:16: seen from behind, a young footballer in a plain blue shirt stands alone on a floodlit pitch facing a wall of tear-gas smoke and helmeted police silhouettes; flares burning red behind the fence. Leave the top third calmer for a title.
No text, letters, numbers, logos, insignia, crests or watermarks anywhere. No likeness of any real person. No blood. Vertical 9:16.
```

---

## מה קורה אחרי שהמנה עולה
1. אני מייבא את התמונות לסטודיו, נותן לכל אחת עומק תלת-ממדי (פרלקסה) ומוסיף את שכבת הקומיקס בקוד: מסגרות פאנלים, תנועת מצלמה בין פאנלים, SMASH!, תיבות כיתוב, חותמת CLASSIFIED, עשן, אבוקות וגשם.
2. הקריין (George) מספר את הסיפור המאומת. כל מספר ואמירה יושבים על מקור. מקורות בתיאור.
3. אני שולח לטלגרם את הפרק המלא ואת 3 השורטס לאישור. אחרי האישור אני מעלה ומתזמן ביוטיוב (שישי 18:00).
