'use client'

import { useEffect, useState } from 'react'

import { artUrl, CLOSE_UP, CLOSE_UP_FALLBACK, CLOSE_UP_PAINTED } from '@/lib/life/runtime/art'

/**
 * קלוז-אפ — for one line, the face is the world.
 *
 * The painted room stays where it is; over it, under the dialogue box, a face fills
 * the glass and pushes in very slowly (a few per cent over the length of a line) —
 * the one camera move a game with no facial animation can afford, because a slow
 * push on a still face reads as attention, where a cut to a moving one would read as
 * a bug. Ink at the edges, so the box and the name plate sit on something dark.
 *
 * Until the cinematic plates land, the speaker's portrait plate stands in — drawn
 * large, on ink, with the same push. Honest, and already better than nothing.
 */
export function CloseUp({ art }: { art: string }) {
  const known = (CLOSE_UP as readonly string[]).includes(art)
  const fallback = known ? CLOSE_UP_FALLBACK[art as keyof typeof CLOSE_UP_FALLBACK] : undefined
  // the plate if it has been painted, the portrait if not — decided by the file, not a list
  const first = fallback && !CLOSE_UP_PAINTED.includes(art) ? fallback : art
  const [key, setKey] = useState(first)
  useEffect(() => setKey(first), [first])
  return (
    <div className="pointer-events-none absolute inset-0 z-[25] overflow-hidden bg-ink" data-life="close-up">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={key}
        src={artUrl(key)}
        alt=""
        aria-hidden="true"
        onError={() => {
          if (fallback && key !== fallback) setKey(fallback)
        }}
        className="absolute inset-0 h-full w-full animate-push-in object-cover object-top"
        // a portrait blown up eight times is a pixel painting, not a blur
        style={key === fallback ? { imageRendering: 'pixelated' } : undefined}
      />
      {/* the edges fall to ink so the sheet has something to sit on */}
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" aria-hidden="true" />
    </div>
  )
}
