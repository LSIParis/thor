import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { updateClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('clients')

  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) notFound()

  const updateWithId = updateClient.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('edit')}: {client.name}</h1>
        <form action={updateWithId} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" defaultValue={client.name} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">{t('address')}</Label>
            <Input id="address" name="address" defaultValue={client.address ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>{t('phone')}</Label>
            <PhoneInput name="phone" defaultValue={client.phone ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" defaultValue={client.email ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={client.notes ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
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
