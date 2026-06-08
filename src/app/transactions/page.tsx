import { requireAuth } from '@/lib/access'
import { Receipt } from 'lucide-react'

export default async function TransactionsPage() {
  await requireAuth()

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground">Suivi des transactions financières</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
        <Receipt size={40} strokeWidth={1.5} />
        <p className="text-sm">Aucune transaction pour le moment</p>
      </div>
    </div>
  )
}
