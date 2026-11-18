'use client'
import {AlbumApp,type AlbumProps} from './AlbumApp'
import {signInWithGoogle} from '@/lib/portal/sync'
import {redeemCode,claimDaily,markOpened,refresh,setWing,startAlbum,stick,swapAccept,swapCancel,swapOffer,swaps,tradeIn,usePick} from '@/app/album/actions'

/** binds the live server actions to THE ALBUM (the QA harness binds fixtures instead) */
export function AlbumClient(props:Omit<AlbumProps,'actions'>){
 return <AlbumApp {...props} actions={{start:startAlbum,wing:setWing,daily:claimDaily,opened:markOpened,stick,pick:usePick,trade:tradeIn,refresh,swaps,swapOffer,swapCancel,swapAccept,redeem:redeemCode,signIn:()=>void signInWithGoogle('/album')}}/>
}
