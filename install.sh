#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  LSI Maintenance — Portail Client
#  Script d'installation automatique
#
#  Usage : sudo bash install.sh
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Couleurs et helpers ───────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

ok()     { echo -e "  ${GREEN}✓${RESET}  $*"; }
info()   { echo -e "  ${BLUE}→${RESET}  $*"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
err()    { echo -e "\n  ${RED}✗  ERREUR : $*${RESET}\n" >&2; exit 1; }
header() { echo -e "\n${BOLD}${BLUE}  ── $* ──${RESET}\n"; }
ask()    { echo -en "  ${BOLD}$*${RESET} "; }
sep()    { echo -e "  ${DIM}────────────────────────────────────────────────${RESET}"; }

# ── Vérifier les droits root ──────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Ce script doit être exécuté avec les droits administrateur.\n\n     Commande : sudo bash install.sh"
fi

# ── Répertoire du script ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f "docker-compose.portainer.yml" ]]; then
  err "Fichiers du portail introuvables.\n     Assurez-vous d'exécuter ce script depuis le dossier du projet."
fi

PROJECT_NAME="lsi"

# ── Bienvenue ─────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}${BLUE}"
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │                                                 │"
echo "   │   LSI Maintenance — Portail Client              │"
echo "   │   Script d'installation automatique             │"
echo "   │                                                 │"
echo "   └─────────────────────────────────────────────────┘"
echo -e "${RESET}"
echo ""
echo -e "  Ce script va installer et configurer le portail"
echo -e "  sur ce serveur. L'opération dure environ 10 minutes."
echo ""
sep
echo ""

# ── Installer Docker si nécessaire ───────────────────────────────────────────
header "1/6  Vérification de Docker"

if ! command -v docker &>/dev/null; then
  info "Docker n'est pas installé — installation en cours..."
  curl -fsSL https://get.docker.com | sh -s -- --quiet
  systemctl enable docker --quiet
  systemctl start docker
  ok "Docker installé avec succès"
else
  DOCKER_VER=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  ok "Docker ${DOCKER_VER} déjà présent"
fi

if ! docker compose version &>/dev/null 2>&1; then
  err "Docker Compose n'est pas disponible.\n     Installez Docker Engine version 20.10 ou supérieur."
fi
ok "Docker Compose disponible"

# Installer git si absent (pour les mises à jour futures)
if ! command -v git &>/dev/null; then
  info "Installation de git..."
  apt-get install -y git &>/dev/null || yum install -y git &>/dev/null || true
fi

# ── Configuration ─────────────────────────────────────────────────────────────
header "2/6  Configuration"

echo -e "  Répondez aux questions suivantes."
echo -e "  Appuyez sur ${BOLD}Entrée${RESET} pour garder la valeur entre [crochets]."
echo ""

# ── Domaine
ask "Nom de domaine du portail\n  (exemple : portail.mon-entreprise.fr) : "
read -r DOMAIN
DOMAIN="${DOMAIN// /}"
[[ -z "$DOMAIN" ]] && err "Le nom de domaine est obligatoire."

# Vérifier que le domaine pointe vers ce serveur
SERVER_IP=$(curl -s --max-time 8 https://api.ipify.org 2>/dev/null \
            || curl -s --max-time 8 https://ifconfig.me 2>/dev/null \
            || hostname -I | awk '{print $1}')
DOMAIN_IP=$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' || true)

if [[ -z "$DOMAIN_IP" ]]; then
  warn "Impossible de résoudre ${DOMAIN}."
  warn "Assurez-vous que les DNS sont correctement configurés avant de continuer."
  echo ""
  ask "Continuer quand même ? (oui/non) : "
  read -r CONTINUE
  [[ "${CONTINUE,,}" != "oui" && "${CONTINUE,,}" != "o" ]] && err "Installation annulée."
elif [[ "$DOMAIN_IP" != "$SERVER_IP" ]]; then
  warn "Le domaine ${DOMAIN} pointe vers ${DOMAIN_IP}"
  warn "mais l'adresse de ce serveur est ${SERVER_IP}."
  warn "Le certificat SSL ne fonctionnera pas si les DNS sont incorrects."
  echo ""
  ask "Continuer quand même ? (oui/non) : "
  read -r CONTINUE
  [[ "${CONTINUE,,}" != "oui" && "${CONTINUE,,}" != "o" ]] && err "Installation annulée."
else
  ok "Le domaine ${DOMAIN} pointe bien vers ce serveur (${SERVER_IP})"
fi

echo ""

# ── Email
ask "Votre adresse e-mail [admin@lsi-maintenance.fr] : "
read -r LETSENCRYPT_EMAIL
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@lsi-maintenance.fr}"
ok "Email : ${LETSENCRYPT_EMAIL}"

