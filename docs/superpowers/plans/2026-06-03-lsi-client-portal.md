# LSI Client Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack dark web app for LSI-Maintenance to manage contractual clients, contacts, equipment and licenses, with role-based access (TECH/ADMIN) and Tactical RMM client import.

**Architecture:** Next.js 14 App Router monolith. Server Components fetch data directly via Prisma. Server Actions handle all form mutations. One API Route for the RMM import trigger. Auth via NextAuth.js v5 (JWT httpOnly). i18n via next-intl cookie-based (no URL prefix).

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL, Prisma, NextAuth.js v5, next-intl v3, Tailwind CSS, shadcn/ui, bcryptjs, Vitest, React Testing Library, Docker Compose

---

## File Map

```
D:\Code\thor\
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── messages/
│   ├── fr.json
│   └── en.json
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── contacts/new/page.tsx
│   │   │       ├── equipment/new/page.tsx
│   │   │       └── licenses/new/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── import/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── rmm/import/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── app-layout.tsx
│   │   ├── clients/
│   │   │   ├── client-list.tsx
│   │   │   └── client-detail-tabs.tsx
│   │   ├── contacts/
│   │   │   ├── contact-list.tsx
│   │   │   └── contact-form.tsx
│   │   ├── equipment/
│   │   │   ├── equipment-list.tsx
│   │   │   └── equipment-form.tsx
│   │   ├── licenses/
│   │   │   ├── license-list.tsx
│   │   │   └── license-form.tsx
│   │   └── admin/
│   │       ├── user-list.tsx
│   │       ├── user-form.tsx
│   │       ├── settings-form.tsx
│   │       └── import-panel.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── access.ts
│   │   ├── crypto.ts
│   │   └── rmm-client.ts
│   ├── actions/
│   │   ├── clients.ts
│   │   ├── contacts.ts
│   │   ├── equipment.ts
│   │   ├── licenses.ts
│   │   └── users.ts
│   ├── middleware.ts
│   ├── test/
│   │   └── setup.ts
│   └── types/
│       └── next-auth.d.ts
├── i18n/
│   └── request.ts
├── .env.local
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
└── components.json
```

**File Map Notes (self-review corrections):**
- `contact-form.tsx`, `equipment-form.tsx`, `license-form.tsx`, `user-form.tsx`, `settings-form.tsx`, `user-list.tsx` are NOT created — forms and lists are inline in their page files.
- `client-list.tsx`, `contact-list.tsx`, `equipment-list.tsx`, `license-list.tsx` all need `"use client"` (they use `useTranslations` hook). This is already in the code in Tasks 11–15.
- `client-detail-tabs.tsx` (Task 12) imports `ContactList`, `EquipmentList`, `LicenseList` which are only created in Tasks 13–15. **Execute Tasks 12–15 before testing the client detail page.**

---

## Task 1: Initialize Next.js project + install dependencies

**Files:**
- Create: `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `components.json`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Scaffold the project**

```bash
cd D:\Code\thor
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
```
Answer prompts: TypeScript=yes, ESLint=yes, Tailwind=yes, src/=yes, App Router=yes, alias=@/*.

- [ ] **Step 2: Install all runtime dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client next-intl bcryptjs axios
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-dropdown-menu @radix-ui/react-select lucide-react clsx tailwind-merge class-variance-authority
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/bcryptjs @types/node
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 5: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

In the `scripts` section, add:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 7: Update `.gitignore`**

Append to the existing `.gitignore`:
```
.env.local
.env*.local
.superpowers/
```

- [ ] **Step 8: Verify the project starts**

```bash
npm run dev
```
Expected: server starts on http://localhost:3000. Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js project with dependencies"
```

---

## Task 2: Prisma schema + Docker Compose

**Files:**
- Create: `prisma/schema.prisma`, `docker-compose.yml`, `.env.local`, `.env.example`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```
This creates `prisma/schema.prisma` and `.env` (rename to `.env.local`).

- [ ] **Step 2: Rename and configure `.env.local`**

```bash
# .env.local
DATABASE_URL="postgresql://lsi:lsi_secret@localhost:5432/lsi_portal?schema=public"
NEXTAUTH_SECRET="change-this-to-a-random-32-char-string"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="change-this-to-a-random-32-char-hex"
```

- [ ] **Step 3: Create `.env.example`**

```bash
# .env.example
DATABASE_URL="postgresql://user:password@localhost:5432/lsi_portal?schema=public"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
```

- [ ] **Step 4: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  TECH
}

model User {
  id           String       @id @default(cuid())
  name         String
  email        String       @unique
  passwordHash String
  role         Role         @default(TECH)
  createdAt    DateTime     @default(now())
  clients      UserClient[]
}

model Client {
  id            String       @id @default(cuid())
  name          String
  tacticalRmmId String?      @unique
  address       String?
  phone         String?
  email         String?
  notes         String?
  createdAt     DateTime     @default(now())
  users         UserClient[]
  contacts      Contact[]
  equipment     Equipment[]
  licenses      License[]
}

model UserClient {
  userId   String
  clientId String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@id([userId, clientId])
}

model Contact {
  id        String   @id @default(cuid())
  clientId  String
  firstName String
  lastName  String
  email     String?
  phone     String?
  role      String?
  notes     String?
  createdAt DateTime @default(now())
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model Equipment {
  id           String   @id @default(cuid())
  clientId     String
  type         String
  brand        String?
  model        String?
  serialNumber String?
  ipAddress    String?
  notes        String?
  createdAt    DateTime @default(now())
  client       Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model License {
  id         String    @id @default(cuid())
  clientId   String
  name       String
  publisher  String?
  expiryDate DateTime?
  seats      Int?
  notes      String?
  createdAt  DateTime  @default(now())
  client     Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model AppSetting {
  id    String @id @default(cuid())
  key   String @unique
  value String
}
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: lsi
      POSTGRES_PASSWORD: lsi_secret
      POSTGRES_DB: lsi_portal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 6: Start the database**

```bash
docker compose up -d
```
Expected: postgres container running.

- [ ] **Step 7: Create Prisma client singleton `src/lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 8: Run the migration**

```bash
npx prisma migrate dev --name init
```
Expected: Migration created and applied, tables created.

- [ ] **Step 9: Verify schema in Prisma Studio**

