'use client'
import {AlbumApp,type AlbumProps} from './AlbumApp'
import {signInWithGoogle} from '@/lib/portal/sync'
import {claimDaily,markOpened,refresh,setWing,startAlbum,stick,tradeIn,usePick} from '@/app/album/actions'

/** binds the live server actions to THE ALBUM (the QA harness binds fixtures instead) */
export function AlbumClient(props:Omit<AlbumProps,'actions'>){
 return <AlbumApp {...props} actions={{start:startAlbum,wing:setWing,daily:claimDaily,opened:markOpened,stick,pick:usePick,trade:tradeIn,refresh,signIn:()=>void signInWithGoogle('/album')}}/>
}
