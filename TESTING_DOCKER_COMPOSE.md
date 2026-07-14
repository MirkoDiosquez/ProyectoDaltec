# Testing Automatizaciones con Docker Compose

## 📦 Configuración Actual

Tu proyecto usa Docker Compose con:
- **MySQL 8.0**: Servicio `db`
- **Redis 7**: Servicio `redis`
- **Backend Django**: Servicio `backend`
- **Frontend React**: Servicio `frontend`

---

## ✅ Paso 1: Iniciar Docker Compose

```bash
cd C:\Users\Usuario\Desktop\ProyectoDaltec

# Iniciar todos los servicios
docker-compose up -d

# Verificar que están corriendo
docker-compose ps
```

**Salida esperada**:
```
NAME          COMMAND             STATE      PORTS
backend       python manage...    Up         0.0.0.0:8000->8000/tcp
frontend      npm run dev         Up         0.0.0.0:5173->5173/tcp
db            docker-entrypoint   Up         3306/tcp
redis         redis-server        Up         6379/tcp
```

---

## ✅ Paso 2: Ejecutar Test de Automatizaciones

### Opción A: Comando Manual

```bash
# Ejecutar test suite completo
docker-compose exec backend python manage.py shell < tests/automation/test_automation.py
```

### Opción B: Usar Script Helper

```bash
# Desde PowerShell en Windows
bash scripts/run_automation_tests.sh
```

### Opción C: Comandos Individuales

```bash
# Test 1: Cleanup notificaciones
docker-compose exec backend python manage.py cleanup_old_notifications

# Test 2: Backup BD
docker-compose exec backend python manage.py backup_database

# Test 3: Ver histórico
docker-compose exec backend python manage.py shell
# Dentro de la shell:
# from apps.hallazgos.models import HallazgoResponsableHistorial
# HallazgoResponsableHistorial.objects.all()
```

---

## 🔍 Verificar Resultados

### Verificar Backups Creados

```bash
# En Docker (se guardan en /tmp/test_backups)
docker-compose exec backend ls -lh /tmp/test_backups/

# Salida esperada:
# backup_daltec_db_20260714_150000.sql  45M   julio 14 15:00

# En Windows local (configurado en settings)
dir C:\Users\Usuario\Desktop\Backup_no_conformidades\
```

### Verificar Notificaciones Limpias

```bash
docker-compose exec backend python manage.py shell
```

```python
from apps.notificaciones.models import Notificacion
from datetime import timedelta
from django.utils import timezone

# Ver notificaciones leídas hace más de 15 días
cutoff = timezone.now() - timedelta(days=15)
old = Notificacion.objects.filter(leida=True, fecha_lectura__lt=cutoff)
print(f"Old notifications (should be 0): {old.count()}")
```

### Verificar Histórico de Responsables

```bash
docker-compose exec backend python manage.py shell
```

```python
from apps.hallazgos.models import HallazgoResponsableHistorial

# Ver todos los cambios de responsables
for record in HallazgoResponsableHistorial.objects.all().order_by('-fecha_asignacion')[:10]:
    status = "ACTIVO" if not record.fecha_remocion else "REMOVIDO"
    print(f"{record.responsable} → Hallazgo {record.hallazgo_id} [{status}]")
    print(f"  Asignado: {record.fecha_asignacion}")
    if record.fecha_remocion:
        print(f"  Removido: {record.fecha_remocion}\n")
```

---

## 🖥️ Testing Frontend: Gestión de Archivos

### 1. Acceder a la página de gestión

1. Abre http://localhost:5173
2. Inicia sesión como **ADMIN**
3. Navega a `http://localhost:5173/admin/archivos`

### 2. Funcionalidades a Probar

- [ ] Tabla carga con todos los archivos
- [ ] Filtro por sección funciona (Hallazgos, Chat, 5-Why)
- [ ] Descargar archivo individual (clic en botón ⬇)
- [ ] Eliminar archivo individual (clic en botón 🗑)
- [ ] Seleccionar múltiples archivos
- [ ] Eliminar múltiples archivos (botón Eliminar)
- [ ] Contador de archivos se actualiza

---

## 📊 Estructura de Tests

```
tests/automation/
├── test_automation.py       # Suite de tests (ejecuta 3 tests)
└── test_automation.sh       # Script bash (opcional)

scripts/
└── run_automation_tests.sh  # Helper para ejecutar tests desde Docker
```

---

## 🧪 Detalles de los 3 Tests

### Test 1: Cleanup Old Notifications
```
Crea:
  - Notificación antigua (leída hace 20 días)
  - Notificación reciente (leída hace 5 días)

Ejecuta:
  - cleanup_old_notifications command

Verifica:
  - Notificación antigua fue eliminada ✓
  - Notificación reciente se mantiene ✓
```

### Test 2: Database Backup
```
Ejecuta:
  - backup_database command

Verifica:
  - Archivo .sql fue creado ✓
  - Está en directorio correcto (/tmp/test_backups/) ✓
  - Solo 2 backups máximo se mantienen ✓
  - Archivo tiene contenido > 0 bytes ✓
```

### Test 3: Responsable History
```
Crea:
  - Hallazgo de prueba
  - Usuario admin
  - Usuario empleado

Executa:
  - Asigna responsable al hallazgo
  - Verifica que se crea entrada en HallazgoResponsableHistorial
  - Remueve responsable
  - Verifica que se actualiza fecha_remocion

Resultado:
  - Auditoría completa de cambios ✓
```

---

## 📝 Salida Esperada Completa

Cuando ejecutes `docker-compose exec backend python manage.py shell < tests/automation/test_automation.py`:

```
============================================================
AUTOMATED TASKS TEST SUITE
============================================================

============================================================
TEST 1: Cleanup Old Notifications
============================================================
✓ Created old notification (ID: 123, fecha_lectura: 2026-06-29 10:00:00+00:00)
✓ Created recent notification (ID: 124, fecha_lectura: 2026-07-09 10:00:00+00:00)

Before cleanup: 2 read notifications
Cleanup deleted: 1 notifications

Old notification exists: False (should be False) ✓
Recent notification exists: True (should be True) ✓

============================================================
TEST 2: Database Backup
============================================================
Backup directory: /tmp/test_backups
[2026-07-14 15:00:00] Backup created successfully: backup_daltec_db_20260714_150000.sql
[2026-07-14 15:00:00] Backup directory contains 1 backup(s)
✓ Backup files created: 1
  Latest backup: backup_daltec_db_20260714_150000.sql (45.23 MB)
✓ Correct number of backups (max 2): 1

============================================================
TEST 3: Responsable History Tracking
============================================================
✓ Created test admin: admin_test@test.com
✓ Created test empleado: empleado_test@test.com
✓ Created test hallazgo: 42

✓ Assigned responsable: empleado_test@test.com to Hallazgo 42
✓ History record created (ACTIVE)
  Assigned: 2026-07-14 15:30:45+00:00

✓ Removed responsable: empleado_test@test.com from Hallazgo 42
✓ History record updated (REMOVED)
  Removed: 2026-07-14 15:30:50+00:00

Audit trail for Hallazgo 42:
  - empleado_test@test.com [REMOVED]
    Assigned: 2026-07-14 15:30:45+00:00
    Removed: 2026-07-14 15:30:50+00:00

============================================================
TEST RESULTS
============================================================
✓ PASS - Cleanup Old Notifications
✓ PASS - Database Backup
✓ PASS - Responsable History
Total: 3/3 tests passed
============================================================
```

---

## 🔄 Automatización en Producción (APScheduler)

Una vez deployado en producción, las tareas se ejecutan automáticamente:

### Configuración en Scheduler

**Ubicación**: `backend/apps/notificaciones/scheduler.py`

```python
# Daily cleanup at 2 AM
scheduler.add_job(
    cleanup_old_notifications,
    'cron',
    hour=2,
    minute=0,
)

# Database backup every 15 days at 3 AM
scheduler.add_job(
    backup_database,
    'interval',
    days=15,
)
```

### Verificar Scheduler Activo

```bash
# Ver logs
docker-compose logs backend | grep -i "scheduler\|backup\|cleanup"

# Entrada esperada:
# backend_1 | [2026-07-14 02:00:00] Cleanup old notifications completed
# backend_1 | APScheduler started
```

---

## 🚨 Troubleshooting

### Error: "Command not found"
```bash
# Asegurar que Docker está corriendo
docker-compose ps

# Si algo falla, reiniciar
docker-compose down
docker-compose up -d
```

### Error: "File not found: tests/automation/test_automation.py"
```bash
# Verificar que estás en el directorio correcto
pwd  # Debe ser: C:\Users\Usuario\Desktop\ProyectoDaltec

# Verificar que el archivo existe
ls tests/automation/
```

### Error: "Connection refused"
```bash
# MySQL tardó en iniciar, esperar e intentar nuevamente
docker-compose logs db | tail -20

# Ver health status
docker-compose ps db
```

### Backup muy pequeño o 0 bytes
```bash
# Verificar credenciales MySQL
docker-compose exec backend cat .env | grep DB_

# Verificar que mysqldump funciona
docker-compose exec db mysqldump -u root -p$MYSQL_ROOT_PASSWORD daltec_db | head -10
```

---

## 📚 Archivos Modificados/Creados

### Frontend
- ✅ `frontend/src/api/archivos.js` - Agregadas funciones admin
- ✅ `frontend/src/pages/admin/GestionArchivosPage.jsx` - Nueva página
- ✅ `frontend/src/App.jsx` - Ruta `/admin/archivos` agregada

### Backend
- ✅ `backend/apps/hallazgos/services.py` - Historico de responsables
- ✅ `backend/apps/hallazgos/models.py` - Modelo ya existía
- ✅ `backend/apps/notificaciones/management/commands/cleanup_old_notifications.py` - Nuevo
- ✅ `backend/apps/notificaciones/management/commands/backup_database.py` - Nuevo
- ✅ `backend/apps/notificaciones/scheduler.py` - Nuevo
- ✅ `backend/apps/notificaciones/apps.py` - Actualizado
- ✅ `backend/apps/archivos/viewsets.py` - Actualizado
- ✅ `backend/tests/automation/test_automation.py` - Nuevo
- ✅ `backend/tests/automation/test_automation.sh` - Nuevo
- ✅ `scripts/run_automation_tests.sh` - Nuevo

### Documentación
- ✅ `AUTOMATIZACIONES.md` - Docs de automatizaciones
- ✅ `GESTION_ARCHIVOS_Y_TESTS.md` - Docs de gestión de archivos
- ✅ `TESTING_DOCKER_COMPOSE.md` - Este archivo

---

## ✨ Próximos Pasos

1. **Testing**:
   ```bash
   docker-compose exec backend python manage.py shell < tests/automation/test_automation.py
   ```

2. **Frontend**:
   - Acceder a `http://localhost:5173/admin/archivos`
   - Probar todas las funcionalidades

3. **Monitoring**:
   - Ver logs: `docker-compose logs -f backend`
   - Verificar BD: `docker-compose exec db mysql -u root -p`

4. **Producción**:
   - APScheduler se ejecuta automáticamente
   - Backups en `C:\Users\Usuario\Desktop\Backup_no_conformidades\`
   - Logs en application logs
