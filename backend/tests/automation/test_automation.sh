#!/bin/bash
#
# test_automation.sh — Test script for automated tasks
#
# This script tests all automation features:
# 1. Cleanup old notifications
# 2. Database backup
# 3. Responsable history tracking
#
# Usage (from docker-compose):
#   docker-compose exec backend bash tests/automation/test_automation.sh
#

echo "========================================"
echo "Testing Automated Tasks"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Test cleanup_old_notifications
echo ""
echo -e "${YELLOW}[1/3] Testing: cleanup_old_notifications${NC}"
echo "========================================"

python manage.py cleanup_old_notifications
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Cleanup old notifications completed${NC}"
else
    echo -e "${RED}✗ Cleanup old notifications failed${NC}"
    exit 1
fi

# 2. Test backup_database
echo ""
echo -e "${YELLOW}[2/3] Testing: backup_database${NC}"
echo "========================================"

python manage.py backup_database --backup-dir "/tmp/test_backups"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database backup completed${NC}"
    ls -lh /tmp/test_backups/
else
    echo -e "${RED}✗ Database backup failed${NC}"
    exit 1
fi

# 3. Test responsable history tracking
echo ""
echo -e "${YELLOW}[3/3] Testing: Responsable history tracking${NC}"
echo "========================================"

python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.hallazgos.models import HallazgoResponsableHistorial
from django.contrib.auth import get_user_model

User = get_user_model()

# Count history records
count = HallazgoResponsableHistorial.objects.count()
print(f'Total historical records: {count}')

# Show latest records
print('\\nLatest 5 history records:')
for record in HallazgoResponsableHistorial.objects.all().order_by('-fecha_asignacion')[:5]:
    status = 'ACTIVE' if not record.fecha_remocion else 'REMOVED'
    print(f'  - {record.responsable} → Hallazgo {record.hallazgo_id} [{status}]')
    print(f'    Assigned: {record.fecha_asignacion}')
    if record.fecha_remocion:
        print(f'    Removed: {record.fecha_remocion}')
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Responsable history tracking working${NC}"
else
    echo -e "${RED}✗ Responsable history tracking failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================"
echo "All tests passed!"
echo "========================================${NC}"
