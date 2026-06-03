# LSI-Maintenance — Client Portal — Design Spec

**Date :** 2026-06-03  
**Statut :** Approuvé  
**Projet :** Application web d'administration des clients contractuels LSI-Maintenance

---

## 1. Contexte

LSI-Maintenance est un MSP (Managed Service Provider) qui gère un portefeuille de clients contractuels. L'application doit centraliser les fiches clients, leurs contacts, leurs équipements et leurs licences, avec une synchronisation initiale depuis Tactical RMM.

---

## 2. Stack technique

| Composant | Choix |
|---|---|
| Framework | Next.js 14 (App Router) |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v5 (credentials, JWT httpOnly) |
| i18n | next-intl (FR/EN) |
| UI | Tailwind CSS + shadcn/ui |
| HTTP client | Axios (appels Tactical RMM) |
| Déploiement | Docker Compose sur VPS (app + postgres) |

---

## 3. Palette de couleurs (Slate Technique)

Extrapolée depuis les logos LSI-Maintenance.

| Rôle | Valeur hex |
|---|---|
| Background | `#111820` |
| Surface | `#1A2530` |
| Card / Panel | `#22303D` |
| Border | `#252F3A` |
| Accent primaire (teal) | `#4EC9C4` |
| Accent secondaire | `#5DD4CE` |
| Texte principal | `#DCE5EC` |
| Texte secondaire / muted | `#7A8FA0` |

---

## 4. Modèle de données

### User
```
id            String   @id @default(cuid())
name          String
email         String   @unique
passwordHash  String
role          Role     // ADMIN | TECH
createdAt     DateTime @default(now())
clients       UserClient[]
```

### Client
```
id              String   @id @default(cuid())
name            String
tacticalRmmId   String?  @unique
address         String?
phone           String?
email           String?
notes           String?
createdAt       DateTime @default(now())
users           UserClient[]
contacts        Contact[]
equipment       Equipment[]
licenses        License[]
```

### UserClient (jointure many-to-many)
```
userId    String
clientId  String
@@id([userId, clientId])
```

### Contact
```
id          String   @id @default(cuid())
clientId    String
firstName   String
lastName    String
email       String?
phone       String?
role        String?  // ex: DSI, Gérant, Comptabilité
notes       String?
createdAt   DateTime @default(now())
```

### Equipment
```
id           String   @id @default(cuid())
clientId     String
type         String   // Serveur | PC | Imprimante | Switch | Autre
brand        String?
model        String?
serialNumber String?
ipAddress    String?
notes        String?
createdAt    DateTime @default(now())
```

### License
```
id          String   @id @default(cuid())
clientId    String
name        String
publisher   String?
expiryDate  DateTime?
seats       Int?
notes       String?
createdAt   DateTime @default(now())
```

### AppSetting (credentials RMM)
```
id    String @id @default(cuid())
key   String @unique
value String  // chiffré pour les secrets
```

---

## 5. Authentification & RBAC

- Login par email + mot de passe uniquement (pas d'auto-inscription)
- Session JWT stockée en cookie httpOnly via NextAuth.js v5
- Middleware Next.js protège toutes les routes sauf `/login` et `/api/auth/*` → redirige vers `/login` si non authentifié
- Règles d'accès appliquées côté serveur (Server Components + API Routes) :

| Action | TECH | ADMIN |
|---|---|---|
| Voir ses clients assignés | ✓ | ✓ |
| Voir tous les clients | ✗ | ✓ |
| Créer / modifier / supprimer client | ✗ | ✓ |
| Créer / modifier / supprimer contact | ✗ | ✓ |
| Créer / modifier / supprimer équipement | ✗ | ✓ |
| Créer / modifier / supprimer licence | ✗ | ✓ |
| Accès panneau Admin | ✗ | ✓ |
| Gérer les utilisateurs | ✗ | ✓ |
| Lancer import RMM | ✗ | ✓ |

---

## 6. Pages & Navigation

```
/login                          Public
/dashboard                      TECH + ADMIN — stats : nb clients, nb contacts, nb équipements, licences expirant dans 30 jours
/clients                        Liste clients (filtrée par rôle)
/clients/[id]                   Fiche client — onglets : Contacts / Équipements / Licences
/clients/[id]/contacts/new      ADMIN — formulaire contact
/clients/[id]/equipment/new     ADMIN — formulaire équipement
/clients/[id]/licenses/new      ADMIN — formulaire licence
/admin                          ADMIN uniquement
/admin/users                    Gestion utilisateurs + assignation clients
/admin/settings                 Credentials Tactical RMM (URL + API Key)
/admin/import                   Import / synchro clients depuis RMM
```

### Sidebar (fixe, 180px, collapsible en icônes)
- Logo LSI en haut
- Items : Dashboard · Clients · Admin (ADMIN only)
- Bas de sidebar : sélecteur FR/EN · Profil · Déconnexion
- Bouton "◀ Réduire" pour passer en mode icônes (52px)
- Sur mobile : sidebar remplacée par navigation bottom bar

---

## 7. Import Tactical RMM

1. Admin saisit `RMM_BASE_URL` et `RMM_API_KEY` dans `/admin/settings`
2. Valeurs stockées dans la table `AppSetting`, API Key chiffrée (AES-256)
3. Depuis `/admin/import`, clic sur **"Importer les clients"**
4. API Route `POST /api/rmm/import` :
   - Appel `GET {RMM_BASE_URL}/api/v3/clients/` avec header `X-API-KEY`
   - Upsert en base par `tacticalRmmId`
5. Réponse affichée : `X créés · Y mis à jour · Z inchangés`

**Données importées :** `id` (→ tacticalRmmId) + `name` uniquement.  
Contacts, équipements et licences sont gérés exclusivement dans l'application.

---

## 8. Internationalisation

- Langue par défaut : Français
- Langues supportées : `fr`, `en`
- Sélecteur visible dans la sidebar (bas) et la topbar
- Toutes les chaînes UI dans des fichiers de messages : `messages/fr.json`, `messages/en.json`
- Les données en base (noms de clients, notes) ne sont pas traduites

---

## 9. Contraintes non-fonctionnelles

- Design responsive : mobile-first, dark mode exclusif
- Pas de données sensibles en localStorage (sessions httpOnly uniquement)
- API Key RMM chiffrée en base, jamais exposée côté client
- Toutes les vérifications de rôle effectuées côté serveur, jamais uniquement côté client
