# Research Phase Output: Mejoras al Sistema de Gestión de Hallazgos

**Date**: 2026-07-05 | **Feature**: specs/003-mejoras-hallazgos | **Status**: Complete

---

## Overview

This document consolidates findings from Phase 0 research tasks (R-001–R-005), resolving technical unknowns identified in the Implementation Plan's Technical Context section. Each research result includes a decision, rationale, and alternatives considered.

---

## R-001: Dynamic Catalog Patterns

**Unknown**: Cómo modelar catálogos editables sin hardcode.

### Decision

Use **Django ORM models** for SectorCatalog, SubsectionCatalog, and TipoCatalog. Expose CRUD via:
- Django Admin for superusers (built-in)
- Optional custom admin API endpoint (POST/PATCH/DELETE) for role-based catalog management

Cache catalog values in Redis with 1-hour TTL to avoid database hits on every hallazgo filter.

### Rationale

- **Alignment with Constitution Principle II**: All business config externalized to database tables, no hardcoded enums
- **Alignment with Principle XI**: Catalog values editable without code redeploy
- **Django Best Practice**: ORM models with admin interface already implemented in existing 001-gestion-hallazgos; extends naturally
- **Performance**: Redis cache reduces read latency for catalog lookups (< 1ms cached vs ~10–50ms database)
- **Maintainability**: Familiar to ProyectoDaltec team; uses existing Django infrastructure

### Alternatives Considered

**A. Hardcoded Python Enums** (Rejected)
- Violates Principle II (no hardcode)
- Requires code redeploy for catalog changes
- Not suitable for dynamic business domains

**B. JSON Field in Settings** (Rejected)
- Still hardcoded in Django settings file
- No audit trail for changes
- Harder to query/filter by catalog values

**C. External Configuration Service** (Not selected initially)
- Adds operational complexity
- Viable for multi-tenant SaaS; not needed for single-org context
- Defer to future scaling if needed

### Deliverable

```python
# backend/apps/catalogos/models.py

class SectorCatalog(models.Model):
    codigo = models.CharField(max_length=50, unique=True, db_index=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Sector Catalogs"
    
    def __str__(self):
        return f"{self.codigo}: {self.nombre}"

class SubsectionCatalog(models.Model):
    sector = models.ForeignKey(SectorCatalog, on_delete=models.PROTECT)
    codigo = models.CharField(max_length=50, db_index=True)
    nombre = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('sector', 'codigo')
        verbose_name_plural = "Subsection Catalogs"
    
    def __str__(self):
        return f"{self.sector.codigo}/{self.codigo}"

class TipoCatalog(models.Model):
    codigo = models.CharField(max_length=50, unique=True, db_index=True)
    nombre = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Tipo Catalogs"
    
    def __str__(self):
        return f"{self.codigo}: {self.nombre}"
```

**Cache Strategy**:
```python
# backend/apps/catalogos/cache.py

from django.core.cache import cache

def get_sectors_cached():
    key = "catalogo:sectores"
    sectors = cache.get(key)
    if not sectors:
        sectors = list(SectorCatalog.objects.filter(activo=True).values())
        cache.set(key, sectors, timeout=3600)  # 1 hour
    return sectors
```

**Pre-compute cache on app startup** (signal handler in apps.py) to avoid cold-start latency.

---

## R-002: Polymorphic File Storage

**Unknown**: Arquitectura para adjuntos en múltiples entidades (Hallazgo, Porqué, Mensaje).

### Decision

Use **Option B: Specific Foreign Keys** (separate nullable FK columns in Archivo model).

