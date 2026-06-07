import { requireAuth } from '@/lib/access'
import { fetchDesk365Tickets } from '@/lib/desk365'
import { AlertCircle, CheckCircle2, Clock, Inbox, AlertTriangle, Zap, Minus, ChevronUp, ExternalLink } from 'lucide-react'
import { AddTicketDialog } from '@/components/tickets/add-ticket-dialog'

const PRIORITY_LABEL: Record<number, string> = { 1: 'Faible', 5: 'Moyen', 10: 'Élevé', 20: 'Urgent' }
const PRIORITY_COLOR: Record<number, string> = {
  1: 'text-slate-500',
  5: 'text-blue-500',
  10: 'text-amber-500',
  20: 'text-red-500',
}
const PRIORITY_ICON: Record<number, React.ReactNode> = {
  1: <Minus size={12} />,
  5: <ChevronUp size={12} />,
  10: <AlertTriangle size={12} />,
  20: <Zap size={12} />,
}

const STATUS_COLOR: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export default async function TicketsPage() {
  await requireAuth()

  const subdomain = process.env.DESK365_SUBDOMAIN ?? ''
  const { tickets, total } = await fetchDesk365Tickets()

  const byStatus = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  const byPriority = tickets
    .filter((t) => t.status === 'Open' || t.status === 'Pending')
    .reduce<Record<number, number>>((acc, t) => {
      acc[t.priority] = (acc[t.priority] ?? 0) + 1
      return acc
    }, {})

  const byType = tickets
    .filter((t) => t.status === 'Open' || t.status === 'Pending')
    .reduce<Record<string, number>>((acc, t) => {
      const k = t.type ?? 'Autre'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})

  const byAgent = tickets
    .filter((t) => t.status === 'Open' || t.status === 'Pending')
    .reduce<Record<string, number>>((acc, t) => {
      const k = t.assigned_to ?? 'Non assigné'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})

  const recent = [...tickets]
    .filter((t) => t.status === 'Open' || t.status === 'Pending')
    .sort((a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime())
    .slice(0, 30)

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-muted-foreground">{total} tickets au total dans Desk365</p>
        </div>
        <AddTicketDialog />
      </div>

      {/* Stats par statut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Ouverts" value={byStatus['Open'] ?? 0} icon={<Inbox size={18} />} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="En attente" value={byStatus['Pending'] ?? 0} icon={<Clock size={18} />} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard label="Résolus" value={byStatus['Resolved'] ?? 0} icon={<CheckCircle2 size={18} />} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard label="Fermés" value={byStatus['Closed'] ?? 0} icon={<AlertCircle size={18} />} color="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Par priorité */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Priorité <span className="text-muted-foreground font-normal">(ouverts + en attente)</span></h2>
          <div className="space-y-2">
            {[20, 10, 5, 1].map((p) => (
              <div key={p} className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-sm ${PRIORITY_COLOR[p]}`}>
                  {PRIORITY_ICON[p]} {PRIORITY_LABEL[p]}
                </div>
                <span className="font-medium text-sm">{byPriority[p] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Par type */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Type <span className="text-muted-foreground font-normal">(ouverts + en attente)</span></h2>
          <div className="space-y-2">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm">{type}</span>
                <span className="font-medium text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Par technicien */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Par technicien <span className="text-muted-foreground font-normal">(ouverts + en attente)</span></h2>
          <div className="space-y-2">
            {Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([agent, count]) => (
              <div key={agent} className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{agent.split('@')[0]}</span>
                <span className="font-medium text-sm shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets ouverts/en attente récents */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Tickets ouverts / en attente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Sujet</th>
                <th className="px-4 py-2 text-left">Société</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">Priorité</th>
                <th className="px-4 py-2 text-left">Technicien</th>
                <th className="px-4 py-2 text-left">Créé le</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((t) => (
                <tr key={t.ticket_number} className="hover:bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{t.ticket_number}</td>
                  <td className="px-4 py-2 max-w-[280px]">
                    <span className="truncate block" title={t.subject}>{t.subject}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground truncate max-w-[140px]">{t.company_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[t.status] ?? ''}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`flex items-center gap-1 ${PRIORITY_COLOR[t.priority] ?? ''}`}>
                      {PRIORITY_ICON[t.priority]} {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{t.assigned_to?.split('@')[0] ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{fmt(t.created_on)}</td>
                  <td className="px-4 py-2 shrink-0">
                    <a
                      href={`https://${subdomain}.desk365.io/agent/tickets/${t.ticket_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary whitespace-nowrap"
                    >
                      <ExternalLink size={12} /> Consulter
                    </a>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucun ticket ouvert</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
