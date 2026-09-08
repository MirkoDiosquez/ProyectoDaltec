# Información general del proyecto

## Propósito
ProyectoDaltec es un sistema de gestión de hallazgos, no conformidades, oportunidades de mejora y quejas de clientes. Su objetivo principal es centralizar la captura, revisión, aprobación y seguimiento de incidentes y mejoras dentro de una organización, asegurando trazabilidad, responsabilidades claras y cierre documentado.

## ¿Para qué sirve?
El sistema permite:
- Registrar hallazgos generados por empleados o clientes.
- Diferenciar tipos de hallazgo según su origen y gravedad.
- Asignar responsables y acciones correctivas.
- Validar y aprobar las propuestas por parte del administrador.
- Mantener comunicaciones internas con chat y notificaciones.
- Adjuntar archivos y evidencias para respaldar decisiones.
- Generar reportes y auditoría para seguimiento histórico.

## Funcionalidades principales

### 1) Gestión de hallazgos
El sistema administra hallazgos con estados como pendiente, aprobado, rechazado, en proceso y cerrado. Cada hallazgo puede incluir tareas, responsables, archivos y comentarios.

### 2) Acciones correctivas
Cada hallazgo puede tener múltiples acciones de seguimiento, como:
- Acción inmediata
- Acción correctiva
- Verificación de eficacia

Estas acciones permiten asignar responsables, controlar avances y solicitar cierre cuando se cumplieron los objetivos.

### 3) Autorización y roles
Se manejan distintos tipos de usuario:
- Administrador: gestiona usuarios, aprueba hallazgos, asigna responsables, valida cierres.
- Empleado: registra hallazgos, realiza cambios y trabaja en acciones asignadas.
- Cliente: registra quejas y consulta sus propios registros.

### 4) Chat y comunicación
Cada hallazgo cuenta con una sección de chat para coordinar tareas, aclarar dudas y dejar seguimiento entre usuarios del sistema.

### 5) Notificaciones
El sistema avisará a los actores relevantes cuando haya cambios, solicitudes, mensajes urgentes o aprobaciones pendientes.

### 6) Archivos y evidencia
Los usuarios pueden adjuntar documentos o archivos que respalden una acción o hallazgo. Esto ayuda a la trazabilidad, control documental y cierre de auditorías.

### 7) Reportes y análisis
Hay módulos para visualizar reportes, filtros y métricas que ayudan a entender tendencias, hallazgos críticos y cumplimiento de acciones.

## Usuarios del sistema

### Administrador
- Crea y administra usuarios.
- Revisa nuevos hallazgos.
- Aprueba o rechaza registros.
- Asigna responsables.
- Aprueba solicitudes de cierre.

### Empleado
- Registra hallazgos internos.
- Actualiza acciones.
- Adjunta documentación.
- Participa en el chat del hallazgo.

### Cliente
- Registra quejas de cliente.
- Consulta solo su propia información.

## Ciclo de vida típico de un hallazgo
1. Un usuario crea un hallazgo.
2. Se valida su tipo y origen.
3. El administrador revisa y aprueba o rechaza.
4. Se asignan responsables y acciones.
5. Se ejecutan tareas y se cargan evidencias.
6. Se solicita cierre de acciones.
7. El administrador aprueba el cierre.
8. El hallazgo queda cerrado cuando toda la estructura asociada está cerrada.

## Tecnología principal
- Frontend: React + Vite
- Backend: Django + Django REST Framework
- Base de datos: MySQL
- Comunicación en tiempo real: WebSockets / Channels
- Nginx para la capa web y proxy
- Redis como soporte de cache y colas

## Objetivo de negocio
El proyecto busca mejorar la calidad, trazabilidad y control interno de la organización, reduciendo la falta de visibilidad en procesos de mejora, no conformidades y relaciones con clientes.

## Backup y restauración del sistema



### Cómo funcionan
El proyecto incluye scripts para generar respaldos y restaurarlos con una lógica sencilla:

- El script de backup crea una copia comprimida de la base de datos con fecha y hora.
- Se guardan en la carpeta `backups/` del repositorio.
- La copia se genera usando `mysqldump` para exportar la estructura y datos de la base de datos.
- Además, el script valida que el archivo generado no esté corrupto antes de considerarlo válido.
- El sistema también limpia backups viejos para conservar solo los más recientes.

### Script de backup
Archivo principal:
- `scripts/backup_db.sh`

Su funcionamiento es:
1. leer las variables de entorno necesarias (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`)
2. crear la carpeta de backup si no existe
3. generar un archivo con nombre tipo `backup_YYYYMMDD_HHMMSS.sql.gz`
4. comprimir y validar la copia
5. conservar solo los backups más recientes según la política configurada

Ejemplo de uso:

```bash
MYSQL_HOST=localhost \
MYSQL_USER=root \
MYSQL_PASSWORD=tu_password \
MYSQL_DATABASE=daltec_db ./scripts/backup_db.sh
```

También puede recibir una ruta personalizada:

```bash
./scripts/backup_db.sh ./backups
```

### Restauración del último backup
Los scripts para recuperar datos son:
- `scripts/restore_latest_backup.ps1`
- `scripts/restore_latest_backup.bat`
- `scripts/RestaurarBackup.exe` (ejecutable de Windows para operar sin abrir la consola)

Estos scripts:
1. buscan el backup más reciente en la carpeta `backups/`
2. crean una copia de seguridad previa antes de restaurar (`pre_restore_...sql`)
3. eliminan la base actual y la recrean
4. importan el backup seleccionado
5. cargan los catálogos base del sistema
6. reinician los servicios afectados si es necesario

### Cómo operar la restauración desde Windows
Hay dos formas de hacerlo:

1. Desde PowerShell:

```powershell
./scripts/restore_latest_backup.ps1
```

2. Desde CMD o .bat:

```bat
scripts\restore_latest_backup.bat
```

3. Usando el ejecutable gráfico:

```text
Ejecutar RestaurarBackup.exe
```

Esto permite restaurar el backup sin escribir comandos en la consola, resultando más amigable para quienes no quieren interactuar con la terminal. El ejecutable ejecuta la misma lógica del script de restauración, solo que con una operación más simple y directa para usuarios de Windows.

### Seguridad antes de restaurar
Antes de restaurar un backup, el script pide confirmación para evitar una recuperación accidental. También crea un backup de prevención antes de reemplazar la base actual, para que siempre exista una copia de seguridad del estado anterior.

### Recomendaciones de uso
- Hacer backups antes de despliegues importantes.
- Guardar copias en un almacenamiento externo o en un medio seguro.
- Verificar que el último backup esté íntegro antes de usarlo.
- No restaurar una copia antigua sin revisar si el entorno de datos y catálogos coincide con la versión actual del sistema.
- Mantener la carpeta `backups/` con control de retención para evitar crecimiento excesivo.

### En resumen
Los backups en ProyectoDaltec son la base de la recuperación ante fallas. Se generan automáticamente con el script de backup y se restauran con los scripts de restauración, permitiendo volver a un estado anterior del sistema de manera controlada y segura.