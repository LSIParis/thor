import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import { fetchZammadDashboard, countClosedTicketsSince, type ZammadTicket } from '@/lib/zammad'
import { RefreshTicketsButton } from '@/components/tickets/refresh-tickets-button'
import { ExternalLink, AlertCircle, Inbox, Clock, CheckCircle2, Hash } from 'lucide-react'

// ── State badge ───────────────────────────────────────────────────────────────

function StateBadge({ ticket }: { ticket: ZammadTicket }) {
  const cls: Record<string, string> = {
    open:    'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    closed:  'bg-muted text-muted-foreground border-border',
    unknown: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border font-medium ${cls[ticket.stateCategory]}`}>
      {ticket.stateName}
    </span>
  )
}

// ── Priority badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ ticket }: { ticket: ZammadTicket }) {
  const name = ticket.priorityName.toLowerCase()
  let cls = 'bg-muted text-muted-foreground border-border'
  if (name.includes('urgent') || name.includes('très haute') || name.includes('critical')) {
    cls = 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
  } else if (name.includes('high') || name.includes('haute')) {
    cls = 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
  } else if (name.includes('low') || name.includes('basse')) {
    cls = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }
  return (
    <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border ${cls}`}>
      {ticket.priorityName}
    </span>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, colorClass,
}: {
  label: string
  value: number
  icon: React.ElementType
  colorClass: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg border ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value.toLocaleString('fr-FR')}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function ClosedStatCard({
  total, billing, billingLabel,
}: {
  total: number
  billing: number | null
  billingLabel: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className="p-2.5 rounded-lg border bg-muted text-muted-foreground border-border">
        <CheckCircle2 size={18} />
      </div>
      <div className="flex items-stretch flex-1 min-w-0">
        <div className={billing !== null ? 'flex-1' : ''}>
          <div className="text-2xl font-bold tabular-nums">{total.toLocaleString('fr-FR')}</div>
          <div className="text-xs text-muted-foreground">Fermés</div>
        </div>
        {billing !== null && (
          <>
            <div className="w-px bg-border self-stretch mx-4" />
            <div className="flex-1">
              <div className="text-2xl font-bold tabular-nums">{billing.toLocaleString('fr-FR')}</div>
              <div className="text-xs text-muted-foreground">{billingLabel}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId  = session.user.id
  const role    = session.user.role
  const isAdmin = role === 'ADMIN'
  const accessFilter = isAdmin ? {} : { users: { some: { userId } } }

  const zammadUrl = process.env.ZAMMAD_URL ?? ''

  // Find the client's Zammad org name (= client name in Thor)
  let orgName: string | undefined
  let billingPeriod: string = 'monthly'
  if (selectedClientId) {
    const client = await prisma.client.findFirst({
      where: isAdmin
        ? { id: selectedClientId }
        : { id: selectedClientId, users: { some: { userId } } },
      select: { name: true, billingPeriod: true },
    })
    orgName = client?.name
    billingPeriod = client?.billingPeriod ?? 'monthly'
  }

  const billingStart = (() => {
    const now = new Date()
    if (billingPeriod === 'quarterly') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      return new Date(now.getFullYear(), quarterMonth, 1)
    }
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })()

  const [dash, closedSinceBilling] = await Promise.all([
    fetchZammadDashboard(orgName),
    selectedClientId
      ? countClosedTicketsSince(orgName, billingStart)
      : Promise.resolve(null),
  ])

  const allClients = await prisma.client.findMany({
    where: accessFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          {orgName && (
            <p className="text-xs text-muted-foreground mt-0.5">{orgName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RefreshTicketsButton />
          {zammadUrl && (
            <a
              href={zammadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <ExternalLink size={13} /> Ouvrir Zammad
            </a>
          )}
        </div>
      </div>

      {/* Not configured */}
      {!dash.configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-700 dark:text-amber-400">
          Zammad n'est pas configuré. Renseignez <code className="font-mono text-xs">ZAMMAD_URL</code> et{' '}
          <code className="font-mono text-xs">ZAMMAD_TOKEN</code> dans votre fichier <code className="font-mono text-xs">.env.local</code>.
        </div>
      )}

      {/* Error */}
      {dash.configured && dash.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2 mb-6">
          <AlertCircle size={16} />
          {dash.error}
        </div>
      )}

      {/* Stats */}
      {dash.configured && !dash.error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Ouverts / Nouveaux"
              value={dash.countOpen}
              icon={Inbox}
              colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            />
            <StatCard
              label="En attente"
              value={dash.countPending}
              icon={Clock}
              colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            />
            <ClosedStatCard
              total={dash.countClosed}
              billing={closedSinceBilling}
              billingLabel="sur la période en cours"
            />
            <StatCard
              label="Total"
              value={dash.totalCount}
              icon={Hash}
              colorClass="bg-muted text-muted-foreground border-border"
            />
          </div>

          {/* Recent tickets */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tickets ouverts / en attente
              </span>
            </div>

            {dash.tickets.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Aucun ticket trouvé.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {dash.tickets.map((ticket) => (
                  <a
                    key={ticket.id}
                    href={zammadUrl ? `${zammadUrl.replace(/\/$/, '')}/#ticket/zoom/${ticket.id}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                  >
                    {/* Ticket number */}
                    <span className="flex-shrink-0 text-xs font-mono text-muted-foreground mt-0.5 w-14">
                      #{ticket.number}
                    </span>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                        {ticket.orgName && <span>{ticket.orgName}</span>}
                        {ticket.customerName && (
                          <>
                            {ticket.orgName && <span className="text-border">·</span>}
                            <span>{ticket.customerName}</span>
                          </>
                        )}
                        {ticket.ownerName && (
                          <>
                            <span className="text-border">·</span>
                            <span>→ {ticket.ownerName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges + date */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge ticket={ticket} />
                        <StateBadge ticket={ticket} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.updated_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short',
                        })}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  )
}
