# Client Detail Page Redesign

## Goal

Remplacer l'en-tête minimaliste de la fiche client par une carte synthèse à 3 colonnes, et brancher les onglets (`ClientDetailTabs`) qui existent mais ne sont pas rendus aujourd'hui.

## Architecture

```
app/(app)/clients/[id]/page.tsx   ← Server Component (orchestrateur)
  ├── ClientHeader                ← Server Component (carte synthèse)
  │    └── ClientMenu             ← Client Component (dropdown ⋯)
  └── ClientDetailTabs            ← Client Component existant (onglets)
```

`page.tsx` fait un seul `prisma.client.findUnique` avec tous les `include` nécessaires. Les stats de la carte et les données des onglets sont extraites des mêmes données — pas de requête supplémentaire.

## Composants

### `ClientHeader` (`src/components/clients/client-header.tsx`)

Server Component. Reçoit le client complet + compteurs pré-calculés.

**Structure visuelle :**
```
┌──────────────────────────────────────────────────────────────────┐
│ Acme Corp                                               [⋯]      │
├────────────────────┬──────────────────────────┬──────────────────┤
│ 📞 +33 1 23 45 67  │  Contacts       5        │  🟢 Microsoft 365│
│ ✉ contact@acme.fr  │  Équipements   12        │  💾 Comet Backup │
│ 📍 12 r. de la Paix│  DNS·SSL·Host   6        │                  │
│                    │  VoIP           1        │                  │
│                    │  Mouvements     3        │                  │
└────────────────────┴──────────────────────────┴──────────────────┘
```

- Colonne 1 : coordonnées (phone, email, address). Champs absents omis.
- Colonne 2 : stats, lignes `label · valeur` alignées à droite.
- Colonne 3 : badges de statut — `Microsoft 365` (si `hasM365`), `Comet Backup` (si `cometUsername`), `Sync désactivée` (si `noSync`). Badges absents non rendus.
- Responsive : grille 3 colonnes → colonne unique sur mobile.

### `ClientMenu` (`src/components/clients/client-menu.tsx`)

Client Component. Rendu uniquement pour les admins.

Items :
- ✏️ Modifier → `Link` vers `/clients/[id]/edit`
- ⚙️ Paramètres → `Link` vers `/clients/[id]/parametres`
- Séparateur
- 🗑 Supprimer → `<form action={deleteWithId}><Button type="submit" variant="destructive">Supprimer</Button></form>`

Utilise `DropdownMenu` / `DropdownMenuTrigger` / `DropdownMenuContent` de shadcn/ui (déjà dans le projet).

Props : `clientId: string`, `clientName: string` (pour accessibilité).

### `page.tsx` mis à jour

Fetch unique :
```ts
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
```

Compteurs dérivés :
```ts
const dnsTotal = client.dnsZones.length + client.sslCertificates.length + client.hostings.length
const hasRmmLink = client.tacticalRmmId !== null
```

Rendu :
```tsx
<ClientHeader client={client} counts={{ contacts, equipment, dnsTotal, voip, movements }} isAdmin={isAdmin} />
<ClientDetailTabs clientId={id} contacts={...} equipment={...} ... />
```

## Fichiers modifiés / créés

| Action | Fichier |
|--------|---------|
| Créer | `src/components/clients/client-header.tsx` |
| Créer | `src/components/clients/client-menu.tsx` |
| Modifier | `src/app/(app)/clients/[id]/page.tsx` |

`client-detail-tabs.tsx` et `client-stats.tsx` ne sont pas modifiés.

## Ce qui n'est pas inclus

- Logo client (pas d'upload d'assets prévu)
- Notes dans la carte (non sélectionné par l'utilisateur)
- Animations / transitions
- Modification des onglets internes (ContactList, EquipmentList, etc.)
