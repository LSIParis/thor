import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { updateContact } from '@/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string; contactId: string }> }

export default async function EditContactPage({ params }: Props) {
  const { id, contactId } = await params
  await requireAdmin()
  const t = await getTranslations('contacts')

  const contact = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!contact || contact.clientId !== id) notFound()

  const updateWithIds = updateContact.bind(null, contactId, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">
          Modifier — {contact.firstName} {contact.lastName}
        </h1>
        <form action={updateWithIds} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">{t('firstName')} *</Label>
              <Input id="firstName" name="firstName" defaultValue={contact.firstName} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t('lastName')} *</Label>
              <Input id="lastName" name="lastName" defaultValue={contact.lastName} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">{t('role')}</Label>
            <Input id="role" name="role" defaultValue={contact.role ?? ''} placeholder="ex: DSI, Gérant..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" defaultValue={contact.email ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={contact.phone ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={contact.notes ?? ''}
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
