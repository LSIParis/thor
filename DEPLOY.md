# Déploiement sur VPS avec Portainer

## Prérequis VPS

- Ubuntu 22.04+ / Debian 12+
- Docker + Docker Compose v2
- Portainer CE installé (`https://votre-vps:9443`)
- Domaine pointant vers le VPS (ex: `thor.lsi-maintenance.fr`)
- Port 80 et 443 ouverts

---

## 1. Préparer le VPS

```bash
# Cloner le projet
git clone https://github.com/votre-org/thor.git /opt/thor
cd /opt/thor

# Créer le fichier d'environnement
cp .env.example .env
nano .env   # remplir toutes les valeurs
```

### Générer les secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (exactement 64 chars hex)
openssl rand -hex 32
```

---

## 2. Obtenir le certificat SSL (première fois)

```bash
cd /opt/thor

# Démarrer nginx en HTTP only pour le challenge
docker compose -f docker-compose.portainer.yml up -d nginx certbot

# Demander le certificat
docker compose -f docker-compose.portainer.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email $LETSENCRYPT_EMAIL \
  --agree-tos --no-eff-email \
  -d $DOMAIN

# Redémarrer nginx avec SSL activé
docker compose -f docker-compose.portainer.yml restart nginx
```

---

## 3. Déploiement complet

```bash
cd /opt/thor
docker compose -f docker-compose.portainer.yml up -d --build
```

### Créer l'utilisateur admin initial

```bash
docker compose -f docker-compose.portainer.yml exec app \
  node -e "
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const bcrypt=require('bcryptjs');
const adapter=new PrismaPg({connectionString:process.env.DATABASE_URL});
const prisma=new PrismaClient({adapter});
bcrypt.hash('ChangeMe123!',12).then(h=>
  prisma.user.upsert({
    where:{email:'admin@lsi-maintenance.fr'},
    update:{},
    create:{name:'Administrateur',email:'admin@lsi-maintenance.fr',passwordHash:h,role:'ADMIN'}
  })
).then(()=>console.log('Admin créé')).finally(()=>prisma.\$disconnect());
"
```

---

## 4. Déploiement via Portainer UI

### Option A — Stack depuis le dépôt Git

1. Portainer → **Stacks** → **Add stack**
2. Nom : `lsi-thor`
3. Build method : **Repository**
4. URL : `https://github.com/votre-org/thor`
5. Compose path : `docker-compose.portainer.yml`
6. **Environment variables** (ajouter chaque ligne) :

| Variable | Valeur |
|---|---|
| `POSTGRES_PASSWORD` | mot de passe fort |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://thor.lsi-maintenance.fr` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `DOMAIN` | `thor.lsi-maintenance.fr` |
| `LETSENCRYPT_EMAIL` | `admin@lsi-maintenance.fr` |

7. **Deploy the stack**

### Option B — Stack collée manuellement

1. Portainer → **Stacks** → **Add stack**
2. Coller le contenu de `docker-compose.portainer.yml`
3. Ajouter les variables d'environnement (tableau ci-dessus)
4. **Deploy the stack**

---

## 5. Mise à jour

```bash
cd /opt/thor
git pull
docker compose -f docker-compose.portainer.yml up -d --build app
```

Ou dans Portainer : **Stacks** → `lsi-thor` → **Update the stack** → **Pull and redeploy**

---

## 6. Sauvegarde

```bash
# Sauvegarde base de données
docker compose -f docker-compose.portainer.yml exec postgres \
  pg_dump -U lsi lsi_portal > backup_$(date +%Y%m%d).sql

# Sauvegarde uploads (photos assets)
docker run --rm -v thor_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads_$(date +%Y%m%d).tar.gz /data
```

---

## 7. Variables d'environnement — récapitulatif

| Variable | Description | Générer avec |
|---|---|---|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | mot de passe fort |
| `NEXTAUTH_SECRET` | Clé de session JWT | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL publique HTTPS | manuel |
| `ENCRYPTION_KEY` | Chiffrement clé RMM (64 hex) | `openssl rand -hex 32` |
| `DOMAIN` | Domaine nginx/certbot | manuel |
| `LETSENCRYPT_EMAIL` | Email renouvellement SSL | manuel |

---

## 8. Ports

| Port | Service |
|---|---|
| 80 | nginx (HTTP → redirect HTTPS) |
| 443 | nginx (HTTPS) |
| 3000 | App Next.js (interne uniquement) |
| 5432 | PostgreSQL (interne uniquement) |
