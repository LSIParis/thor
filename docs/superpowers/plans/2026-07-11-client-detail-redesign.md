# Client Detail Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'en-tête minimaliste de la fiche client par une carte synthèse 3 colonnes et brancher les onglets `ClientDetailTabs` qui n'étaient pas rendus.

**Architecture:** `page.tsx` (server) fetch unique avec tous les includes → passe les données à `ClientHeader` (server) et `ClientDetailTabs` (client existant). `ClientMenu` (client) est un sous-composant de `ClientHeader` pour le dropdown ⋯.

**Tech Stack:** Next.js 16 App Router, Prisma 7, shadcn/ui (@radix-ui/react-dropdown-menu déjà installé), Tailwind CSS, TypeScript.

## Global Constraints

- Pas de nouvelle dépendance npm — `@radix-ui/react-dropdown-menu` est déjà dans package.json.
- Tous les composants UI dans `src/components/ui/`, composants clients dans `src/components/clients/`.
- Server Components par défaut ; `'use client'` uniquement quand nécessaire (interactivité).
- Aucune modification des composants d'onglets existants (ContactList, EquipmentList, etc.).
- `npx tsc --noEmit` doit passer sans erreur après chaque tâche.

---

### Task 1 : Créer le composant UI `DropdownMenu`

**Files:**
- Create: `src/components/ui/dropdown-menu.tsx`

**Interfaces:**
- Produces: exports `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` — utilisés dans Task 2.

- [ ] **Step 1 : Créer `src/components/ui/dropdown-menu.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className = '', sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 ${className}`}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className = '', inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={`relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${inset ? 'pl-8' : ''} ${className}`}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className = '', ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={`-mx-1 my-1 h-px bg-border ${className}`}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur liée à `dropdown-menu.tsx`.

- [ ] **Step 3 : Commiter**

```bash
git add src/components/ui/dropdown-menu.tsx
git commit -m "feat: ajouter composant UI DropdownMenu (radix)"
```

---

### Task 2 : Créer `ClientMenu` (dropdown ⋯)

**Files:**
- Create: `src/components/clients/client-menu.tsx`

**Interfaces:**
- Consumes: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` de `@/components/ui/dropdown-menu` (Task 1). `deleteClient` de `@/actions/clients`.
- Produces: `ClientMenu({ clientId: string, clientName: string })` — utilisé dans Task 3.

- [ ] **Step 1 : Créer `src/components/clients/client-menu.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { MoreHorizontal, Pencil, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteClient } from '@/actions/clients'

interface ClientMenuProps {
  clientId: string
  clientName: string
}

export function ClientMenu({ clientId, clientName }: ClientMenuProps) {
  const deleteWithId = deleteClient.bind(null, clientId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Actions pour ${clientName}`}>
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/clients/${clientId}/edit`} className="flex items-center gap-2">
            <Pencil size={14} /> Modifier
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/clients/${clientId}/parametres`} className="flex items-center gap-2">
            <Settings size={14} /> Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={deleteWithId} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-destructive"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commiter**

```bash
git add src/components/clients/client-menu.tsx
git commit -m "feat: ajouter ClientMenu dropdown ⋯ fiche client"
```

---

### Task 3 : Créer `ClientHeader` (carte synthèse 3 colonnes)

**Files:**
- Create: `src/components/clients/client-header.tsx`

**Interfaces:**
- Consumes: `ClientMenu` de `@/components/clients/client-menu` (Task 2).
- Produces: `ClientHeader({ client: ClientWithCounts, isAdmin: boolean })` — utilisé dans Task 4.

  `ClientWithCounts` est défini localement dans ce fichier :
  ```ts
  type ClientWithCounts = {
    id: string; name: string
    phone: string | null; email: string | null; address: string | null
    hasM365: boolean; cometUsername: string | null; noSync: boolean
    _counts: {
      contacts: number; equipment: number; dnsTotal: number
      nextcloud: number; voip: number; movements: number
    }
  }
  ```

- [ ] **Step 1 : Créer `src/components/clients/client-header.tsx`**

```tsx
import { Phone, Mail, MapPin, Cloud, HardDrive, BellOff } from 'lucide-react'
import { ClientMenu } from './client-menu'

type ClientWithCounts = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  hasM365: boolean
  cometUsername: string | null
  noSync: boolean
  _counts: {
    contacts: number
    equipment: number
    dnsTotal: number
    nextcloud: number
    voip: number
    movements: number
  }
}

