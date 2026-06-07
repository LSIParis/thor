import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { createUser } from '@/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function NewUserPage() {
  await requireAdmin()
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } })

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-2">Nouvel utilisateur</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Un email d'activation sera envoyé pour que l'utilisateur définisse son propre mot de passe.
        </p>
        <form action={createUser} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Rôle</Label>
            <select id="role" name="role"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="TECH">Tech</option>
              <option value="ADMIN">Admin</option>
              <option value="CLIENT">Client (accès limité)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="clientId">
              Client associé <span className="text-muted-foreground text-xs">(requis pour le rôle Client)</span>
            </Label>
            <select id="clientId" name="clientId"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Aucun —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">Créer et envoyer l'invitation</Button>
            <Button variant="ghost" asChild>
              <Link href="/admin/users">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
