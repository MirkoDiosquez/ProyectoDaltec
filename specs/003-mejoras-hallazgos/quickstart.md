# Quickstart: Validation Scenarios

**Date**: 2026-07-05 | **Feature**: specs/003-mejoras-hallazgos | **Status**: Complete

---

## Overview

This document provides 8 end-to-end validation scenarios (VS-01–VS-08) that prove each feature works as designed. Each scenario includes setup steps, test commands (curl + React snippets), expected outputs, and success criteria.

**Prerequisites**:
- Backend running: `python manage.py runserver` (or gunicorn)
- Frontend running: `npm start`
- MySQL: Test database populated with fixtures
- Redis: Running for WebSocket channel layer
- JWT token available for API calls

---

## Setup

### 1. Load Catalogs Fixture

```bash
cd backend
python manage.py loaddata specs/003-mejoras-hallazgos/fixtures/catalogs.json
```

**catalogs.json**:
```json
[
  {
    "model": "catalogos.sectorcatalog",
    "pk": 1,
    "fields": {"codigo": "RECLAMO_CLIENTE", "nombre": "Reclamo cliente", "activo": true}
  },
  {
    "model": "catalogos.sectorcatalog",
    "pk": 2,
    "fields": {"codigo": "PROVEEDOR", "nombre": "Proveedor", "activo": true}
  },
  {
    "model": "catalogos.sectorcatalog",
    "pk": 3,
    "fields": {"codigo": "INTERNO", "nombre": "Interno", "activo": true}
  },
  {
    "model": "catalogos.subsectioncatalog",
    "pk": 5,
    "fields": {"sector_id": 3, "codigo": "ADMIN", "nombre": "Administración", "activo": true}
  },
  {
    "model": "catalogos.tipocatalog",
    "pk": 1,
    "fields": {"codigo": "NO_CONFORMIDAD", "nombre": "No Conformidad", "activo": true}
  },
  {
    "model": "catalogos.tipocatalog",
    "pk": 3,
    "fields": {"codigo": "QUEJA_CLIENTE", "nombre": "Queja del Cliente", "activo": true}
  }
]
```

### 2. Create Test Users

```bash
python manage.py shell

from django.contrib.auth.models import User
from apps.users.models import Usuario

admin = Usuario.objects.create(username='admin', role='admin')
responsable = Usuario.objects.create(username='responsable', role='responsable')
empleado = Usuario.objects.create(username='empleado', role='empleado')
```

### 3. Get JWT Tokens

```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin_password"}'

# Response:
# {"access": "eyJ0eXAiOiJKV1QiLCJhbGc...", "refresh": "..."}

export JWT_ADMIN="eyJ0eXAiOiJKV1QiLCJhbGc..."
export JWT_RESPONSABLE="eyJ0eXAiOiJKV1QiLCJhbGc..."
```

---

## VS-01: Admin Creates Hallazgo with Sector

**Scenario**: Admin creates a hallazgo for sector "Proveedor" without requiring subseccion (only "Interno" requires it).

**Expected**: Hallazgo created successfully with sector_id=2 (PROVEEDOR), subseccion=null.

**Steps**:

```bash
curl -X POST http://localhost:8000/api/v1/hallazgos/ \
  -H "Authorization: Bearer $JWT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Defecto en entrega de proveedor",
    "ubicacion": "Almacén central",
    "sector_codigo": "PROVEEDOR",
    "tipo_codigo": "NO_CONFORMIDAD"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1001,
  "descripcion": "Defecto en entrega de proveedor",
  "ubicacion": "Almacén central",
  "creado_por": {"id": 1, "nombre": "Admin"},
  "sector": {
    "id": 2,
    "codigo": "PROVEEDOR",
    "nombre": "Proveedor"
  },
  "subseccion": null,
  "tipo": {
    "id": 1,
    "codigo": "NO_CONFORMIDAD",
    "nombre": "No Conformidad"
  },
  "estado": "abierto",
  "responsables": [],
  "fecha_creacion": "2026-07-05T10:00:00Z"
}
```

