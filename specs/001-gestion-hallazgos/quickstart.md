# Quickstart Validation Guide

**Branch**: `001-gestion-hallazgos` | **Date**: 2026-06-16

## Purpose

Este documento describe los escenarios de validación end-to-end que prueban que la feature funciona correctamente. No incluye código de implementación; para eso ver `tasks.md` (generado por `/speckit.tasks`).

**Referencias**:
- Modelo de datos: [data-model.md](data-model.md)
- Contratos REST: [contracts/rest-api.md](contracts/rest-api.md)
- Contratos WebSocket: [contracts/websocket.md](contracts/websocket.md)

---

## Prerequisites

1. Docker y Docker Compose instalados.
2. Repositorio clonado y `cd` en la raíz del proyecto.
3. Archivo `.env` configurado (copiar de `.env.example` y completar valores).

---

## Setup

```bash
# Levantar todos los servicios (MySQL, Redis, Django, React, Nginx)
docker-compose up --build

# En una nueva terminal: aplicar migraciones y crear superusuario Admin
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser_admin
# (el comando acepta --dni, --nombre, --apellido, --password como args)
```

**Verificación de infraestructura**:
- Django API disponible: `GET http://localhost/api/v1/` → `200 OK`
- Frontend disponible: `http://localhost/` → Página de login React
- WebSocket disponible: Se verifica en los escenarios de validación

---

## Validation Scenarios

---

### VS-01: Autenticación

**Objetivo**: Verificar FR-002 — Login con DNI y contraseña.

```bash
# Login como Admin (usar las credenciales creadas en Setup)
curl -X POST http://localhost/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"dni": 99999999, "password": "admin123"}'
```

**Expected**: `200 OK` con `access` y `refresh` tokens.

```bash
# Login con credenciales incorrectas
curl -X POST http://localhost/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"dni": 99999999, "password": "wrong"}'
```

**Expected**: `401 Unauthorized`.

---

### VS-02: Gestión de Usuarios

**Objetivo**: Verificar FR-001, FR-003 — Solo Admin crea usuarios; DNI único.

```bash
TOKEN="<access_token_admin>"

# Crear Empleado
curl -X POST http://localhost/api/v1/usuarios/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dni":11111111,"nombre":"Ana","apellido":"García","sexo":"F","email":"ana@empresa.com","password":"emp123","tipo":"EMPLEADO","sector":"Producción"}'
```

**Expected**: `201 Created`.

```bash
# Crear Empleado con DNI duplicado
curl -X POST http://localhost/api/v1/usuarios/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dni":11111111,"nombre":"Otro","apellido":"Usuario","sexo":"M","email":"otro@empresa.com","password":"pass","tipo":"EMPLEADO","sector":"IT"}'
```

**Expected**: `400 Bad Request` con error de DNI duplicado.

---

### VS-03: Registro y Aprobación de Hallazgo (US-1, P1)

**Objetivo**: Verificar FR-004, FR-006, FR-008, FR-009.

```bash
TOKEN_EMP="<access_token_empleado>"

# Empleado crea No Conformidad
curl -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN_EMP" \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Falla en proceso de soldadura","ubicacion":"Sector B","tipo":"NO_CONFORMIDAD"}'
```

**Expected**: `201 Created`, `estado: PENDIENTE`.

**Verificar notificación**: Conectar el Admin al WebSocket de notificaciones y confirmar recepción de `notificacion.nueva` en < 5 s (SC-001).

```bash
# Admin aprueba el hallazgo
curl -X PATCH http://localhost/api/v1/hallazgos/1/aprobar/ \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**Expected**: `200 OK`, `estado: APROBADO`.

```bash
# Admin asigna responsable
curl -X POST http://localhost/api/v1/hallazgos/1/responsables/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"responsable_id": <id_empleado>}'
```

**Expected**: `200 OK` con lista de responsables actualizada.

```bash
# Empleado intenta crear Queja de Cliente (debe fallar)
curl -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN_EMP" \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Queja test","ubicacion":"Externo","tipo":"QUEJA_CLIENTE"}'
```

**Expected**: `400 Bad Request`.

---

### VS-04: Queja de Cliente (US-2, P2)

**Objetivo**: Verificar FR-005, FR-007, FR-040 — Auto-aprobación de Quejas de Cliente y creación autoaprobada por Admin.

```bash
TOKEN_CLI="<access_token_cliente>"