Structure:
```python
class Archivo(models.Model):
    nombre = models.CharField(max_length=255)
    archivo_file = models.FileField(upload_to='hallazgos/%Y/%m/')
    tipo_mime = models.CharField(max_length=50)
    tamanio = models.BigIntegerField()
    
    # Polymorphic FKs (all nullable, exactly one is populated)
    hallazgo = models.ForeignKey(Hallazgo, null=True, blank=True, 
                                 on_delete=models.CASCADE, related_name='archivos')
    porque = models.ForeignKey(AnalisisCincoPorques, null=True, blank=True,
                               on_delete=models.CASCADE, related_name='archivos')
    mensaje = models.ForeignKey(Mensaje, null=True, blank=True,
                                on_delete=models.CASCADE, related_name='archivos')
    
    cargado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True)
    fecha_carga = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['hallazgo', 'fecha_carga']),
            models.Index(fields=['porque', 'fecha_carga']),
            models.Index(fields=['mensaje', 'fecha_carga']),
        ]
```

### Rationale

- **Explicitness**: Clear which entity owns the file; no magic content-type lookups
- **Query Simplicity**: Direct FK relationship; `.filter(hallazgo_id=X)` is fast and clear
- **Referential Integrity**: Django enforces exactly one parent via DB constraints (though not enforced at DB level with nullable FKs; enforce in application logic)
- **Audit Trail**: Separate FK means audit logs clearly identify "file attached to hallazgo 42"
- **Django ORM Comfort**: Uses standard ForeignKey; no ContentType API overhead

**Drawback**: Slight denormalization (multiple FK columns). Mitigated by:
- Unique constraint in Django (not DB level) to ensure exactly one FK is non-null
- Validation in serializer: `assert sum([bool(self.hallazgo), bool(self.porque), bool(self.mensaje)]) == 1`

### Alternatives Considered

**A. Generic Foreign Key (content_type + object_id)** (Viable, not selected)
- Pros: More flexible, scales to new entity types without schema change
- Cons: Extra join on content_type table, less explicit, harder to index
- Selected for Django admin inlines and general polymorph patterns; overkill here where entity types are static

**C. Separate Tables** (Rejected)
- ArchivoHallazgo, ArchivoPorque, ArchivoMensaje
- Too much duplication; violates DRY
- Harder to query "all files for user X" across entity types

### Deliverable

Already provided above. Enforce uniqueness in serializer/service layer.

---

## R-003: PDF Viewer in React

**Unknown**: Mejor librería para previsualización de PDFs inline.

### Decision

