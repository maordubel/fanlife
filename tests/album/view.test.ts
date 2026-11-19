import { describe, expect, it } from 'vitest'
import { wingView, pressMark, type CatalogRow, type Pressed } from '@/lib/album/view'

const info = { id: 'club-a', code: 'CLA', name: 'Club A' } as unknown as Parameters<typeof wingView>[0]
const catalog = [['club-a:1', 'club-a', 1, 1, 'p1', 'One'], ['club-a:2', 'club-a', 2, 1, 'p2', 'Two'], ['club-a:3', 'club-a', 3, 1, 'p3', 'Three']] as unknown as CatalogRow[]
const photo = { status: 'photo', frame: 'club', file: '/album/stickers/club-a/1.webp', source: { file: 'A.jpg', author: 'x', license: 'CC BY 4.0', page: 'p', licenseUrl: '' } } as unknown as Pressed
const drawn = { status: 'silhouette', frame: null, file: '/album/stickers/club-a/2.webp', source: null, traits: { hair: 'dark' } } as unknown as Pressed

describe('album view: pressed stickers', () => {
  const w = wingView(info, catalog, [], { 'club-a:1': photo, 'club-a:2': drawn }, {})
  const slots = w.pages.flatMap(p => p.slots)
  it('a pressed drawn face ships as pressed, like a photo', () => {
    expect(slots[0]!.image).toMatch(/^\/album\/stickers\/club-a\/1\.webp\?v=/)
    expect(slots[1]!.image).toMatch(/^\/album\/stickers\/club-a\/2\.webp\?v=/)
    expect(slots[1]!.credit).toBeNull()
  })
  it('a sticker the press never made falls back to the drawn frame', () => {
    expect(slots[2]!.image).toBeNull()
  })
  it('a new pressing gets a new address', () => {
    expect(pressMark(drawn)).not.toBe(pressMark({ ...drawn, traits: { hair: 'grey' } } as unknown as Pressed))
    expect(pressMark(photo)).toBe(pressMark({ ...photo }))
  })
})
