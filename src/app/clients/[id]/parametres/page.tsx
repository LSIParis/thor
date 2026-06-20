import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { updateClientBilling, addClientUser, removeClientUser } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Users, LayoutGrid, Receipt, ChevronLeft, CheckCircle2, XCircle, HardDrive } from 'lucide-react'
import { decrypt } from '@/lib/crypto'
import { CredentialReveal } from '@/components/ui/credential-reveal'

interface Props { params: Promise<{ id: string }> }

export default async function ClientParametresPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      billingPeriod: true,
      cometUsername: true,
      cometPassword: true,
      users: {
        select: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { user: { name: 'asc' } },
      },
      m365Tenants: {
        select: {
          id: true,
          displayName: true,
          tenantId: true,
          azureClientId: true,
          azureClientSecret: true,
        },
        orderBy: { displayName: 'asc' },
      },
    },
  })
  if (!client) notFound()

  const linkedIds = new Set(client.users.map(u => u.user.id))
  const availableUsers = await prisma.user.findMany({
    where: { id: { notIn: [...linkedIds] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const updateBillingAction = updateClientBilling.bind(null, id)
  const addUserAction = addClientUser.bind(null, id)

  const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', TECH: 'Technicien', CLIENT: 'Client' }

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/clients/${id}`}
            className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Paramètres</h1>
            <p className="text-xs text-muted-foreground">{client.name}</p>
          </div>
        </div>

        {/* ── Comptes autorisés ─────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <Users size={14} className="text-primary" />
            <span className="text-sm font-semibold">Comptes autorisés</span>
          </div>

          {client.users.length > 0 ? (
            <div className="divide-y divide-border">
              {client.users.map(({ user }) => {
                const removeAction = removeClientUser.bind(null, id, user.id)
                return (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <span className="text-[11px] px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground flex-shrink-0">
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                    <form action={removeAction}>
                      <button type="submit"
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors flex-shrink-0">
                        Retirer
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Aucun compte autorisé pour ce client.
            </p>
          )}

          {availableUsers.length > 0 && (
            <form action={addUserAction}
              className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/20">
              <select name="userId" required
                className="flex-1 text-sm border border-input rounded-md px-2 py-1.5 bg-background">
                <option value="">— Sélectionner un compte —</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <Button type="submit" size="sm">Ajouter</Button>
            </form>
          )}
        </section>

        {/* ── Microsoft 365 ─────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <LayoutGrid size={14} className="text-primary" />
              <span className="text-sm font-semibold">Microsoft 365</span>
            </div>
            <Link href={`/m365?client=${id}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Gérer →
            </Link>
          </div>

          {client.m365Tenants.length > 0 ? (
            <div className="divide-y divide-border">
              {client.m365Tenants.map(tenant => (
                <div key={tenant.id} className="px-4 py-3 space-y-2">
                  <p className="text-sm font-medium">{tenant.displayName}</p>
                  <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Tenant ID</span>
                    <span className="font-mono truncate">{tenant.tenantId ?? '—'}</span>

                    <span className="text-muted-foreground">Client ID (Azure)</span>
                    <span className="font-mono truncate">{tenant.azureClientId ?? '—'}</span>

                    <span className="text-muted-foreground">Secret</span>
                    <span className="flex items-center gap-1">
                      {tenant.azureClientSecret
                        ? <><CheckCircle2 size={12} className="text-emerald-600" /><span className="text-emerald-700 dark:text-emerald-400">Configuré</span></>
                        : <><XCircle size={12} className="text-amber-600" /><span className="text-amber-700 dark:text-amber-400">Non configuré</span></>
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Aucun tenant Microsoft 365 configuré.{' '}
              <Link href={`/m365?client=${id}`} className="text-primary hover:underline">Ajouter →</Link>
            </p>
          )}
        </section>

        {/* ── Comet Backup ─────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-primary" />
              <span className="text-sm font-semibold">Comet Backup</span>
            </div>
            <Link href={`/clients/${id}/edit`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Modifier →
            </Link>
          </div>

          {client.cometUsername ? (
            <div className="px-4 py-3">
              <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-muted-foreground self-center">Identifiant</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono">{client.cometUsername}</span>
                </span>

                <span className="text-muted-foreground self-center">Mot de passe</span>
                {client.cometPassword ? (
                  <CredentialReveal value={decrypt(client.cometPassword)} />
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle size={12} className="text-amber-600" />
                    <span className="text-amber-700 dark:text-amber-400">Non configuré</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Aucun compte Comet Backup configuré.{' '}
              <Link href={`/clients/${id}/edit`} className="text-primary hover:underline">Configurer →</Link>
            </p>
          )}
        </section>

        {/* ── Facturation ───────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <Receipt size={14} className="text-primary" />
            <span className="text-sm font-semibold">Facturation</span>
          </div>

          <form action={updateBillingAction} className="px-4 py-4 space-y-3">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Période</Label>
              <div className="flex gap-4">
                {[
                  { value: 'monthly',   label: 'Mensuelle' },
                  { value: 'quarterly', label: 'Trimestrielle' },
                ].map(opt => (
                  <label key={opt.value}
                    className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="billingPeriod"
                      value={opt.value}
                      defaultChecked={client.billingPeriod === opt.value}
                      className="accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm">Enregistrer</Button>
          </form>
        </section>

      </div>
    </AppLayout>
  )
}
