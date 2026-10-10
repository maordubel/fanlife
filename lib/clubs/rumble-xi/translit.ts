/**
 * English forms of names written in Greek or Hebrew. Used only where no English form is on file (curated list, owner workbook, archive Latin alias) —
 * the result is flagged 'transliterated' and is a convention, not a fact about how the man writes his own name (rule 11).
 */
const GREEK_FIRST_WORD=/^(?:μπ|ντ|γκ)/
const strip=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').normalize('NFC')
const cap=(s:string)=>s.split(/([-' ])/).map(w=>w.length>1||/[a-z]/.test(w)?w.charAt(0).toUpperCase()+w.slice(1):w).join('')

const GREEK_DI:[RegExp,string][]=[[/ου/g,'ou'],[/ει/g,'ei'],[/οι/g,'oi'],[/αι/g,'ai'],[/υι/g,'yi'],[/γκ/g,'ng'],[/γγ/g,'ng'],[/γχ/g,'nch'],[/τσ/g,'ts'],[/τζ/g,'tz'],[/θ/g,'th'],[/χ/g,'ch'],[/ψ/g,'ps'],[/ξ/g,'x'],[/φ/g,'f']]
const GREEK_ONE:Record<string,string>={α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',ω:'o'}
const greekWord=(w0:string)=>{
 let w=strip(w0.toLowerCase())
 const start=GREEK_FIRST_WORD.exec(w)?.[0]
 if(start==='μπ')w='b'+w.slice(2);else if(start==='ντ')w='d'+w.slice(2);else if(start==='γκ')w='g'+w.slice(2)
 w=w.replace(/μπ/g,'mp').replace(/ντ/g,'nt')
 for(const [re,to] of GREEK_DI)w=w.replace(re,to)
 // the Greek-letter pairs above are now Latin; a lone αυ/ευ keeps its two letters
 return w.replace(/[Ͱ-Ͽ]/g,c=>GREEK_ONE[c]??'')
}
export const greekToEnglish=(s:string)=>cap(s.replace(/\s*\([^)]*\)/g,'').trim().split(/\s+/).map(greekWord).join(' '))

const FIRST:Record<string,string>={'אבי':'Avi','אבשלום':'Avshalom','אברהם':'Avraham','אבישי':'Avishai','אביחי':'Avihai','אבנר':'Avner','אדם':'Adam','אהוד':'Ehud','אופיר':'Ofir','אור':'Or','אורי':'Uri','אוראל':'Orel','אורן':'Oren','אושר':'Osher','אילן':'Ilan','איתי':'Itay','איתן':'Eitan','אלון':'Alon','אלי':'Eli','אליהו':'Eliyahu','אלעד':'Elad','אמיר':'Amir','אמנון':'Amnon','אסי':'Assi','אפי':'Efi','אריה':'Arie','אריאל':'Ariel','אריק':'Arik','אשר':'Asher','אייל':'Eyal','בני':'Benny','בנימין':'Binyamin','בן':'Ben','בועז':'Boaz','ברוך':'Baruch','גבי':'Gabi','גדי':'Gadi','גיא':'Guy','גידי':'Gidi','גיורא':'Giora','גילי':'Gili','גיל':'Gil','גלעד':'Gilad','גד':'Gad','דב':'Dov','דוד':'David','דודו':'Dudu','דורון':'Doron','דן':'Dan','דני':'Dani','דניאל':'Daniel','דרור':'Dror','הראל':'Harel','זאב':'Zeev','זיו':'Ziv','זכריה':'Zacharia','חגי':'Hagai','חיים':'Haim','חנן':'Hanan','יאיר':'Yair','יגאל':'Yigal','יהודה':'Yehuda','יהונתן':'Yonatan','יהושע':'Yehoshua','יובל':'Yuval','יוני':'Yoni','יוסי':'Yossi','יוסף':'Yosef','יורם':'Yoram','יחזקאל':'Yehezkel','יחיאל':'Yehiel','ינון':'Yinon','יניב':'Yaniv','יעקב':'Yaakov','יצחק':'Yitzhak','ירון':'Yaron','ירדן':'Yarden','ישראל':'Israel','יואב':'Yoav','יונתן':'Yonatan','כפיר':'Kfir','לביא':'Lavi','ליאור':'Lior','לירן':'Liran','מאיר':'Meir','מושיק':'Moshik','מוטי':'Moti','מוני':'Moni','מיכאל':'Michael','מיכה':'Micha','מני':'Meni','מנור':'Manor','מנחם':'Menahem','משה':'Moshe','מתן':'Matan','נבו':'Nevo','נדב':'Nadav','נחום':'Nahum','ניר':'Nir','נעם':'Noam','נתן':'Natan','נתנאל':'Netanel','ניסים':'Nissim','סיוון':'Sivan','סתיו':'Stav','עדי':'Adi','עומר':'Omer','עופר':'Ofer','עוז':'Oz','עידו':'Ido','עמית':'Amit','עמרי':'Omri','עמיחי':'Amichai','ערן':'Eran','עזרא':'Ezra','פיני':'Pini','פליקס':'Felix','צבי':'Zvi','ציון':'Tzion','קובי':'Kobi','רביבו':'Ravivo','רונן':'Ronen','רון':'Ron','רועי':'Roy','רפי':'Rafi','רפאל':'Rafael','רן':'Ran','שאול':'Shaul','שביט':'Shavit','שחר':'Shahar','שי':'Shay','שלום':'Shalom','שלמה':'Shlomo','שמוליק':'Shmulik','שמעון':'Shimon','שמואל':'Shmuel','שרון':'Sharon','תומר':'Tomer','תום':'Tom','תמיר':'Tamir','אלכס':'Alex','אנדרי':'Andrei','אדמונד':'Edmond','אמאדו':'Amadou','דייגו':'Diego','קארים':'Karim','ויקטור':'Victor','פבל':'Pavel','מארק':'Mark','מרק':'Marc','זאבי':'Zeevi','עמוס':'Amos','מיקי':'Miki','מישל':'Michel','אנטון':'Anton','אוסקר':'Oscar','סרגיי':'Sergei','בוריס':'Boris','יוג':'Yug','נועם':'Noam','טל':'Tal','טוביה':'Tuvia','אלירן':'Eliran','אליאב':'Eliav','אליעד':'Eliad','אלדד':'Eldad','אלכסנדר':'Alexander','גיורגי':'Giorgi','ג׳ורג׳':'George','i':'i','':'a','a':'h'}
const CONS:Record<string,string>={א:'',ב:'v',ג:'g',ד:'d',ה:'h',ו:'v',ז:'z',ח:'h',ט:'t',י:'y',כ:'k',ך:'kh',ל:'l',מ:'m',ם:'m',נ:'n',ן:'n',ס:'s',ע:'',פ:'p',ף:'f',צ:'ts',ץ:'ts',ק:'k',ר:'r',ש:'sh',ת:'t'}
const isVowelLetter=(x?:string)=>x==='ו'||x==='י'||x==='א'||x==='ע'||x==='ה'
const hebWord=(w0:string):string=>{
 const w=w0.replace(/[֑-ׇ]/g,'')
 if(FIRST[w])return FIRST[w]
 const letters:string[]=[]
 for(let i=0;i<w.length;i++){const c=w[i]!,nx=w[i+1]
  if(nx==="'"||nx==='׳'){const m:Record<string,string>={ג:'j',ז:'zh',צ:'ch',ת:'th',ח:'kh'};letters.push(m[c]??CONS[c]??'');i++;continue}
  letters.push(c)}
 let out=''
 const cons=(c:string)=>CONS[c]!==undefined
 for(let i=0;i<letters.length;i++){const c=letters[i]!,prev=letters[i-1],next=letters[i+1]
  if(c.length>1||!cons(c)){out+=c.length>1?c:(c==="'"||c==='׳'?'':c);continue}
  if(c==='ו'){if(next==='ו'){out+='v';i++;continue};out+=i===0?'v':'o';continue}
  if(c==='י'){if(prev==='י')continue;out+=i===0?'y':'i';continue}
  if(c==='א'||c==='ע'){out+=i===0?'a':(next===undefined?'':'a');continue}
  if(c==='ה'&&i===letters.length-1){out+=letters.length>2?'a':'h';continue}
  out+=CONS[c]
  if(next&&cons(next)&&!isVowelLetter(next)&&!isVowelLetter(c))out+=i===0?'a':'e'}
 return out
}
export const hebrewToEnglish=(s:string)=>cap(s.replace(/\s*\([^)]*\)/g,'').trim().split(/\s+/).map(hebWord).join(' ').replace(/(.)\1{2,}/g,'$1$1'))
export const isLatinName=(s:string)=>/^[\x20-\x7eÀ-ɏ.'’‘-]+$/.test(s)
export const isGreek=(s:string)=>/[Ͱ-Ͽἀ-῿]/.test(s)
export const isHebrew=(s:string)=>/[֐-׿]/.test(s)
/** an archive scrape leaves junk on some names: "Image: …" captions, role/year brackets, curly quotes */
export const cleanLatin=(s:string)=>s.replace(/\s*\[.*$/,'').replace(/\s+or\s+.*$/,'').replace(/\s*Image:.*$/i,'').replace(/(?<=[a-z])Image:.*$/,'').replace(/[‘’]/g,"'").replace(/\s*\((?:jnr|jr|snr|sr|goalkeeper|gk|forward|defender|midfielder)\)\s*/gi,m=>/jnr|jr/i.test(m)?' Jr':/snr|sr/i.test(m)?' Sr':'').replace(/\s+/g,' ').trim()
