import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { ImportPanel } from '@/components/admin/import-panel'

export default async function ImportPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  return (
    <>
      <h1 className="text-2xl font-semibold mb-2">{t('import')}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Importe les clients depuis Tactical RMM. Les clients existants seront mis à jour si leur nom a changé.
      </p>
      <ImportPanel />
    </>
  )
}
