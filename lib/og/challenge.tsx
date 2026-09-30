import 'server-only'

import type { MessageKey } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { BRAND } from '@/lib/brand'
import type { Challenge } from '@/lib/challenges/contract'
import { inviteLine } from '@/lib/challenges/invite'
import { figureText } from '@/lib/challenges/score'

import { lines, visual } from './bidi'
import { Frame, Latin, Line, Plates } from './cards'
import { CARD_SIZE, type CardSize } from './params'

/**
 * כרטיס האתגר — the Open Graph image of a `/c/<code>` link (ONE RED WORLD §27, §43.6).
 *
 * What WhatsApp draws under a challenge: the gate, the sender's figure in the house's two
 * plates, the gate's own line (§29) and the dare. Built ONLY from the decoded challenge —
 * numbers and closed words — so it cannot carry a name, an id or an answer: gate 10 is a
 * count of clues, gate 3 a count of slots, gate 8 a percentage (§27.6, §44).
 */
const FIGURE_LABEL: Partial<Record<number, MessageKey>> = {
  2: 'challenge.og.figure.right',
  3: 'challenge.og.figure.found',
  6: 'challenge.og.figure.moves',
  8: 'challenge.og.figure.accuracy',
  10: 'challenge.og.figure.hints',
}

function labelOf(challenge: Challenge): string | null {
  if (challenge.gate === 13) return t(challenge.params.variant === 'order' ? 'challenge.og.figure.placed' : 'challenge.og.figure.steps')
  const key = FIGURE_LABEL[challenge.gate]
  return key ? t(key) : null
}

export function ChallengeCardArt({ challenge, size }: { challenge: Challenge; size: CardSize }) {
  const box = CARD_SIZE[size]
  const story = size === 'story'
  const u = box.width / 100
  const figure = challenge.result ? figureText(challenge.result) : null
  const label = labelOf(challenge)
  const say = lines(inviteLine(challenge), story ? 20 : 26, 2)
  const cta = t(challenge.gate === 1 ? 'challenge.og.prompt' : 'challenge.og.cta')
  return (
    <Frame box={box}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: story ? 'column' : 'row-reverse',
          alignItems: 'center',
          justifyContent: story ? 'center' : 'space-between',
          padding: u * 4,
          gap: u * 3,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: story ? 'center' : 'flex-end', gap: u * 1.2, ...(story ? {} : { flex: 1 }) }}>
          <Latin text={t('challenge.og.kicker', { n: String(challenge.gate) })} size={u * (story ? 2.6 : 1.9)} />
          {say.map((line) => (
            <Line key={line} text={line} size={u * (story ? 6.2 : 4.4)} font="Frank" weight={900} />
          ))}
          <Line text={cta} size={u * (story ? 3.6 : 2.6)} color={BRAND.sign} />
        </div>
        {figure ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: BRAND.ink, padding: `${u * 1.2}px ${u * 2.4}px` }}>
            <Plates text={figure} size={u * (story ? 18 : 12)} font="Karantina" under={BRAND.sign} over={BRAND.red} />
            {label && (
              <div style={{ display: 'flex', fontFamily: 'Heebo', fontWeight: 800, fontSize: u * (story ? 3 : 2.1), color: BRAND.concrete }}>{visual(label)}</div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex' }}>
            <Plates text={String(challenge.gate)} size={u * (story ? 24 : 16)} font="Karantina" under={BRAND.sign} over={BRAND.red} />
          </div>
        )}
      </div>
    </Frame>
  )
}