```bash
npx prisma studio
```
Expected: Studio opens, all tables visible. Close with Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add prisma/ src/lib/db.ts docker-compose.yml .env.example
git commit -m "feat: add Prisma schema and Docker Compose setup"
```

---

## Task 3: Seed initial admin user

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Write `prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('Admin1234!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@lsi-maintenance.fr' },
    update: {},
    create: {
      name: 'Administrateur',
      email: 'admin@lsi-maintenance.fr',
      passwordHash: hash,
      role: 'ADMIN',
    },
  })
  console.log('Admin user seeded: admin@lsi-maintenance.fr / Admin1234!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Add prisma seed config to `package.json`**

In `package.json`, add a top-level `prisma` key:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```
Also add `ts-node` dev dependency:
```bash
npm install -D ts-node
```

- [ ] **Step 3: Run the seed**

```bash
npx prisma db seed
```
Expected output: `Admin user seeded: admin@lsi-maintenance.fr / Admin1234!`

- [ ] **Step 4: Verify in Prisma Studio**

```bash
npx prisma studio
```
Open User table — should show one ADMIN user. Close with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add admin user seed script"
```

---

## Task 4: NextAuth.js v5 + session types

**Files:**
- Create: `src/lib/auth.ts`, `src/types/next-auth.d.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write failing test for auth `authorize`**

Create `src/lib/auth.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

describe('authorize', () => {
  it('returns null when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const { authorize } = await import('./auth.helpers')
    const result = await authorize({ email: 'x@x.com', password: 'pw' })
    expect(result).toBeNull()
  })

  it('returns null when password wrong', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1', name: 'Test', email: 'x@x.com',
      passwordHash: await bcrypt.hash('correct', 10),
      role: 'TECH', createdAt: new Date(), clients: [],
    } as any)
    const { authorize } = await import('./auth.helpers')
    const result = await authorize({ email: 'x@x.com', password: 'wrong' })
    expect(result).toBeNull()
  })

  it('returns user when credentials valid', async () => {
    const hash = await bcrypt.hash('correct', 10)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1', name: 'Test', email: 'x@x.com',
      passwordHash: hash, role: 'TECH', createdAt: new Date(), clients: [],
    } as any)
    const { authorize } = await import('./auth.helpers')
    const result = await authorize({ email: 'x@x.com', password: 'correct' })
    expect(result).toMatchObject({ id: '1', email: 'x@x.com', role: 'TECH' })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- src/lib/auth.test.ts
```
Expected: FAIL — `Cannot find module './auth.helpers'`

- [ ] **Step 3: Create `src/lib/auth.helpers.ts`** (extracted pure logic for testability)

```typescript
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function authorize(credentials: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: credentials.email } })
  if (!user) return null
  const valid = await bcrypt.compare(credentials.password, user.passwordHash)
  if (!valid) return null
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test:run -- src/lib/auth.test.ts
```
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Create `src/lib/auth.ts`**

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authorize } from './auth.helpers'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        return authorize({
          email: credentials.email as string,
          password: credentials.password as string,
        })
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.id = token.id as string
      return session
    },
  },
  pages: { signIn: '/login' },
})
```

- [ ] **Step 6: Extend NextAuth types in `src/types/next-auth.d.ts`**

```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
}
```

- [ ] **Step 7: Create `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/ src/types/ src/app/api/auth/
git commit -m "feat: add NextAuth.js v5 with credential provider"
```

---

## Task 5: Auth middleware + access helpers

**Files:**
- Create: `src/middleware.ts`, `src/lib/access.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/api/auth')

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Admin-only route guard
  if (pathname.startsWith('/admin') && req.auth?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
```

- [ ] **Step 2: Create `src/lib/access.ts`**

```typescript
import { auth } from './auth'
import { prisma } from './db'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

export async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}

export async function getAccessibleClients(userId: string, role: string) {
  if (role === 'ADMIN') {
    return prisma.client.findMany({ orderBy: { name: 'asc' } })
  }
  return prisma.client.findMany({
    where: { users: { some: { userId } } },
    orderBy: { name: 'asc' },
  })
}

export async function canAccessClient(userId: string, role: string, clientId: string) {
  if (role === 'ADMIN') return true
  const link = await prisma.userClient.findUnique({
    where: { userId_clientId: { userId, clientId } },
  })
  return !!link
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/lib/access.ts
git commit -m "feat: add auth middleware and access control helpers"
```

---

## Task 6: next-intl (cookie-based, no URL prefix)

