# Tasks: Admin — Crear Quejas de Cliente

**Input**: Design documents from `specs/002-admin-crear-quejas-cliente/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/rest-api-delta.md](contracts/rest-api-delta.md) · [quickstart.md](quickstart.md)

**Depends on**: `001-gestion-hallazgos` fully implemented (Phase 2 + Phase 3 complete).

**Stack**: Python 3.11 · Django 4.2 + DRF · React 18 · MySQL 8 · Docker Compose

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US2 maps to user stories from spec.md
- No story label = Foundational phase

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Additive model change and service refactoring that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Add `cliente_asociado` nullable FK field to `Hallazgo` model pointing to `CustomUser` with `on_delete=SET_NULL`, `related_name="quejas_asociadas"` in `backend/apps/hallazgos/models.py`
- [ ] T002 Create additive Django migration `backend/apps/hallazgos/migrations/000X_add_cliente_asociado_to_hallazgo.py` for the new `cliente_asociado` field
- [ ] T003 [P] Extract private `_crear_chat(hallazgo)` helper from `hallazgo_service.aprobar()` and call it in `hallazgo_service.crear_hallazgo()` when `tipo == QUEJA_CLIENTE` (Chat created in same transaction as creation per FR-010) in `backend/apps/hallazgos/services.py`
- [ ] T004 [P] Add `exclude_user_id=None` optional parameter to `notificacion_service.crear_y_enviar()` and filter out that user from notification recipients in `backend/apps/notificaciones/services.py`

**Checkpoint**: Migration applied; `Hallazgo` model has `cliente_asociado`; `_crear_chat()` extracted; notification service supports exclusion.

---

## Phase 2: User Story 1 — Admin registra queja en nombre de un cliente (Priority: P1) 🎯 MVP

**Goal**: El Admin puede crear una `QUEJA_CLIENTE` especificando un cliente existente; el hallazgo queda en `APROBADO` automáticamente con Chat creado, y el cliente asociado puede verlo en su lista.

**Independent Test**: VS-01 (Admin crea queja con `cliente_asociado`), VS-02 (falta campo → 400), VS-03 (empleado como cliente → 400), VS-04 (cliente crea queja directo → auto-fill), VS-05 (cliente ve quejas de Admin). Ver [quickstart.md](quickstart.md).

### Implementation for User Story 1

- [ ] T005 [US1] Add `cliente_asociado` field to `HallazgoCreateSerializer` with conditional validation in `validate()`: obligatorio si `creado_por.is_admin and tipo == QUEJA_CLIENTE`; validar que referencia un usuario `tipo=CLIENTE` existente; campo ignored para otros tipos in `backend/apps/hallazgos/serializers.py`
- [ ] T006 [US1] Update `hallazgo_service.crear_hallazgo()` to: (a) auto-fill `cliente_asociado = user` when `user.is_cliente and tipo == QUEJA_CLIENTE` (FR-012); (b) pass `exclude_user_id=user.pk` to `notificacion_service` when `user.is_admin` (FR-007) in `backend/apps/hallazgos/services.py`
- [ ] T007 [US1] Update `HallazgoSerializer` (detail/list) to include `cliente_asociado` as nested read-only field (serialize `id`, `nombre`, `apellido`, `tipo`; null for non-QUEJA_CLIENTE) in `backend/apps/hallazgos/serializers.py`
- [ ] T008 [P] [US1] Make `cliente_asociado` immutable on update: override `update()` in `HallazgoSerializer` (or `HallazgoViewSet.partial_update`) to strip `cliente_asociado` from incoming data silently (FR-004) in `backend/apps/hallazgos/serializers.py`
- [ ] T009 [US1] Update Hallazgo list query for CLIENTE role to filter by `cliente_asociado=request.user` (replacing previous `creado_por=request.user` filter) in `backend/apps/hallazgos/views.py`
- [ ] T010 [US1] Add `cliente_asociado` as a read-only field exposed in `GET /api/v1/hallazgos/` list response items (update `HallazgoListSerializer` if separate from detail) in `backend/apps/hallazgos/serializers.py`

**Checkpoint**: `POST /api/v1/hallazgos/` acepta `cliente_asociado` con validación completa; `GET /api/v1/hallazgos/` muestra `cliente_asociado`; Cliente ve quejas ingresadas por Admin en su lista (VS-01 a VS-05 pasan).

---

## Phase 3: User Story 2 — Trazabilidad (Priority: P2)

**Goal**: El detalle de cualquier hallazgo muestra claramente quién lo creó (`creado_por`) y cuál es el cliente asociado (`cliente_asociado`), permitiendo auditoría completa.

**Independent Test**: VS-06 (detalle muestra ambos campos separados); VS-07 (Admin creador no recibe notificación propia); VS-08 (`cliente_asociado` inmutable). Ver [quickstart.md](quickstart.md).

### Implementation for User Story 2

- [ ] T011 [P] [US2] Update `CrearHallazgoPage` in `frontend/src/pages/hallazgos/CrearHallazgoPage.jsx`: add conditional `cliente_asociado` selector field (dropdown of users with `tipo=CLIENTE`) that appears only when `tipo === "QUEJA_CLIENTE"` is selected; send field in POST body only when visible (FR-011)
- [ ] T012 [P] [US2] Add `GET /api/v1/usuarios/?tipo=CLIENTE` client-side API call in `frontend/src/api/usuarios.js` (or equivalent) to populate the `cliente_asociado` selector in `CrearHallazgoPage`
- [ ] T013 [US2] Update `HallazgoDetailPage` in `frontend/src/pages/hallazgos/HallazgoDetailPage.jsx` to display `cliente_asociado` field in the detail view (show `nombre apellido (tipo)` when populated; hide row when null)

**Checkpoint**: Formulario Admin muestra selector de cliente al elegir `QUEJA_CLIENTE`; detalle muestra `creado_por` y `cliente_asociado` separados; VS-06 a VS-08 pasan.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Add `cliente_asociado` filter to Admin Hallazgo list (`?cliente_asociado=<id>`) so Admin can filter quejas by client in `backend/apps/hallazgos/views.py`
- [ ] T015 [P] Register `cliente_asociado` in `HallazgoAdmin` in `backend/apps/hallazgos/admin.py` so it is visible and searchable in Django admin

---

## Dependencies

```
T001 → T002                    (migration depends on model field)
T001 → T005, T006, T007, T008  (serializer/service depend on model)
T003 → T006                    (service update depends on helper extraction)
T004 → T006                    (service update depends on notification param)
T005 → T009, T010              (view/list depend on serializer)
T006 → T009                    (view uses updated service)
T011 → T012                    (selector needs client list API)
T007 → T013                    (detail page depends on serializer field)
```

## Parallel Execution Examples

**After T001+T002 complete**, these can run in parallel:
- T003 + T004 (independent service files)
- T005 + T008 (serializer additions, non-conflicting if split carefully — or sequential in same file)

**After T003+T004+T005 complete**, these can run in parallel:
- T006 (service), T007 (serializer detail), T010 (serializer list)

**After T005+T007 complete**, these can run in parallel:
- T009 (backend view), T011 (frontend form), T012 (frontend API client)

## Implementation Strategy

**MVP (US1 only — T001–T010)**: Entrega la capacidad core: Admin crea `QUEJA_CLIENTE` con cliente asociado, visibilidad correcta para el cliente. No requiere cambios en el frontend del formulario — puede probarse íntegramente via `curl` (quickstart VS-01 a VS-05).

**Full (US1 + US2 — T001–T013)**: Agrega la UI condicional en el formulario y la visualización de trazabilidad en el detalle.

**Polish (T014–T015)**: Mejoras de usabilidad para el Admin.
