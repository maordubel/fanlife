/**
 * ציור הכרטיס — the picture a player actually posts, painted in the browser.
 *
 * The template is Maor's (`public/life/share/…`); this file only puts his words on it. That
 * split is deliberate and it is the same split the whole project runs on: the art is drawn
 * by a person, the layout is data, and the code never invents a look.
 *
 * Two shapes, because people post in two shapes: 1080×1920 for a story, and 1080×1080 for
 * everything that gets forwarded. Every coordinate below is in template pixels, so the brief
 * Maor draws against and the code that fills it read the same numbers — `docs/life/
 * SHARE-TEMPLATES-BRIEF.md` quotes this file rather than paraphrasing it.
 *
 * Hebrew is right-to-left, so every zone is anchored on its RIGHT edge and the canvas is
 * given `direction: 'rtl'` and `textAlign: 'right'`. A share card with a comma on the wrong
 * side is a card nobody posts.
 */
import type { ShareCard, ShareFormat } from '../share'
import { FORMAT_SIZE } from '../share'

export type Zone = {
  /** distance from the RIGHT edge of the template, in template pixels */
  right: number
  /** distance from the TOP, to the text baseline of the first line */
  top: number
  /** the width the text may use before it wraps */
  width: number
  size: number
  lineHeight: number
  /** how many lines this zone may take before the text is cut */
  maxLines: number
  weight: 400 | 500 | 700
  /** a token the template brief names, resolved against the card's own palette */
  ink: 'strong' | 'quiet' | 'accent'
}

export type Layout = {
  size: { w: number; h: number }
  kind: Zone
  when: Zone
  title: Zone
  body: Zone
  own: Zone
  footer: Zone
  /** where the object photograph (a ticket, a folded paper) is dropped, when the card has one */
  art: { right: number; top: number; w: number; h: number }
}

/**
 * הפריסה — and the reason the numbers look conservative.
 *
 * A story card is cropped differently by every app: Instagram eats the top ~250px behind the
 * avatar row and the bottom ~250px behind the reply box, WhatsApp letterboxes. So nothing
 * that must be read lives outside the middle 1400 pixels, and the footer sits at 1560 rather
 * than at the bottom edge where a reply field would swallow it.
 */
export const LAYOUT: Record<ShareFormat, Layout> = {
  /**
   * הסטורי, אחרי שמאור פסל את הראשון — והשינוי הוא בעיקר בסדר הגודל.
   *
   * הגרסה הראשונה נתנה את הבמה לכותרת ואת השוליים לתאריך, וזה היה הפוך. **התאריך הוא הקרס**:
   * אוהד הפועל שרואה `2.5.1998` בסטורי של חבר מרגיש משהו לפני שקרא מילה אחת, ומי שלא מרגיש
   * — לא הקהל שלנו. לכן 132 פיקסל, בראש השטח הנקי, ומתחתיו משפט אחד בגוף ראשון.
   *
   * והשורה האחרונה היא **שאלה, באדום**. זה החלק שהופך סטורי לתנועה: אין דרך לענות עליה
   * בסטורי של מישהו אחר, ויש דרך אחת להגיע למקום ששואלים בו — והכתובת כבר מודפסת למטה.
   *
   * הכל יושב בין 400 ל-1500, כלומר הרחק משתי הרצועות שאינסטגרם מכסה (250 למעלה, 250 למטה)
   * וגם לא נוגע בסמל שמאור צייר בפינה השמאלית־עליונה.
   */
  story: {
    size: FORMAT_SIZE.story,
    kind: { right: 96, top: 440, width: 888, size: 30, lineHeight: 40, maxLines: 1, weight: 500, ink: 'quiet' },
    when: { right: 96, top: 580, width: 888, size: 132, lineHeight: 140, maxLines: 1, weight: 700, ink: 'strong' },
    title: { right: 96, top: 730, width: 888, size: 56, lineHeight: 76, maxLines: 4, weight: 400, ink: 'strong' },
    own: { right: 96, top: 1120, width: 888, size: 44, lineHeight: 60, maxLines: 2, weight: 500, ink: 'quiet' },
    body: { right: 96, top: 1360, width: 888, size: 58, lineHeight: 76, maxLines: 2, weight: 700, ink: 'accent' },
    footer: { right: 96, top: 1560, width: 888, size: 32, lineHeight: 40, maxLines: 0, weight: 400, ink: 'quiet' },
    art: { right: 96, top: 1500, w: 180, h: 180 },
  },
  /**
   * הריבוע — אותו סדר בדיוק, ותבנית משלו שמאור צייר ב-7.9.2026.
   *
   * שם המשחק בפינה הימנית־עליונה, הסמל האדום בשמאלית, והכתובת בתחתית — שלושתם שלו, ושלושתם
   * מחוץ לתחום. מדדתי את הקובץ עצמו: הכתובת חיה בין 976 ל-1020, אז הטקסט נגמר ב-912 — תשעה־עשר
   * פיקסלים של אוויר לפני האות הראשונה שלו, ולא ניחוש.
   */
  square: {
    size: FORMAT_SIZE.square,
    kind: { right: 88, top: 400, width: 904, size: 26, lineHeight: 34, maxLines: 1, weight: 500, ink: 'quiet' },
    when: { right: 88, top: 510, width: 904, size: 100, lineHeight: 108, maxLines: 1, weight: 700, ink: 'strong' },
    title: { right: 88, top: 596, width: 904, size: 38, lineHeight: 52, maxLines: 3, weight: 400, ink: 'strong' },
    own: { right: 88, top: 776, width: 904, size: 32, lineHeight: 44, maxLines: 1, weight: 500, ink: 'quiet' },
    body: { right: 88, top: 856, width: 904, size: 44, lineHeight: 56, maxLines: 1, weight: 700, ink: 'accent' },
    footer: { right: 88, top: 940, width: 904, size: 28, lineHeight: 36, maxLines: 0, weight: 400, ink: 'quiet' },
    art: { right: 88, top: 640, w: 130, h: 130 },
  },
}

