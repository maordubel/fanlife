import {logout} from '@/app/master/login/actions'
/** Signs the owner out of the control room on this browser (audit F01). */
export function LogoutButton(){return <form action={logout} className="mag-logout"><button type="submit" className="min-h-tap">Sign out</button></form>}
