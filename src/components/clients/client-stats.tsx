import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Contact, Monitor, Key, LayoutGrid, Cloud, Phone, AlertTriangle, Users, Server, PhoneCall } from 'lucide-react'

interface ClientStatsProps {
  contactsCount: number
  equipmentCount: number
  licensesCount: number
  licensesExpiringSoon: number
  m365TenantsCount: number
  m365AccountsCount: number
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
  contactsCount, equipmentCount, licensesCount, licensesExpiringSoon,
  m365TenantsCount, m365AccountsCount,
  nextcloudServicesCount, nextcloudServersCount,
  voipServicesCount, voipExtensionsCount,
}: ClientStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3 mb-6">
      <StatCard label="Contacts"          value={contactsCount}          icon={Contact} />
      <StatCard label="Équipements"        value={equipmentCount}         icon={Monitor} />
      <StatCard label="Licences"           value={licensesCount}          icon={Key} />
      <StatCard label="Exp. < 30 j."      value={licensesExpiringSoon}   icon={AlertTriangle} warning />
      <StatCard label="Tenants M365"       value={m365TenantsCount}       icon={LayoutGrid} />
      <StatCard label="Comptes M365"       value={m365AccountsCount}      icon={Users} />
      <StatCard label="Services NC"        value={nextcloudServicesCount} icon={Cloud} />
      <StatCard label="Serveurs NC"        value={nextcloudServersCount}  icon={Server} />
      <StatCard label="Services VoIP"      value={voipServicesCount}      icon={Phone} />
      <StatCard label="Extensions VoIP"   value={voipExtensionsCount}    icon={PhoneCall} />
    </div>
  )
}
