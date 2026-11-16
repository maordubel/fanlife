import 'server-only'
import {SITE_URL} from '@/lib/brand'
import {CHANNEL} from '@/lib/stories/channel'
import copy from '@/messages/en.pay.json'
import type {PayKind} from './catalog'

/**
 * THE ORDER EMAIL (owner, 16.11.2026: "a designed, branded email with the file, from fanlife@dubelteam.com — one template for
 * every product of this kind"; then "high level, beautiful, our branding, the right links and the right marketing, impressive
 * and formal"). One template for every product FAN LIFE delivers itself: the kind only changes the subject, the headline, the
 * button, the note and the three tips (messages/en.pay.json → mail.kinds). Dressed as The Weekly: a red masthead, an ink
 * dateline, the piece framed like a plate, a ticket-stub receipt, then three doors back into FAN LIFE.
 * Sent through Resend (free tier, 3,000 a month) from the verified dubelteam.com domain; off until RESEND_API_KEY is set — the
 * order page still hands over the file. Email HTML is tables and inline styles on purpose: mail programs ignore stylesheets and
 * modern layout; the one <style> block only tightens sizes on a phone and is safe to lose.
 */
export const mailOpen=()=>!!process.env.RESEND_API_KEY
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const INK='#15130F',PAPER='#F4ECD8',CARD='#FFFBF2',RED='#D71920',DEEP='#A20F18',CYAN='#1B9AD6',NAVY='#233C8F',MUTED='#5D5545'
const SERIF="Georgia,'Times New Roman',serif",SANS='Arial,Helvetica,sans-serif',MONO="'Courier New',Courier,monospace"
/** every door in the email is counted as coming from it */
const tag=(href:string,what:string)=>href.startsWith(SITE_URL)?`${href}${href.includes('?')?'&':'?'}utm_source=order-mail&utm_medium=email&utm_campaign=${what}`:href

