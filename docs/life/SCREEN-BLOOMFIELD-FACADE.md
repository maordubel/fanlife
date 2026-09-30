# מסך אחד, מושלם — חזית בלומפילד

**מה זה המסמך.** רשימת הפרומטים המדויקת שדרושה כדי שמסך אחד יהיה גמור לגמרי: אפשר ללכת בו
ארבעים וחמישה מטר, יש בו אנשים, יש בו משימה, פוגי נראה כמו שצריך, והעומק אמיתי. אחרי שכל
מה שכאן ייווצר, שאר העבודה שלי ואוטומטית.

**למה דווקא החזית של בלומפילד.** זה הרגע שלפני הכול — ילד עומד ברחוב, האצטדיון מימין,
עמוד התאורה בקצה, וההמון כבר נשמע מבפנים. אם המסך הזה עובד, כל מסך אחר הוא אותו מתכון.

---

## 0 · שישה חוקים שחלים על **כל** פרומט כאן

אלה לא העדפות. כל אחד מהם נובע מכשל אמיתי שכבר תועד, וכל אחד מהם שובר את הצינור אם הוא
מופר.

1. **בלי מסגרת.** בלי מסגרת דקורטיבית, בלי ויניה, בלי פס בהיר בקצוות, בלי אפקט "תמונה
   ישנה" על השוליים. בתלת־ממד מסגרת היא לא קישוט אלא **קיר** שהשחקן מתנגש בו.
2. **בלי טקסט בעברית.** שלטים ריקים, מטושטשים, או בכתב לא קריא. הכיתוב האמיתי נתלה
   אחר כך כלוח נפרד. זה מבטל לגמרי את הסיכון לג'יבריש — וכבר נפסלה תמונה אחת בדיוק בגלל זה.
3. **בלי צהוב.** חוק 8. אם יש מונית או שלט צהוב הוא יסובב לחום אצלי, ועדיף שלא יהיה מלכתחילה.
4. **הרצפה מגיעה לקצה התחתון של הפריים.** לא נגמרת בחצי, לא נחתכת בקו כהה. הרצפה היא הדבר
   היחיד שאני יכול לשחזר במדויק, וזה מה שנותן את ההליכה.
5. **מצלמה בגובה עיניים, ישרה.** 1.70 מטר, בלי הטיה למעלה או למטה, בלי עין של ציפור, בלי
   זווית נמוכה דרמטית. כל הטיה שוברת את חישוב המרחקים.
6. **אותו אור בכל התמונות של הסט.** אותה שעה, אותו כיוון שמש, אותו מזג אוויר. שינוי אור
   בין תחנה לתחנה נראה כמו הבזק בזמן ההליכה.

---

## 1 · הסצנה: מה קורה כאן

**מתי:** 1986, שעה לפני משחק. אחר צהריים מאוחר, שמש נמוכה מהמערב, צללים ארוכים על המדרכה.

**איפה עומד השחקן:** על המדרכה הרחבה לאורך חזית בלומפילד. האצטדיון מימין — קיר בטון,
העמודים המשופעים, מעקות אדומים ערומים. הרחוב משמאל. עמוד התאורה בקצה הרחוק, וזה הסימן
שאבא נתן: *"ליד העמוד."*

**המשימה — "ליד העמוד":**

| # | מה קורה | מי | מה צריך |
|---|---|---|---|
| 1 | פוגי מגיע מהרחוב. ההמון נשמע מבפנים, הרחוב ריק יחסית. | — | תחנה 1 |
| 2 | הוא הולך לאורך החזית. מוכר גרעינים ליד המעקות. | הרוכל | תחנות 1–3 |
| 3 | ליד עמוד התאורה — האוהד הוותיק, עם רדיו טרנזיסטור. הוא זה שמכיר את אבא. | אוהד ותיק | תחנה 4 |
| 4 | הוא לוקח את פוגי אל הסדרן. הסדרן שואל אם הוא לבד. | סדרן | תחנה 5 |
| 5 | הקרוסלה. סוף המסך. | — | תחנה 5 |

