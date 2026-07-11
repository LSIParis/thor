'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, TriangleAlert, X } from 'lucide-react'
import { CheckResultCard } from './check-result-card'
import { ZoneCheckButton } from './dns-check-panel'
import { DeleteDnsZoneButton } from './delete-dns-zone-button'
import { computeScore, computeGlobalScore, scoreColor } from '@/lib/dns/score'
import type { CheckPayload } from '@/lib/dns/types'

function fmt(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function CheckBadge({ status, checkedAt }: { status: string; checkedAt: Date }) {
  const date = checkedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  if (status === 'OK') return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium" title={`Vérifié le ${date}`}>
      <CheckCircle size={12} /> OK
    </span>
  )
  if (status === 'WARNING') return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium" title={`Vérifié le ${date}`}>
      <TriangleAlert size={12} /> Avertissement
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium" title={`Vérifié le ${date}`}>
      <XCircle size={12} /> Erreur
    </span>
  )
}

type CheckResult = {
  globalStatus: string
  checkedAt: Date
  spfValid: boolean
  dmarcValid: boolean
  dmarcPolicy: string | null
  dkimFound: boolean
  blacklistClean: boolean
  blacklistMinorCount: number | null
  details: unknown
}

type Zone = {
  id: string
  domain: string
  nameservers: string | null
  expiryDate: Date | null
  autoRenew: boolean
  client: { id: string; name: string }
  checkResults: CheckResult[]
}

interface DnsZoneTableProps {
  zones: Zone[]
  isAdmin: boolean
  selectedClientId: string | undefined
}

export function DnsZoneTable({ zones, isAdmin, selectedClientId }: DnsZoneTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const now  = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const selectedZone = zones.find(z => z.id === selectedId)
  const selectedCheck = selectedZone?.checkResults[0]
  const selectedPayload = selectedCheck?.details as CheckPayload | undefined

  function toggle(id: string) {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div className="mb-6">
      <div className={`bg-card border border-border overflow-hidden ${selectedId ? 'rounded-t-lg' : 'rounded-lg'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Domaine</th>
                {isAdmin && !selectedClientId && <th className="px-4 py-2 text-left hidden md:table-cell">Client</th>}
                <th className="px-4 py-2 text-left hidden md:table-cell">Nameservers</th>
                <th className="px-4 py-2 text-left">Expiration</th>
                <th className="px-4 py-2 text-center hidden sm:table-cell">Auto</th>
                <th className="px-4 py-2 text-left">Dernière vérif.</th>
                <th className="px-4 py-2 text-left hidden sm:table-cell">Notes</th>
                <th className="px-4 py-2 text-right">Vérifier</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {zones.map(z => {
                const isSelected  = z.id === selectedId
                const expiryDate  = z.expiryDate ? new Date(z.expiryDate as unknown as string) : null
                const isExpired   = expiryDate && expiryDate < now
                const isExpiring  = expiryDate && expiryDate >= now && expiryDate <= in90
                const rawCheck    = z.checkResults[0] ?? null
                const lastCheck   = rawCheck
                  ? { ...rawCheck, checkedAt: new Date(rawCheck.checkedAt as unknown as string) }
                  : null

                return (
                  <tr
                    key={z.id}
                    className={`align-middle cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-muted/20'
                    }`}
                    onClick={() => toggle(z.id)}
                  >
                    <td className="px-4 py-2 font-mono text-xs font-medium">{z.domain}</td>
                    {isAdmin && !selectedClientId && (
                      <td className="px-4 py-2 text-xs hidden md:table-cell" onClick={e => e.stopPropagation()}>
                        <Link href={`/clients/${z.client.id}?tab=dns`} className="hover:text-primary transition-colors">
                          {z.client.name}
                        </Link>
                      </td>
                    )}
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono truncate max-w-[160px] hidden md:table-cell">
                      {z.nameservers ?? '—'}
                    </td>
                    <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                      {fmt(expiryDate)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-muted-foreground hidden sm:table-cell">
                      {z.autoRenew ? '✓' : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {lastCheck ? (
                        <div className="flex flex-col gap-0.5">
                          <CheckBadge status={lastCheck.globalStatus} checkedAt={lastCheck.checkedAt} />
                          <span className="text-[10px] text-muted-foreground">
                            {lastCheck.checkedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            {' '}
                            {!lastCheck.spfValid && <span className="text-destructive">SPF </span>}
                            {!lastCheck.dmarcValid && <span className="text-destructive">DMARC </span>}
                            {!lastCheck.dkimFound && <span className="text-amber-600">DKIM </span>}
                            {!lastCheck.blacklistClean && <span className="text-destructive">BL </span>}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs hidden sm:table-cell">
                      {lastCheck ? (() => {
                        const details = lastCheck.details as CheckPayload | undefined
                        const base = {
                          spfValid:            lastCheck.spfValid,
                          dmarcPolicy:         lastCheck.dmarcPolicy,
                          dkimFound:           lastCheck.dkimFound,
                          blacklistClean:      lastCheck.blacklistClean,
                          blacklistMinorCount: lastCheck.blacklistMinorCount,
                        }
                        const delivScore  = computeScore(base)
                        const globalScore = computeGlobalScore({
                          ...base,
                          bimiValid:   details?.bimi?.valid ?? false,
                          mtaStsValid: details?.mtaSts?.valid ?? false,
                          tlsRptValid: details?.tlsRpt?.valid ?? false,
                        })
                        return (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-16">Délivrab.</span>
                              <span className={`font-semibold tabular-nums ${scoreColor(delivScore)}`}>{delivScore}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-16">Globale</span>
                              <span className={`font-semibold tabular-nums ${scoreColor(globalScore)}`}>{globalScore}%</span>
                            </div>
                          </div>
                        )
                      })() : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                      <ZoneCheckButton domain={z.domain} zoneId={z.id} />
                    </td>
                    <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                      <DeleteDnsZoneButton zoneId={z.id} domain={z.domain} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panneau de détail */}
      {selectedZone && (
        <div className="border border-t-0 border-border rounded-b-lg bg-card">
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/50">
            <p className="text-xs font-medium text-muted-foreground">
              Détail — <span className="font-mono text-foreground">{selectedZone.domain}</span>
            </p>
            <button
              onClick={() => setSelectedId(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-5">
            {selectedPayload ? (
              <CheckResultCard payload={selectedPayload} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune vérification effectuée pour ce domaine.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
