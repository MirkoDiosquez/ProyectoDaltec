# Implementation Plan: Mejoras al Sistema de Gestión de Hallazgos

**Branch**: `003-mejoras-hallazgos` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-mejoras-hallazgos/spec.md` with clarifications Q1–Q5 applied.

---

## Summary

Ampliar el sistema de gestión de hallazgos existente con 8 capacidades nuevas organizadas por prioridad (P1–P8): (1) clasificación por sector/subsección, (2) datos de contacto externo para reclamos de admin, (3) análisis de 5 porqués con auto-aprobación del admin, (4–5) previsualización/descarga de archivos y adjuntos en chat, (6) lista de responsables con toggle, (7) solicitudes de cambio de responsable, (8) panel de notificaciones diferenciado por rol. El sistema debe tratarse como una **extensión del hallazgo existente**, no un reemplazo; conserva campos como `tipo` (NO_CONFORMIDAD, OPORTUNIDAD_MEJORA, QUEJA_CLIENTE) como dimensión independiente y ortogonal al nuevo campo `sector`. Todos los catálogos (sector, subsección, tipo) deben modelarse como **configuración dinámica** (tablas editables) en cumplimiento de los Principios II y XI de la Constitución.

---

## Technical Context

**Language/Version**: Python 3.11, Django 4.2+, Django Channels 4+, React 18, Node.js 18+, MySQL 8, Redis 7

**Primary Dependencies**: 
- Backend: Django REST Framework (DRF), djangorestframework-simplejwt, channels, channels-redis, django-cors-headers, Pillow, mysqlclient
- Frontend: React Router 6, Axios, React Hooks, PDF viewer (react-pdf or pdfjs-dist), drag-drop library (react-dropzone)

**Storage**: MySQL (relational models + audit), Redis (WebSocket channel layer, session cache), Local/S3-compatible storage for file uploads

**Testing**: pytest-django (backend unit/integration), Jest + React Testing Library (frontend unit), end-to-end scenarios per quickstart.md

**Target Platform**: Web (browser-based); deployed via Docker Compose (dev), Kubernetes or Docker Swarm (prod)

**Project Type**: Web application with real-time chat/notifications (monolithic Django + React frontend)

**Performance Goals**: 
- API response time < 200ms p95 for hallazgo CRUD
- WebSocket notifications < 3 seconds end-to-end
- File upload < 10 seconds for typical file sizes (< 50 MB)
- Support 100+ concurrent users per deployment instance

**Constraints**:
- All business config externalized (no hardcode) — Principios II, XI Constitution
- JWT-based auth with role-based access control (RBAC)
- HTTPS enforced in production
- CSRF protection on all state-changing endpoints
- Backend validation for all inputs
- Server-side processing of business rules (no client-side logic gates)

**Scale/Scope**: 
- Organizational context (hundreds to thousands of employees)
- Approx. 20+ new/modified Django models
- ~15 new API endpoints (or 5–6 new viewsets with custom actions)
- 5+ new React components
- WebSocket consumer for chat + notifications

**Constraints from Constitution**:
- **Principio II (No hardcode)**: Catálogos de sector, subsección, tipo en tabla de configuración, no en enums hardcodeados
- **Principio VI (Seguridad)**: JWT auth, HTTPS, CSRF, validación server-side, roles granulares
- **Principio VIII (Observabilidad)**: Structured logging para todas las acciones críticas (crear porqué, aprobar, cambio de responsable)
- **Principio XI (Dinámica de negocio)**: Valores de catálogo editables sin redeploy

---

## Constitution Check

*GATE: Must pass before Phase 0 research.*

- [x] **I. Stack Tecnológico**: Feature uses Django 4.2/Channels, React 18, Nginx, MySQL 8, Redis 7 — **PASS** (aligned with existing stack from 001-gestion-hallazgos)
- [x] **II. Prohibición de Hardcode**: Catálogos (sector, subsección, tipo) stored in database tables, configurable via Django admin or custom panel — **PASS** (FR-006, FR-019)
- [x] **III. Separación de Responsabilidades**: All business logic in Django services (hallazgo_service.py, analysis_service.py, notification_service.py); React only renders + dispatches; API-first contract — **PASS**
- [x] **IV. API First**: All endpoints defined in OpenAPI/REST terms before frontend consumption; WebSocket protocol defined for chat/notifications — **PASS** (see Contracts section)
- [x] **V. Escalabilidad**: Async processing via Celery (if needed) for heavy file uploads; Redis for WebSocket scaling; stateless API endpoints — **PASS**
- [x] **VI. Seguridad**: JWT token validation, RBAC at viewset level, input validation in serializers, file type whitelist in settings (not hardcoded) — **PASS**
- [x] **VII. Calidad del Código**: SOLID applied to services layer; DRY via reusable serializers/mixins; type hints in Python 3.11 — **PASS**
- [x] **VIII. Observabilidad**: Structured logging in handlers for hallazgo create/update, porqué approval, notification dispatch — **PASS** (tasks.md Phase 8)
- [x] **IX. Compatibilidad de Infraestructura**: No new tech introduced; extends existing Nginx/Django/React/MySQL/Redis — **PASS**
- [x] **X. Regla Suprema**: Maintainability (clear service layer) > Security (JWT + validation) > Scalability (Redis + async) — **PASS**
- [x] **XI. Configuración Dinámica**: Sector, subsección, tipo in Django admin models; can be edited without code change — **PASS** (FR-006, FR-019)

**GATE RESULT: ✅ PASS** — Feature design aligns with all 11 Constitution principles.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-mejoras-hallazgos/
├── spec.md                    # Feature specification (8 user stories P1–P8)
├── plan.md                    # This file (implementation planning)
├── research.md                # Phase 0 output (dependency/best-practices research)
├── data-model.md              # Phase 1 output (Django model definitions)
├── quickstart.md              # Phase 1 output (validation scenarios VS-01–VS-08)
├── contracts/
│   ├── rest-api.md            # Phase 1 output (API endpoint specs)
│   └── websocket.md           # Phase 1 output (WebSocket protocol for chat + notifications)
├── checklists/
│   ├── requirements.md        # Feature requirements checklist (✅ PASS)
│   └── spec-review.md         # [Existing]
└── tasks.md                   # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── apps/
│   ├── hallazgos/
│   │   ├── models.py          # Hallazgo (sector, subsection, tipo fields); SectorCatalog, SubsectionCatalog, TipoCatalog models
│   │   ├── serializers.py     # HallazgoSerializer (with sector/subsection validation), HallazgoCreateSerializer
│   │   ├── views.py           # HallazgoViewSet with list filters by sector/subsection/tipo/estado
│   │   ├── services.py        # hallazgo_service (crear_hallazgo, actualizar, etc.) — business logic
│   │   ├── permissions.py     # [Existing] Role-based permissions
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── analisis_cinco_porques/  # NEW APP
│   │   ├── models.py          # AnalisisCincoPorques, PorqueState enum (pendiente/aprobado/rechazado)
│   │   ├── serializers.py     # PorqueSerializer, PorqueCreateSerializer
│   │   ├── views.py           # PorqueViewSet (create, list, approve, reject)
│   │   ├── services.py        # analysis_service (crear_porque, aprobar, rechazar)
│   │   ├── permissions.py     # PorquePermission (admin approves, responsables can create)
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── contacto_externo/        # NEW APP
│   │   ├── models.py          # ContactoExterno (nombre, telefono, email, hallazgo FK)
│   │   ├── serializers.py     # ContactoExternoSerializer
│   │   └── migrations/
│   │
│   ├── archivos/              # [Existing, extended]
│   │   ├── models.py          # Archivo (add polymorphic FK or generic FK for multiple entity types)
│   │   ├── serializers.py     # ArchivoSerializer with preview_url field
│   │   ├── validators.py      # Whitelist MIME types, file size (from settings)
│   │   └── urls.py            # File upload/download/preview endpoints
│   │
│   ├── catalogos/               # NEW APP (dynamic configuration)
│   │   ├── models.py          # SectorCatalog, SubsectionCatalog, TipoCatalog
│   │   ├── serializers.py     # CatalogSerializer
│   │   ├── views.py           # CatalogViewSet (admin-only CRUD)
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── solicitud_cambio_responsable/  # NEW APP
│   │   ├── models.py          # SolicitudCambioResponsable (responsable, tipo: agregar/cambiar, usuario_propuesto, estado)
│   │   ├── serializers.py     # SolicitudSerializer
│   │   ├── views.py           # SolicitudViewSet (create, list, approve, reject)
│   │   ├── services.py        # solicitud_service (crear, aprobar, rechazar)
│   │   ├── permissions.py     # SolicitudPermission (responsables can create, admin approves)
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── notificaciones/        # [Existing, extended]
│   │   ├── models.py          # Notificacion (add tipo field for categorization: cierre_pendiente, aprobacion_porque_pendiente, cambio_responsable_pendiente, asignado_responsable, mensaje_urgente)
│   │   ├── consumers.py       # [Existing WebSocket consumer + extend for notification categorization]
│   │   ├── services.py        # notification_service (create por tipo, dispatch WebSocket)
│   │   └── urls.py
│   │
│   ├── chat/                  # [Existing, extended]
│   │   ├── models.py          # Mensaje (add archivo FK/M2M, has_urgente flag, parsed on save)
│   │   ├── consumers.py       # [Existing ChatConsumer + extend to detect #urgente case-insensitive]
│   │   └── services.py        # chat_service (crear_mensaje, detect_urgente, dispatch notification)
│   │
│   └── [other existing apps...]
│
├── config/
│   ├── settings/
│   │   ├── base.py            # Add CATALOGS setting (SectorCatalog, SubsectionCatalog, TipoCatalog model paths); FILE_UPLOAD_WHITELIST
│   │   ├── development.py     # [Existing]
│   │   └── production.py      # [Existing]
│   ├── asgi.py                # [Existing; verify ProtocolTypeRouter includes all consumers]
│   └── urls.py                # Include all new app URLs
│
└── requirements/              # [Existing; may add react-pdf, pdf.js, drag-drop deps]

frontend/
├── src/
│   ├── components/
│   │   ├── HallazgoForm/      # Extended with sector + subsection fields (conditional)
│   │   ├── ContactoExternoForm/  # NEW: conditional fields for Reclamo cliente
│   │   ├── AnalisisCincoPorques/ # NEW: component tree for timeline view
│   │   │   ├── PorqueCard.jsx
│   │   │   ├── PorqueForm.jsx (with drag-drop + click upload)
│   │   │   └── PorqueApprovalPanel.jsx
│   │   ├── FileUploader/      # NEW: reusable component (drag-drop + click)
│   │   ├── FilePreviewModal/  # NEW: inline preview (images/PDFs)
│   │   ├── ResponsableSelector/  # Extended with toggle UI
│   │   ├── SolicitudCambioForm/  # NEW
│   │   ├── NotificacionPanel/    # Extended with sections (Cierres, Porqués, Cambios responsable, Urgentes)
│   │   └── ChatWithFiles/        # Extended with file upload UI
│   │
│   ├── api/
│   │   ├── hallazgos.js       # createHallazgo, etc. (extended params: sector, subsection, contacto_externo)
│   │   ├── catalogos.js       # NEW: getCatalogos (GET /api/v1/catalogos/)
│   │   ├── analisis.js        # NEW: createPorque, approvePorque, etc.
│   │   ├── archivos.js        # Extended: uploadFile, downloadFile, previewFile
│   │   ├── solicitudes.js     # NEW: createSolicitud, approveSolicitud, etc.
│   │   └── chat.js            # Extended: sendMessageWithFile, detectUrgente
│   │
│   ├── hooks/
│   │   ├── useCatalog.js      # NEW: fetch + cache sector/subsection/tipo catalogs
│   │   ├── useFileUpload.js   # NEW: handle drag-drop + click file selection
│   │   └── [existing hooks]
│   │
│   ├── pages/
│   │   ├── hallazgos/
│   │   │   ├── CrearHallazgoPage.jsx      # Extended with sector/subsection/contacto
│   │   │   ├── HallazgoDetailPage.jsx     # Extended with 5 porqués section + responsables panel
│   │   │   └── [existing pages]
│   │   │
│   │   ├── notificaciones/
│   │   │   └── NotificacionesPage.jsx     # Extended with categorized sections
│   │   │
│   │   └── [existing pages]
│   │
│   └── context/
│       ├── CatalogoContext.jsx    # NEW: global sector/subsection/tipo catalogs
│       └── [existing contexts]

nginx/
└── nginx.conf                 # [Verify CORS headers allow OPTIONS for file uploads]
```

