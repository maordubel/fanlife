/**
 * LIFE, universal — the rooms.
 *
 * Two tables.
 *
 * `ROOM_CATALOGUE` is the contract between the voxel kit (`public/life/voxel/rooms-*.js`) and
 * everything else: every room the kit builds, what kind of room it is, and which scene of the
 * hand-authored Hapoel LIFE it stands for. A room that is renamed or dropped in the kit fails
 * `tests/clubs/universal-life-rooms.test.ts`, and so does a legacy scene with no voxel room.
 *
 * `ROOMS` is where a body can be in the rooms the universal chapters use: the walkable
 * rectangle, where people stand, what can be touched, where the doors are. Units are the kit's
 * (1 ≈ 27 cm; x along the room, z towards the camera). The furniture is NOT listed here — the
 * kit's own boxes cut it out of the walk grid — so moving a sofa never strands a door.
 */
import type {RoomId, RoomPlay} from './types'

const PI = Math.PI

export type RoomScope =
  /** any club, anywhere: nothing on the walls but what the skin prints */
  | 'universal'
  /** a street or a hall of one country — true for clubs of that country only */
  | 'society'
  /** a real place of one club (a named ground, a named hall): never dressed for another */
  | 'club'

export type CatalogueRoom = {id: RoomId; scope: RoomScope; kind: string; legacy: readonly string[]; alias?: RoomId}

