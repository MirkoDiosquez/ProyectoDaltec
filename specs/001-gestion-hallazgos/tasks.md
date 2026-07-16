# Tasks: Sistema de Gestión de Hallazgos y Acciones Correctivas

**Input**: Design documents from `/specs/001-gestion-hallazgos/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/rest-api.md](contracts/rest-api.md) · [contracts/websocket.md](contracts/websocket.md)

**Stack**: Python 3.11 · Django 4.2 + DRF + Channels · React 18 · MySQL 8 · Redis 7 · Nginx · Docker Compose

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5 maps to user stories from spec.md
- No story label = Setup or Foundational phase

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding and containerization — no business logic.

- [X] T001 Create `docker-compose.yml` with services: mysql, redis, backend (Daphne), frontend (build), nginx
- [X] T002 Create `.env.example` with all required variables: `DB_*`, `REDIS_URL`, `SECRET_KEY`, `JWT_ACCESS_LIFETIME`, `JWT_REFRESH_LIFETIME`, `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
- [X] T003 [P] Create `nginx/nginx.conf` routing `/api/` and `/ws/` to Daphne; all other routes to React static build
- [X] T004 Initialize Django project in `backend/` with package `config/` containing `settings/base.py`, `settings/development.py`, `settings/production.py`, `urls.py`, `asgi.py`, `wsgi.py`, `manage.py`
- [X] T005 [P] Initialize React project in `frontend/` with React 18, React Router 6, Axios; output `package.json`, `src/` scaffold
- [X] T006 [P] Create `backend/requirements/base.txt`, `development.txt`, `production.txt` with all dependencies (Django 4.2, DRF, simplejwt, Channels 4, channels-redis, django-cors-headers, Pillow, mysqlclient, pytest-django)

**Checkpoint**: `docker-compose up --build` starts all services; Django `/api/` reachable; React dev server reachable

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core authentication, user model, and Django infrastructure that MUST be complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Implement `CustomUser` model extending `AbstractUser` with `dni` (unique BigIntegerField), `sexo`, `tipo` (ADMIN/EMPLEADO/CLIENTE); `EmpleadoProfile` (sector) and `ClienteProfile` (empresa choices) as OneToOne profiles in `backend/apps/users/models.py`
- [X] T008 Configure `backend/config/settings/base.py`: `AUTH_USER_MODEL`, MySQL `DATABASES`, `CHANNEL_LAYERS` (Redis), `INSTALLED_APPS` (all apps + channels + corsheaders + rest_framework + simplejwt), `REST_FRAMEWORK` defaults, `SIMPLE_JWT` settings from env, `MEDIA_ROOT`/`MEDIA_URL`
- [X] T009 [P] Configure `backend/config/asgi.py` with `ProtocolTypeRouter`: HTTP → Django WSGI app; WebSocket → `TokenAuthMiddlewareStack` wrapping `URLRouter` (routes registered later per consumer)
- [X] T010 [P] Implement `TokenAuthMiddleware` for WebSocket JWT validation in `backend/apps/users/middleware.py`; sets `scope["user"]` from `?token=` query param; closes with code 4001 if invalid
- [X] T011 Create initial Django migration for `CustomUser`, `EmpleadoProfile`, `ClienteProfile` in `backend/apps/users/migrations/0001_initial.py`
- [X] T012 Implement JWT auth views: `LoginView` (POST `/api/v1/auth/login/`), `TokenRefreshView`, `LogoutView` (blacklist refresh token) in `backend/apps/users/views.py`; register in `backend/config/urls.py`
- [X] T013 [P] Implement frontend `AuthContext` with `login()`, `logout()`, `refreshToken()`, JWT storage (access in memory, refresh in HttpOnly cookie) in `frontend/src/context/AuthContext.jsx`
- [X] T014 [P] Implement frontend Axios instance with request interceptor (attach access token) and response interceptor (silent refresh on 401) in `frontend/src/api/client.js`
- [X] T015 Configure React Router with `ProtectedRoute` component (redirect to login if unauthenticated) and `RoleRoute` component (redirect if wrong role) in `frontend/src/App.jsx`
- [X] T016 Implement login page with DNI + password form in `frontend/src/pages/auth/LoginPage.jsx`
- [X] T017 [P] Create Django management command `createsuperuser_admin` that creates an initial ADMIN user from CLI args (`--dni`, `--nombre`, `--apellido`, `--password`) in `backend/apps/users/management/commands/createsuperuser_admin.py`

