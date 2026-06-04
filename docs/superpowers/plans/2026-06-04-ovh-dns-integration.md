# OVH DNS Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-client OVH API credentials to the DNS tab, sync DNS zones and records from OVH by querying authoritative NS servers directly, and display OVH-sourced zones as read-only alongside existing manual zones.

**Architecture:** OvhConfig stored per-client (credentials encrypted AES-256). A sync route fetches zone list from OVH REST API (HMAC-SHA1 auth), resolves each zone's NS servers, then queries those NS servers via Node.js `dns.Resolver` for all record types. Results upsert into existing DnsZone/DnsRecord tables with `source="ovh"`. DNS panel checks for OvhConfig on load and shows connect banner or status banner accordingly.

**Tech Stack:** Next.js 16 App Router, Prisma v7, Node.js `dns/promises`, axios, crypto (SHA1), shadcn/ui

---

## File Map

```
prisma/schema.prisma                          ← add OvhConfig model, DnsZone.source + ovhZoneName
src/lib/ovh-client.ts                         ← OVH REST client (HMAC-SHA1)
src/lib/ovh-client.test.ts                    ← unit tests
src/actions/ovh.ts                            ← saveOvhConfig, deleteOvhConfig
src/app/api/ovh/[clientId]/sync/route.ts      ← POST sync endpoint
src/components/dns/ovh-connect-banner.tsx     ← credentials form (state 1)
src/components/dns/ovh-status-banner.tsx      ← sync status + button (state 2)
src/components/dns/dns-panel.tsx              ← integrate banners, read-only OVH zones
src/app/clients/[id]/page.tsx                 ← include OvhConfig in fetch
```

---

## Task 1: Schema — OvhConfig model + DnsZone fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add OvhConfig model and update Client + DnsZone**

In `prisma/schema.prisma`, add `ovhConfig OvhConfig?` to the Client model:

```prisma
model Client {
  // ... existing fields ...
  ovhConfig         OvhConfig?
}
```

Add the new model at the end of the file:

