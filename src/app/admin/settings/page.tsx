import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { saveRmmSettings } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SettingsPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  const [urlSetting, keySetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
  ])

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('settings')}</h1>
        <form action={saveRmmSettings} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rmmUrl">{t('rmmUrl')}</Label>
            <Input
              id="rmmUrl"
              name="rmmUrl"
              type="url"
              defaultValue={urlSetting?.value ?? ''}
              placeholder="https://rmm.lsi-maintenance.fr"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rmmApiKey">{t('rmmApiKey')}</Label>
            <Input
              id="rmmApiKey"
              name="rmmApiKey"
              type="password"
              defaultValue={keySetting ? '••••••••' : ''}
              placeholder={keySetting ? 'Laisser vide pour conserver' : 'Coller la clé API ici'}
            />
          </div>
          <Button type="submit">{t('saveSettings')}</Button>
        </form>
      </div>
    </AppLayout>
  )
}
