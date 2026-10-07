import {isIP} from 'node:net'

/**
 * The research engine reads PUBLIC web sources only (audit F10, 7.10.2026). A profile that names a loopback, private,
 * link-local, metadata or unique-local address — directly, or through a name that resolves to one — is refused, so a
 * source added in the control room can never make the server read its own network.
 */
const BLOCKED_NAMES=/^(localhost|localhost\.localdomain|ip6-localhost|ip6-loopback|metadata|metadata\.google\.internal|instance-data)$/i
const BLOCKED_SUFFIX=/\.(localhost|local|internal|intranet|lan|home\.arpa|localdomain)$/i

function v4(ip:string):number[]|null{const p=ip.split('.');if(p.length!==4)return null;const n=p.map(Number);return n.every(x=>Number.isInteger(x)&&x>=0&&x<=255)?n:null}
function publicV4(ip:string):boolean{
 const n=v4(ip);if(!n)return false;const [a,b]=n as [number,number,number,number]
 if(a===0||a===10||a===127)return false                 // this-network, private, loopback
 if(a===169&&b===254)return false                         // link-local (cloud metadata lives here)
 if(a===172&&b>=16&&b<=31)return false                    // private
 if(a===192&&b===168)return false                         // private
 if(a===100&&b>=64&&b<=127)return false                   // carrier-grade NAT
 if(a===192&&b===0&&n[2]===0)return false                 // IETF protocol assignments
 if(a===198&&(b===18||b===19))return false                // benchmarking
 if(a>=224)return false                                   // multicast, reserved, broadcast
 return true
}
function expandV6(ip:string):number[]|null{
 let s=ip.toLowerCase().replace(/^\[|\]$/g,'').split('%')[0]!
 // an embedded IPv4 tail (::ffff:127.0.0.1) becomes two groups
 const tail=s.match(/(\d+\.\d+\.\d+\.\d+)$/);if(tail){const n=v4(tail[1]!);if(!n)return null;s=s.slice(0,-tail[1]!.length)+((n[0]!<<8)|n[1]!).toString(16)+':'+((n[2]!<<8)|n[3]!).toString(16)}
 const halves=s.split('::');if(halves.length>2)return null
 const head=halves[0]?halves[0].split(':'):[],rest=halves.length===2&&halves[1]?halves[1].split(':'):[]
 const fill=halves.length===2?8-head.length-rest.length:0;if(fill<0)return null
 const groups=[...head,...Array(fill).fill('0'),...rest];if(groups.length!==8)return null
 const out=groups.map(g=>parseInt(g||'0',16));return out.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffff)?out:null
}
function publicV6(ip:string):boolean{
 const g=expandV6(ip);if(!g)return false
 if(g.every(x=>x===0))return false                                        // ::
 if(g.slice(0,7).every(x=>x===0)&&g[7]===1)return false                   // ::1 loopback
 if(g.slice(0,5).every(x=>x===0)&&g[5]===0xffff)return publicV4(`${g[6]!>>8}.${g[6]!&255}.${g[7]!>>8}.${g[7]!&255}`) // IPv4-mapped
 if(g[0]===0x64&&g[1]===0xff9b)return publicV4(`${g[6]!>>8}.${g[6]!&255}.${g[7]!>>8}.${g[7]!&255}`)                  // NAT64
 if((g[0]!&0xfe00)===0xfc00)return false                                  // fc00::/7 unique local
 if((g[0]!&0xffc0)===0xfe80)return false                                  // fe80::/10 link-local
 if((g[0]!&0xffc0)===0xfec0)return false                                  // fec0::/10 site-local (deprecated)
 if((g[0]!&0xff00)===0xff00)return false                                  // multicast
 if(g[0]===0x2001&&g[1]===0xdb8)return false                              // documentation
 return true
}
/** Is this resolved address on the public internet? Anything unparseable is not. */
export function isPublicIp(ip:string):boolean{const k=isIP(ip.replace(/^\[|\]$/g,'').split('%')[0]!);return k===4?publicV4(ip):k===6?publicV6(ip):false}
/** Is this host (name or literal address, as written in a URL) acceptable before DNS? */
export function hostProblem(host:string):string|null{
 const h=host.toLowerCase().replace(/\.$/,'')
 if(!h)return 'host is empty'
 const bare=h.replace(/^\[|\]$/g,'')
 if(isIP(bare))return isPublicIp(bare)?null:`${host} is not a public address`
 if(/^[\d.]+$/.test(h)||/^0x/i.test(h))return `${host} is a numeric host in a non-standard form`
 if(!h.includes('.'))return `${host} is not a public domain name`
 if(BLOCKED_NAMES.test(h)||BLOCKED_SUFFIX.test(h))return `${host} names a local or internal network`
 return null
}
export type LookupFn=(host:string)=>Promise<{address:string;family:number}[]>
/** Resolve with the system resolver (node:dns) — every address must be public, or the host is refused. */
export const systemLookup:LookupFn=async host=>{const {lookup}=await import('node:dns/promises');return lookup(host,{all:true,verbatim:true})}
export async function resolvedProblem(host:string,lookup:LookupFn):Promise<string|null>{
 const pre=hostProblem(host);if(pre)return pre
 const bare=host.replace(/^\[|\]$/g,'');if(isIP(bare))return null
 let addrs:{address:string}[];try{addrs=await lookup(bare)}catch(e){return `DNS lookup failed for ${host}${e instanceof Error?` (${e.message})`:''}`}
 if(!addrs.length)return `DNS returned no address for ${host}`
 const bad=addrs.find(a=>!isPublicIp(a.address));return bad?`${host} resolves to ${bad.address}, which is not a public address`:null
}
