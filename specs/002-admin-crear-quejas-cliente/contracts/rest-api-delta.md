# REST API Contract Delta: Admin — Crear Quejas de Cliente

**Branch**: `002-admin-crear-quejas-cliente` | **Date**: 2026-06-16

**Scope**: Este documento describe **únicamente los cambios** al contrato REST de la especificación 001.
Para el contrato completo, ver [001-gestion-hallazgos/contracts/rest-api.md](../../001-gestion-hallazgos/contracts/rest-api.md).

---

## Endpoints modificados

### POST `/api/v1/hallazgos/`
Crear nuevo hallazgo.

**Auth required**: ADMIN, EMPLEADO o CLIENTE

#### Cambio en Request Body

Se agrega el campo opcional `cliente_asociado`:

```json
{
  "descripcion": "string",
  "ubicacion": "string",
  "tipo": "QUEJA_CLIENTE",
  "cliente_asociado": 42
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `descripcion` | string | Sí | Descripción del hallazgo |
| `ubicacion` | string | Sí | Ubicación donde ocurrió |
| `tipo` | string | Sí | `NO_CONFORMIDAD` / `OPORTUNIDAD_MEJORA` / `QUEJA_CLIENTE` |
| `cliente_asociado` | integer (user ID) | **Condicional** | Obligatorio si `creado_por` es ADMIN y `tipo = QUEJA_CLIENTE`. Ignorado para otros tipos. |

**Reglas de validación (server-side)**:

1. Si `creado_por` es `ADMIN` y `tipo = QUEJA_CLIENTE`:
   - `cliente_asociado` es obligatorio → **400** si ausente o null.
   - El usuario referenciado debe existir y tener `tipo = CLIENTE` → **400** si inválido.
2. Si `creado_por` es `CLIENTE` y `tipo = QUEJA_CLIENTE`:
   - `cliente_asociado` es ignorado en el request; el backend lo auto-rellena con `creado_por`.
3. Si `tipo != QUEJA_CLIENTE`:
   - `cliente_asociado` es ignorado aunque se envíe.

#### Cambio en Response Body

Se agrega `cliente_asociado` en todas las respuestas de detalle de `Hallazgo` (201 Created y 200 OK):

```json
{
  "id": 15,
  "descripcion": "El cliente reportó demoras en la entrega.",
  "ubicacion": "Depósito Central",
  "tipo": "QUEJA_CLIENTE",
  "estado": "APROBADO",
  "fecha_creacion": "2026-06-16",
  "creado_por": {
    "id": 1,
    "nombre": "Admin",
    "apellido": "Sistema",
    "tipo": "ADMIN"
  },
  "cliente_asociado": {
    "id": 42,
    "nombre": "Carlos",
    "apellido": "López",
    "tipo": "CLIENTE"
  },
  "responsables": []
}
```

Para hallazgos `NO_CONFORMIDAD` / `OPORTUNIDAD_MEJORA`, `cliente_asociado` se serializa como `null`.

**Response 201**: Hallazgo creado exitosamente.

**Response 400** (nuevos casos):
```json
{ "cliente_asociado": ["Este campo es obligatorio cuando el tipo es QUEJA_CLIENTE y el creador es un Administrador."] }
```
```json
{ "cliente_asociado": ["El usuario especificado no existe o no es de tipo CLIENTE."] }
```

**Response 403** (sin cambios): No autorizado para el tipo de hallazgo según el rol.

---

### GET `/api/v1/hallazgos/`
Listar hallazgos.

**Cambio**: La respuesta incluye `cliente_asociado` (null para tipos que no aplican) en cada ítem de la lista.

**Cambio en filtro para rol CLIENTE**: La consulta backend ahora filtra por `cliente_asociado = request.user` (anteriormente solo filtraba por `creado_por = request.user`). El cliente ve todas las quejas donde es el cliente asociado, independientemente de quién las creó.

---

### GET `/api/v1/hallazgos/{id}/`
Detalle de hallazgo.

**Cambio**: La respuesta incluye `cliente_asociado` (ver schema en POST arriba).

---

## Endpoints sin cambios

Todos los demás endpoints del contrato 001 (`/auth/`, `/usuarios/`, acciones de `Hallazgo`, `/archivos/`, etc.) no son afectados por esta feature.

---

## WebSocket (sin cambios)

Los consumers WebSocket (`ChatConsumer`, `NotificacionConsumer`) no se modifican. La notificación de nueva `QUEJA_CLIENTE` sigue el mismo mecanismo que spec 001, con la excepción de que el Admin creador es excluido del grupo de destinatarios (FR-007 de esta spec).
