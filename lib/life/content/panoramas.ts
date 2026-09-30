import type { PanoSpot } from '../runtime/bus'

/**
 * המבטים — where the game becomes the boy's eyes, and what there is to look at.
 *
 * Each panorama is a place seen from one point at a child's height; each mark is a
 * yaw (degrees, 0 = the centre of the painting, positive = to the right) and a pitch
 * (degrees up), with a conversation to start. The conversations live with the other
 * content (`dialoguePanoramas.ts`); nothing here states a fact the archive does not.
 *
 * The stand-in panoramas are mirrored flat paintings, so the yaws below are placed
 * for the REAL paintings described in `ART-BRIEF-FIRST-PERSON.md` (horizon at 48%,
 * subject ahead at yaw 0, the way we came at 180) and will be nudged once they land.
 */
export type PanoLook = { titleHe: string; startYaw?: number; spots: PanoSpot[] }

export const PANO_SPOTS: Record<string, PanoLook> = {
  panoReveal: {
    titleHe: 'פי המנהרה',
    spots: [
      { yaw: 0, pitch: -6, labelHe: 'המגרש', act: 'look-reveal-pitch' },
      { yaw: -62, pitch: 4, labelHe: 'היציע שלנו', act: 'look-reveal-terrace' },
      { yaw: 58, pitch: 18, labelHe: 'עמודי התאורה', act: 'look-reveal-lights' },
      { yaw: 178, pitch: -2, labelHe: 'המנהרה', act: 'look-reveal-tunnel' },
    ],
  },
  panoUssHall: {
    titleHe: 'אולם אוסישקין',
    spots: [
      { yaw: 0, pitch: 6, labelHe: 'היציע האדום', act: 'uss-stand' },
      { yaw: 40, pitch: 22, labelHe: 'פס החלונות', act: 'uss-windows' },
      { yaw: -90, pitch: 10, labelHe: 'הסל', act: 'uss-basket' },
      { yaw: 8, pitch: -22, labelHe: 'הפרקט', act: 'uss-parquet' },
      { yaw: 178, pitch: 6, labelHe: 'היציע הבהיר', act: 'look-uss-cream' },
    ],
  },
  panoKitchen90: {
    titleHe: 'שולחן המטבח',
    spots: [
      { yaw: 0, pitch: -18, labelHe: 'הטבלה', act: 'table-1990' },
      { yaw: 14, pitch: -14, labelHe: 'הטרנזיסטור', act: 'radio-table-1990' },
      { yaw: -8, pitch: 2, labelHe: 'הכיסא של אבא', act: 'look-kitchen-chair' },
      { yaw: -70, pitch: 10, labelHe: 'החלון', act: 'look-kitchen-window' },
    ],
  },
  panoBedroomMorning90: {
    titleHe: 'הבוקר אחרי',
    spots: [
      { yaw: 12, pitch: -20, labelHe: 'התיק', act: 'look-morning-bag' },
      { yaw: -40, pitch: 14, labelHe: 'התריס', act: 'look-morning-shutter' },
      { yaw: 60, pitch: 10, labelHe: 'הקיר', act: 'look-morning-wall' },
    ],
  },
  panoGate7: {
    titleHe: 'מול שער 7',
    spots: [
      { yaw: 0, pitch: 2, labelHe: 'הקרוסלה', act: 'look-gate-turnstile' },
      { yaw: 30, pitch: 8, labelHe: 'שני כרטיסים', act: 'look-gate-tickets' },
      { yaw: -50, pitch: 0, labelHe: 'הסדרן', act: 'steward-1990' },
      { yaw: 178, pitch: 0, labelHe: 'הדרך', act: 'look-gate-road' },
    ],
  },
  panoTerrace1986: {
    titleHe: 'על היציע',
    spots: [
      { yaw: 0, pitch: -4, labelHe: 'המגרש', act: 'look-terrace-pitch' },
      { yaw: 28, pitch: 6, labelHe: 'הרדיו של מישהו', act: 'look-terrace-radio' },
      { yaw: -35, pitch: 10, labelHe: 'הצעיפים', act: 'look-terrace-scarves' },
    ],
  },
  panoClassroom: {
    titleHe: 'הכיתה',
    spots: [
      { yaw: 0, pitch: 8, labelHe: 'הלוח', act: 'look-class-board' },
      { yaw: 6, pitch: -26, labelHe: 'המחברת', act: 'look-class-notebook' },
      { yaw: -60, pitch: 12, labelHe: 'החלונות', act: 'look-class-windows' },
    ],
  },
  panoUssDerby: {
    titleHe: 'ליל הדרבי',
    spots: [
      { yaw: 0, pitch: 8, labelHe: 'היציע האדום', act: 'look-derby-stand' },
      { yaw: -90, pitch: 4, labelHe: 'המגרש', act: 'look-derby-court' },
      { yaw: 178, pitch: 6, labelHe: 'היציע הבהיר', act: 'look-derby-cream' },
    ],
  },
}
