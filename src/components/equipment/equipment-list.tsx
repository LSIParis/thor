'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteEquipment } from '@/actions/equipment'
import type { Equipment } from '@prisma/client'

interface EquipmentListProps {
  equipment: Equipment[]
  clientId: string
  canEdit: boolean
}

export function EquipmentList({ equipment, clientId, canEdit }: EquipmentListProps) {
  const t = useTranslations('equipment')

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="mb-4">
          <Button asChild size="sm">
            <Link href={`/clients/${clientId}/equipment/new`}>{t('new')}</Link>
          </Button>
        </div>
      )}
      {equipment.length === 0 && (
        <p className="text-muted-foreground text-sm">—</p>
      )}
      {equipment.map((item) => {
        const deleteWithIds = deleteEquipment.bind(null, item.id, clientId)
        return (
          <div key={item.id} className="p-3 rounded bg-secondary flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.type}</Badge>
                <span className="font-medium text-sm">
                  {item.brand} {item.model}
                </span>
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                {item.serialNumber && `S/N: ${item.serialNumber}`}
                {item.ipAddress && ` · IP: ${item.ipAddress}`}
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