---

## Phase 0: Outline & Research

**Gate**: Constitution Check **✅ PASS**

**Research Tasks** (resolve unknowns from Technical Context):

### R-001: Dynamic Catalog Patterns
**Unknown**: Cómo modelar catálogos editables sin hardcode.  
**Task**: Investigar patrones en Django Admin para CRUD de catálogos (SectorCatalog, SubsectionCatalog, TipoCatalog models); definir cómo serializar y servir a React; considerar caching en Redis para performance.  
**Deliverable**: research.md secc. Catalog Management

### R-002: Polymorphic File Storage
**Unknown**: Arquitectura para adjuntos en múltiples entidades (Hallazgo, Porqué, Mensaje).  
**Task**: Comparar opciones: (A) tabla Archivo con FK genérico (content_type + object_id), (B) FK específicas por entidad (archivo_hallazgo, archivo_porque), (C) JSON field en cada entidad. Evaluar según performance, auditabilidad y mantenibilidad.  
**Deliverable**: research.md secc. File Storage Architecture

### R-003: PDF Viewer in React
**Unknown**: Mejor librería para previsualización de PDFs inline.  
**Task**: Comparar react-pdf vs pdfjs-dist; evaluar bundle size, browser compatibility, offline support. Definir fallback para archivos no previsualizable.  
**Deliverable**: research.md secc. PDF Viewer Options

