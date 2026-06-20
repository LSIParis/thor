# Comet Backup Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher le statut des sauvegardes Comet Backup par client sur le dashboard sous forme de 4 cartes résumé (clients surveillés / succès / échecs / sans sauvegarde récente).

**Architecture:** Un champ `cometUsername` est stocké sur `Client` en BDD pour lier chaque client à son compte Comet. Au chargement du dashboard, on appelle `POST /api/v1/admin/get-jobs-for-user` en parallèle pour chaque client surveillé, on filtre les 48 dernières heures, et on affiche 4 métriques agrégées dans une section entre Infrastructure et Tickets.

**Tech Stack:** Prisma (PostgreSQL), Next.js 16 App Router, native `fetch`, Vitest

## Global Constraints

- Variables d'env requises : `COMET_SERVER_URL`, `COMET_ADMIN_USER`, `COMET_ADMIN_PASS`
- Timeout par appel API Comet : 10 000 ms
- Fenêtre temporelle des jobs : 48 heures
- Filtrer uniquement `Classification === 4001` (Backup) — ignorer Restore, etc.
- Si env vars absentes → section masquée sans erreur
- Si un appel échoue → client ignoré silencieusement
- Tests : Vitest, `vi.stubGlobal('fetch', vi.fn())`

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `prisma/schema.prisma` | Modifier — ajouter `cometUsername String?` sur `Client` |
| `src/lib/comet-backup.ts` | Créer — client API Comet |
| `src/lib/comet-backup.test.ts` | Créer — tests unitaires |
| `src/app/dashboard/page.tsx` | Modifier — section sauvegardes + requête Comet |
| `src/app/clients/[id]/edit/page.tsx` | Modifier — champ cometUsername |
| `src/actions/clients.ts` | Modifier — persister cometUsername |

---

## Task 1 : Schéma Prisma — ajout `cometUsername`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Client.cometUsername: String | null` disponible dans toutes les requêtes Prisma

- [ ] **Step 1 : Modifier le modèle `Client` dans `prisma/schema.prisma`**

Localiser le modèle `Client` et ajouter le champ après `noSync` :

```prisma
  noSync         Boolean      @default(false)
  cometUsername  String?
  billingPeriod  String       @default("monthly")
```

- [ ] **Step 2 : Générer et appliquer la migration**

```bash
npx prisma migrate dev --name add_comet_username_to_client
```

Résultat attendu : migration créée dans `prisma/migrations/`, Prisma client régénéré.

- [ ] **Step 3 : Vérifier que le client Prisma est à jour**

```bash
npx prisma generate
```

- [ ] **Step 4 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add cometUsername field to Client model"
```

---

## Task 2 : Client API Comet — `src/lib/comet-backup.ts`

**Files:**
- Create: `src/lib/comet-backup.ts`

**Interfaces:**
- Produces:
  - `cometConfigured(): boolean`
  - `fetchCometSummaries(usernames: string[], limitHours?: number): Promise<Map<string, CometClientSummary>>`
  - `type CometClientSummary`

**Détails API Comet :**
- Endpoint : `POST <COMET_SERVER_URL>/api/v1/admin/get-jobs-for-user`
- Body (URL-encoded) : `Username=<admin>&Password=<pass>&AuthType=Password&TargetUser=<username>&StartTime=<unix>`
- Réponse : tableau JSON de `BackupJobDetail`
- Codes de statut : `5001`=Running, `5002`=Success, `5003`=Warning, `5004`=Quota, `5005`=Error, `5100`=Missed
- Code de classification backup : `4001`

- [ ] **Step 1 : Créer `src/lib/comet-backup.ts`**

```typescript
// Comet Backup API — codes officiels
const JOB_STATUS_RUNNING  = 5001
const JOB_STATUS_SUCCESS  = 5002
const JOB_STATUS_WARNING  = 5003
const JOB_STATUS_QUOTA    = 5004
const JOB_STATUS_ERROR    = 5005
const JOB_STATUS_MISSED   = 5100
const JOB_CLASS_BACKUP    = 4001

type CometRawJob = {
  JobHash: string
  Classification: number
  Status: number
  StartTime: number
  EndTime: number
  SourceStats?: { TotalBytes?: number }
  DeviceName?: string
}

export type CometClientSummary = {
  username: string
  lastJobStatus: number | null   // code numérique Comet, null si aucun job
  lastJobTime: number | null     // Unix timestamp (secondes)
  lastJobSize: number | null     // bytes
  hasRecentJob: boolean          // job Backup dans les 48h
}

