'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CheckPayload } from '@/lib/dns/types'

type IconStatus = 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN'

const iconConfig: Record<IconStatus, { symbol: string; cls: string }> = {
  OK:      { symbol: '✓', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  WARNING: { symbol: '!', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  ERROR:   { symbol: '✗', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  UNKNOWN: { symbol: '–', cls: 'bg-muted text-muted-foreground' },
}

function StatusIcon({ status }: { status: IconStatus }) {
  const { symbol, cls } = iconConfig[status]
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${cls}`}>
      {symbol}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const cls = score >= 80
    ? 'text-emerald-600 border-emerald-400'
    : score >= 50
    ? 'text-amber-600 border-amber-400'
    : 'text-red-600 border-red-400'
  return (
    <span className={`inline-flex items-center justify-center w-14 h-14 rounded-full border-2 text-base font-bold ${cls}`}>
      {score}%
    </span>
  )
}

function Section({ title, status, children }: { title: string; status: IconStatus; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <StatusIcon status={status} />
      </div>
      {children}
    </div>
  )
}

function computeScore(p: CheckPayload): number {
  const checks = [
    p.spf.valid, p.dmarc.valid, p.dkim.anyFound,
    p.blacklists.ip !== null && p.blacklists.listedCount === 0,
    p.mtaSts.valid, p.tlsRpt.valid,
  ]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}

export function CheckResultCard({ payload }: { payload: CheckPayload }) {
  const [showAllRbls, setShowAllRbls] = useState(false)
  const score = computeScore(payload)

  const spfStatus: IconStatus    = payload.spf.valid    ? 'OK' : payload.spf.found    ? 'WARNING' : 'ERROR'
  const dmarcStatus: IconStatus  = payload.dmarc.valid  ? 'OK' : payload.dmarc.found  ? 'WARNING' : 'ERROR'
  const dkimStatus: IconStatus   = payload.dkim.anyFound ? 'OK' : 'WARNING'
  const blStatus: IconStatus     = payload.blacklists.hasMajorListing ? 'ERROR'
    : payload.blacklists.listedCount > 0 ? 'WARNING'
    : payload.blacklists.ip !== null ? 'OK' : 'UNKNOWN'
  const bimiStatus: IconStatus   = payload.bimi.valid   ? 'OK' : payload.bimi.found   ? 'WARNING' : 'UNKNOWN'
  const mtaStatus: IconStatus    = payload.mtaSts.valid  ? 'OK' : 'UNKNOWN'
  const tlsStatus: IconStatus    = payload.tlsRpt.valid  ? 'OK' : 'UNKNOWN'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-semibold font-mono">{payload.domain}</h2>
        <ScoreRing score={score} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* SPF */}
        <Section title="SPF" status={spfStatus}>
          {payload.spf.record
            ? <p className="text-xs font-mono text-muted-foreground break-all">{payload.spf.record}</p>
            : <p className="text-xs text-destructive">{payload.spf.error ?? 'Aucun enregistrement SPF'}</p>}
          {payload.spf.found && !payload.spf.valid && (
            <p className="text-xs text-amber-600 mt-1">{payload.spf.error}</p>
          )}
        </Section>

        {/* DMARC */}
        <Section title="DMARC" status={dmarcStatus}>
          {payload.dmarc.record
            ? <p className="text-xs font-mono text-muted-foreground break-all">{payload.dmarc.record}</p>
            : <p className="text-xs text-destructive">{payload.dmarc.error ?? 'Aucun enregistrement DMARC'}</p>}
          {payload.dmarc.policy && (
            <p className="text-xs text-muted-foreground mt-1">
              Politique : <strong>{payload.dmarc.policy}</strong>
              {payload.dmarc.rua ? <> — RUA : <span className="font-mono">{payload.dmarc.rua}</span></> : ' — pas de RUA'}
            </p>
          )}
        </Section>

        {/* DKIM */}
        <Section title="DKIM" status={dkimStatus}>
          {payload.dkim.anyFound
            ? <ul className="text-xs text-muted-foreground space-y-0.5">
                {payload.dkim.selectors.filter(s => s.found).map(s => (
                  <li key={s.name}>✓ Sélecteur <strong>{s.name}</strong></li>
                ))}
              </ul>
            : <p className="text-xs text-amber-600">
                {payload.dkim.autoChecked ? 'Aucun sélecteur standard trouvé.' : 'Sélecteur non trouvé.'}
              </p>}
        </Section>

        {/* Blacklists */}
        <Section title="Blacklists" status={blStatus}>
          {payload.blacklists.ip
            ? <p className="text-xs text-muted-foreground mb-1">
                IP : <span className="font-mono">{payload.blacklists.ip}</span> — {payload.blacklists.cleanCount} propre(s), {payload.blacklists.listedCount} listé(s)
              </p>
            : <p className="text-xs text-muted-foreground">IP non résolue</p>}
          {payload.blacklists.listedCount > 0 && (
            <ul className="text-xs text-destructive space-y-0.5 mb-1">
              {payload.blacklists.listed.filter(r => r.listed).map(r => (
                <li key={r.rbl}>⚠ {r.rbl}{r.major ? ' (majeure)' : ''}</li>
              ))}
            </ul>
          )}
          {showAllRbls && (
            <ul className="text-xs space-y-0.5 mb-1">
              {payload.blacklists.listed.map(r => (
                <li key={r.rbl} className={r.listed ? 'text-destructive' : 'text-emerald-600'}>
                  {r.listed ? '⚠' : '✓'} {r.rbl}{r.major ? ' (majeure)' : ''}
                </li>
              ))}
            </ul>
          )}
          {payload.blacklists.listed.length > 0 && (
            <Button variant="ghost" size="sm" className="h-5 text-xs px-0 text-primary"
              onClick={() => setShowAllRbls(v => !v)}>
              {showAllRbls ? 'Masquer' : 'Voir toutes les RBL'}
            </Button>
          )}
        </Section>

        {/* BIMI */}
        <Section title="BIMI" status={bimiStatus}>
          {payload.bimi.record
            ? <p className="text-xs font-mono text-muted-foreground break-all">{payload.bimi.record}</p>
            : <p className="text-xs text-muted-foreground">Non configuré</p>}
          {payload.bimi.logoUrl && (
            <p className="text-xs text-muted-foreground mt-1">Logo : <span className="font-mono">{payload.bimi.logoUrl}</span></p>
          )}
        </Section>

        {/* MTA-STS */}
        <Section title="MTA-STS" status={mtaStatus}>
          {payload.mtaSts.record
            ? <p className="text-xs font-mono text-muted-foreground break-all">{payload.mtaSts.record}</p>
            : <p className="text-xs text-muted-foreground">Non configuré</p>}
          {payload.mtaSts.id && (
            <p className="text-xs text-muted-foreground mt-1">ID : <span className="font-mono">{payload.mtaSts.id}</span></p>
          )}
        </Section>

        {/* TLS-RPT */}
        <Section title="TLS-RPT" status={tlsStatus}>
          {payload.tlsRpt.record
            ? <p className="text-xs font-mono text-muted-foreground break-all">{payload.tlsRpt.record}</p>
            : <p className="text-xs text-muted-foreground">Non configuré</p>}
          {payload.tlsRpt.rua && (
            <p className="text-xs text-muted-foreground mt-1">RUA : <span className="font-mono">{payload.tlsRpt.rua}</span></p>
          )}
        </Section>
      </div>
    </div>
  )
}

export type { CheckPayload }