**Success Criteria**:
- ✅ HTTP 201 response
- ✅ sector.codigo = "PROVEEDOR"
- ✅ subseccion = null (not required for PROVEEDOR)
- ✅ tipo.codigo = "NO_CONFORMIDAD"

---

## VS-02: Empleado Creates Hallazgo with Sector Interno (Required Subseccion)

**Scenario**: Empleado tries to create hallazgo with sector "Interno" but forgets subseccion. Should reject with 400 error.

**Expected**: Validation error requiring subseccion.

**Steps**:

```bash
curl -X POST http://localhost:8000/api/v1/hallazgos/ \
  -H "Authorization: Bearer $JWT_EMPLOYEE" \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Problema interno",
    "ubicacion": "Oficina",
    "sector_codigo": "INTERNO",
    "tipo_codigo": "OPORTUNIDAD_MEJORA"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Subseccion is required when sector is INTERNO",
    "details": {"subseccion": ["Required for sector INTERNO"]}
  }
}
```

**Success Criteria**:
- ✅ HTTP 400 response
- ✅ Error message mentions subseccion requirement
- ✅ Hallazgo NOT created in database

---

## VS-03: Admin Creates Hallazgo with External Contact

**Scenario**: Admin creates hallazgo with sector "Reclamo cliente" and includes external contact data (nombre_empresa, telefono, email). Only admin can set contacto_externo.

**Expected**: Hallazgo created with contacto_externo linked via OneToOne.

**Steps**:

```bash
curl -X POST http://localhost:8000/api/v1/hallazgos/ \
  -H "Authorization: Bearer $JWT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Queja de cliente XYZ",
    "ubicacion": "N/A",
    "sector_codigo": "RECLAMO_CLIENTE",
    "tipo_codigo": "QUEJA_CLIENTE",
    "contacto_externo": {
      "nombre_empresa": "XYZ Corporation",
      "telefono": "555-1234",
      "email": "complaint@xyz.com",
      "observacion": "Contact via email preferred"
    }
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1002,
  "descripcion": "Queja de cliente XYZ",
  "sector": {"codigo": "RECLAMO_CLIENTE"},
  "tipo": {"codigo": "QUEJA_CLIENTE"},
  "contacto_externo": {
    "id": 456,
    "nombre_empresa": "XYZ Corporation",
    "telefono": "555-1234",
    "email": "complaint@xyz.com",
    "observacion": "Contact via email preferred"
  },
  "estado": "abierto"
}
```

**Frontend Verification** (React component):
```jsx
function HallazgoDetailView({ hallazgoId }) {
  const [hallazgo, setHallazgo] = useState(null);
  
  useEffect(() => {
    api.get(`/hallazgos/${hallazgoId}/`).then(res => setHallazgo(res.data));
  }, [hallazgoId]);
  
  return (
    <div>
      {hallazgo?.contacto_externo && (
        <Card title="Contacto Externo">
          <p><strong>Empresa:</strong> {hallazgo.contacto_externo.nombre_empresa}</p>
          <p><strong>Teléfono:</strong> {hallazgo.contacto_externo.telefono}</p>
          <p><strong>Email:</strong> {hallazgo.contacto_externo.email}</p>
        </Card>
      )}
    </div>
  );
}
```

**Success Criteria**:
- ✅ HTTP 201 response
- ✅ contacto_externo created with all fields
- ✅ contacto_externo visible in GET /hallazgos/{id}/
- ✅ UI displays external contact (immutable)

---

## VS-04: Responsable Adds Porqué (Pending Approval)

**Scenario**: Responsable adds a 5-why analysis. Should enter "pendiente" state (not auto-approved). Admin must approve.

**Expected**: AnalisisCincoPorques created with estado="pendiente"; notification sent to admin.

**Steps**:

