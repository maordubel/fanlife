'use client'

import { useEffect, useState } from 'react'

import { closetCard, gapsCard, matchCard, wantedCard } from '@/lib/collector/cards'
import { handleLabel } from '@/lib/collector/labels'
import { DEFAULT_SPEC } from '@/lib/kit/spec'
import {
  blackCard,
  clippingCard,
  clueCard,
  collectorCard,
  contactCard,
  debateCard,
  freezeCard,
  posterCard,
  programmeCard,
  slipCard,
  stripCard,
  ticketCard,
} from '@/lib/share/artefacts'
import { drawStory, lastInkBoxes, type InkBox, type StoryCard } from '@/lib/share/story'

/**
 * The worst cases, not the pretty ones.
 *
 * Every string here is chosen to be the longest of its kind that the app can actually
 * produce: the longest name on the 637-man roster, a full eight-row ballot with a
 * three-word answer in it, a headline that wraps. A check run on "90%" proves nothing —
 * that was exactly the card that looked fine while "מוחמד קליל טראורה" printed straight
 * through the number under it.
 */
const LONG_NAME = 'מוחמד קליל טראורה'

const CASES: Array<{ name: string; card: StoryCard }> = [
  {
    name: 'score',
    card: {
      template: 'score',
      kicker: 'GATE 2 · SHIRT NUMBERS',
      label: 'טריוויית מספרי שחקנים',
      eyebrow: 'תשובות נכונות',
      hero: '11/12',
      bigStat: { v: '2400', k: 'ניקוד' },
      stats: [
        { k: 'רצף הכי ארוך', v: '9' },
        { k: 'שחקן', v: LONG_NAME },
      ],
      marks: [true, true, false, true, true, true, true, false, true, true, true, true],
      cta: 'תנסה לעבור אותי',
      challenge: 'אותו סבב בדיוק',
    },
  },
  {
    name: 'ink',
    card: {
      template: 'ink',
      kicker: 'GATE 11 · THE HATRED GAME',
      label: 'משחק השנאה',
      eyebrow: 'השנוא ביותר',
      hero: LONG_NAME,
      bigStat: { v: '7', k: 'סבבים' },
      stats: [{ k: 'הכי שנוא', v: LONG_NAME }],
      cta: 'מי שלך?',
      challenge: 'אותו סבב בדיוק',
    },
  },
  {
    name: 'year',
    card: {
      template: 'year',
      kicker: 'GATE 13 · TIMELINE',
      label: 'ציר הזמן',
      eyebrow: 'הוצבו נכון',
      hero: '10/10',
      bigStat: { v: '3200', k: 'ניקוד' },
      stats: [
        { k: 'רצף הכי ארוך', v: '10' },
        { k: 'הוצבו נכון', v: '10/10' },
      ],
      cta: 'תבנה ציר משלך',
      challenge: 'אותו סבב בדיוק',
    },
  },
  {
    /**
     * דשא — gate 8's ground, and until 19.9.2026 the one template nobody measured.
     *
     * The harness drew `score`, `ink`, `year`, `xi` and `ballot`; `grass` shipped on every
     * שחזור השער result and was never in it. That was survivable while the hero was
     * "2/6"; the rebuilt gate prints a percentage and a second one beside it, and a
     * template that has never been intersected is a template whose next long string is
     * found by a player (rule 19).
     */
    name: 'grass',
    card: {
      template: 'grass',
      kicker: 'GATE 8 · REBUILD THE GOAL',
      label: 'שחזור השער',
      eyebrow: 'ציון המהלך',
      hero: '100%',
      bigStat: { v: '100%', k: 'המהלך הטוב ביותר' },
      stats: [
        { k: 'ניקוד', v: '4200' },
        { k: 'המשכיות', v: '100%' },
      ],
      cta: 'תשחזר את השער בעצמך',
      challenge: 'אותו סבב בדיוק',
    },
  },
  {
    name: 'xi',
    card: {
      template: 'xi',
      kicker: 'GATE 1 · ALL-TIME XI',
      label: 'הרכב כל הזמנים',
      eyebrow: '4-4-2',
      hero: 'הרכב כל הזמנים',
      stats: [],
      xi: [
        { roleHe: 'שוער', nameHe: LONG_NAME, x: 50, y: 94 },
        { roleHe: 'מגן', nameHe: LONG_NAME, x: 16, y: 72 },
        { roleHe: 'בלם', nameHe: 'אמסלם', x: 39, y: 72 },
        { roleHe: 'בלם', nameHe: 'אנטביקה', x: 61, y: 72 },
        { roleHe: 'מגן', nameHe: 'בן דיין', x: 84, y: 72 },
        { roleHe: 'כנף', nameHe: LONG_NAME, x: 16, y: 48 },
        { roleHe: 'קשר', nameHe: 'בוזגלו', x: 39, y: 48 },
        { roleHe: 'קשר', nameHe: 'ניסים', x: 61, y: 48 },
        { roleHe: 'כנף', nameHe: 'זהבי', x: 84, y: 48 },
        { roleHe: 'חלוץ', nameHe: LONG_NAME, x: 39, y: 22 },
        { roleHe: 'חלוץ', nameHe: 'דמיאנוביץ', x: 61, y: 22 },
      ],
      cta: 'תרכיב את שלך',
      challenge: 'אותו סבב בדיוק',
    },
  },
  {
    /*
     * The worst eleven — the same template with the longest title the app can hand it.
     * `story:overlap` measures the longest strings in the archive (rule 19), and this
     * head is where the length lives: `ההרכב הגרוע בכל הזמנים` is half again as long as
     * `הרכב כל הזמנים` and has to fit beside the formation.
     */
    name: 'xi-worst',
    card: {
      template: 'xi',
      kicker: 'GATE 1 · WORST XI · ONE FAN’S OPINION',
      label: 'ההרכב הגרוע בכל הזמנים',
      eyebrow: '4-2-3-1',
      hero: 'ההרכב הגרוע בכל הזמנים',
      stats: [],
      xi: [
        { roleHe: 'שוער', nameHe: LONG_NAME, x: 50, y: 94 },
        { roleHe: 'מגן', nameHe: LONG_NAME, x: 16, y: 72 },
        { roleHe: 'בלם', nameHe: LONG_NAME, x: 39, y: 72 },
        { roleHe: 'בלם', nameHe: 'אנטביקה', x: 61, y: 72 },
        { roleHe: 'מגן', nameHe: 'בן דיין', x: 84, y: 72 },
        { roleHe: 'כנף', nameHe: LONG_NAME, x: 16, y: 48 },
        { roleHe: 'קשר', nameHe: 'בוזגלו', x: 39, y: 48 },
        { roleHe: 'קשר', nameHe: 'ניסים', x: 61, y: 48 },
        { roleHe: 'כנף', nameHe: 'זהבי', x: 84, y: 48 },
        { roleHe: 'חלוץ', nameHe: LONG_NAME, x: 39, y: 22 },
        { roleHe: 'חלוץ', nameHe: 'דמיאנוביץ', x: 61, y: 22 },
      ],
      cta: 'תרכיב את הגרוע שלך',
      challenge: 'דעה של אוהד אחד. האפליקציה לא דירגה אף אחד.',
    },
  },
  {
    name: 'ballot',
    card: {
      template: 'ballot',
      kicker: 'GATE 7 · THE BALLOT',
      label: 'אגף הסקרים',
      eyebrow: 'פתק ההצבעה',
      hero: 'פתק ההצבעה',
      stats: [],
      ballot: [
        { ask: 'השחקן האהוב עליך בכל הזמנים', latin: 'ALL-TIME FAVOURITE', pick: LONG_NAME },
        { ask: 'השוער של כל הזמנים', latin: 'GOALKEEPER', pick: 'בונימוביץ' },
        { ask: 'הבלם של כל הזמנים', latin: 'CENTRE BACK', pick: LONG_NAME },
        { ask: 'הקשר של כל הזמנים', latin: 'MIDFIELD', pick: 'אבוקסיס' },
        { ask: 'החלוץ של כל הזמנים', latin: 'STRIKER', pick: LONG_NAME },
        { ask: 'הזר הכי טוב שלבש אדום', latin: 'BEST FOREIGNER', pick: 'דאגלס דה סילבה' },
        { ask: 'איזה מספר היית לובש', latin: 'YOUR NUMBER', pick: '10' },
        { ask: 'באיזו עמדה היית משחק', latin: 'YOUR POSITION', pick: 'קשר התקפי' },
      ],
      cta: 'תמלא פתק משלך',
      challenge: 'הפתק שלך מחכה',
    },
  },
  {
    /**
     * The same slip with a NAME on it — nine rows, not eight.
     *
     * Gate 7 prints the supporter's name on the shirt and puts it on the card as its own
     * row rather than into the hero line, because the ballot template sizes its rows by
     * how many there are and measures every baseline, while an eighteen-character name
     * swapped into an 84px hero is a collision nobody measured (rule 19). Nine rows is
     * therefore a shape this template really ships, and a shape the harness has to prove.
     */
    name: 'ballot-named',
    card: {
      template: 'ballot',
      kicker: 'GATE 7 · THE BALLOT',
      label: 'אגף הסקרים',
      eyebrow: 'פתק ההצבעה',
      hero: 'פתק ההצבעה',
      stats: [],
      ballot: [
        { ask: 'השם על החולצה', latin: 'NAME ON THE SHIRT', pick: 'מאוראבישידלובסקי' },
        { ask: 'השחקן האהוב עליך בכל הזמנים', latin: 'ALL-TIME FAVOURITE', pick: LONG_NAME },
        { ask: 'השוער של כל הזמנים', latin: 'GOALKEEPER', pick: LONG_NAME },
        { ask: 'הבלם של כל הזמנים', latin: 'CENTRE BACK', pick: LONG_NAME },
        { ask: 'הקשר של כל הזמנים', latin: 'MIDFIELD', pick: 'אבוקסיס' },
        { ask: 'החלוץ של כל הזמנים', latin: 'STRIKER', pick: LONG_NAME },
        { ask: 'הזר הכי טוב שלבש אדום', latin: 'BEST FOREIGNER', pick: 'דאגלס דה סילבה' },
        { ask: 'איזה מספר היית לובש', latin: 'YOUR NUMBER', pick: '10' },
        { ask: 'באיזו עמדה היית משחק', latin: 'YOUR POSITION', pick: 'קשר התקפי' },
      ],
      cta: 'תמלא פתק משלך',
      challenge: 'הפתק שלך מחכה',
    },
  },
  {
    /**
     * שער 10 — the Worker Card (`cardStory`, 21.9.2026): the nickname as the hero at its
     * longest the roster holds (a nickname is capped at 18, `NAME_MAX`), the three stats at their
     * longest values, and a two-digit number on the shirt's back.
     */
    name: 'worker-card',
    card: {
      template: 'kit',
      kicker: 'GATE 10 · WORKER CARD',
      label: 'התיק שלי',
      eyebrow: 'כרטיס פועל',
      hero: LONG_NAME,
      stats: [
        { k: 'שערים', v: '12/12' },
        { k: 'אוהד מאז', v: 'רק התחלתי' },
        { k: 'שער הבית', v: 'לא קבוע' },
      ],
      cta: 'תפתח פנקס משלך',
      challenge: 'כל שורה בכרטיס הזה נעשתה. שום דבר לא נקנה.',
      kit: { ...DEFAULT_SPEC, number: 99 },
    },
  },
  /*
   * הארון (22.9.2026) — the four collector cards, built by the SAME builders the closet calls
   * (`lib/collector/cards.ts`), with the longest strings they can be handed: an 18-character
   * nickname (`NAME_MAX`), a full 600-shirt closet, a year-only season with the longest variant,
   * and a decade of ten missing seasons — which is the most rows the archive holds for any decade.
   * These cards also keep every block inside the 260px safe zones; `story:overlap` checks that too.
   */
  { name: 'closet', card: closetCard({ name: 'מאוראבישידלובסקי', copies: 600, span: { from: 1949, to: 2026 }, keeper: '2016 בערך · שלישית' }) },
  { name: 'closet-bare', card: closetCard({ name: handleLabel({ handle: 184211, nickname: null }), copies: 1, span: { from: 1994, to: 1994 }, keeper: null }) },
  { name: 'wanted', card: wantedCard('1994 בערך', 'חולצת שוער') },
  { name: 'wanted-season', card: wantedCard('1994/95') },
  {
    name: 'gaps',
    card: gapsCard('שנות ה-2010', '0/10', ['2010 בערך', '2011 בערך', '2012 בערך', '2013 בערך', '2014 בערך', '2015 בערך', '2016/17', '2017/18', '2018/19', '2019/20']),
  },
  { name: 'gaps-five', card: gapsCard('שנות ה-90', '2/7', ['1991 בערך', '1992 בערך', '1994 בערך', '1997 בערך', '1999 בערך']) },
  { name: 'gaps-complete', card: gapsCard('שנות ה-50', '5/5', []) },
  { name: 'match', card: matchCard('1994 בערך', '2016 בערך') },
  { name: 'match-buy', card: matchCard('2016/17', null) },
  /*
   * Share V2 (28.9.2026) — one artefact per gate (ONE RED WORLD §28), built by the SAME
   * builders the gates call (`lib/share/artefacts.ts`), with the worst strings each can be
   * handed: the longest name, the longest match line, a full list for every list card.
   */
  { name: 'slip', card: slipCard({ topic: 'גביעי אירופה — שנות ה־90, קשה', marks: [true, false, true, true, false, true, true, true, false, true, true, true] }) },
  { name: 'slip-short', card: slipCard({ topic: 'היסטוריה', marks: [false, false, false, false, false, false] }) },
  {
    name: 'programme',
    card: programmeCard({
      match: 'הפועל תל אביב — מכבי חיפה, גמר גביע המדינה',
      date: 'שבת, 24 במאי 1986 · אצטדיון בלומפילד',
      slots: ['שוער', 'מגן ימני', 'בלם', 'בלם', 'מגן שמאלי', 'קשר אחורי', 'קשר', 'קשר התקפי', 'כנף ימין', 'חלוץ', 'כנף שמאל'].map((role, i) => ({ role, found: i % 3 !== 1 })),
    }),
  },
  { name: 'collector', card: collectorCard({ season: '1994 בערך · שלישית', serial: 33, kit: { ...DEFAULT_SPEC, number: 99 }, right: 5, total: 5 }) },
  {
    name: 'contact',
    card: contactCard({ moves: 999, frames: Array.from({ length: 12 }, (_, i) => ({ label: i % 2 ? LONG_NAME : 'אליפות 1985/86', hit: i % 4 !== 0 })) }),
  },
  { name: 'contact-six', card: contactCard({ moves: 6, frames: Array.from({ length: 6 }, (_, i) => ({ label: 'גביע המדינה 1983', hit: i !== 2 })) }) },
  { name: 'debate', card: debateCard({ question: 'הזר הכי טוב שלבש אדום', pick: LONG_NAME }) },
  { name: 'debate-short', card: debateCard({ question: 'השוער', pick: 'בונו' }) },
  {
    name: 'freeze',
    card: freezeCard({
      match: 'הפועל תל אביב — בנפיקה, ליגת האלופות 2010',
      route: [{ x: 10, y: 90 }, { x: 40, y: 70 }, { x: 85, y: 55 }, { x: 60, y: 30 }, { x: 50, y: 5 }],
      accuracy: 100,
      clock: "90+4'",
    }),
  },
  {
    name: 'poster',
    card: posterCard({
      rows: [
        { role: 'שוער', name: LONG_NAME },
        { role: 'בלם', name: 'אנטביקה' },
        { role: 'קשר', name: LONG_NAME },
        { role: 'חלוץ', name: 'דמיאנוביץ' },
        { role: 'חלוץ', name: LONG_NAME },
      ],
    }),
  },
  { name: 'clue', card: clueCard({ hints: 10, total: 10, solved: false }) },
  { name: 'clue-early', card: clueCard({ hints: 1, total: 10, solved: true }) },
  { name: 'black', card: blackCard({ rows: Array.from({ length: 12 }, (_, i) => ({ name: i % 2 ? LONG_NAME : 'אבי נמני', out: i < 11 })) }) },
  {
    name: 'clipping',
    card: clippingCard({
      date: '25.5.1986',
      headline: 'הפועל תל אביב אלופת המדינה בפעם העשירית: גילי לנדאו בדקה ה־86',
      caption: 'בלומפילד מלא עד אפס מקום, והיציע הדרומי לא הפסיק לשיר גם אחרי השריקה. כתבה מתוך מעריב ספורט, עמוד 3.',
      label: 'ARCHIVE · M_9F2C0A41B7D3',
    }),
  },
  {
    name: 'strip',
    card: stripCard({ variant: 'thread', steps: 12, rows: Array.from({ length: 12 }, (_, i) => ({ text: i % 2 ? LONG_NAME : 'גמר גביע המדינה 1983', ok: i !== 5 })) }),
  },
  { name: 'strip-order', card: stripCard({ variant: 'order', rows: Array.from({ length: 10 }, (_, i) => ({ text: 'העלייה לליגת העל 2009', ok: i % 3 !== 0 })) }) },
  {
    name: 'ticket',
    card: ticketCard({ year: '1986', place: 'בלומפילד · יציע דרומי', line: 'יש זיכרונות שלא היו שלי — עד ששיחקתי אותם. אבא החזיק לי את היד כל המשחק.', serial: 'NO. 053' }),
  },
]

