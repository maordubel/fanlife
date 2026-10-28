/**
 * One printed name per opponent. A club's archive reaches us through many publishers, and each spells the other side its
 * own way: German exonyms ("AEK Athen", "PAOK Saloniki"), registry capitals ("FK ŽELJEZNIČAR"), legal prefixes and
 * suffixes ("SV Werder Bremen", "Rangers FC"), and the odd truncation ("Sloga D"). Two spellings of one club are an ALIAS,
 * never two clubs — left alone they put "Rangers" and "Rangers FC" side by side as options to one Old Firm question.
 *
 * Three passes, in order, and none of them guesses:
 *  1. capitals are re-cased word by word (short all-capital tokens such as AEK, PAOK, FK stay as written);
 *  2. a LEGAL affix (FC, FK, NK, SK, HŠK, AFC, AS, RC, SC, SV, AO, GS — and a trailing FC) is dropped when a name is left;
 *  3. a reviewed alias table maps the remaining variants onto the name an English football reader uses.
 * Identity tokens (VfB, VfL, TSV, AC, BSC, HNK …) are never stripped: "VfB Leipzig" is not RB Leipzig.
 */

const LEGAL_PREFIX=/^(?:F\.?C\.?|FK|NK|SK|HŠK|HSK|AFC|AS|RC|SC|SV|AO|GS|PFC)\s+(?=\S)/i
const LEGAL_SUFFIX=/\s+(?:F\.?C\.?|GSS|NFC)$/i

