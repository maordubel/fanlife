/**
 * הסמלים — the three motifs a `stamp` tool puts down. Original marks drawn for the bench,
 * never the club's crest (the crest is Maor's artwork and nothing re-draws it — rule 8).
 * Each is drawn in a 40×40 box centred on the origin; the mark's transform sizes and turns it.
 */

const STAMP_IDS = ['shield', 'ball', 'heart'] as const
export type StampId = (typeof STAMP_IDS)[number]

export function isStampId(value: string | undefined): value is StampId {
  return value !== undefined && (STAMP_IDS as readonly string[]).includes(value)
}

export function StampMotif({ id, fill, line }: { id: string | undefined; fill: string; line: string }) {
  switch (id) {
    case 'ball':
      return (
        <g>
          <circle r="18" fill={fill} stroke={line} strokeWidth="2" />
          <polygon points="0,-8 7.6,-2.5 4.7,6.5 -4.7,6.5 -7.6,-2.5" fill={line} />
          <path d="M0 -8 L0 -17 M7.6 -2.5 L16 -5.5 M4.7 6.5 L10 14 M-4.7 6.5 L-10 14 M-7.6 -2.5 L-16 -5.5" stroke={line} strokeWidth="2" fill="none" />
        </g>
      )
    case 'heart':
      return (
        <path
          d="M0 17 C-16 6 -20 -2 -20 -8 C-20 -15 -14 -19 -9 -19 C-5 -19 -2 -16 0 -13 C2 -16 5 -19 9 -19 C14 -19 20 -15 20 -8 C20 -2 16 6 0 17 Z"
          fill={fill}
          stroke={line}
          strokeWidth="2"
        />
      )
    default:
      return (
        <g>
          <path d="M-17 -16 H17 V4 C17 12 8 17 0 20 C-8 17 -17 12 -17 4 Z" fill={fill} stroke={line} strokeWidth="2" />
          <rect x="-17" y="-6" width="34" height="7" fill={line} />
        </g>
      )
  }
}
