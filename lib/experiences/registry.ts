/**
 * Experiences are NOT clubs (ADR-fanlife-0009). An experience draws from the published clubs' approved records and has
 * no city, no rivals, no squad and no colour of its own: it wears FAN LIFE's neutral press. The club registry never
 * lists one, `clubFromHost`/`resolveClubId` never resolve one, and `gateAccess` is never called with one.
 */
export type ExperienceDefinition={kind:'aggregate';id:'all-football';name:string;tagline:string;path:string;gates:readonly ('trivia'|'timeline'|'memory')[]}
export const ALL_FOOTBALL:ExperienceDefinition={kind:'aggregate',id:'all-football',name:'ALL FOOTBALL',tagline:'Every club’s history in one room — questions, dates and pairs drawn from every published archive.',path:'/all-football',gates:['trivia','timeline','memory']}
export const EXPERIENCES:readonly ExperienceDefinition[]=[ALL_FOOTBALL]
export const isExperienceId=(id:string)=>EXPERIENCES.some(e=>e.id===id)