type Mail={kind:PayKind;id:string;price:string;link:string;who?:string|null;preview?:string|null;name:string;to?:string|null;at?:Date}
export function orderMail(o:Mail){
 const k=copy.mail.kinds[o.kind],m=copy.mail,first=o.who?.trim().split(/\s+/)[0]
 const date=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Athens'}).format(o.at??new Date())
 const fill=(s:string)=>s.replace('{who}',first?`, ${first}`:'').replace('{name}',o.name.toLowerCase()).replace('{id}',o.id).replace('{price}',o.price).replace('{date}',date)
 const logo=`${SITE_URL}/brand/fanlife/logo-192.png`,dubel=`${SITE_URL}/brand/dubel-emblem.png`
 const doorTo=[[tag(`${SITE_URL}/shop/make`,'make-another'),RED],[tag(`${SITE_URL}/shop`,'shop'),NAVY],[CHANNEL.url,CYAN]] as const
 const doors=m.doors.map((d,i)=>({...d,href:doorTo[i]?.[0]??SITE_URL,ink:doorTo[i]?.[1]??RED}))
 const rows:[string,string][]=[[m.receipt.item,o.name],[m.receipt.order,o.id],[m.receipt.date,date],[m.receipt.paid,o.price],...(o.to?[[m.receipt.to,o.to] as [string,string]]:[])]
 const foot:[string,string][]=[[m.foot.home,tag(SITE_URL,'footer')],[m.foot.shop,tag(`${SITE_URL}/shop`,'footer')],[m.foot.privacy,`${SITE_URL}/privacy`],[m.foot.terms,`${SITE_URL}/terms`]]
 const html=`<!doctype html><html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${esc(k.subject)}</title>
<style>@media (max-width:600px){.fl-pad{padding-left:18px!important;padding-right:18px!important}.fl-h1{font-size:34px!important}.fl-mast{font-size:30px!important}.fl-plate{width:100%!important}.fl-btn{padding:16px 20px!important;font-size:15px!important}}a{color:${INK}}</style></head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(fill(m.preheader))}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};"><tr><td align="center" style="padding:20px 10px 28px;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
  <tr><td align="right" style="padding:0 4px 10px;font:400 12px/1.4 ${SANS};color:${MUTED};"><a href="${esc(o.link)}" style="color:${MUTED};text-decoration:underline;">${esc(m.online)}</a></td></tr></table>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:${CARD};border:3px solid ${INK};box-shadow:6px 6px 0 ${INK};">
  <!-- masthead -->
  <tr><td style="background:${RED};border-bottom:3px solid ${INK};padding:20px 24px;" class="fl-pad">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="72" valign="middle"><img src="${logo}" width="60" height="60" alt="FAN LIFE" style="display:block;border:0;"></td>
    <td valign="middle"><div class="fl-mast" style="font:900 36px/1 ${SERIF};color:${CARD};letter-spacing:-.01em;text-shadow:2px 2px 0 ${DEEP};">FAN LIFE</div>
     <div style="padding-top:6px;font:700 11px/1.2 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:${CARD};">${esc(m.kicker)}</div></td></tr></table></td></tr>
  <tr><td style="background:${INK};padding:9px 24px;font:700 11px/1.3 ${MONO};letter-spacing:.12em;text-transform:uppercase;color:${CARD};" class="fl-pad">${esc(fill(m.dateline))}</td></tr>
  <!-- headline -->
  <tr><td style="padding:30px 24px 0;" class="fl-pad">
   <div style="display:inline-block;background:${CYAN};border:2px solid ${INK};padding:5px 10px;font:900 11px/1 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${CARD};">${esc(m.stamp)}</div></td></tr>
  <tr><td class="fl-h1 fl-pad" style="padding:14px 24px 6px;font:900 44px/1.02 ${SERIF};color:${INK};letter-spacing:-.02em;">${esc(k.title).replace(/\n/g,'<br>')}</td></tr>
  <tr><td style="padding:10px 24px 0;font:700 18px/1.5 ${SERIF};color:${INK};" class="fl-pad">${esc(fill(m.hello))}</td></tr>
  <tr><td style="padding:6px 24px 22px;font:400 16px/1.6 ${SANS};color:${INK};" class="fl-pad">${esc(fill(k.line))}</td></tr>
  ${o.preview?`<!-- the piece -->
  <tr><td align="center" style="padding:0 24px 8px;" class="fl-pad">
   <table role="presentation" cellpadding="0" cellspacing="0" class="fl-plate" style="width:320px;"><tr><td style="background:${PAPER};border:3px solid ${INK};box-shadow:5px 5px 0 ${INK};padding:12px;">
    <a href="${esc(o.link)}"><img src="${esc(o.preview)}" width="290" alt="${esc(o.name)}" style="display:block;width:100%;max-width:290px;height:auto;border:2px solid ${INK};"></a></td></tr></table></td></tr>
  <tr><td align="center" style="padding:10px 24px 18px;font:italic 400 13px/1.4 ${SERIF};color:${MUTED};" class="fl-pad">${esc(fill(m.caption))}</td></tr>`:''}
  <!-- the button -->
  <tr><td align="center" style="padding:6px 24px 8px;" class="fl-pad">
   <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${RED};border:3px solid ${INK};box-shadow:4px 4px 0 ${INK};">
    <a href="${esc(o.link)}" class="fl-btn" style="display:inline-block;padding:18px 34px;white-space:nowrap;font:900 17px/1 ${SANS};letter-spacing:.06em;text-transform:uppercase;color:${CARD};text-decoration:none;">${esc(k.button)} &rarr;</a></td></tr></table></td></tr>
  <tr><td align="center" style="padding:10px 24px 6px;font:400 13px/1.5 ${SANS};color:${MUTED};" class="fl-pad">${esc(k.note)}</td></tr>
  <tr><td align="center" style="padding:0 24px 26px;font:400 13px/1.5 ${SANS};color:${MUTED};" class="fl-pad">${esc(m.keep)}</td></tr>
  <!-- receipt: a ticket stub -->
  <tr><td style="padding:0 24px 26px;" class="fl-pad">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${INK};background:${PAPER};">
    <tr><td colspan="2" style="padding:10px 14px;border-bottom:2px dashed ${INK};font:900 12px/1 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${INK};">&#9986;&nbsp; ${esc(m.receipt.title)}</td></tr>
    ${rows.map(([a,b])=>`<tr><td style="padding:8px 14px;font:700 11px/1.4 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${MUTED};white-space:nowrap;" valign="top">${esc(a)}</td><td align="right" style="padding:8px 14px;font:700 14px/1.4 ${MONO};color:${INK};word-break:break-all;">${esc(b)}</td></tr>`).join('')}
    <tr><td colspan="2" style="padding:8px 14px 12px;font:400 12px/1.5 ${SANS};color:${MUTED};">${esc(m.receipt.small)}</td></tr></table></td></tr>
  <!-- tips -->
  <tr><td style="padding:0 24px 8px;font:900 13px/1 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${RED};" class="fl-pad">${esc(k.tipsTitle)}</td></tr>
  <tr><td style="padding:6px 24px 26px;" class="fl-pad">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${k.tips.map((t,i)=>`<tr><td width="40" valign="top" style="padding:6px 0;"><div style="width:28px;height:28px;border-radius:14px;background:${INK};color:${CARD};font:900 14px/28px ${SERIF};text-align:center;">${i+1}</div></td><td style="padding:8px 0;font:400 15px/1.5 ${SANS};color:${INK};">${esc(t)}</td></tr>`).join('')}</table></td></tr>
  <!-- more from FAN LIFE -->
  <tr><td style="background:${PAPER};border-top:3px solid ${INK};padding:24px 24px 6px;" class="fl-pad">
   <div style="font:900 26px/1.1 ${SERIF};color:${INK};">${esc(m.moreTitle)}</div>
   <div style="padding-top:6px;font:400 14px/1.5 ${SANS};color:${MUTED};">${esc(m.moreLine)}</div></td></tr>
  <tr><td style="background:${PAPER};padding:12px 24px 24px;" class="fl-pad">
   ${doors.map(d=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;background:${CARD};border:2px solid ${INK};box-shadow:3px 3px 0 ${INK};"><tr>
    <td width="10" style="background:${d.ink};border-right:2px solid ${INK};">&nbsp;</td>
    <td style="padding:14px 16px;"><a href="${esc(d.href)}" style="text-decoration:none;color:${INK};"><div style="font:900 17px/1.2 ${SERIF};color:${INK};">${esc(d.title)}</div>
     <div style="padding-top:4px;font:400 14px/1.45 ${SANS};color:${MUTED};">${esc(d.line)}</div>
     <div style="padding-top:8px;font:900 12px/1 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${d.ink};">${esc(d.cta)} &rarr;</div></a></td></tr></table>`).join('')}</td></tr>
  <!-- a person -->
  <tr><td style="border-top:2px dashed ${INK};padding:20px 24px 24px;font:400 14px/1.6 ${SANS};color:${INK};" class="fl-pad">
   <b style="font-family:${SERIF};font-size:16px;">${esc(m.helpTitle)}</b><br>${esc(m.help)} <a href="mailto:${m.replyTo}" style="color:${RED};font-weight:700;">${m.replyTo}</a></td></tr>
 </table>
 <!-- footer -->
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
  <tr><td align="center" style="padding:22px 8px 6px;font:700 12px/1.6 ${SANS};letter-spacing:.1em;text-transform:uppercase;">${foot.map(([a,h])=>`<a href="${esc(h)}" style="color:${INK};text-decoration:none;">${esc(a)}</a>`).join(`<span style="color:${MUTED};">&nbsp;&middot;&nbsp;</span>`)}</td></tr>
  <tr><td align="center" style="padding:6px 16px;font:400 12px/1.6 ${SANS};color:${MUTED};">${esc(m.small)}</td></tr>
  <tr><td align="center" style="padding:10px 8px 0;"><a href="https://www.dubelteam.com" style="font:700 12px/1 ${SANS};color:${INK};text-decoration:none;"><img src="${dubel}" width="18" height="18" alt="" style="vertical-align:middle;border:0;">&nbsp; ${esc(m.credit)}</a></td></tr></table>
</td></tr></table></body></html>`
 const text=[k.subject.toUpperCase(),fill(m.dateline),'',k.title.replace(/\n/g,' '),'',fill(m.hello),fill(k.line),'',`${k.button}: ${o.link}`,k.note,m.keep,'',
  `${m.receipt.title}`,...rows.map(([a,b])=>`${a}: ${b}`),'',k.tipsTitle,...k.tips.map((t,i)=>`${i+1}. ${t}`),'',m.moreTitle,...doors.map(d=>`${d.title}: ${d.href}`),'',
  `${m.helpTitle} ${m.help} ${m.replyTo}`,'',m.small,m.credit].join('\n')
 return {subject:k.subject,html,text}
}

/** sends one order email; answers the provider's id, or throws with its words */
export async function sendMail(to:string,m:{subject:string;html:string;text:string},idem:string):Promise<string>{
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':idem},
  body:JSON.stringify({from:process.env.MAIL_FROM||copy.mail.from,to:[to],reply_to:copy.mail.replyTo,subject:m.subject,html:m.html,text:m.text})})
 const j=await r.json().catch(()=>({})) as {id?:string;message?:string}
 if(!r.ok||!j.id)throw new Error(`Mail: ${j.message||r.status}`)
 return j.id
}
