import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { createEquipment } from '@/actions/equipment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

const EQUIPMENT_TYPES = [
  'Serveur',
  'PC Fixe',
  'PC Portable',
  'Mac Fixe',
  'Mac Portable',
  'Switch',
  'Routeur / Firewall',
  'Imprimante Personnelle',
  'Imprimante Départementale',
  'Box Internet',
  'Autre',
]

const IP_TYPES = ['DHCP', 'Statique', 'Publique', 'Lien-local (APIPA)', 'Autre']

const OS_LIST = [
  'Windows Client',
  'Windows Server',
  'Linux Ubuntu',
  'Linux Debian',
  'Linux Fedora',
  'Mac OS',
  'Autre',
]

export default async function NewEquipmentPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('equipment')

  const contacts = await prisma.contact.findMany({
    where: { clientId: id },
    orderBy: { lastName: 'asc' },
  })

  const createWithClientId = createEquipment.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createWithClientId} encType="multipart/form-data" className="space-y-5">

          {/* Type + OS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="type">{t('type')} *</Label>
              <select
                id="type"
                name="type"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="operatingSystem">Système d'exploitation</Label>
              <select
                id="operatingSystem"
                name="operatingSystem"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Non spécifié</option>
                {OS_LIST.map((os) => (
                  <option key={os} value={os}>{os}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marque + Modèle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="brand">{t('brand')}</Label>
              <Input id="brand" name="brand" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model">{t('model')}</Label>
              <Input id="model" name="model" />
            </div>
          </div>

          {/* N° de série + Attribué à */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="serialNumber">{t('serialNumber')}</Label>
              <Input id="serialNumber" name="serialNumber" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assignedToId">Attribué à</Label>
              <select
                id="assignedToId"
                name="assignedToId"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Non attribué</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}{c.role ? ` (${c.role})` : ''}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun contact — <Link href={`/clients/${id}/contacts/new`} className="underline">en créer un</Link></p>
              )}
            </div>
          </div>

          {/* IP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ipAddress">{t('ipAddress')}</Label>
              <Input id="ipAddress" name="ipAddress" placeholder="192.168.1.x" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ipType">Type d'IP</Label>
              <select
                id="ipType"
                name="ipType"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Non spécifié</option>
                {IP_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date d'achat + Garantie */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="purchaseDate">Date d'achat</Label>
              <Input id="purchaseDate" name="purchaseDate" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="warrantyDuration">Durée de garantie</Label>
              <Input
                id="warrantyDuration"
                name="warrantyDuration"
                placeholder="ex: 3 ans, 24 mois"
              />
            </div>
          </div>

          {/* Photo */}
          <div className="space-y-1">
            <Label htmlFor="photo">Photo de l'asset</Label>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:text-foreground"
            />
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP — max recommandé 5 Mo</p>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input id="noSync" type="checkbox" name="noSync" value="true" className="rounded border-input" />
            <Label htmlFor="noSync" className="text-sm font-normal cursor-pointer">Pas de synchronisation</Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('save')}</Button>
            <Button variant="ghost" asChild>
              <Link href={`/clients/${id}`}>{t('cancel')}</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
