import Link from 'next/link'
import type {Metadata} from 'next'
import {Shell} from '@/components/master/Shell'
import {SITE_URL} from '@/lib/brand'
import {BACK_PAGES} from '@/lib/back-pages/posts'

export const metadata: Metadata = {
 title: 'The Back Pages — FAN LIFE',
 description: 'Answers for football supporters: free browser football games, trivia by club, fair play without loot boxes — each ending at a game you can play.',
 alternates: {canonical: `${SITE_URL}/back-pages`},
}

/** /back-pages (plan v8): the index of FAN LIFE's articles, newest first. */
export default function BackPages() {
 const posts = [...BACK_PAGES].sort((a, b) => b.updated.localeCompare(a.updated))
 return <Shell locale="en"><main id="main" className="wkh-doc">
  <header className="wkh-doc-head">
   <p className="wk-banner">FAN LIFE</p>
   <h1 className="wk-head wkh-title">The Back Pages</h1>
   <p className="wkh-doc-lede">Questions supporters ask, answered from the archive — and every answer ends at a game you can play.</p>
  </header>
  <article className="wkh-doc-body">
   {posts.map((p) => <section key={p.slug}>
    <h2><Link href={`/back-pages/${p.slug}`}>{p.title}</Link></h2>
    <p>{p.description}</p>
   </section>)}
  </article>
 </main></Shell>
}