export const ROOM_CATALOGUE: readonly CatalogueRoom[] = [
  {id: 'room', scope: 'universal', kind: 'home', legacy: ['home']},
  {id: 'bedroom', scope: 'universal', kind: 'home', legacy: ['bedroom']},
  {id: 'kitchen', scope: 'universal', kind: 'home', legacy: ['kitchen']},
  {id: 'flat-abroad', scope: 'universal', kind: 'home', legacy: ['flat-abroad']},
  {id: 'classroom', scope: 'universal', kind: 'school', legacy: ['classroom']},
  {id: 'schoolyard', scope: 'universal', kind: 'school', legacy: ['schoolyard']},
  {id: 'street', scope: 'universal', kind: 'street', legacy: ['street', 'kiosk']},
  {id: 'pitch', scope: 'universal', kind: 'street', legacy: ['pitch']},
  {id: 'route', scope: 'universal', kind: 'street', legacy: ['route']},
  {id: 'bus-stop', scope: 'universal', kind: 'street', legacy: ['bus-stop']},
  {id: 'bus-station', scope: 'universal', kind: 'street', legacy: ['bus-station']},
  {id: 'drive-in', scope: 'universal', kind: 'street', legacy: ['drive-in']},
  {id: 'allenby', scope: 'society', kind: 'street', legacy: ['allenby']},
  {id: 'hatikva', scope: 'society', kind: 'street', legacy: ['hatikva']},
  {id: 'newsroom', scope: 'universal', kind: 'work', legacy: ['newsroom']},
  {id: 'office', scope: 'universal', kind: 'work', legacy: ['office']},
  {id: 'community-room', scope: 'universal', kind: 'club-room', legacy: ['community-room']},
  {id: 'storeroom', scope: 'universal', kind: 'club-room', legacy: ['storeroom']},
  {id: 'workshop', scope: 'universal', kind: 'club-room', legacy: ['workshop']},
  {id: 'rehearsal', scope: 'universal', kind: 'club-room', legacy: ['rehearsal']},
  {id: 'hall-new', scope: 'universal', kind: 'hall', legacy: ['hall-new']},
  {id: 'ticket-office', scope: 'universal', kind: 'stadium', legacy: ['ticket-office']},
  {id: 'gate', scope: 'universal', kind: 'stadium', legacy: ['bloomfield-outside']},
  {id: 'bloomfield-tunnel', scope: 'universal', kind: 'stadium', legacy: ['bloomfield-tunnel']},
  {id: 'bloomfield-inside', scope: 'universal', kind: 'stadium', legacy: ['bloomfield-inside']},
  {id: 'gate5', scope: 'universal', kind: 'stadium', legacy: ['gate5']},
  {id: 'gate5-stand', scope: 'universal', kind: 'stadium', legacy: ['gate5-stand']},
  {id: 'undercroft', scope: 'universal', kind: 'stadium', legacy: ['undercroft']},
  {id: 'away-end', scope: 'universal', kind: 'stadium', legacy: []},
  {id: 'ramat-gan', scope: 'club', kind: 'stadium', legacy: ['ramat-gan']},
  {id: 'teddy', scope: 'club', kind: 'stadium', legacy: ['teddy']},
  {id: 'away-salzburg', scope: 'club', kind: 'stadium', legacy: ['away-salzburg']},
  {id: 'away-lisbon', scope: 'club', kind: 'stadium', legacy: ['away-lisbon']},
  {id: 'away-lyon', scope: 'club', kind: 'stadium', legacy: ['away-lyon']},
  {id: 'arena-out', scope: 'universal', kind: 'hall', legacy: ['arena-out']},
  {id: 'arena-seats', scope: 'universal', kind: 'hall', legacy: ['arena-seats']},
  {id: 'menora', scope: 'club', kind: 'hall', legacy: ['menora']},
  {id: 'ussishkin-outside', scope: 'club', kind: 'hall', legacy: ['ussishkin-outside']},
  {id: 'ussishkin-hall', scope: 'club', kind: 'hall', legacy: ['ussishkin-hall']},
  {id: 'ussishkin-end', scope: 'club', kind: 'hall', legacy: ['ussishkin-end']},
  {id: 'jaffa', scope: 'club', kind: 'city', legacy: ['jaffa']},
  {id: 'jaffa-alley', scope: 'club', kind: 'city', legacy: ['jaffa-alley']},
  {id: 'jaffa-boulevard', scope: 'club', kind: 'city', legacy: ['jaffa-boulevard']},
  {id: 'port-europe', scope: 'universal', kind: 'travel', legacy: ['port-europe']},
  {id: 'promenade', scope: 'universal', kind: 'travel', legacy: ['promenade']},
  // the neutral names a club-agnostic chapter asks for
  {id: 'tunnel', scope: 'universal', kind: 'stadium', legacy: [], alias: 'bloomfield-tunnel'},
  {id: 'terrace', scope: 'universal', kind: 'stadium', legacy: [], alias: 'bloomfield-inside'},
  {id: 'curva', scope: 'universal', kind: 'stadium', legacy: [], alias: 'gate5-stand'},
  {id: 'concourse', scope: 'universal', kind: 'stadium', legacy: [], alias: 'undercroft'},
]