**למה זו משימה טובה:** ההליכה עצמה היא המשימה. אין חידה, אין מלאי — יש רחוב, ובקצה שלו
מישהו שמחכה. וזה בדיוק מה שהמנוע החדש יודע לעשות עכשיו.

*(שלושת האנשים כבר קיימים במשחק כשיחות — `barry-a5` האוהד הוותיק, `steward` הסדרן. אנחנו
נותנים להם גוף, לא ממציאים אותם.)*

---

## 2 · חמש הפנורמות — ההליכה

זה החלק שהופך את המסך למקום. **חמש תחנות, במרווח 11 מטר, לאורך אותה מדרכה** = 44 מטר
הליכה רצופה.

**המפתח לאחידות:** כל תחנה מעוגנת במרחק מ**עמוד התאורה**, שנשאר בקצה הפריים בכולן. זה מה
שגורם לחמש התמונות להיות אותו רחוב ולא חמישה רחובות.

### התבנית (זהה בכולן, רק המרחק משתנה)

```
A cylindrical panorama, 2.36:1 aspect ratio, 3168 x 1344 pixels.

Tel Aviv, 1986, one hour before a football match. The wide concrete
frontage of Bloomfield Stadium runs along the RIGHT side of the frame:
raking board-marked concrete columns, a deep shaded undercroft behind
them, stacked rust-red crowd-control barriers, a wall layered with
twenty years of torn fly-posters. On the LEFT, a quiet Jaffa street of
two- and three-storey rendered buildings with shuttered balconies. A
tall slim floodlight mast stands ahead at the far end of the pavement.

CAMERA: cylindrical panorama, horizontal field of view 150 degrees,
camera at eye height 1.70 m, perfectly level — no upward or downward
tilt, no bird's eye, no low dramatic angle. The horizon line sits at
60% of the frame height from the top.

THE CAMERA STANDS {{METRES}} METRES FROM THE FLOODLIGHT MAST, on the
pavement, facing along it.

LIGHT: late afternoon, low sun from the west behind the left-hand
buildings, long soft shadows across the pavement, warm dusty air.
Identical light in every image of this set.

GROUND: the concrete pavement fills the whole bottom of the frame and
runs all the way to the bottom edge — not cut off, not vignetted, no
dark band. Kerb, drain covers, cracks and dust visible.

NO decorative border, NO vignette, NO film-edge effect.
NO Hebrew or any readable text anywhere — signs blank or illegible.
NO yellow anywhere.
NO people, NO cars, NO bicycles — the street is empty.

Photographic, documentary, 1980s colour photography, fine grain.
```

### חמש הריצות

החלף `{{METRES}}` וזהו. **אותו פרומט בדיוק בכל פעם** — אל תשכתב, אל תשפר, אל תוסיף.

| קובץ | `{{METRES}}` |
|---|---|
| `bloom-facade-01.png` | `52` |
| `bloom-facade-02.png` | `41` |
| `bloom-facade-03.png` | `30` |
| `bloom-facade-04.png` | `19` |
| `bloom-facade-05.png` | `8` |

**למה בלי אנשים בפנורמות:** אדם שמצויר לתוך הפנורמה נמרח לתוך המדרכה ברגע שזזים — לתמונה
שטוחה אין דרך לדעת שהוא עומד עליה. האנשים מגיעים בנפרד, וזה סעיף 3.

---

## 3 · האנשים — גזורים, לא מצוירים לתוך הרחוב

כל דמות היא **תמונה נפרדת עם רקע שקוף**. ככה היא עומדת במרחק אמיתי, גדלה כשמתקרבים,
ואפשר לדבר איתה.

### התבנית לדמות

