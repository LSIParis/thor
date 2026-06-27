import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SettingsPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  const rmmUrl = process.env.RMM_BASE_URL ?? ''
  const rmmConfigured = Boolean(process.env.RMM_API_KEY)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('settings')}</h1>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t('rmmUrl')}</Label>
            <Input
              value={rmmUrl || '—'}
              readOnly
              className="bg-muted text-muted-foreground cursor-default"
            />
          </div>
          <div className="space-y-1">
            <Label>{t('rmmApiKey')}</Label>
            <Input
              value={rmmConfigured ? '••••••••' : '—'}
              readOnly
              className="bg-muted text-muted-foreground cursor-default"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Ces paramètres sont définis dans le fichier <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> du serveur.
            Pour les modifier, éditez ce fichier puis redémarrez l&apos;application.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