interface ClientHeaderProps {
  client: ClientWithCounts
  isAdmin: boolean
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function ClientHeader({ client, isAdmin }: ClientHeaderProps) {
  const { _counts: c } = client

  return (
    <div className="bg-card border border-border rounded-lg mb-6 overflow-hidden">
      {/* Ligne titre */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60">
        <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
        {isAdmin && <ClientMenu clientId={client.id} clientName={client.name} />}
      </div>

      {/* Corps 3 colonnes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {/* Col 1 — Coordonnées */}
        <div className="px-5 py-4 space-y-1.5">
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone size={13} className="shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail size={13} className="shrink-0" />
              <span>{client.email}</span>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={13} className="shrink-0" />
              <span>{client.address}</span>
            </div>
          )}
          {!client.phone && !client.email && !client.address && (
            <span className="text-xs text-muted-foreground/50">Aucune coordonnée</span>
          )}
        </div>

        {/* Col 2 — Stats */}
        <div className="px-5 py-4 space-y-1">
          <StatRow label="Contacts"      value={c.contacts} />
          <StatRow label="Équipements"   value={c.equipment} />
          <StatRow label="DNS · SSL · Héb." value={c.dnsTotal} />
          {c.nextcloud > 0 && <StatRow label="Nextcloud" value={c.nextcloud} />}
          {c.voip > 0      && <StatRow label="VoIP"      value={c.voip} />}
          {c.movements > 0 && <StatRow label="Mouvements" value={c.movements} />}
        </div>

        {/* Col 3 — Badges */}
        <div className="px-5 py-4 flex flex-col gap-2">
          {client.hasM365 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Cloud size={13} /> Microsoft 365
            </span>
          )}
          {client.cometUsername && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <HardDrive size={13} /> Comet Backup
            </span>
          )}
          {client.noSync && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BellOff size={13} /> Sync désactivée
            </span>
          )}
          {!client.hasM365 && !client.cometUsername && !client.noSync && (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commiter**

```bash
git add src/components/clients/client-header.tsx
git commit -m "feat: ajouter ClientHeader carte synthèse 3 colonnes"
```

---

### Task 4 : Mettre à jour `page.tsx` — fetch complet + rendu

**Files:**
- Modify: `src/app/(app)/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `ClientHeader` (Task 3), `ClientDetailTabs` (existant dans `src/components/clients/client-detail-tabs.tsx`).

- [ ] **Step 1 : Remplacer intégralement `src/app/(app)/clients/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { requireAuth, canAccessClient } from '@/lib/access'
import { prisma } from '@/lib/db'
import { ClientHeader } from '@/components/clients/client-header'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'

interface Props { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const session = await requireAuth()

  const accessible = await canAccessClient(session.user.id, session.user.role, id)
  if (!accessible) notFound()

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: true,
      equipment: { include: { assignedTo: true } },
      dnsZones: { include: { records: true } },
      sslCertificates: true,
      hostings: true,
      nextcloudServices: { include: { servers: true } },
      voipServices: {
        include: { equipment: true, trunks: true, extensions: true },
      },
      personnelMovements: true,
    },
  })
  if (!client) notFound()

  const isAdmin = session.user.role === 'ADMIN'
  const canEdit = session.user.role === 'ADMIN' || session.user.role === 'TECH'
  const hasRmmLink = client.tacticalRmmId !== null

  const dnsTotal = client.dnsZones.length + client.sslCertificates.length + client.hostings.length

  const headerClient = {
    id:            client.id,
    name:          client.name,
    phone:         client.phone,
    email:         client.email,
    address:       client.address,
    hasM365:       client.hasM365,
    cometUsername: client.cometUsername,
    noSync:        client.noSync,
    _counts: {
      contacts:  client.contacts.length,
      equipment: client.equipment.length,
      dnsTotal,
      nextcloud: client.nextcloudServices.length,
      voip:      client.voipServices.length,
      movements: client.personnelMovements.length,
    },
  }

  return (
    <>
      <ClientHeader client={headerClient} isAdmin={isAdmin} />
      <ClientDetailTabs
        clientId={id}
        contacts={client.contacts}
        equipment={client.equipment}
        nextcloudServices={client.nextcloudServices}
        voipServices={client.voipServices}
        dnsZones={client.dnsZones}
        sslCerts={client.sslCertificates}
        hostings={client.hostings}
        movements={client.personnelMovements}
        canEdit={canEdit}
        hasRmmLink={hasRmmLink}
      />
    </>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript complète**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Attendu : 0 erreur.

- [ ] **Step 3 : Vérifier le build Next.js**

```bash
npx next build 2>&1 | tail -20
```

Attendu : `✓ Compiled successfully` (ou équivalent), pas d'erreur de compilation sur la route `/clients/[id]`.

- [ ] **Step 4 : Commiter et pousser**

```bash
git add src/app/\(app\)/clients/\[id\]/page.tsx
git commit -m "feat: redesign fiche client — carte synthèse + onglets branchés"
git push
```
