/**
 * חותמת הפטיש והמגל — the primary mark and the verification mark.
 *
 * `mix-blend-mode: multiply` is what makes it read as stamped rather than placed.
 * Legal note from the spec: this is an original mark designed for the project. It is
 * NOT the club's official crest, and the official crest never goes inside it.
 */

type StampTone = 'red' | 'ink' | 'sheet'

/** The two stamps that exist. The word is part of the mark, so it lives here. */
export type StampVerdict = 'verified' | 'rejected'

const VERDICT_WORD: Record<StampVerdict, string> = {
  verified: 'אומת',
  rejected: 'נדחה',
}

type StampProps = {
  /** null = mark only, with no text frame */
  label?: StampVerdict | null
  /** ring + circumferential text — from 64px up */
  ring?: boolean
  tone?: StampTone
  size?: number
  animate?: boolean
}

const TONE: Record<StampTone, string> = {
  red: 'rgb(var(--red))',
  ink: 'rgb(var(--ink))',
  sheet: 'rgb(var(--sheet))',
}

export function Stamp({
  label = null,
  ring = true,
  tone = 'red',
  size = 96,
  animate = false,
}: StampProps) {
  const colour = TONE[tone]
  const ringId = `stamp-ring-${tone}-${size}`
  const word = label === null ? null : VERDICT_WORD[label]

  return (
    <div
      className={`inline-flex items-center gap-2 mix-blend-multiply ${animate ? 'animate-stamp-in' : ''}`}
      style={{ transform: animate ? undefined : 'rotate(-8deg)' }}
      aria-hidden={label === null}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role={word ? 'img' : undefined}
        aria-label={word ?? undefined}
      >
        {ring && (
          <>
            <circle cx="100" cy="100" r="94" fill="none" stroke={colour} strokeWidth="7" />
            <circle cx="100" cy="100" r="82" fill="none" stroke={colour} strokeWidth="2" />
            <defs>
              <path
                id={ringId}
                d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"
              />
            </defs>
            <text
              fill={colour}
              className="font-sign"
              style={{ fontWeight: 700, fontSize: 14, letterSpacing: 2.5 }}
            >
              <textPath href={`#${ringId}`} startOffset="3%">
                ארכיון · הפועל תל אביב · 1923 · אומת
              </textPath>
            </text>
          </>
        )}
        <g stroke={colour} fill={colour}>
          <path
            d="M52 132 A 74 74 0 0 1 128 56"
            fill="none"
            strokeWidth={ring ? 15 : 20}
            strokeLinecap="round"
          />
          {ring && <path d="M52 132 L 42 146" strokeWidth="12" strokeLinecap="round" />}
          <path d="M62 148 L 122 88" strokeWidth={ring ? 14 : 19} />
          <path d="M112 74 L 140 102 L 126 116 L 98 88 Z" strokeWidth="0" />
        </g>
      </svg>
      {word && (
        <span
          className="border-stamp px-4 py-1 font-sign text-step-4 leading-none"
          style={{ borderColor: colour, color: colour }}
        >
          {word}
        </span>
      )}
    </div>
  )
}
