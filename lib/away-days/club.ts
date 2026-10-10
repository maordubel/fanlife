import zrinjski from '@/content/generated/away-days-zrinjski-mostar.json'
import {haversineKm} from './distance'

/** A club's European journey, straight from UEFA's match API (scripts/away-days/build-euro-club.mjs). */
export type ClubStadium={id:string;name:string;city:string|null;countryCode:string;lat:number;lng:number;capacity:number|null;opened:number|null}
export type ClubScorer={name:string;minute:number|null;forClub:boolean;penalty:boolean;ownGoal:boolean}
export type ClubVisit={
 id:string;uefaId:string;playedOn:string;competition:string|null;season:string|null;stage:string|null;leg:number|null
 drawnHome:boolean;opponent:string;opponentCountry:string;scoreFor:number;scoreAgainst:number;result:'W'|'D'|'L'
 penalties:{for:number;against:number}|null;attendance:number|null;scorers:ClubScorer[];venueId:string
 side:'HOME'|'AWAY'|'NEUTRAL'|'DOMESTIC';physicallyAbroad:boolean
}
export type ClubAwayData={schemaVersion:1;clubId:string;clubName:string;homeCountry:string;origin:string;counts:{matches:number;abroad:number;grounds:number;countries:number;unplaced:number};stadiums:ClubStadium[];visits:ClubVisit[]}

const DATA:Record<string,ClubAwayData>={'zrinjski-mostar':zrinjski as unknown as ClubAwayData}
/** Only a club whose journey has been built has this door. */
export const clubAwayData=(clubId:string):ClubAwayData|null=>DATA[clubId]??null
export const hasClubAway=(clubId:string)=>clubId in DATA

/** UEFA's three-letter country codes → ISO-3166 alpha-2 for the grounds that appear; England is its own name. */
const A2:Record<string,string>={ALB:'AL',AND:'AD',ARM:'AM',AUT:'AT',AZE:'AZ',BEL:'BE',BIH:'BA',BLR:'BY',BUL:'BG',CRO:'HR',CYP:'CY',CZE:'CZ',DEN:'DK',ESP:'ES',EST:'EE',FIN:'FI',FRA:'FR',FRO:'FO',GEO:'GE',GER:'DE',GIB:'GI',GRE:'GR',HUN:'HU',ISL:'IS',ISR:'IL',ITA:'IT',KAZ:'KZ',KOS:'XK',LIE:'LI',LTU:'LT',LUX:'LU',LVA:'LV',MDA:'MD',MKD:'MK',MLT:'MT',MNE:'ME',NED:'NL',NIR:'GB',NOR:'NO',POL:'PL',POR:'PT',ROU:'RO',RUS:'RU',SMR:'SM',SRB:'RS',SUI:'CH',SVK:'SK',SVN:'SI',SWE:'SE',TUR:'TR',UKR:'UA',WAL:'GB',SCO:'GB'}
const ISLES:Record<string,{en:string;he:string}>={ENG:{en:'England',he:'אנגליה'},SCO:{en:'Scotland',he:'סקוטלנד'},WAL:{en:'Wales',he:'ויילס'},NIR:{en:'Northern Ireland',he:'צפון אירלנד'}}
export function countryName(code:string,locale:'en'|'he'):string{
 if(ISLES[code])return ISLES[code]![locale]
 const a2=A2[code]
 if(!a2)return code
 try{return new Intl.DisplayNames([locale],{type:'region'}).of(a2)??code}catch{return code}
}

/** Sum of the straight-line legs from the home ground to each ground abroad, counted once per visit — a caption, not a survey. */
export function totalKm(d:ClubAwayData):number{
 const by=Object.fromEntries(d.stadiums.map(s=>[s.id,s])),o=by[d.origin]!
 return Math.round(d.visits.filter(v=>v.physicallyAbroad).reduce((n,v)=>{const s=by[v.venueId]!;return n+haversineKm({latitude:o.lat,longitude:o.lng},{latitude:s.lat,longitude:s.lng})},0)/100)*100
}
export const visitKey=(v:Pick<ClubVisit,'id'>)=>`visit:${v.id}`
/** Ties grouped by season then competition, newest first. */
export function bySeason(visits:readonly ClubVisit[]):{season:string;visits:ClubVisit[]}[]{
 const m=new Map<string,ClubVisit[]>()
 for(const v of visits){const k=v.season??v.playedOn.slice(0,4);m.set(k,[...(m.get(k)??[]),v])}
 return [...m.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([season,vs])=>({season,visits:vs.sort((a,b)=>a.playedOn.localeCompare(b.playedOn))}))
}
