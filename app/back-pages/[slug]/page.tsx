import Link from 'next/link'
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {SITE_URL} from '@/lib/brand'
import {BACK_PAGES, backPage} from '@/lib/back-pages/posts'

export const dynamicParams = false
export function generateStaticParams() {
 return BACK_PAGES.map((p) => ({slug: p.slug}))
}

export function generateMetadata({params}: {params: {slug: string}}): Metadata {
 const p = backPage(params.slug)
 if (!p) return {}
 const url = `${SITE_URL}/back-pages/${p.slug}`
 return {
  title: p.title,
  description: p.description,
  alternates: {canonical: url},
  openGraph: {type: 'article', url, title: p.title, description: p.description, siteName: 'FAN LIFE', publishedTime: p.published, modifiedTime: p.updated},
  robots: {index: true, follow: true, 'max-image-preview': 'large'},
 }
}

const date = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})

/** One Back Pages article (plan v8 §5.2): the answer first, the door at the end, Article + BreadcrumbList for search. */
export default function BackPageArticle({params}: {params: {slug: string}}) {
 const p = backPage(params.slug)
 if (!p) notFound()
 const url = `${SITE_URL}/back-pages/${p.slug}`
 const ld = [
  {'@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, datePublished: p.published, dateModified: p.updated, mainEntityOfPage: url, author: {'@type': 'Organization', name: 'FAN LIFE', url: SITE_URL}, publisher: {'@type': 'Organization', name: 'Dubel Team', url: 'https://www.dubelteam.com'}},
  {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
   {'@type': 'ListItem', position: 1, name: 'FAN LIFE', item: SITE_URL},
   {'@type': 'ListItem', position: 2, name: 'The Back Pages', item: `${SITE_URL}/back-pages`},
   {'@type': 'ListItem', position: 3, name: p.title, item: url},
  ]},
 ]
 const more = BACK_PAGES.filter((x) => x.slug !== p.slug)
 return <Shell locale="en"><main id="main" className="wkh-doc">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(ld)}}/>
  <header className="wkh-doc-head">
   <p className="wk-banner">{p.kicker}</p>
   <h1 className="wk-head wkh-title">{p.title}</h1>
   <p className="wkh-doc-lede">{p.lede}</p>
   <p className="wk-k wk-muted"><time dateTime={p.updated}>Updated {date(p.updated)}</time></p>
  </header>
  <article className="wkh-doc-body">
   {p.body()}
   <p><Link className="wk-btn min-h-tap" href={p.cta.href}>{p.cta.label} →</Link></p>
  </article>
  <nav className="wkh-doc-nav" aria-label="More from the Back Pages">
   <Link href="/back-pages">All Back Pages</Link>
   {more.map((m) => <Link key={m.slug} href={`/back-pages/${m.slug}`}>{m.title}</Link>)}
  </nav>
 </main></Shell>
}
