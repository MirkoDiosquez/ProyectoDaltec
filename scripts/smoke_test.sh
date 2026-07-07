#!/usr/bin/env bash
# smoke_test.sh — Post-deployment smoke tests (T166)
#
# Usage:
#   ./scripts/smoke_test.sh [API_BASE_URL] [FRONTEND_URL]
#
# Environment variables (or positional args):
#   API_BASE_URL     — e.g. https://api.daltec.prod
#   FRONTEND_URL     — e.g. https://daltec.prod
#   SMOKE_USER       — Admin username for API auth
#   SMOKE_PASSWORD   — Admin password for API auth
#
# Exit code 0 = all tests passed
# Exit code 1 = one or more tests failed

set -euo pipefail

API_BASE_URL="${1:-${API_BASE_URL:-http://localhost:8000}}"
FRONTEND_URL="${2:-${FRONTEND_URL:-http://localhost:3000}}"
SMOKE_USER="${SMOKE_USER:-admin}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-}"

PASS=0
FAIL=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
ok() {
    echo "  ✓ $1"
    PASS=$((PASS + 1))
}

fail() {
    echo "  ✗ $1" >&2
    FAIL=$((FAIL + 1))
}

check_http() {
    local label="$1"
    local url="$2"
    local expected_status="${3:-200}"

    actual=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "${url}")
    if [ "${actual}" = "${expected_status}" ]; then
        ok "${label} → HTTP ${actual}"
    else
        fail "${label} → expected HTTP ${expected_status}, got ${actual} (${url})"
    fi
}

check_json_field() {
    local label="$1"
    local url="$2"
    local field="$3"
    local headers="${4:-}"

    response=$(curl -s --connect-timeout 10 --max-time 15 ${headers} "${url}")
    if echo "${response}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '${field}' in d or any('${field}' in str(v) for v in d.values())" 2>/dev/null; then
        ok "${label}"
    else
        fail "${label} (field '${field}' not found in response)"
    fi
}

# ---------------------------------------------------------------------------
# Start
# ---------------------------------------------------------------------------
echo "=== Daltec Smoke Tests ==="
echo "API:      ${API_BASE_URL}"
echo "Frontend: ${FRONTEND_URL}"
echo ""

# ---------------------------------------------------------------------------
# 1. Frontend accessible
# ---------------------------------------------------------------------------
echo "--- Frontend ---"
check_http "Frontend index page loads" "${FRONTEND_URL}" "200"

# ---------------------------------------------------------------------------
# 2. API health
# ---------------------------------------------------------------------------
echo ""
echo "--- API Health ---"
check_http "API root accessible" "${API_BASE_URL}/api/v1/" "200"

# ---------------------------------------------------------------------------
# 3. Swagger UI
# ---------------------------------------------------------------------------
check_http "Swagger UI accessible" "${API_BASE_URL}/api/docs/" "200"

# ---------------------------------------------------------------------------
# 4. Auth — obtain token
# ---------------------------------------------------------------------------
echo ""
echo "--- Authentication ---"
if [ -n "${SMOKE_PASSWORD}" ]; then
    TOKEN_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"${SMOKE_USER}\", \"password\": \"${SMOKE_PASSWORD}\"}" \
        --connect-timeout 10 --max-time 15 \
        "${API_BASE_URL}/api/v1/token/")

    ACCESS_TOKEN=$(echo "${TOKEN_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))" 2>/dev/null || echo "")

    if [ -n "${ACCESS_TOKEN}" ]; then
        ok "JWT token obtained for ${SMOKE_USER}"
        AUTH_HEADER="-H \"Authorization: Bearer ${ACCESS_TOKEN}\""
    else
        fail "JWT token NOT obtained (check credentials)"
        AUTH_HEADER=""
    fi
else
    echo "  ⚠ SMOKE_PASSWORD not set — skipping auth checks"
    AUTH_HEADER=""
fi

# ---------------------------------------------------------------------------
# 5. Catalog data loaded (T162 verification)
# ---------------------------------------------------------------------------
echo ""
echo "--- Catalog Data ---"
if [ -n "${ACCESS_TOKEN:-}" ]; then
    SECTORS=$(curl -s --connect-timeout 10 --max-time 15 \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        "${API_BASE_URL}/api/v1/catalogos/sectores/")
    SECTOR_COUNT=$(echo "${SECTORS}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('results', d if isinstance(d,list) else []))))" 2>/dev/null || echo "0")

    if [ "${SECTOR_COUNT}" -ge 3 ] 2>/dev/null; then
        ok "Catalog sectors loaded (${SECTOR_COUNT} sectors)"
    else
        fail "Expected ≥3 sectors, got ${SECTOR_COUNT}"
    fi

    # Check subsections
    SUBSECS=$(curl -s --connect-timeout 10 --max-time 15 \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        "${API_BASE_URL}/api/v1/catalogos/subsecciones/")
    SUBSEC_COUNT=$(echo "${SUBSECS}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('results', d if isinstance(d,list) else []))))" 2>/dev/null || echo "0")

    if [ "${SUBSEC_COUNT}" -ge 4 ] 2>/dev/null; then
        ok "Catalog subsecciones loaded (${SUBSEC_COUNT} subsecciones)"
    else
        fail "Expected ≥4 subsecciones, got ${SUBSEC_COUNT}"
    fi
fi

# ---------------------------------------------------------------------------
# 6. Hallazgos API (VS-01 from quickstart)
# ---------------------------------------------------------------------------
echo ""
echo "--- Hallazgos API ---"
if [ -n "${ACCESS_TOKEN:-}" ]; then
    check_http "GET /api/v1/hallazgos/ returns 200" \
        "${API_BASE_URL}/api/v1/hallazgos/" "200"
fi

# ---------------------------------------------------------------------------
# 7. Notifications API (US8)
# ---------------------------------------------------------------------------
echo ""
echo "--- Notifications API ---"
if [ -n "${ACCESS_TOKEN:-}" ]; then
    check_http "GET /api/v1/notificaciones/ returns 200" \
        "${API_BASE_URL}/api/v1/notificaciones/" "200"
fi

# ---------------------------------------------------------------------------
# 8. Static files
# ---------------------------------------------------------------------------
echo ""
echo "--- Static Files ---"
check_http "Django admin accessible" "${API_BASE_URL}/admin/" "302"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Smoke Test Results ==="
echo "Passed: ${PASS}"
echo "Failed: ${FAIL}"

if [ "${FAIL}" -gt 0 ]; then
    echo ""
    echo "✗ SMOKE TESTS FAILED — do not proceed with deployment" >&2
    exit 1
fi

echo ""
echo "✓ All smoke tests passed"
exit 0
