'use client'

import { useEffect, useRef, useState } from 'react'

import { t } from '@/lib/royal-rumble/i18n'

type GoalFlash = {
  ours: boolean
  score: string
  key: number
}

const SFX = {
  unlock: '/life/sfx/crowd-hush.m4a',
  murmur: '/life/sfx/crowd-real-murmur.m4a',
  build: '/life/sfx/crowd-real-build.m4a',
  goal: '/life/sfx/crowd-real-goal.m4a',
  concede: '/life/sfx/crowd-real-miss.m4a',
  after: '/life/sfx/crowd-real-after.m4a',
  final: '/life/sfx/crowd-real-final.m4a',
  kick: '/life/sfx/ball-kick.m4a',
  whistleStart: '/life/sfx/whistle-1.m4a',
  whistleFinal: '/life/sfx/whistle-3.m4a',
} as const

function scoreInsideMatch(): { score: string; forUs: number; against: number } | null {
  const clock = Array.from(document.querySelectorAll('p')).find(
    (node) => node.textContent?.trim() === 'MATCH CLOCK',
  )
  const row = clock?.parentElement?.parentElement
  if (!row) return null

  const scoreNode = Array.from(row.querySelectorAll('p')).find((node) =>
    /^\d+[–-]\d+$/.test(node.textContent?.trim() ?? ''),
  )
  const score = scoreNode?.textContent?.trim()
  if (!score) return null

  const parts = score.split(/[–-]/).map(Number)
  const forUs = parts[0]
  const against = parts[1]
  if (forUs === undefined || against === undefined) return null
  if (!Number.isFinite(forUs) || !Number.isFinite(against)) return null
  return { score, forUs, against }
}

function commentaryInsideMatch(): string {
  const live = Array.from(document.querySelectorAll('div')).find(
    (node) => node.textContent?.trim() === 'LIVE',
  )
  const row = live?.parentElement
  const copy = row?.querySelector('p')?.textContent?.trim()
  return copy ?? ''
}

function playOneShot(src: string, volume: number) {
  const audio = new Audio(src)
  audio.volume = volume
  void audio.play().catch(() => undefined)
}

export function RoyalRumbleMatchFX() {
  const [flash, setFlash] = useState<GoalFlash | null>(null)
  const unlocked = useRef(false)
  const matchActive = useRef(false)
  const previous = useRef<{ forUs: number; against: number } | null>(null)
  const ambient = useRef<HTMLAudioElement | null>(null)
  const lastCommentary = useRef('')
  const flashTimer = useRef<number | null>(null)
  const buildCooldown = useRef(0)

  useEffect(() => {
    const unlock = () => {
      if (unlocked.current) return
      const audio = new Audio(SFX.unlock)
      audio.volume = 0
      void audio
        .play()
        .then(() => {
          audio.pause()
          audio.currentTime = 0
          unlocked.current = true
        })
        .catch(() => undefined)
    }

    window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
    window.addEventListener('keydown', unlock, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
    }
  }, [])

  useEffect(() => {
    const stopAmbient = () => {
      if (!ambient.current) return
      ambient.current.pause()
      ambient.current.currentTime = 0
      ambient.current = null
    }

    const startAmbient = () => {
      if (!unlocked.current || ambient.current) return
      const audio = new Audio(SFX.murmur)
      audio.loop = true
      audio.volume = 0.2
      ambient.current = audio
      void audio.play().catch(() => {
        ambient.current = null
      })
    }

    const showGoal = (ours: boolean, score: string) => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
      setFlash({ ours, score, key: Date.now() })
      playOneShot(SFX.kick, 0.48)
      window.setTimeout(() => {
        playOneShot(ours ? SFX.goal : SFX.concede, ours ? 0.9 : 0.72)
      }, 110)
      window.setTimeout(() => playOneShot(SFX.after, 0.34), 950)
      flashTimer.current = window.setTimeout(() => setFlash(null), 2100)
    }

    const scan = () => {
      const current = scoreInsideMatch()

      if (!current) {
        if (matchActive.current) {
          matchActive.current = false
          previous.current = null
          lastCommentary.current = ''
          stopAmbient()
          if (unlocked.current) {
            playOneShot(SFX.whistleFinal, 0.48)
            window.setTimeout(() => playOneShot(SFX.final, 0.42), 180)
          }
        }
        return
      }

      if (!matchActive.current) {
        matchActive.current = true
        previous.current = { forUs: current.forUs, against: current.against }
        startAmbient()
        if (unlocked.current) playOneShot(SFX.whistleStart, 0.42)
      } else {
        const before = previous.current
        if (before) {
          if (current.forUs > before.forUs) showGoal(true, current.score)
          else if (current.against > before.against) showGoal(false, current.score)
        }
        previous.current = { forUs: current.forUs, against: current.against }
      }

      const commentary = commentaryInsideMatch()
      if (commentary && commentary !== lastCommentary.current) {
        lastCommentary.current = commentary
        const now = Date.now()
        const building = /\u05de\u05e1\u05d9\u05e8\u05d4|\u05de\u05ea\u05e7\u05d3\u05dd|\u05de\u05e6\u05d1|\u05d1\u05e2\u05d9\u05d8\u05d4|\u05e0\u05e4\u05ea\u05d7|\u05dc\u05d5\u05d7\u05e5|\u05d4\u05d9\u05e6\u05d9\u05e2 \u05db\u05d1\u05e8 \u05e2\u05d5\u05de\u05d3/.test(commentary)
        if (building && unlocked.current && now > buildCooldown.current) {
          buildCooldown.current = now + 1500
          playOneShot(SFX.build, 0.24)
        }
      }
    }

    const timer = window.setInterval(scan, 120)
    return () => {
      window.clearInterval(timer)
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
      stopAmbient()
    }
  }, [])

  if (!flash) return null

  return (
    <div
      key={flash.key}
      className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-ink/35 px-4"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div
        className={`relative w-full max-w-3xl overflow-hidden border-[6px] px-4 py-7 text-center sm:px-8 sm:py-10 ${
          flash.ours ? 'border-paper bg-red text-paper' : 'border-red bg-ink text-paper'
        }`}
      >
        <div className={`absolute inset-x-0 top-0 h-3 ${flash.ours ? 'bg-paper' : 'bg-red'}`} />
        <p className="font-mono tabular-nums text-[10px] font-black tracking-[0.32em] opacity-70" dir="ltr">
          ROYAL RUMBLE · MATCH EVENT
        </p>
        <p className="mt-3 font-display text-[86px] leading-[0.78] sm:text-[142px]">
          {t(flash.ours ? 'goalFlashOurs' : 'goalFlashTheirs')}
        </p>
        <div className={`mx-auto mt-5 h-2 w-28 ${flash.ours ? 'bg-paper' : 'bg-red'}`} />
        <p className="mt-5 font-display text-[62px] leading-none sm:text-[88px]" dir="ltr">
          {flash.score}
        </p>
        <p className="mt-3 font-body text-[12px] font-black sm:text-[14px]">
          {t(flash.ours ? 'goalFlashOursBody' : 'goalFlashTheirsBody')}
        </p>
      </div>
    </div>
  )
}