### R-004: Real-Time Notifications at Scale
**Unknown**: Cómo enviar notificaciones categorizadas en tiempo real a admins sin saturar WebSocket.  
**Task**: Definir estrategia: (A) WebSocket por categoría (notif_admin_cierre, notif_admin_porque, notif_admin_cambio), (B) una conexión con tipos de mensaje categorizados, (C) polling con Cache-Control headers. Evaluar según latencia y ancho de banda.  
**Deliverable**: research.md secc. Real-Time Notification Strategy

### R-005: Case-Insensitive #urgente Detection
**Unknown**: Implementación eficiente en Django.  
**Task**: Definir regex (`(?i)#urgente` en Python) vs. normalizar antes de guardar (lower()) vs. custom field lookup. Evaluar según performance y semantics.  
**Deliverable**: research.md secc. Case-Insensitive Tag Detection

**Output**: `research.md` con decisiones documentadas en cada sección.

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

### 1. Data Model (`data-model.md`)

**Core Entities**:

#### Sector & Catalog Models
```
SectorCatalog(id, codigo, nombre, descripcion, activo)
    └─ valores: "Reclamo cliente", "Proveedor", "Interno"
    └─ editable vía Django Admin

SubsectionCatalog(id, sector_codigo, codigo, nombre, activo)
    └─ valores por sector "Interno": Administración, Compras, ...
    └─ editable vía Django Admin

TipoCatalog(id, codigo, nombre, activo)
    └─ valores: NO_CONFORMIDAD, OPORTUNIDAD_MEJORA, QUEJA_CLIENTE
    └─ editable vía Django Admin
```