echo ""
sep
echo ""
echo -e "  ${BOLD}Intégrations optionnelles${RESET}"
echo -e "  Appuyez sur ${BOLD}Entrée${RESET} pour ignorer une intégration."
echo ""

# ── Mailgun
echo -e "  ${YELLOW}► Email (Mailgun)${RESET}"
ask "  Clé API Mailgun : "
read -r MAILGUN_API_KEY
if [[ -n "$MAILGUN_API_KEY" ]]; then
  ask "  Domaine Mailgun [mg.lsi-maintenance.fr] : "
  read -r MAILGUN_DOMAIN
  MAILGUN_DOMAIN="${MAILGUN_DOMAIN:-mg.lsi-maintenance.fr}"
else
  MAILGUN_DOMAIN="mg.lsi-maintenance.fr"
fi

echo ""

# ── Desk365
echo -e "  ${YELLOW}► Tickets (Desk365)${RESET}"
ask "  Sous-domaine Desk365 (ex: lsi-maintenance) : "
read -r DESK365_SUBDOMAIN
if [[ -n "$DESK365_SUBDOMAIN" ]]; then
  ask "  Clé API Desk365 : "
  read -r DESK365_API_KEY
else
  DESK365_API_KEY=""
fi

echo ""

# ── Comet Backup
echo -e "  ${YELLOW}► Sauvegardes (Comet Backup)${RESET}"
ask "  URL du serveur Comet (ex: https://backup.mon-domaine.fr) : "
read -r COMET_SERVER_URL
if [[ -n "$COMET_SERVER_URL" ]]; then
  ask "  Utilisateur admin Comet : "
  read -r COMET_ADMIN_USER
  ask "  Mot de passe admin Comet : "
  read -rs COMET_ADMIN_PASS
  echo ""
else
  COMET_ADMIN_USER=""
  COMET_ADMIN_PASS=""
fi

echo ""

# ── Wasabi S3
echo -e "  ${YELLOW}► Stockage fichiers (Wasabi S3)${RESET}"
ask "  Access Key Wasabi : "
read -r WASABI_ACCESS_KEY
if [[ -n "$WASABI_ACCESS_KEY" ]]; then
  ask "  Secret Key Wasabi : "
  read -rs WASABI_SECRET_KEY
  echo ""
else
  WASABI_SECRET_KEY=""
fi

echo ""

# ── Axonaut
echo -e "  ${YELLOW}► CRM (Axonaut)${RESET}"
ask "  Clé API Axonaut : "
read -r AXONAUT_API_KEY

echo ""

# ── DocuSeal
echo -e "  ${YELLOW}► Signature électronique (DocuSeal)${RESET}"
echo -e "  ${DIM}Obtenez votre clé sur console.docuseal.eu → Settings → API${RESET}"
ask "  Clé API DocuSeal : "
read -r DOCUSEAL_API_KEY
if [[ -n "$DOCUSEAL_API_KEY" ]]; then
  ask "  URL API DocuSeal [https://api.docuseal.eu] : "
  read -r DOCUSEAL_API_URL
  DOCUSEAL_API_URL="${DOCUSEAL_API_URL:-https://api.docuseal.eu}"
  ok "DocuSeal configuré (${DOCUSEAL_API_URL})"
