#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  LSI Maintenance — Script de mise à jour
#
#  Usage : sudo bash update.sh
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

ok()     { echo -e "  ${GREEN}✓${RESET}  $*"; }
info()   { echo -e "  ${BLUE}→${RESET}  $*"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
err()    { echo -e "\n  ${RED}✗  ERREUR : $*${RESET}\n" >&2; exit 1; }
header() { echo -e "\n${BOLD}${BLUE}  ── $* ──${RESET}\n"; }
sep()    { echo -e "  ${DIM}────────────────────────────────────────────────${RESET}"; }

if [[ $EUID -ne 0 ]]; then
  err "Ce script doit être exécuté avec les droits administrateur.\n\n     Commande : sudo bash update.sh"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
PROJECT_NAME="lsi"

if [[ ! -f ".env" ]]; then
  err "Fichier .env introuvable.\n     Assurez-vous que le portail est bien installé (lancez install.sh si nécessaire)."
fi

clear
echo ""
echo -e "${BOLD}${BLUE}"
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │   LSI Maintenance — Mise à jour du portail      │"
echo "   └─────────────────────────────────────────────────┘"
echo -e "${RESET}"
echo ""

# ── Récupérer les dernières modifications ─────────────────────────────────────
header "1/3  Récupération des mises à jour"

if command -v git &>/dev/null && git rev-parse --git-dir &>/dev/null 2>&1; then
  CURRENT=$(git rev-parse --short HEAD 2>/dev/null || echo "inconnu")
  info "Téléchargement des mises à jour..."
  git pull --ff-only origin master 2>&1 | while read -r line; do
    echo "       ${DIM}${line}${RESET}"
  done
  NEW=$(git rev-parse --short HEAD 2>/dev/null || echo "inconnu")
  if [[ "$CURRENT" == "$NEW" ]]; then
    ok "Le portail est déjà à jour (version ${CURRENT})"
  else
    ok "Mise à jour de ${CURRENT} → ${NEW}"
  fi
else
  warn "Git non disponible — reconstruction avec les fichiers actuels."
fi

# ── Reconstruction ────────────────────────────────────────────────────────────
header "2/3  Reconstruction de l'application"
info "Cette étape prend quelques minutes..."
echo ""

BUILD_LOG=$(mktemp /tmp/lsi-update-XXXXXX.log)
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
  warn "La reconstruction a échoué. Détails :"
  echo ""
  tail -30 "$BUILD_LOG" | sed 's/^/  /'
  rm -f "$BUILD_LOG"
  err "Reconstruction échouée. Contactez le support avec le message d'erreur ci-dessus."
fi
rm -f "$BUILD_LOG"
ok "Application reconstruite"

# ── Redémarrage ───────────────────────────────────────────────────────────────
header "3/3  Redémarrage des services"

info "Arrêt des services en cours..."
docker compose -f docker-compose.portainer.yml -p "$PROJECT_NAME" down

info "Démarrage avec la nouvelle version..."
docker compose -f docker-compose.portainer.yml -p "$PROJECT_NAME" up -d
ok "Services redémarrés"

# Attendre que l'app soit prête
info "Attente du démarrage de l'application..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:3000/api/auth/csrf" &>/dev/null; then
    ok "Application opérationnelle"
    break
  fi
  [[ $i -eq 30 ]] && warn "L'application n'est pas encore accessible — vérifiez les logs."
  printf "."
  sleep 4
done
echo ""

echo ""
sep
echo ""
echo -e "  ${GREEN}${BOLD}Mise à jour terminée !${RESET}"
echo ""
echo -e "  Le portail est accessible sur : ${BLUE}${BOLD}https://$(grep '^DOMAIN=' .env | cut -d= -f2)${RESET}"
echo ""
sep
echo ""
