#!/usr/bin/env bash
# deploy_migrations.sh — Run database migrations in production (T161)
#
# Usage:
#   ./scripts/deploy_migrations.sh [--dry-run]
#
# This script:
#   1. Shows the pending migration plan (--plan)
#   2. Prompts for confirmation unless --yes flag is passed
#   3. Applies migrations
#   4. Verifies all migrations show [X]
#
# Run inside backend container or with docker-compose exec:
#   docker-compose exec backend bash /app/scripts/deploy_migrations.sh

set -euo pipefail

DRY_RUN=false
YES=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --yes)     YES=true ;;
    esac
done

MANAGE="python manage.py"

echo "=== Daltec Production Migration ==="
echo ""

# ---------------------------------------------------------------------------
# Show current migration state
# ---------------------------------------------------------------------------
echo "--- Current migration status ---"
${MANAGE} showmigrations

echo ""
echo "--- Pending migrations (migrate --plan) ---"
${MANAGE} migrate --plan 2>&1 | grep -E "^\s*(Applying|Unapplying)" || echo "(no pending migrations)"

echo ""

if [ "${DRY_RUN}" = "true" ]; then
    echo "Dry-run mode — no migrations applied."
    exit 0
fi

# ---------------------------------------------------------------------------
# Confirm before applying
# ---------------------------------------------------------------------------
if [ "${YES}" != "true" ]; then
    read -rp "Apply migrations to production? [y/N] " CONFIRM
    if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# ---------------------------------------------------------------------------
# Apply migrations
# ---------------------------------------------------------------------------
echo ""
echo "Applying migrations..."
${MANAGE} migrate --noinput

echo ""
echo "--- Post-migration status ---"
${MANAGE} showmigrations | grep -E "^\[" | grep -c "\[ \]" && {
    echo "✗ WARNING: Some migrations are still unapplied!" >&2
    exit 1
} || true

echo ""
echo "✓ All migrations applied successfully."
