#!/usr/bin/env bash
# backup_db.sh — Production database backup before deployment (T160)
#
# Usage:
#   ./scripts/backup_db.sh [output_dir]
#
# Environment variables required (or defined in .env.production):
#   MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
#
# Output:
#   <output_dir>/backup_<YYYYMMDD_HHMMSS>.sql.gz
#
# Example:
#   MYSQL_HOST=prod-db MYSQL_USER=daltec MYSQL_PASSWORD=secret \
#     MYSQL_DATABASE=daltec_production ./scripts/backup_db.sh /backups

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OUTPUT_DIR="${1:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${OUTPUT_DIR}/backup_${TIMESTAMP}.sql.gz"

MYSQL_HOST="${MYSQL_HOST:?MYSQL_HOST is required}"
MYSQL_USER="${MYSQL_USER:?MYSQL_USER is required}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
MYSQL_DATABASE="${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

# ---------------------------------------------------------------------------
# Create output directory
# ---------------------------------------------------------------------------
mkdir -p "${OUTPUT_DIR}"

echo "=== Daltec DB Backup ==="
echo "Host:     ${MYSQL_HOST}:${MYSQL_PORT}"
echo "Database: ${MYSQL_DATABASE}"
echo "Output:   ${BACKUP_FILE}"
echo ""

# ---------------------------------------------------------------------------
# Run mysqldump and compress
# ---------------------------------------------------------------------------
MYSQL_PWD="${MYSQL_PASSWORD}" mysqldump \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-table \
    --set-gtid-purged=OFF \
    "${MYSQL_DATABASE}" \
  | gzip > "${BACKUP_FILE}"

BACKUP_SIZE="$(du -sh "${BACKUP_FILE}" | cut -f1)"
echo "✓ Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ---------------------------------------------------------------------------
# Quick integrity check — decompress header only
# ---------------------------------------------------------------------------
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "✓ Integrity check passed (gzip -t)"
else
    echo "✗ Integrity check FAILED — backup may be corrupted!" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Prune old backups (keep last 7)
# ---------------------------------------------------------------------------
KEEP=7
echo ""
echo "Pruning old backups (keeping last ${KEEP})..."
ls -1t "${OUTPUT_DIR}"/backup_*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -v

echo ""
echo "=== Backup complete ==="
