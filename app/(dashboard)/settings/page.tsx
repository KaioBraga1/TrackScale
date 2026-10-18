import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { changePassword, saveAccountSettings, saveName, savePreferences } from './actions'

const TABS = ['account', 'security', 'membership', 'affiliate', 'preferences'] as const
type SettingsTab = typeof TABS[number]

export const metadata = { title: 'Settings | TrackScale' }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string; spotify?: string; saved?: string; error?: string; 'password-updated'?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, spotifyConnection] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.spotifyConnection.findUnique({
      where: { userId: session.user.id },
      select: { spotifyId: true, expiresAt: true, createdAt: true },
    }),
  ])
  if (!user) redirect('/login')

  const tab: SettingsTab = TABS.includes(searchParams.tab as SettingsTab)
    ? searchParams.tab as SettingsTab
    : 'account'
  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
    { id: 'membership', label: 'Membership' },
    { id: 'affiliate', label: 'Affiliate' },
    { id: 'preferences', label: 'Preferences' },
  ]
  const input = 'input'
  const spotifyExpired = spotifyConnection ? spotifyConnection.expiresAt < new Date() : false

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text)' }}>Settings</h1>
      </header>

      {searchParams.saved && <Notice>Changes saved.</Notice>}
      {searchParams.error && <Notice error>Could not save these settings. Check the entered values.</Notice>}
      {searchParams.spotify === 'connected' && <Notice>Spotify connected successfully.</Notice>}
      {searchParams.spotify === 'disconnected' && <Notice>Spotify disconnected.</Notice>}
      {searchParams.spotify === 'error' && <Notice error>Spotify connection failed. Try again.</Notice>}

      <nav
        className="flex gap-1 overflow-x-auto pb-px"
        style={{ borderBottom: '1px solid var(--border)' }}
        aria-label="Settings tabs"
      >
        {tabs.map((item) => (
          <a
            key={item.id}
            href={`/settings?tab=${item.id}`}
            aria-current={tab === item.id ? 'page' : undefined}
            className="shrink-0 px-4 py-3 text-sm transition-colors"
            style={{
              borderBottom: tab === item.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === item.id ? 'var(--text)' : 'var(--muted)',
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {tab === 'account' && (
        <div className="space-y-4">
          <form action={saveAccountSettings} className="card space-y-4">
            <h2 className="font-semibold">Account &amp; billing information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email"><input type="email" value={user.email} readOnly className={`${input} opacity-70`} /></Field>
              <Field label="Company"><input name="billingCompany" defaultValue={user.billingCompany ?? ''} className={input} /></Field>
              <Field label="Address 1"><input name="billingAddress1" defaultValue={user.billingAddress1 ?? ''} className={input} /></Field>
              <Field label="Address 2"><input name="billingAddress2" defaultValue={user.billingAddress2 ?? ''} className={input} /></Field>
              <Field label="City"><input name="billingCity" defaultValue={user.billingCity ?? ''} className={input} /></Field>
              <Field label="State"><input name="billingState" defaultValue={user.billingState ?? ''} className={input} /></Field>
              <Field label="Zip"><input name="billingZip" defaultValue={user.billingZip ?? ''} className={input} /></Field>
              <Field label="Country"><input name="billingCountry" defaultValue={user.billingCountry ?? ''} className={input} /></Field>
              <Field label="Tax ID / VAT"><input name="billingTaxId" defaultValue={user.billingTaxId ?? ''} className={input} /></Field>
              <input type="hidden" name="timezone" value={user.timezone} />
            </div>
            <button type="submit" className="btn-primary">Save Changes</button>
          </form>

          <form action={saveName} className="card space-y-3">
            <h2 className="font-semibold">Profile name</h2>
            <Field label="Name"><input name="name" defaultValue={user.name ?? ''} className={input} maxLength={100} /></Field>
            <button type="submit" className="btn-secondary">Save name</button>
          </form>

          <section className="card space-y-3">
            <h2 className="font-semibold">Change email</h2>
            <p className="text-sm text-muted">Email changes are unavailable until an email delivery provider is configured. Your current email is {user.email}.</p>
          </section>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <form action={changePassword} className="card space-y-4">
            <h2 className="font-semibold">Change password</h2>
            <p className="text-xs text-muted">Use at least 12 characters. Password changes do not sign out other sessions in this version.</p>
            <Field label="Current password"><input type="password" name="currentPassword" required maxLength={128} className={input} /></Field>
            <Field label="New password"><input type="password" name="password" required minLength={12} maxLength={128} className={input} /></Field>
            <button type="submit" className="btn-primary">Update password</button>
          </form>
          <section className="card space-y-2">
            <h2 className="font-semibold">Active sessions</h2>
            <p className="text-sm text-muted">Session management is not available with the current JWT-only auth setup.</p>
          </section>
          <section className="card space-y-4">
            <h2 className="font-semibold">Spotify connection</h2>
            {spotifyConnection ? (
              <>
                <p className="text-sm text-green-400">Connected {spotifyExpired ? '· token will refresh when needed' : ''}</p>
                {spotifyConnection.spotifyId && <p className="font-mono text-xs text-muted">ID: {spotifyConnection.spotifyId}</p>}
                <p className="text-xs text-muted">Connected {spotifyConnection.createdAt.toLocaleDateString('en-US')}</p>
                <div className="flex gap-2">
                  <a href="/api/auth/spotify" className="btn-secondary text-xs">Reconnect</a>
                  <form action="/api/auth/spotify/disconnect" method="POST"><button className="btn-ghost text-xs text-red-400">Disconnect</button></form>
                </div>
              </>
            ) : (
              <a href="/api/auth/spotify" className="btn-primary inline-flex">Connect Spotify</a>
            )}
          </section>
        </div>
      )}

      {tab === 'membership' && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Current plan: {user.membershipStatus}</h2>
              <p className="text-sm text-muted">{user.trialEndsAt ? `Trial ends ${user.trialEndsAt.toLocaleDateString('en-US')}` : 'No active trial countdown.'}</p>
            </div>
            <button disabled className="btn-secondary opacity-60" title="Billing provider is not configured">Manage Subscription</button>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted">TrackScale {user.membershipStatus} plan</p>
            <p className="mt-2 text-2xl font-semibold">{user.subscriptionPrice ? `$${user.subscriptionPrice.toString()}` : 'Billing not configured'}{user.subscriptionInterval ? ` / ${user.subscriptionInterval}` : ''}</p>
            <p className="mt-2 text-sm text-muted">Subscription and payment management require a billing provider.</p>
          </div>
          <ul className="space-y-2 text-sm text-muted">
            {Array.isArray(user.subscriptionFeatures) && user.subscriptionFeatures.map((feature, index) => (
              <li key={index}>✓ {String(feature)}</li>
            ))}
            {(!Array.isArray(user.subscriptionFeatures) || user.subscriptionFeatures.length === 0) && <li>Plan features will appear after billing is configured.</li>}
          </ul>
        </section>
      )}

      {tab === 'affiliate' && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Affiliate</h2>
          <p className="text-sm text-muted">Affiliate setup is pending product and team decisions. No referral rewards are active yet.</p>
        </section>
      )}

      {tab === 'preferences' && (
        <form action={savePreferences} className="card space-y-4">
          <h2 className="font-semibold">Preferences</h2>
          <label className="block text-sm">
            Timezone used for reports and analytics
            <select name="timezone" defaultValue={user.timezone} className={`${input} mt-1`}>
              {['UTC', 'America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'].map((timezone) => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm">{label}<div className="mt-1">{children}</div></label>
}

function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-800 bg-red-950/30 text-red-300' : 'border-green-800 bg-green-950/30 text-green-300'}`}>{children}</div>
}
