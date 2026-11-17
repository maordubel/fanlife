import 'server-only'
import {BOOK_SITE,type BookLang} from './catalog'

/**
 * The book's three letters, dressed as the book (paper, ink, one red thread — the site's identity), not as FAN LIFE:
 * a thank-you for a tip, "your copy is at the printer", and "it is on its way" with the tracking link.
 * Sent through the same Resend sender as FAN LIFE's orders (lib/pay/mail.sendMail).
 */
type Kind='tip'|'printing'|'shipped'|'making'
const PAPER='#F2EADB',INK='#1D1A21',RED='#A8101F',SOFT='#46404D'
const C:Record<BookLang,Record<Kind,{subject:string;title:string;body:string}>&{sign:string;read:string;track:string}>={
 he:{tip:{subject:'תודה — קולקטיב שבור',title:'החשבון שולם.',body:'תודה. כל טיפ הוא עוד לילה של כתיבה. הספר נשאר חינם לכולם, תמיד — ואתם חלק מהסיבה.'},
  printing:{subject:'העותק שלך בדפוס — קולקטיב שבור',title:'העותק שלך בדפוס.',body:'ההזמנה התקבלה והספר עובר עכשיו להדפסה. כשהוא יוצא לדרך נשלח לך מספר מעקב.'},
  shipped:{subject:'ההזמנה בדרך אליך — קולקטיב שבור',title:'בדרך אליך.',body:'ההזמנה שלך יצאה לדרך.'},
  making:{subject:'ההזמנה שלך בהכנה — קולקטיב שבור',title:'בהכנה.',body:'ההזמנה התקבלה ונכנסה להדפסה. כשהיא יוצאת לדרך נשלח לך מספר מעקב.'},
  sign:'מאור · קולקטיב שבור',read:'להמשך הקריאה',track:'למעקב אחרי המשלוח'},
 en:{tip:{subject:'Thank you — Broken Collective',title:'The bill is paid.',body:'Thank you. Every tip is another night of writing. The book stays free for everyone, always — and you are part of the reason.'},
  printing:{subject:'Your copy is at the printer — Broken Collective',title:'Your copy is at the printer.',body:'Your order is in and the book is going to print now. When it leaves, we will send you the tracking number.'},
  shipped:{subject:'Your order is on its way — Broken Collective',title:'On its way.',body:'Your order has been made and posted.'},
  making:{subject:'Your order is being made — Broken Collective',title:'Being made.',body:'Your order is in and going to print. When it leaves, we will send you the tracking number.'},
  sign:'Maor · Broken Collective',read:'Keep reading',track:'Track the parcel'},
}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function bookMail(kind:Kind,lang:BookLang,o:{order:string;track?:string|null}){
 const c=C[lang],k=c[kind],dir=lang==='he'?'rtl':'ltr',read=`${BOOK_SITE}/${lang}/`
 const btn=(href:string,label:string,fill:string)=>`<a href="${esc(href)}" style="display:inline-block;background:${fill};color:${PAPER};text-decoration:none;font:700 15px/1 Georgia,serif;padding:14px 22px;margin:6px 4px">${esc(label)}</a>`
 const html=`<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(k.subject)}</title></head>
<body style="margin:0;background:${PAPER};color:${INK}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FBF6EC;border-top:4px solid ${RED};border-bottom:1px solid ${INK}" dir="${dir}"><tr><td style="padding:30px 28px;text-align:${lang==='he'?'right':'left'}">
<div style="font:400 12px/1 Georgia,serif;letter-spacing:.3em;color:${SOFT}">${lang==='he'?'קולקטיב שבור':'BROKEN COLLECTIVE'}</div>
<h1 style="font:700 30px/1.15 Georgia,serif;margin:16px 0 14px;color:${INK}">${esc(k.title)}</h1>
<div style="height:2px;width:72px;background:${RED};margin:0 0 18px"></div>
<p style="font:400 16px/1.6 Georgia,serif;margin:0 0 20px">${esc(k.body)}</p>
<div>${kind==='shipped'&&o.track?btn(o.track,c.track,RED):''}${btn(read,c.read,INK)}</div>
<p style="font:italic 400 14px/1.5 Georgia,serif;color:${SOFT};margin:26px 0 0">${esc(c.sign)}</p>
<p style="font:400 11px/1.5 Arial,sans-serif;color:${SOFT};margin:18px 0 0">${esc(o.order)} · <a href="https://www.dubelteam.com" style="color:${SOFT}">Dubel Team</a></p>
</td></tr></table></td></tr></table></body></html>`
 const text=`${k.title}\n\n${k.body}\n\n${kind==='shipped'&&o.track?`${c.track}: ${o.track}\n`:''}${c.read}: ${read}\n\n${c.sign}\n${o.order}`
 return {subject:k.subject,html,text}
}
