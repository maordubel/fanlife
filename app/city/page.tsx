import type { Metadata } from 'next'

/**
 * `/city` is a proofing tool, not a gate — it is not on the wall, not in `GATES`, and
 * not in the sitemap. A tool that answers on a public host and is not marked is a page
 * a crawler will index and a stranger will find, so it says so itself.
 */
import { Proof, type Shot } from './Proof'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * העיר, כדי להסתכל עליה — **ולזוז בה**.
 *
 *   /city?place=panoTamar                       — מקום אחד, להסתכל ולזוז בו
 *   /city?street=bloomfieldWalk                 — רחוב שלם, חמש תחנות
 *   /city?mission=bagForTheSteward              — ובתוכו משימה: ללכת, לדבר, למסור
 *
 * למה כאן ולא תחת `/qa`: מסכי ה-QA פטורים מכללי המותג בדיוק משום שהם לא נשלחים, ולכן כל
 * אחד מהם עושה `notFound()` בייצור — יש על זה שומר, והוא צדק כשהפיל את הניסיון הראשון
 * שלי לפרסם מסך QA. אבל הדבר שנבדק כאן הוא **תחושת הליכה**, ותמונה סטטית לא יכולה להראות
 * אותה; מאור חייב להחזיק את זה ביד. אז זה עמוד רגיל, שמציית לכללי המותג כמו כל עמוד אחר.
 * הוא לא כותב שום דבר לשמירה ולא נוגע במצב של אף שחקן, והוא נבלע לתוך המשחק ברגע ששלב 2
 * נכנס.
 */
export const dynamic = 'force-dynamic'

type Q = Record<string, string | string[] | undefined>

const num = (q: Q, key: string, fallback: number): number => {
  const raw = Array.isArray(q[key]) ? q[key]?.[0] : q[key]
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

export default async function Page({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams
  const place = (Array.isArray(q.place) ? q.place[0] : q.place) ?? 'panoTamar'
  const shot: Shot = {
    place,
    x: num(q, 'x', 0),
    z: num(q, 'z', 0),
    yaw: num(q, 'yaw', 0),
    // ברירת מחדל: מבט מעט למטה. גובה העין נמצא בשני שלישים העליונים של התצלום, ולכן
    // מצלמה מפולסת ממלאת שליש מסך בתחתית היציע — החלק היחיד בתמונה שאין בו כלום.
    pitch: num(q, 'pitch', -7),
    fov: num(q, 'fov', 68),
    hfov: num(q, 'hfov', 0),
    street: (Array.isArray(q.street) ? q.street[0] : q.street) ?? '',
    mission: (Array.isArray(q.mission) ? q.mission[0] : q.mission) ?? '',
    cast: (Array.isArray(q.cast) ? q.cast[0] : q.cast) ?? '',
    castAt: num(q, 'castAt', 5),
    actor: q.actor !== '0',
    deck: q.deck !== '0',
  }
  return <Proof shot={shot} />
}