```bash
# 1. Responsable submits porqué
curl -X POST http://localhost:8000/api/v1/hallazgos/1001/porques/ \
  -H "Authorization: Bearer $JWT_RESPONSABLE" \
  -H "Content-Type: application/json" \
  -d '{
    "texto_causa": "Falta de control de calidad en recepción de materiales"
  }'

# Response (201 Created):
# {
#   "id": 500,
#   "hallazgo_id": 1001,
#   "texto_causa": "...",
#   "autor_tipo": "responsable",
#   "estado": "pendiente",
#   "fecha_creacion": "2026-07-05T11:00:00Z"
# }

# 2. Admin gets list of porqués
curl -X GET http://localhost:8000/api/v1/hallazgos/1001/porques/ \
  -H "Authorization: Bearer $JWT_ADMIN"

# 3. Admin approves porqué
curl -X PATCH http://localhost:8000/api/v1/hallazgos/1001/porques/500/approve/ \
  -H "Authorization: Bearer $JWT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Response (200 OK):
# {
#   "id": 500,
#   "estado": "aprobado",
#   "fecha_aprobacion": "2026-07-05T12:00:00Z",
#   "aprobado_por": {"id": 1, "nombre": "Admin"}
# }
```

**Frontend Check**: Admin panel shows "Porquès Pending Approval" section with count.

```jsx
function AdminPanelView() {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    api.get('/notificaciones/?tipo=aprobacion_porque_pendiente&leida=false')
      .then(res => setNotifications(res.data.results));
  }, []);
  
  return (
    <Panel title="Porquès Pending Approval">
      <p>Pending: {notifications.length}</p>
      {notifications.map(n => (
        <Link to={`/hallazgos/${n.hallazgo_id}/`} key={n.id}>
          {n.titulo}
        </Link>
      ))}
    </Panel>
  );
}
```

**Success Criteria**:
- ✅ Responsable porqué created with estado="pendiente"
- ✅ Admin receives notification with tipo="aprobacion_porque_pendiente"
- ✅ Admin can approve → estado="aprobado"
- ✅ Admin panel shows unread count

---

## VS-05: Admin Adds Porqué (Auto-Approved)

**Scenario**: Admin adds a porqué directly. Should auto-approve immediately (estado="aprobado", fecha_aprobacion=now).

**Expected**: AnalisisCincoPorques created with estado="aprobado" instantly.

**Steps**:

```bash
# Admin submits porqué
curl -X POST http://localhost:8000/api/v1/hallazgos/1001/porques/ \
  -H "Authorization: Bearer $JWT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "texto_causa": "Razón identificada por administrador"
  }'

# Response (201 Created):
# {
#   "id": 501,
#   "hallazgo_id": 1001,
#   "texto_causa": "...",
#   "autor_tipo": "admin",
#   "estado": "aprobado",
#   "fecha_aprobacion": "2026-07-05T11:05:00Z",
#   "aprobado_por": {"id": 1, "nombre": "Admin"}
# }
```

**Success Criteria**:
- ✅ HTTP 201 response
- ✅ estado="aprobado" (not "pendiente")
- ✅ fecha_aprobacion is set
- ✅ No admin notification required (auto-approved)
- ✅ Responsables can see aprobado porqué in hallazgo detail

---

## VS-06: Upload & Preview File

**Scenario**: Responsable uploads JPG and PDF files to hallazgo. Both should be downloadable and previewable inline (PDF via pdfjs-dist, JPG via `<img>`).

**Expected**: Files stored with metadata; preview URLs accessible.

**Steps**:

```bash
# 1. Upload JPG
curl -X POST http://localhost:8000/api/v1/archivos/upload/ \
  -H "Authorization: Bearer $JWT_RESPONSABLE" \
  -F "archivo_file=@foto.jpg" \
  -F "nombre=foto.jpg" \
  -F "hallazgo_id=1001"

# Response (201 Created):
# {
#   "id": 101,
#   "nombre": "foto.jpg",
#   "tipo_mime": "image/jpeg",
#   "tamanio": 2048000,
#   "preview_url": "/archivos/101/preview/",
#   "download_url": "/archivos/101/download/"
# }

# 2. Upload PDF
curl -X POST http://localhost:8000/api/v1/archivos/upload/ \
  -H "Authorization: Bearer $JWT_RESPONSABLE" \
  -F "archivo_file=@informe.pdf" \
  -F "nombre=informe.pdf" \
  -F "hallazgo_id=1001"

# Response (201 Created):
# {
#   "id": 102,
#   "nombre": "informe.pdf",
#   "tipo_mime": "application/pdf",
#   "tamanio": 1024000,
#   "preview_url": "/archivos/102/preview/",
#   "download_url": "/archivos/102/download/"
# }

# 3. Get hallazgo with archivos
curl -X GET http://localhost:8000/api/v1/hallazgos/1001/ \
  -H "Authorization: Bearer $JWT_RESPONSABLE"

# Shows archivos array with all 3 files
```

**Frontend: JPG Preview**:
```jsx
function FilePreview({ archivo }) {
  if (archivo.tipo_mime.startsWith('image/')) {
    return <img src={archivo.preview_url} alt={archivo.nombre} />;
  }
  if (archivo.tipo_mime === 'application/pdf') {
    return <PDFViewer pdfUrl={archivo.preview_url} />;
  }
  return (
    <Button onClick={() => window.open(archivo.download_url)}>
      Download {archivo.nombre}
    </Button>
  );
}
```

**Frontend: PDF Preview (pdfjs-dist)**:
```jsx
import { pdfjs, Document, Page } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function PDFViewer({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  return (
    <div>
      <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={pageNumber} />
      </Document>
      <p>{pageNumber} of {numPages}</p>
      <button onClick={() => setPageNumber(p => Math.max(1, p - 1))}>Prev</button>
      <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}>Next</button>
    </div>
  );
}
```

**Success Criteria**:
- ✅ Files uploaded without errors
- ✅ JPG displays inline via `<img src>`
- ✅ PDF displays inline via PDFViewer (pdfjs-dist)
- ✅ Download button returns file with original name
- ✅ File size < 50 MB respected

---

## VS-07: Chat Message with File + Urgente Tag

**Scenario**: Responsable sends chat message with #urgente tag and attachment. Message should be case-insensitive for #urgente detection. Other responsables should receive WebSocket notification < 3 seconds.

**Expected**: Mensaje created with tiene_urgente=true; notifications dispatched via WebSocket.

**Steps**:

```bash
# 1. Open WebSocket connection (JavaScript in browser)
const ws = new WebSocket(
  `wss://localhost/ws/chat/1001/?token=${JWT_RESPONSABLE_2}`
);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'notificacion.nueva' && msg.tipo === 'mensaje_urgente') {
    console.log("🔴 Urgent notification received:", msg.titulo);
  }
};

# 2. Responsable 1 sends message via REST
curl -X POST http://localhost:8000/api/v1/chat/50/mensajes/ \
  -H "Authorization: Bearer $JWT_RESPONSABLE" \
  -H "Content-Type: application/json" \
  -d '{
    "contenido_texto": "Se debe revisar #URGENTE el proceso de calidad inmediatamente",
    "archivos": [
      {
        "archivo_base64": "iVBORw0KGgoAAAANSUhE...",
        "nombre": "foto_defecto.jpg",
        "tipo_mime": "image/jpeg"
      }
    ]
  }'

# Response (201 Created):
# {
#   "id": 600,
#   "contenido_texto": "Se debe revisar #URGENTE el proceso...",
#   "tiene_urgente": true,
#   "archivos": [
#     {
#       "id": 103,
#       "nombre": "foto_defecto.jpg",
#       "preview_url": "/archivos/103/preview/"
#     }
#   ]
# }

