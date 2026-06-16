# Research: Admin — Crear Quejas de Cliente

**Branch**: `002-admin-crear-quejas-cliente` | **Date**: 2026-06-16

## Decision Log

---

### R-001: Validación Condicional en DRF Serializer (`cliente_asociado` obligatorio solo para Admin)

**Decision**: Usar el método `validate()` del serializer DRF para aplicar la regla "si el usuario autenticado es Admin y el tipo es QUEJA_CLIENTE, entonces `cliente_asociado` es obligatorio".

**Rationale**: `validate()` tiene acceso a todos los campos validados simultáneamente y al `self.context["request"].user`, lo que permite expresar la regla cruzada tipo-rol en un solo lugar. Alternativamente se podría usar `validate_cliente_asociado()` pero no tiene acceso directo al campo `tipo` validado. `validate()` es el método correcto para validaciones cross-field en DRF.

**Alternatives considered**:
- Validación en la view (ViewSet): Acopla la regla de negocio a la capa HTTP. Rechazado (viola Principio III).
- Validación en el modelo (`clean()`): `clean()` no tiene contexto del usuario autenticado. Rechazado.
- Dos serializers separados (AdminQuejaSerializer, ClienteQuejaSerializer): Duplica campos comunes. Rechazado (DRY — Principio VII).

---

### R-002: Auto-fill de `cliente_asociado` cuando el creador es un Cliente

**Decision**: El auto-fill se aplica en la capa de servicio (`hallazgo_service.crear_hallazgo`), no en el serializer ni en el modelo.

**Rationale**: El servicio ya recibe `user` y `data` validada. Agregar `data["cliente_asociado"] = user` cuando `user.is_cliente and data["tipo"] == QUEJA_CLIENTE` mantiene la regla en la capa de dominio (Principio III). El serializer no necesita conocer la regla de auto-fill, solo validar los datos recibidos. El modelo tampoco es el lugar correcto para lógica que depende del usuario autenticado.

**Alternatives considered**:
- `pre_save` signal en el modelo: Las signals no tienen contexto del usuario autenticado. Rechazado.
- Serializer `create()`: Mezcla responsabilidades de la capa de presentación con reglas de negocio. Rechazado (Principio III).

---

### R-003: Creación de Chat en la misma transacción que el Hallazgo para QUEJA_CLIENTE

**Decision**: En `hallazgo_service.crear_hallazgo`, detectar si `tipo == QUEJA_CLIENTE` y, en ese caso, ejecutar la lógica de creación de Chat (normalmente disparada en `aprobar()`) dentro de la misma transacción atómica.

**Rationale**: La spec 001 FR-011 establece que el Chat se crea en la aprobación. Para `QUEJA_CLIENTE` la aprobación es inmediata (mismo instante de creación). La clarificación de spec 002 (Q1) confirma que el Chat debe crearse en la misma transacción. La solución más limpia es llamar internamente `_crear_chat(hallazgo)` — función privada extraída del método `aprobar()` — para reutilizar la lógica sin duplicarla (DRY).

**Alternatives considered**:
- Signal `post_save` con condición: Las signals ejecutan fuera de la transacción atómica del `save()` por defecto; requiere `transaction.on_commit()` para garantía, lo que hace el Chat asíncrono respecto al request. Rechazado (la spec requiere simultaneidad).
- Llamar `aprobar(hallazgo, admin)` desde `crear_hallazgo`: Invocar `aprobar()` reenviaría la notificación de "aprobación" además de la de "nueva queja". Duplicación de notificaciones. Rechazado.

---

### R-004: Estrategia de Migración (campo nullable aditivo)

**Decision**: Migración aditiva simple — `ALTER TABLE hallazgos_hallazgo ADD COLUMN cliente_asociado_id BIGINT NULL REFERENCES users_customuser(id)`.

**Rationale**: El campo es nullable para no afectar registros existentes. Django genera la migración automáticamente con `makemigrations`. La migración es reversible (puede revertirse con `migrate 001 000X`). No requiere `RunPython` ni transformación de datos.

**Alternatives considered**:
- Campo NOT NULL con `default=None`: Contradictorio — NOT NULL no puede tener default NULL en Django sin `RunPython`. Rechazado.
- Nueva tabla separada `HallazgoClienteAsociado`: Over-engineering para un solo campo. Rechazado.

---

### R-005: Exclusión del Admin creador en la notificación (FR-007)

**Decision**: En `notificacion_service.crear_y_enviar()`, agregar un parámetro opcional `exclude_user_id` que se omite del grupo de destinatarios. El servicio existente ya itera sobre todos los Admins para enviar notificaciones WebSocket; se agrega un filtro `exclude(pk=exclude_user_id)` en la query de destinatarios.

**Rationale**: Cambio mínimo y backward-compatible: el parámetro es opcional (`exclude_user_id=None`), por lo que todas las llamadas existentes al servicio funcionan sin modificación. Principio VII (DRY) — reutiliza el mecanismo existente.

**Alternatives considered**:
- Nuevo método `crear_y_enviar_sin_creador()`: Duplica la lógica del método existente. Rechazado.
- Filtrado en el caller (hallazgo_service): La responsabilidad de a quién notificar pertenece al servicio de notificaciones. Rechazado (Principio III).
