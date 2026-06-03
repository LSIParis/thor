import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createContact } from '@/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function NewContactPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('contacts')

  const createWithClientId = createContact.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createWithClientId} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">{t('firstName')} *</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t('lastName')} *</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">{t('role')}</Label>
            <Input id="role" name="role" placeholder="ex: DSI, Gérant..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" name="phone" type="tel" />
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