#### Hallazgo (Extended)
```
Hallazgo(
    id, 
    descripcion, 
    ubicacion, 
    creado_por_FK(Usuario),
    sector_FK(SectorCatalog),           # NEW
    subseccion_FK(SubsectionCatalog),   # NEW (nullable, req si sector=Interno)
    tipo_FK(TipoCatalog),               # NEW (moved from tipo = enum)
    estado,
    fecha_creacion,
    responsables_M2M(Usuario through HallazgoResponsable),  # [Existing]
    ...
)
    └─ Validación: si sector.codigo = "Interno" → subseccion required
    └─ Validación: tipo ortogonal a sector (sin restricciones)
    └─ ContactoExterno OneToOne (nullable, solo para sector="Reclamo cliente" by admin)
```

#### ContactoExterno (New)
```
ContactoExterno(
    id,
    hallazgo_FK(Hallazgo, OneToOne),
    nombre_empresa,
    telefono,
    email,
    fecha_creacion
)
    └─ Inmutable post-creación
    └─ Visible para todos los usuarios con acceso al hallazgo
```

#### AnalisisCincoPorques (New)
```
AnalisisCincoPorques(
    id,
    hallazgo_FK(Hallazgo),
    texto_causa,
    autor_tipo ENUM(admin, responsable),
    autor_id_FK(Usuario),
    estado ENUM(pendiente, aprobado, rechazado),
    fecha_creacion,
    fecha_aprobacion (nullable),
    aprobado_por_FK(Usuario, nullable),  # quien aprobó (si autor != admin)
    observacion_rechazo (nullable)
)
    └─ Si autor=admin: estado="aprobado" automático (no requiere aprobación)
    └─ Si autor=responsable: estado="pendiente"; requiere aprobación de admin
    └─ Archivo M2M (Archivo through AnalisisPorqueArchivo)
    └─ Visualización: timeline en orden de creacion
```

