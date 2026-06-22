import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { updateEquipment } from '@/actions/equipment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string; equipmentId: string }> }

const EQUIPMENT_TYPES = [
  'Serveur', 'PC Fixe', 'PC Portable', 'Mac Fixe', 'Mac Portable',
  'Switch', 'Routeur / Firewall', 'Imprimante Personnelle',
  'Imprimante Départementale', 'Box Internet', 'Autre',
]

const IP_TYPES = ['DHCP', 'Statique', 'Publique', 'Lien-local (APIPA)', 'Autre']

const OS_LIST = [
  'Windows Client', 'Windows Server',
  'Linux Ubuntu', 'Linux Debian', 'Linux Fedora',
  'Mac OS', 'Autre',
]

export default async function EditEquipmentPage({ params }: Props) {
  const { id, equipmentId } = await params
  await requireAdmin()

  const [equipment, sites, contacts] = await Promise.all([
    prisma.equipment.findUnique({ where: { id: equipmentId } }),
    prisma.site.findMany({
      where: { clientId: id },
      orderBy: [{ isDefault: 'desc' }, { isHeadquarters: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      where: { clientId: id, visible: true, isHistorical: false },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
  ])

  if (!equipment || equipment.clientId !== id) notFound()

  const updateWithIds = updateEquipment.bind(null, equipmentId, id)

  const purchaseDateStr = equipment.purchaseDate
    ? equipment.purchaseDate.toISOString().split('T')[0]
    : ''

  const contactLabel = (c: { firstName: string; lastName: string; role: string | null }) =>
    `${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}`

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-1">Modifier l'équipement</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {[equipment.brand, equipment.model].filter(Boolean).join(' ') || equipment.type}
        </p>

        <form action={updateWithIds} className="space-y-5">

          {/* Type + OS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                name="type"
                required
                defaultValue={equipment.type}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="operatingSystem">Système d'exploitation</Label>
              <select
                id="operatingSystem"
                name="operatingSystem"
                defaultValue={equipment.operatingSystem ?? ''}
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
              <Label htmlFor="brand">Marque</Label>
              <Input id="brand" name="brand" defaultValue={equipment.brand ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model">Modèle</Label>
              <Input id="model" name="model" defaultValue={equipment.model ?? ''} />
            </div>
          </div>

          {/* Site + Attribué à */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="siteId">Site</Label>
              <select
                id="siteId"
                name="siteId"
                defaultValue={equipment.siteId ?? ''}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Aucun site assigné</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="assignedToId">Attribué à</Label>
              <select
                id="assignedToId"
                name="assignedToId"
                defaultValue={equipment.assignedToId ?? ''}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Non attribué</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{contactLabel(c)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* N° de série */}
          <div className="space-y-1">
            <Label htmlFor="serialNumber">Numéro de série</Label>
            <Input
              id="serialNumber"
              name="serialNumber"
              defaultValue={equipment.serialNumber ?? ''}
              className="font-mono"
            />
          </div>

          {/* IP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ipAddress">Adresse IP</Label>
              <Input
                id="ipAddress"
                name="ipAddress"
                defaultValue={equipment.ipAddress ?? ''}
                placeholder="192.168.1.x"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ipType">Type d'IP</Label>
              <select
                id="ipType"
                name="ipType"
                defaultValue={equipment.ipType ?? ''}
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
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                defaultValue={purchaseDateStr}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="warrantyDuration">Durée de garantie</Label>
              <Input
                id="warrantyDuration"
                name="warrantyDuration"
                defaultValue={equipment.warrantyDuration ?? ''}
                placeholder="ex: 3 ans, 24 mois"
              />
            </div>
          </div>

          {/* Photo */}
          <div className="space-y-1">
            <Label htmlFor="photo">Nouvelle photo</Label>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:text-foreground"
            />
            {equipment.photoPath && (
              <p className="text-xs text-muted-foreground">Photo actuelle conservée si aucun fichier sélectionné.</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={equipment.notes ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input id="noSync" type="checkbox" name="noSync" value="true" defaultChecked={equipment.noSync} className="rounded border-input" />
            <Label htmlFor="noSync" className="text-sm font-normal cursor-pointer">Pas de synchronisation</Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit">Enregistrer</Button>
            <Button variant="ghost" asChild>
              <Link href={`/parc?client=${id}`}>Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
