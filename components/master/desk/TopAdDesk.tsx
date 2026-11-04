'use client'
import {TopAdControl} from '@/components/master/TopAdControl'
import {useAdminApi} from '@/components/master/adminApi'
import type {TopAdSetting} from '@/lib/top-ad'

/** The top ad lives with the rest of the advertising (desk tidy, 4.11.2026), not in Settings. */
export function TopAdDesk({initial}:{initial:TopAdSetting}){
 const api=useAdminApi()
 return <>{api.error&&<p role="alert" className="desk-err">{api.error}</p>}<TopAdControl initial={initial} api={api}/></>
}
