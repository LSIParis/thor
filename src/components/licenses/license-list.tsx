'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteLicense } from '@/actions/licenses'
import type { License } from '@prisma/client'

interface LicenseListProps {
  licenses: License[]
  clientId: string
  canEdit: boolean
}

function getLicenseStatus(expiryDate: Date | null) {
  if (!expiryDate) return null
  const now = Date.now()
  const diff = expiryDate.getTime() - now
  if (diff < 0) return 'expired'
  if (diff < 30 * 24 * 60 * 60 * 1000) return 'expiringSoon'
  return null
}

export function LicenseList({ licenses, clientId, canEdit }: LicenseListProps) {
  const t = useTranslations('licenses')

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="mb-4">
          <Button asChild size="sm">
            <Link href={`/clients/${clientId}/licenses/new`}>{t('new')}</Link>
          </Button>
        </div>
      )}
      {licenses.length === 0 && (
        <p className="text-muted-foreground text-sm">—</p>
      )}
      {licenses.map((lic) => {
        const status = getLicenseStatus(lic.expiryDate)
        const deleteWithIds = deleteLicense.bind(null, lic.id, clientId)
        return (
          <div key={lic.id} className="p-3 rounded bg-secondary flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{lic.name}</span>
                {status === 'expired' && (
                  <Badge variant="destructive">{t('expired')}</Badge>
                )}
                {status === 'expiringSoon' && (
                  <Badge className="bg-yellow-600 text-white">{t('expiringSoon')}</Badge>
                )}
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                {lic.publisher && `${lic.publisher} · `}
                {lic.seats && `${lic.seats} postes · `}
                {lic.expiryDate && `Exp: ${new Date(lic.expiryDate).toLocaleDateString('fr-FR')}`}
              </div>
            </div>
            {canEdit && (
              <form action={deleteWithIds}>
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  {t('delete')}
                </Button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