**עודכן 8.9.2026 אחרי מישל:** לא לבקש רקע שקוף — לבקש **מסך ירוק**. הסיבוב הראשון של מישל
צולם על אפור בהיר, והגזירה אכלה לו את הפאנלים הלבנים של החליפה, כי הם באותו ערך בדיוק כמו
הרקע. על ירוק המפתח יצא נקי לגמרי בניסיון הראשון. הגזירה, הסרת הנזילה הירוקה מהשוליים
והחיתוך — אצלי, אוטומטית.

```
Full-body photograph of {{WHO}} on a flat mid-green chroma backdrop,
evenly lit, no gradient on it, no shadow on the backdrop and no
shadow under the feet.

CAMERA: eye height 1.70 m, perfectly level, straight-on {{FACING}},
standard 50mm lens, the whole body inside the frame including both
feet with a small margin below them. Subject height in frame: at
least 1800 pixels.

POSE: {{POSE}} — still, weight on both feet, arms relaxed. Not
walking, not gesturing, not posing for a camera.

LIGHT: late afternoon, low warm sun from the subject's LEFT, dusty warm
air. Same light as the street set. No shadow cast onto the backdrop
or the floor.

PERIOD: Tel Aviv, 1986. {{CLOTHES}}

NO yellow anywhere. NO text or logos on the clothing.
Photographic, documentary, 1980s colour photography, fine grain.
```

### ארבע הדמויות

| קובץ | `{{WHO}}` · `{{FACING}}` · `{{POSE}}` · `{{CLOTHES}}` | גובה |
|---|---|---|
| `bf-veteran.png` | a man of about sixty · facing the camera · standing, a small transistor radio held against his ear with his right hand · worn grey trousers, an open short-sleeved shirt over a vest, sandals, a flat cap | 1.72 מ׳ |
| `bf-steward.png` | a man of about forty · facing the camera, three-quarters to his right · standing with both hands behind his back · dark trousers, a plain light short-sleeved shirt, a plastic armband, heavy shoes | 1.78 מ׳ |
| `bf-vendor.png` | a thin man of about fifty · three-quarters facing the camera · standing beside an invisible tray, one hand out as if holding a paper cone · faded work trousers, a rolled-up shirt, an old apron | 1.70 מ׳ |
| `bf-boy.png` | a boy of about ten · facing the camera · standing, hands in pockets · shorts, a plain t-shirt, worn trainers | 1.32 מ׳ |

**חשוב:** בלי צל מצויר מתחת לרגליים. הצל נוצר אצלי במנוע ומשתנה לפי המקום.

**וגם:** רגליים **בתוך** הפריים עם אוויר מתחתיהן. דמות שנוגעת בקצה התחתון חתוכה, וכף רגל
חתוכה היא דמות שלא אפשר להעמיד על מדרכה.

---

## 4 · פוגי — מה שחסר לו כדי להיראות מושלם

יש לנו תמונה אחת שלו מהגב (`pogi-back`) ומחזור הליכה שלם **מהצד**. מהגב הוא כרגע תמונה
אחת עם נדנוד, וזה עובד — אבל זה גם הדבר הכי בולט שנשאר.

### מה לייצר: מחזור הליכה מהגב, שמונה פריימים

```
Eight frames of a walk cycle, seen from DIRECTLY BEHIND, of the same
teenage boy in every frame.

THE BOY: about fifteen years old, slim, dark curly hair to the collar,
a plain red short-sleeved t-shirt, blue denim jeans, white trainers
with three stripes. Tel Aviv, 1986.

CAMERA: identical in all eight frames — eye height 1.70 m, perfectly
level, straight behind him, 50mm lens, 4 metres away. The camera does
NOT move between frames. Full body including both feet, small margin
below the feet. Subject height in frame at least 1800 pixels.

WHAT CHANGES between the frames: only the legs, the arms and the small
roll of the shoulders and hips — one full walking cycle in eight even
steps, frame 1 left foot forward at full stride, frame 5 right foot
forward at full stride, frames 2-4 and 6-8 the phases between. He is
walking away from the camera at a normal pace.

Each frame cut out on a fully transparent background (PNG with alpha).
No ground, no shadow, no backdrop.

LIGHT: identical in all eight frames — late afternoon, low warm sun
from his left.

NO yellow. Photographic, documentary, 1980s colour photography.
```

