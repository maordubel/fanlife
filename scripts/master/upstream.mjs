import{execFileSync,spawnSync}from'node:child_process'
import{readFileSync,writeFileSync,mkdirSync,appendFileSync}from'node:fs'
const lock=JSON.parse(readFileSync('upstream.lock.json','utf8'))
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:256*1024*1024}).trim()
function output(key,value){console.log(`${key}=${value}`);if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${value}\n`)}
if(lock.repository!=='maordubel/The-Worker'||!/^[a-f0-9]{40}$/.test(lock.commit))throw new Error('Unexpected upstream configuration.')
const url=`https://github.com/${lock.repository}.git`,latest=process.env.FAN_LIFE_TEST_UPSTREAM_SHA||git('ls-remote',url,'refs/heads/main').split(/\s/)[0]
if(!/^[a-f0-9]{40}$/.test(latest))throw new Error('Invalid upstream commit.')
output('latest',latest);output('updated',latest!==lock.commit)
if(latest===lock.commit||!process.argv.includes('--apply'))process.exit(0)
if(git('status','--porcelain'))throw new Error('Use a clean checkout. Local changes are never overwritten.')
git('fetch','--no-tags','--depth=1',url,lock.commit);git('fetch','--no-tags','--depth=1',url,latest)
const files=git('diff','--name-status',lock.commit,latest).split('\n')
let patch=git('diff','--binary','--full-index',lock.commit,latest,'--','.',':!app/page.tsx')+'\n'
patch+=git('diff','--binary','--full-index',lock.commit,latest,'--','app/page.tsx').replaceAll('a/app/page.tsx','a/app/ground/page.tsx').replaceAll('b/app/page.tsx','b/app/ground/page.tsx')+'\n'
const root=process.env.FAN_LIFE_UPDATE_REPORT_DIR||'/tmp/fan-life-update';mkdirSync(root,{recursive:true});writeFileSync(`${root}/upstream.patch`,patch)
const apply=spawnSync('git',['apply','--3way','--index',`${root}/upstream.patch`],{encoding:'utf8'})
const report={base:lock.commit,head:latest,checkedAt:new Date().toISOString(),files,homeRemapped:true,status:apply.status===0?'candidate':'conflict',conflicts:git('diff','--name-only','--diff-filter=U').split('\n').filter(Boolean),applyLog:apply.stderr};writeFileSync(`${root}/report.json`,JSON.stringify(report,null,2)+'\n')
if(apply.status!==0){console.error('Update conflicts detected. Installed lock was not advanced.');process.exit(2)}
const sensitive=files.filter(p=>/\t(\.github\/|supabase\/|package.*json|middleware.ts|next.config.mjs)/.test(p));output('manual_review',sensitive.length>0)
writeFileSync('upstream.lock.json',JSON.stringify({...lock,commit:latest,importedAt:new Date().toISOString()},null,2)+'\n');git('add','upstream.lock.json')
writeFileSync(`${root}/candidate.patch`,execFileSync('git',['diff','--cached','--binary','--full-index'],{maxBuffer:256*1024*1024}))
writeFileSync(`${root}/report.md`,`# The Worker integration candidate\n\n${lock.commit} → ${latest}\n\n${files.length} changed paths. Native home remapped to /ground.\n\n${sensitive.length?'Manual review required:\n'+sensitive.join('\n'):'No sensitive configuration changes.'}\n\nAn integration candidate until CI passes.\n`)
