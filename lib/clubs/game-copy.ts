import en from '@/messages/games/en.json'
import he from '@/messages/games/he.json'
import xi_en from '@/messages/games/gates/xi.en.json'
import xi_he from '@/messages/games/gates/xi.he.json'
import trivia_en from '@/messages/games/gates/trivia.en.json'
import trivia_he from '@/messages/games/gates/trivia.he.json'
import lineup_en from '@/messages/games/gates/lineup.en.json'
import lineup_he from '@/messages/games/gates/lineup.he.json'
import kit_builder_en from '@/messages/games/gates/kit-builder.en.json'
import kit_builder_he from '@/messages/games/gates/kit-builder.he.json'
import kits_en from '@/messages/games/gates/kits.en.json'
import kits_he from '@/messages/games/gates/kits.he.json'
import memory_en from '@/messages/games/gates/memory.en.json'
import memory_he from '@/messages/games/gates/memory.he.json'
import polls_en from '@/messages/games/gates/polls.en.json'
import polls_he from '@/messages/games/gates/polls.he.json'
import goal_en from '@/messages/games/gates/goal.en.json'
import goal_he from '@/messages/games/gates/goal.he.json'
import royal_rumble_en from '@/messages/games/gates/royal-rumble.en.json'
import royal_rumble_he from '@/messages/games/gates/royal-rumble.he.json'
import blind_cow_en from '@/messages/games/gates/blind-cow.en.json'
import blind_cow_he from '@/messages/games/gates/blind-cow.he.json'
import derby_en from '@/messages/games/gates/derby.en.json'
import derby_he from '@/messages/games/gates/derby.he.json'
import archive_en from '@/messages/games/gates/archive.en.json'
import archive_he from '@/messages/games/gates/archive.he.json'
import shared_en from '@/messages/games/gates/shared.en.json'
import shared_he from '@/messages/games/gates/shared.he.json'
import type {UiLocale} from './locale'
/**
 * The club games' words. `messages/games/{en,he}.json` is the shared catalogue; each gate's own words live in
 * `messages/games/gates/<gate>.{en,he}.json` so gates upgraded in parallel never edit the same file.
 * A key must exist in one file only (tests/clubs/gate-copy.test.ts).
 */
export type GameCopy=typeof en&Record<string,string>
const EN:Record<string,string>[]=[xi_en,trivia_en,lineup_en,kit_builder_en,kits_en,memory_en,polls_en,goal_en,royal_rumble_en,blind_cow_en,derby_en,archive_en,shared_en]
const HE:Record<string,string>[]=[xi_he,trivia_he,lineup_he,kit_builder_he,kits_he,memory_he,polls_he,goal_he,royal_rumble_he,blind_cow_he,derby_he,archive_he,shared_he]
const enAll=Object.assign({},en,...EN) as GameCopy,heAll=Object.assign({},he,...HE) as GameCopy
export function gameCopy(locale:UiLocale):GameCopy{return locale==='he'?heAll:enAll}
export const GATE_CATALOGS={en:EN,he:HE,base:{en:en as Record<string,string>,he:he as Record<string,string>}}

/** The eleven-a-side game reads the same copy with its own wording laid over the classic's (`rr.xi.o.<key>` replaces `rr.<key>`). */
export function xiCopy(copy:GameCopy):GameCopy{const out={...copy} as Record<string,string>;for(const [k,v] of Object.entries(copy))if(k.startsWith('rr.xi.o.'))out['rr.'+k.slice(8)]=v as string;return out as GameCopy}
