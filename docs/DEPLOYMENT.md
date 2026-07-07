# Deployment Guide: ProyectoDaltec Hallazgos Management

**Last Updated**: 2026-07-05  
**Status**: Production-Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Development Setup](#development-setup)
4. [Production Deployment](#production-deployment)
5. [Database Migrations](#database-migrations)
6. [Environment Variables](#environment-variables)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
8. [Backup & Recovery](#backup--recovery)

---

## Overview

ProyectoDaltec is deployed using **Docker Compose** for development and **Kubernetes/Docker Swarm** for production. This guide covers both environments.

### Deployment Workflow

```
Development Branch → Feature Tests → Staging → Production Deployment
     (T156)              (T149-T152)          ↓
                                        Database Backup (T160)
                                        Database Migration (T161)
                                        Catalog Load (T162)
                                        Cache Clear (T163)
                                        Code Deploy (T164-T165)
                                        Smoke Tests (T166)
                                        Monitoring (T167)
```

---

## Prerequisites

### System Requirements

**Development**:
- Docker 20.10+
- Docker Compose 1.29+
- 4GB RAM, 20GB disk

**Production**:
- Kubernetes 1.20+ OR Docker Swarm
- Load balancer (AWS ALB, HAProxy)
- Managed MySQL 8.0+
- Managed Redis 7+ (or self-hosted cluster)
- Domain name + SSL certificate
- Email service for notifications (optional)

### Tools Installation

```bash
# macOS (using Homebrew)
brew install docker docker-compose

# Windows (using Chocolatey)
choco install docker-desktop docker-compose

# Linux (Ubuntu/Debian)
sudo apt-get install docker.io docker-compose
sudo usermod -aG docker $USER
```

---

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourorga/ProyectoDaltec.git
cd ProyectoDaltec
git checkout 003-mejoras-hallazgos
```

### 2. Create Environment Files

Create `.env` file in project root:

```bash
# .env (Development)
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,frontend

# Database
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=daltec_dev
MYSQL_USER=daltec_user
MYSQL_PASSWORD=daltec_password
MYSQL_ROOT_PASSWORD=root_password

# Redis
REDIS_HOST=redis_cache
REDIS_PORT=6379
REDIS_CHANNELS_HOST=redis_channels
REDIS_CHANNELS_PORT=6380

# JWT
JWT_ACCESS_TOKEN_LIFETIME=900  # 15 minutes
JWT_REFRESH_TOKEN_LIFETIME=604800  # 7 days

# Logging (T133)
LOG_LEVEL=INFO
LOG_FORMAT=text
LOG_ROOT=/app/logs

# File Upload (T147)
FILE_UPLOAD_MAX_SIZE_MB=50
FILE_UPLOAD_WHITELIST=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,csv

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=1025
```

### 3. Build & Start Services

```bash
# Build containers
docker-compose build

# Start services (background)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Load initial catalogs (T162)
docker-compose exec backend python manage.py loaddata backend/apps/catalogos/fixtures/catalogs.json

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Verify setup
docker-compose exec backend python manage.py shell
```

### 5. Access Application

- **Frontend**: http://localhost:3000/
- **API**: http://localhost:8000/api/v1/
- **Admin Panel**: http://localhost:8000/admin/
- **Swagger UI**: http://localhost:8000/api/docs/
- **WebSocket**: ws://localhost:8000/ws/notificaciones/

---

## Production Deployment

### 1. Pre-Deployment Checklist (T156-T159)

- [ ] All tests pass: `pytest --cov=backend/apps`
- [ ] Frontend builds: `npm run build`
- [ ] Docker images build: `docker-compose build --no-cache`
- [ ] Database migrations reviewed: `python manage.py showmigrations`
- [ ] Environment variables secured (not in git)
- [ ] SSL certificates obtained and installed
- [ ] Backup plan documented (see [Backup & Recovery](#backup--recovery))

### 2. Production Environment File

Create `.env.production`:

```bash
DEBUG=False
SECRET_KEY=$(openssl rand -base64 32)  # Generate new secret
ALLOWED_HOSTS=api.daltec.com,daltec.com,www.daltec.com

MYSQL_HOST=mysql-prod.c.internal
MYSQL_PORT=3306
MYSQL_DATABASE=daltec_production
MYSQL_USER=daltec_prod
MYSQL_PASSWORD=$(openssl rand -base64 24)

REDIS_HOST=redis-prod.c.internal
REDIS_PORT=6379

JWT_ACCESS_TOKEN_LIFETIME=900
JWT_REFRESH_TOKEN_LIFETIME=604800

LOG_LEVEL=WARNING
LOG_FORMAT=json
LOG_ROOT=/var/log/daltec

SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True

CORS_ALLOWED_ORIGINS=https://daltec.com,https://www.daltec.com

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@daltec.com
EMAIL_HOST_PASSWORD=${{ secrets.GMAIL_APP_PASSWORD }}
```

### 3. Database Backup (T160)

```bash
# Before deployment: backup production database
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD --no-data $MYSQL_DATABASE < backup_*.sql

# Store backup securely
gsutil cp backup_*.sql gs://daltec-backups/  # Using Google Cloud Storage
# Or: aws s3 cp backup_*.sql s3://daltec-backups/
```

### 4. Deploy Backend Code (T164)

```bash
# Via CI/CD (GitHub Actions example)
name: Deploy Production
on:
  push:
    branches:
      - main
      - 003-mejoras-hallazgos

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: docker build -t daltec:latest -f backend/Dockerfile .
      
      - name: Push to registry
        run: |
          docker tag daltec:latest gcr.io/${{ secrets.GCP_PROJECT }}/daltec:latest
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/daltec:latest
      
      - name: Deploy to production
        run: |
          # Using kubectl
          kubectl set image deployment/daltec-backend \
            backend=gcr.io/${{ secrets.GCP_PROJECT }}/daltec:latest
```

### 5. Database Migrations (T161)

```bash
# On production server, in maintenance window:

# 1. Scale down frontend
kubectl scale deployment/daltec-frontend --replicas=0

# 2. Run migrations
kubectl exec deployment/daltec-backend -- \
  python manage.py migrate

# 3. Verify migrations
kubectl exec deployment/daltec-backend -- \
  python manage.py showmigrations

# 4. Scale up frontend
kubectl scale deployment/daltec-frontend --replicas=3
```

### 6. Load Catalog Data (T162)

```bash
# Load production catalogs (first time only or when catalogs update)
kubectl exec deployment/daltec-backend -- \
  python manage.py loaddata backend/apps/catalogos/fixtures/catalogs.json

# Verify data loaded
kubectl exec deployment/daltec-backend -- python manage.py shell << 'EOF'
from apps.catalogos.models import SectorCatalog
print(f"Sectors loaded: {SectorCatalog.objects.count()}")
EOF
```

### 7. Clear Cache (T163)

```bash
# Clear all caches
kubectl exec deployment/daltec-backend -- \
  python manage.py clear_cache

# Restart Redis to ensure clean state
kubectl rollout restart statefulset/redis
```

### 8. Smoke Testing (T166)

```bash
#!/bin/bash
# smoke_test.sh — Verify deployment health

API_URL="https://api.daltec.com/api/v1"
FRONTEND_URL="https://daltec.com"

echo "🔍 Smoke Testing ProyectoDaltec Production Deployment"
echo "=================================================="

# 1. API Health Check
echo "[1/8] Checking API health..."
if curl -s -I $API_URL/hallazgos/ | grep -q "200\|401"; then
    echo "✅ API is responding"
else
    echo "❌ API health check failed"
    exit 1
fi

# 2. Frontend Health Check
echo "[2/8] Checking frontend health..."
if curl -s -I $FRONTEND_URL | grep -q "200"; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# 3. Database Connectivity
echo "[3/8] Testing database connectivity..."
kubectl exec deployment/daltec-backend -- \
  python manage.py shell << 'EOF'
from django.db import connection
try:
    connection.ensure_connection()
    print("✅ Database connection successful")
except Exception as e:
    print(f"❌ Database error: {e}")
    exit(1)
EOF

# 4. WebSocket Connectivity (wscat required)
echo "[4/8] Testing WebSocket connectivity..."
wscat -c "wss://api.daltec.com/ws/notificaciones/" \
  --subprotocol "authorization: Bearer $AUTH_TOKEN" \
  --execute '{"type": "ping"}' \
  --wait 1000 && echo "✅ WebSocket working" || echo "❌ WebSocket failed"

# 5. File Upload Test
echo "[5/8] Testing file upload..."
TEST_FILE=$(mktemp)
echo "test" > $TEST_FILE
curl -X POST "$API_URL/archivos/upload/" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "archivo=@$TEST_FILE" && echo "✅ File upload working" || echo "❌ File upload failed"

# 6. Notification System
echo "[6/8] Testing notification creation..."
curl -X POST "$API_URL/notificaciones/" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Test","mensaje":"Test","tipo":"asignado_responsable"}' \
  && echo "✅ Notifications working" || echo "❌ Notifications failed"

# 7. Load Testing (basic)
echo "[7/8] Running basic load test (10 requests)..."
for i in {1..10}; do
    curl -s -o /dev/null -w "%{http_code}" $API_URL/hallazgos/ &
done
wait && echo "✅ Load test completed"

# 8. Error Logging
echo "[8/8] Checking error logs..."
ERROR_COUNT=$(kubectl logs deployment/daltec-backend --tail=100 | grep -c "ERROR")
if [ $ERROR_COUNT -lt 5 ]; then
    echo "✅ Error rate acceptable ($ERROR_COUNT errors in last 100 logs)"
else
    echo "⚠️ High error rate detected ($ERROR_COUNT errors)"
fi

echo ""
echo "✅ All smoke tests completed successfully!"
```

Run smoke tests:

```bash
chmod +x smoke_test.sh
./smoke_test.sh
```

---

## Database Migrations

### Running Migrations

```bash
# Show pending migrations
python manage.py showmigrations --plan

# Run migrations (development)
python manage.py migrate

# Run specific migration
python manage.py migrate apps.hallazgos 0005

# Rollback migration
python manage.py migrate apps.hallazgos 0004
```

### Creating Migrations

```bash
# After modifying models
python manage.py makemigrations

# Inspect migration SQL
python manage.py sqlmigrate apps.hallazgos 0001

# Empty migrations for data migration
python manage.py makemigrations --empty apps.hallazgos --name migrate_sector_data
```

---

## Environment Variables

### Backend Variables (Django Settings)

| Variable | Default | Purpose |
|----------|---------|---------|
| DEBUG | False | Debug mode (disable in production) |
| SECRET_KEY | (required) | Django secret for cryptography |
| ALLOWED_HOSTS | localhost | Comma-separated allowed domains |
| MYSQL_HOST | mysql | Database host |
| MYSQL_PORT | 3306 | Database port |
| MYSQL_DATABASE | daltec | Database name |
| MYSQL_USER | daltec_user | Database user |
| MYSQL_PASSWORD | (required) | Database password |
| REDIS_HOST | localhost | Redis cache host |
| REDIS_PORT | 6379 | Redis cache port |
| LOG_LEVEL | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |
| LOG_FORMAT | json | Log format (json or text) |

### Frontend Variables (React .env)

```bash
# .env (Frontend)
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000/ws/
REACT_APP_ENVIRONMENT=development
```

---

## Monitoring & Troubleshooting

### Common Issues

#### 1. Database Connection Error

```bash
# Check database status
docker-compose ps mysql

# Test connection
docker-compose exec mysql mysql -u daltec_user -p -e "SELECT 1"

# Check logs
docker-compose logs mysql | tail -50
```

#### 2. WebSocket Connection Failed

```bash
# Check Redis channel layer
docker-compose exec redis_channels redis-cli PING

# Check channels configuration
docker-compose logs backend | grep -i channels

# Test WebSocket connection
docker-compose exec backend python -c \
  "from channels.layers import get_channel_layer; import asyncio; \
   channel_layer = get_channel_layer(); \
   print(asyncio.run(channel_layer.group_send('test', {'type': 'test.message'})))"
```

#### 3. Frontend Build Errors

```bash
# Clear node_modules and rebuild
docker-compose down frontend
docker volume rm daltec_frontend_build
docker-compose build frontend
docker-compose up -d frontend
```

#### 4. High Memory Usage

```bash
# Check memory per container
docker-compose stats

# Clear cache
docker-compose exec backend python manage.py clear_cache

# Restart Redis
docker-compose restart redis_cache redis_channels
```

---

## Backup & Recovery

### Automated Backups

Setup daily backups using cron:

```bash
# /etc/cron.d/daltec-backup
0 2 * * * root /usr/local/bin/backup-daltec.sh

# backup-daltec.sh
#!/bin/bash
BACKUP_DIR="/backups/daltec"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE | \
  gzip > $BACKUP_DIR/database_$TIMESTAMP.sql.gz

# Backup files
tar -czf $BACKUP_DIR/files_$TIMESTAMP.tar.gz /var/data/daltec/

# Upload to cloud storage
gsutil cp $BACKUP_DIR/* gs://daltec-backups/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Recovery Procedure

```bash
# 1. Restore database
gunzip < backup_*.sql.gz | mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE

# 2. Restore files
tar -xzf backup_*.tar.gz -C /

# 3. Verify data
python manage.py shell << 'EOF'
from apps.hallazgos.models import Hallazgo
print(f"Hallazgos in database: {Hallazgo.objects.count()}")
EOF

# 4. Restart services
docker-compose restart
```

---

## Support & Troubleshooting

For issues, consult:
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design details
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) — Pre-deployment verification
- Docker logs: `docker-compose logs -f [service]`
- Django shell: `python manage.py shell`
- Django admin: `http://localhost:8000/admin/`

**Emergency Contact**: DevOps Team @ ops@daltec.com
