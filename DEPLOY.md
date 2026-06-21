# Mode d'emploi — Déploiement sur VPS

## Prérequis

| Élément | Minimum |
|---|---|
| Serveur | Ubuntu 22.04 LTS ou Debian 12 |
| RAM | 2 Go |
| Disque | 20 Go |
| Domaine | Enregistrement A pointant vers l'IP du VPS |
| Ports | 80 et 443 ouverts dans le pare-feu |

---

## Étape 1 — Installer Docker sur le VPS

Se connecter en SSH puis exécuter :

```bash
# Mettre à jour le système
apt update && apt upgrade -y

# Installer Docker (script officiel)
curl -fsSL https://get.docker.com | sh

# Vérifier l'installation
docker --version
docker compose version
```

> Docker Compose v2 est inclus dans l'installation officielle (`docker compose`, sans tiret).

---

## Étape 2 — Cloner le projet

```bash
git clone https://github.com/LSIParis/thor.git /opt/thor
cd /opt/thor
```

---

## Étape 3 — Créer le fichier d'environnement

```bash
cp .env.example .env
nano .env
```

### Remplir les valeurs obligatoires

**Générer les secrets :**

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (exactement 64 caractères hex)
openssl rand -hex 32

# CRON_SECRET
openssl rand -hex 24

# POSTGRES_PASSWORD
openssl rand -base64 24
```

**Valeurs à saisir dans `.env` :**

```env
POSTGRES_PASSWORD=<mot de passe généré>
NEXTAUTH_SECRET=<secret généré>
ENCRYPTION_KEY=<clé hex générée>
CRON_SECRET=<secret généré>
NEXTAUTH_URL=https://thor.lsi-maintenance.fr
DOMAIN=thor.lsi-maintenance.fr
LETSENCRYPT_EMAIL=admin@lsi-maintenance.fr
```

**Services optionnels** (laisser vide pour désactiver) :

```env
DESK365_SUBDOMAIN=lsi-maintenance
DESK365_API_KEY=...

WASABI_ACCESS_KEY=...
WASABI_SECRET_KEY=...

COMET_SERVER_URL=https://backup.lsi-maintenance.fr
COMET_ADMIN_USER=...
COMET_ADMIN_PASS=...

AXONAUT_API_KEY=...

MAILGUN_API_KEY=...
MAILGUN_DOMAIN=mg.lsi-maintenance.fr
MAILGUN_FROM=LSI Maintenance <noreply@mg.lsi-maintenance.fr>
LSI_NOTIFY_EMAIL=contact@lsi-maintenance.fr
```

---

## Étape 4 — Obtenir le certificat SSL (première fois uniquement)

Le certificat Let's Encrypt doit être obtenu **avant** de démarrer la stack complète.

```bash
cd /opt/thor

# 1. Démarrer uniquement nginx et certbot
docker compose -f docker-compose.portainer.yml up -d nginx certbot

# 2. Vérifier que nginx répond sur le port 80
curl -I http://thor.lsi-maintenance.fr

# 3. Demander le certificat
docker compose -f docker-compose.portainer.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email admin@lsi-maintenance.fr \
  --agree-tos --no-eff-email \
  -d thor.lsi-maintenance.fr

# 4. Redémarrer nginx pour activer HTTPS
docker compose -f docker-compose.portainer.yml restart nginx
```

> En cas d'erreur de rate limit Let's Encrypt, ajouter `--staging` pour tester, puis relancer sans `--staging` une fois le problème résolu.

---

## Étape 5 — Démarrer la stack complète

```bash
cd /opt/thor
docker compose -f docker-compose.portainer.yml up -d --build
```

Suivre les logs pendant le démarrage :

```bash
docker compose -f docker-compose.portainer.yml logs -f app
```

Attendre le message `✓ Ready in Xms` puis vérifier :

```bash
docker compose -f docker-compose.portainer.yml ps
```

Tous les services doivent être `Up` ou `healthy`.

---

## Étape 6 — Créer le compte administrateur

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

Se connecter sur `https://thor.lsi-maintenance.fr` avec :
- Email : `admin@lsi-maintenance.fr`
- Mot de passe : `ChangeMe123!`

