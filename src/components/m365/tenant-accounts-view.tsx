'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { labelSku, sortSkus, isHiddenSku } from '@/lib/m365-sku-labels'

interface Account {
  id: string
  displayName: string
  userPrincipalName: string
  jobTitle: string | null
  licensed: boolean
  licenseType: string | null
  licenseExpiry: Date | null
  accountEnabled: boolean
  m365CreatedAt: Date | null
}

interface LicenseSku {
  skuId: string
  skuPartNumber: string
  consumed: number
  total: number
}

function fmt(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function TenantAccountsView({
  accounts,
  licenseSkus,
  billingStart,
}: {
  accounts: Account[]
  licenseSkus: LicenseSku[]
  billingStart?: Date
}) {
  const [filters, setFilters] = useState<Set<string>>(new Set())
  const now = new Date()

  function toggle(sku: string) {
    setFilters((prev) => {
      const next = new Set(prev)
      next.has(sku) ? next.delete(sku) : next.add(sku)
      return next
    })
  }

  const displayed = filters.size > 0
    ? accounts.filter((a) => a.licenseType && [...filters].some((f) => a.licenseType!.includes(f)))
    : accounts

  return (
    <>
      {/* License SKUs */}
      {licenseSkus.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-muted/10 border-b border-border no-print">
          {sortSkus(licenseSkus.map((s) => s.skuPartNumber).filter((s) => !isHiddenSku(s))).map((skuPart) => {
            const sku = licenseSkus.find((s) => s.skuPartNumber === skuPart)!
            const pct      = sku.total > 0 ? sku.consumed / sku.total : 0
            const isActive = filters.has(sku.skuPartNumber)
            const countColor = pct >= 1
              ? 'text-destructive'
              : pct >= 0.9
              ? 'text-amber-600'
              : 'text-muted-foreground'
            return (
              <button
                key={sku.skuId}
                onClick={() => toggle(sku.skuPartNumber)}
                className={`inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 transition-colors border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-transparent hover:border-border'
                }`}
              >
                <span className={`font-medium ${isActive ? '' : 'text-foreground/70'}`}>
                  {labelSku(sku.skuPartNumber)}
                </span>
                <span className={`font-mono font-semibold ${isActive ? 'text-primary-foreground/80' : countColor}`}>
                  {sku.consumed}
                  <span className={`font-normal ${isActive ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    /{sku.total}
                  </span>
                </span>
              </button>
            )
          })}
          {filters.size > 0 && (
            <button
              onClick={() => setFilters(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Tout afficher
            </button>
          )}
        </div>
      )}

      {/* Accounts table */}
      {displayed.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Poste</th>
                <th className="px-4 py-2 text-left">Licence</th>
                <th className="px-4 py-2 text-left">Expiration</th>
                <th className="px-4 py-2 text-center">Actif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((account) => {
                const isExpired  = account.licenseExpiry && account.licenseExpiry < now
                const isExpiring = account.licenseExpiry && account.licenseExpiry >= now &&
                  account.licenseExpiry <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                const isNew = billingStart && account.m365CreatedAt && new Date(account.m365CreatedAt) >= billingStart
                const dim = isNew ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
                return (
                  <tr key={account.id} className="hover:bg-muted/20">
                    <td className={`px-4 py-2 font-medium ${isNew ? 'text-amber-500 dark:text-amber-400' : ''}`}>{account.displayName}</td>
                    <td className={`px-4 py-2 text-xs ${dim}`}>{account.userPrincipalName}</td>
                    <td className={`px-4 py-2 ${dim}`}>{account.jobTitle ?? '—'}</td>
                    <td className={`px-4 py-2 ${dim}`}>
                      {account.licenseType
                        ? account.licenseType.split(', ').map(labelSku).join(', ')
                        : '—'}
                    </td>
                    <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : dim}`}>
                      {fmt(account.licenseExpiry)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {account.licensed
                        ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                        : <XCircle     size={14} className="text-muted-foreground/40 mx-auto" />
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground/60 text-center">
          {filters.size > 0 ? `Aucun compte avec ${filters.size > 1 ? 'ces licences' : `la licence ${[...filters][0]}`}` : 'Aucun compte dans ce tenant'}
        </p>
      )}
    </>
  )
}
