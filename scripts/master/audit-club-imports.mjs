import {readdirSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):/\.tsx?$/.test(e.name)?[join(d,e.name)]:[]),records=[]
for(const file of ['app','components','lib'].flatMap(walk))readFileSync(file,'utf8').split('\n').forEach((line,index)=>{
 for(const [,specifier] of line.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
  let category
  if(/(?:content\/manual|content\/clubs\/hapoel|data\/(?:canon|wiki)|game\/archive$)/.test(specifier)||file.startsWith('lib/game/')&&specifier==='./archive')category='legacy-data'
  else if(/lib\/(?:brand|club\/context|i18n)$/.test(specifier))category='legacy-identity-or-copy'
  if(category)records.push({file,line:index+1,specifier,category,status:file.startsWith('lib/clubs/adapters/')?'adapter-exception':'remaining-migration'})
 }
})
const report='docs/fanlife/m1-import-audit.json'
if(process.argv.includes('--write'))writeFileSync(report,JSON.stringify({scope:'Direct imports only; not a transitive independence proof.',records},null,2)+'\n')
console.log(JSON.stringify({imports:records.length,files:new Set(records.map(r=>r.file)).size,adapters:records.filter(r=>r.status==='adapter-exception').length,report}))
