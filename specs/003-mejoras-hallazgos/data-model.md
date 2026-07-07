# Data Model: Mejoras al Sistema de Gestión de Hallazgos

**Date**: 2026-07-05 | **Feature**: specs/003-mejoras-hallazgos | **Status**: Complete

---

## Overview

This document defines all Django ORM models (new and extended) required for the 8 features described in spec.md. Models are organized by app and include field definitions, relationships, validation rules, and signals.

---

## Entity Relationship Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────┐         ┌──────────────────┐               │
│  │SectorCatalog    │         │SubsectionCatalog │               │
│  ├─────────────────┤         ├──────────────────┤               │
│  │id (PK)          │◄────┐   │id (PK)           │               │
│  │codigo           │     │   │sector_id (FK)────┼───┐           │
│  │nombre           │     │   │codigo             │   │           │
│  │descripcion      │     │   │nombre             │   │           │
│  │activo (idx)     │     │   │activo (idx)       │   │           │
│  └─────────────────┘     │   └──────────────────┘   │           │
│                          │                          │           │
│  ┌──────────────┐        └──────────────┬───────────┘           │
│  │TipoCatalog   │                       │                        │
│  ├──────────────┤                       │                        │
│  │id (PK)       │                       │                        │
│  │codigo        │◄──┐                   │                        │
│  │nombre        │   │                   │                        │
│  │activo (idx)  │   │                   │                        │
│  └──────────────┘   │                   │                        │
│                     │                   │                        │
│  ┌────────────────────────────────────────────┐                 │
│  │Hallazgo (Extended)                         │                 │
│  ├────────────────────────────────────────────┤                 │
│  │id (PK)                                     │                 │
│  │descripcion                                 │                 │
│  │ubicacion                                   │                 │
│  │creado_por_id (FK: Usuario)                 │                 │
│  │sector_id (FK)──────────────┐               │                 │
│  │subseccion_id (FK, nullable)─┼─┐            │                 │
│  │tipo_id (FK)────────────────┼─┼─┘            │                 │
│  │estado                      │ │              │                 │
│  │fecha_creacion              │ │              │                 │
│  │responsables (M2M:Usuario)  │ │              │                 │
│  │contacto_externo (1:1, inv.)├─┼──────────────────────────┐   │
│  └─────────────────────┬──────┘ │              │           │   │
│                        │ uno a many            │           │   │
│              ┌─────────┴────────────────┐     │           │   │
│              │ muchos a uno            │     │           │   │
│              ▼                         │     │           │   │
│    ┌──────────────────────┐           │     │           │   │
│    │AnalisisCincoPorques  │           │     │           │   │
│    ├──────────────────────┤           │     │           │   │
│    │id (PK)               │           │     │           │   │
│    │hallazgo_id (FK)──────┼───────────┘     │           │   │
│    │texto_causa           │                 │           │   │
│    │autor_tipo (enum)     │                 │           │   │
│    │autor_id (FK: Usuario)│                 │           │   │
│    │estado (enum, idx)    │                 │           │   │
│    │fecha_creacion        │                 │           │   │
│    │fecha_aprobacion      │                 │           │   │
│    │aprobado_por_id (FK)  │                 │           │   │
│    │observacion_rechazo   │                 │           │   │
│    └──────────────────────┘                 │           │   │
│              │ M2M (through)                │           │   │
│              └─────────┬────────────────────┘           │   │
│                        │                                │   │
│    ┌──────────────────────────┐                         │   │
│    │Archivo                   │                         │   │
│    ├──────────────────────────┤                         │   │
│    │id (PK)                   │                         │   │
│    │nombre                    │                         │   │
│    │archivo_file              │                         │   │
│    │tipo_mime (indexed)       │                         │   │
│    │tamanio                   │                         │   │
│    │fecha_carga               │                         │   │
│    │cargado_por_id (FK)       │                         │   │
│    │hallazgo_id (FK, nullable)├─────────────────────────┘   │
│    │porque_id (FK, nullable)  │                             │
│    │mensaje_id (FK, nullable) │                             │
│    └──────────────────────────┘                             │
│                                                             │
│    ┌──────────────────────┐   ┌───────────────────┐        │
│    │Mensaje (chat)        │   │ContactoExterno    │        │
│    │(Extended)            │   │(New, 1:1)         │        │
│    ├──────────────────────┤   ├───────────────────┤        │
│    │[existing fields]     │   │id (PK)            │        │
│    │tiene_urgente (idx)   │   │hallazgo_id (1:1)──┼────────┼─┘
│    │archivo M2M           │   │nombre_empresa     │        │
│    └──────────────────────┘   │telefono           │        │
│                               │email              │        │
│    ┌──────────────────────────────┐──────────────┤        │
│    │                              │fecha_creacion│        │
│    │   SolicitudCambioResponsable │└───────────────┘        │
│    │   (New)                      │                        │
│    ├──────────────────────────────┤                        │
│    │id (PK)                       │                        │
│    │hallazgo_id (FK)──────────────┤                        │
│    │responsable_solicitante_id    │                        │
│    │(FK: Usuario)                 │                        │
│    │tipo (enum)                   │                        │
│    │usuario_propuesto_id (FK)     │                        │
│    │observacion_solicitante       │                        │
│    │estado (enum, indexed)        │                        │
│    │fecha_creacion                │                        │
│    │fecha_resolucion              │                        │
│    │resuelto_por_id (FK, nullable)│                        │
│    │observacion_resolucion        │                        │
│    │UNIQUE(hallazgo, respons...)  │                        │
│    └──────────────────────────────┘                        │
│                                                             │
│    ┌──────────────────────┐                                │
│    │Notificacion (Extended)                               │
│    ├──────────────────────┤                                │
│    │[existing fields]     │                                │
│    │tipo (enum, indexed)  │                                │
│    │hallazgo_id (nullable)│                                │
│    │mensaje_chat_id       │                                │
│    │solicitud_cambio_id   │                                │
│    │enlace_destino (URL)  │                                │
│    └──────────────────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## New Apps

