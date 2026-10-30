/**
 * LIFE · heads stay on necks, bodies turn the short way, and a close-up sees a face (rule 133).
 * A head that kept last frame's turn spun; a body that lerped an angle without wrapping turned 340° to face 20°;
 * a figure that snapped to face the player every frame whipped round; a close-up framed from the room's camera
 * filmed the back of a head or an armchair.
 */
import {readFileSync} from 'node:fs'
import * as THREE from 'three'
import {describe, expect, it} from 'vitest'
import {lookAt, turnTo} from '@/lib/life/rush-render/figure'

const kit = readFileSync('public/life/town/kit.js', 'utf8')
const people = readFileSync('public/life/town/people.js', 'utf8')
const play = readFileSync('public/life/town/play.js', 'utf8')

describe('TOWN heads', () => {
  it('every frame starts from a still head, so nothing added to it carries over', () => {
    expect(kit).toContain('u.head.rotation.set(0,0,0);')
  })
  it('the head stays inside a human neck and gets there at a head’s speed', () => {
    expect(people).toMatch(/Hr\.y=clamp\(Hr\.y,-1\.1,1\.1\)/)
    expect(people).toContain('u._hs||(u._hs=')
  })
  it('a body turns at a capped rate, and a step that slid along a wall does not turn it', () => {
    expect(play).toContain('cap=9*dt')
    expect(play).toContain('moved>sp*.35?')
  })
  it('a close-up stands in front of the face and keeps furniture out of the shot', () => {
    expect(play).toMatch(/var fw=new T\.Vector3\(Math\.sin\(b0\.yaw\),0,Math\.cos\(b0\.yaw\)\)/)
    expect(play).toContain('function clearShot(')
    expect(play).toContain('c.cp.lerp(p,ck)')
  })
})

describe('RUSH turning', () => {
  const body = () => new THREE.Object3D()
  it('turns the short way round, never past the target, at a capped speed', () => {
    const o = body(); o.rotation.y = 3.0
    for (let i = 0; i < 120; i++) turnTo(o, -3.0, 1 / 60)
    // 3.0 → -3.0 is 0.28 rad the short way; a plain lerp went 6 rad the long way
    expect(Math.abs(Math.atan2(Math.sin(o.rotation.y + 3.0), Math.cos(o.rotation.y + 3.0)))).toBeLessThan(0.02)
    const p = body(); let last = 0, maxStep = 0
    for (let i = 0; i < 60; i++) { turnTo(p, Math.PI * 0.99, 1 / 60); const d = Math.abs(p.rotation.y - last); maxStep = Math.max(maxStep, d); last = p.rotation.y }
    expect(maxStep).toBeLessThanOrEqual(7 / 60 + 1e-9)
  })
  it('looks with the head first and turns the body only past the neck', () => {
    const o = body()
    const h = lookAt(o, 0.5, 1 / 60)
    expect(o.rotation.y).toBe(0)
    expect(h).toBeCloseTo(0.5)
    let hh = 0
    for (let i = 0; i < 240; i++) hh = lookAt(o, 2.5, 1 / 60)
    expect(Math.abs(hh)).toBeLessThanOrEqual(0.9 + 1e-9)
    expect(o.rotation.y).toBeGreaterThan(1.5)
  })
})
