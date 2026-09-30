'use client'

import { useEffect, useState } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { t } from '@/lib/i18n'

/**
 * כרטיס התוצאה בשיתוף (delta 89) — one flow for gate 10 and gate 8.
 *
 *   1. On a phone that can share files: the designed card itself (1080×1350 PNG from
 *      `/api/card/…?v=story`) goes into the share sheet, with the text and the link.
 *   2. Otherwise: the link, whose WhatsApp preview IS the card (the gate page swaps its
 *      Open Graph image for `/api/card/…` when the link carries the card query).
 *   3. Otherwise: copy the link.
 *
 * The PNG is fetched when the result opens, not on the tap: iOS only lets `navigator.share`
 * run inside the tap itself, and a fetch in between would spend that permission.
 */

type Outcome = 'file' | 'link' | 'copied' | 'failed'

export function useCardFile(imagePath: string | null): File | null {
  const [file, setFile] = useState<File | null>(null)
  useEffect(() => {
    setFile(null)
    if (!imagePath) return
    let live = true
    const sep = imagePath.includes('?') ? '&' : '?'
    fetch(`${imagePath}${sep}v=story`)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (live && blob && blob.type === 'image/png') setFile(new File([blob], 'the-worker.png', { type: 'image/png' }))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [imagePath])
  return file
}

export async function shareCard(file: File | null, text: string, url: string): Promise<Outcome> {
  const nav = typeof navigator === 'undefined' ? null : navigator
  if (file && nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: `${text}\n${url}` })
      return 'file'
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return 'failed'
    }
  }
  if (nav?.share) {
    try {
      await nav.share({ text, url })
      return 'link'
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return 'failed'
    }
  }
  try {
    await nav?.clipboard?.writeText(`${text}\n\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function whatsappCardHref(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`
}

/**
 * The two chips a result dock carries: "שתף כרטיס" (the card file, or the link) and
 * "וואטסאפ" (the link with the card as its preview). `onShared` hears the channel.
 */
export function ShareCardChips({
  imagePath,
  url,
  text,
  onShared,
  primary = false,
}: {
  imagePath: string
  url: string
  text: string
  onShared?: (channel: 'card' | 'link' | 'copy' | 'whatsapp') => void
  primary?: boolean
}) {
  const file = useCardFile(imagePath)
  const [note, setNote] = useState<string | null>(null)
  return (
    <>
      <li className="shrink-0">
        <button
          type="button"
          data-share="card"
          onClick={async (event) => {
            firePickFxAt(event.currentTarget, { tone: 'red', haptic: 'tap' })
            const out = await shareCard(file, text, url)
            if (out === 'copied') setNote(t('connect.share.copied'))
            if (out !== 'failed') onShared?.(out === 'file' ? 'card' : out === 'link' ? 'link' : 'copy')
          }}
          className={`flex min-h-tap items-center gap-1.5 border-rule border-ink px-3 font-body text-[12.5px] font-extrabold active:scale-[.97] ${primary ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}
        >
          {t('connect.share.card')}
        </button>
      </li>
      <li className="shrink-0">
        <a
          href={whatsappCardHref(text, url)}
          target="_blank"
          rel="noopener noreferrer"
          data-share="whatsapp"
          onClick={() => onShared?.('whatsapp')}
          className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink active:scale-[.97]"
        >
          {t('connect.share.whatsapp')}
        </a>
      </li>
      {note && (
        <li className="flex shrink-0 items-center font-body text-[11px] font-extrabold text-sign" role="status">
          {note}
        </li>
      )}
    </>
  )
}
