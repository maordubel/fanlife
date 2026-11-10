import {readState} from '@/lib/master/store'
import {allSummaries} from '@/lib/master/summary'
import {researchDesk} from '@/lib/research/desk'
import {ResearchDeskView} from './ResearchDeskView'

/**
 * Control room → Research (10.11.2026). The owner asked why two months of daily research opened no club. The answer:
 * the material was collected every day and waited for a decision nobody was asked for. This screen asks — one club, one
 * question, one button — and shows what each yes opens before it is pressed. Server side builds the desk; the view is
 * the client part with the buttons.
 */
export async function ResearchDesk(){
 const state=await readState()
 const desk=await researchDesk(state,await allSummaries(state))
 return <ResearchDeskView desk={desk}/>
}