/** canonical → variants (after passes 1–2). Every row is a club an English reader knows by the canonical form. */
const ALIASES:Readonly<Record<string,readonly string[]>>={
 // Greece
 'AEK Athens':['AEK Athen','AEK Athen FC'],
 'PAOK':['PAOK Saloniki','PAOK Salonica','PAOK Thessaloniki'],
 'Aris':['Aris Saloniki','Aris Salonica','Aris Thessaloniki'],
 'Olympiacos':['Olympiakos Piraeus','Olympiacos Piraeus','Olympiakos Piräus','Olympiakos'],
 'AEL Larissa':['AE Lárissa','AE Larissa','Lárissa','Larisa','AEL'],
 'OFI Crete':['OFI','OFI Heraklion','OFI Iraklio'],
 'Atromitos':['Atromitos Athinon','Atromitos Athens'],
 'Kifisia':['Kifissia','AE Kifisias','AE Kifisia'],
 'Iraklis':['Hraklis','Iraklis Thessaloniki'],
 'Volos':['Volos NFC','Volos Nfc'],
 'Doxa Drama':['Doxa Dramas'],
 'Panionios':['Panionios GSS'],
 'Kallithea':['Athens Kallithea','GS Kallithea'],
 'Niki Volos':['Niki Volou'],
 'Olympiacos Volos':['Olympiacos Volou','Olympiakos Volou'],
 'Proodeftiki':['Proodeytikh'],
 'Lamia':['PAS Lamia 1964','PAS Lamia'],
 'Panachaiki':['Panachaiki 2005'],
 'Iraklis Psachna':['Iraklis Psaxnon'],
 'AEL Kalloni':['Kalloni'],
 'Anagennisi Karditsa':['Anagennissi Karditsas 1904','AS Anagennissi Karditsas 1904'],
 'Ierapetra':['O.F.Ierapetras','O.F. Ierapetras'],
 // Bosnia and Herzegovina
 'Željezničar':['ZŽeljezničar','Zeljeznicar','Željezničar Sarajevo'],
 'Velež':['Velež Mostar','Velez Mostar','Velez'],
 'Sloga Doboj':['Sloga D'],
 'Modriča':['Modrica M','Modriča Maksima','Modrica'],
 'GOŠK Gabela':['GOŠK'],
 'Olimpik':['Olimpic'],
 'Čelik Zenica':['Čelik','Celik Zenica'],
 'Zvijezda Gradačac':['Zvijezda Gr.'],
 'Čapljina':['Capljina'],
 'Ljubuški':['Ljubuski'],
 'Široki Brijeg':['Siroki Brijeg'],
 // elsewhere (UEFA prints short forms: Atleti, Celta, GNK Dinamo)
 'Rangers':['TheRangers','The Rangers'],
 'Borussia Dortmund':['B. Dortmund','BV Borussia 09 Dortmund'],
 'Hapoel Beer Sheva':['H. Beer-Sheva','Hapoel Beer-Sheva',"Hapoel Be'er Sheva"],
 'Hapoel Tel Aviv':['H. Tel-Aviv','Hapoel Tel-Aviv'],
 'Maccabi Tel Aviv':['M. Tel-Aviv','Maccabi Tel-Aviv'],
 'Maccabi Petah Tikva':['M. Petah Tikva','Maccabi Petach Tikva'],
 'Maccabi Haifa':['M. Haifa'],
 'Lincoln Red Imps':['L. Red Imps'],
 'Slovan Bratislava':['S. Bratislava','ŠK Slovan Bratislava'],
 'Universitatea Craiova':['Univ. Craiova','U Craiova'],
 'Vejle':['VB','Vejle BK','Vejle Boldklub'],
 'Odense':['OB','Odense BK'],
 'Rad Belgrade':['Rad'],
 'TSC Bačka Topola':['TSC'],
 'KPV Kokkola':['KPV'],
 'TPS Turku':['TPS'],
 'KR Reykjavík':['KR'],
 'PSV Eindhoven':['PSV'],
 'LASK':['LASK Linz'],
 'KFC Uerdingen 05':['KFC Uerdingen'],
 '1. FSV Mainz 05':['FSV Mainz 05','Mainz 05'],
 'Hearts':['Heart of Midlothian','Heart Of Midlothian'],
 'Dinamo Zagreb':['GNK Dinamo','GNK Dinamo Zagreb','NK Dinamo Zagreb'],
 'Celta Vigo':['Celta','RC Celta','Celta de Vigo'],
 'Bayern Munich':['Bayern München','Bayern Munchen'],
 'Borussia Mönchengladbach':['Borussia Monchengladbach'],
 '1. FC Köln':['Köln','Koln','FC Köln','1. FC Koln'],
 'Dinamo Minsk':['Dinamo-minsk','Dinamo-Minsk'],
 'Djurgården':['Djurgarden'],
 'Hradec Králové':['Hradec Kralove'],
 'Paks':['Paksi','Paksi FC'],
 'The New Saints':['New Saints'],
 'AC Milan':['Milan'],
 'Atlético Madrid':['Atletico Madrid','Atleti','Club Atlético de Madrid'],
 'Athletic Bilbao':['Athletic Club Bilbao','Athletic Club'],
 'Fenerbahçe':['Fenerbahce'],
 'Ferencváros':['Ferencvaros'],
 'Málaga':['Malaga'],
 'Mladá Boleslav':['Mlada Boleslav'],
 'Paris Saint-Germain':['Paris Saint Germain','PSG'],
 'Saint-Étienne':['Saint-Etienne','St Etienne'],
 'Standard Liège':['Standard Liege'],
 'Újpest':['Ujpest'],
 'Hertha BSC':['Hertha','Hertha Berlin'],
 'Young Boys':['BSC Young Boys','Young Boys of Berne'],
}
const fold=(s:string)=>s.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const ALIAS=new Map<string,string>()
for(const [canon,vs] of Object.entries(ALIASES))for(const v of [canon,...vs])ALIAS.set(fold(v),canon)

/** "FK ŽELJEZNIČAR" → "FK Željezničar"; short capitals (AEK, PAOK, FK, OFI) stay */
function recase(s:string):string{
 const letters=s.replace(/[^\p{L}]/gu,'')
 if(letters.length<5||letters!==letters.toUpperCase())return s
 return s.split(/(\s+|-)/).map(w=>/^\s+$|^-$/.test(w)||w.replace(/[^\p{L}]/gu,'').length<=4?w:w.charAt(0)+w.slice(1).toLocaleLowerCase()).join('')
}
function strip(s:string):string{
 let t=s.trim()
 for(let i=0;i<2;i++){const a=t.replace(LEGAL_PREFIX,'').replace(LEGAL_SUFFIX,'').trim();if(!a||a===t)break;t=a}
 return t
}
/** The printed name of an opponent: one English spelling for one club. Unknown names pass with only passes 1–2. */
export function canonClub(name:string):string{
 // a feed sometimes glues the stage onto the name ("Motherwell. Scottish Cup Final")
 const raw=name.replace(/\s+/g,' ').replace(/\.\s+(?:Scottish|League|UEFA|European|Cup|Super|Premier)\b.*$/,'').trim();if(!raw)return raw
 const direct=ALIAS.get(fold(raw));if(direct)return direct
 const cased=recase(raw),bare=strip(cased)
 return ALIAS.get(fold(cased))??ALIAS.get(fold(bare))??bare
}
/** Two printed names that are one club (folded, affix-free). A distractor never shares this with the answer. */
export const clubCore=(name:string)=>fold(strip(canonClub(name)))

