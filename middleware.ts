import {NextRequest,NextResponse} from 'next/server'
import {evaluationMode} from '@/lib/master/mode'
import {clubFromHost,DEFAULT_CLUB} from '@/lib/master/registry'
export function middleware(r:NextRequest){let fresh:string|undefined;if(evaluationMode()&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(r.cookies.get('fan-life-tester')?.value||'')){fresh=crypto.randomUUID();r.cookies.set('fan-life-tester',fresh)}const headers=new Headers(r.headers);headers.set('x-fan-life-path',r.nextUrl.pathname);headers.delete('x-fan-life-club');const hostClub=clubFromHost(r.headers.get('host'));if(hostClub)headers.set('x-fan-life-club',hostClub);headers.delete('x-fan-life-tester');if(evaluationMode())headers.set('x-fan-life-tester',r.cookies.get('fan-life-tester')?.value||'');// Redirect before the legacy layout can replace the page with its closed-gate UI.
const sharedTimeline=hostClub&&hostClub!==DEFAULT_CLUB&&['GET','HEAD'].includes(r.method)&&['/timeline','/timeline/order'].includes(r.nextUrl.pathname)
const destination=r.nextUrl.clone()
if(sharedTimeline)destination.pathname=`/clubs/${hostClub}/timeline`
const response=sharedTimeline?NextResponse.redirect(destination):NextResponse.next({request:{headers}});if(fresh)response.cookies.set('fan-life-tester',fresh,{httpOnly:true,sameSite:'lax',path:'/',maxAge:31536000});response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');return response}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)']}
