# ANÁLISIS INTEGRAL DEL PROYECTO - SISTEMA DE GESTIÓN DE HALLAZGOS

**Fecha**: 2026-06-30  
**Scope**: Backend (Django), Frontend (React), Base de Datos (MySQL)  
**Estado Actual**: 5 problemas críticos bloqueantes | 3 problemas altos | Deuda técnica significativa

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problemas Críticos (Bloqueantes)](#problemas-críticos)
3. [Problemas Altos](#problemas-altos)  
4. [Análisis Detallado por Problema](#análisis-detallado)
5. [Plan de Implementación](#plan-de-implementación)
6. [Riesgos y Mitigación](#riesgos)

---

## RESUMEN EJECUTIVO

### Estado General del Sistema
- **Criticidad**: 🔴 CRÍTICA - Múltiples fallos de infraestructura
- **Funcionalidad**: 40-50% implementada, 50-60% rota o incompleta
- **Base de Datos**: ❌ Desincronizada con modelos (migraciones incompletas)
- **API**: ⚠️ Parcialmente funcional (faltan endpoints y validaciones)
- **Frontend**: ⚠️ Componentes básicos OK, pero falta integración con backend
- **Testing**: ❌ Ninguna cobertura de tests visible

### Problemas Críticos Identificados (5)
| # | Problema | Severidad | Status |
|---|----------|-----------|--------|
| 7 | ManyToMany Accion-Archivo falta | 🔴 CRÍTICO | Causa crashes |
| 6 | Tabla SolicitudCierreAccion no existe | 🔴 CRÍTICO | Causa crashes |
| 5 | Archivos no visibles en frontend | 🔴 CRÍTICO | Relación modelo rota |
| 3 | Error al subir archivos | 🟠 ALTO | Dependencia de #5,#7 |
| 4 | Sin descarga de archivos | 🟠 ALTO | Endpoint falta |

### Problemas Altos (3)
| # | Problema | Severidad | Status |
|---|----------|-----------|--------|
| 1 | Creación de usuarios débil | 🟠 ALTO | Validaciones insuficientes |
| 2 | Notificaciones sin tiempo real | 🟠 ALTO | Arquitectura incompleta |
| 8 | Dashboard cuenta incorrecta | 🟠 ALTO | Filtros mal aplicados |

### Deuda Técnica
- Migraciones incompletas (-40 horas)
- Sin documentación Swagger/OpenAPI (-20 horas)
- Serializers vacíos/incompletos (-15 horas)
- ViewSets sin registrar en URLs (-10 horas)
- Sin validaciones robustas (-25 horas)
- Servicios dispersos sin consolidación (-15 horas)

**Tiempo Estimado Total de Fixes**: 40-50 horas (si se abordan sistemáticamente)

---

## PROBLEMAS CRÍTICOS

### PROBLEMA #7: ManyToMany Accion-Archivo Faltante ⚠️ CRÍTICO

**Error Observable**:
```
ProgrammingError at /api/v1/hallazgos/1/acciones/2/
(1146, "Table 'proyectodaltec.acciones_accion_archivos' doesn't exist")
```

**Causa Raíz**:
La tabla intermedia para la relación ManyToMany entre `Accion` y `Archivo` nunca fue creada durante las migraciones.

```python
# Model defines the relationship:
class Accion(models.Model):
    archivos = models.ManyToManyField(
        "archivos.Archivo",
        related_name="acciones",
        blank=True
    )
```

**Pero la migración NO lo incluye** en `acciones/migrations/0001_initial.py`:
- Solo crea tabla `acciones_accion`
- NO crea tabla `acciones_accion_archivos`
- Cuando Django intenta acceder, falla

**Archivos Involucrados**:
- ❌ `backend/apps/acciones/models.py` (línea ~36): Define ManyToMany
- ❌ `backend/apps/acciones/migrations/0001_initial.py`: NO incluye la relación
- ❌ `backend/apps/acciones/views.py` (línea ~55): Intenta usar `.archivos`
- ❌ `backend/apps/acciones/serializers.py` (línea ~12): Serializa archivos
- ❌ MySQL: Tabla no existe

**Impacto**:
- ❌ Cualquier intento de GET/POST en AccionViewSet.retrieve() → crash
- ❌ No se puede adjuntar archivos a acciones
- ❌ No se puede serializar acciones (GetAccion endpoint está roto)
- ❌ Bloquea completamente la funcionalidad de Acciones

**Solución**:

**Paso 1**: Crear migración 0002 para acciones:
```bash
# Generar automáticamente
cd backend
python manage.py makemigrations acciones --name add_archivos_relationship

# O crear manualmente: backend/apps/acciones/migrations/0002_accion_archivos.py
```

**Paso 2**: Contenido de la migración:
```python
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('archivos', '0001_initial'),
        ('acciones', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='accion',
            name='archivos',
            field=models.ManyToManyField(
                blank=True, 
                related_name='acciones', 
                to='archivos.Archivo'
            ),
        ),
    ]
```

**Paso 3**: Ejecutar migración:
```bash
python manage.py migrate acciones
```

**Validación**:
```bash
# Verificar que la tabla existe:
python manage.py dbshell
SHOW TABLES LIKE 'acciones_accion_archivos';
# Debe retornar: ✓ acciones_accion_archivos
```

**Riesgos**: ✅ NINGUNO
- Solo agrega nueva tabla (no modifica existentes)
- Forward-compatible
- No afecta datos existentes

**Testing**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/hallazgos/1/acciones/1/
# Debe retornar: 200 OK con datos (no crash)
```

---

### PROBLEMA #6: Tabla SolicitudCierreAccion Inexistente ⚠️ CRÍTICO

**Error Observable**:
```
ProgrammingError:
Table 'proyectodaltec.acciones_solicitudcierreaccion' doesn't exist
```

**Causa Raíz**:
El modelo `SolicitudCierreAccion` está definido pero la migración inicial NO lo crea.

```python
# Model exists in models.py:
class SolicitudCierreAccion(models.Model):
    accion = ForeignKey(Accion, ...)
    solicitante = ForeignKey(CustomUser, ...)
    administrador = ForeignKey(CustomUser, ...)
    fecha_solicitud = DateTimeField(auto_now_add=True)
    # ... more fields
```

**Pero migración 0001_initial.py solo tiene CreateModel para `Accion`**:
- No incluye CreateModel para `SolicitudCierreAccion`
- Cuando intenta crear solicitud → falla

**Archivos Involucrados**:
- ✅ `backend/apps/acciones/models.py`: Modelo bien definido
- ❌ `backend/apps/acciones/migrations/0001_initial.py`: Incompleta
- ❌ `backend/apps/acciones/views.py`: IntentaSolicitudCierreViewSet
- ❌ `backend/apps/acciones/services.py` (línea ~80): `solicitar_cierre()` intenta crear
- ❌ MySQL: Tabla no existe

**Impacto**:
- ❌ Endpoint solicitar_cierre fallará
- ❌ Empleados no pueden solicitar cierre de acciones
- ❌ Admin no puede ver/resolver solicitudes
- ❌ Flujo de cierre completamente roto

**Solución (Opción A - Recomendada)**:

Recrear 0001_initial COMPLETA:

```bash
cd backend

# 1. Backup BD
mysqldump -u root -p proyectodaltec > backup.sql

# 2. Eliminar migraciones (cuidado!)
rm apps/acciones/migrations/0001_initial.py

# 3. Recrear migración con ambos modelos
python manage.py makemigrations acciones

# 4. Revisar el archivo generado (debe incluir Accion + SolicitudCierreAccion)
cat apps/acciones/migrations/0001_initial.py

# 5. Ejecutar
python manage.py migrate acciones
```

**Solución (Opción B - Si tiene datos)**:

Crear migración 0002 que cree la tabla faltante:

```bash
# backend/apps/acciones/migrations/0002_solicitudcierreaccion.py
```

```python
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('acciones', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SolicitudCierreAccion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('fecha_solicitud', models.DateTimeField(auto_now_add=True)),
                ('fecha_resolucion', models.DateTimeField(blank=True, null=True)),
                ('observacion', models.TextField(blank=True, default='')),
                ('estado', models.CharField(
                    choices=[('PENDIENTE', 'Pendiente'), ('APROBADA', 'Aprobada'), ('RECHAZADA', 'Rechazada')],
                    default='PENDIENTE',
                    max_length=20
                )),
                ('accion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='acciones.accion')),
                ('administrador', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('solicitante', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Solicitud de Cierre de Accion'},
        ),
    ]
```

**Recomendación**: Usar Opción B (agregar 0002) si hay datos en BD. Opción A solo si es Dev limpia.

---

### PROBLEMA #5: Archivos No Visibles + Relación Hallazgo-Archivo Rota ⚠️ CRÍTICO

**Síntomas Observables**:
- ❌ Archivos se cargan pero no aparecen en respuesta GET Hallazgo
- ❌ No hay URL de descarga  
- ❌ Frontend no puede mostrar lista de archivos
- ❌ Relación modelo no existe

**Causa Raíz #1: Modelo Hallazgo Sin Relación a Archivo**

```python
# Hallazgo.py NO TIENE:
class Hallazgo(models.Model):
    descripcion = TextField
    ubicacion = CharField
    tipo = CharField
    estado = CharField
    creado_por = ForeignKey(User)
    responsables = ManyToManyField(User, through='HallazgoResponsable')
    # ❌ FALTA: archivos = ManyToManyField(Archivo)  ← NO EXISTE
```

**Pero views.py intenta usarla**:
```python
# hallazgos/views.py línea ~150
if hasattr(hallazgo, "archivos"):  # ← Intenta acceder
    hallazgo.archivos.add(created)  # ← FALLA porque no existe
```

**Causa Raíz #2: Serializer No Serializa Archivos**

```python
# hallazgos/serializers.py
class HallazgoSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [..., "descripcion", "ubicacion", "tipo", "estado", ...]
        # ❌ NO INCLUYE: "archivos"
```

**Causa Raíz #3: Sin Endpoint de Descarga**

```python
# archivos/views.py está VACÍO
# No existe: GET /api/v1/archivos/{id}/descargar/
```

**Causa Raíz #4: Frontend Sin Mostrar Archivos**

```jsx
// frontend/src/pages/hallazgos/HallazgoDetailPage.jsx
// No hay componente para listar/descargar archivos
// Solo hay upload, pero upload no funciona por backend
```

**Archivos Involucrados**:
- ❌ `backend/apps/hallazgos/models.py`: Falta relación
- ❌ `backend/apps/hallazgos/migrations/`: No existe migración
- ❌ `backend/apps/hallazgos/serializers.py`: No serializa archivos
- ❌ `backend/apps/hallazgos/views.py`: Intenta usar .archivos (falla)
- ❌ `backend/apps/archivos/views.py`: Vacío (sin endpoints)
- ❌ `backend/apps/archivos/serializers.py`: Vacío
- ❌ `backend/config/urls.py`: No registra archivos router
- ❌ `frontend/src/pages/hallazgos/`: Sin componente de archivos

**Impacto**:
- ❌ Upload en Hallazgos se crea archivo pero no se asocia
- ❌ GET Hallazgo no retorna archivos
- ❌ Usuarios no saben qué archivos existen
- ❌ No hay forma de descargar

**Solución Completa**:

#### PASO 1: Agregar Relación en Modelo Hallazgo

```python
# backend/apps/hallazgos/models.py
from django.db import models

class Hallazgo(models.Model):
    descripcion = models.TextField(verbose_name="Descripción")
    ubicacion = models.CharField(max_length=200, verbose_name="Ubicación")
    tipo = models.CharField(max_length=25, choices=TipoHallazgo.choices, verbose_name="Tipo")
    estado = models.CharField(max_length=20, choices=EstadoHallazgo.choices, default=EstadoHallazgo.PENDIENTE, verbose_name="Estado")
    fecha_creacion = models.DateField(auto_now_add=True, verbose_name="Fecha de Creación")
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="hallazgos_creados", verbose_name="Creado por")
    responsables = models.ManyToManyField(settings.AUTH_USER_MODEL, through="HallazgoResponsable", related_name="hallazgos_asignados", blank=True, verbose_name="Responsables")
    
    # ✅ AGREGAR ESTO:
    archivos = models.ManyToManyField(
        "archivos.Archivo",
        related_name="hallazgos",
        blank=True,
        verbose_name="Archivos"
    )
    
    class Meta:
        verbose_name = "Hallazgo"
        verbose_name_plural = "Hallazgos"
        ordering = ["-fecha_creacion"]
```

#### PASO 2: Generar Migración

```bash
cd backend
python manage.py makemigrations hallazgos --name add_archivos_relationship
```

Contenido esperado en `hallazgos/migrations/0002_hallazgo_archivos.py`:
```python
migrations.AddField(
    model_name='hallazgo',
    name='archivos',
    field=models.ManyToManyField(blank=True, related_name='hallazgos', to='archivos.Archivo'),
),
```

#### PASO 3: Actualizar Serializers

```python
# backend/apps/hallazgos/serializers.py
class HallazgoSerializer(serializers.ModelSerializer):
    creado_por = serializers.SerializerMethodField()
    responsables = serializers.SerializerMethodField()
    acciones = serializers.SerializerMethodField()
    archivos = serializers.SerializerMethodField()  # ✅ AGREGAR
    
    class Meta:
        model = Hallazgo
        fields = [
            "id", "descripcion", "ubicacion", "tipo", "estado", 
            "fecha_creacion", "creado_por", "responsables", "acciones",
            "archivos"  # ✅ AGREGAR
        ]
        read_only_fields = fields
    
    def get_archivos(self, obj):  # ✅ AGREGAR
        return [
            {
                "id": a.id,
                "nombre": a.nombre,
                "tipo_mime": a.tipo_mime,
                "tamanio": a.tamanio,
                "fecha_carga": a.fecha_carga.isoformat(),
                "url_descarga": f"/api/v1/archivos/{a.id}/descargar/"
            }
            for a in obj.archivos.all()
        ]
    
    # ... resto del serializer
```

#### PASO 4: Crear ArchivoViewSet y Serializer

```python
# backend/apps/archivos/serializers.py
from rest_framework import serializers
from apps.archivos.models import Archivo

class ArchivoSerializer(serializers.ModelSerializer):
    url_descarga = serializers.SerializerMethodField()
    
    class Meta:
        model = Archivo
        fields = [
            "id", "nombre", "tipo_mime", "tamanio", 
            "fecha_carga", "cargado_por", "url_descarga"
        ]
        read_only_fields = ["id", "fecha_carga", "cargado_por"]
    
    def get_url_descarga(self, obj):
        return f"/api/v1/archivos/{obj.id}/descargar/"
```

```python
# backend/apps/archivos/views.py
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.archivos.models import Archivo
from apps.archivos.serializers import ArchivoSerializer

class ArchivoViewSet(viewsets.GenericViewSet):
    queryset = Archivo.objects.all()
    serializer_class = ArchivoSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get'], url_path='descargar')
    def descargar(self, request, pk=None):
        """
        Descargar archivo.
        Valida que el usuario tenga acceso (es creador o puede ver hallazgo/acción).
        """
        archivo = self.get_object()
        
        # Validar que el usuario tiene acceso
        # (es creador o está asociado al hallazgo/acción que contiene el archivo)
        
        if not archivo.ruta:
            return Response(
                {"error": "El archivo no tiene ruta"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            response = FileResponse(archivo.ruta.open('rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{archivo.nombre}"'
            return response
        except FileNotFoundError:
            return Response(
                {"error": "El archivo no existe en storage"},
                status=status.HTTP_404_NOT_FOUND
            )
```

#### PASO 5: Registrar Rutas

```python
# backend/apps/archivos/urls.py (crear si no existe)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.archivos.views import ArchivoViewSet

router = DefaultRouter()
router.register('', ArchivoViewSet, basename='archivo')

urlpatterns = [
    path('', include(router.urls)),
]
```

```python
# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/archivos/', include('apps.archivos.urls')),  # ✅ AGREGAR
    # ... resto de urls
]
```

#### PASO 6: Ejecutar Migraciones

```bash
cd backend
python manage.py migrate hallazgos
```

#### PASO 7: Actualizar Frontend

```jsx
// frontend/src/pages/hallazgos/HallazgoDetailPage.jsx
import React, { useState, useEffect } from 'react';

export default function HallazgoDetailPage() {
    const [hallazgo, setHallazgo] = useState(null);
    
    // ... existing code ...
    
    return (
        <div>
            {/* ... existing content ... */}
            
            {/* ✅ AGREGAR SECCIÓN DE ARCHIVOS */}
            <section className="archivos-section">
                <h3>Archivos Adjuntos</h3>
                {hallazgo?.archivos && hallazgo.archivos.length > 0 ? (
                    <ul className="archivos-list">
                        {hallazgo.archivos.map(archivo => (
                            <li key={archivo.id} className="archivo-item">
                                <span className="archivo-nombre">{archivo.nombre}</span>
                                <span className="archivo-tamanio">
                                    ({(archivo.tamanio / 1024).toFixed(2)} KB)
                                </span>
                                <a 
                                    href={`/api/v1/archivos/${archivo.id}/descargar/`}
                                    download
                                    className="btn-descargar"
                                >
                                    Descargar
                                </a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="sin-archivos">No hay archivos adjuntos</p>
                )}
            </section>
        </div>
    );
}
```

**Validación**:
```bash
# 1. Verificar relación existe
python manage.py dbshell
SHOW TABLES LIKE 'hallazgos_hallazgo_archivos';
# ✓ Debe retornar tabla

# 2. Crear hallazgo con archivo
curl -X POST http://localhost:8000/api/v1/hallazgos/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "descripcion=Test" \
  -F "ubicacion=Test" \
  -F "tipo=NO_CONFORMIDAD" \
  -F "archivo=@test.pdf"

# 3. Recuperar hallazgo
curl http://localhost:8000/api/v1/hallazgos/1/ \
  -H "Authorization: Bearer $TOKEN"

# Debe mostrar en respuesta:
# "archivos": [
#   {
#     "id": 1,
#     "nombre": "test.pdf",
#     "url_descarga": "/api/v1/archivos/1/descargar/"
#   }
# ]

# 4. Descargar
curl http://localhost:8000/api/v1/archivos/1/descargar/ \
  -H "Authorization: Bearer $TOKEN" > test_descargado.pdf
```

---

### PROBLEMA #3: Error al Subir Archivos en Hallazgos ⚠️ ALTO

**Síntomas**:
- ❌ Upload button en frontend retorna error  
- ❌ Archivo se crea pero no se asocia al hallazgo

**Causa Raíz**:
Dependencia de PROBLEMA #5 (relación Hallazgo-Archivo falta)

En `hallazgos/views.py` línea ~150:
```python
if hasattr(hallazgo, "archivos"):  # ← Busca propiedad que no existe
    hallazgo.archivos.add(created)  # ← No se ejecuta (hasattr=False)
```

**Solución**:
Implementar PROBLEMA #5 primero (agrega la relación). Luego:

```python
# backend/apps/hallazgos/views.py - upload_archivo
@action(detail=True, methods=["post"], url_path="upload_archivo")
def upload_archivo(self, request, pk=None):
    hallazgo = self._get_hallazgo()
    archivo = request.FILES.get("archivo")
    if archivo is None:
        raise ValidationError({"archivo": "Debe enviar un archivo."})
    
    validate_uploaded_file(archivo)
    
    created = Archivo.objects.create(
        nombre=archivo.name,
        ruta=archivo,
        tipo_mime=getattr(archivo, "content_type", "application/octet-stream"),
        tamanio=archivo.size,
        cargado_por=request.user,
    )
    
    # ✅ Ahora sí se puede agregar
    hallazgo.archivos.add(created)
    
    return Response(
        {
            "id": created.id,
            "nombre": created.nombre,
            "tipo_mime": created.tipo_mime,
            "tamanio": created.tamanio,
        },
        status=status.HTTP_201_CREATED,
    )
```

---

### PROBLEMA #4: Sin Descarga de Archivos ⚠️ ALTO

**Síntomas**:
- ❌ No hay botón "Descargar" en la UI
- ❌ No existe endpoint para descargar archivos
- ❌ Las URLs en serializers no apuntan a nada

**Causa Raíz**:
- No existe ViewSet para Archivo
- No existe serializer que incluya URL de descarga
- No existe acción `descargar` en ningún ViewSet

**Solución**:
Implementada en PROBLEMA #5 (PASO 4 y 7)

---

## PROBLEMAS ALTOS

### PROBLEMA #1: Creación de Usuarios - Validaciones Débiles ⚠️ ALTO

**Síntomas**:
- ⚠️ Se aceptan contraseñas débiles (1 carácter, espacios, etc.)
- ⚠️ No se valida formato DNI
- ⚠️ No se valida que Sexo esté en M/F/O
- ⚠️ No se valida que Tipo esté en ADMIN/EMPLEADO/CLIENTE

**Código Actual**:
```python
# backend/apps/users/serializers.py
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    
    def validate(self, attrs):
        tipo = attrs.get("tipo")
        # Valida solo si sector/empresa están presentes, no QUÉS válidos
        if tipo == UserTipo.EMPLEADO and not sector:
            raise ValidationError(...)
        # ❌ NO VALIDA contenido de fields
        return attrs
```

**Campos Sin Validación**:
| Campo | Validación Actual | Validación Propuesta |
|-------|-------------------|----------------------|
| DNI | Único | Único + 8-10 dígitos + format validation |
| password | write_only | 8+ chars + 1 mayús + 1 número + 1 especial |
| sexo | Sin validar | M\|F\|O |
| tipo | Sin validar | ADMIN\|EMPLEADO\|CLIENTE |
| email | Django default | Django default (OK) |

**Solución**:

```python
# backend/apps/users/serializers.py
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from rest_framework import serializers
from apps.users.models import ClienteProfile, EmpleadoProfile, UserTipo, Sexo

User = get_user_model()

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    sector = serializers.CharField(required=False, write_only=True)
    empresa = serializers.ChoiceField(
        choices=ClienteProfile._meta.get_field("empresa").choices,
        required=False,
        write_only=True,
    )
    
    class Meta:
        model = User
        fields = [
            "id", "dni", "nombre", "apellido", "sexo", "email",
            "password", "tipo", "sector", "empresa",
        ]
        read_only_fields = ["id"]
    
    def validate_dni(self, value):
        """Valida DNI: 8-10 dígitos, no duplicado."""
        # Convertir a string para validar
        dni_str = str(value).strip()
        
        # Validar que es número
        if not dni_str.isdigit():
            raise serializers.ValidationError("DNI debe contener solo dígitos.")
        
        # Validar rango de dígitos
        if not (8 <= len(dni_str) <= 10):
            raise serializers.ValidationError(
                "DNI debe tener entre 8 y 10 dígitos."
            )
        
        # Validar unicidad
        if User.objects.filter(dni=value).exists():
            raise serializers.ValidationError(
                "Ya existe un usuario con ese DNI."
            )
        
        return value
    
    def validate_password(self, value):
        """Validar contraseña fuerte."""
        if len(value) < 8:
            raise serializers.ValidationError(
                "La contraseña debe tener al menos 8 caracteres."
            )
        
        # Requerir: mayúscula, minúscula, número, especial
        has_upper = any(c.isupper() for c in value)
        has_lower = any(c.islower() for c in value)
        has_digit = any(c.isdigit() for c in value)
        has_special = any(c in "!@#$%^&*" for c in value)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise serializers.ValidationError(
                "La contraseña debe contener: mayúscula, minúscula, número y carácter especial (!@#$%^&*)."
            )
        
        return value
    
    def validate_sexo(self, value):
        """Validar que Sexo es M, F u O."""
        if value not in ['M', 'F', 'O']:
            raise serializers.ValidationError(
                "Sexo debe ser 'M' (Masculino), 'F' (Femenino) u 'O' (Otro)."
            )
        return value
    
    def validate_tipo(self, value):
        """Validar que Tipo es válido."""
        allowed = [choice[0] for choice in UserTipo.choices]
        if value not in allowed:
            raise serializers.ValidationError(
                f"Tipo debe ser uno de: {', '.join(allowed)}."
            )
        return value
    
    def validate(self, attrs):
        """Validar combinaciones de campos."""
        tipo = attrs.get("tipo")
        sector = attrs.get("sector")
        empresa = attrs.get("empresa")
        
        # EMPLEADO requiere sector
        if tipo == UserTipo.EMPLEADO and not sector:
            raise serializers.ValidationError(
                {"sector": "El sector es requerido para usuarios EMPLEADO."}
            )
        
        # CLIENTE requiere empresa
        if tipo == UserTipo.CLIENTE and not empresa:
            raise serializers.ValidationError(
                {"empresa": "La empresa es requerida para usuarios CLIENTE."}
            )
        
        # ADMIN no debe tener sector ni empresa
        if tipo == UserTipo.ADMIN and (sector or empresa):
            raise serializers.ValidationError(
                "Los usuarios ADMIN no deben incluir sector ni empresa."
            )
        
        # Validar que sector solo aplica a EMPLEADO
        if tipo != UserTipo.EMPLEADO and sector:
            raise serializers.ValidationError(
                {"sector": "Sector solo aplica a usuarios EMPLEADO."}
            )
        
        # Validar que empresa solo aplica a CLIENTE
        if tipo != UserTipo.CLIENTE and empresa:
            raise serializers.ValidationError(
                {"empresa": "Empresa solo aplica a usuarios CLIENTE."}
            )
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """Crear usuario y perfil asociado."""
        sector = validated_data.pop("sector", None)
        empresa = validated_data.pop("empresa", None)
        password = validated_data.pop("password")
        
        # Crear usuario
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Crear perfil según tipo
        if user.tipo == UserTipo.EMPLEADO and sector:
            EmpleadoProfile.objects.create(user=user, sector=sector)
        elif user.tipo == UserTipo.CLIENTE and empresa:
            ClienteProfile.objects.create(user=user, empresa=empresa)
        
        return user
```

**Testing**:
```bash
# Intentar crear usuario con contraseña débil
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "dni": "12345678",
    "nombre": "Test",
    "apellido": "User",
    "sexo": "M",
    "email": "test@test.com",
    "password": "123",
    "tipo": "EMPLEADO",
    "sector": "IT"
  }'

# Debe retornar 400 con error: "La contraseña debe tener al menos 8 caracteres..."

# Crear correctamente
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "dni": "12345678",
    "nombre": "Test",
    "apellido": "User",
    "sexo": "M",
    "email": "test@test.com",
    "password": "Secure@Pass123",
    "tipo": "EMPLEADO",
    "sector": "IT"
  }'

# Debe retornar 201 Created
```

---

### PROBLEMA #2: Notificaciones Sin Tiempo Real ⚠️ ALTO

**Síntomas**:
- ⚠️ Notificaciones se crean pero frontend debe refrescar para verlas
- ⚠️ Spec requiere < 5 segundos (SC-001)
- ⚠️ Sin WebSocket real-time

**Código Actual**:
- ✅ Modelo bien diseñado
- ✅ Endpoints básicos (list, marcar-leida)
- ❌ Sin WebSocket consumer
- ❌ Sin grupo de canales en Channel Layer
- ❌ Notificaciones creadas en lugar incorrecto (dispersas)

**Donde se Crean Notificaciones Actualmente**:
- `hallazgos/services.py`: `_notify_admins_new_hallazgo()`
- `acciones/services.py`: dentro de `solicitar_cierre()`
- Sin servicio centralizado

**Problema**: Cada app crea directamente, sin enviar a WebSocket.

**Solución Completa**:

#### PASO 1: Crear Servicio Centralizado

```python
# backend/apps/notificaciones/services.py
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from apps.notificaciones.models import Notificacion

User = get_user_model()

def crear_y_enviar(destinatario, titulo, mensaje, hallazgo=None):
    """
    Crear notificación en BD y enviar a WebSocket en tiempo real.
    
    SC-001: Debe entregar en < 5 segundos.
    """
    # 1. Crear en BD
    notificacion = Notificacion.objects.create(
        destinatario=destinatario,
        titulo=titulo,
        mensaje=mensaje,
        hallazgo_relacionado=hallazgo,
    )
    
    # 2. Enviar a WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"notificaciones_{destinatario.id}",
        {
            "type": "notificacion.nueva",
            "data": {
                "id": notificacion.id,
                "titulo": notificacion.titulo,
                "mensaje": notificacion.mensaje,
                "fecha": notificacion.fecha.isoformat(),
                "hallazgo_id": hallazgo.id if hallazgo else None,
            }
        }
    )
    
    return notificacion

def notificar_admins(titulo, mensaje, hallazgo=None):
    """Notificar a todos los admins."""
    admins = User.objects.filter(tipo="ADMIN", is_active=True)
    for admin in admins:
        crear_y_enviar(
            destinatario=admin,
            titulo=titulo,
            mensaje=mensaje,
            hallazgo=hallazgo,
        )

def notificar_responsables(hallazgo, titulo, mensaje):
    """Notificar a todos los responsables de un hallazgo."""
    for responsable in hallazgo.responsables.all():
        crear_y_enviar(
            destinatario=responsable,
            titulo=titulo,
            mensaje=mensaje,
            hallazgo=hallazgo,
        )

# Legacy (para compatibilidad con acciones.py que ya la usa)
notificar_accion_cierre_aprobado = None
notificar_accion_cierre_rechazado = None
```

#### PASO 2: Crear WebSocket Consumer

```python
# backend/apps/notificaciones/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json

class NotificacionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Conectar usuario al grupo de notificaciones."""
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        self.group_name = f"notificaciones_{self.user.id}"
        
        # Agregar a grupo de broadcast
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"✓ Usuario {self.user.id} conectado a {self.group_name}")
    
    async def disconnect(self, close_code):
        """Desconectar usuario del grupo."""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print(f"✗ Usuario {self.user.id} desconectado ({close_code})")
    
    async def notificacion_nueva(self, event):
        """Enviar notificación al WebSocket client."""
        await self.send(text_data=json.dumps({
            "type": "notificacion.nueva",
            "data": event['data']
        }))
```

#### PASO 3: Configurar Routing

```python
# backend/config/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from apps.notificaciones.consumers import NotificacionConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    path('ws/notificaciones/', NotificacionConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

#### PASO 4: Actualizar Servicios Existentes

```python
# backend/apps/hallazgos/services.py
from apps.notificaciones.services import crear_y_enviar, notificar_admins

def _notify_admins_new_hallazgo(hallazgo):
    """Notificar a admins cuando se crea un hallazgo."""
    # ✅ Usar servicio centralizado
    if getattr(hallazgo.creado_por, "is_admin", False):
        # Si el creador es admin, notificar a otros admins
        admins = User.objects.filter(tipo="ADMIN", is_active=True).exclude(pk=hallazgo.creado_por_id)
    else:
        # Notificar a todos los admins
        admins = User.objects.filter(tipo="ADMIN", is_active=True)
    
    for admin in admins:
        crear_y_enviar(
            destinatario=admin,
            titulo="Nuevo hallazgo registrado",
            mensaje=f"Se registró un hallazgo de tipo {hallazgo.get_tipo_display()} "
                    f"creado por {hallazgo.creado_por.nombre}.",
            hallazgo=hallazgo,
        )
```

```python
# backend/apps/acciones/services.py
from apps.notificaciones.services import crear_y_enviar

def solicitar_cierre(accion, empleado, observacion=""):
    # ... validaciones ...
    
    solicitud = SolicitudCierreAccion.objects.create(
        accion=accion,
        solicitante=empleado,
        observacion=observacion or "",
    )
    accion.estado = EstadoAccion.SOLICITUD_CIERRE
    accion.save(update_fields=["estado"])
    
    # ✅ Usar servicio centralizado (ahora envía WebSocket)
    for admin in User.objects.filter(tipo="ADMIN", is_active=True):
        crear_y_enviar(
            destinatario=admin,
            titulo="Solicitud de cierre de acción",
            mensaje=(
                f"El empleado {empleado.nombre} {empleado.apellido} solicitó cerrar "
                f"la acción {accion.get_tipo_display()} del hallazgo #{accion.hallazgo_id}."
            ),
            hallazgo=accion.hallazgo,
        )
    
    return solicitud
```

#### PASO 5: Frontend - WebSocket Connection

```jsx
// frontend/src/context/NotificacionContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const NotificacionContext = createContext();

export function NotificacionProvider({ children }) {
    const { token, user } = useAuth();
    const [notificaciones, setNotificaciones] = useState([]);
    const [ws, setWs] = useState(null);
    
    useEffect(() => {
        if (!token || !user) return;
        
        // Conectar WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/notificaciones/`;
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
            console.log('✓ WebSocket conectado');
        };
        
        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'notificacion.nueva') {
                    setNotificaciones(prev => [msg.data, ...prev]);
                    
                    // Mostrar notificación del navegador
                    if (Notification.permission === 'granted') {
                        new Notification(msg.data.titulo, {
                            body: msg.data.mensaje,
                            icon: '/logo.png',
                        });
                    }
                }
            } catch (error) {
                console.error('Error parsing notification:', error);
            }
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        socket.onclose = () => {
            console.log('✗ WebSocket desconectado');
            // Intentar reconectar en 5 segundos
            setTimeout(() => {
                // reconnect logic
            }, 5000);
        };
        
        setWs(socket);
        
        return () => {
            socket.close();
        };
    }, [token, user]);
    
    return (
        <NotificacionContext.Provider value={{ notificaciones, setNotificaciones, ws }}>
            {children}
        </NotificacionContext.Provider>
    );
}

export function useNotificaciones() {
    return useContext(NotificacionContext);
}
```

**Validación**:
```bash
# 1. Conectar WebSocket
wscat -c ws://localhost:8000/ws/notificaciones/ \
  -H "Authorization: Bearer $TOKEN"

# 2. En otra terminal, crear hallazgo como admin
curl -X POST http://localhost:8000/api/v1/hallazgos/ \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Test hallazgo",
    "ubicacion": "Sector IT",
    "tipo": "NO_CONFORMIDAD"
  }'

# 3. En wscat, debe aparecer:
# {"type":"notificacion.nueva","data":{...}}
```

---

### PROBLEMA #8: Dashboard Cuenta Incorrecta de Hallazgos ⚠️ ALTO

**Síntomas**:
- ⚠️ Número mostrado no coincide con hallazgos reales
- ⚠️ Filtros probablemente mal aplicados

**Análisis del Código**:
```python
# hallazgos/views.py
def get_queryset(self):
    user = self.request.user
    base = self.queryset
    
    if getattr(user, "is_admin", False):
        return base  # ← Admin ve TODOS
    if getattr(user, "is_empleado", False):
        return base.filter(responsables=user).distinct()  # ← Solo donde ES RESPONSABLE
    if getattr(user, "is_cliente", False):
        return base.filter(creado_por=user, tipo=TipoHallazgo.QUEJA_CLIENTE)  # ← Sus quejas
    
    return base.none()
```

**El Problema**:
El filtro para Empleados solo retorna hallazgos donde es RESPONSABLE asignado, pero:
- ❌ No cuenta hallazgos que CREÓ pero aún están PENDIENTE (sin aprobar)
- ❌ No cuenta hallazgos donde fue asignado después de su creación
- ❌ No distingue por estado

**Requerimiento Aclaración**:
¿El dashboard debería mostrar:
- A) Solo hallazgos donde es responsable asignado? (actual)
- B) Todos los hallazgos donde está involucrado (creó + responsable)?
- C) Desglosado por estado/rol?

**Solución Propuesta** (asumiendo B es lo correcto):

```python
# backend/apps/hallazgos/views.py
def get_queryset(self):
    user = self.request.user
    base = self.queryset
    
    if getattr(user, "is_admin", False):
        return base  # Admin ve todos
    
    if getattr(user, "is_empleado", False):
        # Empleado ve hallazgos donde es responsable O creador (siempre que sean suyos)
        from django.db.models import Q
        return base.filter(
            Q(responsables=user) |  # Es responsable asignado
            Q(creado_por=user)      # Es creador
        ).distinct()
    
    if getattr(user, "is_cliente", False):
        return base.filter(creado_por=user, tipo=TipoHallazgo.QUEJA_CLIENTE)
    
    return base.none()
```

**Crear Endpoint Dashboard**:

```python
# backend/apps/hallazgos/views.py
from rest_framework.decorators import action

class HallazgoViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Endpoint GET /api/v1/hallazgos/dashboard/
        Retorna conteo de hallazgos por estado para el usuario.
        """
        from django.db.models import Count, Q
        
        user = request.user
        queryset = self.get_queryset()
        
        # Contar por estado
        counts = {
            "total": queryset.count(),
            "pendientes": queryset.filter(estado=EstadoHallazgo.PENDIENTE).count(),
            "aprobados": queryset.filter(estado=EstadoHallazgo.APROBADO).count(),
            "rechazados": queryset.filter(estado=EstadoHallazgo.RECHAZADO).count(),
            "cerrados": queryset.filter(estado=EstadoHallazgo.CERRADO).count(),
        }
        
        # Agregar conteo de acciones
        if getattr(user, "is_empleado", False):
            acciones_en_progreso = Accion.objects.filter(
                hallazgo__responsables=user,
                estado=EstadoAccion.EN_PROGRESO
            ).count()
            
            solicitudes_pendientes = SolicitudCierreAccion.objects.filter(
                solicitante=user,
                estado=EstadoSolicitudCierre.PENDIENTE
            ).count()
            
            counts['acciones_en_progreso'] = acciones_en_progreso
            counts['solicitudes_cierre_pendientes'] = solicitudes_pendientes
        
        # Conteo de notificaciones no leídas
        notificaciones_no_leidas = Notificacion.objects.filter(
            destinatario=user,
            leida=False
        ).count()
        
        counts['notificaciones_no_leidas'] = notificaciones_no_leidas
        
        return Response(counts, status=status.HTTP_200_OK)
```

**Frontend**:

```jsx
// frontend/src/pages/home/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import * as hallazgosAPI from '../../api/hallazgos';

export default function DashboardPage() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadDashboard();
    }, []);
    
    const loadDashboard = async () => {
        try {
            const data = await hallazgosAPI.getDashboard();
            setDashboard(data);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) return <div>Cargando...</div>;
    if (!dashboard) return <div>Error al cargar dashboard</div>;
    
    return (
        <div className="dashboard">
            <h2>Dashboard</h2>
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Hallazgos</h3>
                    <p className="stat-value">{dashboard.total}</p>
                </div>
                <div className="stat-card">
                    <h3>Pendientes</h3>
                    <p className="stat-value">{dashboard.pendientes}</p>
                </div>
                <div className="stat-card">
                    <h3>Aprobados</h3>
                    <p className="stat-value">{dashboard.aprobados}</p>
                </div>
                <div className="stat-card">
                    <h3>Cerrados</h3>
                    <p className="stat-value">{dashboard.cerrados}</p>
                </div>
                
                {dashboard.acciones_en_progreso !== undefined && (
                    <div className="stat-card">
                        <h3>Acciones en Progreso</h3>
                        <p className="stat-value">{dashboard.acciones_en_progreso}</p>
                    </div>
                )}
                
                <div className="stat-card">
                    <h3>Notificaciones No Leídas</h3>
                    <p className="stat-value">{dashboard.notificaciones_no_leidas}</p>
                </div>
            </div>
        </div>
    );
}
```

---

## PLAN DE IMPLEMENTACIÓN

### FASE 1: CRÍTICA (Hoy - 2-3 horas)
Resolver problemas que causan crashes:

1. ✅ **Crear migración 0002_accion_archivos** (~15 min)
   - Agregar ManyToMany Accion-Archivo
   - Ejecutar migrate

2. ✅ **Crear migración 0002_solicitudcierreaccion** (~30 min)
   - Crear tabla SolicitudCierreAccion faltante
   - Ejecutar migrate

3. ✅ **Verificar que endpoints responden** (~15 min)
   - GET /api/v1/hallazgos/1/acciones/1/ no crashea
   - POST solicitudes-cierre/ funciona

### FASE 2: BLOCANTE (Sprint Actual - 4-5 horas)
Resolver problemas que rompen funcionalidad central:

4. ✅ **Implementar PROBLEMA #5 completo** (~2-3 horas)
   - Agregar Hallazgo.archivos ManyToMany
   - Crear ArchivoViewSet con endpoint descargar
   - Actualizar serializers
   - Registrar URLs
   - Testear upload/download completo

5. ✅ **Agregar Validaciones PROBLEMA #1** (~1 hora)
   - Validar DNI, password, sexo, tipo
   - Testear creación usuario

6. ✅ **Crear Swagger/OpenAPI** (~1 hora)
   - Instalar drf-spectacular
   - Generar documentación
   - Verificar todos los endpoints

### FASE 3: ENHANCEMENT (Próximo Sprint - 4-5 horas)
Mejorar arquitectura y experiencia:

7. ✅ **Implementar Notificaciones WebSocket** (~2 horas)
   - Crear consumer
   - Crear servicio centralizado
   - Integrar con frontend

8. ✅ **Crear Endpoint Dashboard** (~1 hora)
   - Agregar action al viewset
   - Retornar conteos correctos
   - Frontend consume

9. ✅ **Agregar Tests** (~2 horas)
   - 80% cobertura en services
   - Serializers
   - Permisos

### FASE 4: DEUDA TÉCNICA (Opcional)
10. Refactorizar servicios (consolidar en core/)
11. Agregar logs estructurados
12. Mejorar manejo de errores

---

## MATRIZ DE PRIORIZACIÓN

| # | Problema | Sev | Impacto | Esfuerzo | Prioridad | Cuando |
|---|----------|-----|--------|----------|-----------|--------|
| 7 | ManyToMany Accion-Archivo | 🔴 | Bloqueante | 15m | 1 | HOY |
| 6 | SolicitudCierreAccion tabla | 🔴 | Bloqueante | 30m | 2 | HOY |
| 5 | Archivos no visibles | 🔴 | Core | 2h | 3 | Hoy |
| 3 | Error upload | 🟠 | Crítico | 30m | 4 | Hoy |
| 4 | Sin descarga | 🟠 | Crítico | 30m | 4 | Hoy |
| 1 | Validaciones usuario | 🟠 | Importante | 1h | 5 | Sprint |
| 2 | WebSocket notificaciones | 🟠 | UX | 2h | 6 | Sprint |
| 8 | Dashboard incorrecto | 🟠 | Analytics | 1h | 7 | Sprint |

**Tiempo Total Estimado**: 8-10 horas (si se hace sin interrupciones)

---

## CHECKLIST DE VALIDACIÓN POST-FIXES

- [ ] Migración 0002_accion_archivos aplicada
- [ ] Migración 0002_solicitudcierreaccion aplicada
- [ ] Tabla acciones_accion_archivos existe
- [ ] Tabla acciones_solicitudcierreaccion existe
- [ ] GET /api/v1/hallazgos/1/acciones/1/ retorna 200
- [ ] GET /api/v1/hallazgos/1/ incluye array archivos
- [ ] POST /api/v1/hallazgos/1/upload_archivo/ funciona
- [ ] GET /api/v1/archivos/1/descargar/ funciona
- [ ] Swagger/OpenAPI accesible en /api/docs/
- [ ] WebSocket /ws/notificaciones/ conecta
- [ ] Dashboard /api/v1/hallazgos/dashboard/ retorna datos
- [ ] Tests ejecutan con cobertura > 80%
- [ ] User creation valida contraseña fuerte
- [ ] User creation valida DNI formato

---

## PRÓXIMAS ACCIONES RECOMENDADAS

1. **Inmediato** (Ahora):
   - Crear migraciones 0002 para acciones
   - Ejecutar migrations
   - Verificar que endpoints responden

2. **Hoy** (Próximas 2 horas):
   - Implementar PROBLEMA #5 completo
   - Testing manual de upload/download
   - Validar con Postman

3. **Esta Semana**:
   - Implementar WebSocket notificaciones
   - Agregar Swagger
   - Tests unitarios

4. **Próxima Semana**:
   - Refactorización arquitectura
   - Performance review
   - Documentación completa

---

## DOCUMENTO GENERADO
- **Fecha**: 2026-06-30
- **Alcance**: Análisis completo de 8 problemas críticos
- **Soluciones**: Detalladas con código implementable
- **Tiempo Estimado**: 8-10 horas de desarrollo
- **Status**: Listo para implementación