### App: `catalogos/`

Contains dynamic catalog models for sector, subsection, and tipo classification.

**Models**:

#### SectorCatalog

```python
# backend/apps/catalogos/models.py

class SectorCatalog(models.Model):
    """
    Dynamic configuration for Hallazgo sector classification.
    Replaces hardcoded enums; editable via Django Admin.
    """
    codigo = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Internal code (e.g., 'RECLAMO_CLIENTE', 'PROVEEDOR', 'INTERNO')"
    )
    nombre = models.CharField(
        max_length=100,
        help_text="Display name (e.g., 'Reclamo cliente')"
    )
    descripcion = models.TextField(
        blank=True,
        help_text="Detailed description for admin reference"
    )
    activo = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Inactive sectors hidden from UI"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'catalogo_sector'
        verbose_name_plural = "Sector Catalogs"
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo}: {self.nombre}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.codigo != self.codigo.upper():
            raise ValidationError("Codigo must be uppercase")
```

#### SubsectionCatalog

```python
class SubsectionCatalog(models.Model):
    """
    Dynamic subsections per sector (e.g., Interno → Administración, Compras, ...).
    Nullable in Hallazgo for non-Interno sectors.
    """
    sector = models.ForeignKey(
        SectorCatalog,
        on_delete=models.PROTECT,
        related_name='subsecciones'
    )
    codigo = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Internal code (e.g., 'ADMIN', 'COMPRAS')"
    )
    nombre = models.CharField(
        max_length=100,
        help_text="Display name (e.g., 'Administración')"
    )
    activo = models.BooleanField(
        default=True,
        db_index=True
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'catalogo_subseccion'
        unique_together = ('sector', 'codigo')
        verbose_name_plural = "Subsection Catalogs"
        ordering = ['sector', 'codigo']
    
    def __str__(self):
        return f"{self.sector.codigo}/{self.codigo}"
```

#### TipoCatalog

```python
class TipoCatalog(models.Model):
    """
    Dynamic configuration for Hallazgo tipo classification.
    Replaces Hallazgo.tipo enum; orthogonal to sector.
    """
    codigo = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Internal code (e.g., 'NO_CONFORMIDAD', 'OPORTUNIDAD_MEJORA', 'QUEJA_CLIENTE')"
    )
    nombre = models.CharField(
        max_length=100,
        help_text="Display name"
    )
    activo = models.BooleanField(
        default=True,
        db_index=True
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'catalogo_tipo'
        verbose_name_plural = "Tipo Catalogs"
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo}: {self.nombre}"
```

---

### App: `hallazgos/` (Extended)

#### Hallazgo (Extended)

