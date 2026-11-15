import {ClubXI} from '@/components/clubs/gates/xi/ClubXI'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import type {GateView} from '../types'
export const view:GateView=({club,locale,copy})=><ClubXI players={(club.players||[]).map(f=>f.value)} club={club.identity.id} clubName={club.identity.name} locale={locale} contentLocale={club.locales.content} copy={copy} wardrobe={clubWardrobe(club)}/>
