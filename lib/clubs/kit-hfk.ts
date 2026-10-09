import 'server-only'
import celtic from '@/content/manual/kit-hfk-celtic.json'

/** Historical drawings (Historical Football Kits, © David Moor; non-commercial use with acknowledgement, owner's statement 10.10.2026). */
export type HfkKit={id:string;type:string;period:string;from:number|null;to:number|null;maker:string|null;refs:string|null;image:string;page:string}
export type HfkSet={source:{publisher:string;url:string;homePage:string;changePage:string};count:number;kits:HfkKit[]}
const SETS:Record<string,HfkSet>={celtic:celtic as unknown as HfkSet}
export const hfkFor=(club:string):HfkSet|null=>SETS[club]??null
