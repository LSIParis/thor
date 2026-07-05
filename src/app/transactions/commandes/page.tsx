import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { ShoppingCart } from 'lucide-react'

export default async function CommandesPage() {
  await requireAuth()

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <ShoppingCart size={36} strokeWidth={1.5} className="opacity-30" />
        <p className="text-sm">Aucune intégration configurée</p>
      </div>
    </AppLayout>
  )
}
