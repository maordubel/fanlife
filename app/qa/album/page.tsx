import {notFound} from 'next/navigation'
import {qaAllowed} from '@/lib/qa'
import {CATALOG,ERAS,KITS,PRESSED} from '@/lib/album/server'
import albumClubs from '@/content/generated/album-clubs.json'
import {crestFor} from '@/lib/clubs/crest'
import type {WingInfo} from '@/lib/album/view'
import {AlbumHarness} from './Harness'
import {Shell} from '@/components/master/Shell'
import '../../album/album.css'
import '../../album/ritual.css'

/**
 * THE ALBUM drawn from fixtures (this environment has no live database): `?view=` is `out` (signed out), `new`
 * (first visit), `book` (a collector mid-album) or `envelope` (the tear ritual open). Every intent is answered in
 * memory by the same rules the database applies. `notFound()` on the live site, like every harness under `app/qa/`.
 */
export default function AlbumQaPage({searchParams}:{searchParams:{view?:string}}){
 if(!qaAllowed())notFound()
 const C=albumClubs as unknown as Record<string,{name:string;primary:string;on:string;initials:string;code:string}>
 const wings:WingInfo[]=Object.entries(C).map(([id,c])=>({id,name:c.name,primary:c.primary,on:c.on,initials:c.initials,code:c.code,crest:crestFor(id)})).sort((a,b)=>a.name.localeCompare(b.name))
 return <Shell locale="en"><AlbumHarness view={searchParams.view??'book'} wings={wings} catalog={CATALOG} eras={ERAS} kits={KITS} pressed={PRESSED}/></Shell>
}