```python
# backend/apps/hallazgos/models.py

from django.db import models
from django.core.exceptions import ValidationError
from catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog

class Hallazgo(models.Model):
    # Existing fields
    descripcion = models.TextField()
    ubicacion = models.CharField(max_length=255, blank=True)
    creado_por = models.ForeignKey(
        'users.Usuario',
        on_delete=models.PROTECT,
        related_name='hallazgos_creados'
    )
    responsables = models.ManyToManyField(
        'users.Usuario',
        through='HallazgoResponsable',
        related_name='hallazgos_asignados'
    )
    estado = models.CharField(
        max_length=20,
        default='abierto',
        choices=[
            ('abierto', 'Abierto'),
            ('en_progreso', 'En Progreso'),
            ('cerrado', 'Cerrado'),
            ('cancelado', 'Cancelado'),
        ]
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # NEW FIELDS
    sector = models.ForeignKey(
        SectorCatalog,
        on_delete=models.PROTECT,
        help_text="Required: sector of hallazgo"
    )
    subseccion = models.ForeignKey(
        SubsectionCatalog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Required only if sector.codigo='INTERNO'"
    )
    tipo = models.ForeignKey(
        TipoCatalog,
        on_delete=models.PROTECT,
        help_text="Required: tipo classification (NO_CONFORMIDAD, etc.)"
    )
    
    class Meta:
        db_table = 'hallazgo'
        indexes = [
            models.Index(fields=['sector', 'estado']),
            models.Index(fields=['tipo', 'fecha_creacion']),
            models.Index(fields=['creado_por']),
        ]
    
    def clean(self):
        """Validate subseccion required if sector is Interno."""
        if self.sector_id and self.sector.codigo == 'INTERNO':
            if not self.subseccion_id:
                raise ValidationError(
                    "Subseccion is required when sector is INTERNO"
                )
        
        # Cross-sector validation: tipo is independent, no restrictions
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Hallazgo {self.id}: {self.descripcion[:50]}"
```

---

### App: `contacto_externo/` (New)

#### ContactoExterno

```python
# backend/apps/contacto_externo/models.py

class ContactoExterno(models.Model):
    """
    External contact information for customer complaints (sector='Reclamo cliente').
    Created only by admin; immutable after creation.
    """
    hallazgo = models.OneToOneField(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        related_name='contacto_externo'
    )
    nombre_empresa = models.CharField(
        max_length=255,
        help_text="Company/individual name"
    )
    telefono = models.CharField(
        max_length=20,
        blank=True
    )
    email = models.EmailField(blank=True)
    observacion = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'contacto_externo'
        verbose_name_plural = "Contactos Externos"
    
    def save(self, *args, **kwargs):
        # Prevent updates post-creation
        if self.pk and self.pk in ContactoExterno.objects.values_list('pk', flat=True):
            raise ValidationError("ContactoExterno is immutable after creation")
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Contacto: {self.nombre_empresa} ({self.hallazgo_id})"
```

---

### App: `analisis_cinco_porques/` (New)

#### AnalisisCincoPorques

```python
# backend/apps/analisis_cinco_porques/models.py

from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class AnalisisCincoPorques(models.Model):
    """
    5-Why analysis with role-based auto-approval.
    Admin porqués auto-approve; responsable porqués require admin approval.
    """
    AUTOR_TIPO_CHOICES = [
        ('admin', 'Administrator'),
        ('responsable', 'Responsible Party'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pending Approval'),
        ('aprobado', 'Approved'),
        ('rechazado', 'Rejected'),
    ]
    
    hallazgo = models.ForeignKey(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        related_name='porques'
    )
    texto_causa = models.TextField(
        help_text="5-why analysis cause"
    )
    autor_tipo = models.CharField(
        max_length=20,
        choices=AUTOR_TIPO_CHOICES,
        help_text="Was this porqué added by admin or responsable?"
    )
    autor = models.ForeignKey(
        'users.Usuario',
        on_delete=models.PROTECT,
        related_name='porques_creados'
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        db_index=True
    )
    observacion_rechazo = models.TextField(
        blank=True,
        help_text="Reason for rejection (if rejected)"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    aprobado_por = models.ForeignKey(
        'users.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='porques_aprobados',
        help_text="Admin who approved (if responsable submitted)"
    )
    
    class Meta:
        db_table = 'analisis_cinco_porques'
        ordering = ['fecha_creacion']
        indexes = [
            models.Index(fields=['hallazgo', 'estado']),
            models.Index(fields=['estado']),
        ]
    
    def save(self, *args, **kwargs):
        # Auto-approve if author is admin
        if self.autor_tipo == 'admin':
            self.estado = 'aprobado'
            self.fecha_aprobacion = timezone.now()
            self.aprobado_por = self.autor
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Porqué {self.id} ({self.estado}): {self.texto_causa[:50]}"

@receiver(post_save, sender=AnalisisCincoPorques)
def notificar_porque_creado(sender, instance, created, **kwargs):
    """Notify admin when responsable creates a porqué requiring approval."""
    if created and instance.autor_tipo == 'responsable':
        from notificaciones.models import Notificacion
        from django.utils import timezone
        
        # Get all admins
        admins = Usuario.objects.filter(role='admin')
        for admin in admins:
            Notificacion.objects.create(
                destinatario=admin,
                tipo='aprobacion_porque_pendiente',
                hallazgo=instance.hallazgo,
                titulo=f"Porqué pendiente de aprobación en hallazgo {instance.hallazgo.id}",
                contenido=instance.texto_causa[:100],
                enlace_destino=f"/hallazgos/{instance.hallazgo.id}/"
            )
```

