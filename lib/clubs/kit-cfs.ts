import 'server-only'
import aek from '@/content/manual/kit-cfs-aek-athens.json'
import celtic from '@/content/manual/kit-cfs-celtic.json'
import hta from '@/content/manual/kit-cfs-hapoel-tel-aviv.json'
import olympiacos from '@/content/manual/kit-cfs-olympiacos.json'
import pao from '@/content/manual/kit-cfs-panathinaikos.json'
import stPauli from '@/content/manual/kit-cfs-st-pauli.json'
import zrinjski from '@/content/manual/kit-cfs-zrinjski-mostar.json'
import {variantOf} from '@/lib/clubs/kit-model'

/** Shirt photographs from Club Football Shirts' archive pages (owner's approval, chat 2026-10-10). Type and season are what the file name states. */
export type CfsKit={id:string;type:string;season:string;image:string;width:number;height:number;page:string}
export type CfsSet={source:{publisher:string;url:string;archivePage:string};count:number;kits:CfsKit[]}
const SETS:Record<string,CfsSet>={'aek-athens':aek,celtic,'hapoel-tel-aviv':hta,olympiacos,panathinaikos:pao,'st-pauli':stPauli,'zrinjski-mostar':zrinjski} as unknown as Record<string,CfsSet>
export const cfsFor=(club:string):CfsSet|null=>SETS[club]??null
/** the photograph of a season's shirt of one type, when the publisher's archive shows it */
export const cfsPhoto=(club:string,season:string,type:string):string|null=>SETS[club]?.kits.find(k=>k.season===season&&variantOf(k.type)===variantOf(type))?.image??null
