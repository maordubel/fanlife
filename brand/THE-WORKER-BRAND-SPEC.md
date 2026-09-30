# The Worker — מפרט מיתוג ליישום (v1.0)

מיתוג: **אוסישקין — התיק, הקיר והמגדל**
עבור: `github.com/maordubel/The-Worker` · Next.js App Router + Tailwind + Supabase · עברית RTL
תאריך: 31.08.2026 · מחליף את `docs/01-brand-concept.md` (טריטוריית "לטרפרס ארכיוני")

המסמך הזה נכתב למי שבונה בקוד. הוא מכיל טוקנים, קומפוננטות, מתכוני מסכים, מפרט מוטיון וצ'קליסט קבלה.
הייצוג החזותי המלא: `The Worker — Brand Kit.dc.html` (ערכת המיתוג) ו־`The Worker — Brand Directions.dc.html` סבב 3 (המסכים החיים).

---

## 0. חוק העל

שלושה מכשירים, ולא "סגנון":

| מכשיר | מה הוא עושה | איפה |
|---|---|---|
| **הקיר** (גיליון מודבק) | איך תוכן מגיע — גיליון חדש כל בוקר, מכסה את של אתמול, הקצה נשאר בחוץ | מסך בית, תוכן ארכיוני, תוצאות |
| **התיק** (חותמת פטיש ומגל) | איך עובדה מאומתת — סריאל, מקור, ודאות, החתמה | תשובות, מקורות, פרופיל |
| **המגדל** (סורג 20 פנסים) | איך נתון נמדד — רצף, ניקוד, זיכרון, טעינה | כל מספר במוצר |

שלושה איסורים מוחלטים:
1. **אין צהוב.** בשום גוון, כולל "אור פנס חם" — אור הזרקורים לבן קר בלבד.
2. **אין רדיוס.** `--radius: 0` בכל מקום. היוצא היחיד: פנס = עיגול מושלם.
3. **אין צל.** יוצא יחיד: הילת פנס בלילה, `0 0 42px rgba(247,245,240,.35)`.

---

## 1. `app/globals.css` — הטוקנים

מחליף את בלוק ה־`:root` הקיים במלואו. **מוחקים** את `--ochre` (צהוב), `--verified` (ירוק), `--paper-2/3`, `--red-deep`, `.plate-offset` ואת כל בלוק ה־`.dark` — אין מצב כהה אוטומטי; "לילה" הוא בחירת משתמש (סעיף 4.9).

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/*
  THE WORKER — אוסישקין
  הקיר הוא המקום · התיק הוא הראיה · המגדל הוא המידה
  אין צהוב · רדיוס 0 · אין צללים (למעט הילת פנס בלילה)
*/
:root {
  --sheet: 247 245 240;      /* #F7F5F0 נייר, לוחית אמייל, פנס דולק */
  --paper: 231 228 220;      /* #E7E4DC הקיר — רקע המסך */
  --ink: 18 17 16;           /* #121110 טקסט, קווים, קיר לילה */
  --red: 206 20 16;          /* #CE1410 חותמת, בד, פעולה ראשית */
  --concrete: 169 164 155;   /* #A9A49B זרוע שילוט, בטון, מטא */
  --sign: 20 53 126;         /* #14357E ערבית/אנגלית, מקורות, ודאות */
  --muted: 90 86 79;         /* #5A564F טקסט משני על נייר */
  --lamp-off: 31 29 27;      /* #1F1D1B פנס כבוי בלילה */

  --rule-hair: 1px;
  --rule: 2px;
  --rule-plate: 3px;

  --gutter: 15px;
  --stack: 16px;
  --tap: 48px;               /* גובה מינימלי לכל אלמנט לחיץ */

  --ease-stamp: cubic-bezier(0.2, 0, 0, 1);
  --ease-peel: cubic-bezier(0.4, 0, 1, 1);
}

@media (min-width: 768px) { :root { --gutter: 40px; --stack: 24px; } }

body {
  background-color: rgb(var(--paper));
  color: rgb(var(--ink));
  /* מרקם הקיר: סריקות אנכיות עדינות, 5% דיו. לא גרעין הדפסה. */
  background-image: repeating-linear-gradient(94deg, rgb(var(--ink) / 0.05) 0 1px, transparent 1px 15px);
}