---

### App: `archivos/` (Extended)

#### Archivo (Extended with Polymorphic FKs)

```python
# backend/apps/archivos/models.py

class Archivo(models.Model):
    """
    File storage with polymorphic FK support (hallazgo, porque, mensaje).
    """
    nombre = models.CharField(max_length=255)
    archivo_file = models.FileField(
        upload_to='hallazgos/%Y/%m/%d/',
        help_text="Uploaded file"
    )
    tipo_mime = models.CharField(
        max_length=50,
        db_index=True,
        help_text="MIME type (e.g., 'application/pdf')"
    )
    tamanio = models.BigIntegerField(
        help_text="File size in bytes"
    )
    fecha_carga = models.DateTimeField(auto_now_add=True)
    cargado_por = models.ForeignKey(
        'users.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='archivos_cargados'
    )
    
    # Polymorphic FKs (exactly one must be populated)
    hallazgo = models.ForeignKey(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='archivos'
    )
    porque = models.ForeignKey(
        'analisis_cinco_porques.AnalisisCincoPorques',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='archivos'
    )
    mensaje = models.ForeignKey(
        'chat.Mensaje',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='archivos'
    )
    
    class Meta:
        db_table = 'archivo'
        indexes = [
            models.Index(fields=['hallazgo', 'fecha_carga']),
            models.Index(fields=['porque', 'fecha_carga']),
            models.Index(fields=['mensaje', 'fecha_carga']),
        ]
    
    def clean(self):
        from django.core.exceptions import ValidationError
        from django.conf import settings
        
        # Validate exactly one FK populated
        fk_count = sum([bool(x) for x in [self.hallazgo_id, self.porque_id, self.mensaje_id]])
        if fk_count != 1:
            raise ValidationError("Exactly one parent (hallazgo, porque, mensaje) must be set")
        
        # Validate MIME type
        if self.tipo_mime not in settings.FILE_UPLOAD_WHITELIST:
            raise ValidationError(f"MIME type {self.tipo_mime} not allowed")
        
        # Validate size
        cfg = settings.FILE_UPLOAD_WHITELIST.get(self.tipo_mime, {})
        max_size = cfg.get('max_size', settings.MAX_FILE_SIZE)
        if self.tamanio > max_size:
            raise ValidationError(f"File too large (max: {max_size / (1024*1024)} MB)")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Archivo: {self.nombre} ({self.tipo_mime})"
```

---

### App: `chat/` (Extended)

#### Mensaje (Extended)