**Checkpoint**: `POST /api/v1/auth/login/` returns JWT tokens; protected frontend routes redirect unauthenticated users to login

---

## Phase 3: User Story 1 — Registro y Aprobación de Hallazgo (Priority: P1) 🎯 MVP

**Goal**: Un Empleado registra una No Conformidad u Oportunidad de Mejora; el Admin recibe notificación en tiempo real, y puede aprobar, rechazar o reclasificar el hallazgo y asignar responsables.

**Independent Test**: Crear Empleado vía `createsuperuser_admin` equivalent, crear hallazgo → verificar `estado: PENDIENTE` y notificación push al Admin → Admin aprueba → Admin asigna responsable. Ver quickstart.md VS-03.

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement `Hallazgo` model with `tipo` (NO_CONFORMIDAD/OPORTUNIDAD_MEJORA/QUEJA_CLIENTE), `estado` (PENDIENTE/APROBADO/RECHAZADO/CERRADO), `creado_por` FK, `responsables` M2M through `HallazgoResponsable`; `post_save` signal that auto-creates 3 `Accion` instances (INMEDIATA, CORRECTIVA, VERIFICACION_EFICACIA) in state PENDIENTE when Hallazgo is created in `backend/apps/hallazgos/models.py`
- [X] T019 [P] [US1] Implement `Accion` model with `tipo` (INMEDIATA/CORRECTIVA/VERIFICACION_EFICACIA), `estado` (PENDIENTE/EN_PROGRESO/SOLICITUD_CIERRE/CERRADA), `descripcion`, `fecha_inicio`, `fecha_fin`, `hallazgo` FK; UNIQUE constraint on `(hallazgo, tipo)` in `backend/apps/acciones/models.py`
- [X] T020 [P] [US1] Implement `Archivo` model with `nombre`, `ruta` (FileField), `tipo_mime`, `tamanio`, `fecha_carga` (auto), `cargado_por` FK in `backend/apps/archivos/models.py`
- [X] T021 [P] [US1] Implement `Notificacion` model with `titulo`, `mensaje`, `fecha` (auto), `leida` (default False), `destinatario` FK, `hallazgo_relacionado` FK (nullable) in `backend/apps/notificaciones/models.py`
- [X] T022 [US1] Create migrations for Hallazgo, Accion, Archivo, Notificacion in their respective `migrations/0001_initial.py` files
- [X] T023 [US1] Implement `hallazgo_service.py` with functions: `crear_hallazgo(user, data)` (validates tipo by role, sets estado, triggers notifications), `aprobar(hallazgo, admin)`, `rechazar(hallazgo, admin)`, `reclasificar(hallazgo, admin, nuevo_tipo)`, `asignar_responsable(hallazgo, admin, user)` (idempotent with info warning), `remover_responsable(hallazgo, admin, user)` in `backend/apps/hallazgos/services.py`
- [X] T024 [US1] Implement `notificacion_service.py` with `crear_y_enviar(destinatario, titulo, mensaje, hallazgo)` that saves `Notificacion` and pushes `notificacion.nueva` event via `channel_layer.group_send` to `notificaciones_admin_{user_id}` in `backend/apps/notificaciones/services.py`
- [X] T025 [US1] Implement `NotificacionConsumer` WebSocket consumer (ADMIN-only, group `notificaciones_admin_{user_id}`, handles `notificacion.nueva` type) in `backend/apps/notificaciones/consumers.py`; register route `ws/notificaciones/` in `backend/config/asgi.py`
- [X] T026 [US1] Implement `HallazgoSerializer` (list/detail), `HallazgoCreateSerializer`, `ResponsableSerializer` with role-based field validation in `backend/apps/hallazgos/serializers.py`
- [X] T027 [US1] Implement `HallazgoViewSet` with actions: `create`, `list` (filtered by role per FR-023/024/025), `retrieve`, `aprobar`, `rechazar`, `reclasificar`, `add_responsable`, `remove_responsable`, `upload_archivo` in `backend/apps/hallazgos/views.py`
- [X] T028 [US1] Register Hallazgo router and action URLs in `backend/apps/hallazgos/urls.py`; include in `backend/config/urls.py` under `/api/v1/hallazgos/`
- [X] T029 [P] [US1] Implement frontend Hallazgo API client functions (createHallazgo, listHallazgos, getHallazgo, aprobar, rechazar, reclasificar, addResponsable, removeResponsable, uploadArchivo) in `frontend/src/api/hallazgos.js`
- [X] T030 [US1] Implement `NotificacionContext` with WebSocket connection to `/ws/notificaciones/` and unread badge state in `frontend/src/context/NotificacionContext.jsx`
- [X] T031 [US1] Implement `HallazgoListPage` (role-filtered list with tipo/estado badges; "Crear Hallazgo" button for Empleados) in `frontend/src/pages/hallazgos/HallazgoListPage.jsx`
- [X] T032 [US1] Implement `CrearHallazgoPage` (form with descripcion, ubicacion, tipo; Empleados see NO_CONFORMIDAD and OPORTUNIDAD_MEJORA only) in `frontend/src/pages/hallazgos/CrearHallazgoPage.jsx`
- [X] T033 [US1] Implement `HallazgoDetailPage` (detail view; Admin actions: aprobar/rechazar/reclasificar buttons, responsables panel with add/remove, archivos upload) in `frontend/src/pages/hallazgos/HallazgoDetailPage.jsx`