**Files:**
- Create: `i18n/request.ts`, `messages/fr.json`, `messages/en.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Create `i18n/request.ts`**

```typescript
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'fr'
  const validLocales = ['fr', 'en']
  const safeLocale = validLocales.includes(locale) ? locale : 'fr'

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  }
})
```

- [ ] **Step 2: Create `messages/fr.json`**

```json
{
  "nav": {
    "dashboard": "Tableau de bord",
    "clients": "Clients",
    "admin": "Administration",
    "logout": "Déconnexion",
    "profile": "Mon profil"
  },
  "login": {
    "title": "Connexion",
    "email": "Email",
    "password": "Mot de passe",
    "submit": "Se connecter",
    "error": "Email ou mot de passe incorrect"
  },
  "dashboard": {
    "title": "Tableau de bord",
    "clients": "Clients",
    "contacts": "Contacts",
    "equipment": "Équipements",
    "expiringSoon": "Licences expirant dans 30 jours"
  },
  "clients": {
    "title": "Clients",
    "new": "Nouveau client",
    "search": "Rechercher un client...",
    "noResults": "Aucun client trouvé",
    "contacts": "Contacts",
    "equipment": "Équipements",
    "licences": "Licences",
    "name": "Nom",
    "address": "Adresse",
    "phone": "Téléphone",
    "email": "Email",
    "notes": "Notes",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "addContact": "Ajouter un contact",
    "addEquipment": "Ajouter un équipement",
    "addLicense": "Ajouter une licence"
  },
  "contacts": {
    "firstName": "Prénom",
    "lastName": "Nom",
    "email": "Email",
    "phone": "Téléphone",
    "role": "Fonction",
    "notes": "Notes",
    "new": "Nouveau contact",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer"
  },
  "equipment": {
    "type": "Type",
    "brand": "Marque",
    "model": "Modèle",
    "serialNumber": "N° de série",
    "ipAddress": "Adresse IP",
    "notes": "Notes",
    "types": {
      "Serveur": "Serveur",
      "PC": "PC",
      "Imprimante": "Imprimante",
      "Switch": "Switch",
      "Autre": "Autre"
    },
    "new": "Nouvel équipement",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer"
  },
  "licenses": {
    "name": "Nom du logiciel",
    "publisher": "Éditeur",
    "expiryDate": "Date d'expiration",
    "seats": "Nb de postes",
    "notes": "Notes",
    "new": "Nouvelle licence",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "expired": "Expirée",
    "expiringSoon": "Expire bientôt"
  },
  "admin": {
    "title": "Administration",
    "users": "Utilisateurs",
    "settings": "Paramètres RMM",
    "import": "Importer depuis RMM",
    "newUser": "Nouvel utilisateur",
    "name": "Nom",
    "email": "Email",
    "role": "Rôle",
    "password": "Mot de passe",
    "assignedClients": "Clients assignés",
    "rmmUrl": "URL Tactical RMM",
    "rmmApiKey": "API Key RMM",
    "saveSettings": "Enregistrer les paramètres",
    "importClients": "Importer les clients",
    "importing": "Import en cours...",
    "importResult": "{created} créés · {updated} mis à jour · {unchanged} inchangés",
    "roles": {
      "ADMIN": "Administrateur",
      "TECH": "Technicien"
    }
  },
  "common": {
    "loading": "Chargement...",
    "error": "Une erreur est survenue",
    "confirmDelete": "Confirmer la suppression ?",
    "yes": "Oui",
    "no": "Non"
  }
}
```

- [ ] **Step 3: Create `messages/en.json`**

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "clients": "Clients",
    "admin": "Administration",
    "logout": "Logout",
    "profile": "My profile"
  },
  "login": {
    "title": "Login",
    "email": "Email",
    "password": "Password",
    "submit": "Sign in",
    "error": "Incorrect email or password"
  },
  "dashboard": {
    "title": "Dashboard",
    "clients": "Clients",
    "contacts": "Contacts",
    "equipment": "Equipment",
    "expiringSoon": "Licenses expiring within 30 days"
  },
  "clients": {
    "title": "Clients",
    "new": "New client",
    "search": "Search clients...",
    "noResults": "No clients found",
    "contacts": "Contacts",
    "equipment": "Equipment",
    "licences": "Licenses",
    "name": "Name",
    "address": "Address",
    "phone": "Phone",
    "email": "Email",
    "notes": "Notes",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "addContact": "Add contact",
    "addEquipment": "Add equipment",
    "addLicense": "Add license"
  },
  "contacts": {
    "firstName": "First name",
    "lastName": "Last name",
    "email": "Email",
    "phone": "Phone",
    "role": "Role",
    "notes": "Notes",
    "new": "New contact",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "equipment": {
    "type": "Type",
    "brand": "Brand",
    "model": "Model",
    "serialNumber": "Serial number",
    "ipAddress": "IP address",
    "notes": "Notes",
    "types": {
      "Serveur": "Server",
      "PC": "PC",
      "Imprimante": "Printer",
      "Switch": "Switch",
      "Autre": "Other"
    },
    "new": "New equipment",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "licenses": {
    "name": "Software name",
    "publisher": "Publisher",
    "expiryDate": "Expiry date",
    "seats": "Seats",
    "notes": "Notes",
    "new": "New license",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "expired": "Expired",
    "expiringSoon": "Expiring soon"
  },
  "admin": {
    "title": "Administration",
    "users": "Users",
    "settings": "RMM Settings",
    "import": "Import from RMM",
    "newUser": "New user",
    "name": "Name",
    "email": "Email",
    "role": "Role",
    "password": "Password",
    "assignedClients": "Assigned clients",
    "rmmUrl": "Tactical RMM URL",
    "rmmApiKey": "RMM API Key",
    "saveSettings": "Save settings",
    "importClients": "Import clients",
    "importing": "Importing...",
    "importResult": "{created} created · {updated} updated · {unchanged} unchanged",
    "roles": {
      "ADMIN": "Administrator",
      "TECH": "Technician"
    }
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "confirmDelete": "Confirm deletion?",
    "yes": "Yes",
    "no": "No"
  }
}
```

- [ ] **Step 4: Update `next.config.ts`**

```typescript
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
```

- [ ] **Step 5: Commit**

```bash
git add i18n/ messages/ next.config.ts
git commit -m "feat: add next-intl bilingual support (FR/EN)"
```

---

## Task 7: Tailwind theme (LSI palette) + shadcn/ui

**Files:**
- Modify: `tailwind.config.ts`, `src/app/globals.css`
- Create: `components.json`

- [ ] **Step 1: Update `src/app/globals.css`**

Replace the entire file:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 215 30% 9%;
    --foreground: 210 31% 89%;
    --card: 210 29% 15%;
    --card-foreground: 210 31% 89%;
    --popover: 210 27% 19%;
    --popover-foreground: 210 31% 89%;
    --primary: 178 48% 55%;
    --primary-foreground: 215 30% 9%;
    --secondary: 210 27% 19%;
    --secondary-foreground: 210 31% 89%;
    --muted: 210 27% 19%;
    --muted-foreground: 210 19% 55%;
    --accent: 178 48% 55%;
    --accent-foreground: 215 30% 9%;
    --destructive: 0 62% 55%;
    --destructive-foreground: 210 31% 89%;
    --border: 212 24% 20%;
    --input: 212 24% 20%;
    --ring: 178 48% 55%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
}
```

- [ ] **Step 2: Update `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Create `components.json` for shadcn/ui**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 4: Create `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Install shadcn/ui components**

```bash
npx shadcn@latest add button input label card tabs badge select dialog
```
Accept all prompts.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css tailwind.config.ts components.json src/lib/utils.ts src/components/ui/
git commit -m "feat: configure LSI Tailwind theme and shadcn/ui components"
```

---

## Task 8: App shell — sidebar + root layout

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `src/components/layout/app-layout.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/layout/sidebar.tsx`**

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, Users, Settings, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userRole: string
  userName: string
  locale: string
}

