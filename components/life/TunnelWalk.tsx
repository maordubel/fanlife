'use client'

import { useEffect, useRef, useState } from 'react'

import { artUrl } from '@/lib/life/runtime/art'
import { t } from '@/lib/i18n'

/**
 * המנהרה, בגוף ראשון — the one place in the game that is "like Doom", and for one
 * reason: a tunnel is the one room whose whole meaning is what is at the end of it.
 *
 * A small raycaster (the 1992 kind: a grid of walls, one ray per screen column, a
 * textured wall slice per hit) draws a concrete corridor under a stand. You walk by
 * holding a thumb (or W / ↑); you look by dragging (or ← →). People walk ahead of you
 * as billboards. The far end is light, and the light grows: the fog colour slides from
 * ink to cream with your distance to the exit, the crowd noise rises with it, and when
 * you step through, the shell cuts to the terrace — the arrival card, and then the
 * panorama, the boy's own eyes on a full ground. Nothing is rendered that the flat game
 * could not have shown; what the corridor adds is the WAIT, at the boy's own pace.
 *
 * Deliberately small: no floor casting, no doors that open, no enemies. Thirty seconds
 * of corridor, drawn at a low internal resolution so a phone from 2019 holds 60 fps,
 * and scaled up with the painted textures' own grain.
 */

/**
 * שני מסדרונות, מנוע אחד (5.9.2026).
 *
 * `bloomfield` is the original: fifteen cells of concrete under a stand in 1986, walked
 * once, whose whole meaning is the light at the end of it. `ussishkin` is its opposite and
 * the brief says so in one line — Bloomfield says the world is bigger than the boy, and
 * Ussishkin says the world is TOO CLOSE to him (§34). So the second corridor is half the
 * length, the people in it are slower and nearer, and the light it opens into is the warm
 * light of a room rather than a sky. Same renderer, two configurations, no second engine.
 */
export type TunnelVariant = 'bloomfield' | 'ussishkin'

const MAPS: Record<TunnelVariant, string[]> = {
  bloomfield: [
    '#####',
    '#...#',
    '#...#',
    'P...#',
    '#...#',
    '#...D',
    '#...#',
    '#...P',
    '#...#',
    '#...#',
    'D...#',
    '#...#',
    '#...#',
    '#SSS#',
    '#LLL#',
  ],
  ussishkin: [
    '#####',
    '#...#',
    '#...#',
    'D...#',
    '#...#',
    '#...P',
    '#...#',
    '#...#',
    '#SSS#',
    '#LLL#',
  ],
}

/** where the fog goes as the light grows: a sky, or a hall's own lamps */
const FOG_END: Record<TunnelVariant, [number, number, number]> = {
  bloomfield: [237, 230, 216],
  ussishkin: [226, 196, 168],
}
const FOV = Math.PI / 2.9
const SPEED = 1.9 // cells per second
const TURN = 1.4 // radians per second (keys)
const WALL_H = 1.0

type Tex = { img: HTMLImageElement; data: ImageData | null }

/** people ahead of the boy: x, y in cells, a figure key, and a walking speed */
const CROWDS: Record<TunnelVariant, Array<{ x: number; y: number; art: string; speed: number; h: number }>> = {
  // ahead of the boy and nearly his pace: he walks BEHIND the adults, he does not pass through them
  bloomfield: [
    { x: 1.8, y: 4.6, art: 'adultA3', speed: 1.55, h: 0.82 },
    { x: 3.1, y: 5.8, art: 'youngB4', speed: 1.5, h: 0.78 },
    { x: 2.3, y: 7.6, art: 'adultB5', speed: 1.45, h: 0.86 },
    { x: 3.3, y: 9.2, art: 'fanC', speed: 1.6, h: 0.84 },
  ],
  // Slower and closer: the corridor into Ussishkin is not a walk, it is a queue that
  // happens to be moving. He is stuck behind shoulders the whole way.
  ussishkin: [
    { x: 1.7, y: 3.6, art: 'fanD', speed: 1.5, h: 0.9 },
    { x: 3.2, y: 4.2, art: 'adultB2', speed: 1.45, h: 0.88 },
    { x: 2.5, y: 5.4, art: 'fanB', speed: 1.55, h: 0.86 },
    { x: 3.3, y: 6.4, art: 'youngB1', speed: 1.6, h: 0.76 },
  ],
}

