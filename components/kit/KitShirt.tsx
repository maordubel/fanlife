import { KitEngineShirt } from '@/components/kit/KitEngineShirt'
import { KitShirt as KitLegacyShirt } from '@/components/kit/KitLegacyShirt'
import type { KitLook, KitMarksRegime } from '@/lib/kit/engine'
import type { KitSpec } from '@/lib/kit/spec'

type MissingMark = 'sponsor' | 'maker' | 'crest'

/**
 * The one public entry point for a shirt.
 *
 * Every complete shirt goes through the kit engine (`KitEngineShirt`): `look` picks the drawn
 * cloth or the photographed garment, `marks` picks rule 25 (default) or the logos Maor granted to
 * gates 4–5. The legacy renderer survives only for the old "missing mark" teaching state, whose
 * dashed empty slots are not part of the canonical garment.
 */
export function KitShirt({
  spec,
  className = '',
  missing = [],
  title,
  look = 'vector',
  marks = 'rule25',
  crop = 'full',
  density = 'full',
}: {
  spec: KitSpec
  className?: string
  missing?: MissingMark[]
  title?: string
  look?: KitLook
  marks?: KitMarksRegime
  crop?: 'full' | 'top'
  /** `mini` — thumbnail density for rows, pitch chips and posters (see `KitEngineShirt`) */
  density?: 'full' | 'mini'
}) {
  if (missing.length > 0) {
    return <KitLegacyShirt spec={spec} className={className} missing={missing} title={title} />
  }
  return (
    <KitEngineShirt spec={spec} className={className} title={title} look={look} marks={marks} crop={crop} density={density} />
  )
}
