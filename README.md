# Sistema de Gestión de Hallazgos y Acciones Correctivas

> Plataforma web para el registro, evaluación, seguimiento y cierre de hallazgos organizacionales — incluyendo No Conformidades, Oportunidades de Mejora y Quejas de Cliente.

---

## Índice

- [Descripción general](#descripción-general)
- [Stack tecnológico](#stack-tecnológico)
- [Actores del sistema](#actores-del-sistema)
- [Flujo principal](#flujo-principal)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Principios de arquitectura](#principios-de-arquitectura)
- [Especificación del proyecto](#especificación-del-proyecto)

---

## Descripción general

El sistema permite a organizaciones gestionar de forma integral sus hallazgos internos y externos, trazando un ciclo de vida completo desde la detección hasta el cierre verificado:

1. **Registro** — Empleados y Clientes reportan hallazgos según su rol.
2. **Evaluación** — El Administrador aprueba, rechaza o reclasifica cada hallazgo.
3. **Ejecución** — Los responsables asignados completan las acciones de mejora con evidencias.
4. **Cierre** — El cierre de cada acción requiere aprobación explícita del Administrador. Cuando las tres acciones de un hallazgo están cerradas, el hallazgo se cierra automáticamente.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React |
| Backend | Django (WSGI) + Django Channels |
| Servidor web | Nginx |
| Base de datos | MySQL |
| Cache / Colas / WebSockets | Redis |

> El stack es **fijo y no negociable** según la constitución del proyecto. Cualquier incorporación de tecnologías equivalentes requiere aprobación arquitectónica explícita.

---

## Actores del sistema

### Administrador
- Crea todos los usuarios del sistema.
- Aprueba, rechaza y reclasifica hallazgos.
- Asigna y remueve responsables de hallazgos.
- Aprueba o rechaza solicitudes de cierre de acciones.
- Visualiza todos los hallazgos del sistema.
- Recibe notificaciones de todos los hallazgos creados.

### Empleado
- Se autentica con DNI y contraseña.
- Crea hallazgos de tipo **No Conformidad** y **Oportunidad de Mejora**.
- Actualiza y carga evidencias en las acciones donde es responsable.
- Solicita el cierre de acciones.
- Visualiza solo los hallazgos donde está asignado como responsable.
- Participa en el chat del hallazgo mientras sea responsable vigente.

### Cliente
- Se autentica con DNI y contraseña.
- Crea hallazgos de tipo **Queja de Cliente** (aprobación automática).
- Visualiza únicamente sus propias quejas.

---

## Flujo principal

```
[Empleado / Cliente]
        │
        ▼
  Crea hallazgo
        │
        ├─── Queja de Cliente ──────────────────────► APROBADO (automático)
        │                                                      │
        └─── No Conformidad / Oportunidad de Mejora            │
                    │                                          │
                    ▼                                          │
             PENDIENTE ──► Admin evalúa                        │
                    │                                          │
             ┌──────┴──────┐                                   │
             ▼             ▼                                   │
         RECHAZADO      APROBADO ◄─────────────────────────────┘
         (terminal)         │
                            ▼
                  Admin asigna responsables
                            │
                            ▼
              ┌─────────────────────────────┐
              │ Acción Inmediata            │
              │ Acción Correctiva           │ ── Responsables completan y solicitan cierre
              │ Verificación de Eficacia    │       │
              └─────────────────────────────┘       ▼
                                             Admin aprueba cierre
                                                    │
                              Cuando las 3 acciones están CERRADAS
                                                    │
                                                    ▼
                                             Hallazgo CERRADO
```

---

## Estructura del repositorio

```
ProyectoDaltec/
│
├── specs/                          # Especificaciones del proyecto (Spec Kit)
│   └── 001-gestion-hallazgos/
│       ├── spec.md                 # Especificación funcional completa
│       └── checklists/
│           ├── requirements.md     # Checklist de calidad de requisitos
│           └── spec-review.md      # Checklist de revisión pre-planning
│
├── .specify/                       # Configuración de Spec Kit
│   ├── memory/
│   │   └── constitution.md        # Principios de arquitectura del proyecto
│   └── templates/                 # Plantillas de spec, plan, tasks, checklist
│
├── .github/
│   ├── copilot-instructions.md    # Instrucciones para el agente de IA
│   └── prompts/                   # Comandos del workflow de especificación
│
└── README.md
```

> El código fuente de la aplicación (backend Django, frontend React, configuración Nginx) se incorporará en iteraciones posteriores conforme avance el planning e implementación.

---

## Principios de arquitectura

El proyecto está gobernado por una [constitución técnica](.specify/memory/constitution.md) con 11 principios innegociables. Los más relevantes para contribuidores:

| # | Principio | Resumen |
|---|-----------|---------|
| I | Stack obligatorio | Django + Channels, React, Nginx, MySQL, Redis — sin excepciones |
| II | Sin hardcode | Toda configuración proviene de variables de entorno, archivos de config o base de datos |
| III | Separación de responsabilidades | Lógica de negocio crítica solo en el backend |
| IV | API First | El frontend solo consume APIs documentadas del backend |
| VI | Seguridad | HTTPS, CSRF, validación en backend, JWT, mínimo privilegio |
| X | Regla suprema | Prioridad: Mantenibilidad → Seguridad → Escalabilidad → Simplicidad → Rendimiento |
| XI | Config dinámica | Reglas de negocio, límites y parámetros configurables fuera del código |

---

## Especificación del proyecto

La especificación funcional completa se encuentra en [`specs/001-gestion-hallazgos/spec.md`](specs/001-gestion-hallazgos/spec.md) e incluye:

- **5 historias de usuario** con escenarios de aceptación (Given/When/Then)
- **29 requisitos funcionales** (FR-001 a FR-029)
- **8 entidades del dominio**: Usuario, Hallazgo, Acción, SolicitudCierreAccion, Chat, Mensaje, Archivo, Notificación
- **6 criterios de éxito** medibles
- **5 clarificaciones** integradas sobre ciclo de vida, autorización y adjuntos

El workflow de especificación utiliza [Spec Kit](https://github.com/speckit) con los comandos `/speckit.specify`, `/speckit.clarify`, `/speckit.checklist`, `/speckit.plan` e `/speckit.implement`.

---

## Mejoras Fase 11 & 12: Polish y Deployment (2026-07-05)

### Fase 11: Pulido y Preocupaciones Transversales (T133-T159)

#### 1. Logging & Observabilidad (T133-T134)
- **Structured JSON logging** para eventos críticos de negocio:
  - Creación de hallazgos
  - Aprobación/rechazo de análisis cinco porqués
  - Aprobación/rechazo de solicitudes de cambio de responsable
  - Mensajes de chat urgentes (#urgente)
  - Envío de notificaciones
- **Management command** `export_audit_log` para exportar auditoria a JSON/CSV con filtros de fecha
- Logging configurado por nivel y rotación de archivos (10MB, 5 backups)

#### 2. API Documentation (T135-T136)
- OpenAPI/Swagger schema generado desde DRF
- Swagger UI accesible en `/api/docs/`
- Documentación interactiva de todos los endpoints

#### 3. Error Handling Frontend (T137-T139)
- **ErrorBoundary** React component para capturar errores
- **API Error Handler** con normalización de mensajes, logging y toast notifications
- Manejo automático de errores (401, 403, 404, 400, 500, network)

#### 4. Performance Optimization (T140-T143)
- Paginación en listados (default: 20 items, configurable)
- Optimización de queries: `select_related()`, `prefetch_related()`
- Caching de catalogs en Redis (TTL: 24h, invalidación en cambios)
- Code splitting frontend (componentes lazy-loaded)

#### 5. Security Review (T144-T148)
- CSRF tokens en todos los endpoints POST/PATCH/DELETE
- JWT token expiration (15 min access, 7 days refresh)
- Rate limiting en upload de archivos
- Validación de MIME types y tamaño
- HTTPS redirect en producción (SECURE_SSL_REDIRECT)

#### 6. Testing & QA (T149-T152)
- Pytest coverage target: >70% backend
- Jest coverage target: >60% frontend
- Validación scenarios (VS-01 a VS-08) desde quickstart.md
- Regression testing checklist

#### 7. Documentation (T153-T155)
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Diseño del sistema, modelos, service layer, API, WebSocket, auth, deployment
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Setup dev, deploy production, DB migrations, troubleshooting, backup/recovery
- README actualizado con features

#### 8. Deployment Preparation (T156-T159)
- `.dockerignore` con patrones de exclusión (Python, Node, IDE, logs, .git)
- `docker-compose.yml` actualizado con variables de ambiente
- Test de build Docker local
- **[DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)**: Pre/post deployment verification

### Fase 12: Deployment & Monitoring (T160-T168)

#### Deployment Steps
1. **Database Backup (T160)**: `mysqldump` con verificación de integridad
2. **Code Deployment (T164-T165)**: Backend + Frontend via CI/CD pipeline
3. **Database Migrations (T161)**: `python manage.py migrate` en ventana de mantenimiento
4. **Catalog Load (T162)**: `python manage.py loaddata catalogs.json`
5. **Cache Clear (T163)**: `python manage.py clear_cache` + Redis restart
6. **Smoke Tests (T166)**: API health, WebSocket connectivity, file upload, notifications
7. **Monitoring (T167)**: Error logs, performance metrics, uptime monitoring por 24h
8. **Rollback Plan**: Database restore, image rollback si es necesario

#### Post-Launch (T168)
- Recopilación de feedback de usuarios
- Creación de backlog de issues para Phase 2
- Actualización de documentación según feedback

---

## Quick Start

### Development

```bash
# Clone repo
git clone https://github.com/yourorga/ProyectoDaltec.git
cd ProyectoDaltec

# Copy environment
cp .env.example .env

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Load catalogs
docker-compose exec backend python manage.py loaddata backend/apps/catalogos/fixtures/catalogs.json

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Access app
open http://localhost:3000
```

### Production

```bash
# See DEPLOYMENT_CHECKLIST.md for complete pre-deployment verification
# See DEPLOYMENT.md for step-by-step instructions
# See ARCHITECTURE.md for system design details

# Key steps:
1. Backup database (T160)
2. Deploy code via CI/CD (T164-T165)
3. Run migrations (T161)
4. Load catalogs (T162)
5. Clear cache (T163)
6. Run smoke tests (T166)
7. Monitor logs (T167)
```

---

## Documentation

| Documento | Contenido |
|-----------|-----------|
| [`specs/003-mejoras-hallazgos/spec.md`](specs/003-mejoras-hallazgos/spec.md) | 8 historias de usuario, 45+ requisitos funcionales |
| [`specs/003-mejoras-hallazgos/plan.md`](specs/003-mejoras-hallazgos/plan.md) | Plan técnico, arquitectura, stack |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Componentes, modelos de datos, service layer, API, WebSocket, auth, deployment |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Setup, deployment, migrations, troubleshooting, backup/recovery |
| [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md) | Pre-deployment verification, deployment steps, smoke tests, rollback |
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | 11 principios arquitectónicos innegociables |

---

## Support

Para reportar issues, consultar la documentación o contribuir:

1. Revisa [ARCHITECTURE.md](docs/ARCHITECTURE.md) para entender el diseño
2. Consulta [DEPLOYMENT.md](docs/DEPLOYMENT.md) para problemas de deployment
3. Crea un issue en GitHub con descripción clara
4. Contacta a DevOps: ops@daltec.com
