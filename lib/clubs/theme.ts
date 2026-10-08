import type {CSSProperties} from 'react'
import hapoel from '@/club-packs/hapoel-tel-aviv/identity.json'
import zrinjski from '@/club-packs/zrinjski-mostar/identity.json'
import petahTikva from '@/club-packs/hapoel-petah-tikva/identity.json'
import olympiacos from '@/club-packs/olympiacos/identity.json'
import panathinaikos from '@/club-packs/panathinaikos/identity.json'
import type {UiLocale} from './locale'

export type ColorRule={id:string;label:string;hue:[number,number];minSaturation:number;minValue:number}
export type HistoricalExemption={assetPath:string;source:string;rightsStatus:'owned'|'licensed'|'permission_granted'|'public_domain';approvedBy:string;approvedAt:string;reason:string;historicalContext:string}
export type FontId='archivo'|'heebo'|'frank'|'miriam'|'courier'|'karantina'
export type ColorPolicy={status:'pending'|'approved'|'legacy';rivalIdentityColors:string[];approvedBy:string|null;approvedAt:string|null;legacyRules:ColorRule[]}
export type ClubTheme={
 schemaVersion:1;primary:string;secondary:string;background:string;surface:string;text:string;muted:string;accent:string;onPrimary:string
 fonts:{display:FontId;body:FontId;mono:FontId;poster:FontId};pattern:'rules'|'diagonal'|'stripes'|'plain'
 identityColors:string[];rivalForbiddenColors:string[];colorPolicy:ColorPolicy;historicalExemptions:HistoricalExemption[]
}
const HEX=/^#[\da-f]{6}$/i
const calendarDate=(s:string|null)=>Boolean(s&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s)
const FONT:Record<FontId,string>={archivo:'Archivo',heebo:'Heebo',frank:'Frank Ruhl Libre',miriam:'Miriam Libre',courier:'Courier Prime',karantina:'Karantina'}
const catalogue:Record<string,unknown>={'hapoel-tel-aviv':hapoel,'zrinjski-mostar':zrinjski,olympiacos,panathinaikos,'hapoel-petah-tikva':petahTikva}
const neutral={background:'#F0F1ED',surface:'#FFFFFF',text:'#243027',muted:'#536050',accent:'#3E4B3E',secondary:'#FFFFFF',fonts:{display:'archivo',body:'heebo',mono:'courier',poster:'karantina'},pattern:'plain',colorPolicy:{status:'pending',rivalIdentityColors:[],approvedBy:null,approvedAt:null,legacyRules:[]},historicalExemptions:[]}
export function rgb(hex:string):[number,number,number] {
 if(!HEX.test(hex))throw new Error('INVALID_THEME_COLOR')
 return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as [number,number,number]
}
function hsv(hex:string){const [r,g,b]=rgb(hex),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;return {h:d===0?0:max===r?60*((g-b)/d+6)%360:max===g?60*((b-r)/d+2):60*((r-g)/d+4),s:max===0?0:d/max,v:max/255}}
function sameColorFamily(a:string,b:string){const x=hsv(a),y=hsv(b);if(x.s<0.2||y.s<0.2)return x.s<0.2&&y.s<0.2&&Math.abs(x.v-y.v)<0.2;const d=Math.abs(x.h-y.h);return Math.min(d,360-d)<=18}
/** Only owner-approved rivalry metadata can create a new restriction. */
export function rivalForbiddenColors(identity:string[],policy:ColorPolicy):string[]{
 if(policy.status!=='approved'||!policy.approvedBy||policy.approvedBy.startsWith('automated:')||!calendarDate(policy.approvedAt))return []
 return policy.rivalIdentityColors.filter(c=>!identity.some(own=>sameColorFamily(own,c)))
}
export function forbiddenColor(theme:ClubTheme,color:string):boolean {
 const c=hsv(color)
 return theme.rivalForbiddenColors.some(r=>sameColorFamily(r,color))||theme.colorPolicy.legacyRules.some(r=>c.s>=r.minSaturation&&c.v>=r.minValue&&(r.hue[0]<=r.hue[1]?c.h>=r.hue[0]&&c.h<=r.hue[1]:c.h>=r.hue[0]||c.h<=r.hue[1]))
}
/** Colour families an owner-approved rivalry takes away from a club's pages (red for Panathinaikos, green for Olympiacos). */
export function rivalBans(theme:ClubTheme):string[]{
 const bans=new Set<string>()
 for(const c of theme.rivalForbiddenColors){const x=hsv(c);if(x.s<0.2)continue;if(x.h<=18||x.h>=342)bans.add('red');else if(x.h>=90&&x.h<=170)bans.add('green');else if(x.h>=190&&x.h<=260)bans.add('blue')}
 return [...bans]
}
function luminance(hex:string){return rgb(hex).map(n=>n/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[0.2126,0.7152,0.0722][i]!,0)}
/** Club colour as TYPE on the magazine's paper: the colour itself when it reads (3:1, large type), the ink when it does not (a yellow). */
export function typeOnPaper(primary:string){return HEX.test(primary)&&contrast(primary,'#EFE6D4')>=3?primary:'#141210'}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
export function validateTheme(theme:ClubTheme):string[]{
 const issues:string[]=[]
 if(theme.schemaVersion!==1)issues.push('Invalid theme schema')
 if(!['pending','approved','legacy'].includes(theme.colorPolicy.status))issues.push('Invalid policy status')
 for(const rule of theme.colorPolicy.legacyRules)if(rule.hue.length!==2||rule.hue.some(h=>!Number.isFinite(h)||h<0||h>360)||![rule.minSaturation,rule.minValue].every(n=>Number.isFinite(n)&&n>=0&&n<=1))issues.push('Invalid color rule')
 if([...theme.identityColors,...theme.colorPolicy.rivalIdentityColors,...theme.rivalForbiddenColors].some(c=>!HEX.test(c)))return ['Invalid identity or rivalry color']
 for(const key of ['primary','secondary','background','surface','text','muted','accent','onPrimary'] as const){if(!HEX.test(theme[key]))issues.push(`Invalid ${key}`);else if(forbiddenColor(theme,theme[key]))issues.push(`Forbidden ${key}`)}
 if(issues.some(i=>i.startsWith('Invalid')))return issues
 for(const [a,b] of [['text','background'],['text','surface'],['muted','background'],['muted','surface'],['accent','background'],['primary','onPrimary']] as const)if(contrast(theme[a],theme[b])<4.5)issues.push(`Low contrast ${a}/${b}`)
 if(!Object.values(theme.fonts).every(f=>Object.hasOwn(FONT,f)))issues.push('Invalid font')
 if(!['rules','diagonal','stripes','plain'].includes(theme.pattern))issues.push('Invalid pattern')
 if(theme.colorPolicy.status==='approved'&&(!theme.colorPolicy.approvedBy||theme.colorPolicy.approvedBy.startsWith('automated:')||!calendarDate(theme.colorPolicy.approvedAt)))issues.push('Incomplete owner rivalry approval')
 for(const e of theme.historicalExemptions)if(!historicalColorAllowed(theme,e.assetPath))issues.push(`Invalid historical exemption ${e.assetPath}`)
 return issues
}
/** Small identity manifests are independent of historical gameplay content. */
/** Does this club carry an approved identity manifest (club-packs/<id>/identity.json)? */
export const hasIdentityManifest=(id:string)=>Object.hasOwn(catalogue,id)
export function clubTheme(club:{id:string;primary:string}):ClubTheme {
 const hasManifest=Object.hasOwn(catalogue,club.id)
 const manifest=(hasManifest?catalogue[club.id]:neutral) as typeof hapoel
 const primary=HEX.test(club.primary)?club.primary:neutral.accent
 const identityColors=[primary,manifest.secondary]
 if(hasManifest&&(manifest.schemaVersion!==1||manifest.clubId!==club.id))throw new Error('INVALID_IDENTITY_MANIFEST')
 const policy:ColorPolicy={...manifest.colorPolicy,status:manifest.colorPolicy.status as ColorPolicy['status'],legacyRules:manifest.colorPolicy.legacyRules.map(rule=>({...rule,hue:[rule.hue[0]!,rule.hue[1]!]}))}
 const theme:ClubTheme={schemaVersion:1,primary,secondary:manifest.secondary,background:manifest.background,surface:manifest.surface,text:manifest.text,muted:manifest.muted,accent:manifest.accent,onPrimary:contrast(primary,'#FFFFFF')>=4.5?'#FFFFFF':'#151515',fonts:manifest.fonts as ClubTheme['fonts'],pattern:manifest.pattern as ClubTheme['pattern'],identityColors,rivalForbiddenColors:rivalForbiddenColors(identityColors,policy),colorPolicy:policy,historicalExemptions:manifest.historicalExemptions}
 const issues=validateTheme(theme)
 if(issues.length)throw new Error(`INVALID_CLUB_THEME: ${issues.join(', ')}`)
 return theme
}
export function historicalColorAllowed(theme:ClubTheme,path:string):boolean {
 return theme.historicalExemptions.some(e=>e.assetPath===path&&!e.assetPath.endsWith('/')&&!e.assetPath.includes('*')&&/^https:\/\//.test(e.source)&&Boolean(e.approvedBy&&!e.approvedBy.startsWith('automated:')&&e.reason&&e.historicalContext)&&calendarDate(e.approvedAt)&&['owned','licensed','permission_granted','public_domain'].includes(e.rightsStatus))
}
/** Tokens are scoped on the rendered club surface; native gates keep their own scope. */
export function themeStyle(theme:ClubTheme,locale:UiLocale='en'):CSSProperties {
 const r=(s:string)=>rgb(s).join(' ')
 return {'--club-primary':theme.primary,'--club-secondary':theme.secondary,'--club-background':theme.background,'--club-surface':theme.surface,'--club-text':theme.text,'--club-muted':theme.muted,'--club-accent':theme.accent,'--club-on-primary':theme.onPrimary,'--club-type':typeOnPaper(theme.primary),...(theme.onPrimary==='#FFFFFF'?{}:{'--dye-shade':'0.45','--club-torn':'#141210'}),'--club':theme.primary,'--sheet':r(theme.surface),'--paper':r(theme.background),'--ink':r(theme.text),'--red':r(theme.primary),'--sign':r(theme.accent),'--muted':r(theme.muted),'--concrete':r(theme.background),'--font-frank':`'${locale==='he'?'Frank Ruhl Libre':FONT[theme.fonts.display]}'`,'--font-heebo':`'${FONT[theme.fonts.body]}'`,'--font-miriam':`'${FONT[theme.fonts.display]}'`,'--font-latin':`'${FONT[theme.fonts.display]}'`,'--font-courier':`'${FONT[theme.fonts.mono]}'`,'--font-poster':`'${FONT[theme.fonts.poster]}'`} as CSSProperties
}
