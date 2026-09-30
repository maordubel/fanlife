'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { t } from '@/lib/i18n'
import { ControlDeck } from '@/components/life/ControlDeck'
import { PitchScoreboard } from '@/components/life/PitchScoreboard'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { ballTexture, daylightRig, disposeThree, mountThree, resizeThree, shadowDecal, type Three3D } from '@/lib/life/runtime/three3d'
import { LIFE_PALETTE } from '@/lib/life/runtime/palette'
import { rollAt } from '@/lib/life/rng'
import {
  BALL_RADIUS,
  STEP,
  createMatch,
  step,
  type FootballInput,
  type FootballStateInternal,
  type PlayerState,
} from '@/lib/life/football'
import {
  ERA_TURF,
  QUALITY,
  awayKit,
  buildFigure,
  buildGround,
  figureKit,
  freshRig,
  homeKit,
  keeperKit,
  linesTexture,
  poseFigure,
  rippleNet,
  settleNet,
  shirtTexture,
  snapCamera,
  suggestQuality,
  turfTexture,
  updateCamera,
  type FigureKit,
  type FigureParts,
  type QualityId,
} from '@/lib/life/football/render'

/**
 * המגרש — the one place in this repository that is allowed to import the football renderer.
 *
 * The shape is the house one, the same as `PenaltyCard` and `HoopsCard`: a React component
 * that `LifeStage` mounts with `dynamic(..., { ssr: false })` when the bus opens a `pitch`,
 * builds its own three objects on `mountThree`, drives its own `requestAnimationFrame`, and
 * hands a semantic result back through `onDone`. Nothing about the match is written to the
 * save file from here — the calling beat does that, because a card that writes to the log
 * is a card that can write to it twice.
 *
 * Two things this component owns that the simulation deliberately does not:
 *
 *  · **The fixed step.** The sim runs at exactly sixty steps a second in an accumulator, and
 *    the picture is drawn at whatever the device manages, interpolating between the last two
 *    states. A phone at thirty frames therefore has the same physics as a desktop at a
 *    hundred and forty, and the same seed still produces the same match on both.
 *  · **The stick.** The joystick speaks screen space and the pitch speaks metres. The
 *    broadcast camera sits on the +z touchline looking back, so screen-right is +x and
 *    screen-down is +z — the mapping is the identity, which is why the camera is on that
 *    side rather than the other one.
 *
 * The controller is `ControlDeck`, unchanged: one ball-top joystick and A/B, the same
 * hardware as every other room in this game. Football did not get its own buttons.
 */

const HOLD_CAP = 90

type Phase = 'playing' | 'paused'

