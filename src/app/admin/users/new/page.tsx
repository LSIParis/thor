import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createUser } from '@/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function NewUserPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('newUser')}</h1>
        <form action={createUser} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')} *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t('password')} *</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">{t('role')}</Label>
            <select
              id="role"
              name="role"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="TECH">{t('roles.TECH')}</option>
              <option value="ADMIN">{t('roles.ADMIN')}</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('saveSettings')}</Button>
            <Button variant="ghost" asChild>
              <Link href="/admin/users">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