Use **pdfjs-dist** (Mozilla's PDF.js compiled for browsers).

```javascript
// frontend/src/components/FilePreview/PDFViewer.jsx
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function PDFViewer({ pdfUrl, title }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };
  
  return (
    <div className="pdf-viewer">
      <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
      </Document>
      <p>{pageNumber} of {numPages}</p>
      <button onClick={() => setPageNumber(p => Math.max(1, p - 1))}>Prev</button>
      <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}>Next</button>
    </div>
  );
}
```

### Rationale

- **Mature & Stable**: Mozilla's official PDF.js; used by Firefox; excellent browser support (Chrome, Safari, Firefox, Edge)
- **No External Server Dependency**: Runs entirely in browser; no conversion required
- **Customizable**: Full control over rendering, page navigation, zoom
- **Open Source**: No licensing concerns
- **Small Bundle**: ~200 KB gzipped for core + worker

**Caveat**: Fallback for unsupported formats:
- If file type not previewable (e.g., .xls, .doc), show download button instead
- Backend provides file MIME type; frontend checks whitelist of previewable types: [application/pdf, image/*, text/plain, text/csv]

### Alternatives Considered

**react-pdf** (Not selected)
- Wrapper around pdfjs-dist with React components
- Simpler API but adds another layer of abstraction
- Similar performance; pdfjs-dist gives more control with lower abstraction cost

**Google Drive Preview API** (Rejected)
- Requires uploading to Google Drive; privacy/security concern
- External service dependency

**Server-side Preview Generation** (Rejected)
- Convert PDF → image in backend (ImageMagick), serve images
- More complexity, slower, higher server load

### Deliverable

Use pdfjs-dist directly. Provide fallback download link for non-previewable formats. Configure whitelist in `frontend/src/config/fileUpload.js`.

---

## R-004: Real-Time Notifications at Scale

**Unknown**: Cómo enviar notificaciones categorizadas en tiempo real.

### Decision

Use **Option B: Single WebSocket Connection + Message Types** (recommended for < 1000 concurrent users).

Architecture:
```
WebSocket: ws://localhost/ws/notificaciones/?token=JWT_TOKEN
└─ Receives JSON messages with type field
└─ Types: cierre_pendiente, aprobacion_porque_pendiente, cambio_responsable_pendiente, 
          asignado_responsable, mensaje_urgente
└─ Frontend filters and categorizes by type locally
```

Backend sends as:
```python
# backend/apps/notificaciones/consumers.py
async def send_notification(user_id, type, hallazgo_id, **kwargs):
    message = {
        'type': type,  # categorization
        'hallazgo_id': hallazgo_id,
        'title': '...',
        'timestamp': now().isoformat()
    }
    await channel_layer.group_send(
        f"notificaciones_{user_id}",
        {'type': 'notification.send', 'message': message}
    )
```

Frontend categorizes locally:
```javascript
// frontend/src/hooks/useNotificaciones.js
const [pendientes, setPendientes] = useState({
  cierre: [],
  porque: [],
  cambio_responsable: [],
  asignado: [],
  urgente: []
});

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  setPendientes(prev => ({
    ...prev,
    [categorizeByType(msg.type)]: [...prev[categorizeByType(msg.type)], msg]
  }));
};
```

### Rationale

- **Single Connection**: Minimal overhead, easier to manage
- **Low Latency**: Direct WebSocket; notifications arrive in < 500ms
- **Scalable to 1000+ concurrent**: Redis channel layer distributes messages across multiple Channels instances (horizontal scaling)
- **Client-side Filtering**: Admin can filter/sort by type without server round-trip
- **Simple Protocol**: Type-based routing is more maintainable than multiple connections

### Performance Expectations

- **Message throughput**: ~10,000 notifications/second per Redis instance (ref: Channels docs)
- **Latency**: < 200ms p95 (WebSocket + channels-redis + browser processing)
- **Sufficient for**: 100–500 concurrent admins, each receiving ~1–10 notifications/minute

### Alternatives Considered

**A. Multiple WebSocket Connections** (Not selected)
- One per notification type (chat, notifications_admin, notifications_employee)
- Simpler client categorization but higher overhead (multiple TCP connections)
- Overkill for < 1000 concurrent users

**C. Polling with Cache-Control** (Not selected)
- GET /api/v1/notificaciones/ every 5–10 seconds
- Higher latency (5–10s vs 200ms), higher server load
- Outdated patterns; WebSocket superior for real-time

### Deliverable

Implement via Django Channels consumer with Redis channel layer. Document in contracts/websocket.md.

---

## R-005: Case-Insensitive #urgente Detection

**Unknown**: Implementación eficiente en Django.

### Decision

Use **Regex with (?i) Flag at Save Time** in Mensaje pre_save signal.

```python
# backend/apps/chat/models.py
import re

class Mensaje(models.Model):
    contenido_texto = models.TextField()
    tiene_urgente = models.BooleanField(default=False, db_index=True)
    
    def save(self, *args, **kwargs):
        # Detect #urgente case-insensitive
        self.tiene_urgente = bool(re.search(r'#urgente', self.contenido_texto, re.IGNORECASE))
        super().save(*args, **kwargs)

@receiver(post_save, sender=Mensaje)
def enviar_notificacion_urgente(sender, instance, created, **kwargs):
    if created and instance.tiene_urgente:
        # Notify all chat participants
        usuarios_notificados = set(instance.chat.participantes.values_list('id', flat=True))
        for user_id in usuarios_notificados:
            if user_id != instance.autor_id:  # Don't notify self
                Notificacion.objects.create(
                    destinatario_id=user_id,
                    tipo='mensaje_urgente',
                    hallazgo=instance.chat.hallazgo,
                    mensaje=instance,
                    titulo=f"Mensaje urgente en hallazgo {instance.chat.hallazgo.id}",
                    contenido=instance.contenido_texto[:100]
                )
        
        # Dispatch via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notificaciones_{user_id}",
            {
                'type': 'notification.send',
                'message': {
                    'type': 'mensaje_urgente',
                    'hallazgo_id': instance.chat.hallazgo.id,
                    'titulo': f"🔴 Mensaje urgente de {instance.autor.nombre}"
                }
            }
        )
```

### Rationale

- **Performance**: Regex matching (< 1ms) is faster than normalization + database lookup
- **Semantics**: Preserves original capitalization in stored text; detect ignoring case
- **Django-native**: Uses signals, no external service
- **Consistency**: Same pattern used for any text-based detection features in future

### Database Index Optimization

Add index on `tiene_urgente` to speed up queries:
```python
class Mensaje(models.Model):
    tiene_urgente = models.BooleanField(default=False, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['chat', 'tiene_urgente']),
        ]
```

Query for unread urgent messages:
```python
# Highly selective with index
Mensaje.objects.filter(chat_id=X, tiene_urgente=True, leido=False)
```

### Alternatives Considered

**A. Normalize Before Saving** (Not selected)
- Store both `contenido_texto_normalized` (lowercased) and `contenido_texto_original`
- More storage; unnecessary for this use case

**B. Custom Database Function** (Not selected)
- Use MySQL REGEXP in queries
- Adds database complexity; regex already fast in Python

### Deliverable

Implement in Mensaje model pre_save signal. Add index on `tiene_urgente` and `chat_id`.

---

## R-006: File Upload Validation

**Unknown**: Whitelist de tipos MIME y tamaños.

### Decision

Define centralized whitelist in Django settings (production vs development).

```python
# backend/config/settings/base.py

FILE_UPLOAD_WHITELIST = {
    'application/pdf': {'ext': 'pdf', 'max_size': 50 * 1024 * 1024},      # 50 MB
    'image/jpeg': {'ext': 'jpg', 'max_size': 10 * 1024 * 1024},           # 10 MB
    'image/png': {'ext': 'png', 'max_size': 10 * 1024 * 1024},            # 10 MB
    'image/webp': {'ext': 'webp', 'max_size': 10 * 1024 * 1024},          # 10 MB
    'text/plain': {'ext': 'txt', 'max_size': 5 * 1024 * 1024},            # 5 MB
    'text/csv': {'ext': 'csv', 'max_size': 5 * 1024 * 1024},              # 5 MB
    'application/vnd.ms-excel': {'ext': 'xls', 'max_size': 10 * 1024 * 1024},  # 10 MB (legacy XLS)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {'ext': 'xlsx', 'max_size': 10 * 1024 * 1024},
}

MAX_FILE_SIZE = max([cfg['max_size'] for cfg in FILE_UPLOAD_WHITELIST.values()])
```

Validate in serializer:
```python
class ArchivoUploadSerializer(serializers.ModelSerializer):
    def validate_archivo_file(self, file):
        if file.content_type not in settings.FILE_UPLOAD_WHITELIST:
            raise serializers.ValidationError(f"File type {file.content_type} not allowed")
        
        cfg = settings.FILE_UPLOAD_WHITELIST[file.content_type]
        if file.size > cfg['max_size']:
            raise serializers.ValidationError(f"File too large (max: {cfg['max_size'] / (1024*1024)} MB)")
        
        return file
```

### Deliverable

Centralized whitelist in settings; validation in serializer. Frontend mirrors whitelist to reject large files before upload.

---

## Summary Table

| Research | Decision | Rationale |
|----------|----------|-----------|
| R-001 | Django ORM models + Redis cache | Principle II compliance, performance |
| R-002 | Specific FK columns (Option B) | Explicitness, query clarity, audit trail |
| R-003 | pdfjs-dist for PDF preview | Mature, browser-native, no external dependency |
| R-004 | Single WebSocket + client-side filtering | Scalable, low latency, simple |
| R-005 | Regex case-insensitive at save time | Performance, semantic preservation |
| R-006 | Centralized whitelist in Django settings | Maintainability, consistency |

---

**Status**: Complete  
**Next Step**: Design Phase 1 (data-model.md, contracts/rest-api.md, contracts/websocket.md, quickstart.md)