/** the template file each format expects, under `public/life/share/` */
export const TEMPLATE_FILE: Record<ShareFormat, string> = {
  story: '/life/share/share-story.png',
  square: '/life/share/share-square.png',
}

/**
 * הדיו — three tokens, so the templates can change their ground without the code changing.
 * No yellow anywhere (rule 8); these are the same three inks the game's own cards use.
 */
export const INK: Record<Zone['ink'], string> = {
  strong: '#f4f0e6',
  quiet: '#b9b2a3',
  accent: '#e0362c',
}

export const FONT_STACK = '"Heebo", "Assistant", system-ui, sans-serif'

/** wrap Hebrew text to a width, in the canvas that will draw it */
export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  if (!text) return []
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width || !line) {
      line = next
      continue
    }
    lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    const last = lines[maxLines - 1] as string
    lines[maxLines - 1] = `${last.replace(/[\s,.:;]+$/, '')}…`
  }
  return lines
}

function drawZone(ctx: CanvasRenderingContext2D, zone: Zone, text: string, width: number) {
  if (!text) return
  ctx.font = `${zone.weight} ${zone.size}px ${FONT_STACK}`
  ctx.fillStyle = INK[zone.ink]
  ctx.textAlign = 'right'
  ctx.direction = 'rtl'
  const x = width - zone.right
  const lines = wrap(ctx, text, zone.width, zone.maxLines)
  lines.forEach((line, index) => ctx.fillText(line, x, zone.top + index * zone.lineHeight))
}

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })

/**
 * הכרטיס, כתמונה.
 *
 * The template is loaded first and drawn as the ground. If it is missing — which is the
 * state of the world until Maor draws it — the card still renders on a flat ground rather
 * than failing, because a share button that does nothing is worse than a plain card.
 */
export async function paintShareCard(
  card: ShareCard,
  format: ShareFormat,
  options: { artSrc?: string | null } = {},
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  const layout = LAYOUT[format]
  const canvas = document.createElement('canvas')
  canvas.width = layout.size.w
  canvas.height = layout.size.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const template = await loadImage(TEMPLATE_FILE[format])
  if (template) {
    ctx.drawImage(template, 0, 0, layout.size.w, layout.size.h)
  } else {
    ctx.fillStyle = '#151310'
    ctx.fillRect(0, 0, layout.size.w, layout.size.h)
  }

  if (options.artSrc) {
    const art = await loadImage(options.artSrc)
    if (art) {
      const box = layout.art
      ctx.drawImage(art, layout.size.w - box.right - box.w, box.top, box.w, box.h)
    }
  }

  drawZone(ctx, layout.kind, card.kindHe, layout.size.w)
  drawZone(ctx, layout.when, card.dateHe, layout.size.w)
  drawZone(ctx, layout.title, card.claimHe, layout.size.w)
  drawZone(ctx, layout.body, card.askHe, layout.size.w)
  drawZone(ctx, layout.own, card.ownWordsHe ? `"${card.ownWordsHe}"` : '', layout.size.w)
  /**
   * שורת הרגל לא מצוירת — התבנית של מאור כבר נושאת את `TheWorker.DubelTeam.com` בתחתית,
   * ואת הסמל למעלה. האזור נשאר מוגדר כדי שהבריף והבדיקה ימשיכו לקרוא את אותם מספרים, אבל
   * מה שנכנס אליו הוא כלום. כתובת מודפסת פעמיים היא כרטיס שאף אחד לא שולח.
   */

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95))
}
