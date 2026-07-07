# Post-Launch Monitoring Guide (T167)

**Feature**: Mejoras al Sistema de Gestión de Hallazgos (003-mejoras-hallazgos)  
**Date**: 2026-07-07

---

## Overview

This guide covers the 24-hour post-launch monitoring period following Phase 12 deployment.  
Monitor these areas to catch regressions before they impact users.

---

## 1. Real-Time Log Monitoring

### Tail error logs from Docker Compose

```bash
# All errors from backend
docker-compose logs -f backend | grep -iE "ERROR|CRITICAL|Exception|Traceback"

# Business-critical events (sector classification, porqué approval, notifications)
docker-compose logs -f backend | grep -iE "hallazgo|porque|notify|urgente"

# WebSocket consumer issues
docker-compose logs -f backend | grep -iE "websocket|channel|consumer"
```

### Filter by log level (JSON format in production)

```bash
docker-compose logs -f backend | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        rec = json.loads(line)
        if rec.get('level') in ('ERROR', 'CRITICAL', 'WARNING'):
            print(json.dumps(rec, indent=2))
    except Exception:
        pass
"
```

---

## 2. Key Metrics to Watch

| Metric | Target | Alert threshold |
|--------|--------|----------------|
| API response time (p95) | < 200ms | > 500ms |
| API error rate (5xx) | < 0.1% | > 1% |
| WebSocket notification latency | < 3s | > 5s |
| DB connection pool usage | < 70% | > 90% |
| Redis memory usage | < 60% | > 80% |
| File upload success rate | > 99% | < 95% |
| Frontend bundle load time | < 3s | > 6s |

---

## 3. Health Check Commands

```bash
# Backend API health
curl -sf http://localhost:8000/api/v1/ | python3 -m json.tool

# Check migration state
docker-compose exec backend python manage.py showmigrations | grep "\[ \]" && echo "WARN: unapplied migrations" || echo "OK: all applied"

# Check catalog data
docker-compose exec backend python manage.py shell -c "
from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog
print('Sectors:', SectorCatalog.objects.count())
print('Subsecciones:', SubsectionCatalog.objects.count())
print('Tipos:', TipoCatalog.objects.count())
"

# Redis connectivity
docker-compose exec backend python manage.py shell -c "
from django.core.cache import cache
cache.set('smoke_test', 'ok', 10)
assert cache.get('smoke_test') == 'ok', 'Redis cache NOT working'
print('Redis cache: OK')
"

# Check for pending notifications (backlog)
docker-compose exec backend python manage.py shell -c "
from apps.notificaciones.models import Notificacion
pending = Notificacion.objects.filter(leida=False).count()
print(f'Unread notifications: {pending}')
"
```

---

## 4. Critical Alerts — What to Look For

### 4.1 Database Issues
- Migration error or unapplied migration after deploy → run `python manage.py migrate`
- MySQL connection timeout → check `MYSQL_HOST`, `MYSQL_PORT`, firewall rules
- Deadlock errors → check slow queries with `SHOW PROCESSLIST`

### 4.2 WebSocket Issues
- `channels_redis` connection errors → verify Redis is running and `REDIS_URL` is correct
- Consumers crash on connect → check `ASGI_APPLICATION` setting and Daphne startup logs
- Urgent notifications not delivered → check `chat/consumers.py` broadcast logic

### 4.3 File Upload Issues
- 413 Request Entity Too Large → check Nginx `client_max_body_size` in nginx.conf
- MIME type validation failures → verify `ALLOWED_FILE_TYPES` env var is set correctly
- Orphaned files in media dir → run `python manage.py cleanup_files`

### 4.4 Authentication Issues
- JWT token rejection (401) → verify `SECRET_KEY` is consistent across restarts
- Token blacklist errors → ensure `rest_framework_simplejwt.token_blacklist` app is in `INSTALLED_APPS` and migrated

---

## 5. Rollback Decision Criteria

**Trigger rollback if**:
- API error rate exceeds 5% for > 5 minutes
- Critical feature broken (hallazgo creation, login, file upload)
- Data corruption detected in any model
- Security vulnerability actively exploited

**Rollback procedure**:

```bash
# 1. Stop current containers
docker-compose down

# 2. Restore database from backup (T160)
BACKUP_FILE=$(ls -1t /opt/daltec/backups/backup_*.sql.gz | head -1)
zcat "${BACKUP_FILE}" | mysql -h "${MYSQL_HOST}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}"

# 3. Revert to previous docker-compose version
git checkout HEAD~1 docker-compose.yml

# 4. Restart with previous images
docker-compose pull
docker-compose up -d

# 5. Verify health
curl -sf http://localhost:8000/api/v1/
```

---

## 6. 24-Hour Monitoring Checklist

### Hour 1 (immediately after deploy)
- [ ] Smoke tests pass (`scripts/smoke_test.sh`)
- [ ] No 5xx errors in backend logs
- [ ] At least 1 successful login by a real user
- [ ] Catalog data visible in frontend selector

### Hours 2–6
- [ ] File uploads working (test with JPG and PDF)
- [ ] Chat messages sending and receiving
- [ ] WebSocket connections stable (no repeated reconnects)
- [ ] Hallazgo creation with sector/subseccion works

### Hours 6–24
- [ ] No spike in database slow queries
- [ ] Redis memory stable (not growing unboundedly)
- [ ] No CRITICAL log entries
- [ ] Notification delivery latency < 3s (verified via browser)

---

## 7. Monitoring Tools (Optional)

If the project uses external monitoring, configure the following:

| Tool | Configuration |
|------|--------------|
| **Sentry** | Set `SENTRY_DSN` env var; install `sentry-sdk` in requirements |
| **Datadog** | Install `dd-trace` and `ddtrace-run` prefix; set `DD_API_KEY` |
| **New Relic** | Install `newrelic`; set `NEW_RELIC_LICENSE_KEY` |
| **CloudWatch** | Configure `boto3` log handler; set AWS credentials |
| **UptimeRobot** | Add HTTP monitor for `${API_BASE_URL}/api/v1/` every 5 min |
