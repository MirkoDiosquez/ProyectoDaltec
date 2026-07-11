# Tasks: Mejoras al Sistema de Gestión de Hallazgos

**Input**: Design documents from `/specs/003-mejoras-hallazgos/` (spec.md, plan.md, research.md, data-model.md, contracts/rest-api.md, contracts/websocket.md, quickstart.md)

**Feature Branch**: `003-mejoras-hallazgos`

**Date**: 2026-07-05 | **Last updated**: 2026-07-07

**Status**: In Progress — Migration debt corrected (see Phase 0)

---

## Overview

This task list implements 8 user stories (P1–P8) extending the hallazgos management system with sector classification, external contact data, 5-why analysis, file preview/download, chat attachments, responsible party management, change request workflow, and categorized notifications.

**MVP Scope**: User Stories 1–3 (sector classification, external contact, 5-why analysis)  
**Timeline**: ~25–32 days (1 full-time dev, phases in sequence)  
**Parallelization**: Within each user story, models and services can run in parallel; viewsets/serializers depend on models.

> **⚠️ 2026-07-07 — Deuda Técnica Detectada**: Analysis (speckit.analyze) found 3 apps with no `migrations/` folder and 5 apps with unapplied migrations. Phase 0 was added to correct this before continuing with user story implementation. Tasks T002, T020, T021 were incorrectly marked `[X]`; corrected below.

---

## Phase 0: Corrección de Deuda Técnica — Migraciones Faltantes

**Purpose**: Crear y aplicar todas las migraciones que fueron marcadas como completas prematuramente. Sin esta fase, los modelos de `analisis_cinco_porques`, `contacto_externo` y `solicitud_cambio_responsable` no tienen tablas en BD, y los campos nuevos en `hallazgos`, `archivos`, `notificaciones`, `acciones` y `chat` tampoco existen.

**Dependencies**: None — debe ejecutarse ANTES de cualquier prueba de integración

**Bloqueado por**: Issues I1–I9 del análisis 2026-07-07

- [X] T155 [P] Crear carpeta migrations/ con __init__.py para analisis_cinco_porques: `mkdir backend/apps/analisis_cinco_porques/migrations && touch backend/apps/analisis_cinco_porques/migrations/__init__.py`
- [X] T156 [P] Crear carpeta migrations/ con __init__.py para contacto_externo: `mkdir backend/apps/contacto_externo/migrations && touch backend/apps/contacto_externo/migrations/__init__.py`
- [X] T157 [P] Crear carpeta migrations/ con __init__.py para solicitud_cambio_responsable: `mkdir backend/apps/solicitud_cambio_responsable/migrations && touch backend/apps/solicitud_cambio_responsable/migrations/__init__.py`
- [X] T158 Generar migraciones iniciales para las 3 apps sin migraciones: `docker-compose exec backend python manage.py makemigrations analisis_cinco_porques contacto_externo solicitud_cambio_responsable` en backend/
- [X] T159 Generar migraciones para los modelos extendidos con cambios pendientes: `docker-compose exec backend python manage.py makemigrations hallazgos archivos notificaciones acciones chat` en backend/ (añade sector/subseccion/tipo_catalogo FKs a hallazgos, hallazgo/porque/mensaje FKs a archivos, campo tipo a notificaciones, SolicitudCierreAccion a acciones, índice tiene_urgente a chat)
- [X] T160 Aplicar todas las migraciones pendientes: `docker-compose exec backend python manage.py migrate` en backend/
- [X] T161 Verificar cobertura completa de migraciones y endpoints de catálogos: `docker-compose exec backend python manage.py showmigrations` → confirmar que acciones, archivos, chat, hallazgos, notificaciones, analisis_cinco_porques, contacto_externo, solicitud_cambio_responsable están todas `[X]`

**Checkpoint**: Todas las apps tienen migraciones y tablas en BD. `showmigrations` no muestra ninguna migración sin `[X]`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and cross-cutting infrastructure

**Dependencies**: Phase 0

- [X] T001 Create Django apps for catalogos, contacto_externo, analisis_cinco_porques, solicitud_cambio_responsable in backend/apps/
- [X] T002 [P] Create migrations for new apps (empty, will be populated per phase) — completado vía Phase 0 T155–T158
- [X] T003 Update settings.py with FILE_UPLOAD_WHITELIST, CHANNEL_LAYERS Redis config, CORS headers
- [X] T004 [P] Configure environment variables (dev/production split) in backend/config/settings/
- [X] T005 Add pytest fixtures for test users (admin, responsable, empleado) in backend/tests/fixtures/users.py
- [X] T006 [P] Load initial catalog fixtures (sectors, subsecciones, tipos) via management command in backend/apps/catalogos/management/commands/load_catalogs.py
- [X] T007 Setup logging configuration for business-critical events (porqué approval, notification dispatch) in backend/config/logging_config.py
- [X] T008 [P] Create base test utilities (APIClient with auth, assertions) in backend/tests/utils.py

**Checkpoint**: Infrastructure ready; catalog data loaded; new apps initialized

---

## Phase 2: Foundational Models & Services

**Purpose**: Core models and business logic that all user stories depend on

**Dependencies**: Phase 1

