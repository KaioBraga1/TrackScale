import Link from 'next/link'

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <section className="card mx-auto max-w-2xl py-16 text-center">
      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">Coming soon</span>
      <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{description}</p>
      <Link href="/dashboard" className="btn-secondary mt-6">Back to Dashboard</Link>
    </section>
  )
}