**Changer le mot de passe immédiatement** via Paramètres → Profil.

---

## Déploiement via Portainer (alternative)

### Installer Portainer

```bash
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Accéder à `https://votre-ip:9443` pour créer le compte admin Portainer.

### Créer la stack depuis Portainer

1. **Stacks** → **Add stack**
2. Nom : `lsi-thor`
3. Build method : **Repository**
   - URL : `https://github.com/LSIParis/thor`
   - Compose path : `docker-compose.portainer.yml`
4. Onglet **Environment variables** → ajouter chaque variable du tableau ci-dessous
5. **Deploy the stack**

### Variables à saisir dans Portainer

| Variable | Valeur |
|---|---|
| `POSTGRES_PASSWORD` | mot de passe fort |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `DOMAIN` | `thor.lsi-maintenance.fr` |
| `LETSENCRYPT_EMAIL` | `admin@lsi-maintenance.fr` |
| `DESK365_SUBDOMAIN` | `lsi-maintenance` |
| `DESK365_API_KEY` | clé API Desk365 |
| `WASABI_ACCESS_KEY` | access key Wasabi |
| `WASABI_SECRET_KEY` | secret key Wasabi |
| `COMET_SERVER_URL` | `https://backup.lsi-maintenance.fr` |
| `COMET_ADMIN_USER` | admin Comet |
| `COMET_ADMIN_PASS` | mot de passe Comet |
| `AXONAUT_API_KEY` | clé API Axonaut |
| `MAILGUN_API_KEY` | clé API Mailgun |
| `MAILGUN_DOMAIN` | `mg.lsi-maintenance.fr` |
| `MAILGUN_FROM` | `LSI Maintenance <noreply@mg.lsi-maintenance.fr>` |
| `LSI_NOTIFY_EMAIL` | `contact@lsi-maintenance.fr` |

> Le certificat SSL doit être obtenu manuellement (étape 4) avant le premier déploiement via Portainer.

---

## Mise à jour de l'application

```bash
cd /opt/thor
git pull
docker compose -f docker-compose.portainer.yml up -d --build app
```

Via Portainer : **Stacks** → `lsi-thor` → **Update the stack** → cocher **Re-pull image** → **Update the stack**.

---

## Sauvegarde

### Base de données

```bash
docker compose -f docker-compose.portainer.yml exec postgres \
  pg_dump -U lsi lsi_portal > /opt/backups/db_$(date +%Y%m%d_%H%M).sql
```

### Fichiers uploadés (photos)

```bash
mkdir -p /opt/backups
docker run --rm \
  -v thor_uploads:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

### Restaurer la base de données

```bash
cat backup.sql | docker compose -f docker-compose.portainer.yml exec -T postgres \
  psql -U lsi lsi_portal
```

---

## Résolution de problèmes

### L'application ne démarre pas

```bash
docker compose -f docker-compose.portainer.yml logs app --tail 100
```

### Erreur de migration Prisma

```bash
docker compose -f docker-compose.portainer.yml exec app \
  node_modules/prisma/build/index.js migrate status
```

### Nginx retourne une erreur 502

L'application Next.js n'est pas encore prête. Attendre 30 secondes et vérifier :

```bash
docker compose -f docker-compose.portainer.yml ps app
# Le healthcheck doit passer à "healthy"
```

### Certificat SSL expiré ou invalide

```bash
docker compose -f docker-compose.portainer.yml exec certbot \
  certbot renew --force-renewal
docker compose -f docker-compose.portainer.yml restart nginx
```

---

## Ports et services

| Port | Service | Accès |
|---|---|---|
| 80 | nginx — HTTP (→ HTTPS) | public |
| 443 | nginx — HTTPS | public |
| 9443 | Portainer | restreindre au besoin |
| 3000 | Next.js | interne uniquement |
| 5432 | PostgreSQL | interne uniquement |