```python
# backend/apps/chat/models.py

import re
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

class Mensaje(models.Model):
    """
    Chat message with case-insensitive #urgente detection and file attachments.
    """
    chat = models.ForeignKey(
        'Chat',
        on_delete=models.CASCADE,
        related_name='mensajes'
    )
    autor = models.ForeignKey(
        'users.Usuario',
        on_delete=models.PROTECT,
        related_name='mensajes_chat'
    )
    contenido_texto = models.TextField()
    tiene_urgente = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether message contains #urgente (case-insensitive)"
    )
    fecha_hora = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'mensaje'
        ordering = ['fecha_hora']
        indexes = [
            models.Index(fields=['chat', 'tiene_urgente']),
            models.Index(fields=['chat', 'fecha_hora']),
        ]
    
    def save(self, *args, **kwargs):
        # Detect #urgente case-insensitive
        self.tiene_urgente = bool(re.search(r'#urgente', self.contenido_texto, re.IGNORECASE))
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Mensaje {self.id} ({self.autor}): {self.contenido_texto[:50]}"

@receiver(post_save, sender=Mensaje)
def notificar_mensaje_urgente(sender, instance, created, **kwargs):
    """Dispatch urgent message notification via WebSocket."""
    if created and instance.tiene_urgente:
        from notificaciones.models import Notificacion
        from django.conf import settings
        
        # Notify all chat participants except sender
        usuarios_notificados = set(
            instance.chat.participantes.exclude(id=instance.autor_id).values_list('id', flat=True)
        )
        
        for user_id in usuarios_notificados:
            Notificacion.objects.create(
                destinatario_id=user_id,
                tipo='mensaje_urgente',
                hallazgo=instance.chat.hallazgo,
                titulo=f"🔴 Mensaje urgente en hallazgo {instance.chat.hallazgo.id}",
                contenido=instance.contenido_texto[:100],
                enlace_destino=f"/hallazgos/{instance.chat.hallazgo.id}/"
            )
        
        # Dispatch via WebSocket (implementation in consumers.py)
        if settings.CHANNEL_LAYERS:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            for user_id in usuarios_notificados:
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

---

### App: `solicitud_cambio_responsable/` (New)

#### SolicitudCambioResponsable

```python
# backend/apps/solicitud_cambio_responsable/models.py

