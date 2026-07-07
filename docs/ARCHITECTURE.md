# System Architecture: ProyectoDaltec Hallazgos Management

**Last Updated**: 2026-07-05  
**Status**: Production-Ready  
**Version**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Data Model](#data-model)
4. [Service Layer Architecture](#service-layer-architecture)
5. [API Design](#api-design)
6. [WebSocket Architecture](#websocket-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Deployment Architecture](#deployment-architecture)
9. [Performance Characteristics](#performance-characteristics)
10. [Security Considerations](#security-considerations)

---

## Overview

ProyectoDaltec is a comprehensive **findings management system** (hallazgos) for organizational quality and compliance. It enables:

- **Findings Classification**: Sector-based organization (Client Complaint, Provider, Internal) with optional subsection categorization
- **Root Cause Analysis**: 5-Why analysis (análisis cinco porqués) with admin approval workflow
- **Responsibility Management**: Dynamic responsible party assignment with change request workflow
- **Real-time Communication**: Chat system with attachment support and urgent message notifications
- **Categorized Notifications**: Role-based notification panels (Admin vs Employee)

**Principles**:
- Findings are **organizational** (spanning multiple users)
- Users can have **multiple roles** (Admin, Empleado, Cliente)
- **Actions** and **Notifications** cascade from findings
- **Catalogs** are business-configurable (not hardcoded)

---

## System Components

### Backend Stack

```
┌─────────────────────────────────────────────┐
│ Django 4.2 (Python 3.11)                    │
├─────────────────────────────────────────────┤
│ • Django REST Framework (DRF) - API Layer   │
│ • Django Channels 4 - WebSocket Support     │
│ • djangorestframework-simplejwt - JWT Auth  │
│ • MySQL 8 - Relational Database             │
│ • Redis 7 - Cache + Channel Layer           │
│ • Celery (optional) - Async Tasks           │
└─────────────────────────────────────────────┘
```

### Frontend Stack

```
┌─────────────────────────────────────────────┐
│ React 18 (JavaScript/JSX)                   │
├─────────────────────────────────────────────┤
│ • React Router 6 - Client-side Routing      │
│ • Axios - HTTP Client                       │
│ • Context API - State Management            │
│ • Hooks - Component Logic                   │
│ • WebSocket API - Real-time Updates         │
│ • React PDF/pdfjs - File Preview            │
└─────────────────────────────────────────────┘
```

### Infrastructure

```
┌──────────────────────────────────────────┐
│ Docker Compose (Development)             │
│ Kubernetes/Docker Swarm (Production)     │
├──────────────────────────────────────────┤
│ • Nginx - Reverse Proxy & Static Files   │
│ • Backend Container - Django + Channels  │
│ • Frontend Container - React Build       │
│ • MySQL Container - Database             │
│ • Redis Containers - Cache + Channels    │
└──────────────────────────────────────────┘
```

---

## Data Model

### Core Entities

#### Hallazgo (Finding)
```python
Hallazgo:
  - titulo: str
  - descripcion: str
  - tipo: Enum (NO_CONFORMIDAD, OPORTUNIDAD_MEJORA, QUEJA_CLIENTE) # Orthogonal dimension
  - estado: Enum (ABIERTO, PENDIENTE_CIERRE, CERRADO)
  - sector: FK → SectorCatalog # NEW: Sector classification
  - subseccion: FK → SubsectionCatalog (nullable) # NEW: Conditional on sector
  - tipo_clasificacion: FK → TipoCatalog # NEW: Replaces old tipo enum
  - creado_por: FK → User
  - responsables: M2M → User # Dynamic responsibility
  - fecha_creacion: datetime
  - fecha_cierre: datetime (nullable)
  - accionados: reverse FK from Accion
  - chats: reverse FK from Chat
  - porques: reverse FK from AnalisisCincoPorques
  - archivos: reverse FK from Archivo
  - notificaciones: reverse FK from Notificacion
```

#### AnalisisCincoPorques (5-Why Analysis)
```python
AnalisisCincoPorques:
  - hallazgo: FK → Hallazgo (unique)
  - porque_1 to porque_5: str
  - autor_tipo: Enum (ADMIN, RESPONSABLE)
  - estado: Enum (PENDIENTE_APROBACION, APROBADO, RECHAZADO)
  - observacion_aprobacion: str
  - observacion_rechazo: str
  - aprobado_por: FK → User
  - fecha_creacion: datetime
  - fecha_aprobacion: datetime
```

#### SolicitudCambioResponsable (Change Request)
```python
SolicitudCambioResponsable:
  - hallazgo: FK → Hallazgo
  - solicitante: FK → User (must be responsable)
  - tipo: Enum (AGREGAR_RESPONSABLE, CAMBIAR_RESPONSABLE)
  - usuario_propuesto: FK → User
  - estado: Enum (PENDIENTE, APROBADA, RECHAZADA, ANULADA)
  - observacion_solicitud: str
  - observacion_rechazo: str
  - aprobado_por: FK → User
  - fecha_solicitud: datetime
  - fecha_respuesta: datetime
```

#### Chat & Mensaje
```python
Chat:
  - hallazgo: OneToOne → Hallazgo
  - participantes: M2M → User
  
Mensaje:
  - chat: FK → Chat
  - autor: FK → User
  - contenido: str
  - tiene_urgente: bool (indexed) # NEW: Detects #urgente regex
  - fecha_hora: datetime
  - archivos: M2M → Archivo
```

#### Notificacion (Notification)
```python
Notificacion:
  - titulo: str
  - mensaje: str
  - tipo: Enum (cierre_pendiente, aprobacion_porque_pendiente,
               cambio_responsable_pendiente, asignado_responsable,
               mensaje_urgente) # NEW: Categorized by type
  - leida: bool (indexed)
  - destinatario: FK → User (indexed)
  - hallazgo_relacionado: FK → Hallazgo (nullable)
  - fecha: datetime
```

### Relationship Diagram

```
Hallazgo (Finding)
├── 1:N → Accion (Action)
├── 1:1 → Chat
│   └── 1:N → Mensaje
│       ├── M2M → Archivo
│       └── [tiene_urgente] → Triggers Notificacion
├── 1:1 → AnalisisCincoPorques (5-Why)
│   └── [estado=APROBADO] → Auto-creates Notificacion
├── 1:N → SolicitudCambioResponsable
│   └── [estado=APROBADA] → Updates M2M responsables + Chat participantes
├── M2M → User (responsables)
│   └── [on_remove] → Auto-cancels pending SolicitudCambioResponsable
├── M2M → Archivo (file attachments)
├── 1:N → Notificacion (outbound)
├── 1:N ← Notificacion (inbound to users)
├── FK → SectorCatalog
├── FK → SubsectionCatalog (conditional)
└── FK → TipoCatalog
```

---

## Service Layer Architecture

All business logic is encapsulated in **service classes** following a standardized pattern:

### Pattern

```python
class ExampleService:
    """Encapsulates business logic for Example domain."""
    
    @staticmethod
    @transaction.atomic
    def create_or_update(obj, **data):
        """Atomic operation with validation and signal dispatch."""
        # 1. Validate inputs
        # 2. Perform business logic
        # 3. Save to database (triggers signals)
        # 4. Return result
        pass
    
    @staticmethod
    def _require_permission(user, required_permission):
        """Helper for permission checks (raises PermissionDenied)."""
        pass
```

### Implemented Services

1. **HallazgoService** (`apps/hallazgos/services.py`)
   - `create_with_classification()` - Create hallazgo with sector/subseccion validation
   - `update_estado()` - Update hallazgo state with cascading actions

2. **SectorService** (`apps/catalogos/services/sector_service.py`)
   - `get_sectors_cached()` - Fetch sectors from cache (invalidated on update)
   - `validate_sector_subseccion_pair()` - Validate sector + subseccion combination

3. **AnalisisCincoPorquesService** (`apps/analisis_cinco_porques/services.py`)
   - `create()` - Create 5-why analysis
   - `approve()` - Approve with validation (triggers auto-notification)
   - `reject()` - Reject with reason

4. **SolicitudCambioResponsableService** (`apps/solicitud_cambio_responsable/services.py`)
   - `create()` - Create change request (solicitante validation)
   - `approve()` - Execute responsibility change (M2M + chat updates)
   - `reject()` - Reject with reason

5. **NotificacionService** (`apps/notificaciones/services.py`)
   - `create()` - Create notification with tipo categorization
   - `dispatch_to_user()` - Send via WebSocket to notificaciones_{user_id} group

---

## API Design

### REST Endpoints

#### Hallazgos
```
GET    /api/v1/hallazgos/                              # List (filterable by sector, tipo)
POST   /api/v1/hallazgos/                              # Create
GET    /api/v1/hallazgos/{id}/                         # Detail
PATCH  /api/v1/hallazgos/{id}/                         # Update
DELETE /api/v1/hallazgos/{id}/                         # Delete (admin only)
```

#### Análisis Cinco Porqués
```
GET    /api/v1/hallazgos/{hallazgo_id}/porques/        # List
POST   /api/v1/hallazgos/{hallazgo_id}/porques/        # Create
PATCH  /api/v1/hallazgos/{hallazgo_id}/porques/{id}/approve/   # Approve
PATCH  /api/v1/hallazgos/{hallazgo_id}/porques/{id}/reject/    # Reject
```

#### Solicitud Cambio Responsable
```
GET    /api/v1/hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/   # List
POST   /api/v1/hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/   # Create
PATCH  /api/v1/hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/approve/   # Approve
PATCH  /api/v1/hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/reject/    # Reject
```

#### Notificaciones
```
GET    /api/v1/notificaciones/                         # List (filterable by tipo, leida)
PATCH  /api/v1/notificaciones/{id}/marcar-leida/      # Mark as read
POST   /api/v1/notificaciones/marcar-todas-leidas/    # Mark all as read
```

### Request/Response Format

```json
// Create Hallazgo (POST /api/v1/hallazgos/)
Request:
{
  "titulo": "Non-conformity in QA",
  "descripcion": "...",
  "tipo": "NO_CONFORMIDAD",
  "sector_codigo": "PROVEEDOR",
  "subseccion_codigo": null,
  "tipo_clasificacion_codigo": "PROC_01"
}

Response (201):
{
  "id": 42,
  "titulo": "Non-conformity in QA",
  "estado": "ABIERTO",
  "sector": { "codigo": "PROVEEDOR", "nombre": "Proveedor" },
  "subseccion": null,
  "tipo_clasificacion": { "codigo": "PROC_01", "nombre": "Procesos" },
  "responsables": [],
  "creado_por": { "id": 1, "nombre": "Admin", "apellido": "User" },
  "fecha_creacion": "2026-07-05T10:30:00Z"
}
```

---

## WebSocket Architecture

### Connection Setup

```
Client connects to: ws://api.daltec.local/ws/notificaciones/

1. Client → Server: WebSocket connect handshake
2. Server (NotificacionConsumer):
   - Authenticate user from token
   - Add to group: notificaciones_{user_id}
   - Accept connection
   - Send: { "type": "connection_established", "message": "Connected" }

3. Server can now send events to this user's group
```

### Event Types

#### Notification Events
```json
// New notification
{
  "type": "notificacion.nueva",
  "payload": {
    "id": 123,
    "titulo": "Cambio de responsable pendiente",
    "mensaje": "John Doe solicita agregar a Jane Smith",
    "tipo": "cambio_responsable_pendiente",
    "leida": false,
    "fecha": "2026-07-05T10:30:00Z"
  }
}

// Notification marked as read
{
  "type": "notificacion.marca_leida",
  "payload": {
    "id": 123,
    "leida": true
  }
}
```

#### Chat Events
```json
// Urgent message indicator
{
  "type": "chat_message.urgent",
  "payload": {
    "chat_id": 42,
    "mensaje_id": 456,
    "tiene_urgente": true,
    "notificacion_id": 789  // Link to notification
  }
}
```

### Group Naming Convention

```
notificaciones_{user_id}     # Personal notification stream for user
chat_{hallazgo_id}           # Chat room for hallazgo (optional future expansion)
```

---

## Authentication & Authorization

### JWT Token Flow

```
1. Client sends login credentials
   POST /api/v1/auth/login/ { username, password }

2. Server returns tokens
   { "access": "...", "refresh": "..." }

3. Client stores tokens in localStorage and sends in Authorization header
   Authorization: Bearer <access_token>

4. Server validates JWT in every protected request
   - Extracts user_id from token
   - Checks token expiration (15 min)
   - If expired, client uses refresh token to get new access token

5. Refresh token rotates (7 days expiration)
   POST /api/v1/auth/token/refresh/ { refresh: "..." }
```

### Role-Based Access Control (RBAC)

#### User Types
- **ADMIN**: Full system access, approves 5-why, manages catalogs
- **EMPLEADO**: Create findings, add 5-why (pending approval), manage owned findings
- **CLIENTE**: Create complaints, view related findings

#### Permission Matrix

| Action | ADMIN | EMPLEADO | CLIENTE |
|--------|-------|----------|---------|
| Create Hallazgo | ✅ | ✅ | ✅ (complaint only) |
| Approve 5-Why | ✅ | ❌ | ❌ |
| Approve Change Request | ✅ | ❌ | ❌ |
| Download File | ✅ (any) | ✅ (owned) | ✅ (owned) |
| Manage Catalogs | ✅ | ❌ | ❌ |
| View Notifications (Admin Panel) | ✅ | ❌ | ❌ |
| View Notifications (Employee Panel) | ❌ | ✅ | ❌ |

---

## Deployment Architecture

### Development (Docker Compose)

```
Host Machine
├── Docker
│   ├── Backend Container (Django)
│   │   ├── Port 8000: HTTP server
│   │   ├── Port 8001: WebSocket (development)
│   │   └── Volume: /app/backend
│   │
│   ├── Frontend Container (Node + React)
│   │   ├── Port 3000: Dev server (hot reload)
│   │   └── Volume: /app/frontend
│   │
│   ├── Nginx Container
│   │   ├── Port 80: HTTP reverse proxy
│   │   └── Port 443: HTTPS (if configured)
│   │
│   ├── MySQL Container
│   │   ├── Port 3306: Database
│   │   └── Volume: mysql_data (persistent)
│   │
│   └── Redis Containers (× 2)
│       ├── redis_cache: Port 6379 (cache layer)
│       └── redis_channels: Port 6380 (WebSocket channel layer)
│
└── Volumes: mysql_data, frontend_build, logs
```

### Production (Kubernetes / Docker Swarm)

```
Load Balancer (ALB / HAProxy)
├── Ingress Controller
│   └── API Gateway
│
├── Backend Pods (replicas: 3)
│   ├── Django + Channels (stateless)
│   ├── CPU: 500m, Memory: 1Gi
│   └── Health check: /health/
│
├── Frontend Service
│   ├── React Static Assets (CDN or Nginx)
│   └── Served from /app/frontend/dist/
│
├── MySQL (managed service)
│   ├── Replication enabled
│   ├── Backups: daily + point-in-time
│   └── CPU: 2000m, Memory: 4Gi
│
├── Redis (Redis Cluster)
│   ├── 3 primary + 3 replica
│   ├── Automatic failover enabled
│   └── Persistence: RDB snapshots
│
└── Logging Aggregation
    ├── Fluentd / Logstash
    ├── Elasticsearch / CloudWatch
    └── Kibana / Dashboard
```

---

## Performance Characteristics

### Target SLAs

| Metric | Target | Method |
|--------|--------|--------|
| API Response Time (p95) | < 200ms | Load testing + monitoring |
| WebSocket Notification Latency | < 3s | End-to-end test |
| File Upload Speed | < 10s (50MB) | Client-side progress tracking |
| Concurrent Users | 100+ per instance | Redis pub/sub scaling |
| Database Query Time | < 50ms (p99) | Query optimization + indexing |

### Optimization Strategies

1. **Database Indexing**
   - Foreign keys: indexed by default (Django ORM)
   - Commonly filtered fields: `tipo`, `leida`, `estado` have indexes
   - Composite indexes on `(destinatario, leida)` for notification filtering

2. **Query Optimization**
   - Use `select_related()` for FK relationships
   - Use `prefetch_related()` for M2M relationships
   - Pagination: default 20 items per page

3. **Caching**
   - Catalog data (sectors, subsecciones, tipos) cached in Redis (TTL: 24 hours)
   - Cache invalidated on create/update via signals
   - Session data cached in Redis

4. **Frontend Optimization**
   - Code splitting: Chat component lazy-loaded
   - Tree-shaking: Remove unused pdfjs-dist code
   - Image compression: Files served via CDN
   - Minification: Production build with Vite/Create React App

---

## Security Considerations

### Input Validation

- All user inputs validated at serializer level (DRF)
- File uploads validated: MIME type whitelist (settings.FILE_UPLOAD_WHITELIST)
- File size limits enforced (max 50MB)
- SQL injection prevention: ORM parameterized queries
- XSS prevention: React auto-escaping + Content Security Policy

### Data Protection

- Passwords: bcrypt hashing (Django default)
- Sensitive data: encrypted at rest (optional: Django-cryptography)
- Transit: HTTPS only (SECURE_SSL_REDIRECT=True in production)
- JWT tokens: Secure, HTTPOnly cookies (in production)

### Authorization

- Every endpoint checks `request.user` permissions
- Viewset-level permission classes (DRF)
- Service layer validates user permissions before operations
- Audit logging for sensitive operations

### CSRF & CORS

- CSRF tokens on all POST/PATCH/DELETE endpoints
- CORS allowed only for frontend origin (production domain)
- Cookies: SameSite=Strict

---

## Future Considerations

1. **Async Processing**: Celery for heavy file processing, batch notifications
2. **Audit Trail**: Comprehensive versioning of all entity changes
3. **Metrics**: Application Performance Monitoring (APM) integration
4. **Localization**: Multi-language support (i18n)
5. **Mobile App**: React Native client for iOS/Android
6. **Analytics**: Business intelligence dashboards
7. **Workflow Engine**: Complex multi-step approval chains
8. **API Rate Limiting**: Per-user or IP-based throttling
