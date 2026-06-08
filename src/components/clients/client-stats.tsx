import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Contact, Monitor, Globe, Shield, Server, Cloud, Phone, AlertTriangle } from 'lucide-react'

interface ClientStatsProps {
  contactsCount: number
  equipmentCount: number
  dnsZonesCount: number
  sslCertsCount: number
  hostingsCount: number
  certsExpiringSoon: number
  domainsExpiringSoon: number
  nextcloudServicesCount: number
  nextcloudServersCount: number
  voipServicesCount: number
  voipExtensionsCount: number
}

function StatCard({ label, value, icon: Icon, warning = false }: {
  label: string; value: number; icon: React.ElementType; warning?: boolean
}) {
  return (
    <Card className={warning && value > 0 ? 'border-yellow-600/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{label}</CardTitle>
        <Icon size={14} className={warning && value > 0 ? 'text-yellow-500' : 'text-primary'} />
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className={`text-2xl font-bold ${warning && value > 0 ? 'text-yellow-500' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

export function ClientStats({
  contactsCount, equipmentCount,
  dnsZonesCount, sslCertsCount, hostingsCount, certsExpiringSoon,
  nextcloudServicesCount,
  voipServicesCount,
}: ClientStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      <StatCard label="Contacts"         value={contactsCount}          icon={Contact} />
      <StatCard label="Équipements"       value={equipmentCount}         icon={Monitor} />
      <StatCard label="Zones DNS"         value={dnsZonesCount}          icon={Globe} />
      <StatCard label="Certifs SSL"       value={sslCertsCount}          icon={Shield} />
      <StatCard label="Hébergements"      value={hostingsCount}          icon={Server} />
      <StatCard label="Certs exp. < 30j" value={certsExpiringSoon}      icon={AlertTriangle} warning />
      <StatCard label="Nextcloud"         value={nextcloudServicesCount} icon={Cloud} />
      <StatCard label="Services VoIP"     value={voipServicesCount}      icon={Phone} />
    </div>
  )
}
