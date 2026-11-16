import 'server-only'
import {SITE_URL} from '@/lib/brand'
import copy from '@/messages/en.pay.json'
import type {PayKind} from './catalog'

/**
 * THE ORDER EMAIL (owner, 16.11.2026: "a designed, branded email with the file, from fanlife@dubelteam.com — one template for
 * every product of this kind"). One template for every product FAN LIFE delivers itself: the kind only changes the subject,
 * the headline, the button and one note line (messages/en.pay.json → mail.kinds). Sent through Resend (free tier, 3,000 a
 * month) from the verified dubelteam.com domain; off until RESEND_API_KEY is set — the order page still hands over the file.
 * Email HTML is tables and inline styles on purpose: mail programs ignore stylesheets and modern layout.
 */
export const mailOpen=()=>!!process.env.RESEND_API_KEY
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const INK='#15130F',PAPER='#F4ECD8',CARD='#FFFBF2',RED='#D71920',MUTED='#5D5545'

export function orderMail(o:{kind:PayKind;id:string;price:string;link:string;who?:string|null;preview?:string|null;name:string}){
 const k=copy.mail.kinds[o.kind],who=o.who?`, ${o.who}`:''
 const title=esc(k.title).replace(/\n/g,'<br>'),pre=copy.mail.preheader.replace('{name}',o.name.toLowerCase())
 const logo=`${SITE_URL}/brand/fanlife/logo-192.png`,dubel=`${SITE_URL}/brand/dubel-emblem.png`
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(k.subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};"><tr><td align="center" style="padding:24px 12px;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD};border:3px solid ${INK};box-shadow:6px 6px 0 ${INK};">
  <tr><td style="background:${RED};padding:18px 24px;border-bottom:3px solid ${INK};">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="64"><img src="${logo}" width="56" height="56" alt="FAN LIFE" style="display:block;border:0;"></td>
    <td style="font:900 13px/1.2 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${CARD};">${esc(copy.mail.kicker)}</td></tr></table></td></tr>
  <tr><td style="padding:28px 24px 8px;font:900 40px/1 Georgia,'Times New Roman',serif;color:${INK};letter-spacing:-.02em;">${title}</td></tr>
  <tr><td style="padding:8px 24px 0;font:700 17px/1.5 Georgia,'Times New Roman',serif;color:${INK};">${esc(copy.mail.hello.replace('{who}',who))}</td></tr>
  <tr><td style="padding:6px 24px 18px;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${INK};">${esc(copy.mail.line)}</td></tr>
  ${o.preview?`<tr><td align="center" style="padding:0 24px 18px;"><img src="${esc(o.preview)}" width="300" alt="${esc(o.name)}" style="display:block;width:300px;max-width:100%;height:auto;border:3px solid ${INK};"></td></tr>`:''}
  <tr><td align="center" style="padding:4px 24px 10px;">
   <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${RED};border:3px solid ${INK};box-shadow:4px 4px 0 ${INK};">
    <a href="${esc(o.link)}" style="display:inline-block;padding:16px 28px;font:900 17px/1 Arial,Helvetica,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:${CARD};text-decoration:none;">${esc(k.button)} &rarr;</a></td></tr></table></td></tr>
  <tr><td align="center" style="padding:6px 24px 22px;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">${esc(k.note)}</td></tr>
  <tr><td style="padding:16px 24px;border-top:2px dashed ${INK};font:700 13px/1.6 'Courier New',Courier,monospace;color:${INK};letter-spacing:.04em;text-transform:uppercase;">${esc(copy.mail.order.replace('{id}',o.id).replace('{price}',o.price))}</td></tr>
  <tr><td style="padding:0 24px 20px;font:400 14px/1.55 Arial,Helvetica,sans-serif;color:${INK};">${esc(copy.mail.help)}</td></tr>
 </table>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td style="padding:16px 8px;font:400 12px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">${esc(copy.mail.small)}</td>
  <td align="right" style="padding:16px 8px;white-space:nowrap;"><a href="https://www.dubelteam.com" style="font:700 12px/1 Arial,Helvetica,sans-serif;color:${INK};text-decoration:none;"><img src="${dubel}" width="18" height="18" alt="" style="vertical-align:middle;border:0;"> ${esc(copy.mail.credit)}</a></td></tr></table>
</td></tr></table></body></html>`
 const text=[k.title.replace(/\n/g,' '),'',copy.mail.hello.replace('{who}',who),copy.mail.line,'',`${k.button}: ${o.link}`,k.note,'',copy.mail.order.replace('{id}',o.id).replace('{price}',o.price),copy.mail.help,'',copy.mail.credit].join('\n')
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
