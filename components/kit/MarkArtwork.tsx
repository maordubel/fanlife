import type { CSSProperties } from 'react'
import type { MarkAsset } from '@/lib/kit/mark-library'

export function MarkArtwork({ asset, className = '', invert = false }: { asset: MarkAsset; className?: string; invert?: boolean }) {
  if (!asset.atlas) return <img src={asset.src} alt="" aria-hidden="true" className={className} style={{ filter: asset.monochrome && invert ? 'brightness(0) invert(1)' : asset.monochrome ? 'brightness(0)' : undefined }} />
  const { col, row, cols, rows } = asset.atlas
  const x = cols <= 1 ? 0 : (col / (cols - 1)) * 100
  const y = rows <= 1 ? 0 : (row / (rows - 1)) * 100
  const style: CSSProperties = {
    backgroundImage: `url(${asset.src})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
    filter: asset.monochrome && invert ? 'brightness(0) invert(1)' : asset.monochrome ? 'brightness(0)' : undefined,
  }
  return <span aria-hidden="true" title={asset.label} className={`block ${className}`} style={style} />
}
