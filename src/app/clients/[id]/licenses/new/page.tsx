import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createLicense } from '@/actions/licenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function NewLicensePage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('licenses')

  const createWithClientId = createLicense.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createWithClientId} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="publisher">{t('publisher')}</Label>
            <Input id="publisher" name="publisher" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="expiryDate">{t('expiryDate')}</Label>
              <Input id="expiryDate" name="expiryDate" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="seats">{t('seats')}</Label>
              <Input id="seats" name="seats" type="number" min="1" />
            </div>
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