/** The rooms a universal chapter may be set in. */
export const ROOMS: Record<RoomId, RoomPlay> = {
  room: {
    id: 'room', floorY: 0, walk: [0.5, 1, 23.5, 12.5], surface: 'floor',
    spawns: {start: {x: 11.5, z: 9.6, yaw: PI}, fromStreet: {x: 19.2, z: 2.8, yaw: 0}, fromKitchen: {x: 21.4, z: 6.6, yaw: -PI / 2}, fromBedroom: {x: 3.4, z: 10.8, yaw: 0}},
    slots: {
      sofa: {x: 9.9, z: 3.4, yaw: 0, sit: {seat: 2}, head: -1.1},
      sofaEnd: {x: 7.7, z: 3.4, yaw: 0, sit: {seat: 2}},
      stool: {x: 5.5, z: 7.3, yaw: -PI / 2, sit: {seat: 1.15}},
      byDoor: {x: 20.4, z: 5, yaw: -1.2},
      rug: {x: 12.2, z: 6.6, yaw: 0.3},
      window: {x: 15.2, z: 3.2, yaw: 0.2},
    },
    spots: {tv: {x: 2.9, z: 6.6, y: 4.4}, frame: {x: 15, z: 1.3, y: 6.8}, table: {x: 16.7, z: 5.4, y: 4.2}, lamp: {x: 5.6, z: 3.4, y: 5.2}, photos: {x: 22.2, z: 1.4, y: 7}},
    doors: {front: {x: 18.1, z: 1, w: 2.2, d: 1.1, dir: 'n'}, east: {x: 22.6, z: 5.4, w: 0.9, d: 2.6, dir: 'e'}, south: {x: 1.4, z: 11.6, w: 3, d: 0.9, dir: 's'}},
  },
  bedroom: {
    id: 'bedroom', floorY: 0, walk: [0.5, 1, 23.5, 12.5], surface: 'wood',
    spawns: {start: {x: 9, z: 8.4, yaw: PI}, fromLiving: {x: 22, z: 2.8, yaw: 0}, bed: {x: 6.4, z: 6.2, yaw: 0}},
    slots: {bed: {x: 5.6, z: 3.2, yaw: PI / 2, sit: {seat: 2}}, byDoor: {x: 19.4, z: 6.2, yaw: PI}, byDesk: {x: 18.6, z: 5.2, yaw: PI}, rug: {x: 13.4, z: 8.4, yaw: -0.4}},
    spots: {wardrobe: {x: 11.8, z: 2.6, y: 6}, desk: {x: 15.4, z: 3.3, y: 4.4}, box: {x: 4.6, z: 5.4, y: 1.8}, ball: {x: 11.9, z: 7.8, y: 1.8}, flag: {x: 3.6, z: 5.3, y: 6.6}, window: {x: 20, z: 3.4, y: 6.4}},
    doors: {door: {x: 20.9, z: 1, w: 2.2, d: 1.1, dir: 'n'}},
  },
  kitchen: {
    id: 'kitchen', floorY: 0, walk: [0.5, 1, 23.5, 12.5], surface: 'floor',
    spawns: {start: {x: 18, z: 7.4, yaw: PI}, fromLiving: {x: 21.8, z: 2.8, yaw: 0}},
    slots: {table: {x: 10.6, z: 8.6, yaw: PI, sit: {seat: 1.7}}, counter: {x: 5.2, z: 4.4, yaw: PI * 0.9}, fridge: {x: 12.2, z: 3.4, yaw: 0.4}, tableEnd: {x: 16.4, z: 7, yaw: -PI / 2}},
    spots: {radio: {x: 16.8, z: 3.3, y: 5.4}, fridge: {x: 9.3, z: 3.5, y: 6}, drawer: {x: 3.4, z: 3.4, y: 3.8}, table: {x: 15.4, z: 6.6, y: 3.8}, window: {x: 12.6, z: 3.4, y: 7}, shelf: {x: 18.6, z: 3.3, y: 7.4}},
    doors: {door: {x: 20.7, z: 1, w: 2.2, d: 1.1, dir: 'n'}},
  },
  'flat-abroad': {
    id: 'flat-abroad', floorY: 0, walk: [0.5, 1, 23.5, 12.5], surface: 'wood',
    spawns: {start: {x: 11.4, z: 6.4, yaw: PI}, fromDoor: {x: 3.6, z: 2.8, yaw: 0}},
    slots: {visitor: {x: 12.6, z: 8.2, yaw: PI * 0.8}, bed: {x: 15.4, z: 9, yaw: -PI / 2, sit: {seat: 2}}},
    spots: {laptop: {x: 8, z: 2.6, y: 4.6}, phone: {x: 11.8, z: 3.3, y: 4.4}, window: {x: 15.8, z: 1.6, y: 6.4}, boxes: {x: 7.4, z: 9.2, y: 3.6}, bed: {x: 17.6, z: 6.2, y: 2.8}, stove: {x: 21, z: 3.3, y: 4.4}, banner: {x: 5.6, z: 1.4, y: 5.6}},
    doors: {door: {x: 2.5, z: 1, w: 2.2, d: 1.1, dir: 'n'}},
  },
  classroom: {
    id: 'classroom', floorY: 0, walk: [0.5, 1, 25.5, 14.5], surface: 'floor',
    spawns: {start: {x: 9.6, z: 4.6, yaw: 0}, fromYard: {x: 3, z: 2.8, yaw: 0}},
    slots: {teacher: {x: 7.4, z: 3, yaw: 0.2}, front: {x: 22.4, z: 4.8, yaw: -0.6}, back: {x: 23.6, z: 10.4, yaw: -0.9}},
    spots: {board: {x: 10.6, z: 1.7, y: 6}, desk: {x: 7.1, z: 7, y: 3.4}, window: {x: 22.4, z: 2.4, y: 6.6}, teacherDesk: {x: 20.6, z: 4.2, y: 4}},
    doors: {door: {x: 1.9, z: 1, w: 2.2, d: 1.1, dir: 'n'}},
  },
  schoolyard: {
    id: 'schoolyard', floorY: 0.5, walk: [0.6, 8, 43.4, 20.8], viewH: 13, surface: 'stone',
    spawns: {start: {x: 8, z: 12, yaw: PI / 2}, fromClass: {x: 4, z: 9.4, yaw: 0}, fromStreet: {x: 41.4, z: 15, yaw: -PI / 2}},
    slots: {friend: {x: 21.5, z: 15.6, yaw: 0.2}, rival: {x: 25, z: 16.4, yaw: -0.5}, bench: {x: 10.4, z: 16.2, yaw: 0.8}, hoop: {x: 37.4, z: 12.6, yaw: PI * 0.9}},
    spots: {ball: {x: 36.5, z: 12.4, y: 2.2}, wall: {x: 19, z: 8.4, y: 4}, bench: {x: 15, z: 16.2, y: 3}},
    doors: {school: {x: 2.9, z: 8, w: 2.2, d: 1, dir: 'n'}, east: {x: 42.5, z: 13, w: 0.9, d: 4, dir: 'e'}},
  },
  street: {
    id: 'street', floorY: 0.5, walk: [0.6, 8.7, 43.4, 12.9], viewH: 13, surface: 'stone',
    spawns: {start: {x: 8.2, z: 10, yaw: 0}, fromHome: {x: 8.2, z: 10, yaw: 0}, fromWest: {x: 2, z: 10.6, yaw: PI / 2}, fromEast: {x: 42, z: 10.6, yaw: -PI / 2}, kiosk: {x: 21.5, z: 10.4, yaw: PI}},
    slots: {
      kiosk: {x: 21.5, z: 6.3, yaw: 0, reach: 4.4},
      customer: {x: 24.2, z: 9.8, yaw: PI * 0.9},
      corner: {x: 15, z: 9.6, yaw: 0.4},
      wall: {x: 31.4, z: 9.3, yaw: 0.2},
      shutter: {x: 40, z: 9.4, yaw: -0.2},
      kerb: {x: 34, z: 12.3, yaw: PI},
      doorstep: {x: 4.4, z: 9.4, yaw: 0.6},
    },
    spots: {window: {x: 18.6, z: 8.7, y: 5}, crates: {x: 25.2, z: 9, y: 3}, graffiti: {x: 33.4, z: 8.7, y: 4}, bin: {x: 29.6, z: 9.9, y: 3.4}, car: {x: 30, z: 12.9, y: 4}},
    doors: {home: {x: 7.1, z: 8.7, w: 2.4, d: 0.9, dir: 'n'}, west: {x: 0.6, z: 9.2, w: 0.9, d: 3.2, dir: 'w'}, east: {x: 42.5, z: 9.2, w: 0.9, d: 3.2, dir: 'e'}},
  },
  pitch: {
    id: 'pitch', floorY: 0.5, walk: [0.6, 7.6, 41.4, 21.4], viewH: 13, surface: 'stone',
    spawns: {start: {x: 37, z: 16, yaw: -PI / 2}, fromStreet: {x: 39.6, z: 12.4, yaw: -PI / 2}},
    slots: {friend: {x: 24.6, z: 10.4, yaw: -0.4}, captain: {x: 22.4, z: 16.4, yaw: -0.2}, elder: {x: 36.4, z: 9.4, yaw: -0.6}, goal: {x: 11, z: 18.2, yaw: PI}},
    spots: {ball: {x: 16.4, z: 17, y: 2}, wall: {x: 9.6, z: 7.8, y: 4}, jackets: {x: 11, z: 9.4, y: 2}},
    doors: {street: {x: 40.5, z: 10.4, w: 0.9, d: 4, dir: 'e'}},
  },
  route: {
    id: 'route', floorY: 0.5, walk: [0.6, 6.4, 47.4, 9.9], viewH: 14, surface: 'stone',
    spawns: {start: {x: 2, z: 8.4, yaw: PI / 2}, fromStreet: {x: 2, z: 8.4, yaw: PI / 2}, fromGate: {x: 46, z: 8.4, yaw: -PI / 2}},
    slots: {seller: {x: 24, z: 6.9, yaw: 0}, lamp: {x: 14.6, z: 8.8, yaw: 0.6}, corner: {x: 36.4, z: 7, yaw: -0.4}},
    spots: {sign: {x: 21, z: 6.6, y: 5}, flags: {x: 28.6, z: 9.6, y: 5}},
    doors: {west: {x: 0.6, z: 6.8, w: 0.9, d: 3, dir: 'w'}, east: {x: 46.5, z: 6.8, w: 0.9, d: 3, dir: 'e'}},
  },
  gate: {
    id: 'gate', floorY: 0, walk: [0.6, 7.5, 39.4, 19.4], viewH: 14, surface: 'stone',
    spawns: {start: {x: 2.4, z: 15.6, yaw: PI / 2}, fromRoute: {x: 2.4, z: 15.6, yaw: PI / 2}, fromInside: {x: 26.6, z: 9.4, yaw: 0}},
    slots: {steward: {x: 26.4, z: 8, yaw: 0}, wait: {x: 13.6, z: 15.4, yaw: 0.3}, fence: {x: 13.2, z: 8.6, yaw: 0}, far: {x: 30, z: 16.6, yaw: -0.5}},
    spots: {board: {x: 20, z: 12.9, y: 6}, flag: {x: 3.6, z: 9.4, y: 6}},
    doors: {turnstile: {x: 25.5, z: 7.5, w: 2, d: 0.9, dir: 'n'}, west: {x: 0.6, z: 13.6, w: 0.9, d: 4, dir: 'w'}},
    clear: [[25.4, 7.5, 27.6, 10.4]],
  },
  tunnel: {
    id: 'tunnel', floorY: 0.5, walk: [3.9, 3.2, 18.1, 25.4], surface: 'stone',
    spawns: {start: {x: 11, z: 23.6, yaw: PI}, fromGate: {x: 11, z: 23.6, yaw: PI}, fromTerrace: {x: 11, z: 6.4, yaw: 0}},
    slots: {wall: {x: 5.4, z: 16, yaw: 0.9}, ahead: {x: 12.8, z: 12, yaw: PI}},
    spots: {sign: {x: 11, z: 11.2, y: 7.4}},
    doors: {light: {x: 7.5, z: 3.2, w: 7, d: 1.3, dir: 'n'}, back: {x: 7.5, z: 24.6, w: 7, d: 0.8, dir: 's'}},
  },
  terrace: {
    id: 'terrace', floorY: 0.05, walk: [8.4, 23.4, 49.4, 27.4], viewH: 16, surface: 'grass',
    spawns: {start: {x: 30, z: 24.6, yaw: 0}, fromTunnel: {x: 30, z: 24.6, yaw: 0}},
    slots: {fence: {x: 33, z: 24.2, yaw: 0}, left: {x: 21, z: 24.3, yaw: 0.2}, right: {x: 40.4, z: 24.4, yaw: -0.2}, steward: {x: 46.4, z: 24.8, yaw: -PI / 2}},
    spots: {pitch: {x: 27, z: 25.9, y: 2}, banner: {x: 36, z: 23.4, y: 5}},
    doors: {tunnel: {x: 28.6, z: 23.4, w: 2.6, d: 0.8, dir: 'n'}},
  },
  'away-end': {
    id: 'away-end', floorY: 0.05, walk: [34.4, 23.4, 49.4, 27.4], viewH: 16, surface: 'grass',
    spawns: {start: {x: 41, z: 24.6, yaw: 0}},
    slots: {fence: {x: 43.6, z: 24.2, yaw: 0}, left: {x: 37.4, z: 24.3, yaw: 0.3}, steward: {x: 47.8, z: 25, yaw: -PI / 2}},
    spots: {pitch: {x: 40, z: 25.9, y: 2}},
    doors: {out: {x: 45.4, z: 23.4, w: 2.6, d: 0.8, dir: 'n'}},
  },
  'bus-stop': {
    id: 'bus-stop', floorY: 0.5, walk: [0.6, 9.7, 35.4, 13.2], viewH: 12, surface: 'stone',
    spawns: {start: {x: 1.8, z: 12, yaw: PI / 2}, fromStreet: {x: 1.8, z: 12, yaw: PI / 2}},
    slots: {wait: {x: 9.6, z: 10.8, yaw: 0.5}, stranger: {x: 30.4, z: 10.6, yaw: -0.3}, bench: {x: 16, z: 11.3, yaw: 0, sit: {seat: 1.9, y: 0.5}}},
    spots: {sign: {x: 4.4, z: 12, y: 6}},
    doors: {west: {x: 0.6, z: 9.9, w: 0.9, d: 1.6, dir: 'w'}, bus: {x: 24.6, z: 12.4, w: 4, d: 0.8, dir: 's'}},
    // the lamp post at the kerb is a hand wide: a body passes it
    clear: [[17.8, 12.4, 20.4, 13.2]],
  },
  'bus-station': {
    id: 'bus-station', floorY: 0.5, walk: [0.6, 4.9, 43.4, 11.6], viewH: 12, surface: 'stone',
    spawns: {start: {x: 2, z: 7, yaw: PI / 2}, fromStreet: {x: 2, z: 7, yaw: PI / 2}},
    slots: {friend: {x: 21, z: 7.2, yaw: 0}, driver: {x: 24.6, z: 11, yaw: PI}, pillar: {x: 15.4, z: 8.2, yaw: 0.5}, far: {x: 38, z: 7, yaw: -0.4}},
    spots: {board: {x: 22, z: 5.2, y: 6}, bench: {x: 28, z: 8.9, y: 3}},
    doors: {west: {x: 0.6, z: 5.6, w: 0.9, d: 3.2, dir: 'w'}, bus: {x: 20.4, z: 11, w: 3.6, d: 0.6, dir: 's'}},
  },
  workshop: {
    id: 'workshop', floorY: 0, walk: [0.5, 1, 25.5, 14.5], surface: 'stone',
    spawns: {start: {x: 4.6, z: 4, yaw: 0}, fromStreet: {x: 3.5, z: 2.8, yaw: 0}},
    slots: {boss: {x: 17.2, z: 8.6, yaw: PI * 1.2}, mate: {x: 12, z: 9.6, yaw: PI}, bench: {x: 20, z: 4.6, yaw: PI}},
    spots: {tools: {x: 13, z: 4.3, y: 6}, banner: {x: 9, z: 13.6, y: 1.6}, cans: {x: 20.8, z: 9, y: 2.6}, ladder: {x: 22.4, z: 3.6, y: 6}, radio: {x: 16.8, z: 4.3, y: 4.2}},
    doors: {door: {x: 2.4, z: 1, w: 2.2, d: 1.1, dir: 'n'}},
  },
}

export const roomIds = (): RoomId[] => Object.keys(ROOMS)
