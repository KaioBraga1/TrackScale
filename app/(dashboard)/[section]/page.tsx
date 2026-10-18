import Link from 'next/link'
import { notFound } from 'next/navigation'

const PLACEHOLDERS: Record<string, { title: string; description: string }> = {
  'fan-data': { title: 'Fan Data', description: 'Fan profiles and audience data will be available here soon.' },
  email: { title: 'E-Mail', description: 'Email campaigns will be available here soon.' },
  creatives: { title: 'Creatives', description: 'Campaign creatives will be available here soon.' },
  courses: { title: 'Courses', description: 'Courses will be available here soon.' },
  refer: { title: 'Refer & Get 3 months free', description: 'Referral rewards will be available when the membership program launches.' },
}

export default async function PlaceholderPage({ params }: { params: { section: string } }) {
  const placeholder = PLACEHOLDERS[params.section]
  if (!placeholder) notFound()

  return (
    <section className="card mx-auto max-w-2xl py-16 text-center">
      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">Coming soon</span>
      <h1 className="mt-5 text-2xl font-semibold">{placeholder.title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{placeholder.description}</p>
      <Link href="/dashboard" className="btn-secondary mt-6">Back to Dashboard</Link>
    </section>
  )
}