/* קצה קרוע — יחידת התוכן */
.torn {
  clip-path: polygon(0 2%, 100% 0, 100% 97%, 82% 100%, 56% 96%, 30% 100%, 10% 97%, 0 99%);
}
/* קצה גלי — בד אוהדים */
.cloth {
  clip-path: polygon(0 0, 100% 4%, 100% 100%, 0 93%);
}
/* סבכת התורן */
.lattice {
  background-image: repeating-linear-gradient(28deg, rgb(var(--ink)) 0 2px, transparent 2px 12px);
}

:where(a, button, [role="button"], [tabindex]):focus-visible {
  outline: 3px solid rgb(var(--red));
  outline-offset: 2px;
}

::selection { background: rgb(var(--red) / 0.18); }

@keyframes stamp-in {
  0%   { transform: rotate(-16deg) scale(2.8); opacity: 0; }
  55%  { opacity: 1; }
  75%  { transform: rotate(-7deg) scale(0.94); }
  100% { transform: rotate(-8deg) scale(1); opacity: 1; }
}
@keyframes lamp-on { from { opacity: 0.15; } to { opacity: 1; } }
@keyframes paste-in {
  from { transform: translateY(24px) rotate(0deg); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 2. `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sheet: 'rgb(var(--sheet) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        red: 'rgb(var(--red) / <alpha-value>)',
        concrete: 'rgb(var(--concrete) / <alpha-value>)',
        sign: 'rgb(var(--sign) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'lamp-off': 'rgb(var(--lamp-off) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-frank)', 'Georgia', 'serif'],   // כותרות
        sign: ['var(--font-miriam)', 'system-ui', 'sans-serif'], // שילוט, חותמות
        body: ['var(--font-heebo)', 'system-ui', 'sans-serif'],  // ממשק
        mono: ['var(--font-courier)', 'ui-monospace', 'monospace'], // סריאלים
      },
      fontSize: {
        'step--1': ['0.833rem', { lineHeight: '1.5' }],
        'step-0': ['1rem', { lineHeight: '1.6' }],
        'step-1': ['1.2rem', { lineHeight: '1.45' }],
        'step-2': ['1.44rem', { lineHeight: '1.35' }],
        'step-3': ['1.728rem', { lineHeight: '1.25' }],
        'step-4': ['2.074rem', { lineHeight: '1.15' }],
        'step-5': ['2.986rem', { lineHeight: '1.02' }],
      },
      borderRadius: { none: '0', DEFAULT: '0', full: '9999px' }, // full = פנס בלבד
      borderWidth: { hair: '1px', rule: '2px', plate: '3px', stamp: '5px' },
      spacing: { gutter: 'var(--gutter)', stack: 'var(--stack)', tap: 'var(--tap)' },
      transitionTimingFunction: { stamp: 'var(--ease-stamp)', peel: 'var(--ease-peel)' },
      transitionDuration: { press: '90ms', plate: '160ms', stamp: '240ms', peel: '260ms', paste: '320ms' },
      boxShadow: { lamp: '0 0 42px rgba(247,245,240,.35)' }, // הצל היחיד בפרויקט
      animation: {
        'stamp-in': 'stamp-in 240ms var(--ease-stamp) both',
        'lamp-on': 'lamp-on 90ms linear both',
        'paste-in': 'paste-in 320ms var(--ease-stamp) both',
      },
    },
  },
  plugins: [],
}
export default config
```

**מוסיפים ל־ESLint/CI חוק:** כל שימוש ב־`rounded-*` (למעט `rounded-full` בתוך `LampGrid`), ב־`shadow-*` (למעט `shadow-lamp`), או בכל hex בקוד — נכשל ב־review.

---

## 3. גופנים — `app/layout.tsx`

```tsx
import { Frank_Ruhl_Libre, Miriam_Libre, Heebo, Courier_Prime } from 'next/font/google'

const frank = Frank_Ruhl_Libre({ subsets: ['hebrew', 'latin'], weight: ['700', '900'], variable: '--font-frank', display: 'swap' })
const miriam = Miriam_Libre({ subsets: ['hebrew', 'latin'], weight: ['400', '700'], variable: '--font-miriam', display: 'swap' })
const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '800'], variable: '--font-heebo', display: 'swap' })
const courier = Courier_Prime({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-courier', display: 'swap' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${frank.variable} ${miriam.variable} ${heebo.variable} ${courier.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
```

חלוקת תפקידים, בלי חריגות:

| גופן | תפקיד | מותר |
|---|---|---|
| Frank Ruhl Libre 900 | כותרות גיליון, כרזה, מספר ניקוד גדול | ≥ 22px בלבד |
| Miriam Libre 700 | לוחית שילוט, חותמות, בד אוהדים, שם מסך | 14–30px |
| Heebo 400/500/800 | כל טקסט ממשק וגוף | הכל |
| Courier Prime 400/700 | סריאלים (`TIK-0417`), מקורות, זמן, מספר חולצה, אנגלית | לא לגוף עברי |

מספרים: `tabular-nums` תמיד. שם לטיני בתוך עברית: `<bdi>`.

---

## 4. קומפוננטות

כולן `components/ui/`. RTL: **רק** logical properties (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`) — אף פעם `left/right`.

### 4.1 `Stamp.tsx` — חותמת הפטיש והמגל

הסימן הראשי וגם סימן האימות. שים לב: `mix-blend-mode: multiply` הוא מה שגורם לזה להיראות מוטבע.

```tsx
type StampProps = {
  label?: 'אומת' | 'נדחה' | null   // null = סימן בלבד, בלי מסגרת טקסט
  ring?: boolean                    // טבעת + טקסט היקפי (מ־64px ומעלה)
  tone?: 'red' | 'ink' | 'sheet'
  size?: number
  animate?: boolean
}

const TONE = { red: 'rgb(var(--red))', ink: 'rgb(var(--ink))', sheet: 'rgb(var(--sheet))' }

export function Stamp({ label = null, ring = true, tone = 'red', size = 96, animate = false }: StampProps) {
  const c = TONE[tone]
  return (
    <div
      className={`inline-flex items-center gap-2 mix-blend-multiply ${animate ? 'animate-stamp-in' : ''}`}
      style={{ transform: animate ? undefined : 'rotate(-8deg)' }}
      aria-hidden={!label}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} role={label ? 'img' : undefined} aria-label={label ?? undefined}>
        {ring && <>
          <circle cx="100" cy="100" r="94" fill="none" stroke={c} strokeWidth="7" />
          <circle cx="100" cy="100" r="82" fill="none" stroke={c} strokeWidth="2" />
          <defs><path id="stamp-ring" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" /></defs>
          <text fill={c} className="font-sign" style={{ fontWeight: 700, fontSize: 14, letterSpacing: 2.5 }}>
            <textPath href="#stamp-ring" startOffset="3%">ארכיון · הפועל תל אביב · 1923 · אומת</textPath>
          </text>
        </>}
        <g stroke={c} fill={c}>
          <path d="M52 132 A 74 74 0 0 1 128 56" fill="none" strokeWidth={ring ? 15 : 20} strokeLinecap="round" />
          {ring && <path d="M52 132 L 42 146" strokeWidth="12" strokeLinecap="round" />}
          <path d="M62 148 L 122 88" strokeWidth={ring ? 14 : 19} />
          <path d="M112 74 L 140 102 L 126 116 L 98 88 Z" strokeWidth="0" />
        </g>
      </svg>
      {label && (
        <span className="font-sign border-stamp px-4 py-1 text-step-4 leading-none" style={{ borderColor: c, color: c }}>
          {label}
        </span>
      )}
    </div>
  )
}
```

כללים: זווית `-8°` (טווח מותר 6°–12°). מינימום 24px, ואז `ring={false}`. אסור צל, אסור מילוי הטבעת, אסור על גבי תמונה.

### 4.2 `SignPlate.tsx` — לוחית אוסישקין (כותרת מסך)

```tsx
export function SignPlate({ title, sub, arm = true }: { title: string; sub?: string; arm?: boolean }) {
  return (
    <div className="flex items-start">
      {arm && <div className="w-[10px] self-stretch min-h-[66px] bg-concrete" aria-hidden="true" />}
      <div className="relative mt-[6px] border-plate border-ink bg-sheet px-3.5 pb-2 pt-1.5">
        <div className="pointer-events-none absolute inset-[3px] border-hair border-ink/45" />
        <h1 className="relative font-sign text-step-2 leading-none text-ink">{title}</h1>
        {sub && <p className="relative font-body text-[10.5px] leading-relaxed text-sign">{sub}</p>}
      </div>
    </div>
  )
}
```

`sub` הוא תמיד `ערבית · ENGLISH` בכחול השילוט. שימוש: כותרת מסך אחת בכל מסך. לא לכפתורים, לא לכרטיסים.

מיפוי שמות מסכים:

| מסך | title | sub |
|---|---|---|
| בית | הארכיון | الأرشيف · THE ARCHIVE |
| טריוויה | טריוויה | تريفيا · TRIVIA |
| הרכב | בניית הרכב | التشكيلة · LINEUP |
| זיכרון | זיכרון | الذاكرة · MEMORY |
| מדים | מדים | القمصان · KITS |
| פרופיל | פנקס חבר | دفتر العضو · MEMBER BOOK |

### 4.3 `LampGrid.tsx` — סורג המגדל (כל נתון)

```tsx
type LampGridProps = {
  total?: number          // 20 = סורג מלא, 12 = לוח זיכרון, 14 = פס רצף
  on: number              // כמה דולקים
  cols?: number           // 5 בסורג, 4 בלוח זיכרון
  night?: boolean
  tilt?: boolean          // -5° — רק בסורג הראשי
  glow?: boolean          // הילה לבנה — לילה בלבד
  label?: string
}

export function LampGrid({ total = 20, on, cols = 5, night = false, tilt = false, glow = false, label }: LampGridProps) {
  return (
    <div role="img" aria-label={label ?? `${on} מתוך ${total} פנסים דולקים`}>
      <div
        className={`grid gap-1.5 border-plate p-1.5 ${night ? 'border-sheet' : 'border-ink bg-sheet'} ${glow ? 'shadow-lamp' : ''}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, transform: tilt ? 'rotate(-5deg)' : undefined }}
      >
        {Array.from({ length: total }, (_, i) => (
          <i
            key={i}
            className={`block aspect-square rounded-full border-hair
              ${night
                ? i < on ? 'bg-sheet border-sheet/50' : 'bg-lamp-off border-sheet/45'
                : i < on ? 'bg-ink border-ink' : 'border-ink'}`}
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
```

תורן (מתחת לסורג, כשמציגים מגדל שלם):

```tsx
export function Mast({ height = 96, night = false }: { height?: number; night?: boolean }) {
  return (
    <>
      <div className={`lattice mx-auto w-5 border-x-rule ${night ? 'border-sheet' : 'border-ink'}`} style={{ height }} />
      <div className="mx-auto h-2.5 w-11 bg-concrete" />
    </>
  )
}
```

שימושים מחויבים: רצף ימים · ניקוד סבב · לוח זיכרון · טעינה. **כל מספר במוצר שאפשר להראות כפנסים — מוצג כפנסים.**

### 4.4 `BannerCloth.tsx` — בד אוהדים (כותרת סעיף / חגיגה)

```tsx
export function BannerCloth({ children }: { children: React.ReactNode }) {
  return (
    <div className="cloth relative bg-red px-4 pb-4 pt-2.5">
      <div className="pointer-events-none absolute inset-0"
           style={{ backgroundImage: 'repeating-linear-gradient(96deg, rgb(var(--ink)/.09) 0 1px, transparent 1px 15px)' }} />
      <p className="relative font-sign text-step-2 leading-none tracking-wide text-sheet">{children}</p>
    </div>
  )
}
```

פעם אחת במסך, גובה 44–60px, טקסט קצר בלבד (עד 5 מילים). אסור טקסט קטן על הבד.

### 4.5 `PastedSheet.tsx` — הגיליון (יחידת התוכן)

```tsx
type SheetProps = {
  id: string                 // מזהה קבוע — ממנו נגזרת הזווית
  kicker?: string            // 'גיליון היום · 31.08'
  serial?: string            // 'TIK-0417'
  tone?: 'sheet' | 'red'
  depth?: 0 | 1 | 2          // 0 = עליון
  children: React.ReactNode
}

// זווית דטרמיניסטית לפי id — לא Math.random, אחרת הגיליון "רועד" בכל רינדור
const tiltOf = (id: string) => {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 800
  return (h / 100 - 4).toFixed(2) // -4deg .. +4deg
}

const DEPTH = [
  { z: 3, opacity: 1, offset: 0, scale: 1 },
  { z: 2, opacity: 0.92, offset: 11, scale: 0.985 },
  { z: 1, opacity: 0.8, offset: 21, scale: 0.97 },
]

export function PastedSheet({ id, kicker, serial, tone = 'sheet', depth = 0, children }: SheetProps) {
  const d = DEPTH[depth]
  return (
    <article
      className={`torn absolute inset-0 border-hair p-4 ${tone === 'red' ? 'bg-red text-sheet' : 'bg-sheet text-ink'} border-ink/35 transition-[transform,opacity] duration-paste ease-stamp`}
      style={{ zIndex: d.z, opacity: d.opacity, transform: `translateY(${d.offset}px) scale(${d.scale}) rotate(${tiltOf(id)}deg)` }}
    >
      {(kicker || serial) && (
        <div className="flex justify-between font-mono text-[9.5px] tracking-wider opacity-80">
          <span>{kicker}</span><span>{serial}</span>
        </div>
      )}
      {children}
    </article>
  )
}
```

ערימה: שלושה מקסימום. גיליון חדש נכנס עם `animate-paste-in`. חזרה אחורה = קילוף (`duration-peel ease-peel`), **לא** fade. לכל גיליון סריאל תיק.

### 4.6 `AnswerRow.tsx` — שורת תשובה

```tsx
export function AnswerRow({ letter, text, picked, onPick }: { letter: string; text: string; picked: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className={`flex min-h-tap w-full items-center gap-3 border-b-hair border-ink/30 px-1 py-3.5 text-start
                  transition-transform duration-press active:scale-[.96] ${picked ? 'bg-red/[.09]' : ''}`}
    >
      <span className="grid h-6 w-6 place-items-center border-rule border-ink font-sign text-red">{picked ? '✗' : ''}</span>
      <span className="w-4 font-body text-[11px] text-muted">{letter}</span>
      <span className="font-mono text-step-1 font-bold text-ink">{text}</span>
    </button>
  )
}
```

הצבעה: `bg-red/[.09]` בלבד — **לא** ירוק/אדום על התשובה. הפידבק הוא החותמת.

---

## 5. שמונת המסכים — מתכון לכל אחד

מבנה קבוע: `SignPlate` בראש → תוכן → `BannerCloth` (אופציונלי) → סרגל תחתון. הסרגל התחתון תמיד `bg-ink` עם קו אדום 3px למעלה, ארבע לשוניות: **הקיר · משחק · מגדל · התיק**.

**1. בית (הקיר)** — `/`
`SignPlate("הארכיון")` + `Stamp size=56 ring` בפינה · ארבע לוחיות מצב ברשת 2×2 (`טריוויה / בניית הרכב / זיכרון / מדים` עם סריאל 01–04) · פס רצף: `Mast` קטן + `LampGrid total=14 on=streak` + `13 / 20 לילות` · ערימת שלושה `PastedSheet` (היום / אתמול / הודעת ועד באדום) · כפתור `הדבק גיליון חדש` · `BannerCloth("מי שזוכר, שומר")` · סרגל.

**2. טריוויה — שאלה** — `/trivia`
`SignPlate("טריוויה")` + `04/10 · 02:41` ב־mono · `PastedSheet` עם השאלה ב־`font-display text-step-3` + `LampGrid total=10 on=answered cols=10` כהתקדמות + שורת מקור בכחול (`מקור: ויקיפועל · ודאות 3 · TIK-0031`) · ארבע `AnswerRow` · הערה נייטרלית: "סמנו סעיף אחד. החותמת נוחתת מיד אחריו." · סרגל.

**3. טריוויה — תשובה** — אותו מסך, מצב שני
`Stamp label="אומת" animate` (או `נדחה` ב־`tone="ink"`) נוחתת מעל הגיליון · הערה: "נכון · 1923. נרשם בתיק ובגיליון." · פנס נוסף נדלק בפס ההתקדמות · כפתור `שאלה חדשה` **מופיע רק אחרי תשובה** · תמיד קישור `דווח על טעות` שכותב ל־`data_issue`.

**4. סיכום סבב** — `/trivia/summary`
מספר גדול `font-display text-step-5` (`13`) + `/20` ב־mono · `LampGrid total=20 on=13 cols=5` · `PastedSheet` עם תובנה אחת ("שתי טעויות היו על אותה עונה") + `Stamp ring size=64` על הפינה · שתי שורות נתונים בלבד (רצף / דירוג) · `BannerCloth` · שני כפתורים: `סבב נוסף` / `ראו את ההרכב האמיתי`.

**5. בניית הרכב** — `/lineup`
`SignPlate("בניית הרכב")` · כותרת המשחק (`גביע המדינה · גמר`) · אחד־עשר משבצות בחלוקה 1·4·4·2, כל אחת `min-h-tap`, מסגרת 2px, מספר ב־mono · משבצת מלאה = `bg-sheet` · סרגל תחתון: `שלח לאימות` + `04/11` · ניקוד מגיע מ־RPC בשרת, לא מהקליינט.

**6. זיכרון** — `/memory`
`SignPlate("זיכרון")` על רקע `bg-ink` (המסך הזה תמיד לילה) · 12 פנסים `rounded-full` ברשת 4×3 בתוך מסגרת 3px בזווית ‎-1.5°‎ · פנס סגור = `bg-sheet/12`, פתוח = `bg-sheet` עם הערך ב־Miriam, צמד שהושלם = `bg-red` · `Mast` מתחת ללוח · שורת מצב `3 / 6 צמדים` · `BannerCloth("הזיכרון הוא נכס קולקטיבי")`.

**7. מדים** — `/kits`
`SignPlate("מדים")` · חולצה נרנדרת מ־`kit.jsonb` כ־SVG שטוח, בלי צל, בלי גרדיאנט · שורת עונות אופקית (mono, tabular) · שני `PastedSheet` להשוואה בין שתי עונות · אם אין נתונים: מצב ריק "הסורג עוד לא נדלק כאן".

**8. פרופיל / שיאים** — `/me`
`SignPlate("פנקס חבר")` · פנקס = רשת 4×N משבצות, כל משחק שמוחתם מקבל `Stamp ring={false} size=28` · `LampGrid total=20` לרצף · שלוש שורות שיאים ב־mono · `דווח על טעות` + מספר התיקונים שאושרו על שמך (זו התהילה במוצר הזה, לא כוכבים).

**מצבי מערכת** (שלושתם חייבים להתקיים בכל מסך): ריק — מסגרת 2px + Miriam 700 + שורת הסבר. שגיאה — אותה מסגרת באדום. טעינה — `LampGrid` בפנסים כבויים עם `animate-lamp-on` ב־stagger 40ms. **בלי ספינרים, בלי skeleton אפור.**

---

## 6. מוטיון

| אינטראקציה | משך | האטה | מה זז |
|---|---|---|---|
| החתמה | 240ms | `--ease-stamp` | scale 2.8→1, rotate ‎-8°‎, opacity 0→1 |
| הדלקת פנס | 90ms | linear, stagger 40ms | כבוי→דולק, 20 פנסים = 900ms |
| הדבקת גיליון | 320ms | `--ease-stamp` | translateY 24→0 + זווית הגיליון |
| קילוף | 260ms | `--ease-peel` | translateY 0→18, opacity 1→.8 |
| לוחית נכנסת | 160ms | `--ease-stamp` | rotate 6°→0 |
| לחיצה | 90ms | ease-out | scale .96 |
| כתובית רצה | 22s | linear infinite | translateX 0→‎-50%‎, נעצרת ב־hover |

אין fade כמעבר מסך, אין bounce, אין spring, אין page transition.

---

## 7. קופי

רגיסטר: **סיסמת מניפסט לכותרת, לשון ארכיונית מדויקת לתוכן.** קצר, יבש, בלי סימני קריאה, בלי אימוג׳י, בלי "וואו".

מיתרים להוסיף ל־`messages/he.json`:

```json
{
  "brand.name": "הפועל",
  "brand.system": "אוסישקין",
  "brand.tagline": "הקיר הוא המקום. התיק הוא הראיה.",
  "slogan.remember": "מי שזוכר, שומר",
  "slogan.collective": "הזיכרון הוא נכס קולקטיבי",
  "slogan.light": "האור נדלק לכולם",
  "slogan.source": "כל עובדה נושאת מקור",
  "trivia.prompt": "סמנו סעיף אחד. החותמת נוחתת מיד אחריו.",
  "trivia.correct": "נכון · נרשם בתיק ובגיליון.",
  "trivia.wrong": "שגוי · התיק נותר פתוח.",
  "wall.paste": "הדבק גיליון חדש",
  "wall.empty": "הקיר עוד ריק. הגיליון הראשון יודבק ב־06:00.",
  "error.sheet": "הגיליון לא נטען. אין חיבור לארכיון.",
  "report.cta": "דווח על טעות",
  "streak.label": "רצף הדלקה",
  "file.serial": "מספר תיק"
}
```

מה לא לכתוב: "כל הכבוד", "מעולה!", "אתה אלוף", "נסה שוב 😊". תשובה שגויה מקבלת עובדה, לא עידוד.

---

## 8. צ'קליסט קבלה (20 בדיקות)

1. אין שום צהוב בפרויקט — `grep` על hex וגם בדיקה חזותית של אור הפנסים.
2. אין `rounded-*` פרט ל־`rounded-full` בתוך `LampGrid`.
3. אין `shadow-*` פרט ל־`shadow-lamp` במסכי לילה.
4. אין hex בקוד — רק טוקנים.
5. כל צבע מהרשימה בסעיף 1, בלי תוספות.
6. ארבעה גופנים בלבד, בחלוקת התפקידים של סעיף 3.
7. `Frank Ruhl Libre` לא מופיע מתחת ל־22px.
8. כל מספר מוצג ב־`tabular-nums`.
9. אין `margin-left/right`, `padding-left/right`, `left/right` — רק logical.
10. כל אלמנט לחיץ ≥ 48px גובה.
11. `:focus-visible` אדום 3px על כל דבר לחיץ.
12. ניגודיות: דיו/נייר 17.4:1, אדום/נייר 5.2:1, כחול/נייר 10.6:1 — נבדק בכלי.
13. אין הסתמכות על צבע בלבד: נכון/שגוי נושאים גם חותמת וגם טקסט.
14. `SignPlate` אחת בכל מסך, עם שורת ערבית/אנגלית.
15. `BannerCloth` לא יותר מפעם אחת במסך.
16. ערימת גיליונות ≤ 3, זווית דטרמיניסטית לפי id.
17. כל מסך מיישם שלושה מצבים: ריק, שגיאה, טעינה — בשפת המערכת, בלי ספינר.
18. `prefers-reduced-motion` מבטל scale/stagger בכל מקום.
19. RTL נבדק ב־320 / 390 / 430 / 768 / 1440 — אין גלילה אופקית.
20. הסמל הרשמי של המועדון אינו בקוד. החותמת היא סימן מקורי; אם יתקבל אישור מהמועדון, הסמל ייכנס כקובץ נפרד ולא ישולב בתוך החותמת.

---

## 9. עדכון `claude/brand-library.md`

```md
## The Worker (הפועל) — v2 "אוסישקין"
- **Concept** — הקיר הוא המקום, התיק הוא הראיה, המגדל הוא המידה.
- **Territory** — תרבות מועדון פועלים: קיר גיליונות, תיק מוחתם, מגדל תאורה, שילוט אמייל.
- **Palette family** — נייר קר + דיו שחור + אדום חותמת + בטון + כחול שילוט. אין צהוב, אין ירוק.
- **Type pairing** — Frank Ruhl Libre 900 + Miriam Libre 700 + Heebo + Courier Prime.
- **Signature motif** — חותמת פטיש ומגל, סורג 20 פנסים כרשת נתונים, לוחית רחוב תלת־לשונית, גיליון קרוע מודבק.
- **Geometry** — רדיוס 0 (פנס = עיגול), קווים 2px, בלי צללים (הילת פנס בלילה בלבד).
- **Registered** — 2026-08-31 (מחליף v1 "לטרפרס ארכיוני").
```