**Checkpoint**: Empleado crea hallazgo → `estado: PENDIENTE`; Admin recibe notificación WebSocket < 5 s (SC-001); Admin aprueba → `estado: APROBADO`; Admin asigna responsable → lista actualizada

---

## Phase 4: User Story 2 — Queja de Cliente (Priority: P2)

**Goal**: Un Cliente (o un Admin actuando con capacidades de usuario normal) registra una Queja de Cliente que queda automáticamente en estado APROBADO y notifica al Admin.

**Independent Test**: Cliente crea queja → verificar `estado: APROBADO` sin intervención del Admin (SC-005); Admin recibe notificación; Admin puede asignar responsables. Admin crea hallazgo (cualquier tipo) → verificar `estado: APROBADO` automático. Ver quickstart.md VS-04.

### Implementation for User Story 2

- [X] T034 [P] [US2] Implement role-based permission class `HallazgoTipoPermission` that restricts `QUEJA_CLIENTE` to Clientes and `NO_CONFORMIDAD`/`OPORTUNIDAD_MEJORA` to Empleados, with bypass for Admin (FR-004, FR-005) in `backend/apps/hallazgos/permissions.py`; apply to `HallazgoViewSet.create`
- [X] T035 [US2] Extend `hallazgo_service.crear_hallazgo()` in `backend/apps/hallazgos/services.py` to set `estado = APROBADO` automatically when `tipo = QUEJA_CLIENTE` (FR-007); reuse existing notificacion_service for Admin notification
- [X] T036 [P] [US2] Implement `CrearQuejaPage` for Cliente users (form with only descripcion and ubicacion; tipo fixed to QUEJA_CLIENTE) in `frontend/src/pages/hallazgos/CrearQuejaPage.jsx`; add route in `frontend/src/App.jsx`
- [X] T081 [US2] Extend `hallazgo_service.crear_hallazgo()` in `backend/apps/hallazgos/services.py` so any hallazgo created by `ADMIN` is auto-approved (`estado = APROBADO`) without requiring normal-user authorization flow (FR-006, FR-040)
- [X] T082 [P] [US2] Update frontend routes and creation screens in `frontend/src/App.jsx`, `frontend/src/pages/hallazgos/CrearHallazgoPage.jsx`, and `frontend/src/pages/hallazgos/CrearQuejaPage.jsx` so `ADMIN` can use normal-user creation flows (empleado/cliente) in addition to admin-only actions (FR-040)
- [X] T083 [US2] Update quickstart validation in `specs/001-gestion-hallazgos/quickstart.md` with an Admin-created hallazgo scenario that verifies immediate `estado: APROBADO` (FR-006, FR-040)