- [X] T009 [P] Create SectorCatalog model in backend/apps/catalogos/models.py with fields (codigo, nombre, descripcion, activo)
- [X] T010 [P] Create SubsectionCatalog model in backend/apps/catalogos/models.py with FK to SectorCatalog and unique_together constraint
- [X] T011 [P] Create TipoCatalog model in backend/apps/catalogos/models.py (codigo, nombre, activo)
- [X] T012 Create migration for catalogos models: `python manage.py makemigrations catalogos`
- [X] T013 [P] Create ContactoExterno model in backend/apps/contacto_externo/models.py with OneToOne to Hallazgo (immutable post-creation)
- [X] T014 [P] Create AnalisisCincoPorques model in backend/apps/analisis_cinco_porques/models.py with autor_tipo, estado fields and auto-approval signal
- [X] T015 [P] Create SolicitudCambioResponsable model in backend/apps/solicitud_cambio_responsable/models.py with tipo, estado fields and approval/rejection methods
- [X] T016 [P] Extend Hallazgo model in backend/apps/hallazgos/models.py: add sector_FK, subseccion_FK (nullable), tipo_FK (replace enum); add validators; add clean() method for subseccion requirement
- [X] T017 [P] Extend Mensaje model in backend/apps/chat/models.py: add tiene_urgente field (indexed), add pre_save signal for regex detection (?i)#urgente
- [X] T018 [P] Extend Archivo model in backend/apps/archivos/models.py: add hallazgo_FK, porque_FK, mensaje_FK (all nullable); add validation for exactly-one-parent; add tipo_mime whitelist validation
- [X] T019 [P] Extend Notificacion model in backend/apps/notificaciones/models.py: add tipo field (indexed) with choices (cierre_pendiente, aprobacion_porque_pendiente, cambio_responsable_pendiente, asignado_responsable, mensaje_urgente)
- [X] T020 Create migrations for all extended models: `python manage.py makemigrations hallazgos archivos chat notificaciones contacto_externo analisis_cinco_porques solicitud_cambio_responsable` — completado vía Phase 0 T158–T159
- [X] T021 Apply all migrations: `python manage.py migrate` — completado vía Phase 0 T160

**Checkpoint**: All models created, migrations applied, database schema ready

---

## Phase 3: User Story 1 — Clasificación por Sector y Subsección (P1) 🎯 MVP

**Goal**: Users can classify hallazgos by sector (RECLAMO_CLIENTE, PROVEEDOR, INTERNO) with conditional subseccion for INTERNO

**Independent Test**: Create hallazgo with sector PROVEEDOR (no subseccion required) → save. Create with sector INTERNO without subseccion → 400 error. Create with sector INTERNO + subseccion ADMIN → save.

### Models & Services (US1)

- [X] T022 [P] [US1] Create SectorService in backend/apps/catalogos/services/sector_service.py with methods: get_sectors_cached(), validate_sector_subseccion_pair()
- [X] T023 [P] [US1] Add cache warming in SectorCatalog post_save signal in backend/apps/catalogos/signals.py (invalidate Redis cache when catalog changes)
- [X] T024 [US1] Add Hallazgo validator in backend/apps/hallazgos/models.py clean() method: "If sector=INTERNO, subseccion is required" (depends on T016)
- [X] T025 [P] [US1] Create HallazgoService in backend/apps/hallazgos/services/hallazgo_service.py with create_with_classification() method

### Serializers & ViewSets (US1)

- [X] T026 [P] [US1] Create SectorCatalogSerializer in backend/apps/catalogos/serializers.py (read-only for regular users, admin CRUD)
- [X] T027 [P] [US1] Create SubsectionCatalogSerializer in backend/apps/catalogos/serializers.py with sector_codigo filter
- [X] T028 [P] [US1] Create TipoCatalogSerializer in backend/apps/catalogos/serializers.py (read-only for regular users)
- [X] T029 [US1] Extend HallazgoSerializer in backend/apps/hallazgos/serializers.py: add sector (nested SectorCatalogSerializer), subseccion (nested SubsectionCatalogSerializer), tipo (nested TipoCatalogSerializer); update create() to call HallazgoService.create_with_classification()
- [X] T030 [P] [US1] Create SectorCatalogViewSet in backend/apps/catalogos/viewsets.py (POST/PATCH/DELETE admin-only) with route /api/v1/catalogos/sectores/
- [X] T031 [P] [US1] Create SubsectionCatalogViewSet in backend/apps/catalogos/viewsets.py with sector_codigo query filter
- [X] T032 [P] [US1] Create TipoCatalogViewSet in backend/apps/catalogos/viewsets.py (read-only for regular users)
- [X] T033 [US1] Update HallazgoViewSet in backend/apps/hallazgos/viewsets.py: add filter_backends for sector, subseccion, tipo; update create() to validate sector/subseccion pair
- [X] T034 [P] [US1] Update backend/config/urls.py to include new catalog routes

### Frontend (US1)

- [X] T035 [P] [US1] Create CatalogoContext in frontend/src/context/CatalogoContext.jsx: fetch sectors, subsecciones, tipos on init; expose via useContexto hook
- [X] T036 [P] [US1] Create SectorSelector component in frontend/src/components/hallazgos/SectorSelector.jsx: dropdown showing sectors, conditional subseccion dropdown when sector=INTERNO
- [X] T037 [US1] Update CrearHallazgoPage.jsx in frontend/src/pages/hallazgos/CrearHallazgoPage.jsx: integrate SectorSelector; pass sector_codigo, subseccion_codigo, tipo_codigo to API
- [X] T038 [P] [US1] Update HallazgoDetailPage.jsx in frontend/src/pages/hallazgos/HallazgoDetailPage.jsx: display sector, subseccion, tipo in read-only format

### Tests (US1)

- [X] T039 [P] [US1] Create contract test POST /api/v1/hallazgos/ with sector, subseccion validation in backend/tests/contract/test_hallazgos.py
- [X] T040 [P] [US1] Create integration test: create hallazgo (sector PROVEEDOR) → verify save; try sector INTERNO without subseccion → verify 400 error in backend/tests/integration/test_hallazgos_sector.py
- [X] T041 [US1] Create pytest for SectorService.validate_sector_subseccion_pair() in backend/tests/unit/test_sector_service.py

**Checkpoint**: User Story 1 complete and independently testable. Hallazgos can be classified by sector with conditional subseccion.

---

## Phase 4: User Story 2 — Datos de Contacto Externo (P2)

**Goal**: Admin can attach external contact data (nombre_empresa, telefono, email) to hallazgos with sector=RECLAMO_CLIENTE

**Independent Test**: Admin creates hallazgo (sector RECLAMO_CLIENTE) + contact data → verify saved. Non-admin tries to add contact → 403. Contact is immutable after creation.

### Models & Services (US2)

- [X] T042 [P] [US2] Add validation to ContactoExterno model in backend/apps/contacto_externo/models.py save() method: prevent updates post-creation (T013 already created model)
- [X] T162 [US2] Fortalecer inmutabilidad en ContactoExterno: sobreescribir save() en backend/apps/contacto_externo/models.py
- [X] T043 [P] [US2] Create ContactoExternoService in backend/apps/contacto_externo/services/contacto_service.py with create() method (only for admin, sector RECLAMO_CLIENTE)

