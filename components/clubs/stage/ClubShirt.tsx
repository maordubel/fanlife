'use client'
import {RumbleShirt} from '@/components/clubs/rumble/shared'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {ClubPlayer} from '@/lib/clubs/contract'

/**
 * A man's shirt in ANY club game (the club port of the Worker's `PlayerShirt`): the club's documented kit nearest his
 * years — home for "us", away/third for the other side — or the club livery. Never an empty box, never a rival's colour
 * (lib/clubs/rumble-kit). Gates 1, 3 and 9 share this one component so a man looks the same everywhere.
 */
export function ClubShirt({player,wardrobe,side='us',className}:{player:Pick<ClubPlayer,'id'|'fromYear'|'toYear'>;wardrobe:RumbleWardrobe;side?:'us'|'them';className?:string}){
 return <RumbleShirt card={player} side={side} wardrobe={wardrobe} className={className}/>
}
