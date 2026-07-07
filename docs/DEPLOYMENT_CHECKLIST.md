# Production Deployment Checklist (T159)

**Date**: 2026-07-05
**Feature**: Mejoras al Sistema de Gestión de Hallazgos (003-mejoras-hallazgos)

## Pre-Deployment Verification (T156-T158)

### Infrastructure & Dependencies
- [ ] **T156**: .dockerignore file contains all build-ignore patterns for Python, Node, IDE, logs, .git
- [ ] **T157**: docker-compose.yml includes:
  - All new environment variables (LOG_LEVEL, LOG_FORMAT, LOG_ROOT, FILE_UPLOAD_WHITELIST, CHANNEL_LAYERS)
  - Backend, frontend, nginx, mysql, redis services with correct versions
  - Volume mounts for logs directory
  - Network configuration (single custom network)
- [ ] **T158**: Docker build succeeds locally: `docker-compose build` without errors
  - No missing dependencies in requirements.txt
  - No npm module conflicts
  - Base image compatible with production OS

### Database & Migrations
- [ ] **T161**: All migrations generated and tested locally
  - `python manage.py makemigrations` shows no pending migrations
  - `python manage.py migrate --plan` shows expected migration sequence
  - Test migration on development database: `python manage.py migrate`

### Security Verification
- [ ] HTTPS enforced in production settings (SECURE_SSL_REDIRECT=True)
- [ ] SECURE_HSTS_SECONDS configured (min 31536000 = 1 year)
- [ ] CSRF_COOKIE_SECURE=True in production
- [ ] SESSION_COOKIE_SECURE=True in production
- [ ] JWT token expiration configured (default 15 min for access, 7 days for refresh)
- [ ] File upload whitelist configured in settings (no executable formats)
- [ ] Database credentials rotated and stored in environment variables (never in code)
- [ ] API keys/secrets stored in environment variables (not in git)

### Configuration & Catalog Data
- [ ] **T162**: Catalog fixtures prepared and tested
  - `backend/apps/catalogos/fixtures/catalogs.json` contains all sector/subseccion/tipo values
  - Fixture loadable without errors: `python manage.py loaddata catalogs.json`
  - Values match production business requirements

### Logging & Observability
- [ ] Logs directory created and writable: `/app/logs/` (or configured path)
- [ ] Log rotation configured (maxBytes=10MB, backupCount=5)
- [ ] Log level set to INFO in production (not DEBUG)
- [ ] Structured logging (JSON format) enabled in production
- [ ] Log aggregation service configured (if using ELK/Splunk/CloudWatch)

### API & Frontend Build
- [ ] OpenAPI/Swagger schema generated: `python manage.py spectacular-to-schema`
- [ ] Swagger UI accessible at `/api/docs/`
- [ ] Frontend build succeeds: `npm run build`
- [ ] Frontend bundle size verified (< 500KB gzipped recommended)
- [ ] No console errors in production build
- [ ] Static files collected: `python manage.py collectstatic --noinput`

