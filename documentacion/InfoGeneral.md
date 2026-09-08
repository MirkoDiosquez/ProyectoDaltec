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
