import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {door} from '@/lib/features-server'
import {CATALOG,ERAS,KITS,PRESSED,openWings,readMe,signedIn,syncOpenWings} from '@/lib/album/server'
import {AlbumClient} from '@/components/album/AlbumClient'
import {Shell} from '@/components/master/Shell'
import './album.css'
import './ritual.css'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'The Album · FAN LIFE',description:'A sticker album for every club: an envelope every day, two stickers inside, a wing for your club from its first season to today.',robots:{index:false}}

export default async function AlbumPage(){
 const d=await door('album');if(!d.open)notFound()
 const [wings,inside]=await Promise.all([openWings(d.preview),signedIn(),syncOpenWings()])
 const ids=new Set(wings.map(w=>w.id))
 const me=inside?await readMe():null
 return <Shell locale="en"><AlbumClient wings={wings} catalog={CATALOG.filter(r=>ids.has(r[1]))} eras={ERAS} kits={KITS} pressed={PRESSED} me={me?.ok?me.data:null} signedIn={inside} profiles={d.features.profiles} error={me&&!me.ok?me.error:null}/></Shell>
}
