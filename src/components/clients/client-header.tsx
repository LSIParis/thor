import { Phone, Mail, MapPin, Cloud, HardDrive, BellOff } from 'lucide-react'
import { ClientMenu } from './client-menu'

type ClientWithCounts = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  hasM365: boolean
  cometUsername: string | null
  noSync: boolean
  _counts: {
    contacts: number
    equipment: number
    dnsTotal: number
    nextcloud: number
    voip: number
    movements: number
  }
}

interface ClientHeaderProps {
  client: ClientWithCounts
  isAdmin: boolean
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function ClientHeader({ client, isAdmin }: ClientHeaderProps) {
  const { _counts: c } = client

  return (
    <div className="bg-card border border-border rounded-lg mb-6 overflow-hidden">
      {/* Ligne titre */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60">
        <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
        {isAdmin && <ClientMenu clientId={client.id} clientName={client.name} />}
      </div>

      {/* Corps 3 colonnes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {/* Col 1 — Coordonnées */}
        <div className="px-5 py-4 space-y-1.5">
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone size={13} className="shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail size={13} className="shrink-0" />
              <span>{client.email}</span>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={13} className="shrink-0" />
              <span>{client.address}</span>
            </div>
          )}
          {!client.phone && !client.email && !client.address && (
            <span className="text-xs text-muted-foreground/50">Aucune coordonnée</span>
          )}
        </div>

        {/* Col 2 — Stats */}
        <div className="px-5 py-4 space-y-1">
          <StatRow label="Contacts"          value={c.contacts} />
          <StatRow label="Équipements"        value={c.equipment} />
          <StatRow label="DNS · SSL · Héb."   value={c.dnsTotal} />
          {c.nextcloud > 0 && <StatRow label="Nextcloud"   value={c.nextcloud} />}
          {c.voip > 0      && <StatRow label="VoIP"        value={c.voip} />}
          {c.movements > 0 && <StatRow label="Mouvements"  value={c.movements} />}
        </div>

        {/* Col 3 — Badges */}
        <div className="px-5 py-4 flex flex-col gap-2">
          {client.hasM365 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Cloud size={13} /> Microsoft 365
            </span>
          )}
          {client.cometUsername && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <HardDrive size={13} /> Comet Backup
            </span>
          )}
          {client.noSync && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BellOff size={13} /> Sync désactivée
            </span>
          )}
          {!client.hasM365 && !client.cometUsername && !client.noSync && (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
