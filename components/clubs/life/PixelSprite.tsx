/**
 * LIFE, universal — pixel drawings for the arcade layer (title screen, album fallback).
 * A sprite is a few rows of characters; every colour is one of the club's own LIFE tokens
 * (c = club colour, k = ink, w = paper, s = ground tone, n = deep), so a club's kit colour is one value
 * and a rival-locked page can never receive a banned colour. Decorative: never the only carrier of meaning.
 */
const FILL: Record<string, string> = {
  c: 'var(--l-prime)', k: 'var(--l-ink)', w: 'var(--l-paper)', s: 'var(--l-ground)', n: 'var(--l-deep)', m: 'var(--l-mark)',
}

export const SPRITES = {
  kid: [
    '....kkkkkk....', '...kkkkkkkk...', '...kssssssk...', '...ksksskss...', '...kssssssk...', '....kssssk....', '..kcccccccck..', '.kcccccccccck.',
    '.kcwwcccccwwck', '.ksccccccccsk.', '..kccccccccck.', '..knnnnnnnnk..', '..knnnnnnnnk..', '...kss..ssk...', '...kss..ssk...', '...kkk..kkk...',
  ],
  ball: [
    '....kkkkkk....', '..kkwwwwwwkk..', '.kwwwkkkkwwwk.', '.kwwkkwwkkwwk.', 'kwwwkkwwkkwwwk', 'kwkkkwwwwkkkwk', 'kwwkkkwwkkkwwk', 'kwwwwkkkkwwwwk',
    '.kwwwwwwwwwwk.', '.kwwkkwwkkwwk.', '..kkwwwwwwkk..', '....kkkkkk....',
  ],
  cup: [
    '.kkkkkkkkkkkk.', 'kmmmmmmmmmmmmk', 'kmkmmmmmmmmkmk', 'kmkmmmmmmmmkmk', '.kkmmmmmmmmkk.', '...kmmmmmmk...', '....kmmmmk....', '.....kmmk.....',
    '.....kmmk.....', '....kmmmmk....', '...kkkkkkkk...', '...kcccccck...', '...kkkkkkkk...',
  ],
  scarf: [
    '..kkkkkkkkkk..', '.kcccwcccwccck', 'kcccwcccwcccck', 'kkkkkkkkkkkkkk', '...kcwck......', '...kcwck......', '...kcwck......', '...kcwck......', '...kkkkk......',
  ],
} as const

export type SpriteName = keyof typeof SPRITES

export function PixelSprite({name, scale = 4, className}: {name: SpriteName; scale?: number; className?: string}) {
  const rows = SPRITES[name], w = rows[0]!.length, h = rows.length
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} width={w * scale} height={h * scale} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {rows.flatMap((r, y) => [...r].map((ch, x) => (FILL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={FILL[ch]} /> : null)))}
    </svg>
  )
}

const FALLBACK: SpriteName[] = ['cup', 'ball', 'scarf']
/** a keepsake with no painted prop still gets a sticker: a stable pick from its id */
export const spriteForKeep = (id: string): SpriteName => FALLBACK[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK.length]!
