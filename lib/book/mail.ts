import 'server-only'
import {BOOK_SITE,type BookLang} from './catalog'
import {journeyUrl} from './journey'

/**
 * The book's three letters, dressed as the book (paper, ink, one red thread — the site's identity), not as FAN LIFE:
 * a thank-you for a tip, "your copy is at the printer", and "it is on its way" with the tracking link.
 * Sent through the same Resend sender as FAN LIFE's orders (lib/pay/mail.sendMail).
 */
type Kind='tip'|'printing'|'shipped'|'making'|'received'|'press'|'after'
const PAPER='#F2EADB',INK='#1D1A21',RED='#A8101F',SOFT='#46404D'
const C:Record<BookLang,Record<Kind,{subject:string;title:string;body:string}>&{sign:string;read:string;track:string;follow:string}>={
 he:{tip:{subject:'תודה — קולקטיב שבור',title:'החשבון שולם.',body:'תודה. כל טיפ הוא עוד לילה של כתיבה. הספר נשאר חינם לכולם, תמיד — ואתם חלק מהסיבה.'},
  printing:{subject:'העותק שלך בדפוס — קולקטיב שבור',title:'העותק שלך בדפוס.',body:'ההזמנה התקבלה והספר עובר עכשיו להדפסה. כשהוא יוצא לדרך נשלח לך מספר מעקב.'},
  shipped:{subject:'ההזמנה בדרך אליך — קולקטיב שבור',title:'בדרך אליך.',body:'ההזמנה שלך יצאה לדרך.'},
  received:{subject:'ההזמנה התקבלה — קולקטיב שבור',title:'תודה. ההזמנה התקבלה.',body:'התשלום עבר וההזמנה בדרך לדפוס. מייל נוסף יגיע כשהיא נכנסת להדפסה, ועוד אחד עם מספר מעקב כשהיא יוצאת אליך.'},
  making:{subject:'ההזמנה שלך בהכנה — קולקטיב שבור',title:'בהכנה.',body:'ההזמנה התקבלה ונכנסה להדפסה. כשהיא יוצאת לדרך נשלח לך מספר מעקב.'},
  press:{subject:'הדפוס רץ — קולקטיב שבור',title:'הדפוס רץ.',body:'ממש עכשיו העותק שלך יוצא מהמכונה: דף אחרי דף, כריכה, דבק, חיתוך. ברגע שהוא נארז ויוצא לדרך יגיע מייל עם מספר מעקב.'},
  after:{subject:'הוא כבר אצלך? — קולקטיב שבור',title:'הוא כבר אצלך?',body:'לפי הדואר, ההזמנה אמורה להיות אצלך כבר עכשיו. אם היא הגיעה — צלמו אותה על המדף, על השולחן, ליד הקפה של הבוקר, ושלחו לי תשובה למייל הזה. ואם היא עוד לא הגיעה, פשוט תענו כאן ואני אבדוק מול הדואר.'},
  sign:'מאור · קולקטיב שבור',read:'להמשך הקריאה',track:'למעקב אחרי המשלוח',follow:'לאן הגיעה ההזמנה'},
 en:{tip:{subject:'Thank you — Broken Collective',title:'The bill is paid.',body:'Thank you. Every tip is another night of writing. The book stays free for everyone, always — and you are part of the reason.'},
  printing:{subject:'Your copy is at the printer — Broken Collective',title:'Your copy is at the printer.',body:'Your order is in and the book is going to print now. When it leaves, we will send you the tracking number.'},
  shipped:{subject:'Your order is on its way — Broken Collective',title:'On its way.',body:'Your order has been made and posted.'},
  received:{subject:'Order received — Broken Collective',title:'Thank you. Your order is in.',body:'Payment received and your order is on its way to the printer. Another email follows when it goes to print, and one more with tracking when it leaves.'},
  making:{subject:'Your order is being made — Broken Collective',title:'Being made.',body:'Your order is in and going to print. When it leaves, we will send you the tracking number.'},
  press:{subject:'The press is running — Broken Collective',title:'The press is running.',body:'Right now your copy is coming off the machine: page after page, the cover, the glue, the cut. The moment it is packed and posted, the tracking number follows.'},
  after:{subject:'Has it arrived? — Broken Collective',title:'Is it with you yet?',body:'By the post’s reckoning your order should be with you by now. If it has arrived, take a picture of it — on the shelf, on the table, next to the morning coffee — and send it as a reply to this email. And if it has not, just reply here and I will chase the post.'},
  sign:'Maor · Broken Collective',read:'Keep reading',track:'Track the parcel',follow:'Follow your order'},
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
<div>${kind==='shipped'&&o.track?btn(o.track,c.track,RED):''}${kind!=='tip'?btn(journeyUrl(o.order),c.follow,kind==='shipped'&&o.track?INK:RED):''}${btn(read,c.read,INK)}</div>
<p style="font:italic 400 14px/1.5 Georgia,serif;color:${SOFT};margin:26px 0 0">${esc(c.sign)}</p>
<p style="font:400 11px/1.5 Arial,sans-serif;color:${SOFT};margin:18px 0 0">${esc(o.order)} · <a href="https://www.dubelteam.com" style="color:${SOFT}">Dubel Team</a></p>
</td></tr></table></td></tr></table></body></html>`
 const text=`${k.title}\n\n${k.body}\n\n${kind==='shipped'&&o.track?`${c.track}: ${o.track}\n`:''}${kind!=='tip'?`${c.follow}: ${journeyUrl(o.order)}\n`:''}${c.read}: ${read}\n\n${c.sign}\n${o.order}`
 return {subject:k.subject,html,text}
}

/** the owner's note for every sale (owner, 23.11.2026): what sold, where to, and the order's journey */
export function saleMail(o:{order:string;what:string;region:string|null;euros:string;lang:BookLang}){
 const url=journeyUrl(o.order),subject=`📚 New order — ${o.what} · €${o.euros}`
 const text=`A new Broken Collective order.\n\nItem: ${o.what}\nPaid: €${o.euros}\nTo: ${o.region??'—'}\nReader's language: ${o.lang}\nOrder: ${o.order}\n\nIts journey: ${url}\n\nEvery step from here is automatic: the printer, the letters to the reader, the tracking.`
 return {subject,text,html:`<pre style="font:14px/1.6 monospace;white-space:pre-wrap">${esc(text)}</pre>`}
}
