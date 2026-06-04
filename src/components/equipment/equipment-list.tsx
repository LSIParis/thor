'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteEquipment } from '@/actions/equipment'
import { CalendarDays, ShieldCheck, UserRound } from 'lucide-react'
import type { Equipment, Contact } from '@prisma/client'

type EquipmentWithContact = Equipment & { assignedTo: Contact | null }

interface EquipmentListProps {
  equipment: EquipmentWithContact[]
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
          <div key={item.id} className="p-3 rounded bg-secondary flex items-start gap-3">

            {/* Vignette photo */}
            {item.photoPath ? (
              <a href={item.photoPath} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                <Image
                  src={item.photoPath}
                  alt={`${item.brand} ${item.model}`}
                  width={56}
                  height={56}
                  className="rounded object-cover border border-border"
                />
              </a>
            ) : (
              <div className="flex-shrink-0 w-14 h-14 rounded border border-border bg-muted flex items-center justify-center text-muted-foreground text-xs">
                📷
              </div>
            )}

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{item.type}</Badge>
                {item.operatingSystem && (
                  <Badge variant="secondary" className="text-xs">{item.operatingSystem}</Badge>
                )}
                <span className="font-medium text-sm">
                  {[item.brand, item.model].filter(Boolean).join(' ') || '—'}
                </span>
                {item.ipType && (
                  <Badge className="text-xs bg-muted text-muted-foreground border border-border">{item.ipType}</Badge>
                )}
              </div>

              <div className="text-muted-foreground text-xs mt-1 space-y-0.5">
                {item.serialNumber && <div>S/N : <span className="font-mono">{item.serialNumber}</span></div>}
                {item.ipAddress && <div>IP : <span className="font-mono">{item.ipAddress}</span></div>}
                <div className="flex items-center gap-3 mt-1">
                  {item.purchaseDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} />
                      {new Date(item.purchaseDate).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {item.warrantyDuration && (
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={11} />
                      {item.warrantyDuration}
                    </span>
                  )}
                </div>
                {item.assignedTo && (
                  <span className="flex items-center gap-1 mt-1">
                    <UserRound size={11} />
                    {item.assignedTo.firstName} {item.assignedTo.lastName}
                    {item.assignedTo.role && ` — ${item.assignedTo.role}`}
                  </span>
                )}
                {item.notes && <div className="italic">{item.notes}</div>}
              </div>
            </div>

            {canEdit && (
              <form action={deleteWithIds} className="flex-shrink-0">
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