export function PitchCard({
  pitch,
  onDone,
}: {
  pitch: NonNullable<LifeBusEvents['pitch']>
  onDone: (result: { played: boolean; score: { home: number; away: number }; minute: number }) => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const threeRef = useRef<Three3D | null>(null)
  const rafRef = useRef<number | null>(null)
  const stateRef = useRef<FootballStateInternal | null>(null)
  const pauseRef = useRef<((value: boolean) => void) | null>(null)

  /** the live button state; a ref because the loop reads it sixty times a second */
  const padRef = useRef({ x: 0, z: 0, a: false, b: false, aHeld: 0, bHeld: 0, aWas: false, bWas: false })

  const [phase, setPhase] = useState<Phase>('playing')
  const [board, setBoard] = useState({ home: 0, away: 0, minute: '' })
  const [deck, setDeck] = useState({ top: 0, height: 0, touch: false })

  const quality: QualityId = pitch.quality ?? suggestQuality()

  // --- the scene, mounted once ---------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const spec = QUALITY[quality]
    // 320m of depth: the far terrace of a 105-metre pitch is ~110m from the broadcast
    // position, and the floodlight pylons are further still
    const three = mountThree(host, 50, 320)
    threeRef.current = three
    three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, spec.pixelRatio))

    const state = createMatch({
      seed: `${pitch.matchId}:${pitch.windowId}`,
      playerSide: 'home',
      startMinute: pitch.startMinute,
      score: pitch.score ?? undefined,
    })
    stateRef.current = state

    // one seeded noise source for the whole scene, so the pitch that is screenshotted in
    // the QA probe is the pitch a player sees
    const noise = (index: number) => rollAt(`${pitch.matchId}:turf`, index)
    const canvas = () => document.createElement('canvas')

    const turf = new THREE.CanvasTexture(
      turfTexture(spec.turfTexture, ERA_TURF[pitch.era ?? 'mid-1980s'] ?? ERA_TURF['mid-1980s']!, noise, canvas),
    )
    turf.colorSpace = THREE.SRGBColorSpace
    const lines = new THREE.CanvasTexture(linesTexture(2048, canvas))
    lines.colorSpace = THREE.SRGBColorSpace

    const ground = buildGround(three.scene, spec, turf, lines, ballTexture('football'), noise)

    // the light rig every outdoor 3D room in this game uses — one file, rule 59
    daylightRig(three.scene)

    // --- the players ---------------------------------------------------------------------
    const homeSpec = homeKit()
    const awaySpec = awayKit(pitch.awayYellow ?? true)
    const kits: Record<string, FigureKit> = {
      home: figureKit(homeSpec, texture(shirtTexture(homeSpec, null, canvas))),
      away: figureKit(awaySpec, texture(shirtTexture(awaySpec, null, canvas))),
      'home-gk': figureKit(keeperKit('home'), null),
      'away-gk': figureKit(keeperKit('away'), null),
    }

    const figures = new Map<string, FigureParts>()
    const decals = new Map<string, THREE.Mesh>()
    for (const player of state.players) {
      const key = player.role === 'GK' ? `${player.side}-gk` : player.side
      const parts = buildFigure(kits[key] as FigureKit, player.build)
      three.scene.add(parts.group)
      figures.set(player.id, parts)
      const decal = shadowDecal(0.34)
      decal.position.y = 0.016
      three.scene.add(decal)
      decals.set(player.id, decal)
    }

    // the marker under the controlled man — a muted red ring, readable on grass, and
    // deliberately nothing like any commercial football game's indicator
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.56, 20),
      new THREE.MeshBasicMaterial({ color: LIFE_PALETTE.red, transparent: true, opacity: 0.85, depthWrite: false }),
    )
    marker.rotation.x = -Math.PI / 2
    marker.position.y = 0.02
    three.scene.add(marker)

    const rig = freshRig()
    snapCamera(rig, state)

    // --- the loop -------------------------------------------------------------------------
    let last = performance.now()
    let accumulator = 0
    let paused = false
    let boardAt = 0

    const readPad = (): FootballInput => {
      const pad = padRef.current
      const input: FootballInput = {
        x: pad.x,
        z: pad.z,
        a: pad.a,
        b: pad.b,
        aHeld: pad.aHeld,
        bHeld: pad.bHeld,
        aReleased: pad.aWas && !pad.a,
        bReleased: pad.bWas && !pad.b,
      }
      pad.aHeld = pad.a ? Math.min(HOLD_CAP, pad.aHeld + 1) : 0
      pad.bHeld = pad.b ? Math.min(HOLD_CAP, pad.bHeld + 1) : 0
      pad.aWas = pad.a
      pad.bWas = pad.b
      return input
    }

    const frame = () => {
      rafRef.current = requestAnimationFrame(frame)
      const now = performance.now()
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now

      if (!paused) {
        accumulator += dt
        // five catch-up steps and then drop the rest: a tab that was in the background
        // for a minute must not simulate a minute of football in one frame
        let steps = 0
        while (accumulator >= STEP && steps < 5) {
          step(state, readPad(), STEP)
          accumulator -= STEP
          steps += 1
          for (const event of state.events) {
            if (event.t === 'net') rippleNet(ground, event.at)
          }
        }
        if (steps === 5) accumulator = 0
      }

      // --- draw --------------------------------------------------------------------------
      ground.ball.position.set(state.ball.p.x, state.ball.p.y, state.ball.p.z)
      ground.ball.rotation.z -= state.ball.v.x * dt * 2
      ground.ball.rotation.x += state.ball.v.z * dt * 2
      const ballDecal = ground.ball.userData.decal as THREE.Mesh | undefined
      if (ballDecal) {
        ballDecal.position.set(state.ball.p.x, 0.014, state.ball.p.z)
        const lift = Math.max(0, 1 - (state.ball.p.y - BALL_RADIUS) / 6)
        ballDecal.scale.setScalar(0.6 + lift * 0.7)
      }

      for (const player of state.players) {
        const parts = figures.get(player.id)
        if (parts) poseFigure(parts, player, dt)
        const decal = decals.get(player.id)
        if (decal) decal.position.set(player.p.x, 0.016, player.p.z)
      }

      const controlled = state.players.find((p: PlayerState) => p.id === state.controlledId)
      marker.visible = Boolean(controlled)
      if (controlled) marker.position.set(controlled.p.x, 0.02, controlled.p.z)

      settleNet(ground, dt)
      const host = hostRef.current
      const aspect = host ? host.clientWidth / Math.max(1, host.clientHeight) : 1.6
      updateCamera(three.camera, rig, state, aspect, dt)
      three.renderer.render(three.scene, three.camera)

      // the DOM board is React state, so it is refreshed four times a second rather than
      // sixty — a scoreboard that re-renders every frame is a scoreboard that costs frames
      if (now - boardAt > 250) {
        boardAt = now
        setBoard({ home: state.score.home, away: state.score.away, minute: state.minuteLabel })
      }
    }
    rafRef.current = requestAnimationFrame(frame)

    // --- keyboard --------------------------------------------------------------------------
    const key = (event: KeyboardEvent, down: boolean) => {
      const pad = padRef.current
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          pad.z = down ? -1 : pad.z === -1 ? 0 : pad.z
          break
        case 'ArrowDown':
        case 'KeyS':
          pad.z = down ? 1 : pad.z === 1 ? 0 : pad.z
          break
        case 'ArrowLeft':
        case 'KeyA':
          pad.x = down ? -1 : pad.x === -1 ? 0 : pad.x
          break
        case 'ArrowRight':
        case 'KeyD':
          pad.x = down ? 1 : pad.x === 1 ? 0 : pad.x
          break
        case 'Space':
          pad.a = down
          event.preventDefault()
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          pad.b = down
          break
        case 'Escape':
          if (down) setPhase((current) => (current === 'paused' ? 'playing' : 'paused'))
          break
        default:
          break
      }
    }
    const onDown = (event: KeyboardEvent) => key(event, true)
    const onUp = (event: KeyboardEvent) => key(event, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)

    const onResize = () => {
      const box = hostRef.current
      if (!box) return
      resizeThree(three, box)
      setDeck({
        top: Math.round(box.clientHeight * 0.62),
        height: Math.round(box.clientHeight * 0.38),
        touch: window.matchMedia?.('(pointer: coarse)').matches ?? false,
      })
    }
    onResize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    const setPaused = (value: boolean) => {
      paused = value
      last = performance.now()
    }
    pauseRef.current = setPaused

    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      disposeThree(three, host)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pauseRef.current?.(phase === 'paused')
  }, [phase])

  const onAxis = useCallback((x: number, y: number) => {
    const pad = padRef.current
    pad.x = x
    pad.z = y
  }, [])
  const onAction = useCallback((down: boolean) => {
    padRef.current.a = down
  }, [])
  const onCancel = useCallback((down: boolean) => {
    padRef.current.b = down
  }, [])

  const leave = () => {
    const state = stateRef.current
    onDone({
      played: true,
      score: state ? { ...state.score } : { home: 0, away: 0 },
      minute: state ? Math.round(state.matchMinute) : 0,
    })
  }

  return (
    <div dir="rtl" className="absolute inset-0 z-[95] flex flex-col bg-ink" data-life="pitch-card">
      <div ref={hostRef} className="relative min-h-0 flex-1 touch-none">
        <PitchScoreboard
          homeHe={pitch.homeHe}
          awayHe={pitch.awayHe}
          score={pitch.showScore === false ? null : board}
          minuteHe={board.minute}
        />

        <button
          type="button"
          onClick={() => setPhase((current) => (current === 'paused' ? 'playing' : 'paused'))}
          aria-label={t('life.pitch.menu')}
          className="absolute end-3 top-[max(8px,env(safe-area-inset-top))] z-30 min-h-tap border-rule border-sheet/40 bg-ink/80 px-3 py-1.5 font-display text-[13px] leading-none text-sheet"
        >
          ☰
        </button>

        {phase === 'paused' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-ink/90 px-6">
            <p className="font-display text-[18px] leading-none text-sheet">{t('life.pitch.paused')}</p>
            <button
              type="button"
              onClick={() => setPhase('playing')}
              className="min-h-tap w-full max-w-[300px] border-rule border-red bg-red px-4 py-3 font-display text-[16px] leading-none text-sheet"
            >
              {t('life.pitch.resume')}
            </button>
            {/*
              A match must always be leavable, for the same reason every conversation in
              this game has an X on every line: a room you cannot get out of is a save
              somebody loses. Leaving is never punished.
            */}
            <button
              type="button"
              onClick={leave}
              className="min-h-tap w-full max-w-[300px] border-rule border-sheet/40 px-4 py-3 font-body text-[15px] leading-none text-concrete"
            >
              {t('life.pitch.leave')}
            </button>
          </div>
        )}

        <ControlDeck
          top={deck.top}
          height={deck.height}
          touch={deck.touch}
          verb={null}
          label={null}
          onAxis={onAxis}
          onAction={onAction}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}

function texture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}
