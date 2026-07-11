import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { updateClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 bg-muted/30">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ id, name, defaultChecked, label, description }: {
  id: string; name: string; defaultChecked: boolean; label: string; description?: string
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 cursor-pointer group">
      <div>
        <p className="text-sm font-medium group-hover:text-foreground transition-colors">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="relative shrink-0">
        <input
          id={id}
          type="checkbox"
          name={name}
          value="true"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-9 h-5 rounded-full bg-input transition-colors peer-checked:bg-primary" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
    </label>
  )
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, name: true, address: true, phone: true, email: true, notes: true, noSync: true, hasM365: true, cometUsername: true, cometPassword: true },
  })
  if (!client) notFound()

  const updateWithId = updateClient.bind(null, id)

  return (
    <div className="max-w-2xl">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
          <Link href={`/clients/${id}`} aria-label="Retour">
            <ArrowLeft size={16} />
          </Link>
        </Button>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Modifier</p>
          <h1 className="text-xl font-semibold leading-tight">{client.name}</h1>
        </div>
      </div>

      <form action={updateWithId} className="space-y-4">
        {/* Section Coordonnées */}
        <SectionCard title="Coordonnées">
          <div className="space-y-1">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" name="name" defaultValue={client.name} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <PhoneInput name="phone" defaultValue={client.phone ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={client.email ?? ''} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" name="address" defaultValue={client.address ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes internes</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={client.notes ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </SectionCard>

        {/* Section Comet Backup */}
        <SectionCard title="Comet Backup">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cometUsername">Identifiant</Label>
              <Input
                id="cometUsername"
                name="cometUsername"
                defaultValue={client.cometUsername ?? ''}
                placeholder="ex: clientabc"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cometPassword">Mot de passe</Label>
              <Input
                id="cometPassword"
                name="cometPassword"
                type="password"
                autoComplete="new-password"
                placeholder={client.cometPassword ? '(inchangé si vide)' : 'Nouveau mot de passe'}
              />
            </div>
          </div>
        </SectionCard>

        {/* Section Options */}
        <SectionCard title="Options">
          <Toggle
            id="hasM365"
            name="hasM365"
            defaultChecked={client.hasM365}
            label="Compte Microsoft 365"
            description="Ce client dispose d'un abonnement M365"
          />
          <div className="border-t border-border/60" />
          <Toggle
            id="noSync"
            name="noSync"
            defaultChecked={client.noSync}
            label="Pas de synchronisation"
            description="Exclure ce client des synchronisations automatiques"
          />
        </SectionCard>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button type="submit">Enregistrer</Button>
          <Button variant="ghost" asChild>
            <Link href={`/clients/${id}`}>Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
