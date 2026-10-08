import {ClubXI} from '@/components/clubs/gates/xi/ClubXI'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
export const view:GateView=({club,locale,copy})=><ClubXI players={(club.players||[]).map(f=>f.value)} club={club.identity.id} clubName={club.identity.name} locale={locale} contentLocale={club.locales.content} copy={copy} wardrobe={rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))}/>
