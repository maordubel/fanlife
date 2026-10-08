import type {WallCandidate} from './wall-engine'
import type {BinaryRow,DatedItem,Transition} from './blackfile-engine'

/**
 * SYNTHETIC rivalry data for the dev-only QA board and the tests. Every name says "Fixture"; nothing here describes
 * a real club, person or match, and it is never loaded for a real club (`gate-extras.ts` is the only door to data).
 */
export function fixtureWall(n=12,ranked=true):WallCandidate[]{
 return Array.from({length:n},(_,i)=>({id:`fx-w${String(i).padStart(2,'0')}`,name:`Fixture candidate ${String(i+1).padStart(2,'0')}`,note:`Fixture note ${i+1}: authored placeholder, not a fact.`,...(ranked?{rank:i+1}:{})}))
}

const T=(from:string,to:string,sources=['fixture-source']):Transition=>({from,to,on:null,sources})
export function fixtureBinary():BinaryRow[]{
 return [
  {id:'fx-b1',person:'Fixture person 1',from:'Fixture club A',to:'Fixture club B',proposition:'direct',career:[T('Fixture club A','Fixture club B')],claim:'crossed'},
  {id:'fx-b2',person:'Fixture person 2',from:'Fixture club A',to:'Fixture club B',proposition:'ever',career:[T('Fixture club A','Fixture club C'),T('Fixture club C','Fixture club B')],claim:'crossed'},
  {id:'fx-b3',person:'Fixture person 3',from:'Fixture club A',to:'Fixture club B',proposition:'direct',career:[T('Fixture club A','Fixture club C'),T('Fixture club C','Fixture club B')],claim:'did_not',negativeProof:{kind:'complete-record',sources:['fixture-record']}},
  {id:'fx-b4',person:'Fixture person 4',from:'Fixture club A',to:'Fixture club B',proposition:'ever',career:[T('Fixture club A','Fixture club D')],claim:'did_not',negativeProof:{kind:'complete-record',sources:['fixture-record']}},
  // an unproven negative: present in the bank, never dealt
  {id:'fx-b5',person:'Fixture person 5',from:'Fixture club A',to:'Fixture club B',proposition:'direct',career:[],claim:'did_not'},
 ]
}

export function fixtureItems(n=10):DatedItem[]{
 return Array.from({length:n},(_,i)=>({id:`fx-e${i}`,title:`Fixture event ${i+1}`,on:`${2001+i*2}-0${1+(i%9)}-1${i%9}`,sources:['fixture-source']}))
}
