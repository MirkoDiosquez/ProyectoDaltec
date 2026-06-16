# Implementation Plan: Admin — Crear Quejas de Cliente

**Branch**: `002-admin-crear-quejas-cliente` | **Date**: 2026-06-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-admin-crear-quejas-cliente/spec.md`

**Depends on**: `001-gestion-hallazgos` — extends `Hallazgo` model, `hallazgo_service`, `HallazgoViewSet`, `CrearHallazgoPage`.

## Summary

Extensión incremental del sistema 001: permite al Administrador registrar hallazgos de tipo `QUEJA_CLIENTE` en nombre de un cliente externo. El cambio de datos es mínimo (nuevo campo `cliente_asociado` en `Hallazgo`); la lógica de negocio se concentra en validación de rol en el serializer y auto-fill en el servicio. El Chat se crea en la misma transacción de creación (no en aprobación) para `QUEJA_CLIENTE`. Frontend: campo condicional en `CrearHallazgoPage` y actualización de la consulta de visibilidad del Cliente.

## Technical Context

**Language/Version**: Python 3.11 (backend), JavaScript / React 18 (frontend) — idéntico a spec 001.

**Primary Dependencies**: Django 4.2, Django REST Framework 3.x, djangorestframework-simplejwt, React 18, React Router 6, Axios — idéntico a spec 001.

**Storage**: MySQL 8.x (additive migration: 1 nullable FK column in `hallazgos_hallazgo` table).

**Testing**: pytest-django — unit tests para serializer y service; tests de integración para endpoint.

**Target Platform**: Linux server, Nginx → Daphne — idéntico a spec 001.

**Project Type**: Web service (REST API) + Web application (React SPA) — extensión incremental.

**Performance Goals**: Sin nuevos requisitos. Heredados de spec 001 (SC-001: notificaciones < 5 s).

**Constraints**: Additive-only: ninguna columna existente modificada; ninguna migración destructiva. `cliente_asociado` nullable en BD para compatibilidad con registros existentes (NO_CONFORMIDAD, OPORTUNIDAD_MEJORA). La validación NOT NULL para QUEJA_CLIENTE se aplica a nivel de aplicación, no de BD.

**Scale/Scope**: Mismo alcance que spec 001. Sin nuevas tablas; sin nuevos servicios de infraestructura.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Stack Tecnológico**: Feature extiende Django, React, MySQL, Redis — ninguna tecnología nueva.
- [x] **II. Prohibición de Hardcode**: Sin nuevas constantes hardcodeadas. La lógica de roles usa `UserTipo.CLIENTE` desde el modelo, no strings literales dispersos.
- [x] **III. Separación de Responsabilidades**: Validación del rol de `cliente_asociado` y auto-fill en `hallazgo_service.py` (Django). El frontend solo aplica la visibilidad condicional del campo; no valida roles.
- [x] **IV. API First**: Contrato REST documentado en `contracts/rest-api-delta.md` antes de implementar el frontend.
- [x] **V. Escalabilidad**: Cambio aditivo (1 FK nullable). Sin estado nuevo en Redis. Compatible con múltiples instancias.
- [x] **VI. Seguridad**: Validación server-side: `cliente_asociado` debe ser de tipo CLIENTE (FR-008); campo inmutable tras creación (FR-004); campo ignorado en backend si tipo ≠ QUEJA_CLIENTE (FR-011). JWT auth sin cambios.
- [x] **VII. Calidad del Código**: Extensión del serializer existente con `validate()` condicional (DRY). El servicio reutiliza `notificacion_service` existente. Sin duplicación.
- [x] **VIII. Observabilidad**: `creado_por` + `cliente_asociado` como campos de trazabilidad auditables. Las notificaciones existentes cubren el logging de acción (FR-007).
- [x] **IX. Compatibilidad de Infraestructura**: Migración aditiva exclusivamente. Sin nueva infraestructura.
- [x] **X. Regla Suprema**: Mantenibilidad primero — extensión del modelo existente es más simple que un modelo separado. Seguridad — validación server-side garantizada.
- [x] **XI. Configuración Dinámica**: Sin nuevas reglas de negocio hardcodeadas.

*Post-design re-check: identical result — no violations.*

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-crear-quejas-cliente/
├── plan.md              ← este archivo
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1 (delta sobre 001)
├── quickstart.md        ← Phase 1
├── contracts/
│   └── rest-api-delta.md ← Phase 1 (cambios al contrato 001)
└── tasks.md             ← Phase 2 (/speckit.tasks)
```

### Source Code (archivos afectados)

```text
backend/
├── apps/
│   └── hallazgos/
│       ├── models.py          ← agregar campo cliente_asociado a Hallazgo
│       ├── migrations/
│       │   └── 000X_add_cliente_asociado.py  ← nueva migración aditiva
│       ├── serializers.py     ← validación condicional cliente_asociado
│       └── services.py        ← auto-fill + chat creation on create
└── apps/notificaciones/
    └── services.py            ← excluir Admin creador de notificación (FR-007)

frontend/
└── src/
    └── pages/
        └── hallazgos/
            └── CrearHallazgoPage.jsx  ← campo condicional cliente_asociado
```

## Complexity Tracking

*No violations — no entries required.*
