import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// Owner, 23.10.2026: the living-room floor shimmered and the stand crawled with black squares on his phone.
// three r128 gives a render target with a depth buffer and no stencil DEPTH_COMPONENT16; at sixteen bits the floor
// (1cm above its slab), the crowd on its step and every rug z-fight on a phone GPU. Asking for stencil buys 24 bits.
const kit = readFileSync('public/life/town/kit.js', 'utf8')
const cinema = readFileSync('public/life/voxel/cinema.js', 'utf8')

describe('LIFE town · no flicker', () => {
  it('the scene render target carries 24-bit depth', () => {
    const rt = kit.match(/var rt=new T\.WebGLMultisampleRenderTarget\([^;]*\);/)?.[0] ?? ''
    expect(rt).toContain('stencilBuffer:true')
    expect(cinema).toContain('stencilBuffer:!!depth')
  })
  it('a NaN never reaches the screen (AO normal, bloom threshold, composite)', () => {
    expect(kit).toContain('if(!(cl>1e-9))')
    expect(kit).toContain('if(!(ao>=0.&&ao<=1.))ao=1.;')
    expect(kit.match(/if\(!\(dot\(c,vec3\(1\.\)\)>=0\.\)\)c=vec3\(0\.\);/g)?.length).toBe(2)
  })
  it('flat decals and the crowd cast no shadow', () => {
    expect(kit).toMatch(/o\.isInstancedMesh&&o\.count>40\)\{o\.castShadow=false/)
    expect(kit).toMatch(/sz\.y<\.08&&Math\.max\(sz\.x,sz\.z\)>\.3\)o\.castShadow=false/)
  })
})
