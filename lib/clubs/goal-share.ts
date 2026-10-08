import type {ShareDraft} from '@/lib/share/v3/adapters'
import {templateById} from '@/lib/share/v3/templates'
import {clubOrigin,shareClub} from '@/lib/share/v3/theme'

/**
 * The Share Studio card for gate 8 (template 09). It carries a quality percentage and the three headings only — never a
 * touch, a name or a zone of the archive's goal. The link opens the same goal (`?g=`) with nothing of the answer in it.
 * Lives beside the gate (not in the shared adapters) and returns the shared `ShareDraft` shape, so `validateDraft` is the
 * final guard exactly as for every other gate.
 */
export function goalShare(clubId:string,x:{percent:number;goalId:string|null;zonePractice:boolean;forbidden:string[]}):ShareDraft{
 const t=templateById('09-goal-freeze')!,c=shareClub(clubId)
 if(!c)throw new Error('Unknown club')
 const u=new URL(`/clubs/${clubId}/goal`,clubOrigin(c));if(x.goalId)u.searchParams.set('g',x.goalId);u.searchParams.set('lang','en')
 return {template:t,surface:'goal' as ShareDraft['surface'],purpose:'prompt',forbidden:x.forbidden,resultOrigin:'server-verified',
  data:{club:clubId,headline:t.headline,context:x.zonePractice?'Goal Reconstruction · zone practice':t.context,main:`${x.percent}%`,label:'RECONSTRUCTION QUALITY',detail:'The player. The action. The zone.',cta:t.cta,rows:['WHO','WHAT','WHERE'],statement:`I rebuilt ${x.percent}% of it.`,alias:'',showAlias:false,inkMode:'club',photoMode:'monochrome',sample:false,link:u.href}}
}
