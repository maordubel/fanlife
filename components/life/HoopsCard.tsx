'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { t } from '@/lib/i18n'
import { LIFE_PALETTE } from '@/lib/life/runtime/palette'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { daylightRig, disposeThree, faceCamera, imageTexture, mountThree, resizeThree, shadowDecal, type Three3D } from '@/lib/life/runtime/three3d'

/**
 * תחרות חיובים — five free throws at the schoolyard hoop, in three dimensions.
 *
 * Maor, 6.9.2026: "תחרות 'חיובים', זריקה לסל בחצר הבית ספר", also explicitly 3D. The
 * mechanic is the one every schoolyard shooter already knows without being told: pull
 * down to load it, further means harder, and let go straight up. Too soft and it never
 * reaches the rim; too hard and it sails past the backboard. The window between them is
 * the whole game, on purpose — a free throw is not a coin flip, it is a touch you either
 * have that afternoon or you don't.
 */

const RIM_Z = -4.5
const RIM_HEIGHT = 3.05
const RIM_RADIUS = 0.23
const BALL_R = 0.121
const IDEAL_DRAG = 170

type Outcome = 'in' | 'short' | 'long' | 'wide'
type Phase = 'ready' | 'flight' | 'result' | 'summary'

export function HoopsCard({
  hoops,
  onDone,
}: {
  hoops: NonNullable<LifeBusEvents['hoops']>
  onDone: (result: { played: boolean; scored: number; earned: number }) => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const ballRef = useRef<THREE.Mesh | null>(null)
  const rafRef = useRef<number | null>(null)
  const flightRef = useRef<{ start: number; targetX: number; targetZ: number; endY: number; ms: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  const [phase, setPhase] = useState<Phase>('ready')
  const [attempt, setAttempt] = useState(0)
  const [results, setResults] = useState<Outcome[]>([])
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const three = mountThree(host, 50)
    const { scene, camera } = three

    scene.background = new THREE.Color(0x8a8f92)
    scene.fog = new THREE.Fog(0x8a8f92, 10, 22)
    daylightRig(scene)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      // his schoolyard: cracked asphalt with the faded lines still on it, tiled six ways
      new THREE.MeshStandardMaterial({
        map: imageTexture('/life/art/hoop-court.webp', (texture) => {
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.repeat.set(6, 6)
        }),
        color: LIFE_PALETTE.asphalt,
        roughness: 1,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.z = RIM_Z / 2
    scene.add(ground)

    // the free-throw line and a plain key, painted the way the yard's own line is
    const lineMat = new THREE.LineBasicMaterial({ color: LIFE_PALETTE.asphaltLine })
    const key = new THREE.BufferGeometry().setFromPoints(
      [
        [-1.3, 0.01, 0],
        [1.3, 0.01, 0],
        [1.3, 0.01, RIM_Z + 1.2],
        [-1.3, 0.01, RIM_Z + 1.2],
        [-1.3, 0.01, 0],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    )
    scene.add(new THREE.LineLoop(key, lineMat))

    // pole, backboard, rim, net
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, RIM_HEIGHT + 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a4a48 }),
    )
    pole.position.set(0, (RIM_HEIGHT + 0.6) / 2, RIM_Z - 0.55)
    scene.add(pole)
    /**
     * הלוח — הלוח שלו, לא מלבן לבן.
     *
     * Maor sent the real thing on 6.9.2026: rusted at the corners, the square repainted so
     * many times it has stopped being white. It is mapped onto the same box the primitive
     * used, so the physics that were tuned against that box do not move a millimetre.
     */
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 0.05),
      new THREE.MeshStandardMaterial({ map: imageTexture('/life/art/hoop-board.webp'), roughness: 0.6, transparent: true }),
    )
    board.position.set(0, RIM_HEIGHT + 0.45, RIM_Z - 0.2)
    scene.add(board)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(RIM_RADIUS, 0.018, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xc9702e, roughness: 0.4 }),
    )
    rim.rotation.x = Math.PI / 2
    rim.position.set(0, RIM_HEIGHT, RIM_Z)
    scene.add(rim)
    // his net: half of it torn away, which is what a schoolyard hoop looks like
    const net = new THREE.Mesh(
      new THREE.ConeGeometry(RIM_RADIUS * 0.95, 0.38, 10, 1, true),
      new THREE.MeshBasicMaterial({
        map: imageTexture('/life/art/hoop-ring--net.webp'),
        transparent: true,
        alphaTest: 0.25,
        side: THREE.DoubleSide,
      }),
    )
    net.position.set(0, RIM_HEIGHT - 0.19, RIM_Z)
    scene.add(net)

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 20, 16),
      new THREE.MeshStandardMaterial({ map: imageTexture('/life/art/hoop-ball.webp'), roughness: 0.6 }),
    )
    ball.position.set(0, 1.1, 0)
    scene.add(ball)
    ballRef.current = ball
    const shadow = shadowDecal(BALL_R * 1.5)
    shadow.position.set(0, 0.01, 0)
    scene.add(shadow)

    camera.position.set(0, 1.55, 1.1)
    camera.lookAt(0, RIM_HEIGHT - 0.3, RIM_Z)

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const flight = flightRef.current
      if (flight) {
        const elapsed = performance.now() - flight.start
        const tRaw = Math.min(1, elapsed / flight.ms)
        const ease = tRaw
        ball.position.x = THREE.MathUtils.lerp(0, flight.targetX, ease)
        ball.position.z = THREE.MathUtils.lerp(0, flight.targetZ, ease)
        const apex = RIM_HEIGHT + 1.1
        ball.position.y = THREE.MathUtils.lerp(1.1, flight.endY, ease) + (apex - RIM_HEIGHT) * Math.sin(Math.PI * ease) * 0.65
        shadow.position.set(ball.position.x, 0.01, ball.position.z)
        ball.rotation.x -= 0.3
        if (tRaw >= 1) flightRef.current = null
      }
      three.renderer.render(scene, camera)
    }
    animate()

    const onResize = () => resizeThree(three, host)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      disposeThree(three, host)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetBall() {
    const ball = ballRef.current
    if (ball) ball.position.set(0, 1.1, 0)
  }

  function shoot(dx: number, dy: number) {
    if (phase !== 'ready') return
    const power = THREE.MathUtils.clamp(-dy / IDEAL_DRAG, 0, 1.6)
    const aimX = THREE.MathUtils.clamp(dx / 140, -1.4, 1.4)

    let outcome: Outcome
    if (power < 0.78) outcome = 'short'
    else if (power > 1.28) outcome = 'long'
    else if (Math.abs(aimX) > 0.36) outcome = 'wide'
    else outcome = 'in'

    const targetX = outcome === 'in' ? 0 : THREE.MathUtils.clamp(aimX * 2.4, -2.2, 2.2)
    const targetZ = outcome === 'in' ? RIM_Z : RIM_Z * THREE.MathUtils.clamp(power, 0.35, 1.5)
    const endY = outcome === 'in' ? RIM_HEIGHT - 0.08 : RIM_HEIGHT + (outcome === 'long' ? 0.5 : outcome === 'short' ? -0.9 : 0.2)

    flightRef.current = { start: performance.now(), targetX, targetZ, endY, ms: 600 }
    setPhase('flight')
    window.setTimeout(() => {
      setLastOutcome(outcome)
      setResults((prev) => [...prev, outcome])
      setPhase('result')
      window.setTimeout(() => {
        setAttempt((n) => n + 1)
        resetBall()
        setPhase((prevPhase) => (prevPhase === 'result' ? 'ready' : prevPhase))
      }, 850)
    }, 620)
  }

  useEffect(() => {
    if (attempt >= hoops.attempts && phase === 'ready') setPhase('summary')
  }, [attempt, hoops.attempts, phase])

  function onPointerDown(e: React.PointerEvent) {
    if (phase !== 'ready') return
    dragRef.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerUp(e: React.PointerEvent) {
    const start = dragRef.current
    dragRef.current = null
    if (!start || phase !== 'ready') return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.hypot(dx, dy) < 12) return
    shoot(dx, dy)
  }

  const scored = results.filter((r) => r === 'in').length
  const earned = scored * hoops.perBasket

  return (
    <div dir="rtl" className="absolute inset-0 z-[95] flex flex-col bg-ink" data-life="hoops-card">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="font-display text-[13px] uppercase tracking-[0.22em] text-red">{t('life.hoops.kicker')}</p>
        {phase !== 'summary' && (
          <p className="font-mono text-[12px] tabular-nums text-concrete">
            {t('life.hoops.progress', { i: String(Math.min(attempt + 1, hoops.attempts)), n: String(hoops.attempts) })}
          </p>
        )}
      </div>

      <div ref={hostRef} className="relative mt-2 min-h-0 flex-1 touch-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {phase === 'result' && lastOutcome && (
          <p
            className={`pointer-events-none absolute inset-x-0 top-[8%] text-center font-display text-[30px] leading-none ${lastOutcome === 'in' ? 'text-red' : 'text-sheet'}`}
          >
            {lastOutcome === 'in' ? t('life.hoops.in') : t('life.hoops.out')}
          </p>
        )}
      </div>

      <div className="px-5 pb-6 pt-3 text-center">
        {phase === 'summary' ? (
          <>
            <p className="mb-3 font-body text-[14px] text-concrete">
              {earned > 0
                ? t('life.hoops.total', { scored: String(scored), n: String(hoops.attempts), sum: String(earned) })
                : t('life.hoops.tally', { scored: String(scored), n: String(hoops.attempts) })}
            </p>
            <button
              type="button"
              onClick={() => onDone({ played: true, scored, earned })}
              className="min-h-tap w-full max-w-[320px] border-rule border-red bg-red px-4 py-3 font-display text-[16px] leading-none text-sheet transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
            >
              {earned > 0 ? t('life.hoops.take', { n: String(earned) }) : t('life.hoops.next')}
            </button>
          </>
        ) : (
          <>
            <p className="mb-2 font-body text-[13px] text-concrete">{t('life.hoops.aim')}</p>
            {attempt === 0 && phase === 'ready' && (
              <button
                type="button"
                onClick={() => onDone({ played: false, scored: 0, earned: 0 })}
                className="min-h-tap px-4 py-2 font-body text-[13px] text-concrete underline underline-offset-4"
              >
                {t('life.hoops.away')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