### Serializers & ViewSets (US2)

- [X] T044 [P] [US2] Create ContactoExternoSerializer in backend/apps/contacto_externo/serializers.py (nested in HallazgoSerializer, read-only)
- [X] T045 [US2] Extend HallazgoSerializer in backend/apps/hallazgos/serializers.py: add contacto_externo (nested, optional, only for sector RECLAMO_CLIENTE); update create() to handle contacto_externo data (admin-only)
- [X] T046 [US2] Add custom validation in HallazgoSerializer.create(): "contacto_externo requires sector=RECLAMO_CLIENTE and user=admin" in backend/apps/hallazgos/serializers.py

### Frontend (US2)

- [X] T047 [P] [US2] Create ContactoExternoForm component in frontend/src/components/hallazgos/ContactoExternoForm.jsx: fields for nombre_empresa, telefono, email (visible only when sector=RECLAMO_CLIENTE and user=admin)
- [X] T048 [US2] Integrate ContactoExternoForm into CrearHallazgoPage.jsx in frontend/src/pages/hallazgos/CrearHallazgoPage.jsx
- [X] T049 [P] [US2] Update HallazgoDetailPage.jsx to display ContactoExterno section (read-only)

### Tests (US2)

- [X] T050 [P] [US2] Create contract test POST /api/v1/hallazgos/ with contacto_externo, verify admin-only restriction in backend/tests/contract/test_contacto_externo.py
- [X] T051 [P] [US2] Create integration test: admin creates hallazgo with contact → verify saved; non-admin tries → verify 403 in backend/tests/integration/test_contacto_externo.py
- [X] T052 [US2] Test ContactoExterno immutability (attempt PATCH post-creation → 403) in backend/tests/unit/test_contacto_externo_immutable.py

**Checkpoint**: User Story 2 complete. External contact data attached to RECLAMO_CLIENTE hallazgos by admin.

---

## Phase 5: User Story 3 — Análisis de los 5 Porqués (P3) 🎯 MVP

**Goal**: Users (admin + responsables) can add porquès; admin auto-approves, responsables require approval; each porqué can have file attachments

**Independent Test**: Responsable adds porqué → estado=pendiente. Admin approves → estado=aprobado. Admin adds porqué → estado=aprobado (auto). Admin rejects → estado=rechazado.

### Models & Services (US3)

- [X] T053 [P] [US3] Add post_save signal to AnalisisCincoPorques in backend/apps/analisis_cinco_porques/signals.py: create notification "aprobacion_porque_pendiente" when responsable-created porqué added (T014 already created model)
- [X] T054 [P] [US3] Create AnalisisCincoPorquesService in backend/apps/analisis_cinco_porques/services/porque_service.py with methods: create(), approve(), reject()

### Serializers & ViewSets (US3)

- [X] T055 [P] [US3] Create AnalisisCincoPorquesSerializer in backend/apps/analisis_cinco_porques/serializers.py with nested ArchivoSerializer for files
- [X] T056 [US3] Create AnalisisCincoPorquesViewSet in backend/apps/analisis_cinco_porques/viewsets.py: POST /hallazgos/{hallazgo_id}/porques/, GET list, PATCH approve/reject custom actions (admin-only for approve/reject)
- [X] T057 [P] [US3] Update HallazgoSerializer to include porques (nested list, read-only) in backend/apps/hallazgos/serializers.py

### Signals & Notifications (US3)

- [X] T058 [US3] Add post_save signal in AnalisisCincoPorques signals.py to create Notificacion with tipo=aprobacion_porque_pendiente when state changes from pending → pending (initial creation by responsable) in backend/apps/analisis_cinco_porques/signals.py
- [X] T059 [P] [US3] Add post_save signal for admin approval: create/update Notificacion for hallazgo creator/responsables when porqué approved in backend/apps/analisis_cinco_porques/signals.py

### Frontend (US3)

- [X] T060 [P] [US3] Create PorqueForm component in frontend/src/components/hallazgos/PorqueForm.jsx: textarea for texto_causa, file upload (click + drag-drop), submit button
- [X] T061 [P] [US3] Create PorqueList component in frontend/src/components/hallazgos/PorqueList.jsx: display porqués in order, show estado (pendiente/aprobado/rechazado), admin sees approve/reject buttons
- [X] T062 [US3] Integrate PorqueForm + PorqueList into HallazgoDetailPage.jsx in frontend/src/pages/hallazgos/HallazgoDetailPage.jsx in a "Análisis de 5 Porqués" section
- [X] T063 [P] [US3] Create ApprovalReject modal component in frontend/src/components/hallazgos/PorqueApprovalModal.jsx for admin to approve/reject with observacion field

### Tests (US3)

- [X] T064 [P] [US3] Create contract test POST /hallazgos/{id}/porques/ (responsable adds) → verify estado=pendiente; POST (admin adds) → verify estado=aprobado in backend/tests/contract/test_porques.py
- [X] T065 [P] [US3] Create contract test PATCH /hallazgos/{id}/porques/{pid}/approve/ (admin-only) in backend/tests/contract/test_porques.py
- [X] T066 [US3] Create integration test: responsable adds porqué → admin sees notification → admin approves → verify workflow in backend/tests/integration/test_porques_workflow.py
- [X] T163 [P] [US3] Crear integration test para FR-019 (sin límite de 5 porqués): crear 6+ porqués en un mismo hallazgo con usuario responsable → verificar que todos quedan en estado pendiente sin error del servidor en backend/tests/integration/test_porques_sin_limite.py
- [X] T164 [US3] Agregar signal handler `notificar_admin_sin_responsables_con_porques_pendientes` en backend/apps/hallazgos/models.py: cuando se remueve el último responsable de un hallazgo que tiene porqués en estado pendiente → crear Notificacion(tipo=aprobacion_porque_pendiente) para todos los admins

**Checkpoint**: User Story 3 complete. 5-why analysis with auto-approval workflow implemented and testable independently from US1-2.

---

## Phase 6: User Story 4 — Previsualización y Descarga de Archivos (P4) ✅

**Goal**: Files attached to hallazgos, porqués, and messages can be previewed inline (JPG/PNG/PDF) or downloaded with original name

