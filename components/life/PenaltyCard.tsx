'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { t } from '@/lib/i18n'
import { LIFE_PALETTE } from '@/lib/life/runtime/palette'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { billboard, daylightRig, disposeThree, faceCamera, imageTexture, mountThree, resizeThree, shadowDecal, type Three3D } from '@/lib/life/runtime/three3d'

/**
 * פנדלים — five real kicks against a keeper, on the neighbourhood pitch, in three
 * dimensions.
 *
 * Maor asked for this by name on 6.9.2026: "משחק פנדלים, בעיטות לשער במגרש השכונתי",
 * explicitly in 3D. Everything else in this life is Phaser's painted depth — a camera
 * that never turns — and this is the one room where a boy stands behind a real ball and
 * a real goal recedes in front of him. The whole game is one drag: pull toward where you
 * want it, let go, and the corner you actually reached is the goal you actually beat.
 *
 * The keeper is not reading your thumb. He picks a side the instant you release, the
 * same instant physics picks yours — so the shot that beats him is the one placed in a
 * corner he didn't guess, not the one aimed a frame after he committed.
 */

const GOAL_HALF = 3.66
const GOAL_HEIGHT = 2.44
const GOAL_Z = -11
const BALL_R = 0.11
const KEEPER_REACH = 1.15
const ZONES = [-2.5, -1.15, 0, 1.15, 2.5]

type Outcome = 'goal' | 'save' | 'out'
/** the five pictures of him, and the only five states this game needs him in */
type KeeperPose = 'ready' | 'left' | 'right' | 'caught' | 'beaten'
type Phase = 'ready' | 'flight' | 'result' | 'summary'

