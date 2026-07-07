#!/usr/bin/env bash
# deploy_frontend.sh — Build and deploy frontend to Nginx static dir (T165)
#
# Usage:
#   ./scripts/deploy_frontend.sh [--env production|staging] [--output-dir /path]
#
# Environment variables:
#   VITE_API_BASE_URL   — Backend API URL (required, e.g. https://api.daltec.prod)
#   VITE_WS_BASE_URL    — WebSocket base URL (optional, defaults to wss version of API)
#   NGINX_STATIC_DIR    — Where to copy built files (default: /opt/daltec/nginx/static)

set -euo pipefail

ENV="${DEPLOY_ENV:-production}"
NGINX_STATIC_DIR="${NGINX_STATIC_DIR:-/opt/daltec/nginx/static}"
FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"

# ---------------------------------------------------------------------------
# Validate environment
# ---------------------------------------------------------------------------
if [ -z "${VITE_API_BASE_URL:-}" ]; then
    echo "✗ VITE_API_BASE_URL is required" >&2
    echo "  Example: export VITE_API_BASE_URL=https://api.daltec.prod" >&2
    exit 1
fi

VITE_WS_BASE_URL="${VITE_WS_BASE_URL:-$(echo "${VITE_API_BASE_URL}" | sed 's|https://|wss://|;s|http://|ws://|')}"

echo "=== Daltec Frontend Deployment ==="
echo "Environment:    ${ENV}"
echo "API URL:        ${VITE_API_BASE_URL}"
echo "WebSocket URL:  ${VITE_WS_BASE_URL}"
echo "Output dir:     ${NGINX_STATIC_DIR}"
echo ""

# ---------------------------------------------------------------------------
# Install dependencies (if needed)
# ---------------------------------------------------------------------------
cd "${FRONTEND_DIR}"

echo "Installing npm dependencies..."
npm ci --prefer-offline

# ---------------------------------------------------------------------------
# Production build
# ---------------------------------------------------------------------------
echo ""
echo "Building production bundle..."
VITE_API_BASE_URL="${VITE_API_BASE_URL}" \
VITE_WS_BASE_URL="${VITE_WS_BASE_URL}" \
npm run build

echo ""
BUILD_SIZE="$(du -sh dist/ | cut -f1)"
echo "✓ Build complete (${BUILD_SIZE})"

# ---------------------------------------------------------------------------
# Deploy to Nginx static directory
# ---------------------------------------------------------------------------
echo ""
echo "Deploying to ${NGINX_STATIC_DIR}..."
mkdir -p "${NGINX_STATIC_DIR}"

# Backup previous deployment
if [ -d "${NGINX_STATIC_DIR}/current" ]; then
    PREV_BACKUP="${NGINX_STATIC_DIR}/previous_$(date +%Y%m%d_%H%M%S)"
    mv "${NGINX_STATIC_DIR}/current" "${PREV_BACKUP}"
    echo "  ✓ Previous build backed up to $(basename "${PREV_BACKUP}")"
fi

# Copy new build
cp -r dist/ "${NGINX_STATIC_DIR}/current"
echo "  ✓ New build deployed to ${NGINX_STATIC_DIR}/current"

# Prune old backups (keep last 3)
ls -1td "${NGINX_STATIC_DIR}"/previous_* 2>/dev/null | tail -n +4 | xargs -r rm -rf
echo "  ✓ Old frontend builds pruned (keeping last 3)"

echo ""
echo "=== Frontend deployment complete ==="