### Testing
- [ ] **T149**: Python test suite passes: `pytest --cov=backend/apps` with >70% coverage
- [ ] **T150**: Frontend unit tests pass: `npm test` with >60% coverage
- [ ] **T152**: Manual regression testing completed:
  - VS-01: Create hallazgo with sector/subseccion
  - VS-02: Create análisis cinco porqués and approve
  - VS-03: Upload file and preview
  - VS-04: Request responsible party change
  - VS-05: Receive and categorize notifications
  - VS-06: Send urgent message (#urgente) in chat
  - VS-07: Admin panel shows categorized notifications
  - VS-08: Employee panel shows assignments and urgent messages

---

## Deployment Steps (T160-T168)

### 1. Pre-Deployment Backup (T160)
```bash
# Backup production database
mysqldump -h ${MYSQL_HOST} -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DB} \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size and integrity
ls -lh backup_*.sql
mysql -h ${MYSQL_HOST} -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DB} < backup_*.sql --no-data
```

### 2. Code Deployment (T164-T165)
```bash
# Deploy via CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
# 1. Backend code push to production server
# 2. Frontend build and CDN upload (or Nginx static serving)
# 3. Docker image build and push to registry
# 4. Update production docker-compose.yml image versions
```

### 3. Database Migrations (T161)
```bash
# On production server, inside backend container:
docker-compose exec backend python manage.py migrate

# Verify migrations applied:
docker-compose exec backend python manage.py showmigrations | grep -E "003_|004_|..."
```

### 4. Catalog Data Load (T162)
```bash
# Load initial catalogs (sectors, subsecciones, tipos)
docker-compose exec backend python manage.py loaddata catalogs.json

# Verify data loaded:
docker-compose exec backend python manage.py shell << 'EOF'
from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog
print(f"Sectors: {SectorCatalog.objects.count()}")
print(f"Subsecciones: {SubsectionCatalog.objects.count()}")
print(f"Tipos: {TipoCatalog.objects.count()}")
EOF
```

### 5. Cache & Static Files (T163)
```bash
# Clear any existing cache
docker-compose exec backend python manage.py clear_cache

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput --clear

# Verify static files collected
ls -la backend/staticfiles/
```

### 6. Health Checks
```bash
# Verify backend is healthy
curl -I https://api.daltec.prod/api/v1/hallazgos/

# Verify frontend is accessible
curl -I https://daltec.prod/

# Check WebSocket connectivity (from frontend)
wscat -c wss://api.daltec.prod/ws/notificaciones/
```

### 7. Smoke Test (T166)
```bash
# Manual smoke test checklist:
1. Open https://daltec.prod/ in browser
2. Login with test admin account
3. Create hallazgo with sector PROVEEDOR
4. Verify sector and tipo display correctly
5. Create another hallazgo with sector INTERNO + subseccion ADMIN
6. Verify subseccion requirement enforced
7. Upload test file and verify preview works
8. Open chat and send message with #urgente
9. Verify notification received in 3 seconds
10. Admin checks notification panel shows categorized notifications
11. Employee checks panel shows assignments and urgent messages
```

### 8. Post-Deployment Monitoring (T167)
```bash
# Monitor error logs for 24 hours
docker-compose logs -f backend | grep -i error

# Monitor performance metrics
# - API response times (target: < 200ms p95)
# - Database connection pool usage
# - Redis memory usage
# - File upload success rate
# - WebSocket connection count

# Check uptime monitoring (if configured)
# - New Relic, Datadog, CloudWatch, etc.

# Alerts configured for:
# - Error rate > 1%
# - API response time > 500ms
# - Database connection pool exhausted
# - Redis memory > 80%
# - Disk space < 10% remaining
```

### 9. Rollback Plan (if needed)
```bash
# If critical issues discovered:

# 1. Restore previous database backup
docker-compose down
mysql -h ${MYSQL_HOST} -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DB} < backup_previous.sql

# 2. Revert docker-compose.yml to previous version
git checkout HEAD~1 docker-compose.yml

# 3. Restart services with previous image versions
docker-compose pull
docker-compose up -d

# 4. Verify rollback successful
curl -I https://api.daltec.prod/api/v1/hallazgos/
```

---

## Post-Deployment Tasks (T168)

### User Feedback Collection
- [ ] Open feedback form for users
- [ ] Monitor Slack/email for reported issues
- [ ] Create GitHub issues for reported bugs (with priority labels)
- [ ] Track user satisfaction metrics (NPS, feature usage)

### Issue Backlog for Phase 2
- [ ] Categorize feedback by priority (P0: critical, P1: high, P2: medium, P3: low)
- [ ] Create GitHub issues with labels (bug, enhancement, performance, ux, security)
- [ ] Estimate effort for each issue
- [ ] Plan Phase 2 development roadmap based on user feedback

### Documentation Update
- [ ] Update README.md with new features
- [ ] Document new API endpoints in Swagger UI
- [ ] Create user guide for new notification panel
- [ ] Create admin guide for managing catalogs

---

## Success Criteria

✅ Deployment completed without data loss  
✅ All smoke tests pass  
✅ Error rate < 0.1% in first 24 hours  
✅ API response time p95 < 200ms  
✅ WebSocket notifications deliver < 3 seconds  
✅ File uploads succeed for files < 50MB  
✅ No security vulnerabilities detected  
✅ User feedback collected and backlog created  

**Sign-off**: _________________ Date: _________
