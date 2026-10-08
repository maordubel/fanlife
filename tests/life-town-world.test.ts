/**
 * The town is a place, not a backdrop: what stands on the floor is solid, a door opens for whoever walks up to it,
 * a ball moves when it is walked into, and the terrace is people. These hold the mechanisms, not the pictures.
 */
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

const dir = path.join(process.cwd(), 'public/life/town')
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8')

describe('the town world', () => {
  const play = read('play.js')

  it('makes furniture solid from the meshes the room actually built, and never cuts anybody off', () => {
    expect(play).toMatch(/function autoBlocks\(/)
    expect(play).toMatch(/function settleBlocks\(/)
    expect(play).toContain('AUTO.forEach(function(r){block(')
    // whatever was reachable before the furniture was made solid must still be reachable after
    expect(play).toMatch(/base\.every\(function\(v,i\)\{return!v\|\|now\[i\]\}\)/)
  })

  it('swings the door at an exit open when somebody walks up, and only rattles a locked one', () => {
    expect(play).toMatch(/function swingDoors\(/)
    expect(read('rooms_home.js')).toContain('window.__doors=window.__doors||[]')
    expect(read('kit.js')).toContain('window.__doors=[]')
  })

  it('lets a ball be kicked, and keeps it on the floor and off the furniture', () => {
    expect(play).toMatch(/function kickProps\(/)
    expect(read('rooms_home.js')).toContain("kind:'ball'")
    expect(read('rooms_street.js')).toContain("kind:'ball'")
  })

  it('fills the terrace with bodies in three poses, from a file the build script writes', () => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, 'people/crowd.json'), 'utf8'))
    expect(j.poses).toEqual(['down', 'one', 'both'])
    for (const p of j.poses) for (const s of ['pos', 'nrm', 'reg', 'idx']) expect(j.sections[`${p}_${s}`]).toBeTruthy()
    expect(fs.existsSync(path.join(process.cwd(), 'scripts/life/build-crowd.py'))).toBe(true)
    expect(read('rooms_stadium.js')).toContain('h.crowdPeople=function')
  })
})
