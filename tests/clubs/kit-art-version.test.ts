import {describe,it,expect} from 'vitest'
// @ts-expect-error — plain node module
import {kitArtVersion} from '../../scripts/kits/stamp-kit-art-version.mjs'
import {KIT_ART_VERSION} from '@/lib/clubs/kit-art-version'
import {shirtView} from '@/components/clubs/rumble/shared'

/** 17.11.2026 — a redrawn shirt must be a new URL, or the edge keeps sending the old one for a week. */
describe('kit drawings are versioned',()=>{
 it('the stamped version is the hash of the drawings on disk (run scripts/kits/stamp-kit-art-version.mjs after redrawing)',()=>{
  expect(KIT_ART_VERSION).toBe(kitArtVersion())
 })
 it('every drawing <img> carries it, before the shirt crop',()=>{
  expect(shirtView('/club-kits/x/svg/a.svg')).toBe(`/club-kits/x/svg/a.svg?v=${KIT_ART_VERSION}#svgView(viewBox(0,20,336,298))`)
 })
})