**Checkpoint**: Cliente crea queja → `estado: APROBADO` inmediato (SC-005); Empleado intentando crear QUEJA_CLIENTE recibe 400; Admin ve queja en listado y puede asignar responsables sin aprobar; Admin crea hallazgo y queda autoaprobado.

---

## Phase 5: User Story 3 — Gestión de Acciones y Cierre (Priority: P3)

**Goal**: Un Empleado responsable actualiza las acciones del hallazgo, adjunta evidencias y solicita el cierre. El Admin aprueba o rechaza. Cuando las 3 acciones están CERRADA, el Hallazgo pasa a CERRADO automáticamente.

**Independent Test**: Con hallazgo APROBADO y responsable asignado, Empleado actualiza Acción Inmediata → adjunta archivo → solicita cierre → Admin aprueba → repetir para Correctiva y Verificación → verificar `Hallazgo.estado = CERRADO`. Ver quickstart.md VS-05.

### Implementation for User Story 3

- [X] T037 [P] [US3] Implement `SolicitudCierreAccion` model with `accion` FK, `solicitante` FK, `administrador` FK (nullable), `fecha_solicitud` (auto), `observacion`, `estado` (PENDIENTE/APROBADA/RECHAZADA); UNIQUE constraint on active pending request per accion in `backend/apps/acciones/models.py`; create migration
- [X] T038 [US3] Implement `accion_service.py` with: `actualizar(accion, empleado, data)` (validates responsable, transitions PENDIENTE→EN_PROGRESO), `adjuntar_archivo(accion, empleado, file)`, `solicitar_cierre(accion, empleado, observacion)` (validates EN_PROGRESO state, FR-030 guard for CERRADA), `aprobar_cierre(solicitud, admin)` (sets accion CERRADA, notifies empleado, triggers hallazgo auto-close check), `rechazar_cierre(solicitud, admin, observacion)` (sets accion EN_PROGRESO, notifies empleado) in `backend/apps/acciones/services.py`
- [X] T039 [US3] Implement `post_save` signal on `Accion` that checks if all 3 acciones of parent `Hallazgo` are CERRADA and transitions `Hallazgo` to CERRADO (FR-022) in `backend/apps/acciones/signals.py`; register in `backend/apps/acciones/apps.py`
- [X] T040 [US3] Extend `notificacion_service.py` to send employee notifications for: `accion_cierre_aprobado`, `accion_cierre_rechazado` events (FR-033c) in `backend/apps/notificaciones/services.py`
- [X] T041 [US3] Implement `AccionSerializer`, `AccionUpdateSerializer`, `SolicitudCierreSerializer` in `backend/apps/acciones/serializers.py`
- [X] T042 [US3] Implement `AccionViewSet` (retrieve, partial_update, upload_archivo, solicitar_cierre actions) and `SolicitudCierreViewSet` (aprobar, rechazar actions) in `backend/apps/acciones/views.py`
- [X] T043 [US3] Register Accion and SolicitudCierre URLs in `backend/apps/acciones/urls.py`; include in `backend/config/urls.py` under `/api/v1/hallazgos/{hallazgo_id}/acciones/` and `/api/v1/solicitudes-cierre/`
- [X] T044 [P] [US3] Implement file upload validator (MIME type whitelist from settings, file size from settings) in `backend/apps/archivos/validators.py`; apply to all upload endpoints
- [X] T045 [P] [US3] Implement frontend Acciones + SolicitudCierre API client in `frontend/src/api/acciones.js`
- [X] T046 [US3] Implement `AccionDetailPage` (editable descripcion/fechas, file upload, solicitar cierre button with state guards) in `frontend/src/pages/acciones/AccionDetailPage.jsx`
- [X] T047 [US3] Implement `SolicitudCierreAdminView` component (inline on HallazgoDetailPage or standalone; aprobar/rechazar con observacion) in `frontend/src/pages/acciones/SolicitudCierreAdminView.jsx`

**Checkpoint**: Empleado completa las 3 acciones → cada una pasa por EN_PROGRESO → SOLICITUD_CIERRE → CERRADA; al cerrar la tercera, `Hallazgo.estado` cambia a CERRADO automáticamente (SC-002, SC-004)

