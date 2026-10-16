'use client'
import {useEffect} from 'react'
import {renderFinalWhistle} from '@/lib/share/v3/final-whistle'
import {canvasMeasure, loadShareAssets, svgToPng} from '@/lib/share/v3/client'
import type {FinalResult} from '@/lib/fixtures/types'

declare global { interface Window { __fw?: {ready: boolean; png?: string; warnings?: string[]; error?: string} } }
const toDataUrl = (b: Blob) => new Promise<string>((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.onerror = no; f.readAsDataURL(b) })

export function RenderJob({club, result}: {club: string; result: FinalResult}) {
  useEffect(() => {
    window.__fw = {ready: false}
    ;(async () => {
      try {
        const assets = await loadShareAssets()
        const r = renderFinalWhistle({club, result}, {assets, measure: canvasMeasure})
        const png = await toDataUrl(await svgToPng(r.svg))
        window.__fw = {ready: true, png, warnings: r.warnings}
      } catch (e) { window.__fw = {ready: true, error: String((e as Error).message ?? e).slice(0, 200)} }
    })()
  }, [club, result])
  return <main lang="en" dir="ltr" data-testid="final-whistle-render" style={{padding: 16}}><p>Rendering…</p></main>
}
