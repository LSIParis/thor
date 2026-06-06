'use client'

import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#6366f1']

interface EquipmentByType { type: string; count: number }
interface DnsByRegistrar { registrar: string; count: number }
interface CertExpiry { month: string; count: number }
interface TopClient { name: string; count: number }

interface DashboardChartsProps {
  equipmentByType: EquipmentByType[]
  dnsByRegistrar: DnsByRegistrar[]
  certExpiry: CertExpiry[]
  topClientsByEquipment: TopClient[]
}

export function DashboardCharts({
  equipmentByType,
  dnsByRegistrar,
  certExpiry,
  topClientsByEquipment,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

      {/* Équipements par type */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Équipements par type</h2>
        {equipmentByType.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune donnée</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={equipmentByType} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
              <XAxis dataKey="type" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="count" name="Équipements" radius={[3, 3, 0, 0]}>
                {equipmentByType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* DNS par registrar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Zones DNS par registrar</h2>
        {dnsByRegistrar.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune donnée</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={dnsByRegistrar}
                dataKey="count"
                nameKey="registrar"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {dnsByRegistrar.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                formatter={(v, name) => [v, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Expirations SSL à venir */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Expirations SSL — 6 prochains mois</h2>
        {certExpiry.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune expiration à venir</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={certExpiry} margin={{ top: 0, right: 8, left: -20, bottom: 10 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Certificats" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top clients par équipements */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Top clients — équipements</h2>
        {topClientsByEquipment.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune donnée</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topClientsByEquipment} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Équipements" fill="#0ea5e9" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}