---

## Phase 6: User Story 4 — Comunicación mediante Chat (Priority: P4)

**Goal**: Los responsables de un hallazgo intercambian mensajes en tiempo real. Al remover un responsable, pierde acceso inmediatamente. El Admin puede leer todos los chats pero no enviar mensajes.

**Independent Test**: Dos responsables conectados al chat del hallazgo envían mensajes; Admin puede leer; al remover un responsable vía API, recibe evento WebSocket de expulsión y no puede reconectarse. Ver quickstart.md VS-06.

### Implementation for User Story 4

- [X] T048 [P] [US4] Implement `Chat` model (OneToOne con Hallazgo, participantes M2M con CustomUser) and `Mensaje` model (chat FK, autor FK, contenido, fecha_hora auto) in `backend/apps/chat/models.py`; create migration; auto-create Chat when Hallazgo is created (extend signal in `backend/apps/hallazgos/models.py`)
- [X] T049 [US4] Implement `ChatConsumer` WebSocket consumer: connect (validate participante or Admin read-only), receive (`chat.send` type → save Mensaje → broadcast `chat.message` to group `chat_{hallazgo_id}`), disconnect; group `chat_{hallazgo_id}`; handle `chat.participant_removed` event type (sends removal notice and closes connection with code 4003) in `backend/apps/chat/consumers.py`
- [X] T050 [US4] Register `ChatConsumer` route `ws/chat/{hallazgo_id}/` in `backend/config/asgi.py` URLRouter
- [X] T051 [US4] Extend `hallazgo_service.asignar_responsable()` to add user to `Chat.participantes`; extend `remover_responsable()` to remove from `Chat.participantes` and send `chat.participant_removed` via channel_layer (FR-013, SC-003) in `backend/apps/hallazgos/services.py`
- [X] T052 [US4] Implement `ChatSerializer`, `MensajeSerializer` in `backend/apps/chat/serializers.py`
- [X] T053 [US4] Implement `ChatView` (GET `/api/v1/hallazgos/{id}/chat/` — returns participantes + mensajes históricos; permission: participante vigente OR Admin) in `backend/apps/chat/views.py`; register in `backend/apps/chat/urls.py` and `backend/config/urls.py`
- [X] T054 [P] [US4] Implement frontend Chat API + WebSocket client (connectChat, sendMessage, disconnect) in `frontend/src/api/chat.js`
- [X] T055 [US4] Implement `ChatPage` (message history list, live WebSocket feed, message input disabled for Admin read-only mode) in `frontend/src/pages/chat/ChatPage.jsx`; link from `HallazgoDetailPage`

**Checkpoint**: Dos responsables ven mensajes en tiempo real; Admin ve el chat pero input está deshabilitado; al remover responsable, su conexión se cierra en < 2 s (SC-003) y no puede reconectarse

---

## Phase 7: User Story 5 — Gestión de Usuarios por el Administrador (Priority: P5)

**Goal**: El Administrador crea usuarios (Empleado o Cliente) con DNI, nombre y contraseña. DNI duplicado es rechazado. Solo el Admin puede crear usuarios.

**Independent Test**: Admin crea Empleado con DNI/contraseña → usuario puede hacer login con esas credenciales; Admin intenta DNI duplicado → 400; Empleado intenta crear usuario → 403. Ver quickstart.md VS-02.

### Implementation for User Story 5

- [X] T056 [P] [US5] Implement `UserCreateSerializer` (validates DNI unique, hashes password, creates `EmpleadoProfile` or `ClienteProfile` based on tipo) and `UserListSerializer` in `backend/apps/users/serializers.py`
- [X] T057 [US5] Implement `UserViewSet` with `create` (Admin-only), `list` (Admin-only), `me` (authenticated user profile) actions in `backend/apps/users/views.py`; register in `backend/apps/users/urls.py` and `backend/config/urls.py` under `/api/v1/usuarios/`
- [X] T058 [P] [US5] Implement frontend Users API client (createUser, listUsers, getMe) in `frontend/src/api/users.js`
- [X] T059 [US5] Implement `CrearUsuarioPage` (Admin-only; form with DNI, nombre, apellido, sexo, email, password, tipo selector; sector field when tipo=EMPLEADO; empresa selector when tipo=CLIENTE) in `frontend/src/pages/users/CrearUsuarioPage.jsx`; add Admin-only route in `frontend/src/App.jsx`

