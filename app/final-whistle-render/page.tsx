import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {readDoc} from '@/lib/final-whistle/store'
import {verifyRender} from '@/lib/final-whistle/token'
import type {Job} from '@/lib/final-whistle/types'
import {Shell} from '@/components/master/Shell'
import {RenderJob} from './RenderJob'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {title: 'Final Whistle render', robots: {index: false, follow: false}}

/** Opened only by the scheduled runner, with a signed, short-lived link for ONE job. It draws the card and hands the PNG to the runner. */
export default async function Page({searchParams}: {searchParams: {job?: string; exp?: string; sig?: string}}) {
  const id = searchParams.job ?? ''
  if (!/^[a-f0-9]{24}$/.test(id) || !verifyRender(process.env.CRON_SECRET || '', id, Number(searchParams.exp), searchParams.sig ?? '', Date.now())) notFound()
  const job = (await readDoc<Job | null>(`jobs/${id}.json`, null)).value
  if (!job) notFound()
  return <Shell><RenderJob club={job.clubId} result={job.result}/></Shell>
}