type Report = Record<string, InkBox[]>

export function StoryProof() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // The faces have to be resident before the first fillText or every box is
      // measured against a system fallback and the report is about a card nobody ships.
      try {
        await Promise.all([
          document.fonts.load('700 200px Karantina'),
          document.fonts.load('400 118px "Suez One"'),
          document.fonts.load('400 30px Heebo'),
          document.fonts.load('800 30px Archivo'),
        ])
        await document.fonts.ready
      } catch {
        // measured against the fallback is still better than not measured
      }
      if (cancelled) return

      // The badge is loaded, not stubbed. The credit strip is where the logo, the name
      // and the address sit, and it is exactly the block Maor caught out of position —
      // a proof that renders it as `null` proves nothing about the part that was wrong.
      const badge = await new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => resolve(null)
        image.src = '/brand/logo-512.png'
      })

      const report: Report = {}
      for (const item of CASES) {
        // The canvas is mounted, not thrown away. The numbers catch collisions; only a
        // picture catches a card that is technically clear and still ugly, and both
        // checks want the same render — so the harness is a contact sheet as well.
        const host = document.getElementById(`proof-${item.name}`)
        const canvas = document.createElement('canvas')
        canvas.width = 1080
        canvas.height = 1920
        canvas.style.width = '360px'
        canvas.style.height = '640px'
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        drawStory(ctx, item.card, badge, null)
        report[item.name] = lastInkBoxes()
        host?.replaceChildren(canvas)
      }
      ;(window as unknown as { __storyInk?: Report }).__storyInk = report
      setDone(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main data-story-proof={done ? 'ready' : 'working'} className="p-6 font-mono text-sm">
      <p>{done ? 'ready' : 'working'}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        {CASES.map((item) => (
          <figure key={item.name}>
            <figcaption>{item.name}</figcaption>
            <div id={`proof-${item.name}`} />
          </figure>
        ))}
      </div>
    </main>
  )
}