**Checkpoint**: Admin crea usuarios vía UI; usuarios creados pueden autenticarse; DNI duplicado muestra error en form; non-Admin recibe 403 on API call

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Observability, security hardening, employee notifications, and end-to-end validation.

- [X] T060 [P] Configure structured logging in `backend/config/settings/base.py` `LOGGING` dict: formatters (json-style), handlers (console + file), loggers for all apps at INFO level; add log calls for critical actions (hallazgo create/approve/reject, accion cierre, responsable assign/remove)
- [X] T061 [P] Implement `NotificacionViewSet` (list filtered by `request.user`, mark-read action) in `backend/apps/notificaciones/views.py`; register in `backend/config/urls.py` under `/api/v1/notificaciones/`
- [X] T062 [P] Extend `notificacion_service.py` to send employee notifications for: hallazgo aprobado/rechazado (to creador, FR-033a), asignado/removido como responsable (FR-033b) in `backend/apps/notificaciones/services.py`
- [X] T063 [P] Implement `NotificacionesPage` (unread list with mark-read; badge count fed from NotificacionContext) in `frontend/src/pages/hallazgos/NotificacionesPage.jsx`; link from main nav
- [X] T064 [P] Add HTTPS redirect and security headers (HSTS, X-Frame-Options, X-Content-Type-Options) in `nginx/nginx.conf` and `backend/config/settings/production.py`
- [ ] T065 Run all quickstart.md validation scenarios (VS-01 through VS-08) end-to-end and confirm SC-001 through SC-006 pass
- [X] T084 [P] Implement `HomeDashboardPage` as default authenticated home with role-aware summary cards and quick actions in `frontend/src/pages/home/HomeDashboardPage.jsx`; set as `/` route in `frontend/src/App.jsx`
- [X] T085 [P] Implement reusable `MainNavbar` with links by role (Home, Hallazgos, Quejas, Usuarios, Notificaciones) and integrate in app layout in `frontend/src/components/navigation/MainNavbar.jsx` and `frontend/src/App.jsx`

**Checkpoint**: All 8 quickstart scenarios pass; structured logs visible in container output; employee notifications delivered; HTTPS enforced in production config; authenticated users land on dashboard home and can navigate through sections using the navbar

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)          → no dependencies; start immediately
Phase 2 (Foundational)   → depends on Phase 1 completion; BLOCKS all user stories
Phase 3 (US1 — P1)       → depends on Phase 2 completion
Phase 4 (US2 — P2)       → depends on Phase 3 completion (reuses Hallazgo model + services)
Phase 5 (US3 — P3)       → depends on Phase 3 completion (Hallazgo + Accion models needed)
Phase 6 (US4 — P4)       → depends on Phase 3 completion (Hallazgo + responsables needed)
Phase 7 (US5 — P5)       → depends on Phase 2 completion (only needs CustomUser)
Phase 8 (Polish)         → depends on all desired user stories being complete
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|----------------------|
| US1 (P1) | Phase 2 | — (first story) |
| US2 (P2) | US1 (Hallazgo model + services) | US3 backend after T019 |
| US3 (P3) | US1 (Hallazgo + Accion models) | US4 after T018/T019 |
| US4 (P4) | US1 (Hallazgo + responsables) | US3 frontend after T043 |
| US5 (P5) | Phase 2 (CustomUser only) | US1–US4 fully |

### Within Each Phase

- Tasks marked `[P]` within the same phase can run in parallel
- Models before services before views before URLs
- Backend before frontend for each story
- `T038` (accion_service) depends on `T037` (SolicitudCierreAccion model)
- `T049` (ChatConsumer) depends on `T048` (Chat + Mensaje models)
- `T051` (extend hallazgo_service for chat) depends on `T048` and `T023`

---

## Parallel Execution Examples