```prisma
model OvhConfig {
  id                String    @id @default(cuid())
  clientId          String    @unique
  endpoint          String    @default("ovh-eu")
  applicationKey    String
  applicationSecret String
  consumerKey       String
  lastSyncAt        DateTime?
  createdAt         DateTime  @default(now())
  client            Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

Add two fields to the existing `DnsZone` model:

```prisma
model DnsZone {
  // ... existing fields ...
  source       String   @default("manual")
  ovhZoneName  String?
  // ... rest of fields ...
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_ovh_config
```
Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```
Expected: `Generated Prisma Client`

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: exit 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add OvhConfig model and source field to DnsZone"
```

---

## Task 2: OVH Client Library

**Files:**
- Create: `src/lib/ovh-client.ts`
- Create: `src/lib/ovh-client.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/ovh-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.mock('axios')
import axios from 'axios'

describe('OvhClient', () => {
  beforeEach(() => vi.resetAllMocks())

  it('uses correct base URL for ovh-eu endpoint', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: ['zone1.fr'] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-eu', 'AK', 'AS', 'CK')
    await client.get('/domain/zone')
    expect(vi.mocked(axios.get).mock.calls[0][0]).toContain('eu.api.ovh.com')
  })

  it('uses correct base URL for ovh-ca endpoint', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-ca', 'AK', 'AS', 'CK')
    await client.get('/domain/zone')
    expect(vi.mocked(axios.get).mock.calls[0][0]).toContain('ca.api.ovh.com')
  })

  it('includes required OVH auth headers', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-eu', 'MY_AK', 'MY_AS', 'MY_CK')
    await client.get('/domain/zone')
    const headers = vi.mocked(axios.get).mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['X-Ovh-Application']).toBe('MY_AK')
    expect(headers['X-Ovh-Consumer']).toBe('MY_CK')
    expect(headers['X-Ovh-Timestamp']).toMatch(/^\d+$/)
    expect(headers['X-Ovh-Signature']).toMatch(/^\$1\$[0-9a-f]{40}$/)
  })

  it('computes correct HMAC-SHA1 signature', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-eu', 'AK', 'SECRET', 'CK')
    // Intercept to capture timestamp and verify signature manually
    let capturedHeaders: any
    vi.mocked(axios.get).mockImplementationOnce((_url, config) => {
      capturedHeaders = config?.headers
      return Promise.resolve({ data: [] })
    })
    await client.get('/domain/zone')
    const ts = capturedHeaders['X-Ovh-Timestamp']
    const url = 'https://eu.api.ovh.com/1.0/domain/zone'
    const toSign = `SECRET+CK+GET+${url}++${ts}`
    const expected = '$1$' + crypto.createHash('sha1').update(toSign).digest('hex')
    expect(capturedHeaders['X-Ovh-Signature']).toBe(expected)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- src/lib/ovh-client.test.ts
```
Expected: FAIL — `Cannot find module './ovh-client'`

- [ ] **Step 3: Create `src/lib/ovh-client.ts`**

```typescript
import crypto from 'crypto'
import axios from 'axios'

const BASE_URLS: Record<string, string> = {
  'ovh-eu': 'https://eu.api.ovh.com/1.0',
  'ovh-ca': 'https://ca.api.ovh.com/1.0',
  'ovh-us': 'https://api.us.ovhcloud.com/1.0',
}

export class OvhClient {
  private readonly baseUrl: string

  constructor(
    endpoint: string,
    private readonly appKey: string,
    private readonly appSecret: string,
    private readonly consumerKey: string,
  ) {
    this.baseUrl = BASE_URLS[endpoint] ?? BASE_URLS['ovh-eu']
  }

  private sign(method: string, url: string, body: string, timestamp: number): string {
    const toSign = [this.appSecret, this.consumerKey, method, url, body, timestamp].join('+')
    return '$1$' + crypto.createHash('sha1').update(toSign).digest('hex')
  }

  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = this.sign('GET', url, '', timestamp)
    const resp = await axios.get<T>(url, {
      headers: {
        'X-Ovh-Application': this.appKey,
        'X-Ovh-Consumer': this.consumerKey,
        'X-Ovh-Timestamp': String(timestamp),
        'X-Ovh-Signature': signature,
      },
      timeout: 10000,
    })
    return resp.data
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- src/lib/ovh-client.test.ts
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ovh-client.ts src/lib/ovh-client.test.ts
git commit -m "feat: add OVH REST client with HMAC-SHA1 authentication"
```

---

## Task 3: Server Actions — saveOvhConfig + deleteOvhConfig

**Files:**
- Create: `src/actions/ovh.ts`

- [ ] **Step 1: Create `src/actions/ovh.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { encrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveOvhConfig(clientId: string, formData: FormData) {
  await requireAdmin()

  const applicationKey    = formData.get('applicationKey') as string
  const rawAppSecret      = formData.get('applicationSecret') as string
  const rawConsumerKey    = formData.get('consumerKey') as string
  const endpoint          = (formData.get('endpoint') as string) || 'ovh-eu'

  // Encrypt secrets
  const applicationSecret = encrypt(rawAppSecret)
  const consumerKey       = encrypt(rawConsumerKey)

  await prisma.ovhConfig.upsert({
    where: { clientId },
    update: { endpoint, applicationKey, applicationSecret, consumerKey },
    create: { clientId, endpoint, applicationKey, applicationSecret, consumerKey },
  })

  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

export async function deleteOvhConfig(clientId: string) {
  await requireAdmin()
  await prisma.ovhConfig.delete({ where: { clientId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/actions/ovh.ts
git commit -m "feat: add OVH config server actions (save/delete)"
```

---

## Task 4: Sync API Route

**Files:**
- Create: `src/app/api/ovh/[clientId]/sync/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { OvhClient } from '@/lib/ovh-client'
import { Resolver } from 'dns/promises'

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'CAA', 'SRV'] as const
type RecordType = typeof RECORD_TYPES[number]

interface OvhZoneInfo {
  name: string
  nameServers: string[]
}

async function resolveNsToIps(nsHostnames: string[]): Promise<string[]> {
  const defaultResolver = new Resolver()
  const ips: string[] = []
  await Promise.allSettled(
    nsHostnames.map(async (ns) => {
      try {
        const addrs = await defaultResolver.resolve4(ns)
        ips.push(...addrs)
      } catch {
        // NS hostname unresolvable — skip
      }
    })
  )
  return ips.length > 0 ? ips : ['8.8.8.8'] // fallback
}

async function queryRecordsFromNs(
  domain: string,
  nsIps: string[],
): Promise<Array<{ type: string; name: string; value: string; ttl: number | null; priority: number | null }>> {
  const resolver = new Resolver()
  resolver.setServers(nsIps)

  const results: Array<{ type: string; name: string; value: string; ttl: number | null; priority: number | null }> = []

  await Promise.allSettled(
    RECORD_TYPES.map(async (type: RecordType) => {
      try {
        if (type === 'MX') {
          const records = await resolver.resolveMx(domain)
          for (const r of records) {
            results.push({ type, name: '@', value: r.exchange, ttl: null, priority: r.priority })
          }
        } else if (type === 'TXT') {
          const records = await resolver.resolveTxt(domain)
          for (const r of records) {
            results.push({ type, name: '@', value: r.join(''), ttl: null, priority: null })
          }
        } else if (type === 'NS') {
          const records = await resolver.resolveNs(domain)
          for (const r of records) {
            results.push({ type, name: '@', value: r, ttl: null, priority: null })
          }
        } else if (type === 'CAA') {
          const records = await resolver.resolveCaa(domain)
          for (const r of records) {
            results.push({ type, name: '@', value: `${r.critical} ${r.issue ?? r.issuewild ?? r.iodef}`, ttl: null, priority: null })
          }
        } else if (type === 'SRV') {
          // SRV requires subdomain — skip bare domain query
        } else {
          // A, AAAA, CNAME
          const records = await (resolver as any)[`resolve${type === 'AAAA' ? '6' : type === 'A' ? '4' : 'Cname'}`](domain)
          const values: string[] = Array.isArray(records) ? records : [records]
          for (const v of values) {
            results.push({ type, name: '@', value: v, ttl: null, priority: null })
          }
        }
      } catch {
        // record type not found for this domain — normal
      }
    })
  )
  return results
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId } = await params
  const config = await prisma.ovhConfig.findUnique({ where: { clientId } })
  if (!config) {
    return NextResponse.json({ error: 'OVH non configuré pour ce client' }, { status: 400 })
  }

  const appSecret    = decrypt(config.applicationSecret)
  const consumerKey  = decrypt(config.consumerKey)
  const ovh          = new OvhClient(config.endpoint, config.applicationKey, appSecret, consumerKey)

  // 1. List zones
  let zoneNames: string[]
  try {
    zoneNames = await ovh.get<string[]>('/domain/zone')
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: 'Credentials OVH invalides (401/403)' }, { status: 401 })
    }
    return NextResponse.json({ error: `OVH inaccessible : ${err?.code ?? err?.message}` }, { status: 502 })
  }

  let totalZones  = 0
  let totalRecords = 0
  const errors: string[] = []

  // 2. Process each zone
  await Promise.allSettled(
    zoneNames.map(async (zoneName) => {
      try {
        // Get zone info (nameservers)
        const zoneInfo = await ovh.get<OvhZoneInfo>(`/domain/zone/${zoneName}`)
        const nsHostnames = zoneInfo.nameServers ?? []
        const nsIps = await resolveNsToIps(nsHostnames)

        // Query records from authoritative NS
        const records = await queryRecordsFromNs(zoneName, nsIps)

        // Upsert DnsZone
        const zone = await prisma.dnsZone.upsert({
          where: { ovhZoneName_clientId: { ovhZoneName: zoneName, clientId } },
          update: {
            domain: zoneName,
            nameservers: nsHostnames.join(', '),
            source: 'ovh',
          },
          create: {
            clientId,
            domain: zoneName,
            ovhZoneName: zoneName,
            nameservers: nsHostnames.join(', '),
            source: 'ovh',
          },
        })

        // Replace records
        await prisma.dnsRecord.deleteMany({ where: { zoneId: zone.id } })
        if (records.length > 0) {
          await prisma.dnsRecord.createMany({
            data: records.map((r) => ({
              zoneId: zone.id,
              type: r.type,
              name: r.name,
              value: r.value,
              ttl: r.ttl,
              priority: r.priority,
            })),
          })
        }

        totalZones++
        totalRecords += records.length
      } catch (err: any) {
        errors.push(`${zoneName}: ${err?.message ?? 'unknown'}`)
      }
    })
  )

  // 3. Delete OVH zones no longer in the list
  await prisma.dnsZone.deleteMany({
    where: {
      clientId,
      source: 'ovh',
      ovhZoneName: { notIn: zoneNames },
    },
  })

  // 4. Update lastSyncAt
  await prisma.ovhConfig.update({
    where: { clientId },
    data: { lastSyncAt: new Date() },
  })

  return NextResponse.json({ zones: totalZones, records: totalRecords, errors })
}
```

- [ ] **Step 2: Add unique constraint to DnsZone for upsert**

The upsert uses `ovhZoneName_clientId` compound key. Add this to the schema:

```prisma
model DnsZone {
  // ... existing fields ...
  @@unique([ovhZoneName, clientId])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_dnszone_ovh_unique
npx prisma generate
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ovh/ prisma/schema.prisma prisma/migrations/
git commit -m "feat: add OVH DNS sync API route with authoritative NS query"
```

---

## Task 5: OVH Connect Banner Component

**Files:**
- Create: `src/components/dns/ovh-connect-banner.tsx`

- [ ] **Step 1: Create `src/components/dns/ovh-connect-banner.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveOvhConfig } from '@/actions/ovh'
import { Link2, ChevronDown } from 'lucide-react'

interface OvhConnectBannerProps {
  clientId: string
}

const ENDPOINTS = [
  { value: 'ovh-eu', label: 'OVH Europe (ovh-eu)' },
  { value: 'ovh-ca', label: 'OVH Canada (ovh-ca)' },
  { value: 'ovh-us', label: 'OVH US (ovh-us)' },
]

export function OvhConnectBanner({ clientId }: OvhConnectBannerProps) {
  const [open, setOpen] = useState(false)
  const saveWithClientId = saveOvhConfig.bind(null, clientId)

  return (
    <div className="mb-4 rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Link2 size={14} className="text-primary" />
        <span>Connecter un compte OVH pour synchroniser les domaines</span>
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form action={saveWithClientId} className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ovh-endpoint" className="text-xs">Endpoint</Label>
              <select
                id="ovh-endpoint"
                name="endpoint"
                defaultValue="ovh-eu"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ENDPOINTS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovh-ak" className="text-xs">Application Key</Label>
              <Input id="ovh-ak" name="applicationKey" required className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovh-as" className="text-xs">Application Secret</Label>
              <Input id="ovh-as" name="applicationSecret" type="password" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovh-ck" className="text-xs">Consumer Key</Label>
              <Input id="ovh-ck" name="consumerKey" type="password" required className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" size="sm">
              Connecter &amp; Synchroniser
            </Button>
            <p className="text-xs text-muted-foreground">
              Les secrets sont chiffrés AES-256 avant stockage.
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dns/ovh-connect-banner.tsx
git commit -m "feat: add OVH connect banner component"
```

---

## Task 6: OVH Status Banner Component

**Files:**
- Create: `src/components/dns/ovh-status-banner.tsx`

- [ ] **Step 1: Create `src/components/dns/ovh-status-banner.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteOvhConfig } from '@/actions/ovh'
import { RefreshCw, Settings, CheckCircle, AlertTriangle } from 'lucide-react'
import type { OvhConfig } from '@prisma/client'

interface OvhStatusBannerProps {
  clientId: string
  config: OvhConfig
  zonesCount: number
  recordsCount: number
}

function formatLastSync(date: Date | null): string {
  if (!date) return 'jamais'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (diff < 1) return 'à l\'instant'
  if (diff < 60) return `il y a ${diff} min`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}

export function OvhStatusBanner({ clientId, config, zonesCount, recordsCount }: OvhStatusBannerProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const deleteWithClientId = deleteOvhConfig.bind(null, clientId)

  async function handleSync() {
    setSyncing(true)
    setSyncResult('')
    try {
      const res = await fetch(`/api/ovh/${clientId}/sync`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncResult(`Erreur : ${data.error}`)
      } else {
        setSyncResult(`${data.zones} zones · ${data.records} enregistrements`)
        window.location.reload()
      }
    } catch {
      setSyncResult('Erreur réseau')
    }
    setSyncing(false)
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle size={14} className="text-primary" />
          <div>
            <span className="text-sm font-medium">OVH connecté</span>
            <span className="text-xs text-muted-foreground ml-2">
              · Sync {formatLastSync(config.lastSyncAt)}
            </span>
            {syncResult && (
              <span className={`text-xs ml-2 ${syncResult.startsWith('Erreur') ? 'text-destructive' : 'text-primary'}`}>
                — {syncResult}
              </span>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {zonesCount} zones · {recordsCount} enreg.
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={12} className={`mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sync...' : 'Synchroniser'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowSettings(!showSettings)}
            title="Paramètres OVH"
          >
            <Settings size={13} />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
          <p className="text-xs text-muted-foreground flex-1">
            Endpoint : <span className="font-mono">{config.endpoint}</span> ·
            App Key : <span className="font-mono">{config.applicationKey}</span>
          </p>
          <form action={deleteWithClientId}>
            <Button variant="destructive" size="sm" className="h-7 text-xs" type="submit">
              Déconnecter OVH
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dns/ovh-status-banner.tsx
git commit -m "feat: add OVH status banner component with sync button"
```

---

## Task 7: Update DNS Panel

**Files:**
- Modify: `src/components/dns/dns-panel.tsx`

- [ ] **Step 1: Add OvhConfig prop to DnsPanel interface and integrate banners**

The `DnsPanelProps` interface needs `ovhConfig` and the counts for the status banner. Add these imports at the top of `src/components/dns/dns-panel.tsx`:

```typescript
import { OvhConnectBanner } from './ovh-connect-banner'
import { OvhStatusBanner } from './ovh-status-banner'
import type { OvhConfig } from '@prisma/client'
```

Update `DnsPanelProps`:
```typescript
interface DnsPanelProps {
  clientId: string
  zones: ZoneWithRecords[]
  certs: SslCertificate[]
  hostings: Hosting[]
  canEdit: boolean
  ovhConfig: OvhConfig | null
}
```

Update the `DnsPanel` function signature:
```typescript
export function DnsPanel({ clientId, zones, certs, hostings, canEdit, ovhConfig }: DnsPanelProps) {
```

Inside `DnsPanel`, just before the `<Tabs>`, add:
```typescript
  const ovhZonesCount   = zones.filter(z => z.source === 'ovh').length
  const ovhRecordsCount = zones.filter(z => z.source === 'ovh').reduce((s, z) => s + z.records.length, 0)
```

And render banners at the top of the returned JSX:
```typescript
  return (
    <div>
      {canEdit && !ovhConfig && (
        <OvhConnectBanner clientId={clientId} />
      )}
      {ovhConfig && (
        <OvhStatusBanner
          clientId={clientId}
          config={ovhConfig}
          zonesCount={ovhZonesCount}
          recordsCount={ovhRecordsCount}
        />
      )}
      <Tabs defaultValue="zones">
        {/* existing tabs */}
```

- [ ] **Step 2: Make OVH zones read-only in ZoneSection**

In `ZoneSection`, the `canEdit` prop controls mutability. For OVH zones we want to pass `canEdit=false` regardless of admin status. Update the zone rendering in `DnsZonesTab`:

```typescript
// In DnsZonesTab, when mapping zones:
{zones.map(zone => (
  <ZoneSection
    key={zone.id}
    zone={zone}
    clientId={clientId}
    canEdit={canEdit && zone.source !== 'ovh'}
  />
))}
```

- [ ] **Step 3: Add OVH badge to zone header in ZoneSection**

In `ZoneSection`, add the source badge next to the domain name:

```typescript
// After the domain name span, before the registrar span:
{zone.source === 'ovh' && (
  <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">
    OVH
  </Badge>
)}
{zone.source === 'manual' && (
  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
    Manuel
  </Badge>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dns/dns-panel.tsx
git commit -m "feat: integrate OVH banners in DNS panel, read-only OVH zones"
```

---

## Task 8: Update Client Detail Page

**Files:**
- Modify: `src/app/clients/[id]/page.tsx`

- [ ] **Step 1: Add OvhConfig to the Prisma query**

In `src/app/clients/[id]/page.tsx`, inside the `prisma.client.findUnique` include block, add:

```typescript
ovhConfig: true,
```

- [ ] **Step 2: Pass ovhConfig to DnsPanel via ClientDetailTabs**

In `ClientDetailTabs` (`src/components/clients/client-detail-tabs.tsx`), add `ovhConfig: OvhConfig | null` to props and pass it through to `DnsPanel`:

Add import:
```typescript
import type { OvhConfig } from '@prisma/client'
```

Add to `ClientDetailTabsProps`:
```typescript
ovhConfig: OvhConfig | null
```

Update function signature and `DnsPanel` call:
```typescript
export function ClientDetailTabs({
  ..., ovhConfig, canEdit,
}: ClientDetailTabsProps) {
  // ...
  <TabsContent value="dns" className="mt-4">
    <DnsPanel
      clientId={clientId}
      zones={dnsZones}
      certs={sslCerts}
      hostings={hostings}
      canEdit={canEdit}
      ovhConfig={ovhConfig}
    />
  </TabsContent>
```

In `src/app/clients/[id]/page.tsx`, pass `ovhConfig={client.ovhConfig}` to `ClientDetailTabs`.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```
Expected: All tests pass (including new ovh-client tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/clients/[id]/page.tsx src/components/clients/client-detail-tabs.tsx
git commit -m "feat: wire OVH config through client detail page to DNS panel"
```

---

## Task 9: Restart dev server and verify

- [ ] **Step 1: Kill and restart dev server**

```bash
# Windows PowerShell:
Get-Process -Name "node" | Stop-Process -Force
npm run dev
```
Wait for "Ready" output.

- [ ] **Step 2: Verify DNS tab shows connect banner**

Navigate to any client → DNS tab. Should show "Connecter un compte OVH" banner collapsed at the top, with manual zones management below.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git status  # should be clean or only untracked seed scripts
git push
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ OvhConfig model (Task 1)
- ✅ DnsZone.source + ovhZoneName fields (Task 1)
- ✅ HMAC-SHA1 OVH auth (Task 2)
- ✅ Base URL per endpoint (Task 2)
- ✅ saveOvhConfig / deleteOvhConfig (Task 3)
- ✅ GET /domain/zone list (Task 4)
- ✅ GET /domain/zone/{zone} for NS (Task 4)
- ✅ dns.Resolver with NS IPs (Task 4)
- ✅ Upsert zones + records (Task 4)
- ✅ Delete obsolete OVH zones (Task 4)
- ✅ lastSyncAt update (Task 4)
- ✅ Connect banner — state 1 (Task 5)
- ✅ Status banner — state 2 (Task 6)
- ✅ OVH badge on zones (Task 7)
- ✅ Read-only OVH zones (Task 7)
- ✅ Manual zones remain editable (Task 7)

**Type consistency:** `OvhConfig` from `@prisma/client` used consistently in Tasks 5-8. `saveOvhConfig(clientId, formData)` matches usage in Task 5 banner. `deleteOvhConfig(clientId)` matches usage in Task 6 banner.

**Known constraint:** `dns.Resolver.setServers()` requires IPv4/IPv6 addresses. Task 4 resolves NS hostnames to IPs first using the default system resolver before setting custom servers.
