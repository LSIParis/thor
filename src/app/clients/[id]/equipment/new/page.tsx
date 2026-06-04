import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
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

export default async function NewEquipmentPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('equipment')

  const createWithClientId = createEquipment.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createWithClientId} className="space-y-4">
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
          <div className="space-y-1">
            <Label htmlFor="serialNumber">{t('serialNumber')}</Label>
            <Input id="serialNumber" name="serialNumber" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ipAddress">{t('ipAddress')}</Label>
            <Input id="ipAddress" name="ipAddress" placeholder="192.168.1.x" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
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