# 3. WebSocket delivers message to other participants
# Browser console: "🔴 Urgent notification received: Mensaje urgente de Responsable 1"

# 4. Verify notification in database
curl -X GET http://localhost:8000/api/v1/notificaciones/?tipo=mensaje_urgente&leida=false \
  -H "Authorization: Bearer $JWT_RESPONSABLE_2"

# Response (200 OK):
# {
#   "count": 1,
#   "results": [
#     {
#       "id": 1001,
#       "tipo": "mensaje_urgente",
#       "titulo": "🔴 Mensaje urgente de Responsable 1",
#       "leida": false,
#       "fecha_creacion": "2026-07-05T14:30:00Z"
#     }
#   ]
# }
```

**Frontend: Chat Component**:
```jsx
function ChatView({ hallazgoId }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  
  useEffect(() => {
    const ws = new WebSocket(`wss://localhost/ws/chat/${hallazgoId}/?token=${token}`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'chat.message') {
        setMessages(prev => [...prev, msg]);
        if (msg.tiene_urgente) {
          // Highlight with red background or badge
          playNotificationSound();
        }
      }
    };
    return () => ws.close();
  }, [hallazgoId]);
  
  return (
    <div>
      {messages.map(m => (
        <Message key={m.id} message={m} highlight={m.tiene_urgente} />
      ))}
      <input value={content} onChange={e => setContent(e.target.value)} />
      <button onClick={() => sendMessage(content)}>Send</button>
    </div>
  );
}

function Message({ message, highlight }) {
  return (
    <div style={{ backgroundColor: highlight ? '#ffcccc' : 'white' }}>
      <strong>{message.autor_nombre}</strong>: {message.contenido_texto}
      {message.archivos.map(f => (
        <FilePreview key={f.id} archivo={f} />
      ))}
    </div>
  );
}
```

**Success Criteria**:
- ✅ Case-insensitive #urgente detection (#URGENTE, #Urgente, #urgente all work)
- ✅ tiene_urgente=true set on save
- ✅ Notification dispatched via WebSocket < 3 seconds
- ✅ File attachment included in message
- ✅ Other chat participants receive via WebSocket group broadcast

---

## VS-08: Change Responsible Approval Flow

**Scenario**: Responsable 1 requests to change responsable (remove themselves, add Responsable 2). Admin approves in < 5 seconds. Responsable 2 receives notification "Asignado como responsable".

**Expected**: SolicitudCambioResponsable workflow: pendiente → aprobada; Responsable 1 removed, Responsable 2 added; notifications sent.

**Steps**:

```bash
# Setup: Hallazgo 1001 has Responsable 1 assigned
# (from previous scenario: /hallazgos/1001/responsables/[1])

# 1. Responsable 1 requests to change responsable
curl -X POST http://localhost:8000/api/v1/hallazgos/1001/solicitudes-cambio-responsable/ \
  -H "Authorization: Bearer $JWT_RESPONSABLE" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "cambiar_responsable",
    "usuario_propuesto_id": 3,
    "observacion": "He decidido retirarme del proyecto"
  }'

# Response (201 Created):
# {
#   "id": 700,
#   "hallazgo_id": 1001,
#   "responsable_solicitante": {"id": 2, "nombre": "Responsable 1"},
#   "tipo": "cambiar_responsable",
#   "usuario_propuesto": {"id": 3, "nombre": "Responsable 2"},
#   "estado": "pendiente",
#   "fecha_creacion": "2026-07-05T15:00:00Z"
# }

# 2. Admin sees notification in admin panel
curl -X GET http://localhost:8000/api/v1/notificaciones/?tipo=cambio_responsable_pendiente \
  -H "Authorization: Bearer $JWT_ADMIN"

# 3. Admin approves request
curl -X PATCH http://localhost:8000/api/v1/hallazgos/1001/solicitudes-cambio-responsable/700/approve/ \
  -H "Authorization: Bearer $JWT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Response (200 OK):