export function PenaltyCard({
  penalty,
  onDone,
}: {
  penalty: NonNullable<LifeBusEvents['penalty']>
  onDone: (result: { played: boolean; scored: number; earned: number }) => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const threeRef = useRef<Three3D | null>(null)
  const ballRef = useRef<THREE.Mesh | null>(null)
  const keeperRef = useRef<THREE.Group | null>(null)
  const posesRef = useRef<Record<KeeperPose, THREE.Mesh> | null>(null)
  const rafRef = useRef<number | null>(null)
  const flightRef = useRef<{ start: number; from: THREE.Vector3; targetX: number; targetY: number; keeperX: number; ms: number } | null>(
    null,
  )
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  const [phase, setPhase] = useState<Phase>('ready')
  const [attempt, setAttempt] = useState(0)
  const [results, setResults] = useState<Outcome[]>([])
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null)

  // --- the scene, mounted once ------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const three = mountThree(host, 48)
    threeRef.current = three
    const { scene, camera } = three

    scene.background = new THREE.Color(LIFE_PALETTE.sky)
    scene.fog = new THREE.Fog(LIFE_PALETTE.sky, 14, 30)
    daylightRig(scene)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      /**
       * העפר של המגרש — his photograph of it, tiled.
       *
       * A flat brown plane is a colour; this is dust, stones, the ghost of a chalk line
       * somebody drew last week. Repeated four times across the pitch so the grain stays
       * the size of grain rather than turning into a pattern.
       */
      new THREE.MeshStandardMaterial({
        map: imageTexture('/life/art/pen-ground.webp', (texture) => {
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.repeat.set(4, 4)
        }),
        color: LIFE_PALETTE.dirt,
        roughness: 1,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.z = GOAL_Z / 2
    scene.add(ground)

    // the goal — two posts, a bar, and a net implied by a few crossed lines
    const goal = new THREE.Group()
    const postMat = new THREE.MeshStandardMaterial({ color: LIFE_PALETTE.chalk, roughness: 0.4 })
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, GOAL_HEIGHT, 10)
    const left = new THREE.Mesh(postGeo, postMat)
    left.position.set(-GOAL_HALF, GOAL_HEIGHT / 2, GOAL_Z)
    const right = left.clone()
    right.position.x = GOAL_HALF
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, GOAL_HALF * 2 + 0.12, 10), postMat)
    bar.rotation.z = Math.PI / 2
    bar.position.set(0, GOAL_HEIGHT, GOAL_Z)
    goal.add(left, right, bar)
    const netMat = new THREE.LineBasicMaterial({ color: LIFE_PALETTE.chalk, transparent: true, opacity: 0.45 })
    const netPts: THREE.Vector3[] = []
    for (let i = 0; i <= 8; i += 1) {
      const x = -GOAL_HALF + (GOAL_HALF * 2 * i) / 8
      netPts.push(new THREE.Vector3(x, 0, GOAL_Z - 0.8), new THREE.Vector3(x, GOAL_HEIGHT, GOAL_Z - 0.8))
    }
    for (let i = 0; i <= 4; i += 1) {
      const y = (GOAL_HEIGHT * i) / 4
      netPts.push(new THREE.Vector3(-GOAL_HALF, y, GOAL_Z - 0.8), new THREE.Vector3(GOAL_HALF, y, GOAL_Z - 0.8))
    }
    goal.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(netPts), netMat))
    scene.add(goal)

    /**
     * השוער — הילד הגדול מהשכונה, מצולם.
     *
     * He was a capsule, a sphere and a cylinder: correct proportions, no person. Maor sent
     * him on 6.9.2026 in the five poses this game actually needs — set, diving each way,
     * on the floor with the ball, and walking back to fetch it — so the keeper is now his
     * photograph on a billboard, and the pose changes with what just happened rather than
     * the whole figure rotating like a signpost.
     *
     * All five are added at once and hidden; swapping a pose is one boolean, which is the
     * only way this can stay at sixty frames on a phone.
     */
    const keeper = new THREE.Group()
    const poses: Record<KeeperPose, THREE.Mesh> = {
      ready: billboard('/life/art/pen-keeper-ready.webp', 1.62),
      left: billboard('/life/art/pen-keeper-left.webp', 1.15),
      right: billboard('/life/art/pen-keeper-right.webp', 1.15),
      caught: billboard('/life/art/pen-keeper-caught.webp', 1.0),
      beaten: billboard('/life/art/pen-keeper-beaten.webp', 1.6),
    }
    for (const [name, mesh] of Object.entries(poses)) {
      mesh.position.y = name === 'ready' || name === 'beaten' ? 0.81 : 0.62
      mesh.visible = name === 'ready'
      keeper.add(mesh)
    }
    keeper.position.set(0, 0, GOAL_Z + 0.3)
    scene.add(keeper)
    keeperRef.current = keeper
    posesRef.current = poses

    // the ball
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 20, 16),
      // his own scuffed leather ball, with the drawn one still there if the file is missing
      new THREE.MeshStandardMaterial({ map: imageTexture('/life/art/pen-ball.webp'), roughness: 0.55 }),
    )
    ball.position.set(0, BALL_R, 0)
    scene.add(ball)
    ballRef.current = ball
    const shadow = shadowDecal(BALL_R * 1.4)
    shadow.position.set(0, 0.01, 0)
    scene.add(shadow)

    // probe hook: what the scene actually contains, for the screenshot audit
    ;(window as unknown as { __penaltyDebug?: unknown }).__penaltyDebug = () => 0
    camera.position.set(0, 1.55, 2.6)
    camera.lookAt(0, 1.1, GOAL_Z)

    const clock = new THREE.Clock()
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const flight = flightRef.current
      if (flight) {
        const elapsed = performance.now() - flight.start
        const tRaw = Math.min(1, elapsed / flight.ms)
        const ease = 1 - (1 - tRaw) * (1 - tRaw)
        ball.position.x = THREE.MathUtils.lerp(0, flight.targetX, ease)
        ball.position.z = THREE.MathUtils.lerp(0, GOAL_Z + 0.3, ease)
        ball.position.y = BALL_R + flight.targetY * ease + 0.55 * Math.sin(Math.PI * ease)
        shadow.position.set(ball.position.x, 0.01, ball.position.z)
        ball.rotation.x += 0.35
        const diveT = Math.min(1, elapsed / 420)
        keeper.position.x = THREE.MathUtils.lerp(0, flight.keeperX, diveT)
        /**
         * הוא לא מסתובב — he changes picture.
         *
         * The old figure rotated ninety degrees, which is what a signpost does, not a
         * goalkeeper. Now the moment he commits, the still of him standing is swapped for
         * the still of him in the air on that side, and when it is over he is either on the
         * floor holding it or walking back to fetch it out of the net.
         */
        if (diveT > 0.08) showPose(flight.keeperX > 0.05 ? 'right' : flight.keeperX < -0.05 ? 'left' : 'ready')
        if (tRaw >= 1) flightRef.current = null
      }
      faceCamera(scene, camera)
      three.renderer.render(scene, camera)
    }
    animate()
    void clock // kept for parity with the hoops scene's clock use; unused here on purpose

    const onResize = () => resizeThree(three, host)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      disposeThree(three, host)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** one of his five stills is visible at a time; the rest are loaded and hidden */
  function showPose(pose: KeeperPose) {
    const poses = posesRef.current
    if (!poses) return
    for (const [name, mesh] of Object.entries(poses)) mesh.visible = name === pose
  }

  function resetBall() {
    const ball = ballRef.current
    const keeper = keeperRef.current
    if (ball) ball.position.set(0, BALL_R, 0)
    if (keeper) {
      keeper.position.x = 0
      keeper.rotation.z = 0
    }
    showPose('ready')
  }

  function kick(dx: number, dy: number) {
    if (phase !== 'ready') return
    const targetX = THREE.MathUtils.clamp((dx / 140) * GOAL_HALF * 1.15, -GOAL_HALF - 0.5, GOAL_HALF + 0.5)
    const targetY = THREE.MathUtils.clamp(0.35 + (-dy / 160) * GOAL_HEIGHT, 0.12, GOAL_HEIGHT + 0.5)
    const keeperX = ZONES[Math.floor(Math.random() * ZONES.length)] as number

    let outcome: Outcome
    if (Math.abs(targetX) > GOAL_HALF || targetY > GOAL_HEIGHT) outcome = 'out'
    else if (Math.abs(targetX - keeperX) < KEEPER_REACH) outcome = 'save'
    else outcome = 'goal'

    flightRef.current = {
      start: performance.now(),
      from: new THREE.Vector3(0, BALL_R, 0),
      targetX: THREE.MathUtils.clamp(targetX, -GOAL_HALF - 0.2, GOAL_HALF + 0.2),
      targetY: Math.min(targetY, GOAL_HEIGHT + 0.3),
      keeperX,
      ms: 620,
    }
    setPhase('flight')
    window.setTimeout(() => {
      setLastOutcome(outcome)
      // caught it, or fetching it out of the net
      showPose(outcome === 'save' ? 'caught' : 'beaten')
      setResults((prev) => [...prev, outcome])
      setPhase('result')
      window.setTimeout(() => {
        setAttempt((n) => n + 1)
        resetBall()
        setPhase((prevPhase) => (prevPhase === 'result' ? 'ready' : prevPhase))
      }, 900)
    }, 640)
  }

  useEffect(() => {
    if (attempt >= penalty.attempts && phase === 'ready') setPhase('summary')
  }, [attempt, penalty.attempts, phase])

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
    kick(dx, dy)
  }

  const scored = results.filter((r) => r === 'goal').length
  const earned = scored * penalty.perGoal

  return (
    <div dir="rtl" className="absolute inset-0 z-[95] flex flex-col bg-ink" data-life="penalty-card">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="font-display text-[13px] uppercase tracking-[0.22em] text-red">{t('life.penalty.kicker')}</p>
        {phase !== 'summary' && (
          <p className="font-mono text-[12px] tabular-nums text-concrete">
            {t('life.penalty.progress', { i: String(Math.min(attempt + 1, penalty.attempts)), n: String(penalty.attempts) })}
          </p>
        )}
      </div>

      <div ref={hostRef} className="relative mt-2 min-h-0 flex-1 touch-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {(phase === 'result' && lastOutcome) && (
          <p
            className={`pointer-events-none absolute inset-x-0 top-[8%] text-center font-display text-[30px] leading-none ${lastOutcome === 'goal' ? 'text-red' : 'text-sheet'}`}
          >
            {lastOutcome === 'goal' ? t('life.penalty.goal') : lastOutcome === 'save' ? t('life.penalty.save') : t('life.penalty.out')}
          </p>
        )}
      </div>

      <div className="px-5 pb-6 pt-3 text-center">
        {phase === 'summary' ? (
          <>
            <p className="mb-3 font-body text-[14px] text-concrete">
              {earned > 0
                ? t('life.penalty.total', { scored: String(scored), n: String(penalty.attempts), sum: String(earned) })
                : t('life.penalty.tally', { scored: String(scored), n: String(penalty.attempts) })}
            </p>
            <button
              type="button"
              onClick={() => onDone({ played: true, scored, earned })}
              className="min-h-tap w-full max-w-[320px] border-rule border-red bg-red px-4 py-3 font-display text-[16px] leading-none text-sheet transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
            >
              {earned > 0 ? t('life.penalty.take', { n: String(earned) }) : t('life.penalty.next')}
            </button>
          </>
        ) : (
          <>
            <p className="mb-2 font-body text-[13px] text-concrete">{t('life.penalty.aim')}</p>
            {attempt === 0 && phase === 'ready' && (
              <button
                type="button"
                onClick={() => onDone({ played: false, scored: 0, earned: 0 })}
                className="min-h-tap px-4 py-2 font-body text-[13px] text-concrete underline underline-offset-4"
              >
                {t('life.penalty.away')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
