/**
 * Garment colour swatches for the builder (owner, 13.11.2026: "import every colour our printer has in stock").
 * Printify names a colour but gives no hex, so the common garment names (Bella+Canvas, Gildan, Comfort Colors, Stanley/Stella,
 * Next Level) are mapped here; an unknown name gets a neutral swatch and its name, never a guessed colour.
 */
const HEX:Record<string,string>={
 white:'#ffffff',black:'#111111','vintage white':'#f4efe4',natural:'#efe6d2',cream:'#f3e9d2',ivory:'#f6f0dc',bone:'#e7dfcf',sand:'#dccbab','soft cream':'#efe4cc',ecru:'#ece2cc',
 ash:'#d8d8d4','sport grey':'#a8a8a6','heather grey':'#a9a9a9','athletic heather':'#b9b9b9','dark grey':'#4a4a4c','dark grey heather':'#4d4d50','deep heather':'#6b6b6e',charcoal:'#3c3d40',asphalt:'#525255','heather dust':'#e6d7c3',
 navy:'#1f2a44','heather navy':'#36405a','true navy':'#1d2840','french navy':'#1c2541',red:'#c8102e',cardinal:'#8c1d2b','cardinal red':'#8c1d2b',maroon:'#5b1f2a','heather red':'#c0404f','canvas red':'#c02a32',
 'kelly green':'#1f8a4c','irish green':'#16a050',forest:'#24452e','forest green':'#24452e','military green':'#59603f',olive:'#6b6b3d','heather forest':'#3b5a42','leaf':'#3a7d44',
 royal:'#2853a8','true royal':'#2a55ad','heather true royal':'#4b6db5','carolina blue':'#7ba7d9','light blue':'#a9c7e8','baby blue':'#bcd4ee','steel blue':'#5f7f9e',
 orange:'#f26b21','burnt orange':'#c75b22',gold:'#f2b632',yellow:'#f6e04b',mustard:'#d6a33b','heather mustard':'#d2a64c',
 pink:'#f3b6c8','light pink':'#f7cdd8','heather maroon':'#6d3a44',purple:'#5a3f8f','heather team purple':'#6a4f9a',brown:'#5b3d2b',chocolate:'#4a2f22','dark chocolate':'#3a2519',
 'pepper':'#5b5b58','berry':'#8a2a54','blue jean':'#5f7a95','grey':'#8d8d8d','vintage black':'#2b2b2b','solid black blend':'#1b1b1b','black heather':'#2f2f30','white fleck triblend':'#eeeeea',
}
export const swatch=(name:string):string|null=>HEX[name.trim().toLowerCase()]??null
/** a light colour (dark ink reads on it) — used to order swatches and to warn about paper grounds on dark shirts */
export function isLight(name:string):boolean{const h=swatch(name);if(!h)return /white|cream|natural|sand|ivory|bone|ash|ecru|light|pink|baby/i.test(name)
 const n=parseInt(h.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>150}
