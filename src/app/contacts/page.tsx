import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import { ContactsView } from '@/components/contacts/contacts-view'
import { AddContactDialog } from '@/components/contacts/add-contact-dialog'
import { SyncM365Button } from '@/components/contacts/sync-m365-button'
import { ClientSelector } from '@/components/dashboard/client-selector'
import { SyncZammadButton } from '@/components/clients/sync-zammad-button'
import { SyncZammadContactsButton } from '@/components/contacts/sync-zammad-contacts-button'
import { Download } from 'lucide-react'

const CONTACT_SELECT = {
  id: true, firstName: true, lastName: true,
  email: true, phone: true, role: true, notes: true, siteId: true, noSync: true,
} as const

const ALPHA_ORDER = [{ lastName: 'asc' as const }, { firstName: 'asc' as const }]

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId  = session.user.id
  const role    = session.user.role
  const isAdmin = role === 'ADMIN'
  const accessFilter = isAdmin ? {} : { users: { some: { userId } } }

  const allClients = await prisma.client.findMany({
    where: accessFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  const allSites = await prisma.site.findMany({
    where: { client: accessFilter },
    select: { id: true, clientId: true, name: true },
    orderBy: { name: 'asc' },
  })

  // ── Vue filtrée : un seul client ──────────────────────────────────────────
  if (selectedClientId) {
    const clientAccess = isAdmin
      ? { id: selectedClientId }
      : { id: selectedClientId, users: { some: { userId } } }

    const sites = await prisma.site.findMany({
      where: { clientId: selectedClientId, client: clientAccess },
      select: {
        id: true, name: true,
        contacts: { orderBy: ALPHA_ORDER, select: CONTACT_SELECT },
      },
      orderBy: { name: 'asc' },
    })

    const unsited = await prisma.contact.findMany({
      where: { clientId: selectedClientId, siteId: null, client: clientAccess },
      orderBy: ALPHA_ORDER,
      select: CONTACT_SELECT,
    })

    const clientName = allClients.find(c => c.id === selectedClientId)?.name ?? ''
    const clientSites = allSites.filter(s => s.clientId === selectedClientId)
    const total = sites.reduce((a, s) => a + s.contacts.length, 0) + unsited.length

    return (
      <AppLayout>
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {clientName} — {total} contact{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ClientSelector clients={allClients} selectedId={selectedClientId} basePath="/contacts" />
            <a
              href={`/api/contacts/export?client=${selectedClientId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <Download size={13} /> CSV
            </a>
            {isAdmin && <SyncM365Button clientId={selectedClientId} />}
            {isAdmin && <AddContactDialog clients={allClients} sites={allSites} selectedClientId={selectedClientId} />}
          </div>
        </div>

        <ContactsView
          mode="grouped"
          siteGroups={sites.map(s => ({ id: s.id, name: s.name, contacts: s.contacts }))}
          unsited={unsited}
          clientSites={clientSites}
          isAdmin={isAdmin}
        />
      </AppLayout>
    )
  }

  // ── Vue globale : tous les clients ────────────────────────────────────────
  const contacts = await prisma.contact.findMany({
    where: { client: accessFilter },
    select: {
      ...CONTACT_SELECT,
      client: { select: { id: true, name: true } },
    },
    orderBy: [{ client: { name: 'asc' } }, ...ALPHA_ORDER],
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · {allClients.length} client{allClients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClientSelector clients={allClients} selectedId={undefined} basePath="/contacts" />
          <a
            href="/api/contacts/export"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            <Download size={13} /> CSV
          </a>
          {isAdmin && <SyncZammadContactsButton />}
          {isAdmin && <AddContactDialog clients={allClients} sites={allSites} />}
        </div>
      </div>

      <ContactsView
        mode="flat"
        contacts={contacts}
        allSites={allSites}
        isAdmin={isAdmin}
      />
    </AppLayout>
  )
}
