/** Shared by the new-film form and the paused job. No rejected file silently disappears from a selection. */
export function validatePictures(files:readonly File[]):void{
 if(files.length>30)throw new Error('At most 30 uploaded pictures. Use a Drive folder for a larger selection.')
 const bad=files.filter(f=>!/^.+\.(png|jpe?g|webp)$/i.test(f.name)||f.size===0||f.size>45*1024*1024)
 if(bad.length)throw new Error(`These files cannot be added: ${bad.map(f=>f.name).join(', ')}. Use PNG, JPG or WebP, at most 45 MB each.`)
}

export async function pictureName(file:File):Promise<string>{
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))
 const hash=Array.from(bytes.slice(0,10),x=>x.toString(16).padStart(2,'0')).join('')
 const ext=file.name.split('.').pop()!.toLowerCase().replace('jpeg','jpg')
 const stem=file.name.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30)||'picture'
 return `${stem}-${hash}.${ext}`
}

async function post(path:string,value:unknown){
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})
 const b=await r.json().catch(()=>({}))
 if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`)
 return b
}

export async function uploadPictures(id:string,files:readonly File[],illustrated:boolean,progress:(text:string)=>void):Promise<void>{
 validatePictures(files)
 if(!files.length)return
 const names=await Promise.all(files.map(pictureName))
 const {urls}=await post(`/api/master/stories/${id}/art`,{names})
 for(const [i,file] of files.entries()){
  const name=names[i]!
  progress(`Uploading required picture ${i+1} of ${files.length}: ${file.name}`)
  const r=await fetch(urls[name],{method:'PUT',body:file,headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'true'}})
  if(!r.ok)throw new Error(`${file.name} did not upload. The film stays paused; retry the upload.`)
 }
 await post(`/api/master/stories/${id}`,{action:'art_added',files:files.map((f,i)=>({name:names[i],originalName:f.name,illustrated}))})
}
