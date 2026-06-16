# Feature Specification: Admin — Crear Quejas de Cliente

**Feature Branch**: `002-admin-crear-quejas-cliente`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "el usuario admin debe poder crear quejas de cliente"

**Related spec**: [001-gestion-hallazgos/spec.md](../001-gestion-hallazgos/spec.md) — this feature extends FR-005 of that spec.

---

## Context

En la especificación 001, solo los usuarios de tipo **Cliente** pueden crear hallazgos de tipo `QUEJA_CLIENTE` (FR-005). Esta feature extiende ese comportamiento para que el **Administrador** también pueda registrar una Queja de Cliente, representando a un cliente que reporta un problema por un canal fuera del sistema (llamada telefónica, correo, presencia física, etc.).

---

## User Scenarios & Testing

### User Story 1 — Admin registra queja en nombre de un cliente (Priority: P1)

El Administrador recibe una queja de un cliente por un canal externo (teléfono, email, presencia) y necesita registrarla en el sistema para darle seguimiento con el mismo flujo que una queja ingresada directamente por el cliente.

**Why this priority**: Es el caso de uso central de la feature. Sin esto, quejas recibidas fuera del sistema no pueden ser trazadas.

**Independent Test**: Un Admin autenticado crea una `QUEJA_CLIENTE` indicando el cliente asociado → el hallazgo queda en estado `APROBADO` automáticamente → el Admin recibe la notificación → el hallazgo aparece en la lista del cliente asociado.

**Acceptance Scenarios**:

1. **Given** un Admin autenticado, **When** crea un hallazgo con tipo `QUEJA_CLIENTE` y especifica un cliente existente como asociado, **Then** el hallazgo se registra en estado `APROBADO` automáticamente (igual que cuando lo crea el propio cliente).
2. **Given** un Admin autenticado, **When** crea una queja sin especificar un cliente asociado, **Then** el sistema rechaza la operación con un mensaje de error indicando que el campo es obligatorio.
3. **Given** un Admin autenticado, **When** especifica un usuario que no es de tipo `CLIENTE` como cliente asociado, **Then** el sistema rechaza la operación con mensaje de error apropiado.
4. **Given** una queja creada por el Admin en nombre de un cliente, **When** el cliente asociado accede al sistema, **Then** puede ver esa queja en su lista de hallazgos.
5. **Given** un Admin autenticado, **When** crea una queja en nombre de un cliente, **Then** el Admin recibe la notificación de nueva queja (igual que cuando la crea el cliente directamente).

---

### User Story 2 — Trazabilidad: queja creada por Admin en nombre de cliente (Priority: P2)

El sistema debe dejar registro de que la queja fue ingresada por el Administrador en representación del cliente, para auditoría interna.

**Why this priority**: Necesidad de auditoría y transparencia; importante pero no bloquea el uso primario.

**Independent Test**: Ver el detalle de una queja creada por Admin → el campo `creado_por` muestra al Admin y el campo `cliente_asociado` muestra al cliente en cuyo nombre se creó.

**Acceptance Scenarios**:

1. **Given** una queja registrada por un Admin en nombre de un cliente, **When** se consulta el detalle del hallazgo, **Then** el campo `creado_por` refleja al Admin y el campo `cliente_asociado` refleja al cliente.
2. **Given** una queja registrada directamente por un Cliente, **When** se consulta el detalle, **Then** `creado_por` y `cliente_asociado` son el mismo usuario.

---

### Edge Cases

- ¿Qué ocurre si el Admin intenta crear una queja con tipo `NO_CONFORMIDAD` u `OPORTUNIDAD_MEJORA`? → Ya está permitido por FR-003/FR-004; no es afectado por esta feature.
- ¿Qué ocurre si el cliente asociado es desactivado después de que se creó la queja? → La queja permanece visible para el Admin; el cliente no puede acceder al sistema hasta ser reactivado.
- ¿Puede el Admin editar el `cliente_asociado` después de crear la queja? → No; es un dato inmutable una vez registrado (igual que `creado_por`).

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los Administradores crear hallazgos de tipo `QUEJA_CLIENTE`.
- **FR-002**: Cuando un Administrador crea una `QUEJA_CLIENTE`, DEBE especificar obligatoriamente un usuario de tipo `CLIENTE` como `cliente_asociado`.
- **FR-003**: Una `QUEJA_CLIENTE` creada por un Administrador DEBE registrarse automáticamente en estado `APROBADO`, sin requerir aprobación adicional (mismo comportamiento que FR-007 de la especificación 001).
- **FR-004**: El campo `cliente_asociado` DEBE ser inmutable una vez que la queja ha sido creada.
- **FR-005**: El campo `creado_por` del hallazgo DEBE registrar al Administrador que realizó el ingreso; el campo `cliente_asociado` DEBE registrar al cliente en cuyo nombre se registra.
- **FR-006**: Un Cliente DEBE poder ver una `QUEJA_CLIENTE` en su lista de hallazgos si es el `cliente_asociado` del hallazgo. El sistema garantiza que `cliente_asociado` siempre está poblado en toda `QUEJA_CLIENTE` (ver FR-012), por lo que esta es la única condición necesaria para la visibilidad.
- **FR-007**: Al crear una `QUEJA_CLIENTE`, el sistema DEBE notificar a los demás Administradores del sistema. El Admin que creó la queja NO debe recibir la notificación (ya está al tanto por haberla ingresado). Si solo existe un Admin y es el creador, no se envía ninguna notificación.
- **FR-008**: El sistema DEBE rechazar el intento de crear una `QUEJA_CLIENTE` si el usuario especificado como `cliente_asociado` no existe o no es de tipo `CLIENTE`.
- **FR-009**: Los Empleados NO DEBEN poder crear hallazgos de tipo `QUEJA_CLIENTE` (sin cambio respecto a FR-005 de especificación 001).
- **FR-011**: En la interfaz del Administrador, el campo `cliente_asociado` DEBE mostrarse únicamente cuando el tipo de hallazgo seleccionado es `QUEJA_CLIENTE`. Para los demás tipos, el campo debe estar oculto y el backend debe ignorarlo aunque sea enviado.
- **FR-012**: Al crear una `QUEJA_CLIENTE`, el sistema DEBE auto-rellenar `cliente_asociado` de la siguiente manera: si `creado_por` es un Cliente, `cliente_asociado = creado_por`; si `creado_por` es un Admin, `cliente_asociado` es el usuario de tipo CLIENTE especificado explícitamente. El campo `cliente_asociado` NUNCA puede quedar NULL en un hallazgo de tipo `QUEJA_CLIENTE`.
- **FR-010**: Al crear una `QUEJA_CLIENTE` (por Admin o por Cliente), el Chat del hallazgo DEBE crearse en la misma transacción de creación, dado que el estado `APROBADO` se establece en ese mismo momento.

