import type {Metadata} from 'next'

/**
 * LIFE — the voxel lab: every room of the voxel kit, dressed by every club skin, day and night.
 * A viewing tool for whoever is building or approving a club pack; the game itself is at
 * `/clubs/<club>/life`.
 */
export const metadata: Metadata = {title: 'LIFE · Voxel Lab', robots: {index: false}}

export default function VoxelLabPage() {
  return <iframe title="LIFE voxel lab" src="/life/voxel/lab.html" style={{position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0}} />
}