else
  DOCUSEAL_API_URL="https://api.docuseal.eu"
  warn "DocuSeal non configuré — la signature électronique sera désactivée."
fi

echo ""

# ── Tactical RMM
echo -e "  ${YELLOW}► Supervision (Tactical RMM)${RESET}"
echo -e "  ${DIM}URL de l'API (ex: https://api.mon-rmm.fr) — pas l'interface web${RESET}"
ask "  URL de l'API Tactical RMM : "
read -r RMM_BASE_URL
if [[ -n "$RMM_BASE_URL" ]]; then
  ask "  Clé API Tactical RMM : "
  read -rs RMM_API_KEY
  echo ""
  ok "Tactical RMM configuré"
else
  RMM_API_KEY=""
  warn "Tactical RMM non configuré — configurable plus tard dans les paramètres du portail."
fi

echo ""

# ── Génération des secrets ────────────────────────────────────────────────────
header "3/6  Génération des clés de sécurité"

POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 24)

ok "Clés de sécurité générées (stockées dans .env)"

# ── Écrire .env ───────────────────────────────────────────────────────────────
cat > .env << EOF
# Généré automatiquement par install.sh — $(date '+%d/%m/%Y %H:%M')
# NE PAS PARTAGER CE FICHIER

# ── Base de données ──────────────────────────────────────────────────────────
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# ── Sécurité ─────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
CRON_SECRET=${CRON_SECRET}

# ── Déploiement ───────────────────────────────────────────────────────────────
DOMAIN=${DOMAIN}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}

# ── Email (Mailgun) ───────────────────────────────────────────────────────────
MAILGUN_API_KEY=${MAILGUN_API_KEY:-}
MAILGUN_DOMAIN=${MAILGUN_DOMAIN}
MAILGUN_FROM=LSI Maintenance <noreply@${MAILGUN_DOMAIN}>
LSI_NOTIFY_EMAIL=${LETSENCRYPT_EMAIL}

# ── Tickets (Desk365) ─────────────────────────────────────────────────────────
DESK365_SUBDOMAIN=${DESK365_SUBDOMAIN:-}
DESK365_API_KEY=${DESK365_API_KEY:-}

# ── Sauvegardes (Comet Backup) ────────────────────────────────────────────────
COMET_SERVER_URL=${COMET_SERVER_URL:-}
COMET_ADMIN_USER=${COMET_ADMIN_USER:-}
COMET_ADMIN_PASS=${COMET_ADMIN_PASS:-}

# ── Stockage (Wasabi S3) ─────────────────────────────────────────────────────
WASABI_ACCESS_KEY=${WASABI_ACCESS_KEY:-}
WASABI_SECRET_KEY=${WASABI_SECRET_KEY:-}

# ── CRM (Axonaut) ─────────────────────────────────────────────────────────────
AXONAUT_API_KEY=${AXONAUT_API_KEY:-}