### Phase 2 — Parallel opportunities
```
┌──────────────────────────────────────────────────────┐
│ Sequential (blocking)    │ Parallel (independent)     │
├──────────────────────────┼────────────────────────────┤
│ T007 CustomUser model    │ T009 asgi.py config        │
│ T008 settings/base.py   │ T010 TokenAuthMiddleware   │
│ T011 migration          │ T013 AuthContext (FE)      │
│ T012 JWT views          │ T014 Axios client (FE)     │
│ T015 React Router       │ T017 mgmt command          │
│ T016 LoginPage          │                            │
└──────────────────────────┴────────────────────────────┘
```

### Phase 3 — Parallel opportunities (US1)
```
┌─────────────────────────────────────────────────────────────────┐
│ T018 Hallazgo model [P]  │ T019 Accion model [P]               │
│ T020 Archivo model [P]   │ T021 Notificacion model [P]         │
└────────────────────────────────────────────────────────────────-┘
        ↓ T022 All migrations (after all models)
        ↓ T023 hallazgo_service (depends on T018)
        ↓ T024 notificacion_service (depends on T021)
┌──────────────────────────────────────────────────────┐
│ T025 NotificacionConsumer│ T026 HallazgoSerializer   │
└──────────────────────────┴────────────────────────────┘
        ↓ T027 HallazgoViewSet (depends on T026 + T023)
┌──────────────────────────────────────────────────────┐
│ T029 hallazgos.js API [P]│ T030 NotificacionContext  │
└──────────────────────────┴────────────────────────────┘
```

---

## Phase 8: Bugfixes & Improvements

**Purpose**: Resolución de bugs encontrados en desarrollo y mejoras de UX/DX.

- [X] T099 [BUGFIX] Mejorar `ResponsableSerializer` en `backend/apps/hallazgos/serializers.py` para aceptar tanto ID (pk) como DNI del usuario. Cambiar `validate_id()` para: 1) intentar búsqueda por pk primero; 2) si falla, intentar por dni; 3) error descriptivo si ambas fallan. Permite que usuarios usen DNI en lugar de memorizar IDs de BD. **Impacto**: Endpoint `/api/v1/hallazgos/{id}/add_responsable/` ahora acepta `{"id": <DNI_o_ID>}` indistintamente.

**Checkpoint**: POST a `add_responsable/` con DNI retorna 200 (no 400); usuarios no necesitan conocer IDs de BD

---

## Implementation Strategy (MVP First)

**MVP Scope** — Phase 1 + Phase 2 + Phase 3 (US1):
> Empleado registra hallazgo → Admin recibe notificación en tiempo real → Admin aprueba/rechaza/reclasifica → Admin asigna responsables. This covers the primary flow and all P1 acceptance scenarios.

**Increment 2** — Phase 4 (US2): Add Cliente queja flow (small delta on existing code).

**Increment 3** — Phase 5 (US3): Add full acciones lifecycle + auto-close. This is the most complex increment.

**Increment 4** — Phase 6 (US4): Add real-time chat (new WebSocket consumer, isolated from other flows).

**Increment 5** — Phase 7 (US5): Add Admin user management UI (purely additive, no changes to existing flows).

**Increment 6** — Phase 9 (Feature 002): Admin can create QUEJA_CLIENTE on behalf of a client (additive — 1 FK field + service extension). Depends on Phase 4 (US2 QUEJA_CLIENTE) and Phase 6 (US4 Chat) being complete.

---

## Phase 9: Feature 002 — Admin Crear Quejas de Cliente

**Purpose**: Extends QUEJA_CLIENTE flow so Admins can register complaints on behalf of external clients (phone/email/in-person). Depends on T018, T023, T024, T026, T027, T032, T033, T048 being complete.

**Spec**: [002-admin-crear-quejas-cliente/spec.md](../002-admin-crear-quejas-cliente/spec.md)