### Key Entities

- **Hallazgo** (extendido): Se agrega el campo `cliente_asociado` (FK a usuario de tipo CLIENTE, nullable a nivel de BD para compatibilidad con hallazgos que no son `QUEJA_CLIENTE`, pero **siempre poblado** en toda `QUEJA_CLIENTE`). Cuando el creador es el propio Cliente, el sistema auto-rellena `cliente_asociado = creado_por`. Cuando el creador es un Admin, `cliente_asociado` es el Cliente especificado en el formulario.
- **CustomUser** (sin cambios): Referenciado tanto como `creado_por` (Admin) como `cliente_asociado` (Cliente).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de las `QUEJA_CLIENTE` creadas por un Administrador se registran en estado `APROBADO` de forma automática, sin acción adicional.
- **SC-002**: El 100% de las quejas creadas por un Admin en nombre de un cliente son visibles en la lista de hallazgos del cliente asociado.
- **SC-003**: El sistema rechaza el 100% de los intentos de crear una `QUEJA_CLIENTE` sin especificar un `cliente_asociado` válido cuando el creador es un Administrador.
- **SC-004**: El tiempo de registro de una queja por parte del Admin es equivalente al tiempo de registro por parte del Cliente (no introduce fricción adicional significativa).

---

## Clarifications

### Session 2026-06-16

- Q: Cuando el Admin crea una `QUEJA_CLIENTE` (que pasa directo a `APROBADO`), ¿en qué momento debe crearse el Chat asociado? → A: Al momento de la **creación** del hallazgo (porque el estado APROBADO se alcanza en la misma transacción).
- Q: Cuando el Admin crea una `QUEJA_CLIENTE`, ¿debe recibir él mismo la notificación de "nueva queja registrada"? → A: No; el Admin creador no recibe la notificación (ya está al tanto). Otros Admins del sistema sí la reciben.
- Q: En el formulario del Admin, ¿cómo debe comportarse el campo `cliente_asociado`? → A: Se muestra **solo cuando** el tipo seleccionado es `QUEJA_CLIENTE`; oculto para otros tipos.
- Q: Para las quejas creadas directamente por un Cliente, ¿cómo debe funcionar la visibilidad? → A: El cliente ve una queja si `creado_por = cliente` **O** `cliente_asociado = cliente` (lógica OR; `cliente_asociado` puede ser NULL para quejas ingresadas directamente).
- Q: Para quejas creadas directamente por un Cliente, ¿qué valor debe tener `cliente_asociado`? → A: El sistema **auto-rellena** `cliente_asociado = creado_por` cuando quien crea es un Cliente; nunca queda NULL en `QUEJA_CLIENTE`.

---

## Assumptions

1. **Un solo Admin por queja**: No se contempla la co-autoría; el `creado_por` es el único Admin que ingresa la queja.
2. **Notificación**: La notificación generada al crear la queja sigue el mismo mecanismo que FR-008 de la especificación 001 (notificación push al Admin). En un sistema con múltiples Admins, la notificación se envía al Admin creador (que ya está al tanto) y opcionalmente a otros Admins — este comportamiento multi-Admin queda fuera del alcance de esta feature.
3. **`cliente_asociado` nullable en BD solo para no-`QUEJA_CLIENTE`**: El campo es nullable a nivel de base de datos para que los hallazgos de tipo `NO_CONFORMIDAD` y `OPORTUNIDAD_MEJORA` no requieran este campo. Para toda `QUEJA_CLIENTE`, el campo siempre está poblado: si el creador es un Cliente, el sistema lo auto-rellena con `creado_por`; si el creador es un Admin, es el Cliente especificado en el formulario. La validación a nivel de aplicación garantiza que no exista ninguna `QUEJA_CLIENTE` con `cliente_asociado = NULL`.
4. **Sin interfaz de gestión de `cliente_asociado`**: No se agrega UI para reasignar o modificar el cliente asociado; el campo es de solo lectura después de la creación.
5. **Descripción, ubicación y tipo**: El Admin completa todos los campos de la queja (descripción, ubicación) en nombre del cliente; no hay campos adicionales específicos de esta feature más allá de `cliente_asociado`.