export function TunnelWalk({
  onDone,
  onProgress,
  variant = 'bloomfield',
}: {
  onDone: () => void
  onProgress?: (p: number) => void
  variant?: TunnelVariant
}) {
  // `PEOPLE` seeds the ref below, on the boy's own first step — a plain lookup into the
  // module-level `CROWDS` table, kept here only because the ref initialiser needs it
  // outside the effect. `MAP` and the fog end colour used to live here too, purely for
  // the effect further down, which is what the missing-deps warning was about: they are
  // read from `variant` inside a closure the effect never declared a dependency on. The
  // effect now re-derives them from `variant` itself — already its own dependency —
  // instead of capturing an outer variable.
  const PEOPLE = CROWDS[variant]
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const [hint, setHint] = useState(true)
  const state = useRef({
    // the middle of the corridor, whichever corridor it is
    x: 2.5,
    y: 1.5,
    angle: Math.PI / 2, // +y is "down the corridor"
    walking: false,
    turn: 0,
    dragX: null as number | null,
    dragAngle: 0,
    done: false,
    people: PEOPLE.map((p) => ({ ...p })),
  })

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx2d = el.getContext('2d', { alpha: false })
    if (!ctx2d) return

    // Derived from `variant`, which is already this effect's own dependency — kept
    // local rather than closed over from the render body, so nothing here can go stale.
    const MAP = MAPS[variant]
    const crowd = CROWDS[variant]
    const [fogEndR, fogEndG, fogEndB] = FOG_END[variant]

    // ---- textures ------------------------------------------------------------------
    const load = (key: string) =>
      new Promise<Tex>((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const g = c.getContext('2d')
          g?.drawImage(img, 0, 0)
          resolve({ img, data: g ? g.getImageData(0, 0, c.width, c.height) : null })
        }
        img.onerror = () => resolve({ img, data: null })
        img.src = artUrl(key)
      })
    const texKeys: Record<string, string> = {
      '#': 'texTunnelWall',
      P: 'texTunnelWallPoster',
      D: 'texTunnelDoor',
      S: 'texTunnelWall',
    }
    const textures: Record<string, Tex> = {}
    const sprites: Record<string, HTMLImageElement> = {}
    let alive = true
    let raf = 0
    let last = performance.now()

    const W = 300
    let H = 520
    let buffer = ctx2d.createImageData(W, H)
    const zbuf = new Float32Array(W)
    const fit = () => {
      const rect = el.getBoundingClientRect()
      H = Math.max(200, Math.round((W * rect.height) / Math.max(1, rect.width)))
      el.width = W
      el.height = H
      buffer = ctx2d.createImageData(W, H)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)

    const cellAt = (x: number, y: number) => MAP[Math.floor(y)]?.[Math.floor(x)] ?? '#'
    const solid = (c: string) => c === '#' || c === 'P' || c === 'D'
    const EXIT_Y = MAP.length - 1.5

    const draw = (now: number) => {
      if (!alive) return
      const s = state.current
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now

      // ---- move --------------------------------------------------------------------
      s.angle += s.turn * TURN * dt
      if (s.walking && !s.done) {
        const nx = s.x + Math.cos(s.angle) * SPEED * dt
        const ny = s.y + Math.sin(s.angle) * SPEED * dt
        if (!solid(cellAt(nx + Math.cos(s.angle) * 0.25, s.y))) s.x = nx
        if (!solid(cellAt(s.x, ny + Math.sin(s.angle) * 0.25))) s.y = ny
      }
      for (const p of s.people) {
        p.y = Math.min(EXIT_Y + 1.5, p.y + p.speed * dt)
      }
      const progress = Math.max(0, Math.min(1, (s.y - 1.5) / (EXIT_Y - 1.5)))
      onProgress?.(progress)
      ;(window as unknown as { __lifeTunnel?: unknown }).__lifeTunnel = { x: s.x, y: s.y, walking: s.walking, progress, tex: Object.keys(textures).filter((k) => textures[k]?.data).length }
      if (s.y >= EXIT_Y && !s.done) {
        s.done = true
        onDone()
      }

      // ---- fog colour: ink → cream as the light grows ---------------------------------
      const glow = Math.pow(progress, 1.6)
      const fogR = 20 + (fogEndR - 20) * glow
      const fogG = 18 + (fogEndG - 18) * glow
      const fogB = 16 + (fogEndB - 16) * glow

      // ---- ceiling and floor, then the walls, into one buffer ---------------------------
      const px = buffer.data
      const half = H / 2
      for (let y = 0; y < H; y += 1) {
        let r: number
        let g: number
        let b: number
        if (y < half) {
          const k = y / half
          r = fogR * (0.35 + 0.65 * k)
          g = fogG * (0.35 + 0.65 * k)
          b = fogB * (0.35 + 0.65 * k)
        } else {
          const k = (y - half) / half
          r = fogR * (1 - k) + 46 * k
          g = fogG * (1 - k) + 44 * k
          b = fogB * (1 - k) + 40 * k
        }
        const row = y * W * 4
        for (let x = 0; x < W; x += 1) {
          const o = row + x * 4
          px[o] = r
          px[o + 1] = g
          px[o + 2] = b
          px[o + 3] = 255
        }
      }

      for (let col = 0; col < W; col += 1) {
        const rayA = s.angle - FOV / 2 + (col / W) * FOV
        const dx = Math.cos(rayA)
        const dy = Math.sin(rayA)
        let mapX = Math.floor(s.x)
        let mapY = Math.floor(s.y)
        const deltaX = Math.abs(1 / (dx || 1e-9))
        const deltaY = Math.abs(1 / (dy || 1e-9))
        const stepX = dx < 0 ? -1 : 1
        const stepY = dy < 0 ? -1 : 1
        let sideX = dx < 0 ? (s.x - mapX) * deltaX : (mapX + 1 - s.x) * deltaX
        let sideY = dy < 0 ? (s.y - mapY) * deltaY : (mapY + 1 - s.y) * deltaY
        let side = 0
        let cell = '#'
        for (let i = 0; i < 64; i += 1) {
          if (sideX < sideY) {
            sideX += deltaX
            mapX += stepX
            side = 0
          } else {
            sideY += deltaY
            mapY += stepY
            side = 1
          }
          cell = cellAt(mapX, mapY)
          if (solid(cell) || cell === 'L') break
        }
        const dist = side === 0 ? sideX - deltaX : sideY - deltaY
        const perp = Math.max(0.05, dist * Math.cos(rayA - s.angle))
        zbuf[col] = perp
        const h = Math.round((WALL_H * H) / perp)
        const top = Math.round(half - h / 2)
        const bottom = Math.round(half + h / 2)
        const y0 = Math.max(0, top)
        const y1 = Math.min(H, bottom)
        if (cell === 'L') {
          for (let y = y0; y < y1; y += 1) {
            const o = (y * W + col) * 4
            px[o] = fogR
            px[o + 1] = fogG
            px[o + 2] = fogB
          }
          continue
        }
        const tex = textures[texKeys[cell] ?? 'texTunnelWall']
        const hitX = side === 0 ? s.y + dist * dy : s.x + dist * dx
        let u = hitX - Math.floor(hitX)
        if ((side === 0 && dx > 0) || (side === 1 && dy < 0)) u = 1 - u
        const shade = (side === 1 ? 0.8 : 1) * Math.max(0.22, 1 - perp / 14)
        const fog = Math.min(1, perp / 12) * glow
        if (tex?.data) {
          const data = tex.data.data
          const tw = tex.data.width
          const th = tex.data.height
          const tx = Math.floor(u * tw)
          for (let y = y0; y < y1; y += 1) {
            const ty = Math.floor(((y - top) / h) * th)
            const i = (ty * tw + tx) * 4
            const o = (y * W + col) * 4
            px[o] = data[i]! * shade * (1 - fog) + fogR * fog
            px[o + 1] = data[i + 1]! * shade * (1 - fog) + fogG * fog
            px[o + 2] = data[i + 2]! * shade * (1 - fog) + fogB * fog
          }
        } else {
          for (let y = y0; y < y1; y += 1) {
            const o = (y * W + col) * 4
            px[o] = 110 * shade
            px[o + 1] = 108 * shade
            px[o + 2] = 102 * shade
          }
        }
      }
      ctx2d.putImageData(buffer, 0, 0)

      // ---- people: billboards, far to near, clipped by the wall depth -------------------
      const order = [...s.people].sort((a, b) => ((b.x - s.x) ** 2 + (b.y - s.y) ** 2) - ((a.x - s.x) ** 2 + (a.y - s.y) ** 2))
      for (const p of order) {
        const img = sprites[p.art]
        if (!img || !img.complete || img.naturalWidth === 0) continue
        const rx = p.x - s.x
        const ry = p.y - s.y
        const depth = rx * Math.cos(s.angle) + ry * Math.sin(s.angle)
        if (depth < 0.2) continue
        const lateral = -rx * Math.sin(s.angle) + ry * Math.cos(s.angle)
        const screenX = W / 2 + (lateral / depth) * (W / 2 / Math.tan(FOV / 2))
        const sh = (p.h * H) / depth
        const sw = sh * (img.naturalWidth / img.naturalHeight)
        const top = H / 2 + (0.5 * H) / depth - sh
        const left = Math.round(screenX - sw / 2)
        const right = Math.round(screenX + sw / 2)
        const fog = Math.min(1, depth / 12) * glow
        ctx2d.globalAlpha = 1
        for (let col = Math.max(0, left); col < Math.min(W, right); col += 1) {
          if (zbuf[col]! <= depth) continue
          const sx = ((col - left) / Math.max(1, right - left)) * img.naturalWidth
          ctx2d.drawImage(img, sx, 0, 1, img.naturalHeight, col, top, 1, sh)
        }
        if (fog > 0.02) {
          ctx2d.fillStyle = `rgba(${Math.round(fogR)},${Math.round(fogG)},${Math.round(fogB)},${fog * 0.6})`
          ctx2d.fillRect(Math.max(0, left), Math.max(0, top), Math.min(W, right) - Math.max(0, left), Math.min(H, top + sh) - Math.max(0, top))
        }
      }
      // the grain of a painting, not a screen: a breath of vignette
      const vig = ctx2d.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, `rgba(0,0,0,${0.55 * (1 - glow)})`)
      ctx2d.fillStyle = vig
      ctx2d.fillRect(0, 0, W, H)

      raf = requestAnimationFrame(draw)
    }

    void (async () => {
      const keys = Array.from(new Set(Object.values(texKeys)))
      const loaded = await Promise.all(keys.map(load))
      keys.forEach((key, i) => {
        textures[key] = loaded[i]!
      })
      for (const p of crowd) {
        const img = new Image()
        img.src = artUrl(p.art)
        sprites[p.art] = img
      }
      if (alive) raf = requestAnimationFrame(draw)
    })()

    // ---- input -------------------------------------------------------------------------
    const onKey = (event: KeyboardEvent, down: boolean) => {
      const k = event.key.toLowerCase()
      if (k === 'arrowup' || k === 'w' || k === ' ') state.current.walking = down
      if (k === 'arrowleft' || k === 'a') state.current.turn = down ? -1 : state.current.turn === -1 ? 0 : state.current.turn
      if (k === 'arrowright' || k === 'd') state.current.turn = down ? 1 : state.current.turn === 1 ? 0 : state.current.turn
      if (['arrowup', 'arrowleft', 'arrowright', 'w', 'a', 'd', ' '].includes(k)) event.preventDefault()
      setHint(false)
    }
    const kd = (e: KeyboardEvent) => onKey(e, true)
    const ku = (e: KeyboardEvent) => onKey(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [onDone, onProgress, variant])

  const down = (event: React.PointerEvent) => {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    state.current.walking = true
    state.current.dragX = event.clientX
    state.current.dragAngle = state.current.angle
    setHint(false)
  }
  const move = (event: React.PointerEvent) => {
    const s = state.current
    if (s.dragX === null) return
    const dx = event.clientX - s.dragX
    // a thumb that moves sideways is looking, not walking
    if (Math.abs(dx) > 6) s.walking = false
    s.angle = s.dragAngle + (dx / (event.currentTarget as HTMLElement).clientWidth) * 1.6
    // never let the boy turn his back on the light: ±70° off the corridor
    const centre = Math.PI / 2
    s.angle = Math.max(centre - 1.2, Math.min(centre + 1.2, s.angle))
  }
  const up = () => {
    state.current.walking = false
    state.current.dragX = null
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[28] touch-none select-none bg-ink"
      data-life="tunnel"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <canvas ref={canvas} className="h-full w-full" style={{ imageRendering: 'auto' }} />
      {hint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(28px+env(safe-area-inset-bottom))] flex justify-center">
          <span className="animate-plate-in border-hair border-sheet/40 bg-ink/85 px-3 py-1.5 font-body text-[11px] leading-none text-sheet">
            {t('life.tunnel.hint')}
          </span>
        </div>
      )}
    </div>
  )
}