class SolicitudCambioResponsable(models.Model):
    """
    Request to add or change responsible parties on a hallazgo.
    Workflow: pendiente → aprobada/rechazada → acción (agregar/remover responsable).
    """
    TIPO_CHOICES = [
        ('agregar_responsable', 'Add Responsible'),
        ('cambiar_responsable', 'Change Responsible'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pending'),
        ('aprobada', 'Approved'),
        ('rechazada', 'Rejected'),
        ('anulada', 'Canceled'),
    ]
    
    hallazgo = models.ForeignKey(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        related_name='solicitudes_cambio_responsable'
    )
    responsable_solicitante = models.ForeignKey(
        'users.Usuario',
        on_delete=models.PROTECT,
        related_name='solicitudes_cambio_emitidas'
    )
    tipo = models.CharField(
        max_length=25,
        choices=TIPO_CHOICES
    )
    usuario_propuesto = models.ForeignKey(
        'users.Usuario',
        on_delete=models.PROTECT,
        related_name='solicitudes_cambio_recibidas'
    )
    observacion_solicitante = models.TextField(blank=True)
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        db_index=True
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_resolucion = models.DateTimeField(null=True, blank=True)
    resuelto_por = models.ForeignKey(
        'users.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='solicitudes_cambio_resueltas'
    )
    observacion_resolucion = models.TextField(blank=True)
    
    class Meta:
        db_table = 'solicitud_cambio_responsable'
        unique_together = ('hallazgo', 'responsable_solicitante', 'usuario_propuesto', 'estado')
        # Ensure only 1 pending per hallazgo+responsable_solicitante combo
        indexes = [
            models.Index(fields=['hallazgo', 'estado']),
            models.Index(fields=['responsable_solicitante', 'estado']),
        ]
    
    def approve(self, approved_by):
        """Approve request: add/change responsible and notify."""
        from django.utils import timezone
        from hallazgos.models import HallazgoResponsable
        
        self.estado = 'aprobada'
        self.fecha_resolucion = timezone.now()
        self.resuelto_por = approved_by
        self.save()
        
        if self.tipo == 'agregar_responsable':
            # Add new responsible
            HallazgoResponsable.objects.get_or_create(
                hallazgo=self.hallazgo,
                usuario=self.usuario_propuesto
            )
        elif self.tipo == 'cambiar_responsable':
            # Remove old, add new
            HallazgoResponsable.objects.filter(
                hallazgo=self.hallazgo,
                usuario=self.responsable_solicitante
            ).delete()
            HallazgoResponsable.objects.get_or_create(
                hallazgo=self.hallazgo,
                usuario=self.usuario_propuesto
            )
        
        # Notify all affected users
        self._notify_approval()
    
    def reject(self, rejected_by, observacion):
        """Reject request and notify."""
        from django.utils import timezone
        
        self.estado = 'rechazada'
        self.fecha_resolucion = timezone.now()
        self.resuelto_por = rejected_by
        self.observacion_resolucion = observacion
        self.save()
        
        self._notify_rejection()
    
    def _notify_approval(self):
        """Send notifications to affected users."""
        from notificaciones.models import Notificacion
        
        # Notify requesting responsable
        Notificacion.objects.create(
            destinatario=self.responsable_solicitante,
            tipo='cambio_responsable_pendiente',
            hallazgo=self.hallazgo,
            titulo=f"Solicitud aprobada: {self.get_tipo_display()}",
            contenido=f"Tu solicitud ha sido aprobada",
            enlace_destino=f"/hallazgos/{self.hallazgo.id}/"
        )
        
        # Notify proposed responsible
        if self.tipo == 'agregar_responsable':
            Notificacion.objects.create(
                destinatario=self.usuario_propuesto,
                tipo='asignado_responsable',
                hallazgo=self.hallazgo,
                titulo=f"Asignado como responsable",
                contenido=f"Has sido asignado al hallazgo {self.hallazgo.id}",
                enlace_destino=f"/hallazgos/{self.hallazgo.id}/"
            )
    
    def _notify_rejection(self):
        """Send rejection notifications."""
        from notificaciones.models import Notificacion
        
        Notificacion.objects.create(
            destinatario=self.responsable_solicitante,
            tipo='cambio_responsable_pendiente',
            hallazgo=self.hallazgo,
            titulo=f"Solicitud rechazada: {self.get_tipo_display()}",
            contenido=self.observacion_resolucion[:100],
            enlace_destino=f"/hallazgos/{self.hallazgo.id}/"
        )
    
    def __str__(self):
        return f"Solicitud {self.id} ({self.estado}): {self.get_tipo_display()}"
```

---

### App: `notificaciones/` (Extended)

#### Notificacion (Extended)

```python
# backend/apps/notificaciones/models.py

class Notificacion(models.Model):
    """
    User notifications with type categorization for role-based filtering.
    """
    TIPO_CHOICES = [
        ('cierre_pendiente', 'Cierre Pendiente'),
        ('aprobacion_porque_pendiente', 'Porqué Requires Approval'),
        ('cambio_responsable_pendiente', 'Responsible Change Request'),
        ('asignado_responsable', 'Assigned as Responsible'),
        ('mensaje_urgente', 'Urgent Message'),
        ('otro', 'Other'),
    ]
    
    destinatario = models.ForeignKey(
        'users.Usuario',
        on_delete=models.CASCADE,
        related_name='notificaciones'
    )
    tipo = models.CharField(
        max_length=50,
        choices=TIPO_CHOICES,
        db_index=True
    )
    hallazgo = models.ForeignKey(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificaciones'
    )
    titulo = models.CharField(max_length=255)
    contenido = models.TextField()
    leida = models.BooleanField(default=False, db_index=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_index=True)
    fecha_lectura = models.DateTimeField(null=True, blank=True)
    enlace_destino = models.URLField(blank=True)
    
    class Meta:
        db_table = 'notificacion'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['destinatario', 'leida']),
            models.Index(fields=['destinatario', 'tipo']),
        ]
    
    def marcar_como_leida(self):
        from django.utils import timezone
        if not self.leida:
            self.leida = True
            self.fecha_lectura = timezone.now()
            self.save()
    
    def __str__(self):
        return f"Notif {self.id} ({self.tipo}): {self.titulo}"
```

---

## Migration Strategy

Run Django migrations in order:

```bash
# Create new apps
python manage.py makemigrations catalogos
python manage.py makemigrations contacto_externo
python manage.py makemigrations analisis_cinco_porques
python manage.py makemigrations solicitud_cambio_responsable

# Extend existing apps
python manage.py makemigrations hallazgos
python manage.py makemigrations archivos
python manage.py makemigrations chat
python manage.py makemigrations notificaciones

# Apply all
python manage.py migrate

# Pre-populate catalogs (fixture or script)
python manage.py loaddata specs/003-mejoras-hallazgos/fixtures/catalogs.json
```

---

## Notes

- **Immutability**: ContactoExterno is immutable post-creation (prevents accidental data loss)
- **Auto-Approval**: AnalisisCincoPorques auto-approves if autor_tipo='admin'; requires approval if 'responsable'
- **Case-Insensitivity**: Mensaje.tiene_urgente set by regex at save time
- **Polymorphic FK**: Archivo validates exactly one parent FK populated
- **Indexes**: Strategic indexes on frequently-queried fields (estado, fecha, FK, composite filters)

---

**Status**: Complete  
**Next Step**: Create contracts/rest-api.md and contracts/websocket.md