# ── Signature électronique (DocuSeal) ─────────────────────────────────────────
DOCUSEAL_API_KEY=${DOCUSEAL_API_KEY:-}
DOCUSEAL_API_URL=${DOCUSEAL_API_URL:-https://api.docuseal.eu}
EOF

chmod 600 .env
ok "Fichier .env créé"

# ── Construction de l'image ───────────────────────────────────────────────────
header "4/6  Construction de l'application"
info "Cette étape prend 5 à 10 minutes selon la vitesse du serveur..."
echo ""

BUILD_LOG=$(mktemp /tmp/lsi-build-XXXXXX.log)
docker compose -f docker-compose.portainer.yml -p "$PROJECT_NAME" build > "$BUILD_LOG" 2>&1 &
BUILD_PID=$!
printf "  "
while kill -0 $BUILD_PID 2>/dev/null; do
  printf "${BLUE}.${RESET}"
  sleep 3
done
wait $BUILD_PID
BUILD_STATUS=$?
echo ""
if [[ $BUILD_STATUS -ne 0 ]]; then
  echo ""
  warn "La construction a échoué. Détails :"
  echo ""
  tail -30 "$BUILD_LOG" | sed 's/^/  /'
  rm -f "$BUILD_LOG"
  err "Construction échouée. Contactez le support avec le message d'erreur ci-dessus."
fi
rm -f "$BUILD_LOG"
ok "Application construite avec succès"

# ── Certificat SSL ────────────────────────────────────────────────────────────
header "5/6  Certificat SSL (Let's Encrypt)"

# Vérifier que le port 80 est libre
if ss -tlnp 2>/dev/null | grep -q ':80 ' || netstat -tlnp 2>/dev/null | grep -q ':80 '; then
  warn "Le port 80 est déjà utilisé par un autre service."
  warn "Tentative d'arrêt automatique..."
  # Tenter d'arrêter apache/nginx s'ils tournent
  systemctl stop apache2 2>/dev/null || true
  systemctl stop nginx 2>/dev/null || true
  sleep 2
fi

# S'assurer que les volumes existent avant le certbot standalone
docker volume create "${PROJECT_NAME}_certbot_conf" &>/dev/null || true
docker volume create "${PROJECT_NAME}_certbot_www" &>/dev/null || true

info "Obtention du certificat pour ${DOMAIN}..."

if docker run --rm \
    -p 80:80 \
    -v "${PROJECT_NAME}_certbot_conf:/etc/letsencrypt" \
    -v "${PROJECT_NAME}_certbot_www:/var/www/certbot" \
    certbot/certbot certonly \
      --standalone \
      --non-interactive \
      --agree-tos \
      --email "$LETSENCRYPT_EMAIL" \
      -d "$DOMAIN" \
      --quiet; then
  ok "Certificat SSL obtenu pour ${DOMAIN}"
else
  echo ""
  warn "Impossible d'obtenir le certificat SSL automatiquement."
  warn "Causes possibles :"
  warn "  • Le domaine ${DOMAIN} ne pointe pas encore vers ce serveur"
  warn "  • Le port 80 est bloqué par un pare-feu"
  warn "  • Les DNS ne se sont pas encore propagés (attendre jusqu'à 24h)"
  echo ""
  ask "Continuer sans SSL pour l'instant ? (oui/non) : "
  read -r NO_SSL
  if [[ "${NO_SSL,,}" != "oui" && "${NO_SSL,,}" != "o" ]]; then
    info "Pour reprendre l'installation ultérieurement, relancez : sudo bash install.sh"
    exit 1
  fi
  warn "Le portail démarrera sans HTTPS. Relancez install.sh une fois les DNS corrigés."
fi

# ── Démarrage complet ─────────────────────────────────────────────────────────
header "6/6  Démarrage du portail"

docker compose -f docker-compose.portainer.yml -p "$PROJECT_NAME" up -d
ok "Tous les services démarrés"

# Attendre que l'application soit prête
info "Attente du démarrage de l'application (peut prendre 1-2 minutes)..."
READY=0
for i in $(seq 1 40); do
  if curl -sf "http://localhost:3000/api/auth/csrf" &>/dev/null; then
    READY=1
    break
  fi
  printf "."
  sleep 5
done
echo ""

if [[ $READY -eq 1 ]]; then
  ok "Application opérationnelle"

  # Créer le compte administrateur initial
  info "Création du compte administrateur..."
  ADMIN_HASH=$(docker compose -f docker-compose.portainer.yml -p "$PROJECT_NAME" exec -T app \
    node -e "require('bcryptjs').hash('Admin1234!', 12).then(h => process.stdout.write(h))" 2>/dev/null)
  docker compose -f docker-compose.portainer.yml -p "$PROJECT_NAME" exec -T postgres \
    psql -U lsi lsi_portal -c "
      INSERT INTO \"User\" (id, name, email, \"passwordHash\", role, \"emailVerified\", \"createdAt\")
      VALUES (gen_random_uuid(), 'Administrateur', 'admin@lsi-maintenance.fr', '${ADMIN_HASH}', 'ADMIN', true, now())
      ON CONFLICT (email) DO NOTHING;
    " &>/dev/null
  ok "Compte administrateur créé (admin@lsi-maintenance.fr)"

  # Configurer Tactical RMM si renseigné
  if [[ -n "${RMM_BASE_URL:-}" ]]; then
    info "Configuration de Tactical RMM en base..."
    docker compose -f docker-compose.portainer.yml -p "$PROJECT_NAME" exec -T postgres \
      psql -U lsi lsi_portal -c "
        INSERT INTO \"AppSetting\" (id, key, value)
        VALUES (gen_random_uuid(), 'RMM_BASE_URL', '${RMM_BASE_URL}')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO \"AppSetting\" (id, key, value)
        VALUES (gen_random_uuid(), 'RMM_API_KEY', '${RMM_API_KEY}')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      " &>/dev/null
    ok "Tactical RMM configuré"
  fi
else
  warn "L'application n'est pas encore accessible."
  warn "Vérifiez les logs avec : docker compose -f docker-compose.portainer.yml -p lsi logs app"
  warn "Une fois accessible, créez le compte admin manuellement :"
  warn "  sudo bash install.sh  (relancer suffit, les données existantes sont conservées)"
fi

# ── Sauvegarder les informations ──────────────────────────────────────────────
INSTALL_DATE=$(date '+%d/%m/%Y à %H:%M')
cat > install-info.txt << EOF
════════════════════════════════════════════════════════
  Installation LSI Maintenance — ${INSTALL_DATE}
════════════════════════════════════════════════════════

  URL du portail   : https://${DOMAIN}
  Email admin      : admin@lsi-maintenance.fr
  Mot de passe     : Admin1234!   ← CHANGER DÈS LA PREMIÈRE CONNEXION

  Dossier          : ${SCRIPT_DIR}
  Configuration    : ${SCRIPT_DIR}/.env

════════════════════════════════════════════════════════
  Commandes utiles
════════════════════════════════════════════════════════

  Voir les logs :
    docker compose -f docker-compose.portainer.yml -p lsi logs -f

  Redémarrer :
    docker compose -f docker-compose.portainer.yml -p lsi restart

  Arrêter :
    docker compose -f docker-compose.portainer.yml -p lsi down

  Mettre à jour :
    sudo bash update.sh

════════════════════════════════════════════════════════
EOF

chmod 600 install-info.txt

# ── Résumé final ──────────────────────────────────────────────────────────────
echo ""
sep
echo ""
echo -e "${GREEN}${BOLD}"
echo "   ╔═══════════════════════════════════════════════════╗"
echo "   ║                                                   ║"
echo "   ║   Installation terminée avec succès !             ║"
echo "   ║                                                   ║"
echo "   ╚═══════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo ""
echo -e "  ${BOLD}Votre portail est accessible sur :${RESET}"
echo -e "  ${BLUE}${BOLD}https://${DOMAIN}${RESET}"
echo ""
echo -e "  ${BOLD}Connexion initiale :${RESET}"
echo -e "  Email        : admin@lsi-maintenance.fr"
echo -e "  Mot de passe : ${RED}${BOLD}Admin1234!${RESET}"
echo ""
echo -e "  ${RED}${BOLD}⚠  IMPORTANT : Changez le mot de passe dès votre première connexion !${RESET}"
echo ""

if [[ -n "${DOCUSEAL_API_KEY:-}" ]]; then
  sep
  echo ""
  echo -e "  ${BOLD}Étape manuelle — Signature électronique (DocuSeal) :${RESET}"
  echo -e "  Rendez-vous sur ${BLUE}https://console.docuseal.eu/webhooks${RESET}"
  echo -e "  et ajoutez un webhook avec ces paramètres :"
  echo -e "  URL    : ${BOLD}https://${DOMAIN}/api/docuseal/webhook${RESET}"
  echo -e "  Événement : ${BOLD}form.completed${RESET}"
  echo ""
fi

echo -e "  Les détails ont été sauvegardés dans : ${BOLD}install-info.txt${RESET}"
echo ""
sep
echo ""
