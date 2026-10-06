import type { DressConfig } from '@/lib/life/runtime/sceneDressing'

/**
 * תפאורת המיניגיימים — data, not code.
 *
 * Who stands where around each game. The kids are the child cast this life already draws
 * (`ofir`, `keren`, `amit`, `efi`); the backdrops are crops of paintings that already ship
 * (see docs/life/LIFE-MINIGAME-ASSET-MAP.md). Nothing here is new art. Positions are world
 * units of each game's own scene, chosen so no kid stands on the ball's path, the goal
 * mouth, the ring or the board.
 */

const ART = '/life/art'

/** street penalties: the Jaffa alley, kids behind and beside the goal, a bin in front */
export const PENALTIES_SCENE: DressConfig = {
  backdrop: { url: `${ART}/life-scene-penalties-backdrop-01.webp`, z: -19, height: 10, mirrorTiles: true },
  props: [{ id: 'bin', url: `${ART}/propBin.webp`, x: -2.35, z: -1.2, height: 0.95, factor: 0.7, foreground: true, min: 'tablet' }],
  npcs: [
    // behind the right post, half hidden by the net: always there
    { id: 'ofir', url: `${ART}/ofir-side.webp`, x: 3.1, z: -12.7, height: 1.45, min: 'mobile', phase: 0.4, onGoal: 'mock', onMiss: 'celebrate' },
    { id: 'keren', url: `${ART}/keren-side.webp`, x: -4.8, z: -9.2, height: 1.4, min: 'tablet', phase: 2.1, onGoal: 'celebrate', onMiss: 'disappointed' },
    { id: 'amit', url: `${ART}/amit-side.webp`, x: 6.4, z: -7.6, height: 1.38, min: 'desktop', phase: 4.0, onGoal: 'disappointed', onMiss: 'mock' },
  ],
}

/** the schoolyard court: Efi is the one who is always there; the others come and go */
export const HOOPS_SCENE: DressConfig = {
  backdrop: { url: `${ART}/life-scene-hoops-backdrop-01.webp`, z: -9.5, height: 10.8, mirrorTiles: true },
  props: [{ id: 'bin', url: `${ART}/propBin.webp`, x: 2.4, z: -0.4, height: 0.95, factor: 0.7, foreground: true, min: 'tablet' }],
  npcs: [
    { id: 'efi', url: `${ART}/efi-side.webp`, x: -0.82, z: -3.4, height: 1.42, min: 'mobile', phase: 0.9, onGoal: 'celebrate', onMiss: 'mock' },
    { id: 'keren', url: `${ART}/keren-side.webp`, x: 3.3, z: -5.4, height: 1.4, min: 'tablet', phase: 2.6, onGoal: 'celebrate', onMiss: 'disappointed' },
    { id: 'ofir', url: `${ART}/ofir-side.webp`, x: -4.4, z: -6.2, height: 1.45, min: 'desktop', phase: 4.4, onGoal: 'mock', onMiss: 'mock' },
  ],
}
