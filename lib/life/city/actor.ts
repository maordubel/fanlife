import * as THREE from 'three'

/**
 * פוגי שהולך בעיר — איזה תצלום להראות, מתי.
 *
 * לדמויות של המשחק יש מחזור הליכה שלם **מהצד** (`pogi-w1..w8`, שמונה פריימים מצולמים) ורק
 * תמונה אחת **מהגב** (`pogi-back`). זה לא חוסר — זה בדיוק מה שדרוש, אם בוחרים לפי הכיוון:
 *
 * • הולך לתוך התמונה, מהמצלמה והלאה → הגב. מאחור הליכה נקראת כמעט כולה כ**נדנוד** ו**נטיית
 *   כתפיים**, ולא כתנועת רגליים — הרגליים מוסתרות זו מאחורי זו. לכן תמונה אחת עם נדנוד
 *   בקצב צעד משכנעת יותר ממחזור מזויף.
 * • הולך לרוחב הפריים → הצד, המחזור האמיתי, מהופך לפי הכיוון.
 *
 * הקצב הוא של הליכה אמיתית: שני צעדים למטר וחצי בערך, כלומר מחזור שלם לכל 1.5 מטר שעברו.
 * הוא נמדד בדרך שעברה ולא בזמן, ולכן פוגי לא "רץ במקום" כשעוצרים ולא מחליק כשמאיצים.
 */

export const ACTOR_BACK = 'pogi-back'
export const ACTOR_WALK = ['pogi-w1', 'pogi-w2', 'pogi-w3', 'pogi-w4', 'pogi-w5', 'pogi-w6', 'pogi-w7', 'pogi-w8']

/** מטרים לצעד — מחזור שלם של שמונה פריימים */
export const STRIDE = 1.5

export type ActorPose = {
  key: string
  /** להפוך את התצלום לרוחב — אותו מחזור משמש לשני הכיוונים */
  flip: boolean
  /** נדנוד אנכי במטרים; קטן בכוונה, כי מעל שלושה סנטימטרים זה כבר קפיצה */
  bob: number
}

/**
 * @param lateral  כמה מהתנועה היא לרוחב הפריים, יחסית למהירות (−1 שמאלה, +1 ימינה)
 * @param moved    הדרך שעברה מתחילת ההליכה, במטרים
 * @param moving   האם הוא בכלל זז
 */
export function actorPose(lateral: number, moved: number, moving: boolean): ActorPose {
  const phase = ((moved / STRIDE) % 1 + 1) % 1
  // הנדנוד הוא פעמיים למחזור — צעד ימין וצעד שמאל, לא צעד אחד
  const bob = moving ? Math.abs(Math.sin(phase * Math.PI * 2)) * 0.026 : 0
  if (!moving || Math.abs(lateral) < 0.55) return { key: ACTOR_BACK, flip: false, bob }
  const frame = ACTOR_WALK[Math.floor(phase * ACTOR_WALK.length) % ACTOR_WALK.length] ?? ACTOR_BACK
  // התצלומים מצולמים כשהוא הולך שמאלה על המסך; ימינה זה אותו מחזור, מהופך
  return { key: frame, flip: lateral > 0, bob }
}

/** טוען מראש את כל מה שהמחזור צריך, כדי שהחלפת פריים לא תהבהב */
export function loadActor(loader: THREE.TextureLoader): Record<string, THREE.Texture> {
  const out: Record<string, THREE.Texture> = {}
  for (const key of [ACTOR_BACK, ...ACTOR_WALK]) {
    const map = loader.load(`/life/art/${key}.webp`)
    map.colorSpace = THREE.SRGBColorSpace
    map.minFilter = THREE.LinearMipmapLinearFilter
    map.magFilter = THREE.LinearFilter
    map.anisotropy = 8
    out[key] = map
  }
  return out
}
