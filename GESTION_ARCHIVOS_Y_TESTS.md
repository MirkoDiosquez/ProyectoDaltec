# Gestión de Archivos y Automatizaciones

## 🎯 Características Implementadas

### 1. Frontend: Gestión de Archivos para Admins
**Ubicación**: `/admin/archivos`

**Funcionalidades**:
- ✓ Ver todos los archivos cargados en el sistema
- ✓ Filtrar por tipo de sección (Hallazgos, Chat, 5-Why)
- ✓ Descargar archivos individuales
- ✓ Eliminar archivos individuales
- ✓ Eliminar múltiples archivos (bulk delete)
- ✓ Ver información del archivo (nombre, tipo, tamaño, usuario, fecha)

**Acceso**: Solo administradores

### 2. API Endpoints para Admin

#### Listar todos los archivos
```
GET /api/v1/archivos/admin_files/

Response:
{
  "total": 42,
  "files": [
    {
      "id": 1,
      "nombre": "documento.pdf",
      "tipo_mime": "application/pdf",
      "tamanio": 1024000,
      "fecha_carga": "2026-07-14T10:30:00Z",
      "cargado_por": {
        "id": 5,
        "nombre": "Juan Pérez"
      },
      "hallazgo": 10,
      "mensaje": null,
      "porque": null
    }
  ]
}
```

#### Descargar archivo
```
GET /api/v1/archivos/{id}/download/
```

#### Eliminar archivo individual
```
DELETE /api/v1/archivos/{id}/admin_delete/

Response:
{
  "detail": "Archivo \"documento.pdf\" eliminado correctamente.",
  "deleted_id": 1
}
```

#### Eliminar múltiples archivos
```
POST /api/v1/archivos/admin_bulk_delete/

Request Body:
{
  "file_ids": [1, 2, 3, 4]
}

Response:
{
  "detail": "4 archivo(s) eliminado(s) correctamente",
  "deleted_count": 4
}
```

---

## 🧪 Testing de Automatizaciones

### Opción 1: Ejecutar desde Docker Compose

```bash
# Desde el directorio raíz del proyecto
docker-compose exec backend python manage.py shell < tests/automation/test_automation.py
```

### Opción 2: Usar script helper

```bash
bash scripts/run_automation_tests.sh
```

### Opción 3: Comandos individuales en Docker

```bash
# Limpiar notificaciones antiguas
docker-compose exec backend python manage.py cleanup_old_notifications

# Crear backup de base de datos
docker-compose exec backend python manage.py backup_database

# Ver histórico de responsables
docker-compose exec backend python manage.py shell
# Luego en la shell:
from apps.hallazgos.models import HallazgoResponsableHistorial
for record in HallazgoResponsableHistorial.objects.all()[:5]:
    print(record)
```

---

## 📋 Qué Prueban los Tests

### Test 1: Cleanup de Notificaciones Antiguas
```
✓ Crea notificación antigua (leída hace 20 días)
✓ Crea notificación reciente (leída hace 5 días)
✓ Ejecuta cleanup
✓ Verifica que notificación antigua fue eliminada
✓ Verifica que notificación reciente se mantiene
```

### Test 2: Backup de Base de Datos
```
✓ Ejecuta comando backup_database
✓ Verifica que archivo .sql fue creado
✓ Verifica que solo 2 backups se mantienen
✓ Muestra información de backups (tamaño, fecha)
```

### Test 3: Histórico de Responsables
```
✓ Crea hallazgo de prueba
✓ Crea usuarios de prueba (admin, empleado)
✓ Asigna responsable y verifica historia
✓ Remueve responsable y verifica actualización
✓ Muestra auditoría completa
```

---

## 🚀 Ejecutar Tests en Producción

### Con Docker Compose (Recomendado)

**Paso 1**: Asegurar que los servicios están corriendo
```bash
docker-compose up -d
docker-compose ps
```

**Paso 2**: Ejecutar pruebas
```bash
docker-compose exec backend python manage.py shell < tests/automation/test_automation.py
```

**Salida esperada**:
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

## 📁 Ubicación de Backups

En Docker, los backups se guardan en:
```
/tmp/test_backups/  (durante tests)
C:\Users\Usuario\Desktop\Backup_no_conformidades\  (en producción - Windows)
~/Backup_no_conformidades/  (en producción - Linux)
```

Naming pattern:
```
backup_<database_name>_<YYYYMMDD_HHMMSS>.sql
Example: backup_daltec_db_20260714_150000.sql
```

---

## 🔍 Verificar Datos Históricos

### Ver todos los cambios de responsables

```bash
docker-compose exec backend python manage.py shell
```

```python
from apps.hallazgos.models import HallazgoResponsableHistorial

# Ver todo el historial
for record in HallazgoResponsableHistorial.objects.all().order_by('-fecha_asignacion'):
    print(f"{record.responsable} → Hallazgo {record.hallazgo_id}")
    print(f"  Assigned: {record.fecha_asignacion}")
    if record.fecha_remocion:
        print(f"  Removed: {record.fecha_remocion}")

# Ver historial de un hallazgo específico
hallazgo_id = 10
historial = HallazgoResponsableHistorial.objects.filter(hallazgo_id=hallazgo_id)
for record in historial:
    print(record)

# Ver responsables activos (sin remoción)
activos = HallazgoResponsableHistorial.objects.filter(fecha_remocion__isnull=True)
print(f"Active assignments: {activos.count()}")
```

---

## 🛠️ Instalaciones Requeridas

### Para ejecutar en Docker:
```bash
# Ya está configurado en requirements/production.txt
apscheduler>=3.10.0
```

### Para backup en local (sin Docker):
```bash
# MySQL debe estar instalado
mysql --version
mysqldump --version
```

---

## 📝 Logs de Automatizaciones

Si APScheduler está habilitado, los logs aparecerán en:
```
docker-compose logs backend | grep -i "cleanup\|backup"
```

---

## ✅ Checklist de Validación

- [ ] Frontend carga sin errores
- [ ] Ruta `/admin/archivos` es accesible para admins
- [ ] Tabla de archivos muestra todos los archivos
- [ ] Filtros funcionan correctamente
- [ ] Descargar archivo funciona
- [ ] Eliminar archivo individual funciona
- [ ] Eliminar múltiples archivos funciona
- [ ] Tests de automatización pasan (3/3)
- [ ] Backup se crea en directorio correcto
- [ ] Histórico de responsables se registra
- [ ] APScheduler inicia sin errores (en producción)

---

## 🚨 Troubleshooting

### Error: "Solo administradores pueden acceder a esta vista"
**Solución**: Asegurar que el usuario tenga `is_admin=True`

### Error: "No file IDs provided"
**Solución**: Seleccionar al menos un archivo antes de hacer bulk delete

### Error: "mysqldump command not found"
**Solución**: En Docker ya está incluido. En local, instalar MySQL Server

### Backup no se crea
**Solución**: Verificar permisos en directorio de backup
```bash
# En Docker
docker-compose exec backend ls -la /tmp/test_backups/

# En local
ls -la C:\Users\Usuario\Desktop\Backup_no_conformidades\
```

### Test de responsables falla
**Solución**: Asegurar que existen usuarios admin y empleado en BD
```bash
docker-compose exec backend python manage.py shell
# En shell:
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(is_admin=True).exists()  # Debe ser True
```
