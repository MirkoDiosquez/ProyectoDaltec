# Automatizaciones para Producción

Este documento describe todas las automatizaciones implementadas para producción.

## 1. Limpieza de Notificaciones Antiguas

**Descripción**: Elimina automáticamente notificaciones que hayan sido leídas hace más de 15 días.

**Management Command**:
```bash
python manage.py cleanup_old_notifications
```

**Ejecución Automática**: 
- Se ejecuta diariamente a las 2 AM (hora del servidor)
- Configurado en `apps/notificaciones/scheduler.py`

**Función**: 
- Busca notificaciones con `leida=True` y `fecha_lectura < (ahora - 15 días)`
- Las elimina de la base de datos permanentemente

---

## 2. Backup de Base de Datos

**Descripción**: Crea un backup automático de la base de datos cada 15 días en formato .sql

**Management Command**:
```bash
python manage.py backup_database [--backup-dir PATH]
```

**Parámetros**:
- `--backup-dir` (opcional): Directorio donde guardar backups
  - Por defecto: `C:\Users\Usuario\Desktop\Backup_no_conformidades`

**Ejemplo de uso**:
```bash
# Con directorio personalizado
python manage.py backup_database --backup-dir "D:\Backups"
```

**Características**:
- Usa `mysqldump` para crear backups .sql
- Mantiene solo los 2 backups más recientes (últi y anterior)
- Elimina automáticamente backups antiguos para ahorrar espacio
- Nombre de archivo: `backup_<nombre_bd>_<YYYYMMDD_HHMMSS>.sql`

**Requisitos**:
- `mysqldump` debe estar instalado y en PATH
- Usuario MySQL debe tener permisos de lectura en la BD

**Ejecución Automática**:
- Se ejecuta cada 15 días a las 3 AM (hora del servidor)
- Configurado en `apps/notificaciones/scheduler.py`

---

## 3. Registro Histórico de Responsables

**Descripción**: Registra automáticamente todos los cambios de responsables en hallazgos.

**Modelo**: `HallazgoResponsableHistorial`

**Campos**:
- `hallazgo`: FK al hallazgo
- `responsable`: FK al usuario
- `fecha_asignacion`: Cuándo se asignó
- `fecha_remocion`: Cuándo se removió (NULL si aún es responsable)

**Funcionalidad Automática**:
- Cuando se asigna un responsable: crea registro con `fecha_asignacion = ahora`
- Cuando se remueve un responsable: actualiza registro con `fecha_remocion = ahora`

**Vistas de Admin**:
- Accessible en Django Admin bajo "Histórico de Responsables"
- Filtrable por hallazgo, responsable, fecha

---

## 4. Gestión de Archivos por Admin

**Descripción**: Permite a administradores descargar y eliminar archivos de cualquier sección.

**Endpoints API**:

### Listar todos los archivos
```
GET /api/v1/archivos/admin_files/
```
**Respuesta**:
```json
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
      "porque": null,
      "mensaje": null
    }
  ]
}
```

### Descargar archivo
```
GET /api/v1/archivos/{id}/download/
```
Descarga el archivo con su nombre original.

### Eliminar archivo individual
```
DELETE /api/v1/archivos/{id}/admin_delete/
```

### Eliminar múltiples archivos
```
POST /api/v1/archivos/admin_bulk_delete/
Content-Type: application/json

{
  "file_ids": [1, 2, 3, 4]
}
```

**Permiso**: Solo `is_admin=True` puede acceder a estos endpoints.

---

## 5. Instalación y Configuración

### Instalar APScheduler
```bash
pip install apscheduler
```

### Agregar a requirements
```
apscheduler>=3.10.0
```

### Configurar MySQL para backups
1. Asegurar que `mysqldump` está instalado:
   - **Windows**: Incluido con MySQL Server o MySQL Workbench
   - **Linux**: `sudo apt-get install mysql-client`

2. Verificar que MySQL está accesible:
   ```bash
   mysqldump --version
   ```

3. Configurar credenciales en `settings/production.py`:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'daltec_db',
           'USER': 'root',
           'PASSWORD': 'password',
           'HOST': 'localhost',
           'PORT': '3306',
       }
   }
   ```

### Crear directorio de backups
```bash
# Windows
mkdir C:\Users\Usuario\Desktop\Backup_no_conformidades

# Linux/Mac
mkdir -p ~/Backup_no_conformidades
chmod 755 ~/Backup_no_conformidades
```

### Ejecutar migraciones
```bash
python manage.py migrate hallazgos
```

---

## 6. Testing Local

Para probar las automatizaciones en desarrollo:

```bash
# Limpiar notificaciones manualmente
python manage.py cleanup_old_notifications

# Hacer backup manualmente
python manage.py backup_database

# El scheduler se ejecuta automáticamente cuando:
# python manage.py runserver
```

---

## 7. Monitoreo en Producción

Para asegurar que las automatizaciones se ejecuten correctamente:

### Opción 1: Celery Beat (Recomendado para producción)
```bash
# Instalar Celery
pip install celery redis

# Crear tasks.py con @periodic_task
# Ejecutar Celery Beat
celery -A config beat --loglevel=info
```

### Opción 2: Cron Jobs (Linux/Mac)
```bash
# Editar crontab
crontab -e

# Agregar:
0 2 * * * cd /path/to/backend && python manage.py cleanup_old_notifications
0 3 */15 * * cd /path/to/backend && python manage.py backup_database
```

### Opción 3: Task Scheduler (Windows)
1. Abrir "Task Scheduler"
2. Crear tarea para ejecutar:
   ```
   python manage.py cleanup_old_notifications
   ```
3. Programar para 2 AM diariamente
4. Crear otra tarea para backup cada 15 días a las 3 AM

---

## 8. Troubleshooting

### Error: "mysqldump command not found"
- **Solución**: Instalar MySQL Server o agregar mysqldump a PATH

### Error: "Access denied for user"
- **Solución**: Verificar credenciales en DATABASES en settings.py

### Scheduler no inicia
- **Solución**: Verificar que APScheduler esté instalado
- **Alternativa**: Usar Celery Beat o Cron jobs

### Backups no se crean
- **Solución**: Verificar permisos en el directorio de backups
- **Solución**: Ejecutar manualmente para ver errores específicos

---

## 9. Información Adicional

### Modelo HallazgoResponsableHistorial
Ubicación: `backend/apps/hallazgos/models.py`

```python
class HallazgoResponsableHistorial(models.Model):
    hallazgo = ForeignKey('Hallazgo', on_delete=CASCADE)
    responsable = ForeignKey(User, on_delete=PROTECT)
    fecha_asignacion = DateTimeField()
    fecha_remocion = DateTimeField(null=True, blank=True)
```

Query para auditar responsables de un hallazgo:
```python
from apps.hallazgos.models import HallazgoResponsableHistorial

# Ver todo el historial de un hallazgo
historial = HallazgoResponsableHistorial.objects.filter(
    hallazgo_id=10
).order_by('-fecha_asignacion')

for record in historial:
    estado = "Activo" if not record.fecha_remocion else "Removido"
    print(f"{record.responsable} - {estado}")
    print(f"  Asignado: {record.fecha_asignacion}")
    if record.fecha_remocion:
        print(f"  Removido: {record.fecha_remocion}")
```
