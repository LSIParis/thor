# Déploiement sur VPS avec Docker / Portainer

## Prérequis VPS

- Ubuntu 22.04+ / Debian 12+
- Docker Engine + Docker Compose v2
- Portainer CE (`https://votre-vps:9443`) — optionnel mais recommandé
- Domaine DNS pointant vers le VPS (`thor.lsi-maintenance.fr`)
- Ports 80 et 443 ouverts dans le pare-feu

---

## 1. Préparer le VPS

```bash
git clone https://github.com/votre-org/thor.git /opt/thor
cd /opt/thor

cp .env.example .env
nano .env   # remplir toutes les valeurs obligatoires
```

### Générer les secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (exactement 64 chars hex)
openssl rand -hex 32

# CRON_SECRET
openssl rand -hex 24
```

---

## 2. Obtenir le certificat SSL (première fois)

```bash
cd /opt/thor

# Démarrer nginx + certbot pour le challenge HTTP-01
docker compose -f docker-compose.portainer.yml up -d nginx certbot

# Demander le certificat
docker compose -f docker-compose.portainer.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email $LETSENCRYPT_EMAIL \
  --agree-tos --no-eff-email \
  -d $DOMAIN

# Activer SSL dans nginx
docker compose -f docker-compose.portainer.yml restart nginx
```

---

## 3. Déploiement complet

```bash
cd /opt/thor
docker compose -f docker-compose.portainer.yml up -d --build
```

### Vérifier que tout tourne

```bash
docker compose -f docker-compose.portainer.yml ps
docker compose -f docker-compose.portainer.yml logs app --tail 50
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

### Stack depuis le dépôt Git

1. Portainer → **Stacks** → **Add stack**
2. Nom : `lsi-thor`
3. Build method : **Repository**
4. URL : `https://github.com/votre-org/thor`
5. Compose path : `docker-compose.portainer.yml`
6. Ajouter les variables d'environnement (voir tableau ci-dessous)
7. **Deploy the stack**

### Stack collée manuellement

1. Portainer → **Stacks** → **Add stack** → **Web editor**
2. Coller le contenu de `docker-compose.portainer.yml`
3. Ajouter les variables d'environnement
4. **Deploy the stack**

---

## 5. Variables d'environnement

### Obligatoires

| Variable | Description | Générer avec |
|---|---|---|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | mot de passe fort |
| `NEXTAUTH_SECRET` | Clé de session JWT | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Chiffrement AES-256 (64 hex) | `openssl rand -hex 32` |
| `CRON_SECRET` | Auth des tâches planifiées | `openssl rand -hex 24` |
| `DOMAIN` | Domaine nginx + Let's Encrypt | ex: `thor.lsi-maintenance.fr` |
| `LETSENCRYPT_EMAIL` | Email renouvellement SSL | ex: `admin@lsi-maintenance.fr` |

### Services intégrés (optionnels)

| Variable | Description |
|---|---|
| `DESK365_SUBDOMAIN` | Sous-domaine Desk365 (ex: `lsi-maintenance`) |
| `DESK365_API_KEY` | Clé API Desk365 |
| `WASABI_ACCESS_KEY` | Access Key Wasabi S3 |
| `WASABI_SECRET_KEY` | Secret Key Wasabi S3 |
| `COMET_SERVER_URL` | URL du serveur Comet Backup (ex: `https://backup.lsi-maintenance.fr`) |
| `COMET_ADMIN_USER` | Identifiant admin Comet |
| `COMET_ADMIN_PASS` | Mot de passe admin Comet |
| `AXONAUT_API_KEY` | Clé API Axonaut |
| `MAILGUN_API_KEY` | Clé API Mailgun |
| `MAILGUN_DOMAIN` | Domaine Mailgun (ex: `mg.lsi-maintenance.fr`) |
| `MAILGUN_FROM` | Expéditeur email (ex: `LSI <noreply@mg.lsi-maintenance.fr>`) |
| `LSI_NOTIFY_EMAIL` | Destinataire des alertes cron |

> Les variables optionnelles non renseignées désactivent silencieusement la fonctionnalité correspondante.

---

## 6. Mise à jour

```bash
cd /opt/thor
git pull
docker compose -f docker-compose.portainer.yml up -d --build app
```

Ou dans Portainer : **Stacks** → `lsi-thor` → **Update the stack** → **Pull and redeploy**

---

## 7. Sauvegarde

```bash
# Base de données
docker compose -f docker-compose.portainer.yml exec postgres \
  pg_dump -U lsi lsi_portal > backup_$(date +%Y%m%d_%H%M).sql

# Uploads (photos assets)
docker run --rm \
  -v thor_uploads:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz /data
```

---

## 8. Ports exposés

| Port | Service |
|---|---|
| 80 | nginx — HTTP (redirection HTTPS) |
| 443 | nginx — HTTPS |
| 3000 | Next.js (interne uniquement) |
| 5432 | PostgreSQL (interne uniquement) |
