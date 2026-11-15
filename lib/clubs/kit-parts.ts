import eraCrests from '@/content/manual/kit-crests-hapoel-tel-aviv.json'
import {crestFor} from './crest'
import type {KitView} from './gate-content'
import {makerMark,sponsorMark} from './marks'

/** The independent, sourced parts of a kit; the complete drawing is optional. */
export type KitParts=Pick<KitView,'maker'|'design'|'colours'|'shorts'|'socks'>&{
 sponsor:string|null
 crest:{src:string;kind:'historical'|'club'}|null
}

export function kitMark(parts:Pick<KitParts,'maker'|'sponsor'>,slot:'maker'|'sponsor'){
 const label=parts[slot]
 return label?{label,art:slot==='maker'?makerMark(label):sponsorMark(label)}:null
}

const historical=eraCrests as Record<string,string|null>

export function kitPartsFor(club:string,kit:KitView):KitParts{
 const era=club==='hapoel-tel-aviv'?historical[kit.season+'|'+kit.type.toLowerCase()]:null
 const badge=crestFor(club)
 return {maker:kit.maker,sponsor:kit.sponsor??null,design:kit.design,colours:kit.colours,shorts:kit.shorts,socks:kit.socks,
  crest:era?{src:era,kind:'historical'}:badge?{src:badge,kind:'club'}:null}
}