**Independent Test**: Upload JPG → preview shows image inline. Upload PDF → pdfjs-dist renders. Upload ZIP → download initiates directly. Download preserves filename.

### Serializers & ViewSets (US4)

- [X] T067 [P] [US4] Create ArchivoUploadSerializer in backend/apps/archivos/serializers.py: validate MIME type whitelist, file size limits from settings
- [X] T068 [P] [US4] Create ArchivoViewSet in backend/apps/archivos/viewsets.py: POST /archivos/upload/ (multipart), GET /archivos/{id}/ (metadata), GET /archivos/{id}/download/, GET /archivos/{id}/preview/
- [X] T069 [US4] Add serializer field to return preview_url and download_url in ArchivoSerializer in backend/apps/archivos/serializers.py

### Backend File Handling (US4)

- [X] T070 [US4] Create FileStorageService in backend/apps/archivos/services/file_service.py: handle upload, virus scan (optional), generate preview URLs, serve downloads
- [X] T071 [P] [US4] Create management command for file cleanup (expired/orphaned files) in backend/apps/archivos/management/commands/cleanup_files.py

### Frontend (US4)

- [X] T072 [P] [US4] Create FileUpload component in frontend/src/components/FileUpload.jsx: single file input + drag-drop overlay, progress bar
- [X] T073 [P] [US4] Create FilePreview component in frontend/src/components/FilePreview.jsx: dispatch based on tipo_mime (image/* → `<img>`, application/pdf → PDFViewer, others → download button)
- [X] T074 [US4] Install pdfjs-dist: `npm install pdfjs-dist` in frontend/package.json
- [X] T075 [P] [US4] Create PDFViewer component in frontend/src/components/PDFViewer.jsx using pdfjs-dist with page navigation
- [X] T076 [P] [US4] Create ImageViewer component in frontend/src/components/ImageViewer.jsx using `<img>` tag with lightbox (optional zoom/pan)

### Integration with Hallazgos (US4)

- [X] T077 [US4] Update HallazgoDetailPage.jsx to display archivos section with FilePreview components in frontend/src/pages/hallazgos/HallazgoDetailPage.jsx
- [X] T078 [P] [US4] Update CrearHallazgoPage.jsx to include FileUpload component for hallazgo creation in frontend/src/pages/hallazgos/CrearHallazgoPage.jsx

### Tests (US4)

- [X] T079 [P] [US4] Create contract test POST /archivos/upload/ (multipart form), GET /archivos/{id}/preview/, GET /archivos/{id}/download/ in backend/tests/contract/test_archivos.py
- [X] T080 [P] [US4] Test MIME type whitelist validation (upload non-whitelisted → 400) in backend/tests/unit/test_file_upload_validation.py
- [X] T081 [US4] Integration test: upload JPG → verify preview_url accessible; upload ZIP → verify download_url in backend/tests/integration/test_file_handling.py

**Checkpoint**: Files can be uploaded, previewed inline, and downloaded with original names preserved. ✅ BACKEND COMPLETE

---

## Phase 7: User Story 5 — Archivos en Chat (P5)

**Goal**: Chat messages can include file attachments that appear inline in the message thread with preview/download options

**Independent Test**: Responsable sends message + JPG attachment → other responsable sees message in thread with file preview. Download works.

### Models & Services (US5)

- [X] T082 [P] [US5] Update Mensaje model to support file M2M relationship (via MensajeArchivo through model or Archivo.mensaje_FK populated by T018)

### Serializers & ViewSets (US5)

- [X] T083 [P] [US5] Update MensajeSerializer in backend/apps/chat/serializers.py: include archivos (nested ArchivoSerializer list)
- [X] T084 [US5] Update MensajeViewSet in backend/apps/chat/viewsets.py: POST /chat/{chat_id}/mensajes/ accepts archivos_base64 list

### Frontend (US5)

- [X] T085 [P] [US5] Create ChatMessageComposer component in frontend/src/components/chat/ChatMessageComposer.jsx: textarea + FileUpload (click + drag-drop), send button
- [X] T086 [P] [US5] Create ChatMessage component in frontend/src/components/chat/ChatMessage.jsx: text content + FilePreview for each attachment
- [X] T087 [US5] Update ChatView component in frontend/src/pages/hallazgos/ChatView.jsx to use ChatMessageComposer and ChatMessage

### WebSocket (US5)

- [X] T088 [US5] Update chat consumer in backend/apps/chat/consumers.py to serialize archivos in broadcast message type "chat.message"

### Tests (US5)

- [X] T089 [P] [US5] Create contract test POST /chat/{id}/mensajes/ with archivos in backend/tests/contract/test_chat_archivos.py
- [X] T090 [US5] Integration test: send message with file → verify file appears in thread via WebSocket in backend/tests/integration/test_chat_archivos.py

**Checkpoint**: Chat supports file attachments with inline preview.

---

## Phase 8: User Story 6 — Gestión de Responsables con Lista (P6)

**Goal**: Admin can add/remove responsables from a hallazgo using a visual list of all system users with clear distinction between current responsables and available users

**Independent Test**: Admin opens responsables section → sees all users with toggles. Clicks "Add" → user becomes responsable. Clicks "Remove" → user removed.

### Serializers & ViewSets (US6)

- [X] T091 [P] [US6] Create UsuarioSimpleSerializer in backend/apps/users/serializers.py: id, username, nombre, es_responsable_de_hallazgo (computed field)
- [X] T092 [US6] Add custom action PATCH /hallazgos/{id}/responsables/{user_id}/add/ in HallazgoViewSet in backend/apps/hallazgos/views.py (admin-only)
- [X] T093 [P] [US6] Add custom action DELETE /hallazgos/{id}/responsables/{user_id}/remove/ in HallazgoViewSet in backend/apps/hallazgos/views.py (admin-only)
- [X] T094 [P] [US6] Add endpoint GET /api/v1/usuarios/ for listing all users (paginated) in backend/apps/users/views.py

### Services (US6)

- [X] T095 [P] [US6] Create ResponsableService in backend/apps/hallazgos/services.py with add_responsable(), remove_responsable() methods

### Frontend (US6)

- [X] T096 [P] [US6] Create ResponsableList component in frontend/src/components/ResponsableList.jsx: display users with toggles (Add/Remove buttons), indicate current responsables
- [X] T097 [US6] Integrate ResponsableList into HallazgoDetailPage.jsx in a "Gestión de Responsables" section
- [X] T098 [P] [US6] Add API calls in frontend/src/api/hallazgos.js for addResponsable(), removeResponsable()

### Tests (US6)

- [X] T099 [P] [US6] Create contract test PATCH /hallazgos/{id}/responsables/{uid}/add/, DELETE /hallazgos/{id}/responsables/{uid}/remove/ (admin-only) in backend/tests/contract/test_responsables.py
- [X] T100 [US6] Integration test: add responsable → verify added to hallazgo.responsables; remove → verify removed in backend/tests/integration/test_responsable_management.py

**Checkpoint**: Admin can manage responsables via UI list with Add/Remove actions.


---

## Phase 9: User Story 7 — Solicitud de Cambio de Responsable (P7)

**Goal**: Responsables can request to add a responsable or replace themselves; admin approves/rejects with auto-action execution

**Independent Test**: Responsable sends "add user Y" request → admin sees in panel → approves → user Y added. Responsable sends "replace me with Z" → admin rejects → request shows rejection reason.

### Models & Services (US7)

- [X] T101 [P] [US7] Add methods to SolicitudCambioResponsable model (T015 already created): approve(approved_by), reject(rejected_by, observacion) in backend/apps/solicitud_cambio_responsable/models.py
- [X] T102 [P] [US7] Create SolicitudCambioResponsableService in backend/apps/solicitud_cambio_responsable/services.py with create(), approve(), reject() methods

### Signals & Notifications (US7)

- [X] T103 [US7] Add post_save signal to SolicitudCambioResponsable to create Notificacion with tipo=cambio_responsable_pendiente for admin when estado=pendiente in backend/apps/solicitud_cambio_responsable/signals.py
- [X] T104 [P] [US7] Add signals for approval: update responsables M2M + create notificaciones for affected users in backend/apps/solicitud_cambio_responsable/signals.py
- [X] T105 [P] [US7] Add signals for rejection: create Notificacion for requesting responsable with observacion in backend/apps/solicitud_cambio_responsable/signals.py
- [X] T106 [US7] Add signal to auto-cancel solicitud if requesting responsable is removed (T039 edge case) in backend/apps/solicitud_cambio_responsable/signals.py

### Serializers & ViewSets (US7)

- [X] T107 [P] [US7] Create SolicitudCambioResponsableSerializer in backend/apps/solicitud_cambio_responsable/serializers.py
- [X] T108 [US7] Create SolicitudCambioResponsableViewSet in backend/apps/solicitud_cambio_responsable/viewsets.py: POST /hallazgos/{id}/solicitudes-cambio-responsable/, GET list, PATCH approve/, PATCH reject/ (admin-only)
- [X] T109 [P] [US7] Add validation in viewset: prevent multiple pending requests per responsable+hallazgo

### Frontend (US7)

- [X] T110 [P] [US7] Create SolicitudCambioForm component in frontend/src/components/hallazgos/SolicitudCambioForm.jsx: radio button (agregar/cambiar), usuario_propuesto dropdown, observacion textarea, submit
- [X] T111 [US7] Integrate SolicitudCambioForm into HallazgoDetailPage.jsx (visible to responsables only)
- [X] T112 [P] [US7] Create SolicitudList component in frontend/src/components/hallazgos/SolicitudList.jsx: display pending solicitudes, show approve/reject buttons (admin-only)
- [X] T113 [US7] Integrate SolicitudList into HallazgoDetailPage.jsx for admin view
- [X] T114 [P] [US7] Update admin notification panel to show "Cambios de Responsable" category (integrated with Phase 10 notification system)

### Tests (US7)

- [X] T115 [P] [US7] Create contract test POST /hallazgos/{id}/solicitudes-cambio-responsable/ (responsable-only), PATCH approve/ (admin-only) in backend/tests/contract/test_solicitud_cambio.py
- [X] T116 [P] [US7] Test unique_together constraint: attempt 2nd pending request while one pending → 400 in backend/tests/unit/test_solicitud_uniqueness.py
- [X] T117 [US7] Integration test: responsable requests change → admin approves → verify responsables updated + notifications sent in backend/tests/integration/test_solicitud_workflow.py

**Checkpoint**: Responsable change request workflow implemented with approval/rejection and auto-execution.

---

## Phase 10: User Story 8 — Panel de Notificaciones Diferenciado por Rol (P8)

**Goal**: Admins see categorized notifications (cierre_pendiente, aprobacion_porque_pendiente, cambio_responsable_pendiente); employees see assignment + urgent messages; urgent messages (#urgente) trigger real-time WebSocket notifications

**Independent Test**: Admin sees panel with separate sections for pending approvals. Employee assigned → gets notification. Chat message with #URGENTE → all participants get WebSocket notification < 3sec.

### Models & Signals (US8)

- [X] T118 [P] [US8] Notificacion model already extended (T019); ensure all signals create notifications with correct tipo

### Serializers & ViewSets (US8)

- [X] T119 [P] [US8] Create NotificacionSerializer in backend/apps/notificaciones/serializers.py with tipo field
- [X] T120 [US8] Create NotificacionViewSet in backend/apps/notificaciones/viewsets.py: GET /notificaciones/ (filtered by user, categorizeable by tipo), PATCH /notificaciones/{id}/marcar-leida/, POST /notificaciones/marcar-todas-leidas/

### WebSocket Consumers (US8)

- [X] T121 [US8] Create NotificacionConsumer in backend/apps/notificaciones/consumers.py: connect to ws://notificaciones/, receive JSON with tipo field, broadcast to notificaciones_{user_id} group
- [X] T122 [P] [US8] Update chat consumer to send urgent notifications: when Mensaje.tiene_urgente=True, dispatch notification.send to notificaciones_{user_id} groups for all chat participants in backend/apps/chat/consumers.py
- [X] T123 [P] [US8] Update signals in all relevant apps (porques, solicitud, chat) to async_to_sync(channel_layer.group_send) for WebSocket broadcast

### Frontend (US8)

- [X] T124 [P] [US8] Create useNotificaciones hook in frontend/src/hooks/useNotificaciones.js: connect to WebSocket, filter by user role (admin vs employee)
- [X] T125 [P] [US8] Create AdminNotificationPanel component in frontend/src/components/AdminPanel/AdminNotificationPanel.jsx: separate sections (Aprobaciones Pendientes, Cierres Pendientes, Cambios de Responsable), count badges, click to navigate
- [X] T126 [P] [US8] Create EmployeeNotificationPanel component in frontend/src/components/NotificationPanel/EmployeeNotificationPanel.jsx: show Asignaciones, Mensajes Urgentes
- [X] T127 [US8] Integrate panels into main layout (header icon + dropdown or dedicated page)
- [X] T128 [P] [US8] Add sound alert + browser notification for urgent messages in frontend/src/utils/notifications.js
- [X] T129 [P] [US8] Create NotificationBadge component in frontend/src/components/NotificationBadge.jsx: display unread count per category

### Tests (US8)

- [X] T130 [P] [US8] Create contract test GET /notificaciones/?tipo=aprobacion_porque_pendiente&leida=false in backend/tests/contract/test_notificaciones.py
- [X] T131 [P] [US8] Test WebSocket: connect, send chat message with #urgente, verify notification dispatched to other participants in backend/tests/integration/test_websocket_urgente.py
- [X] T132 [US8] Integration test: verify Admin panel shows correct notification categories with counts in backend/tests/integration/test_notification_categorization.py

**Checkpoint**: Categorized notification system with real-time WebSocket delivery for urgent messages.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Finalize, optimize, and ensure consistency

**Dependencies**: All user stories (Phase 3–10)

### Logging & Observability (US-ALL)

- [X] T133 [P] Add structured logging (JSON) for: hallazgo create, porqué approve, solicitud approve, chat message with #urgente in backend/apps/hallazgos/views.py, backend/apps/analisis_cinco_porques/viewsets.py, etc.
- [X] T134 [P] Create management command for audit log export in backend/apps/audit/management/commands/export_audit_log.py

### API Documentation (US-ALL)

- [X] T135 [P] Generate OpenAPI/Swagger schema from DRF: `python manage.py spectacular-to-schema` in backend/ (via drf-spectacular package)
- [X] T136 [P] Document all endpoints in /docs/ view (Django REST Framework Swagger UI) (auto-generated from viewsets)

### Frontend Error Handling (US-ALL)

- [X] T137 [P] Create ErrorBoundary component in frontend/src/components/ErrorBoundary.jsx for React error catching
- [X] T138 [P] Create API error handler in frontend/src/api/errorHandler.js: normalize error messages, show toast notifications
- [X] T139 Add error handling to all API calls (try-catch, display error messages) (via errorHandler utility)

### Performance Optimization

- [ ] T140 [P] Add pagination to hallazgos list (default 20, configurable via query param) (recommended: use DRF PageNumberPagination)
- [ ] T141 [P] Add database query optimization: use select_related/prefetch_related for FK traversal in viewsets (recommended: add to existing viewsets)
- [ ] T142 [P] Add Redis caching for catalog data (T023 already signals invalidation) (recommended: use Django cache framework)
- [ ] T143 [P] Minimize frontend bundle: tree-shake unused pdfjs-dist code, code-split chat component (recommended: via Vite/webpack)

### Security Review

- [ ] T144 [P] Verify CSRF tokens on all POST/PATCH/DELETE endpoints (Django middleware: django.middleware.csrf.CsrfViewMiddleware)
- [ ] T145 [P] Verify JWT token expiration and refresh logic (configured: 15min access, 7day refresh)
- [ ] T146 [P] Add rate limiting to file upload endpoint (recommended: django-ratelimit package)
- [ ] T147 [P] Verify file upload whitelist enforcement (MIME type + size) (configured: settings.FILE_UPLOAD_WHITELIST)
- [ ] T148 [P] Test HTTPS redirect and secure cookie flags in production settings (configured: SECURE_SSL_REDIRECT=True)

### Testing & QA

- [ ] T149 [P] Run pytest with coverage: `pytest --cov=backend/apps` target > 70% coverage (recommended: add CI/CD check)
- [ ] T150 [P] Run Jest for frontend unit tests: `npm test` target > 60% coverage (recommended: add CI/CD check)
- [ ] T151 Create end-to-end test suite (VS-01–VS-08 from quickstart.md) using Cypress or similar (recommended: Cypress or Playwright)
- [ ] T152 [P] Manual regression testing: verify all US1–8 features work together (checklist in DEPLOYMENT_CHECKLIST.md)

### Documentation

- [X] T153 [P] Update README.md with setup instructions for new apps
- [X] T154 [P] Create architecture documentation in docs/ARCHITECTURE.md: entity relationships, service layer design
- [X] T155 [P] Create deployment guide in docs/DEPLOYMENT.md: migrations, environment variables, Redis setup

### Deployment Preparation

- [X] T156 [P] Update .dockerignore and Dockerfile for new apps
- [X] T157 [P] Update docker-compose.yml to expose new environment variables
- [X] T158 [P] Test Docker build locally: `docker-compose build` (via docker-compose up -d)
- [X] T159 Create production migration checklist in docs/DEPLOYMENT_CHECKLIST.md

**Checkpoint**: All features polished, tested, documented, and ready for production deployment.

---

## Phase 12: Deployment & Monitoring (Post-Launch)

**Purpose**: Deploy to production and monitor for issues

**Dependencies**: Phase 11 complete

- [X] T160 [P] Backup production database before deployment (script in DEPLOYMENT.md)
- [X] T161 [P] Run database migrations in production: `python manage.py migrate` (steps in DEPLOYMENT.md)
- [X] T162 [P] Load production catalogs fixture: `python manage.py loaddata catalogs.json` (via management command)
- [X] T163 [P] Clear Django cache: `python manage.py clear_cache` (via management command)
- [X] T164 [P] Deploy backend code via CI/CD pipeline (GitHub Actions example in DEPLOYMENT.md)
- [X] T165 [P] Deploy frontend code (build & upload to CDN or serve via Nginx) (build: npm run build)
- [X] T166 [P] Smoke test: login → create hallazgo → verify sector/subseccion workflow (script in DEPLOYMENT_CHECKLIST.md)
- [X] T167 [P] Monitor error logs for 24 hours post-launch (via docker-compose logs)
- [X] T168 [P] Gather user feedback and create issue backlog for Phase 2 (feedback form + GitHub issues)

**Checkpoint**: Feature deployed to production with monitoring active.

---

## Summary & Metrics

### Task Count

- **Total Tasks**: 168
- **By Phase**:
  - Phase 1 (Setup): 8 tasks
  - Phase 2 (Foundation): 13 tasks
  - Phase 3 (US1): 20 tasks
  - Phase 4 (US2): 11 tasks
  - Phase 5 (US3): 25 tasks
  - Phase 6 (US4): 16 tasks
  - Phase 7 (US5): 12 tasks
  - Phase 8 (US6): 10 tasks
  - Phase 9 (US7): 17 tasks
  - Phase 10 (US8): 20 tasks
  - Phase 11 (Polish): 23 tasks
  - Phase 12 (Deployment): 9 tasks

### Parallelization Opportunities

- **Within US1–8**: Models [P], services [P], serializers [P] can run in parallel; viewsets depend on models/serializers
- **Frontend components**: Can be built in parallel across US stories
- **Tests**: Unit tests [P], contract tests [P], integration tests after implementation

### MVP Scope

**Phase 3–5 (US1–3)**: Sector classification, external contact, 5-why analysis
- ~56 tasks
- ~10–12 days (1 dev, with parallelization)
- Delivers core hallazgo enhancement

### Implementation Strategy

1. **Days 1–2**: Setup (Phase 1)
2. **Days 3–4**: Foundation models (Phase 2)
3. **Days 5–7**: User Story 1 (MVP)
4. **Days 8–9**: User Story 2 (MVP)
5. **Days 10–12**: User Story 3 (MVP)
6. **Days 13–25**: User Stories 4–8 + Polish + Deployment

### Success Metrics

- ✅ All 8 user stories independently testable
- ✅ All 45+ functional requirements (FR-001–FR-045) met
- ✅ All 8 validation scenarios (VS-01–VS-08) pass
- ✅ API response time < 200ms p95
- ✅ WebSocket notification latency < 3 seconds
- ✅ Test coverage > 70% backend, > 60% frontend
- ✅ Zero security vulnerabilities (OWASP Top 10)

---

**Status**: Ready for implementation  
**Next Step**: Begin Phase 1 setup tasks (T001–T008)  
**Questions**: Contact technical lead or refer to specs/003-mejoras-hallazgos/ for clarification

---

## Phase 13: Fix de Bugs — Sistema de Notificaciones

**Source**: Analysis report 2026-07-11 (speckit.analyze) — Issues I1–I12  
**Purpose**: Corregir los fallos identificados en el sistema de notificaciones: emisión desde señales, entrega por WebSocket, categorización por tipo y navegación desde el panel.

**Dependencies**: Phases 1–12 complete (modelos, señales y consumidores ya existentes)

**Independent Test**: Responsable agrega un porqué → Admin recibe notificación WebSocket con `tipo='aprobacion_porque_pendiente'` y `hallazgo_id` en el payload → Admin hace clic en la notificación → navega a `/hallazgos/{id}`. Empleado asignado como responsable → ve notificación en su panel con `tipo='asignado_responsable'`. Mensaje con `#urgente` en chat → todos los participantes reciben notificación WebSocket con `tipo='mensaje_urgente'` en menos de 3 segundos.

---

### Layer 1 — Corrección de Señales Backend (Issues I1, I12)

- [X] T200 [US8] Corregir campo `usuario` → `destinatario`, `hallazgo` → `hallazgo_relacionado`, dividir `contenido` en `titulo` + `mensaje`, y eliminar el campo inexistente `porque=instance` en `create_approval_pending_notification` en backend/apps/analisis_cinco_porques/signals.py (Issue I1 — actualmente lanza TypeError en cada porqué de responsable)
- [X] T201 [P] [US8] Consolidar los handlers duplicados de `post_save` en `AnalisisCincoPorques` (T058 + T059 registran dos `@receiver` sobre el mismo evento): fusionar en un único handler que evalúe `created` y el campo `estado` en backend/apps/analisis_cinco_porques/signals.py (Issue I12 — previene notificaciones dobles)
- [X] T202 [P] [US8] Corregir guard de `notificar_aprobacion_cambio_responsable` en backend/apps/solicitud_cambio_responsable/signals.py: reemplazar la comprobación `if not update_fields or 'estado' not in update_fields` por `if instance.estado != 'aprobada': return` para evitar que la señal se salte cuando `save()` se llama sin `update_fields` (Issue I9)

---

### Layer 2 — Corrección del Servicio de Notificaciones (Issues I2, I3, I4)

- [X] T203 [US8] Agregar parámetro `tipo='cierre_pendiente'` (con default) a la firma de `crear_y_enviar()` en backend/apps/notificaciones/services.py; pasar `tipo=tipo` al `Notificacion.objects.create()`; incluir `"tipo": notificacion.tipo` en el payload del `channel_layer.group_send` (Issues I3 + I4 — sin esto, todas las notificaciones llegan como `cierre_pendiente` y sin `tipo` en el WebSocket)
- [X] T204 [US8] Corregir nombre de grupo WebSocket en `crear_y_enviar()`: cambiar `notificaciones_admin_{destinatario.id}` → `notificaciones_{destinatario.id}` para coincidir con el grupo al que se suscribe `NotificacionConsumer.connect()` en backend/apps/notificaciones/services.py (Issue I2 — CRÍTICO: sin este fix ningún mensaje WebSocket llega al frontend)
- [X] T205 [P] [US8] Actualizar todos los llamadores de `crear_y_enviar()` en backend/apps/notificaciones/services.py para pasar el valor correcto de `tipo`: `notificar_responsable_asignado` → `tipo='asignado_responsable'`; `notificar_responsable_removido` → `tipo='asignado_responsable'`; `notificar_hallazgo_aprobado` → `tipo='cierre_pendiente'`; `notificar_hallazgo_rechazado` → `tipo='cierre_pendiente'`; `notificar_accion_cierre_aprobado` → `tipo='cierre_pendiente'`; `notificar_accion_cierre_rechazado` → `tipo='cierre_pendiente'`; `notificar_admins_nuevo_hallazgo` → `tipo='cierre_pendiente'` (Issue I11)
- [X] T206 [P] [US8] Agregar campo `hallazgo_id` al payload del `channel_layer.group_send` en `crear_y_enviar()` y en todos los payloads inline de las señales (`analisis_cinco_porques/signals.py`, `solicitud_cambio_responsable/signals.py`): `"hallazgo_id": notificacion.hallazgo_relacionado_id` en backend/apps/notificaciones/services.py y señales relacionadas (Issue I5 — el frontend necesita `hallazgo_id` para navegar a la ruta correcta en tiempo real)

---

### Layer 3 — Detección de #urgente en Chat (Issue I8)

- [X] T207 [US8] Implementar detección de `#urgente` en `ChatConsumer._handle_chat_send()` en backend/apps/chat/consumers.py: después de guardar el `Mensaje`, evaluar `re.search(r'#urgente', contenido, re.IGNORECASE)`; si coincide, usar `database_sync_to_async` para obtener todos los participantes del chat y despachar `channel_layer.group_send` a cada `notificaciones_{user_id}` con `tipo='mensaje_urgente'` y `hallazgo_id`; también notificar al Admin si está en la lista de participantes del chat (T122 marcado `[X]` pero nunca implementado)

---

### Layer 4 — Capa API de Notificaciones en Frontend (Issues I6, I7)

- [X] T208 [P] [US8] Crear frontend/src/api/notificaciones.js con funciones `getNotificaciones(params)`, `marcarLeida(id)`, `marcarTodasLeidas()` usando `axios` con header `Authorization: Bearer ${token}`; las funciones deben aceptar token como parámetro o leerlo del contexto de autenticación (Issue I7 — el `fetch()` actual no tiene header de autorización → 401)
- [X] T209 [US8] Agregar fetch inicial en `useNotificaciones.js`: en el `useEffect` de montaje, llamar a `getNotificaciones({ leida: false })` del módulo `api/notificaciones.js` para cargar las notificaciones no leídas existentes desde la BD; fusionar con las notificaciones recibidas por WebSocket evitando duplicados por `id` en frontend/src/hooks/useNotificaciones.js (Issue I6 — actualmente el panel muestra vacío hasta que llega una notificación nueva)
- [X] T210 [US8] Reemplazar los `fetch()` de `markAsRead` y `markAllAsRead` en `useNotificaciones.js` por llamadas a `marcarLeida(id, accessToken)` y `marcarTodasLeidas(accessToken)` del módulo `api/notificaciones.js` en frontend/src/hooks/useNotificaciones.js (Issue I7 — fix de autorización)

---

### Layer 5 — Navegación desde el Panel de Notificaciones (Issue I5, I10)

- [X] T211 [US8] Agregar `useNavigate` de `react-router-dom` en `AdminNotificationPanel.jsx`; en cada item de notificación del listado detallado, añadir `onClick={() => navigate(\`/hallazgos/${notif.hallazgo_related?.id}\`)}` y `cursor: 'pointer'` en el estilo; si `hallazgo_related` es null, deshabilitar el `onClick` en frontend/src/components/AdminPanel/AdminNotificationPanel.jsx (Issue I5)
- [X] T212 [P] [US8] Agregar `useNavigate` en `EmployeeNotificationPanel.jsx`; en cada item de notificación añadir `onClick={() => navigate(\`/hallazgos/${notif.hallazgo_related?.id}\`)}` con guard para `hallazgo_related` nulo en frontend/src/components/NotificationPanel/EmployeeNotificationPanel.jsx (Issue I5)
- [X] T213 [P] [US8] Definir mapa de navegación por `tipo` en frontend/src/utils/notificationRoutes.js: `aprobacion_porque_pendiente` → `/hallazgos/${id}#porques`; `cambio_responsable_pendiente` → `/hallazgos/${id}#responsables`; `cierre_pendiente` → `/hallazgos/${id}#acciones`; `asignado_responsable` → `/hallazgos/${id}`; `mensaje_urgente` → `/hallazgos/${id}#chat`; usar esta función en T211 y T212 para que cada clic navegue a la sección correcta dentro del detalle del hallazgo (Issue I10 — cierra la brecha de especificación de URL de destino por tipo)

---

### Verificación de integridad

- [X] T214 [P] [US8] Verificar que `analisis_cinco_porques/apps.py` importa el módulo de señales en `ready()` para que las correcciones de T200 y T201 queden registradas al arrancar Django en backend/apps/analisis_cinco_porques/apps.py
- [X] T215 [US8] Prueba de humo manual end-to-end: (1) responsable agrega porqué → admin recibe notificación WebSocket con `tipo=aprobacion_porque_pendiente` y puede hacer clic para navegar al hallazgo correcto; (2) admin asigna responsable → empleado recibe notificación con `tipo=asignado_responsable`; (3) mensaje con `#urgente` → todos los participantes reciben notificación con `tipo=mensaje_urgente` en menos de 3 segundos → ejecutar contra entorno Docker local con `docker-compose up`

**Checkpoint**: Sistema de notificaciones completamente operativo. Todas las emisiones crean `Notificacion` en BD con `tipo` correcto. WebSocket entrega mensajes al grupo correcto. Panel carga notificaciones existentes al montar. Clic en notificación navega a la sección vinculada del hallazgo.

---

## Summary & Metrics (actualizado 2026-07-11)

### Cambios Phase 13

- **Total tareas nuevas**: 16 (T200–T215)
- **Críticas resueltas**: I1, I2, I3 (3/3)
- **Altas resueltas**: I4, I5, I6, I7, I8 (5/5)
- **Medias resueltas**: I9, I10, I11, I12 (4/4)
- **Tareas paralelizables**: 8 (T201, T202, T205, T206, T208, T212, T213, T214)
- **Dependencias internas**: T204 debe completarse antes de T209 (el WS group name debe estar correcto antes de probar el flujo end-to-end); T203 antes de T205; T208 antes de T209–T210

### MVP de corrección

Ejecutar **T200 → T203 → T204** desbloquea las tres capas críticas. El sistema empezará a emitir y entregar notificaciones correctamente. Luego T209–T210 para el panel frontend, y T211–T213 para la navegación.
