# Data Model: Admin — Crear Quejas de Cliente

**Branch**: `002-admin-crear-quejas-cliente` | **Date**: 2026-06-16

**Scope**: Este documento describe **únicamente los cambios** respecto al modelo de la especificación 001.
Para el modelo completo, ver [001-gestion-hallazgos/data-model.md](../001-gestion-hallazgos/data-model.md).

---

## Delta: Modelo `Hallazgo`

### Campo agregado: `cliente_asociado`

| Campo               | Tipo                     | Restricciones                                                            |
|---------------------|--------------------------|--------------------------------------------------------------------------|
| `cliente_asociado`  | ForeignKey → CustomUser  | NULL en BD (compatible con NO_CONFORMIDAD y OPORTUNIDAD_MEJORA); `on_delete=SET_NULL`; `related_name="quejas_asociadas"` |

**Reglas de validación (nivel de aplicación)**:

| Condición | Regla |
|-----------|-------|
| `tipo == QUEJA_CLIENTE` y `creado_por.is_admin` | `cliente_asociado` es **obligatorio**; debe ser un usuario existente con `tipo = CLIENTE` |
| `tipo == QUEJA_CLIENTE` y `creado_por.is_cliente` | `cliente_asociado` se **auto-rellena** con `creado_por` en el servicio |
| `tipo != QUEJA_CLIENTE` | `cliente_asociado` es ignorado; se almacena como NULL |
| Post-creación | `cliente_asociado` es **inmutable** — cualquier intento de modificarlo se rechaza |

**`on_delete = SET_NULL`**: Si el usuario Cliente asociado es eliminado del sistema, la queja no se elimina; `cliente_asociado` pasa a NULL. La queja sigue siendo visible para el Admin.

---

## ER Diagram (delta)

```
CustomUser (tipo=CLIENTE)
     │
     │ cliente_asociado (0..1 FK, nullable)
     ▼
  Hallazgo ─── [tipo = QUEJA_CLIENTE]
     │
     │ creado_por (FK, NOT NULL)
     ▼
CustomUser (tipo=ADMIN o CLIENTE)
```

- Para una `QUEJA_CLIENTE` creada por Admin: `creado_por` = Admin, `cliente_asociado` = Cliente.
- Para una `QUEJA_CLIENTE` creada por Cliente: `creado_por` = Cliente, `cliente_asociado` = mismo Cliente.
- Para `NO_CONFORMIDAD` / `OPORTUNIDAD_MEJORA`: `cliente_asociado` = NULL.

---

## Tabla de migración

| Operación | Tipo | SQL equivalente |
|-----------|------|-----------------|
| Agregar columna `cliente_asociado_id` a `hallazgos_hallazgo` | Aditiva | `ALTER TABLE hallazgos_hallazgo ADD COLUMN cliente_asociado_id BIGINT NULL REFERENCES users_customuser(id) ON DELETE SET NULL` |
| Agregar índice en `cliente_asociado_id` | Aditiva | Generado automáticamente por Django FK |

**Impacto en datos existentes**: Ninguno. Todos los registros existentes quedan con `cliente_asociado = NULL`.

---

## Entidades sin cambios

Las siguientes entidades de spec 001 no se modifican en esta feature:

`CustomUser`, `EmpleadoProfile`, `ClienteProfile`, `Accion`, `Archivo`, `Notificacion`, `Chat`, `Mensaje`, `HallazgoResponsable`
