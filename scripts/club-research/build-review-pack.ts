/** research:pack — writes club-packs/<id>/core.json (review-only) from research-staging/<id>. Never overwrites a core.json that holds an approval. */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {buildReviewPack} from '../../lib/club-research/pack'
const i=process.argv.indexOf('--club'),club=process.argv[i+1]||'',dir=`research-staging/${club}`
if(!club||!existsSync(dir))throw new Error('Usage: --club <id>')
const out=`club-packs/${club}/core.json`
if(existsSync(out)&&/"approvedBy":\s*"(?!null)/.test(readFileSync(out,'utf8')))throw new Error(`${out} contains approvals; refusing to overwrite.`)
const read=(n:string)=>JSON.parse(readFileSync(`${dir}/${n}.json`,'utf8'))
const pack=buildReviewPack(club,{timeline:read('timeline'),sources:read('sources')})
mkdirSync(`club-packs/${club}`,{recursive:true});writeFileSync(out,JSON.stringify(pack,null,1)+'\n');console.log(`${out}: ${pack.sources.length} sources, ${pack.archive.length} review events`)