curl -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN_CLI" \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Servicio deficiente","ubicacion":"Externo","tipo":"QUEJA_CLIENTE"}'
```

**Expected**: `201 Created`, `estado: APROBADO` (sin intervención del Admin — FR-007, SC-005).

```bash
TOKEN_ADMIN="<access_token_admin>"

curl -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Hallazgo cargado por admin","ubicacion":"Sector A","tipo":"NO_CONFORMIDAD"}'
```

**Expected**: `201 Created`, `estado: APROBADO` (sin pasar por flujo de aprobación manual del Admin — FR-040).

---

### VS-05: Gestión de Acciones y Cierre (US-3, P3)

**Objetivo**: Verificar FR-014–019, FR-022.

```bash
# Empleado actualiza Acción Inmediata
curl -X PATCH http://localhost/api/v1/hallazgos/1/acciones/1/ \
  -H "Authorization: Bearer $TOKEN_EMP" \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Corregir soldadura","fecha_inicio":"2026-06-17","fecha_fin":"2026-06-20"}'
```

**Expected**: `200 OK`, acción en `EN_PROGRESO`.

```bash
# Empleado adjunta archivo
curl -X POST http://localhost/api/v1/hallazgos/1/acciones/1/archivos/ \
  -H "Authorization: Bearer $TOKEN_EMP" \
  -F "archivo=@/ruta/a/evidencia.pdf"
```

**Expected**: `201 Created` con metadatos del archivo.

```bash
# Empleado solicita cierre
curl -X POST http://localhost/api/v1/hallazgos/1/acciones/1/solicitar-cierre/ \
  -H "Authorization: Bearer $TOKEN_EMP" \
  -H "Content-Type: application/json" \
  -d '{"observacion":"Corrección completada"}'
```

**Expected**: `201 Created`; acción en `SOLICITUD_CIERRE`; Admin recibe notificación push.

```bash
# Admin aprueba cierre
curl -X PATCH http://localhost/api/v1/solicitudes-cierre/1/aprobar/ \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**Expected**: `200 OK`; acción en `CERRADA`.

Repetir VS-05 para las otras 2 acciones (Correctiva y Verificación de Eficacia).

```bash
# Verificar cierre automático de Hallazgo (FR-022, SC-002)
curl -X GET http://localhost/api/v1/hallazgos/1/ \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**Expected**: `estado: CERRADO` — automático cuando las 3 acciones están `CERRADA`.

---

### VS-06: Chat Colaborativo (US-4, P4)

**Objetivo**: Verificar FR-011–013, SC-003.

**Setup**: Hallazgo con al menos 2 responsables asignados (Empleado A y Empleado B).

1. Conectar Empleado A: `ws://localhost/ws/chat/1/?token=<token_A>`  
   **Expected**: Conexión exitosa.

2. Conectar Empleado B: `ws://localhost/ws/chat/1/?token=<token_B>`  
   **Expected**: Conexión exitosa.

3. Empleado A envía `{"type":"chat.send","contenido":"Hola equipo"}`  
   **Expected**: Empleado B recibe `chat.message` con el mensaje en < 2 s.

4. Admin remueve Empleado B:
   ```bash
   curl -X DELETE http://localhost/api/v1/hallazgos/1/responsables/<id_B>/ \
     -H "Authorization: Bearer $TOKEN_ADMIN"
   ```
   **Expected**: `204 No Content`; Empleado B recibe `chat.participant_removed` y la conexión se cierra (SC-003 < 2 s).

5. Empleado B intenta reconectarse al chat:  
   **Expected**: Conexión rechazada con código `4003`.

---

### VS-07: Visibilidad por Rol

**Objetivo**: Verificar FR-023, FR-024, FR-025.

```bash
# Admin ve todos los hallazgos
curl -X GET http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN_ADMIN"
# Expected: Lista completa

# Empleado ve solo sus hallazgos asignados
curl -X GET http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN_EMP"
# Expected: Solo hallazgos donde es responsable

# Cliente ve solo sus Quejas de Cliente
curl -X GET http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN_CLI"
# Expected: Solo las quejas creadas por ese cliente
```

---

### VS-08: Flujo Completo End-to-End (SC-004)

**Objetivo**: Verificar SC-004 — Flujo completo en una sola sesión.

Ejecutar en secuencia: VS-03 → VS-05 (3 acciones) → verificar `estado: CERRADO`.

**Expected**: Sin errores del sistema en ningún paso.
