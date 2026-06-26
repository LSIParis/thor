#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  LSI Maintenance — Portail Client
#  Déploiement de la stack via l'API Portainer
#
#  Prérequis : fichier .env présent (généré par install.sh)
#  Usage     : bash portainer-deploy.sh
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

ok()     { echo -e "  ${GREEN}✓${RESET}  $*"; }
info()   { echo -e "  ${BLUE}→${RESET}  $*"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
err()    { echo -e "\n  ${RED}✗  ERREUR : $*${RESET}\n" >&2; exit 1; }
header() { echo -e "\n${BOLD}${BLUE}  ── $* ──${RESET}\n"; }
ask()    { echo -en "  ${BOLD}$*${RESET} "; }
sep()    { echo -e "  ${DIM}────────────────────────────────────────────────${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Prérequis ─────────────────────────────────────────────────────────────────
[[ ! -f ".env" ]] && err "Fichier .env introuvable.\n     Exécutez d'abord : sudo bash install.sh"
[[ ! -f "docker-compose.portainer.yml" ]] && err "Fichier docker-compose.portainer.yml introuvable."

if ! command -v jq &>/dev/null; then
  info "Installation de jq (nécessaire pour l'API Portainer)..."
  apt-get install -y jq &>/dev/null \
    || yum install -y jq &>/dev/null \
    || err "Impossible d'installer jq. Installez-le manuellement : apt install jq"
  ok "jq installé"
fi

# ── Bienvenue ─────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}${BLUE}"
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │                                                 │"
echo "   │   LSI Maintenance — Déploiement Portainer       │"
echo "   │                                                 │"
echo "   └─────────────────────────────────────────────────┘"
echo -e "${RESET}"
echo ""
echo -e "  Ce script crée ou met à jour la stack 'lsi' dans Portainer"
echo -e "  en utilisant le fichier docker-compose.portainer.yml et le .env."
echo ""
sep
echo ""

# ── Connexion Portainer ───────────────────────────────────────────────────────
header "1/3  Connexion à Portainer"

ask "URL de Portainer (ex: https://portainer.exemple.fr) : "
read -r PORTAINER_URL
PORTAINER_URL="${PORTAINER_URL%/}"
[[ -z "$PORTAINER_URL" ]] && err "L'URL de Portainer est obligatoire."

ask "Nom d'utilisateur Portainer [admin] : "
read -r PORTAINER_USER
PORTAINER_USER="${PORTAINER_USER:-admin}"

ask "Mot de passe Portainer : "
read -rs PORTAINER_PASS
echo ""
[[ -z "$PORTAINER_PASS" ]] && err "Le mot de passe est obligatoire."

echo ""
info "Connexion en cours..."

AUTH_RESP=$(curl -s --max-time 15 -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${PORTAINER_USER}\",\"password\":\"${PORTAINER_PASS}\"}" \
  2>/dev/null) || err "Impossible de contacter Portainer.\n     Vérifiez l'URL : ${PORTAINER_URL}"

JWT=$(echo "$AUTH_RESP" | jq -r '.jwt // empty' 2>/dev/null)
[[ -z "$JWT" ]] && err "Authentification échouée.\n     Vérifiez l'URL et les identifiants Portainer."
ok "Connecté à Portainer"

AUTH="Authorization: Bearer ${JWT}"

# ── Lecture du .env → variables d'environnement pour Portainer ───────────────
header "2/3  Lecture de la configuration"

info "Chargement du fichier .env..."
ENV_ARRAY="["
FIRST=true
while IFS= read -r line || [[ -n "$line" ]]; do
  # Ignorer les commentaires et lignes vides
  [[ -z "$line" || "$line" == \#* ]] && continue
  # Extraire clé=valeur
  KEY="${line%%=*}"
  VALUE="${line#*=}"
  # Échapper les guillemets dans la valeur
  VALUE_ESC="${VALUE//\\/\\\\}"
  VALUE_ESC="${VALUE_ESC//\"/\\\"}"
  [[ "$FIRST" == true ]] && FIRST=false || ENV_ARRAY+=","
  ENV_ARRAY+="{\"name\":\"${KEY}\",\"value\":\"${VALUE_ESC}\"}"
done < .env
ENV_ARRAY+="]"

ok "Variables d'environnement chargées"

# Récupérer le contenu du docker-compose
COMPOSE_CONTENT=$(cat docker-compose.portainer.yml)
COMPOSE_JSON=$(echo "$COMPOSE_CONTENT" | jq -Rs .)

# ── Trouver l'endpoint Docker ─────────────────────────────────────────────────
ENDPOINTS=$(curl -s -H "$AUTH" "${PORTAINER_URL}/api/endpoints" 2>/dev/null)
ENDPOINT_ID=$(echo "$ENDPOINTS" | jq '.[0].Id // 1' 2>/dev/null)
ENDPOINT_ID="${ENDPOINT_ID:-1}"
info "Endpoint Docker : #${ENDPOINT_ID}"

# ── Créer ou mettre à jour la stack ──────────────────────────────────────────
header "3/3  Déploiement de la stack"

STACKS=$(curl -s -H "$AUTH" "${PORTAINER_URL}/api/stacks" 2>/dev/null)
STACK_ID=$(echo "$STACKS" | jq '.[] | select(.Name == "lsi") | .Id' 2>/dev/null | head -1)

if [[ -n "$STACK_ID" && "$STACK_ID" != "null" ]]; then
  # ── Mise à jour ──────────────────────────────────────────────────────────
  info "Stack 'lsi' existante (ID: ${STACK_ID}) — mise à jour..."

  RESP=$(curl -s -X PUT \
    "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"stackFileContent\":${COMPOSE_JSON},\"env\":${ENV_ARRAY},\"prune\":false}" \
    2>/dev/null)

  if echo "$RESP" | jq -e '.Id' &>/dev/null; then
    ok "Stack mise à jour avec succès"
  else
    MSG=$(echo "$RESP" | jq -r '.message // .details // .' 2>/dev/null)
    err "Échec de la mise à jour.\n     Portainer a répondu : ${MSG}"
  fi

else
  # ── Création ─────────────────────────────────────────────────────────────
  info "Création de la stack 'lsi'..."

  RESP=$(curl -s -X POST \
    "${PORTAINER_URL}/api/stacks/create/standalone/string?endpointId=${ENDPOINT_ID}" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"lsi\",\"stackFileContent\":${COMPOSE_JSON},\"env\":${ENV_ARRAY}}" \
    2>/dev/null)

  if echo "$RESP" | jq -e '.Id' &>/dev/null; then
    STACK_ID=$(echo "$RESP" | jq -r '.Id')
    ok "Stack créée avec succès (ID: ${STACK_ID})"
  else
    MSG=$(echo "$RESP" | jq -r '.message // .details // .' 2>/dev/null)
    err "Échec de la création.\n     Portainer a répondu : ${MSG}"
  fi
fi

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
sep
echo ""
echo -e "${GREEN}${BOLD}"
echo "   ╔═══════════════════════════════════════════════════╗"
echo "   ║                                                   ║"
echo "   ║   Stack déployée avec succès !                    ║"
echo "   ║                                                   ║"
echo "   ╚═══════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo ""
echo -e "  Gérez la stack depuis : ${BLUE}${BOLD}${PORTAINER_URL}${RESET}"
echo ""
echo -e "  ${DIM}Pour voir les logs dans Portainer :${RESET}"
echo -e "  Stacks → lsi → Services → app → Logs"
echo ""
sep
echo ""