#### Archivo (Extended)
```
Archivo(
    id,
    nombre,
    archivo_file,
    tipo_mime,
    tamanio,
    fecha_carga,
    cargado_por_FK(Usuario),
    # Polimórfico (option A: content_type)
    content_type_FK(ContentType),
    object_id,
    # O specific FKs (option B)
    hallazgo_FK (nullable),
    porqueFK (nullable),
    mensaje_chat_FK (nullable)
)
    └─ Validación: tipo_mime en whitelist (settings.FILE_UPLOAD_WHITELIST)
    └─ Validación: tamanio <= settings.MAX_FILE_SIZE
    └─ Previsualización: URL field para servir desde backend
```

#### Mensaje (Extended Chat)
```
Mensaje(
    id,
    chat_FK(Chat),
    autor_FK(Usuario),
    contenido_texto,
    tiene_urgente BOOL,  # parsed on save: regex case-insensitive #urgente
    archivo_M2M(Archivo),
    fecha_hora,
    ...
)
    └─ Pre-save: detectar "#urgente" (case-insensitive), set tiene_urgente=True
    └─ Signal: si tiene_urgente, disparar notificación a todos los participantes
```

#### SolicitudCambioResponsable (New)
```
SolicitudCambioResponsable(
    id,
    hallazgo_FK(Hallazgo),
    responsable_solicitante_FK(Usuario),
    tipo ENUM(agregar_responsable, cambiar_responsable),
    usuario_propuesto_FK(Usuario),
    observacion_solicitante,
    estado ENUM(pendiente, aprobada, rechazada, anulada),
    fecha_creacion,
    fecha_resolucion (nullable),
    resuelto_por_FK(Usuario, nullable),  # quien aprobó/rechazó
    observacion_resolucion (nullable),
    UNIQUE(hallazgo, responsable_solicitante, estado='pendiente')  # 1 pending per hallazgo+responsable
)
    └─ Signal: si responsable removido y solicitud pendiente → anulada
    └─ Signal: si aprobada tipo=agregar → agregar usuario_propuesto a responsables
    └─ Signal: si aprobada tipo=cambiar → remover responsable_solicitante, agregar usuario_propuesto
```

#### Notificacion (Extended)
```
Notificacion(
    id,
    destinatario_FK(Usuario),
    tipo ENUM(
        cierre_pendiente,              # Solicitud de cierre de hallazgo
        aprobacion_porque_pendiente,    # Porqué pendiente de aprobación
        cambio_responsable_pendiente,  # Solicitud de cambio de responsable
        asignado_responsable,          # Te asignaron como responsable
        mensaje_urgente,               # Mensaje con #urgente en chat
        [otros]
    ),
    hallazgo_FK (nullable),
    mensaje_chat_FK (nullable),
    solicitud_cambio_responsable_FK (nullable),
    titulo,
    contenido,
    leida BOOL,
    fecha_creacion,
    fecha_lectura (nullable),
    enlace_destino (URL para navegar al hallazgo/porqué/etc.)
)
    └─ Query para panel admin: filter(destinatario, tipo in [cierre_pendiente, aprobacion_porque_pendiente, cambio_responsable_pendiente])
    └─ Query para panel empleado: filter(destinatario, tipo in [asignado_responsable, mensaje_urgente])
```

**Output**: `data-model.md` con diagrama ER y definiciones de campos/relaciones.

---

### 2. API Contracts (`contracts/rest-api.md`)

**Endpoints Summary**:

#### Hallazgos (Extended)
```
POST   /api/v1/hallazgos/
       Body: descripcion, ubicacion, sector (req), subseccion (req si sector=Interno), tipo (req), 
             contacto_externo {nombre, telefono, email} (opt, solo admin + sector=Reclamo cliente)
       Response: Hallazgo con sector, subseccion, tipo, contacto_externo

GET    /api/v1/hallazgos/?sector=...&subseccion=...&tipo=...&estado=...
       Filters independientes, combinables

GET    /api/v1/hallazgos/{id}/
       Response: Hallazgo completo con sector, subseccion, tipo, contacto_externo
```

#### Catálogos (New)
```
GET    /api/v1/catalogos/sectores/
       Response: [{ id, codigo, nombre, activo }]

GET    /api/v1/catalogos/subsecciones/?sector=Interno
       Response: [{ id, sector_codigo, codigo, nombre, activo }]

GET    /api/v1/catalogos/tipos/
       Response: [{ id, codigo, nombre, activo }]

POST   /api/v1/catalogos/sectores/          (admin-only)
PATCH  /api/v1/catalogos/sectores/{id}/     (admin-only)
DELETE /api/v1/catalogos/sectores/{id}/     (admin-only)
       [Similar for subsecciones, tipos]
```

#### Análisis de 5 Porqués (New)
```
POST   /api/v1/hallazgos/{hallazgo_id}/porques/
       Body: texto_causa, archivos[] (opcional)
       Behavior: si autor=admin → estado=aprobado; si autor=responsable → estado=pendiente
       Response: PorqueSerializer con estado

GET    /api/v1/hallazgos/{hallazgo_id}/porques/
       Response: [{ id, texto, estado, autor_tipo, fecha }] en orden de creación

PATCH  /api/v1/hallazgos/{hallazgo_id}/porques/{porque_id}/approve/
       Body: {} (solo admin)
       Response: Porque actualizado con estado=aprobado

PATCH  /api/v1/hallazgos/{hallazgo_id}/porques/{porque_id}/reject/
       Body: observacion (opcional)
       Response: Porque actualizado con estado=rechazado
```

**Output**: `contracts/rest-api.md` con definiciones completas de endpoints, schemas, validaciones.

---

### 3. WebSocket Protocol (`contracts/websocket.md`)

```
Connection: ws://localhost/ws/chat/{hallazgo_id}/?token=JWT_TOKEN
Connection: ws://localhost/ws/notificaciones/?token=JWT_TOKEN

[Full protocol definition with message types, auth, groups]
```

**Output**: `contracts/websocket.md` con protocol specifications completas.

---

### 4. Quickstart Validation (`quickstart.md`)

**Scenarios**: VS-01 through VS-08 con pasos detallados, curl commands, flujos de validación.

**Output**: `quickstart.md` con validación completa de spec.

---

### 5. Update Agent Context

Update `.github/copilot-instructions.md` para apuntar a `specs/003-mejoras-hallazgos/plan.md`

---

## Phase 1 Post-Design: Re-evaluate Constitution Check

**GATE RESULT: ✅ PASS** — Design ready for task generation.

---

## Key Design Decisions

1. **Sector & Tipo Independence** (Q2): Dimensiones ortogonales, sin restricciones cruzadas
2. **Auto-approval for Admin Porqués** (Q1): Admin auto-aprueba, responsables en "pendiente"
3. **Admin Panel Categorization** (Q3): Secciones separadas por tipo de pendiente
4. **Case-Insensitive #urgente** (Q4): Regex `(?i)#urgente` en cualquier capitalización
5. **File Adjuntion Methods** (Q5): Click + drag-drop globalmente soportados
6. **Dynamic Catalogs**: Tablas editables vía Django Admin (Principios II, XI Constitution)

---

## Timeline Estimate

- **Phase 0 (Research)**: 2–3 days
- **Phase 1 (Design + Contracts)**: 3–4 days
- **Phase 2–7 (Implementation)**: 20–25 days
- **Total**: 25–32 days (1 dev full-time)

---

## Success Criteria Alignment

✅ All 7 measurable outcomes from spec achievable with this design.

---

**Status**: Draft (pending Phase 0 research execution)  
**Next Step**: `/speckit.tasks` to generate actionable development tasks

backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
