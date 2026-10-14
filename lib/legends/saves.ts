/** names for saves — pure, so a test can read them */
const TAGS=['The Long Road','Second Wind','Night Shift','Old Guard','Cup Fever','Fresh Start','Iron Season','Hall of Fame Run','Late Bloomers','The Rebuild','Dynasty Year','Home Fires']
/** a name for a new save that no other save of the owner wears: a tag chosen from the id, then a number if all are taken */
export function saveName(club:string,id:string,taken:string[]):string{
 const start=parseInt(id.slice(0,6),16)%TAGS.length
 for(let n=1;n<50;n++)for(let i=0;i<TAGS.length;i++){const nm=`${club} · ${TAGS[(start+i)%TAGS.length]}${n>1?` ${n}`:''}`;if(!taken.includes(nm))return nm}
 return `${club} · ${id.slice(0,4)}`
}
