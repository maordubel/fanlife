import 'server-only'
/**
 * Printify's REST API (v1), exactly as documented at developers.printify.com: bearer token, a User-Agent, JSON.
 * One small client; every call names itself in its error so the desk can say what failed. Never called from a browser.
 */
const BASE='https://api.printify.com/v1'
export class PrintifyError extends Error{constructor(public status:number,message:string){super(message)}}
export type PShop={id:number;title:string;sales_channel:string}
export type PBlueprint={id:number;title:string;brand:string;model:string;images:string[]}
export type PProvider={id:number;title:string}
export type PVariant={id:number;title:string;options:Record<string,string>;placeholders:{position:string;width:number;height:number}[]}
export type PUpload={id:string;file_name:string;width:number;height:number;preview_url:string}
export type PProduct={id:string;title:string;description?:string;tags?:string[];blueprint_id?:number;visible:boolean;is_locked:boolean;variants:{id:number;cost:number;price:number;is_enabled:boolean}[];images:{src:string;is_default:boolean;position?:string}[];external?:{id?:string;handle?:string}}
export type PrintArea={variant_ids:number[];placeholders:{position:string;images:{id:string;x:number;y:number;scale:number;angle:number}[]}[]}

export function printify(token:string){
 const call=async<T>(what:string,path:string,init:{method?:string;body?:unknown}={}):Promise<T>=>{
  let r:Response
  try{r=await fetch(BASE+path,{method:init.method||'GET',cache:'no-store',signal:AbortSignal.timeout(45000),
   headers:{Authorization:`Bearer ${token}`,'User-Agent':'FanLife-Shop/1.0','Content-Type':'application/json;charset=utf-8'},body:init.body===undefined?undefined:JSON.stringify(init.body)})}
  catch(e){throw new PrintifyError(0,`${what}: Printify did not answer (${(e as Error).name}).`)}
  const text=await r.text()
  if(!r.ok){let why=text.slice(0,300);try{const j=JSON.parse(text);why=[j.message||j.error||j.title,j.errors?JSON.stringify(j.errors).slice(0,260):''].filter(Boolean).join(' — ')||why}catch{/* plain text */}
   throw new PrintifyError(r.status,r.status===401?`${what}: Printify refused the token. Create a new one and connect again.`:r.status===429?`${what}: Printify asked us to slow down. Try again in a minute.`:`${what}: ${why} (HTTP ${r.status})`)}
  return (text?JSON.parse(text):{}) as T
 }
 return {
  shops:()=>call<PShop[]>('Reading your stores','/shops.json'),
  blueprints:()=>call<PBlueprint[]>('Reading the catalogue','/catalog/blueprints.json'),
  providers:(bp:number)=>call<PProvider[]>('Reading print providers',`/catalog/blueprints/${bp}/print_providers.json`),
  variants:(bp:number,pp:number)=>call<{variants:PVariant[]}>('Reading sizes and colours',`/catalog/blueprints/${bp}/print_providers/${pp}/variants.json`),
  uploadUrl:(file_name:string,url:string)=>call<PUpload>('Sending the picture to Printify','/uploads/images.json',{method:'POST',body:{file_name,url}}),
  upload:(file_name:string,contents:string)=>call<PUpload>('Uploading the artwork','/uploads/images.json',{method:'POST',body:{file_name,contents}}),
  create:(shop:number,body:unknown)=>call<PProduct>('Creating the product',`/shops/${shop}/products.json`,{method:'POST',body}),
  update:(shop:number,id:string,body:unknown)=>call<PProduct>('Pricing the product',`/shops/${shop}/products/${id}.json`,{method:'PUT',body}),
  list:(shop:number,page:number)=>call<{current_page:number;last_page:number;data:PProduct[]}>('Reading your products',`/shops/${shop}/products.json?limit=50&page=${page}`),
  product:(shop:number,id:string)=>call<PProduct>('Reading the product',`/shops/${shop}/products/${id}.json`),
  publish:(shop:number,id:string)=>call<object>('Publishing the product',`/shops/${shop}/products/${id}/publish.json`,{method:'POST',body:{title:true,description:true,images:true,variants:true,tags:true,keyFeatures:true,shipping_template:true}}),
  unpublish:(shop:number,id:string)=>call<object>('Unpublishing the product',`/shops/${shop}/products/${id}/unpublish.json`,{method:'POST',body:{}}),
  remove:(shop:number,id:string)=>call<object>('Deleting the product',`/shops/${shop}/products/${id}.json`,{method:'DELETE'}),
 }
}
export type Printify=ReturnType<typeof printify>
