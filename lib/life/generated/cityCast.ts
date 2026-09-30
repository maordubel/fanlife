/**
 * נוצר אוטומטית — do not edit. סקריפטי הקליטה של הדמויות כותבים אותו מחדש:
 * `ingest-michel-2026-09-08.py` ו-`ingest-bloomfield-pack-2026-09-08.py`.
 *
 * הגובה של כל דמות **במטרים**, ולא בפיקסלים. זה מה שמאפשר להציב אותה בעיר: ברגע
 * שידוע שמישל הוא מטר שבעים וחמש, המנוע יודע כמה גדול הוא צריך להיראות בכל מרחק,
 * ואין שום מספר שצריך לכוונן ביד. תמונה בלי השורה הזאת היא תמונה שאי אפשר להעמיד
 * ברחוב.
 */
export type CastMember = {
  /** גובה הדמות במטרים */
  metres: number
  /** רוחב וגובה הקובץ, אחרי חיתוך לדמות עצמה */
  w: number
  h: number
}

export const CITY_CAST: Record<string, CastMember> = {
  'barryRadio': { metres: 1.81, w: 528, h: 1584 },
  'barryRadio-3q': { metres: 1.81, w: 495, h: 1578 },
  'barryToday': { metres: 1.81, w: 298, h: 951 },
  'barryToday-3q': { metres: 1.81, w: 243, h: 855 },
  'bfSignBox': { metres: 1.15, w: 1153, h: 1151 },
  'bfSignGate': { metres: 0.34, w: 1140, h: 1163 },
  'bfSteward': { metres: 1.78, w: 388, h: 1200 },
  'bfVendor': { metres: 1.7, w: 385, h: 1200 },
  'michel99': { metres: 1.75, w: 330, h: 934 },
  'michel99-3q': { metres: 1.75, w: 307, h: 914 },
  'ofir86': { metres: 1.46, w: 389, h: 1200 },
  'pogi-3q-l': { metres: 1.3, w: 366, h: 1200 },
  'pogi-3q-r': { metres: 1.3, w: 347, h: 1200 },
  'pogi-w1': { metres: 1.3, w: 835, h: 1264 },
  'pogi-w2': { metres: 1.3, w: 835, h: 1264 },
  'pogi-w3': { metres: 1.3, w: 835, h: 1264 },
  'pogi-w4': { metres: 1.3, w: 835, h: 1264 },
  'pogi-w5': { metres: 1.3, w: 835, h: 1264 },
  'pogi-w6': { metres: 1.3, w: 835, h: 1264 },
  'pogi-w7': { metres: 1.3, w: 835, h: 1264 },
  'pogi-w8': { metres: 1.3, w: 835, h: 1264 },
}
