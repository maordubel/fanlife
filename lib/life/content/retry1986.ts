import type { LifeState } from '../types'

/**
 * 24.5.1986 — היום הזה נגמר. אבל עוד לא ככה.
 *
 * The Stage A brief closes one door that used to be open: the championship is MANDATORY.
 * A Saturday that ends with an eight-year-old who never got inside is a real Saturday and
 * the game says so — but it is not the Saturday this life is built on, and it does not
 * hand the player 1990. It hands him the morning back.
 *
 * Two things make that bearable rather than punishing, and both are the point of this
 * file. The first is that the failure is TOLD, in the shape it actually had: the boy who
 * stayed on the sofa, the boy who arrived against a tide of people coming out, the boy who
 * heard the noise through a wall he was standing against. Nobody is scolded and no counter
 * is shown.
 *
 * The second is the joke. For one card the game cuts to the life Pogi would have had if
 * that had really been the end of it — a life in which he becomes a traffic policeman
 * outside the ground he never entered, or, worse, buys a hat in the wrong colour. It is
 * played completely straight, for four seconds, and then the morning starts again. It is
 * a comedy beat about how absurd the alternative is, never a punishment and never about
 * anybody's real allegiance being contemptible: the fan of the other club in these lines
 * is Pogi himself, which is the only person this game is allowed to laugh at.
 */

export type RetryRoute = 'home' | 'outside' | 'turnedBack' | 'late'

export type RetryScene = {
  id: RetryRoute
  titleHe: string
  /** what actually happened, in the shape this route had */
  bodyHe: string
  /** the other life — the joke, played straight */
  otherLifeHe: string
  /** the line every route ends on */
  closeHe: string
}

const CLOSE = 'היום הזה נגמר. אבל עוד לא ככה.'

export const RETRY_1986: Record<RetryRoute, RetryScene> = {
  home: {
    id: 'home',
    titleHe: 'נשארת בבית',
    bodyHe:
      'הרעש הגיע מהמזרח בגלים. ספרת אותם מהמרפסת. בשלב מסוים כל הבניין ידע, ואתה ידעת לפני כולם — ולא היית שם.',
    otherLifeHe:
      'בחיים האחרים: פוגי בן שלושים וחמש, שוטר תנועה, עומד ביום שבת ליד בלומפילד ורושם דוחות לרכבים חונים. הוא לא נכנס. הוא רק רושם. פעם בחודש מישהו שואל אותו אם הוא אוהד, והוא אומר "אני בעבודה".',
    closeHe: CLOSE,
  },
  outside: {
    id: 'outside',
    titleHe: 'נשארת בחוץ',
    bodyHe:
      'עמדת עם הגב לקיר בטון ושמעת את זה דרכו. גל אחד ארוך, ואז עוד אחד, ואז שירה. היית במרחק שני מטרים מהיום הזה.',
    otherLifeHe:
      'בחיים האחרים: פוגי קונה כובע. הכובע צהוב-כחול. הוא אומר לעצמו "זה רק כובע". בגיל ארבעים הוא מסביר לילדים שלו למה זה לא באמת משנה באיזו קבוצה בוחרים, ואף אחד בבית לא מאמין לו.',
    closeHe: CLOSE,
  },
  turnedBack: {
    id: 'turnedBack',
    titleHe: 'חזרת',
    bodyHe:
      'הסתובבת באמצע הדרך. הרחוב המשיך בלעדיך מזרחה, וכל מי שעבר לידך הלך לכיוון השני. הגעת הביתה עם החולצה נקייה.',
    otherLifeHe:
      'בחיים האחרים: פוגי עובר לבית״ר, כי "שם לפחות שרים". הוא הולך לשלושה משחקים, לא מכיר אף אחד, ובמשחק הרביעי הוא מגלה שהוא עומד עם הגב למגרש ומסתכל על היציע ממול.',
    closeHe: CLOSE,
  },
  late: {
    id: 'late',
    titleHe: 'איחרת',
    bodyHe:
      'הגעת נגד הזרם. אלפי אנשים יצאו, ואתה נכנסת ביניהם, וכולם צעקו לך משהו שלא הספקת לשמוע כי הם כבר היו בכביש.',
    otherLifeHe:
      'בחיים האחרים: פוגי הופך למבקר מסעדות. באמת. הוא כותב ביקורות ארוכות על מקומות שהוא הגיע אליהם חצי שעה אחרי שסגרו את המטבח, ותמיד מוצא משהו להגיד על החניה.',
    closeHe: CLOSE,
  },
}

/**
 * איזה כישלון זה היה — read off the world, not off a menu.
 *
 * The route is a fact about where the boy was standing when the afternoon ran out, and
 * the scene is chosen from that alone: inside the ground is not a failure at all, at the
 * gate is `outside`, on the road home after having been on the road east is `turnedBack`,
 * and everything else is the sofa.
 */
export function retryFor(state: LifeState, sceneId: string): RetryScene {
  if (state.flags['entry:granted'] || sceneId === 'bloomfield-inside') return RETRY_1986.late
  if (sceneId === 'bloomfield-outside' || state.flags['saw:ground']) return RETRY_1986.outside
  if (state.flags['onboard:street'] && (sceneId === 'route' || state.flags['knows:match'])) {
    return RETRY_1986.turnedBack
  }
  return RETRY_1986.home
}
