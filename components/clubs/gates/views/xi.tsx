import {XIBuilder} from '@/components/clubs/games/XIBuilder'
import type {GateView} from '../types'
export const view:GateView=({club,locale})=><XIBuilder players={(club.players||[]).map(f=>f.value)} club={club.identity.id} locale={locale} contentLocale={club.locales.content}/>
