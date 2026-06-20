# Comet Backup Integration — Design Spec

Date: 2026-06-20

## Objectif

Afficher le statut des sauvegardes Comet Backup par client sur le dashboard, sous forme de cartes résumé (comme les cartes Desk365 existantes). Aucun stockage Wasabi applicatif dans cette phase.

## Contexte

- Un seul serveur Comet central multi-tenant (tous les clients sur le même serveur)
- Chaque client a un compte Comet identifié par un `username`
- Le lien client ↔ compte Comet est stocké sur le modèle `Client` en BDD
- L'application appelle l'API Comet en live au chargement du dashboard (même pattern que Desk365)

---

## Architecture

### Variables d'environnement

```
COMET_SERVER_URL=https://backup.example.fr   # URL base du serveur Comet (sans slash final)
COMET_ADMIN_USER=admin                        # Compte administrateur Comet
COMET_ADMIN_PASS=xxx                          # Mot de passe admin
```

### Schéma Prisma — ajout sur `Client`

```prisma
model Client {
  ...
  cometUsername  String?   // username du compte Comet associé
}
```

Migration: `prisma migrate dev --name add_comet_username_to_client`

---

## Fichier `src/lib/comet-backup.ts`

### Authentification

L'API Comet utilise HTTP Basic Auth (admin user + password) sur toutes les requêtes `POST`.  
Les paramètres sont envoyés en `application/x-www-form-urlencoded`.

### Types

```typescript
export type CometJobStatus =
  | 'Success'      // STATUS_SUCCESS
  | 'Warning'      // STATUS_WARNING
  | 'Missed'       // STATUS_MISSED
  | 'Error'        // STATUS_ERROR
  | 'Running'      // STATUS_RUNNING

export type CometJob = {
  jobHash: string
  deviceName: string
  classificationName: string  // "Backup" | "Restore" | etc.
  status: CometJobStatus
  startTime: number           // Unix timestamp (seconds)
  endTime: number             // Unix timestamp (seconds), 0 si en cours
  sizeBytes: number           // Taille des données sauvegardées
  errorMessage: string | null
}

export type CometClientSummary = {
  username: string
  lastJobStatus: CometJobStatus | null
  lastJobTime: number | null   // Unix timestamp
  lastJobSize: number | null   // bytes
  deviceCount: number
  hasRecentJob: boolean        // job dans les dernières 48h
}
```

### Fonctions exportées

```typescript
// Vérifie que les 3 env vars sont présentes
export function cometConfigured(): boolean

// Récupère les derniers jobs d'un compte (limitHours = 48h par défaut)
export async function fetchCometClientSummary(
  username: string,
  limitHours?: number
): Promise<CometClientSummary | null>

// Récupère les résumés pour une liste de usernames en parallèle
export async function fetchCometSummaries(
  usernames: string[],
  limitHours?: number
): Promise<Map<string, CometClientSummary>>
```

### Endpoint Comet utilisé

```
POST /api/v1/admin/get-jobs-for-user
Body: Username=<admin>&Password=<pass>&AuthType=Password&TargetUser=<username>
```

La réponse est un tableau JSON de jobs. On filtre sur `StartTime >= now - limitHours*3600` et `ClassificationName === 'Backup'`. On retient le job le plus récent pour construire le `CometClientSummary`.

---

## Dashboard — section "Sauvegardes"

Position : entre Infrastructure et Tickets Desk365.

### Cartes résumé (style `InfraItem` existant)

| Carte | Valeur | Couleur |
|---|---|---|
| Clients surveillés | Nb de clients avec `cometUsername` | neutre |
| Succès (48h) | Nb de clients avec dernier job = Success/Warning | vert |
| Échecs (48h) | Nb de clients avec dernier job = Error/Missed | rouge (alert) |
| Sans sauvegarde récente | Nb de clients sans job dans les 48h | orange (alert) |

### Logique de chargement

```typescript
// Dans Promise.all du dashboard
const cometSummaries = cometConfigured() && !isClient
  ? await fetchCometSummaries(
      allClients
        .filter(c => c.cometUsername)
        .map(c => c.cometUsername!)
    )
  : new Map()
```

Les 4 métriques sont calculées côté serveur à partir de la `Map` avant le rendu JSX.

---

## Interface admin — fiche client

Ajouter un champ texte `cometUsername` dans le formulaire d'édition du client (page existante `src/app/(admin)/clients/[id]/edit`).  
La valeur est sauvegardée via la server action `updateClient` existante.

---

## Gestion des erreurs

- Si `COMET_*` env vars manquantes → section masquée (pas d'erreur visible)
- Si un appel Comet échoue pour un client → ce client est ignoré silencieusement (timeout 10s)
- Si tous les appels échouent → section affichée avec 0 partout (cohérent avec le reste du dashboard)

---

## Ce qui n'est PAS dans ce scope

- Détail par appareil / par job (page client dédiée)
- Stockage Wasabi applicatif
- Synchronisation en base / cron Comet
- Création/gestion de comptes Comet depuis l'app
