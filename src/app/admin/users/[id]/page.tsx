import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { assignClientToUser, unassignClientFromUser, updateUser, changePassword } from '@/actions/users'
import { PasswordChangeForm } from '@/components/admin/password-change-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

const ROLE_LABELS = { ADMIN: 'Admin', TECH: 'Tech', CLIENT: 'Client' }

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()

  const [user, allClients] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { clients: { include: { client: true } } },
    }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!user) notFound()

  const assignedClientIds = new Set(user.clients.map((uc) => uc.clientId))
  const unassigned = allClients.filter((c) => !assignedClientIds.has(c.id))
  const assignWithUserId = assignClientToUser.bind(null, id)
  const updateWithId = updateUser.bind(null, id)
  const changePasswordWithId = changePassword.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">← Retour</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{user.name}</h1>
              <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>

        {/* Informations */}
        <div className="rounded-lg border border-border p-5 space-y-4">
          <h2 className="font-medium text-sm">Informations</h2>
          <form action={updateWithId} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input name="name" defaultValue={user.name} required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input name="email" type="email" defaultValue={user.email} required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rôle</Label>
              <select name="role" defaultValue={user.role}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="ADMIN">Admin</option>
                <option value="TECH">Tech</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
            <Button type="submit" size="sm">Sauvegarder</Button>
          </form>
        </div>

        {/* Mot de passe */}
        <PasswordChangeForm action={changePasswordWithId} />

        {/* Clients assignés */}
        {(user.role === 'TECH' || user.role === 'CLIENT') && (
          <div className="rounded-lg border border-border p-5 space-y-4">
            <h2 className="font-medium text-sm">Clients assignés</h2>
            <div className="space-y-2">
              {user.clients.map(({ client }) => {
                const unassignWithIds = unassignClientFromUser.bind(null, id, client.id)
                return (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded bg-muted/40">
                    <span className="text-sm">{client.name}</span>
                    <form action={unassignWithIds}>
                      <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                        Retirer
                      </Button>
                    </form>
                  </div>
                )
              })}
              {user.clients.length === 0 && (
                <p className="text-muted-foreground text-sm">Aucun client assigné</p>
              )}
            </div>
            {unassigned.length > 0 && (
              <form action={assignWithUserId} className="flex gap-2">
                <select name="clientId"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {unassigned.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button type="submit">Assigner</Button>
              </form>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
