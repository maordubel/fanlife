import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { createArmGate } from '@/lib/life/inputArm'

/**
 * P0 (implementation pass, 27.9.2026): the tap that reveals a ballot never picks from it.
 * Rapid-tap regression — every sequence a thumb can produce, as arithmetic.
 */
describe('a ballot arms only after the revealing gesture is released', () => {
  it('the same tap that revealed it (pointer still down) cannot choose, even across frames', () => {
    const g = createArmGate()
    g.pointerDown()
    g.reveal()
    for (let i = 0; i < 20; i++) g.frame()
    expect(g.accept()).toBe(false)
    g.pointerUp()
    // the click of that same gesture fires after pointer-up, before any frame
    expect(g.accept()).toBe(false)
    g.frame()
    expect(g.accept()).toBe(true)
  })

  it('a ballot revealed with no finger down arms on the next frame, not the same one', () => {
    const g = createArmGate()
    g.reveal()
    expect(g.accept()).toBe(false)
    g.frame()
    expect(g.accept()).toBe(true)
  })

  it('rapid double-tap: second tap lands while disarmed and is dropped', () => {
    const g = createArmGate()
    g.pointerDown()
    g.reveal()
    g.pointerUp() // tap 1 released
    g.pointerDown() // tap 2 before any frame
    expect(g.accept()).toBe(false)
    g.pointerUp()
    g.frame()
    expect(g.accept()).toBe(true)
  })

  it('a new ballot disarms again', () => {
    const g = createArmGate()
    g.reveal()
    g.frame()
    expect(g.accept()).toBe(true)
    g.reveal()
    expect(g.accept()).toBe(false)
  })

  it('DialogueBox routes every choice through the gate and exposes data-armed', () => {
    const src = readFileSync(join(process.cwd(), 'components/life/DialogueBox.tsx'), 'utf8')
    expect(src).toContain('data-armed=')
    expect(src).toMatch(/if \(ballotArmed\) onChoose\(choice\.id\)/)
    expect(src).not.toMatch(/onClick=\{\(\) => onChoose\(/)
  })
})
