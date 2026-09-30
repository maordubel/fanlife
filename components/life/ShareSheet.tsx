'use client'

import { useEffect, useState } from 'react'

import { Cloth, SheetHead } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { FORMAT_SIZE, TARGET_LABEL, cardIsClean, shareHref, shareText, type ShareCard, type ShareFormat, type ShareTarget } from '@/lib/life/share'
import { paintShareCard } from '@/lib/life/runtime/shareCard'

/**
 * מה שאתה לוקח החוצה — the sheet a player shares from.
 *
 * The order of the buttons is the whole design. `navigator.share` with a FILE comes first
 * and is the only one that reaches Instagram at all: there is no web intent for a story, so
 * the picture has to be handed to the operating system and the person chooses where it goes.
 * Everything under it is a fallback for a desktop browser, and the last one — save the image
 * — is the fallback that always works, including on an old phone with an ad blocker.
 *
 * Two things this sheet deliberately does not do. It does not post anything itself: every
 * path here ends in the person's own app with the person's own thumb on the send button. And
 * it puts no identifier in the link — the card carries the game's address and nothing about
 * who made it, which is why `SHARE_URL` is a constant and not a builder.
 */
export function ShareSheet({ card, onClose }: { card: ShareCard; onClose: () => void }) {
  const [format, setFormat] = useState<ShareFormat>('story')
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(true)
  const [saidHe, setSaidHe] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let url: string | null = null
    setBusy(true)
    void paintShareCard(card, format).then((painted) => {
      if (!alive) return
      setBlob(painted)
      if (painted) {
        url = URL.createObjectURL(painted)
        setPreview(url)
      }
      setBusy(false)
    })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [card, format])

  const clean = cardIsClean(card)

  const go = async (target: ShareTarget) => {
    const text = shareText(card)
    if (target === 'native' && blob) {
      const file = new File([blob], `the-worker-${card.id.replace(/[^a-z0-9]+/gi, '-')}.png`, { type: 'image/png' })
      const data: ShareData & { files?: File[] } = { text, files: [file] }
      const can = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare(data)
      if (can) {
        try {
          await navigator.share(data)
          return
        } catch {
          /* the person changed their mind; that is not an error */
        }
      }
      setSaidHe(t('life.share.noNative'))
      return
    }
    if (target === 'copy') {
      try {
        await navigator.clipboard.writeText(text)
        setSaidHe(t('life.share.copied'))
      } catch {
        setSaidHe(t('life.share.copyFailed'))
      }
      return
    }
    if (target === 'download' && blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `the-worker-${format}.png`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setSaidHe(t('life.share.saved'))
      return
    }
    const href = shareHref(card, target)
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
  }

  const targets: ShareTarget[] = ['native', 'whatsapp', 'facebook', 'x', 'copy', 'download']
  const ratio = FORMAT_SIZE[format].w / FORMAT_SIZE[format].h
  const dialogRef = useDialog<HTMLDivElement>(onClose)

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 outline-none sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('life.share.title')}
    >
      <Cloth className="max-h-[92dvh] w-full max-w-md overflow-y-auto border-rule border-sheet px-4 pb-6 pt-3">
        <SheetHead title={t('life.share.title')} onClose={onClose} closeLabel={t('life.share.close')} />

        <div className="mt-3 flex gap-2">
          {(['story', 'square'] as ShareFormat[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormat(option)}
              aria-pressed={format === option}
              className={`flex-1 min-h-tap border-hair px-3 py-2 font-sign text-[13px] ${
                format === option ? 'border-red bg-red/10 text-red' : 'border-ink text-ink'
              }`}
            >
              {t(option === 'story' ? 'life.share.story' : 'life.share.square')}
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-hidden border-hair border-ink bg-black/30" style={{ aspectRatio: String(ratio) }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={card.claimHe} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center font-sign text-[13px] text-ink">
              {busy ? t('life.share.painting') : t('life.share.failed')}
            </div>
          )}
        </div>

        {!clean.ok ? <p className="mt-2 font-sign text-[12px] text-red">{clean.whyHe}</p> : null}

        <div className="mt-3 grid grid-cols-3 gap-2">
          {targets.map((target) => (
            <button
              key={target}
              type="button"
              data-life={`share-${target}`}
              onClick={() => void go(target)}
              disabled={busy && (target === 'native' || target === 'download')}
              className="min-h-tap border-hair border-ink px-2 py-3 font-sign text-[13px] text-ink disabled:opacity-40"
            >
              {TARGET_LABEL[target]}
            </button>
          ))}
        </div>

        <p aria-live="polite" className="mt-2 min-h-[1.2em] font-sign text-[12px] text-ink/80">
          {saidHe ?? ''}
        </p>
      </Cloth>
    </div>
  )
}