export function Sidebar({ userRole, userName, locale }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const t = useTranslations('nav')

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/clients', label: t('clients'), icon: Users },
    ...(userRole === 'ADMIN'
      ? [{ href: '/admin', label: t('admin'), icon: Settings }]
      : []),
  ]

  const switchLocale = () => {
    const next = locale === 'fr' ? 'en' : 'fr'
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`
    window.location.reload()
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-[52px]' : 'w-[180px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center px-3 py-4 border-b border-border min-h-[56px]">
        {!collapsed && (
          <div>
            <div className="text-primary font-bold text-sm tracking-widest">LSI</div>
            <div className="text-muted-foreground text-[10px] tracking-wider">MAINTENANCE</div>
          </div>
        )}
        {collapsed && <div className="text-primary font-bold text-xs mx-auto">L</div>}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
              pathname.startsWith(href)
                ? 'text-foreground bg-secondary border-l-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border py-2">
        <button
          onClick={switchLocale}
          title="Switch language"
          className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full"
        >
          <span className="text-xs font-mono flex-shrink-0">
            {locale.toUpperCase()}
          </span>
          {!collapsed && <span>{locale === 'fr' ? 'English' : 'Français'}</span>}
        </button>

        {!collapsed && (
          <div className="px-3 py-1 text-xs text-muted-foreground truncate flex items-center gap-2">
            <User size={12} />
            <span className="truncate">{userName}</span>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={t('logout')}
          className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-destructive w-full"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full"
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Réduire</span></>}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/app-layout.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from './sidebar'

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'fr'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={session.user.role}
        userName={session.user.name ?? ''}
        locale={locale}
      />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'LSI Maintenance — Client Portal',
  description: 'Portail de gestion des clients LSI-Maintenance',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Add SessionProvider wrapper**

Install next-auth React bindings wrapper. Create `src/components/providers.tsx`:
```typescript
'use client'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

Update `src/app/layout.tsx` to wrap with `<Providers>`:
```typescript
import { Providers } from '@/components/providers'
// Inside <body>:
<Providers>
  <NextIntlClientProvider messages={messages}>
    {children}
  </NextIntlClientProvider>
</Providers>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx src/components/providers.tsx
git commit -m "feat: add app shell with collapsible sidebar"
```

---

## Task 9: Login page

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/login/login-form.tsx`

- [ ] **Step 1: Write failing test for LoginForm**

Create `src/app/login/login-form.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './login-form'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('calls signIn on submit', async () => {
    const { signIn } = await import('next-auth/react')
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
      email: 'test@test.com',
      password: 'password',
    }))
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- src/app/login/login-form.test.tsx
```
Expected: FAIL — `Cannot find module './login-form'`

- [ ] **Step 3: Create `src/app/login/login-form.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const t = useTranslations('login')
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: data.get('email'),
      password: data.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (result?.ok) {
      router.push('/dashboard')
    } else {
      setError(t('error'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="space-y-1">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">{t('password')}</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading} aria-label="submit">
        {loading ? '...' : t('submit')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test:run -- src/app/login/login-form.test.tsx
```
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Create `src/app/login/page.tsx`**

```typescript
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from './login-form'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function LoginPage() {
  const t = await getTranslations('login')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-3">
          <Image
            src="/logo-lsi-800px.png"
            alt="LSI Maintenance"
            width={200}
            height={80}
            className="object-contain"
            priority
          />
          <h1 className="text-lg font-semibold">{t('title')}</h1>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Copy logos to `public/`**

```bash
cp logo-lsi-800px.png public/
cp logo-lsi-carre-01.jpg public/
```

- [ ] **Step 7: Test login in browser**

```bash
npm run dev
```
Navigate to http://localhost:3000/login. Log in with `admin@lsi-maintenance.fr` / `Admin1234!`. Should redirect to `/dashboard`.

- [ ] **Step 8: Commit**

```bash
git add src/app/login/ public/
git commit -m "feat: add login page with NextAuth credentials"
```

---

## Task 10: Dashboard stats page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Contact, Monitor, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const session = await requireAuth()
  const t = await getTranslations('dashboard')

  const userId = session.user.id
  const role = session.user.role

  const clientFilter =
    role === 'ADMIN' ? {} : { users: { some: { userId } } }

  const [clientCount, contactCount, equipmentCount, expiringSoonCount] =
    await Promise.all([
      prisma.client.count({ where: clientFilter }),
      prisma.contact.count({ where: { client: clientFilter } }),
      prisma.equipment.count({ where: { client: clientFilter } }),
      prisma.license.count({
        where: {
          client: clientFilter,
          expiryDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

  const stats = [
    { label: t('clients'), value: clientCount, icon: Users },
    { label: t('contacts'), value: contactCount, icon: Contact },
    { label: t('equipment'), value: equipmentCount, icon: Monitor },
    { label: t('expiringSoon'), value: expiringSoonCount, icon: AlertTriangle },
  ]

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-6">{t('title')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon size={16} className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 2: Add root redirect `src/app/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/ src/app/page.tsx
git commit -m "feat: add dashboard with stats"
```

---

## Task 11: Clients list page

**Files:**
- Create: `src/app/clients/page.tsx`, `src/components/clients/client-list.tsx`
- Create: `src/actions/clients.ts`

- [ ] **Step 1: Create `src/actions/clients.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createClient(formData: FormData) {
  await requireAdmin()
  await prisma.client.create({
    data: {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath('/clients')
  redirect('/clients')
}

export async function updateClient(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteClient(clientId: string) {
  await requireAdmin()
  await prisma.client.delete({ where: { id: clientId } })
  revalidatePath('/clients')
  redirect('/clients')
}
```

- [ ] **Step 2: Create `src/components/clients/client-list.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import type { Client } from '@prisma/client'

interface ClientWithCounts extends Client {
  _count: { contacts: number; equipment: number; licenses: number }
}

interface ClientListProps {
  clients: ClientWithCounts[]
}

export function ClientList({ clients }: ClientListProps) {
  const t = useTranslations('clients')

  if (clients.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('noResults')}</p>
  }

  return (
    <div className="space-y-2">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/clients/${client.id}`}
          className="block p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{client.name}</span>
            <div className="flex gap-2">
              <Badge variant="secondary">{client._count.contacts} contacts</Badge>
              <Badge variant="secondary">{client._count.equipment} équip.</Badge>
              <Badge variant="secondary">{client._count.licenses} lic.</Badge>
            </div>
          </div>
          {client.phone && (
            <p className="text-muted-foreground text-sm mt-1">{client.phone}</p>
          )}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/clients/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAuth, getAccessibleClients } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { ClientList } from '@/components/clients/client-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function ClientsPage() {
  const session = await requireAuth()
  const t = await getTranslations('clients')

  const clients = await prisma.client.findMany({
    where:
      session.user.role === 'ADMIN'
        ? undefined
        : { users: { some: { userId: session.user.id } } },
    orderBy: { name: 'asc' },
    include: { _count: { select: { contacts: true, equipment: true, licenses: true } } },
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {session.user.role === 'ADMIN' && (
          <Button asChild>
            <Link href="/clients/new">{t('new')}</Link>
          </Button>
        )}
      </div>
      <ClientList clients={clients} />
    </AppLayout>
  )
}
```

- [ ] **Step 4: Create `src/app/clients/new/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function NewClientPage() {
  await requireAdmin()
  const t = await getTranslations('clients')

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createClient} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">{t('address')}</Label>
            <Input id="address" name="address" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('save')}</Button>
            <Button variant="ghost" asChild>
              <Link href="/clients">{t('cancel')}</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/clients/ src/components/clients/ src/actions/clients.ts
git commit -m "feat: add clients list and create pages"
```

---

## Task 12: Client detail page with tabs

**Files:**
- Create: `src/app/clients/[id]/page.tsx`, `src/components/clients/client-detail-tabs.tsx`

- [ ] **Step 1: Create `src/components/clients/client-detail-tabs.tsx`**

```typescript
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { ContactList } from '@/components/contacts/contact-list'
import { EquipmentList } from '@/components/equipment/equipment-list'
import { LicenseList } from '@/components/licenses/license-list'
import type { Contact, Equipment, License } from '@prisma/client'

interface ClientDetailTabsProps {
  clientId: string
  contacts: Contact[]
  equipment: Equipment[]
  licenses: License[]
  canEdit: boolean
}

export function ClientDetailTabs({
  clientId, contacts, equipment, licenses, canEdit,
}: ClientDetailTabsProps) {
  const t = useTranslations('clients')

  return (
    <Tabs defaultValue="contacts">
      <TabsList>
        <TabsTrigger value="contacts">
          {t('contacts')} ({contacts.length})
        </TabsTrigger>
        <TabsTrigger value="equipment">
          {t('equipment')} ({equipment.length})
        </TabsTrigger>
        <TabsTrigger value="licences">
          {t('licences')} ({licenses.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="contacts" className="mt-4">
        <ContactList contacts={contacts} clientId={clientId} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="equipment" className="mt-4">
        <EquipmentList equipment={equipment} clientId={clientId} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="licences" className="mt-4">
        <LicenseList licenses={licenses} clientId={clientId} canEdit={canEdit} />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Create `src/app/clients/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAuth, canAccessClient } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { deleteClient } from '@/actions/clients'

interface Props { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const session = await requireAuth()
  const t = await getTranslations('clients')

  const accessible = await canAccessClient(session.user.id, session.user.role, id)
  if (!accessible) notFound()

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { lastName: 'asc' } },
      equipment: { orderBy: { type: 'asc' } },
      licenses: { orderBy: { name: 'asc' } },
    },
  })
  if (!client) notFound()

  const isAdmin = session.user.role === 'ADMIN'
  const deleteWithId = deleteClient.bind(null, id)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          {client.phone && <p className="text-muted-foreground text-sm">{client.phone}</p>}
          {client.email && <p className="text-muted-foreground text-sm">{client.email}</p>}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/clients/${id}/edit`}>{t('edit')}</Link>
            </Button>
            <form action={deleteWithId}>
              <Button variant="destructive" type="submit">{t('delete')}</Button>
            </form>
          </div>
        )}
      </div>
      <ClientDetailTabs
        clientId={id}
        contacts={client.contacts}
        equipment={client.equipment}
        licenses={client.licenses}
        canEdit={isAdmin}
      />
    </AppLayout>
  )
}
```

- [ ] **Step 3: Create `src/app/clients/[id]/edit/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { updateClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('clients')

  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) notFound()

  const updateWithId = updateClient.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('edit')}: {client.name}</h1>
        <form action={updateWithId} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" defaultValue={client.name} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">{t('address')}</Label>
            <Input id="address" name="address" defaultValue={client.address ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" name="phone" defaultValue={client.phone ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" defaultValue={client.email ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={client.notes ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('save')}</Button>
            <Button variant="ghost" asChild>
              <Link href={`/clients/${id}`}>{t('cancel')}</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/clients/[id]/ src/components/clients/client-detail-tabs.tsx
git commit -m "feat: add client detail page with tabs"
```

---

## Task 13: Contacts CRUD

**Files:**
- Create: `src/actions/contacts.ts`
- Create: `src/components/contacts/contact-list.tsx`, `src/components/contacts/contact-form.tsx`
- Create: `src/app/clients/[id]/contacts/new/page.tsx`

- [ ] **Step 1: Create `src/actions/contacts.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createContact(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.contact.create({
    data: {
      clientId,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      role: (formData.get('role') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteContact(contactId: string, clientId: string) {
  await requireAdmin()
  await prisma.contact.delete({ where: { id: contactId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}
```

- [ ] **Step 2: Create `src/components/contacts/contact-list.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { deleteContact } from '@/actions/contacts'
import type { Contact } from '@prisma/client'

interface ContactListProps {
  contacts: Contact[]
  clientId: string
  canEdit: boolean
}

export function ContactList({ contacts, clientId, canEdit }: ContactListProps) {
  const t = useTranslations('contacts')

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="mb-4">
          <Button asChild size="sm">
            <Link href={`/clients/${clientId}/contacts/new`}>{t('new')}</Link>
          </Button>
        </div>
      )}
      {contacts.length === 0 && (
        <p className="text-muted-foreground text-sm">—</p>
      )}
      {contacts.map((contact) => {
        const deleteWithIds = deleteContact.bind(null, contact.id, clientId)
        return (
          <div key={contact.id} className="p-3 rounded bg-secondary flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">
                {contact.firstName} {contact.lastName}
              </div>
              {contact.role && (
                <div className="text-muted-foreground text-xs">{contact.role}</div>
              )}
              <div className="text-muted-foreground text-xs">
                {contact.email} {contact.phone && `· ${contact.phone}`}
              </div>
            </div>
            {canEdit && (
              <form action={deleteWithIds}>
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  {t('delete')}
                </Button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/clients/[id]/contacts/new/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createContact } from '@/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function NewContactPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('contacts')

  const createWithClientId = createContact.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createWithClientId} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">{t('firstName')} *</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t('lastName')} *</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">{t('role')}</Label>
            <Input id="role" name="role" placeholder="ex: DSI, Gérant..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('save')}</Button>
            <Button variant="ghost" asChild>
              <Link href={`/clients/${id}`}>{t('cancel')}</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/contacts.ts src/components/contacts/ src/app/clients/
git commit -m "feat: add contacts CRUD"
```

---

## Task 14: Equipment CRUD

**Files:**
- Create: `src/actions/equipment.ts`
- Create: `src/components/equipment/equipment-list.tsx`
- Create: `src/app/clients/[id]/equipment/new/page.tsx`

- [ ] **Step 1: Create `src/actions/equipment.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEquipment(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.equipment.create({
    data: {
      clientId,
      type: formData.get('type') as string,
      brand: (formData.get('brand') as string) || null,
      model: (formData.get('model') as string) || null,
      serialNumber: (formData.get('serialNumber') as string) || null,
      ipAddress: (formData.get('ipAddress') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteEquipment(equipmentId: string, clientId: string) {
  await requireAdmin()
  await prisma.equipment.delete({ where: { id: equipmentId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}
```

- [ ] **Step 2: Create `src/components/equipment/equipment-list.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteEquipment } from '@/actions/equipment'
import type { Equipment } from '@prisma/client'

interface EquipmentListProps {
  equipment: Equipment[]
  clientId: string
  canEdit: boolean
}

export function EquipmentList({ equipment, clientId, canEdit }: EquipmentListProps) {
  const t = useTranslations('equipment')

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="mb-4">
          <Button asChild size="sm">
            <Link href={`/clients/${clientId}/equipment/new`}>{t('new')}</Link>
          </Button>
        </div>
      )}
      {equipment.length === 0 && (
        <p className="text-muted-foreground text-sm">—</p>
      )}
      {equipment.map((item) => {
        const deleteWithIds = deleteEquipment.bind(null, item.id, clientId)
        return (
          <div key={item.id} className="p-3 rounded bg-secondary flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t(`types.${item.type}` as any)}</Badge>
                <span className="font-medium text-sm">
                  {item.brand} {item.model}
                </span>
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                {item.serialNumber && `S/N: ${item.serialNumber}`}
                {item.ipAddress && ` · IP: ${item.ipAddress}`}
              </div>
            </div>
            {canEdit && (
              <form action={deleteWithIds}>
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  {t('delete')}
                </Button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/clients/[id]/equipment/new/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createEquipment } from '@/actions/equipment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

const EQUIPMENT_TYPES = ['Serveur', 'PC', 'Imprimante', 'Switch', 'Autre']

export default async function NewEquipmentPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('equipment')

  const createWithClientId = createEquipment.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createWithClientId} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="type">{t('type')} *</Label>
            <select
              id="type"
              name="type"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>{t(`types.${type}` as any)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="brand">{t('brand')}</Label>
              <Input id="brand" name="brand" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model">{t('model')}</Label>
              <Input id="model" name="model" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="serialNumber">{t('serialNumber')}</Label>
            <Input id="serialNumber" name="serialNumber" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ipAddress">{t('ipAddress')}</Label>
            <Input id="ipAddress" name="ipAddress" placeholder="192.168.1.x" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('save')}</Button>
            <Button variant="ghost" asChild>
              <Link href={`/clients/${id}`}>{t('cancel')}</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/equipment.ts src/components/equipment/ src/app/clients/
git commit -m "feat: add equipment CRUD"
```

---

## Task 15: Licenses CRUD

**Files:**
- Create: `src/actions/licenses.ts`
- Create: `src/components/licenses/license-list.tsx`
- Create: `src/app/clients/[id]/licenses/new/page.tsx`

- [ ] **Step 1: Create `src/actions/licenses.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createLicense(clientId: string, formData: FormData) {
  await requireAdmin()
  const expiryRaw = formData.get('expiryDate') as string
  await prisma.license.create({
    data: {
      clientId,
      name: formData.get('name') as string,
      publisher: (formData.get('publisher') as string) || null,
      expiryDate: expiryRaw ? new Date(expiryRaw) : null,
      seats: formData.get('seats') ? parseInt(formData.get('seats') as string, 10) : null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteLicense(licenseId: string, clientId: string) {
  await requireAdmin()
  await prisma.license.delete({ where: { id: licenseId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}
```

- [ ] **Step 2: Create `src/components/licenses/license-list.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteLicense } from '@/actions/licenses'
import type { License } from '@prisma/client'

interface LicenseListProps {
  licenses: License[]
  clientId: string
  canEdit: boolean
}

function getLicenseStatus(expiryDate: Date | null) {
  if (!expiryDate) return null
  const now = Date.now()
  const diff = expiryDate.getTime() - now
  if (diff < 0) return 'expired'
  if (diff < 30 * 24 * 60 * 60 * 1000) return 'expiringSoon'
  return null
}

export function LicenseList({ licenses, clientId, canEdit }: LicenseListProps) {
  const t = useTranslations('licenses')

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="mb-4">
          <Button asChild size="sm">
            <Link href={`/clients/${clientId}/licenses/new`}>{t('new')}</Link>
          </Button>
        </div>
      )}
      {licenses.length === 0 && (
        <p className="text-muted-foreground text-sm">—</p>
      )}
      {licenses.map((lic) => {
        const status = getLicenseStatus(lic.expiryDate)
        const deleteWithIds = deleteLicense.bind(null, lic.id, clientId)
        return (
          <div key={lic.id} className="p-3 rounded bg-secondary flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{lic.name}</span>
                {status === 'expired' && (
                  <Badge variant="destructive">{t('expired')}</Badge>
                )}
                {status === 'expiringSoon' && (
                  <Badge className="bg-yellow-600 text-white">{t('expiringSoon')}</Badge>
                )}
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                {lic.publisher && `${lic.publisher} · `}
                {lic.seats && `${lic.seats} postes · `}
                {lic.expiryDate && `Exp: ${lic.expiryDate.toLocaleDateString('fr-FR')}`}
              </div>
            </div>
            {canEdit && (
              <form action={deleteWithIds}>
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  {t('delete')}
                </Button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/clients/[id]/licenses/new/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createLicense } from '@/actions/licenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function NewLicensePage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('licenses')

  const createWithClientId = createLicense.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('new')}</h1>
        <form action={createWithClientId} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="publisher">{t('publisher')}</Label>
            <Input id="publisher" name="publisher" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="expiryDate">{t('expiryDate')}</Label>
              <Input id="expiryDate" name="expiryDate" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="seats">{t('seats')}</Label>
              <Input id="seats" name="seats" type="number" min="1" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('save')}</Button>
            <Button variant="ghost" asChild>
              <Link href={`/clients/${id}`}>{t('cancel')}</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/licenses.ts src/components/licenses/ src/app/clients/
git commit -m "feat: add licenses CRUD"
```

---

## Task 16: Admin — User management

**Files:**
- Create: `src/actions/users.ts`
- Create: `src/app/admin/page.tsx`, `src/app/admin/users/page.tsx`
- Create: `src/components/admin/user-list.tsx`

- [ ] **Step 1: Create `src/actions/users.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  await requireAdmin()
  const password = formData.get('password') as string
  const hash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      passwordHash: hash,
      role: formData.get('role') as 'ADMIN' | 'TECH',
    },
  })
  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function assignClientToUser(userId: string, formData: FormData) {
  await requireAdmin()
  const clientId = formData.get('clientId') as string
  await prisma.userClient.upsert({
    where: { userId_clientId: { userId, clientId } },
    update: {},
    create: { userId, clientId },
  })
  revalidatePath('/admin/users')
  redirect(`/admin/users/${userId}`)
}

export async function unassignClientFromUser(userId: string, clientId: string) {
  await requireAdmin()
  await prisma.userClient.delete({
    where: { userId_clientId: { userId, clientId } },
  })
  revalidatePath('/admin/users')
  redirect(`/admin/users/${userId}`)
}
```

- [ ] **Step 2: Create `src/app/admin/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
export default function AdminPage() { redirect('/admin/users') }
```

- [ ] **Step 3: Create `src/app/admin/users/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteUser } from '@/actions/users'

export default async function UsersPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { clients: { include: { client: true } } },
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('users')}</h1>
        <Button asChild>
          <Link href="/admin/users/new">{t('newUser')}</Link>
        </Button>
      </div>
      <div className="space-y-2">
        {users.map((user) => {
          const deleteWithId = deleteUser.bind(null, user.id)
          return (
            <div key={user.id} className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {t(`roles.${user.role}`)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-sm">{user.email}</div>
                  {user.role === 'TECH' && user.clients.length > 0 && (
                    <div className="text-muted-foreground text-xs mt-1">
                      {user.clients.map((uc) => uc.client.name).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {user.role === 'TECH' && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}`}>{t('assignedClients')}</Link>
                    </Button>
                  )}
                  <form action={deleteWithId}>
                    <Button variant="destructive" size="sm" type="submit">
                      Supprimer
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Create `src/app/admin/users/new/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { createUser } from '@/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default async function NewUserPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('newUser')}</h1>
        <form action={createUser} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')} *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t('password')} *</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">{t('role')}</Label>
            <select
              id="role"
              name="role"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="TECH">{t('roles.TECH')}</option>
              <option value="ADMIN">{t('roles.ADMIN')}</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{t('saveSettings')}</Button>
            <Button variant="ghost" asChild>
              <Link href="/admin/users">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 5: Create `src/app/admin/users/[id]/page.tsx`** (client assignment)

```typescript
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { assignClientToUser, unassignClientFromUser } from '@/actions/users'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function UserAssignmentPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('admin')

  const [user, allClients] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { clients: { include: { client: true } } },
    }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!user) notFound()

  const assignedClientIds = new Set(user.clients.map((uc) => uc.clientId))
  const unassigned = allClients.filter((c) => !assignedClientIds.has(c.id))

  const assignWithUserId = assignClientToUser.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-2">{user.name}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('assignedClients')}</p>

        {/* Assigned clients */}
        <div className="space-y-2 mb-6">
          {user.clients.map(({ client }) => {
            const unassignWithIds = unassignClientFromUser.bind(null, id, client.id)
            return (
              <div key={client.id} className="flex items-center justify-between p-3 rounded bg-card border border-border">
                <span className="text-sm">{client.name}</span>
                <form action={unassignWithIds}>
                  <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                    Retirer
                  </Button>
                </form>
              </div>
            )
          })}
          {user.clients.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucun client assigné</p>
          )}
        </div>

        {/* Add client */}
        {unassigned.length > 0 && (
          <form action={assignWithUserId} className="flex gap-2">
            <select
              name="clientId"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {unassigned.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button type="submit">Assigner</Button>
          </form>
        )}

        <div className="mt-6">
          <Button variant="ghost" asChild>
            <Link href="/admin/users">← Retour</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/actions/users.ts src/app/admin/ src/components/admin/
git commit -m "feat: add admin user management with client assignment"
```

---

## Task 17: Admin — RMM settings + crypto

**Files:**
- Create: `src/lib/crypto.ts`, `src/app/admin/settings/page.tsx`
- Create: `src/actions/settings.ts`

- [ ] **Step 1: Write failing test for crypto**

Create `src/lib/crypto.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './crypto'

describe('crypto', () => {
  it('encrypts and decrypts a string', () => {
    const original = 'my-secret-api-key'
    const encrypted = encrypt(original)
    expect(encrypted).not.toBe(original)
    expect(decrypt(encrypted)).toBe(original)
  })

  it('produces different ciphertext each call (IV randomness)', () => {
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- src/lib/crypto.test.ts
```
Expected: FAIL — `Cannot find module './crypto'`

- [ ] **Step 3: Create `src/lib/crypto.ts`**

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length < 32) throw new Error('ENCRYPTION_KEY must be at least 32 chars')
  return Buffer.from(hex.slice(0, 32), 'utf8')
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(encryptedText: string): string {
  const [ivHex, dataHex] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test:run -- src/lib/crypto.test.ts
```
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Create `src/actions/settings.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { encrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export async function saveRmmSettings(formData: FormData) {
  await requireAdmin()
  const url = formData.get('rmmUrl') as string
  const rawKey = formData.get('rmmApiKey') as string

  await prisma.appSetting.upsert({
    where: { key: 'RMM_BASE_URL' },
    update: { value: url },
    create: { key: 'RMM_BASE_URL', value: url },
  })

  if (rawKey && rawKey !== '••••••••') {
    await prisma.appSetting.upsert({
      where: { key: 'RMM_API_KEY' },
      update: { value: encrypt(rawKey) },
      create: { key: 'RMM_API_KEY', value: encrypt(rawKey) },
    })
  }
  revalidatePath('/admin/settings')
}
```

- [ ] **Step 6: Create `src/app/admin/settings/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { saveRmmSettings } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SettingsPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  const [urlSetting, keySetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
  ])

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">{t('settings')}</h1>
        <form action={saveRmmSettings} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rmmUrl">{t('rmmUrl')}</Label>
            <Input
              id="rmmUrl"
              name="rmmUrl"
              type="url"
              defaultValue={urlSetting?.value ?? ''}
              placeholder="https://rmm.lsi-maintenance.fr"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rmmApiKey">{t('rmmApiKey')}</Label>
            <Input
              id="rmmApiKey"
              name="rmmApiKey"
              type="password"
              defaultValue={keySetting ? '••••••••' : ''}
              placeholder={keySetting ? 'Laisser vide pour conserver' : 'Coller la clé API ici'}
            />
          </div>
          <Button type="submit">{t('saveSettings')}</Button>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/crypto.ts src/lib/crypto.test.ts src/actions/settings.ts src/app/admin/settings/
git commit -m "feat: add RMM settings page with AES-256 key encryption"
```

---

## Task 18: Admin — RMM import

**Files:**
- Create: `src/lib/rmm-client.ts`, `src/app/api/rmm/import/route.ts`
- Create: `src/app/admin/import/page.tsx`, `src/components/admin/import-panel.tsx`

- [ ] **Step 1: Write failing test for rmm-client**

Create `src/lib/rmm-client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')

import { fetchRmmClients } from './rmm-client'

describe('fetchRmmClients', () => {
  it('calls RMM API with correct headers and returns clients', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [{ id: 1, name: 'Client A' }, { id: 2, name: 'Client B' }],
    })
    const result = await fetchRmmClients('https://rmm.example.com', 'my-key')
    expect(axios.get).toHaveBeenCalledWith(
      'https://rmm.example.com/api/v3/clients/',
      { headers: { 'X-API-KEY': 'my-key' } }
    )
    expect(result).toEqual([{ id: 1, name: 'Client A' }, { id: 2, name: 'Client B' }])
  })

  it('throws on network error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'))
    await expect(fetchRmmClients('https://rmm.example.com', 'key')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- src/lib/rmm-client.test.ts
```
Expected: FAIL — `Cannot find module './rmm-client'`

- [ ] **Step 3: Create `src/lib/rmm-client.ts`**

```typescript
import axios from 'axios'

export interface RmmClient {
  id: number
  name: string
}

export async function fetchRmmClients(baseUrl: string, apiKey: string): Promise<RmmClient[]> {
  const response = await axios.get<RmmClient[]>(`${baseUrl}/api/v3/clients/`, {
    headers: { 'X-API-KEY': apiKey },
  })
  return response.data
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test:run -- src/lib/rmm-client.test.ts
```
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Create `src/app/api/rmm/import/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { fetchRmmClients } from '@/lib/rmm-client'

export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [urlSetting, keySetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
  ])

  if (!urlSetting?.value || !keySetting?.value) {
    return NextResponse.json({ error: 'RMM not configured' }, { status: 400 })
  }

  const apiKey = decrypt(keySetting.value)

  let rmmClients
  try {
    rmmClients = await fetchRmmClients(urlSetting.value, apiKey)
  } catch {
    return NextResponse.json({ error: 'Failed to reach Tactical RMM' }, { status: 502 })
  }

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const rc of rmmClients) {
    const existing = await prisma.client.findUnique({
      where: { tacticalRmmId: String(rc.id) },
    })
    if (!existing) {
      await prisma.client.create({
        data: { name: rc.name, tacticalRmmId: String(rc.id) },
      })
      created++
    } else if (existing.name !== rc.name) {
      await prisma.client.update({
        where: { id: existing.id },
        data: { name: rc.name },
      })
      updated++
    } else {
      unchanged++
    }
  }

  return NextResponse.json({ created, updated, unchanged })
}
```

- [ ] **Step 6: Create `src/components/admin/import-panel.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export function ImportPanel() {
  const t = useTranslations('admin')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ created: number; updated: number; unchanged: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleImport() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch('/api/rmm/import', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Unknown error')
        setStatus('error')
        return
      }
      setResult(data)
      setStatus('done')
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <Button onClick={handleImport} disabled={status === 'loading'}>
        {status === 'loading' ? t('importing') : t('importClients')}
      </Button>
      {status === 'done' && result && (
        <div className="p-4 rounded-lg bg-card border border-primary/30 text-sm">
          <span className="text-primary font-medium">{result.created}</span> créés ·{' '}
          <span className="text-primary font-medium">{result.updated}</span> mis à jour ·{' '}
          <span className="text-muted-foreground">{result.unchanged}</span> inchangés
        </div>
      )}
      {status === 'error' && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {errorMsg}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/admin/import/page.tsx`**

```typescript
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { ImportPanel } from '@/components/admin/import-panel'

export default async function ImportPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-2">{t('import')}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Importe les clients depuis Tactical RMM. Les clients existants seront mis à jour si leur nom a changé.
      </p>
      <ImportPanel />
    </AppLayout>
  )
}
```

- [ ] **Step 8: Run all tests**

```bash
npm run test:run
```
Expected: All tests pass (auth.helpers, crypto, rmm-client, login-form).

- [ ] **Step 9: Commit**

```bash
git add src/lib/rmm-client.ts src/lib/rmm-client.test.ts src/app/api/ src/app/admin/import/ src/components/admin/import-panel.tsx
git commit -m "feat: add Tactical RMM import with API route"
```

---

## Task 19: Dockerfile + deployment

**Files:**
- Create: `Dockerfile`, update `docker-compose.yml`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Add `output: 'standalone'` to `next.config.ts`**

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
}
```

- [ ] **Step 3: Update `docker-compose.yml` with app service**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: lsi
      POSTGRES_PASSWORD: lsi_secret
      POSTGRES_DB: lsi_portal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lsi"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://lsi:lsi_secret@postgres:5432/lsi_portal?schema=public
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      sh -c "npx prisma migrate deploy && node server.js"

volumes:
  postgres_data:
```

- [ ] **Step 4: Final test — run full stack locally**

```bash
npm run build
docker compose up -d postgres
npx prisma migrate deploy
npx prisma db seed
npm start
```
Navigate to http://localhost:3000. Log in. Verify dashboard, clients, admin pages all work.

- [ ] **Step 5: Final commit**

```bash
git add Dockerfile docker-compose.yml next.config.ts
git commit -m "feat: add Docker deployment configuration"
```

---

## Summary

| Task | Feature | Tests |
|---|---|---|
| 1 | Project init + Vitest | — |
| 2 | Prisma schema + Docker | — |
| 3 | Admin seed | — |
| 4 | NextAuth.js v5 | auth.helpers (3 tests) |
| 5 | Middleware + access helpers | — |
| 6 | next-intl FR/EN | — |
| 7 | Tailwind LSI theme + shadcn | — |
| 8 | Sidebar + app layout | — |
| 9 | Login page | login-form (2 tests) |
| 10 | Dashboard stats | — |
| 11 | Clients list + create | — |
| 12 | Client detail + tabs | — |
| 13 | Contacts CRUD | — |
| 14 | Equipment CRUD | — |
| 15 | Licenses CRUD | — |
| 16 | Admin: user management | — |
| 17 | RMM settings + crypto | crypto (2 tests) |
| 18 | RMM import | rmm-client (2 tests) |
| 19 | Docker deployment | — |