export function cometConfigured(): boolean {
  return !!(
    process.env.COMET_SERVER_URL &&
    process.env.COMET_ADMIN_USER &&
    process.env.COMET_ADMIN_PASS
  )
}

export async function fetchCometClientSummary(
  username: string,
  limitHours = 48,
): Promise<CometClientSummary | null> {
  const base = process.env.COMET_SERVER_URL?.replace(/\/$/, '')
  const adminUser = process.env.COMET_ADMIN_USER
  const adminPass = process.env.COMET_ADMIN_PASS
  if (!base || !adminUser || !adminPass) return null

  const startTime = Math.floor(Date.now() / 1000) - limitHours * 3600

  const body = new URLSearchParams({
    Username:   adminUser,
    Password:   adminPass,
    AuthType:   'Password',
    TargetUser: username,
    StartTime:  String(startTime),
  })

  let res: Response
  try {
    res = await fetch(`${base}/api/v1/admin/get-jobs-for-user`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
      cache:   'no-store',
      signal:  AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  let jobs: CometRawJob[]
  try {
    jobs = await res.json() as CometRawJob[]
  } catch {
    return null
  }

  if (!Array.isArray(jobs)) return null

  const backupJobs = jobs.filter(j => j.Classification === JOB_CLASS_BACKUP)

  if (backupJobs.length === 0) {
    return { username, lastJobStatus: null, lastJobTime: null, lastJobSize: null, hasRecentJob: false }
  }

  // Trier par StartTime décroissant — job le plus récent en premier
  backupJobs.sort((a, b) => b.StartTime - a.StartTime)
  const latest = backupJobs[0]

  return {
    username,
    lastJobStatus: latest.Status,
    lastJobTime:   latest.StartTime,
    lastJobSize:   latest.SourceStats?.TotalBytes ?? null,
    hasRecentJob:  true,
  }
}

export async function fetchCometSummaries(
  usernames: string[],
  limitHours = 48,
): Promise<Map<string, CometClientSummary>> {
  const results = await Promise.all(
    usernames.map(u => fetchCometClientSummary(u, limitHours))
  )
  const map = new Map<string, CometClientSummary>()
  for (const summary of results) {
    if (summary) map.set(summary.username, summary)
  }
  return map
}

// ── Helpers dashboard ─────────────────────────────────────────────────────────

export function isCometSuccess(status: number | null): boolean {
  return status === JOB_STATUS_SUCCESS || status === JOB_STATUS_WARNING
}

export function isCometError(status: number | null): boolean {
  return status === JOB_STATUS_ERROR || status === JOB_STATUS_MISSED || status === JOB_STATUS_QUOTA
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/lib/comet-backup.ts
git commit -m "feat: add Comet Backup API client (fetchCometSummaries)"
```

---

## Task 3 : Tests unitaires — `src/lib/comet-backup.test.ts`

**Files:**
- Create: `src/lib/comet-backup.test.ts`

**Interfaces:**
- Consumes: `cometConfigured`, `fetchCometClientSummary`, `fetchCometSummaries`, `isCometSuccess`, `isCometError` depuis `./comet-backup`

- [ ] **Step 1 : Écrire les tests**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ENV = {
  COMET_SERVER_URL: 'https://backup.example.fr',
  COMET_ADMIN_USER: 'admin',
  COMET_ADMIN_PASS: 'secret',
}

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function makeJob(overrides: Partial<{
  Classification: number; Status: number; StartTime: number; TotalBytes: number
}> = {}) {
  return {
    JobHash: 'abc',
    Classification: overrides.Classification ?? 4001,
    Status: overrides.Status ?? 5002,
    StartTime: overrides.StartTime ?? Math.floor(Date.now() / 1000) - 3600,
    EndTime: Math.floor(Date.now() / 1000) - 3500,
    SourceStats: { TotalBytes: overrides.TotalBytes ?? 1_000_000 },
    DeviceName: 'PC-Test',
  }
}

beforeEach(() => {
  Object.assign(process.env, ENV)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.COMET_SERVER_URL
  delete process.env.COMET_ADMIN_USER
  delete process.env.COMET_ADMIN_PASS
})

import { cometConfigured, fetchCometClientSummary, fetchCometSummaries, isCometSuccess, isCometError } from './comet-backup'

describe('cometConfigured', () => {
  it('returns true when all env vars are set', () => {
    expect(cometConfigured()).toBe(true)
  })

  it('returns false when COMET_SERVER_URL is missing', () => {
    delete process.env.COMET_SERVER_URL
    expect(cometConfigured()).toBe(false)
  })

  it('returns false when COMET_ADMIN_PASS is missing', () => {
    delete process.env.COMET_ADMIN_PASS
    expect(cometConfigured()).toBe(false)
  })
})

describe('fetchCometClientSummary', () => {
  it('returns null when env vars are missing', async () => {
    delete process.env.COMET_SERVER_URL
    const result = await fetchCometClientSummary('user1')
    expect(result).toBeNull()
  })

  it('returns null on fetch network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const result = await fetchCometClientSummary('user1')
    expect(result).toBeNull()
  })

  it('returns null on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { error: 'Unauthorized' }))
    const result = await fetchCometClientSummary('user1')
    expect(result).toBeNull()
  })

  it('returns summary with hasRecentJob=false when no backup jobs in window', async () => {
    vi.stubGlobal('fetch', mockFetch(200, []))
    const result = await fetchCometClientSummary('user1')
    expect(result).toEqual({
      username: 'user1',
      lastJobStatus: null,
      lastJobTime: null,
      lastJobSize: null,
      hasRecentJob: false,
    })
  })

  it('ignores non-backup jobs (Classification !== 4001)', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [makeJob({ Classification: 4002 })]))
    const result = await fetchCometClientSummary('user1')
    expect(result?.hasRecentJob).toBe(false)
  })

  it('returns summary with most recent backup job', async () => {
    const now = Math.floor(Date.now() / 1000)
    const jobs = [
      makeJob({ Status: 5005, StartTime: now - 7200, TotalBytes: 500 }),
      makeJob({ Status: 5002, StartTime: now - 3600, TotalBytes: 1000 }),
    ]
    vi.stubGlobal('fetch', mockFetch(200, jobs))
    const result = await fetchCometClientSummary('user1')
    expect(result?.lastJobStatus).toBe(5002)
    expect(result?.lastJobSize).toBe(1000)
    expect(result?.hasRecentJob).toBe(true)
  })

  it('sends correct POST body to Comet API', async () => {
    const fetchMock = mockFetch(200, [])
    vi.stubGlobal('fetch', fetchMock)
    await fetchCometClientSummary('myclient')
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://backup.example.fr/api/v1/admin/get-jobs-for-user')
    expect(options.method).toBe('POST')
    const body = options.body as string
    expect(body).toContain('TargetUser=myclient')
    expect(body).toContain('Username=admin')
    expect(body).toContain('AuthType=Password')
  })
})

describe('fetchCometSummaries', () => {
  it('returns a Map keyed by username', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [makeJob()]))
    const map = await fetchCometSummaries(['user1', 'user2'])
    expect(map.size).toBe(2)
    expect(map.has('user1')).toBe(true)
    expect(map.has('user2')).toBe(true)
  })

  it('omits usernames whose fetch returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const map = await fetchCometSummaries(['user1'])
    expect(map.size).toBe(0)
  })
})

describe('isCometSuccess / isCometError', () => {
  it('isCometSuccess: true for 5002 and 5003', () => {
    expect(isCometSuccess(5002)).toBe(true)
    expect(isCometSuccess(5003)).toBe(true)
    expect(isCometSuccess(5005)).toBe(false)
    expect(isCometSuccess(null)).toBe(false)
  })

  it('isCometError: true for 5005, 5100, 5004', () => {
    expect(isCometError(5005)).toBe(true)
    expect(isCometError(5100)).toBe(true)
    expect(isCometError(5004)).toBe(true)
    expect(isCometError(5002)).toBe(false)
    expect(isCometError(null)).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests et vérifier qu'ils passent**

```bash
npx vitest run src/lib/comet-backup.test.ts
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/comet-backup.test.ts
git commit -m "test: unit tests for Comet Backup API client"
```

---

## Task 4 : Dashboard — section Sauvegardes

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `cometConfigured`, `fetchCometSummaries`, `isCometSuccess`, `isCometError`, `CometClientSummary` depuis `@/lib/comet-backup`

**Note:** La section est insérée entre Infrastructure et Tickets Desk365.

- [ ] **Step 1 : Ajouter l'import Comet en haut du fichier**

Localiser la ligne :
```typescript
import { fetchDesk365Tickets, desk365Configured, type Desk365Ticket } from '@/lib/desk365'
```

Ajouter juste après :
```typescript
import { fetchCometSummaries, cometConfigured, isCometSuccess, isCometError } from '@/lib/comet-backup'
```

- [ ] **Step 2 : Ajouter `HardDrive` aux imports lucide-react**

Localiser :
```typescript
import {
  Users, Contact, Monitor, AlertTriangle,
  Globe, ShieldCheck, Server, LayoutGrid,
  Cloud, Phone, Building2, AlertCircle,
  MessageSquare,
} from 'lucide-react'
```

Remplacer par :
```typescript
import {
  Users, Contact, Monitor, AlertTriangle,
  Globe, ShieldCheck, Server, LayoutGrid,
  Cloud, Phone, Building2, AlertCircle,
  MessageSquare, HardDrive,
} from 'lucide-react'
```

- [ ] **Step 3 : Étendre la requête `allClients` pour inclure `cometUsername`**

Localiser (ligne ~129) :
```typescript
    !isClient
      ? prisma.client.findMany({ where: accessFilter, select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([] as { id: string; name: string }[]),
```

Remplacer par :
```typescript
    !isClient
      ? prisma.client.findMany({ where: accessFilter, select: { id: true, name: true, cometUsername: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([] as { id: string; name: string; cometUsername: string | null }[]),
```

- [ ] **Step 4 : Ajouter `cometSummaries` dans le `Promise.all`**

Localiser après `allTickets` dans le tableau `Promise.all` :
```typescript
    desk365Configured() ? fetchDesk365Tickets(3) : Promise.resolve([]),
  ])
```

Remplacer par :
```typescript
    desk365Configured() ? fetchDesk365Tickets(3) : Promise.resolve([]),
    cometConfigured() && !isClient
      ? fetchCometSummaries(
          // allClients n'est pas encore résolu ici — on le résout à la ligne suivante
          // On doit restructurer : voir Step 5
          []
        )
      : Promise.resolve(new Map()),
  ])
```

**Attention :** `allClients` n'est pas disponible avant la résolution du `Promise.all`. Il faut donc faire une requête séparée pour les usernames Comet, ou récupérer les usernames dans la même requête. Voici l'approche correcte :

Remplacer **tout le bloc `Promise.all`** (de `const [` à `])`) par :

```typescript
  // Récupérer d'abord les clients Comet surveillés (nécessaire avant Promise.all)
  const cometClients = cometConfigured() && !isClient
    ? await prisma.client.findMany({
        where: accessFilter,
        select: { cometUsername: true },
      }).then(rows => rows.map(r => r.cometUsername).filter((u): u is string => !!u))
    : []

  const [
    clientCount, contactCount, equipmentCount,
    dnsZoneCount, sslCertCount, hostingCount,
    m365TenantCount, m365AccountCount, nextcloudCount, voipCount,
    certsExpiringSoon, domainsExpiringSoon,
    equipmentRaw, dnsZones, sslExpiry, topClients,
    allClients,
    lastCronSetting,
    allTickets,
    cometSummaries,
  ] = await Promise.all([
    prisma.client.count({ where: clientFilter }),
    prisma.contact.count({ where: { ...clientWhere, visible: true } }),
    prisma.equipment.count({ where: clientWhere }),
    prisma.dnsZone.count({ where: dnsZoneWhere }),
    prisma.sslCertificate.count({ where: clientWhere }),
    prisma.hosting.count({ where: clientWhere }),
    prisma.m365Tenant.count({ where: clientWhere }),
    prisma.m365Account.count({ where: { tenant: clientWhere } }),
    prisma.nextcloudService.count({ where: clientWhere }),
    prisma.voipService.count({ where: clientWhere }),
    prisma.sslCertificate.count({ where: { ...clientWhere, expiryDate: { gte: now, lte: in30 } } }),
    prisma.dnsZone.count({ where: { ...dnsZoneWhere, expiryDate: { gte: now, lte: in30 } } }),
    prisma.equipment.groupBy({ by: ['type'], where: clientWhere, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.dnsZone.findMany({ where: dnsZoneWhere, select: { registrar: { select: { name: true } }, source: true } }),
    prisma.sslCertificate.findMany({ where: { ...clientWhere, expiryDate: { gte: now, lte: in6m } }, select: { expiryDate: true } }),
    prisma.client.findMany({ where: clientFilter, select: { name: true, _count: { select: { equipment: true } } }, orderBy: { equipment: { _count: 'desc' } }, take: 8 }),
    !isClient
      ? prisma.client.findMany({ where: accessFilter, select: { id: true, name: true, cometUsername: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([] as { id: string; name: string; cometUsername: string | null }[]),
    prisma.appSetting.findUnique({ where: { key: 'last_cron_run' } }),
    desk365Configured() ? fetchDesk365Tickets(3) : Promise.resolve([]),
    cometClients.length > 0 ? fetchCometSummaries(cometClients) : Promise.resolve(new Map()),
  ])
```

- [ ] **Step 5 : Calculer les métriques Comet après le `Promise.all`**

Localiser le commentaire `// Tickets` et ajouter avant :
```typescript
  // Sauvegardes Comet
  const cometMonitored = cometClients.length
  const cometSuccess   = [...cometSummaries.values()].filter(s => s.hasRecentJob && isCometSuccess(s.lastJobStatus)).length
  const cometError     = [...cometSummaries.values()].filter(s => s.hasRecentJob && isCometError(s.lastJobStatus)).length
  const cometNoRecent  = cometMonitored - [...cometSummaries.values()].filter(s => s.hasRecentJob).length
```

- [ ] **Step 6 : Ajouter la section JSX entre Infrastructure et Tickets**

Localiser dans le JSX :
```tsx
      {/* ── Tickets Desk365 ── */}
```

Insérer juste avant :
```tsx
      {/* ── Sauvegardes Comet ── */}
      {!isClient && cometConfigured() && (
        <div className="mb-6">
          <SectionLabel>Sauvegardes — Comet Backup ({cometMonitored})</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <InfraItem label="Surveillés"           value={cometMonitored} icon={HardDrive} />
            <InfraItem label="Succès (48h)"         value={cometSuccess}   icon={HardDrive} />
            <InfraItem label="Échecs (48h)"         value={cometError}     icon={HardDrive} alert />
            <InfraItem label="Sans sauvegarde"      value={cometNoRecent}  icon={HardDrive} alert />
          </div>
        </div>
      )}
```

- [ ] **Step 7 : Vérifier que TypeScript compile sans erreur**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 8 : Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add Comet Backup summary section to dashboard"
```

---

## Task 5 : Formulaire client — champ `cometUsername`

**Files:**
- Modify: `src/app/clients/[id]/edit/page.tsx`
- Modify: `src/actions/clients.ts`

**Interfaces:**
- Consumes: `Client.cometUsername` (Task 1)

- [ ] **Step 1 : Étendre la requête dans la page d'édition**

Dans `src/app/clients/[id]/edit/page.tsx`, localiser :
```typescript
  const client = await prisma.client.findUnique({ where: { id }, select: { id: true, name: true, address: true, phone: true, email: true, notes: true, noSync: true } })
```

Remplacer par :
```typescript
  const client = await prisma.client.findUnique({ where: { id }, select: { id: true, name: true, address: true, phone: true, email: true, notes: true, noSync: true, cometUsername: true } })
```

- [ ] **Step 2 : Ajouter le champ dans le formulaire**

Localiser dans le formulaire la section `noSync` :
```tsx
          <div className="flex items-center gap-2">
            <input id="noSync" type="checkbox" ...
```

Ajouter juste avant cette div :
```tsx
          <div className="space-y-1">
            <Label htmlFor="cometUsername">Username Comet Backup</Label>
            <Input
              id="cometUsername"
              name="cometUsername"
              defaultValue={client.cometUsername ?? ''}
              placeholder="ex: clientabc"
            />
          </div>
```

- [ ] **Step 3 : Persister `cometUsername` dans la server action**

Dans `src/actions/clients.ts`, localiser dans `updateClient` :
```typescript
      notes: (formData.get('notes') as string) || null,
      noSync,
```

Remplacer par :
```typescript
      notes:         (formData.get('notes') as string) || null,
      cometUsername: (formData.get('cometUsername') as string) || null,
      noSync,
```

- [ ] **Step 4 : Vérifier que TypeScript compile sans erreur**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 : Commit**

```bash
git add src/app/clients/[id]/edit/page.tsx src/actions/clients.ts
git commit -m "feat: add cometUsername field to client edit form"
```

---

## Vérification finale

- [ ] Lancer tous les tests : `npx vitest run`
- [ ] Vérifier compilation : `npx tsc --noEmit`
- [ ] Ouvrir le dashboard — si `COMET_*` non configurées, aucune section ne s'affiche
- [ ] Configurer les 3 env vars et redémarrer — la section "Sauvegardes" apparaît avec les compteurs
- [ ] Éditer un client, renseigner un `cometUsername`, sauvegarder — la valeur persiste
