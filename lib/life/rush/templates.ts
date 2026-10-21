/**
 * LIFE · RUSH — the mission templates. Written once, played by every club.
 *
 * Each template is data: a verb, a camera, a route, a clock, what can go wrong, and what it needs
 * from a club's archive. `fit.ts` decides per club whether it is READY (bound to an approved night),
 * NEUTRAL (played without a date or a name), HELD (research must find something first) or
 * IRRELEVANT (not part of this club's story).
 *
 * Text is English source with tokens: `{club}`, `{city}`, `{rival}`, `{ground}`, `{date}`.
 * A neutral title or brief never carries `{date}`, `{rival}` or `{ground}` (validated).
 */
import type {MissionTemplate} from './spec'

export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  {
    id: 'kickoff-run', verb: 'run', camera: 'chase', route: 'main', ages: [6, 70], clock: 240,
    hazards: ['clock', 'traffic', 'crowd'],
    needs: [
      {of: {anchor: ['home']}, grade: 'enriching', day: true, why: 'A home match on a known day sets the kickoff the run is racing.'},
      {of: {club: 'ground'}, grade: 'decor', why: 'The gates he runs to carry the ground\'s name.'},
    ],
    title: 'Kickoff run · {date}', brief: 'The whistle at {ground} will not wait. Through {city}, to the gate, before kickoff.',
    neutralTitle: 'Kickoff run', neutralBrief: 'The whistle will not wait. Through {city}, to the gate, before kickoff.',
    weight: {home: 1, match: 0.5},
  },
  {
    id: 'sneak-in', verb: 'sneak', camera: 'eyes', route: 'main', ages: [11, 17], clock: 200,
    hazards: ['clock', 'steward', 'crowd'],
    needs: [
      {of: {anchor: ['home', 'derby', 'final']}, grade: 'enriching', day: true, why: 'A big night at home is the night a kid without a ticket tries the fence.'},
    ],
    title: 'No ticket · {date}', brief: 'No ticket, no money, one gap in the fence. Get in before the stewards look your way.',
    neutralTitle: 'No ticket', neutralBrief: 'No ticket, no money, one gap in the fence. Get in before the stewards look your way.',
    weight: {derby: 1, final: 1, home: 0.5},
  },
  {
    id: 'away-day', verb: 'drive', camera: 'chase', route: 'main', ages: [17, 70], clock: 420,
    hazards: ['clock', 'traffic', 'weather', 'police'],
    needs: [
      {of: {anchor: ['away']}, grade: 'critical', day: true, why: 'An away day is a real away match on a known day — the road and the kickoff come from it.'},
    ],
    title: 'Away day · {date}', brief: 'Four of you, one car, one kickoff a long road from {city}. Make it.',
    neutralTitle: 'Away day', neutralBrief: 'Four of you, one car, one kickoff a long road from {city}. Make it.',
    weight: {away: 1, europe: 0.5},
  },
  {
    id: 'cup-final-trip', verb: 'drive', camera: 'chase', route: 'main', ages: [12, 70], clock: 480,
    hazards: ['clock', 'traffic', 'crowd', 'police'],
    needs: [
      {of: {anchor: ['final']}, grade: 'critical', day: true, why: 'A cup-final trip stands on a final the archive dates to the day.'},
    ],
    title: 'The final · {date}', brief: 'The whole city is on the road to the final. So is every car in front of you.',
    neutralTitle: 'The final', neutralBrief: 'The whole city is on the road to the final. So is every car in front of you.',
    weight: {final: 3},
  },
  {
    id: 'europe-night', verb: 'find', camera: 'eyes', route: 'main', ages: [16, 70], clock: 300,
    hazards: ['clock', 'crowd', 'police', 'weather'],
    needs: [
      {of: {anchor: ['europe']}, grade: 'critical', day: true, why: 'A European night abroad stands on a European match dated to the day.'},
    ],
    title: 'A night in Europe · {date}', brief: 'A foreign city, a phone with no signal, your friend somewhere in the away end. Find him before the gates shut.',
    neutralTitle: 'A night in Europe', neutralBrief: 'A foreign city, a phone with no signal, your friend somewhere in the away end. Find him before the gates shut.',
    weight: {europe: 3},
  },
  {
    id: 'title-night', verb: 'find', camera: 'eyes', route: 'main', ages: [6, 70], clock: 240,
    hazards: ['clock', 'crowd'],
    needs: [
      {of: {anchor: ['title']}, grade: 'critical', why: 'A title night stands on a title the archive records.'},
      {of: {anchor: ['title']}, grade: 'enriching', day: true, why: 'The night itself needs the day the title was won, not only the year.'},
    ],
    title: 'Champions · {date}', brief: 'The pitch is full, the stands are empty, and your father is somewhere in it. Find him.',
    neutralTitle: 'Champions', neutralBrief: 'The pitch is full, the stands are empty, and your father is somewhere in it. Find him.',
    weight: {title: 3},
  },
  {
    id: 'where-you-stood', verb: 'find', camera: 'eyes', route: 'main', ages: [14, 70], clock: 180,
    hazards: ['clock', 'crowd', 'weather'],
    needs: [
      {of: {anchor: ['relegation']}, grade: 'critical', why: 'The night the club went down is a recorded relegation, never assumed.'},
    ],
    title: 'Where you stood · {date}', brief: 'Everyone is leaving. Go back up the steps to where you always stood, one last time this season.',
    neutralTitle: 'Where you stood', neutralBrief: 'Everyone is leaving. Go back up the steps to where you always stood, one last time this season.',
    weight: {relegation: 3, promotion: 1},
  },
  {
    id: 'new-ground', verb: 'run', camera: 'chase', route: 'main', ages: [6, 70], clock: 240,
    hazards: ['clock', 'crowd', 'traffic'],
    needs: [
      {of: {anchor: ['ground']}, grade: 'critical', why: 'The first day at a ground stands on a recorded opening or move.'},
      {of: {club: 'ground'}, grade: 'enriching', why: 'The ground\'s name goes on every sign of the way in.'},
    ],
    title: 'The first day · {date}', brief: 'Nobody knows the way in yet. Find the gate at {ground} before the first whistle there.',
    neutralTitle: 'The first day', neutralBrief: 'Nobody knows the way in yet. Find the new gate before the first whistle there.',
    weight: {ground: 2, founding: 0.5},
  },
  {
    id: 'derby-banner-raid', verb: 'sneak', camera: 'eyes', route: 'ultras', ages: [16, 40], clock: 300,
    hazards: ['clock', 'steward', 'police', 'steal', 'shove'],
    needs: [
      {of: {club: 'rival'}, grade: 'critical', absentMeans: 'irrelevant', why: 'A banner raid needs the club\'s approved primary rival.'},
      {of: {anchor: ['derby']}, grade: 'enriching', day: true, why: 'The raid happens on a recorded derby day.'},
    ],
    title: 'Their banner · {date}', brief: 'Their banner hangs in a storeroom by the {rival} end. Bring it back before the derby — nobody gets hurt.',
    neutralTitle: 'Their banner', neutralBrief: 'The other lot\'s banner hangs in a storeroom by their end. Bring it back before the derby — nobody gets hurt.',
    weight: {derby: 3},
  },
  {
    id: 'tifo-carry', verb: 'carry', camera: 'chase', route: 'ultras', ages: [15, 45], clock: 360,
    hazards: ['clock', 'crowd', 'police', 'strike'],
    needs: [
      {of: {club: 'rival'}, grade: 'critical', absentMeans: 'irrelevant', why: 'The choreography is made for the derby against the approved rival.'},
      {of: {anchor: ['derby']}, grade: 'enriching', day: true, why: 'The carry happens on a recorded derby day.'},
    ],
    title: 'The choreography · {date}', brief: 'Forty rolls of paper, two of you, and their lot throwing whatever they hold. Get it to the stand whole.',
    neutralTitle: 'The choreography', neutralBrief: 'Forty rolls of paper, two of you, and the other lot throwing whatever they hold. Get it to the stand whole.',
    weight: {derby: 2},
  },
]

export const templateById = (id: string): MissionTemplate | null => MISSION_TEMPLATES.find(t => t.id === id) ?? null