/**
 * A competition under the name it carried on the night. Feeds print today's names for old ties ("UEFA Champions League"
 * in 1974); a reader who was there remembers the European Cup. Same competition, era-true label — no claim changes.
 */
export function competitionOn(comp:string,on:string,country:string):string{
 let c=comp.replace(/\s+/g,' ').trim()
 if(/^UEFA Champions League\b/i.test(c)&&on<'1992-07-01')c=c.replace(/^UEFA Champions League/i,'European Cup')
 else if(/^European Cup\b(?! Winners)/i.test(c)&&on>='1992-07-01')c=c.replace(/^European Cup/i,'UEFA Champions League')
 if(/^UEFA Europa League\b/i.test(c)&&on<'2009-07-01')c=c.replace(/^UEFA Europa League/i,'UEFA Cup')
 else if(/^UEFA Cup\b/i.test(c)&&on>='2009-07-01')c=c.replace(/^UEFA Cup/i,'UEFA Europa League')
 c=c.replace(/^Cup Winners' Cup/i,"European Cup Winners' Cup").replace(/^DFB Pokal/i,'DFB-Pokal')
 if(country==='Greece'){
  c=c.replace(/^Super League Greece\b/i,'Greek Super League').replace(/^Super League\b/i,'Greek Super League').replace(/^Greece Cup\b/i,'Greek Cup')
  if(/^Greek Super League\b/.test(c)&&on<'2006-07-01')c=c.replace(/^Greek Super League/,'Greek league')
 }
 if(country==='Scotland')c=c.replace(/^FA Cup\b/,'Scottish Cup')
 // feed stage suffixes: "Scottish Cup - Final - Final", "Super Cup - Final", "League Cup - Final"
 c=c.replace(/(?:\s*-\s*Final)+$/i,' final').replace(/\s+-\s+/g,' – ')
 if(country==='Bosnia and Herzegovina'||/Bosnia/.test(c))c=c.replace(/^(?:Premier League of Bosnia and Herzegovina|Bosnia and Herzegovina Premier Liga|Bosnia and Herzegovina League)\b/,'Bosnian Premier League').replace(/^Bosnia and Herzegovina Cup\b/,'Bosnian Cup')
 return c
}

/** A sentence from a feed with its clubs printed the same way as everywhere else ("PAOK Saloniki 0-2 AEK Athen" →
 * "PAOK 0-2 AEK Athens"). Only multi-word or long variants are replaced, on word boundaries: a short form is too easily a
 * word of its own. */
const TEXT_VARIANTS=Object.entries(ALIASES).flatMap(([canon,vs])=>vs.filter(v=>v!==canon&&(v.includes(' ')||v.length>=6)&&!canon.includes(v)).map(v=>[v,canon] as const)).sort((a,b)=>b[0].length-a[0].length)
const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
const TEXT_RE=TEXT_VARIANTS.length?new RegExp(`(?<![\\p{L}\\p{N}])(${TEXT_VARIANTS.map(([v])=>esc(v)).join('|')})(?![\\p{L}\\p{N}])`,'gu'):null
const TEXT_TO=new Map(TEXT_VARIANTS)
export const canonText=(s:string)=>(TEXT_RE?s.replace(TEXT_RE,m=>TEXT_TO.get(m)??m):s).replace(/\.\s+((?:Scottish|League|UEFA|European|Greek|Israel)\b[^.]*)$/,' — $1')