# {
#   "id": 700,
#   "estado": "aprobada",
#   "fecha_resolucion": "2026-07-05T15:01:00Z",
#   "resuelto_por": {"id": 1, "nombre": "Admin"}
# }

# 4. Verify hallazgo now has Responsable 2 (not Responsable 1)
curl -X GET http://localhost:8000/api/v1/hallazgos/1001/ \
  -H "Authorization: Bearer $JWT_ADMIN"

# Response shows:
# {
#   "responsables": [
#     {"id": 3, "nombre": "Responsable 2"}
#   ]
# }

# 5. Responsable 2 received "asignado_responsable" notification
curl -X GET http://localhost:8000/api/v1/notificaciones/?tipo=asignado_responsable \
  -H "Authorization: Bearer $JWT_RESPONSABLE_2"

# Response (200 OK):
# {
#   "count": 1,
#   "results": [
#     {
#       "id": 1002,
#       "tipo": "asignado_responsable",
#       "titulo": "Asignado como responsable",
#       "contenido": "Has sido asignado al hallazgo 1001",
#       "enlace_destino": "/hallazgos/1001/",
#       "leida": false
#     }
#   ]
# }
```

**Frontend: Admin Panel**:
```jsx
function AdminPanelView() {
  const [changeRequests, setChangeRequests] = useState([]);
  
  useEffect(() => {
    api.get('/notificaciones/?tipo=cambio_responsable_pendiente&leida=false')
      .then(res => setChangeRequests(res.data.results));
  }, []);
  
  const approve = (hallazgoId, requestId) => {
    api.patch(
      `/hallazgos/${hallazgoId}/solicitudes-cambio-responsable/${requestId}/approve/`,
      {}
    ).then(() => {
      setChangeRequests(prev => prev.filter(r => r.id !== requestId));
    });
  };
  
  return (
    <Panel title={`Cambios de Responsable (${changeRequests.length})`}>
      {changeRequests.map(r => (
        <Card key={r.id}>
          <p>{r.contenido}</p>
          <Button onClick={() => approve(r.hallazgo_id, r.id)}>Approve</Button>
        </Card>
      ))}
    </Panel>
  );
}
```

**Success Criteria**:
- ✅ SolicitudCambioResponsable created with estado="pendiente"
- ✅ Admin receives notification with tipo="cambio_responsable_pendiente"
- ✅ Admin approves (< 5 sec latency acceptable)
- ✅ Responsable 1 removed from hallazgo.responsables
- ✅ Responsable 2 added to hallazgo.responsables
- ✅ Responsable 2 receives notification with tipo="asignado_responsable"

---

## Summary Table

| Scenario | Feature | Expected Outcome | Success |
|----------|---------|------------------|---------|
| VS-01 | Sector classification | Hallazgo created with sector, subseccion=null | ✅ |
| VS-02 | Subseccion validation | 400 error if sector=Interno but no subseccion | ✅ |
| VS-03 | External contact | ContactoExterno linked to hallazgo | ✅ |
| VS-04 | Responsable porqué | Estado="pendiente", admin approval required | ✅ |
| VS-05 | Admin porqué | Estado="aprobado" automatically | ✅ |
| VS-06 | File preview/download | JPG/PDF inline preview, download preserves name | ✅ |
| VS-07 | Urgent chat message | #urgente case-insensitive, WebSocket notification | ✅ |
| VS-08 | Change responsible | Workflow: pendiente → aprobada, roles updated | ✅ |

---

## Cleanup

```bash
# Delete test hallazgos
curl -X DELETE http://localhost:8000/api/v1/hallazgos/1001/ \
  -H "Authorization: Bearer $JWT_ADMIN"

# Reset catalogs
python manage.py migrate catalogos zero
python manage.py migrate catalogos
```

---

**Status**: Complete  
**Next Step**: Run `/speckit.tasks` to generate actionable development tasks