שמות הקבצים: `pogi-back-w1.png` עד `pogi-back-w8.png`.

**ואם אפשר, עוד שתיים — הן שוות הרבה:**

| קובץ | מה |
|---|---|
| `pogi-back-3q-left.png` | אותו נער, אותה מצלמה בדיוק, עומד, מסובב שלושה־רבעים שמאלה |
| `pogi-back-3q-right.png` | אותו דבר ימינה |

הן מה שהופך סיבוב ראש מ"התמונה מסתובבת" ל"הוא הסתובב".

---

## 5 · השלטים — הכיתוב האמיתי, בנפרד

בפנורמות אין עברית בכוונה. הכיתוב נתלה כלוחות נפרדים, וככה הוא תמיד קריא.

```
A single flat sign board on a fully transparent background, photographed
straight on, no perspective, no frame around the image.

{{SIGN}}

Slightly weathered, scuffed at the corners, 1986. Photographic.
NO yellow.
```

| קובץ | `{{SIGN}}` |
|---|---|
| `bf-sign-gate.png` | An enamel plate, dark red on cream, bearing only the numeral "7" |
| `bf-sign-box.png` | A painted wooden board with a rectangular hole cut in it, the frame of a ticket window, no text |

*(את המילים בעברית אני מוסיף מעל הלוחות בקוד, בגופן שכבר במשחק. ככה אין ג'יבריש לעולם.)*

---

## 6 · הסדר לייצר בו, וכמה זה

1. **חמש הפנורמות** — הן הבסיס. בלעדיהן אין מסך.
2. **מחזור ההליכה מהגב של פוגי** — הדבר הכי נראה לעין.
3. **ארבע הדמויות.**
4. **שני השלטים.**
5. שתי תמונות שלושת־הרבעים של פוגי, אם יש חשק.

**סה"כ: 19 תמונות** (5 + 8 + 4 + 2), פלוס 2 רשות.

---

## 7 · מה קורה כשהקבצים מגיעים — הצד שלי

אפס עבודה נוספת מצידך. הסקריפטים כבר קיימים:

| שלב | מה עושה |
|---|---|
| קליטה | חיתוך שוליים, חוק הצהוב, מדידה על הבייטים, רישום במניפסט |
| קו האופק | נמדד מהתמונה, לא מוערך |
| הרצפה | יישור למבט מלמעלה, התאמת חשיפה לתפר |
| **העומק** | קו המגע של כל עמודה → מרחק לכל זווית → קיר בעל צורה |
| השרשרת | חמש התחנות במרווח 11 מטר, עם המסירה ביניהן |
| הדמויות | הצבה במרחק הנכון לפי הגובה שרשום למעלה, עם צל שנוצר במנוע |
| השלטים | תלייה מעל השלטים הריקים, עם הכיתוב בעברית |
| המשימה | חיווט חמשת הביטים לשיחות שכבר קיימות |

ואז — צילומי מסך אליך, כמו תמיד.

---

## 8 · מה לא לעשות

- **אל תשפר את הפרומט בין תחנה לתחנה.** מילה אחת שונה = אור אחר = הבזק בהליכה.
- **אל תבקש "יותר יפה" או "יותר דרמטי".** זווית נמוכה, עדשה רחבה או הטיה שוברות את המדידה.
- **אל תוסיף אנשים לפנורמות.** הם יימרחו לתוך המדרכה. הם באים בנפרד.
- **אל תבקש עברית בשלטים בתוך הפנורמה.** זה כבר נפסל פעם, וזה ייפסל שוב.