- [X] T066 Add `cliente_asociado` nullable FK (→ `CustomUser`, `on_delete=SET_NULL`, `related_name="quejas_asociadas"`) to `Hallazgo` model in `backend/apps/hallazgos/models.py`
- [X] T067 Create additive migration `backend/apps/hallazgos/migrations/000X_add_cliente_asociado_to_hallazgo.py` for the new field (depends on T066)
- [X] T068 [P] Extract private `_crear_chat(hallazgo)` helper from `hallazgo_service.aprobar()` and call it inside `crear_hallazgo()` when `tipo == QUEJA_CLIENTE` (Chat created in same transaction as creation, per spec 002 FR-010) in `backend/apps/hallazgos/services.py` — depends on T023 + T048
- [X] T069 [P] Add `exclude_user_id=None` optional parameter to `notificacion_service.crear_y_enviar()` and filter out that user from notification recipients in `backend/apps/notificaciones/services.py` (depends on T024)
- [X] T070 Add `cliente_asociado` field to `HallazgoCreateSerializer` with `validate()` cross-field rule: obligatorio si `creado_por.is_admin and tipo == QUEJA_CLIENTE`; must reference existing user with `tipo=CLIENTE`; ignored for other types in `backend/apps/hallazgos/serializers.py` (depends on T026 + T066)
- [X] T071 Update `hallazgo_service.crear_hallazgo()` to: (a) auto-fill `cliente_asociado = user` when `user.is_cliente and tipo == QUEJA_CLIENTE` (spec 002 FR-012); (b) pass `exclude_user_id=user.pk` to `notificacion_service` when `user.is_admin` (spec 002 FR-007) in `backend/apps/hallazgos/services.py` (depends on T068 + T069)
- [X] T072 [P] Update `HallazgoSerializer` (detail + list) to include `cliente_asociado` as nested read-only field (`id`, `nombre`, `apellido`, `tipo`; null for non-QUEJA_CLIENTE) in `backend/apps/hallazgos/serializers.py` (depends on T026 + T066)
- [X] T073 [P] Make `cliente_asociado` immutable on update: strip field in `HallazgoSerializer.update()` or `HallazgoViewSet.partial_update` so any PATCH/PUT attempt is silently ignored (spec 002 FR-004) in `backend/apps/hallazgos/serializers.py`
- [X] T074 Update Hallazgo list queryset for CLIENTE role to filter by `cliente_asociado=request.user` (replacing previous `creado_por=request.user`) in `backend/apps/hallazgos/views.py` (depends on T027 + T066)
- [X] T075 [US2-002] Update `CrearHallazgoPage` to show conditional `cliente_asociado` selector (dropdown of users with `tipo=CLIENTE`) only when `tipo === "QUEJA_CLIENTE"` is selected; send field in POST body only when visible in `frontend/src/pages/hallazgos/CrearHallazgoPage.jsx` (depends on T032)
- [X] T076 [P] [US2-002] Add `GET /api/v1/usuarios/?tipo=CLIENTE` API call in `frontend/src/api/usuarios.js` to populate the `cliente_asociado` selector (depends on T057)
- [X] T077 [US2-002] Update `HallazgoDetailPage` to display `cliente_asociado` field when populated (show `nombre apellido (CLIENTE)`; hide row when null) in `frontend/src/pages/hallazgos/HallazgoDetailPage.jsx` (depends on T033)
- [X] T078 [P] Add `?cliente_asociado=<id>` query filter to Admin Hallazgo list so Admin can filter by client in `backend/apps/hallazgos/views.py`
- [X] T079 [P] Register `cliente_asociado` in `HallazgoAdmin` in `backend/apps/hallazgos/admin.py` (list_display, search_fields, list_filter)
- [ ] T080 Verify quickstart scenarios VS-01–VS-08 from `specs/002-admin-crear-quejas-cliente/quickstart.md` pass end-to-end

**Checkpoint**: Admin crea QUEJA_CLIENTE con `cliente_asociado`; queja pasa a APROBADO con Chat creado en la misma transacción; cliente asociado ve la queja en su lista; Admin creador no recibe la propia notificación

**Increment 6** — Phase 8: Polish, observability, employee notifications, production hardening.

---

## Format Validation

All tasks follow the required checklist format: ✅

- `- [ ] TXXX Description with file path` (Setup/Foundational — no story label)
- `- [ ] TXXX [P] Description with file path` (parallelizable, no story)
- `- [ ] TXXX [P] [USX] Description with file path` (parallelizable, with story)
- `- [ ] TXXX [USX] Description with file path` (story, sequential)

Every task includes an exact file path. No task is missing a checkbox, ID, or file path.
