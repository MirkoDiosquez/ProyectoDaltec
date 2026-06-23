# Implementation Plan: Sistema de Gestión de Hallazgos y Acciones Correctivas

**Branch**: `001-gestion-hallazgos` | **Date**: 2026-06-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-gestion-hallazgos/spec.md`

## Summary

Sistema web completo para registrar, aprobar, gestionar y cerrar Hallazgos (No Conformidades, Oportunidades de Mejora, Quejas de Cliente) con ciclos de Acciones Correctivas, chat colaborativo en tiempo real y notificaciones push al Administrador. El Administrador conserva sus funciones propias y, ademas, puede ejecutar funciones operativas de usuario normal sin autorizaciones adicionales; los hallazgos creados por Administrador se registran autoaprobados. El backend se implementa con Django REST Framework + Django Channels sobre MySQL y Redis; el frontend con React consumiendo las APIs REST y WebSocket.

## Technical Context

**Language/Version**: Python 3.11 (backend), JavaScript / TypeScript (React frontend)

**Primary Dependencies**: Django 4.2 (ASGI/WSGI), Django REST Framework 3.x, djangorestframework-simplejwt, Django Channels 4.x, channels-redis, django-cors-headers, Pillow; React 18, React Router 6, Axios

**Storage**: MySQL 8.x (relacional primario), Redis 7.x (cache, sesiones, Channel Layer)

**Testing**: pytest-django (backend — unit + integration), Jest + React Testing Library (frontend)

**Target Platform**: Linux server — Nginx (reverse proxy) → Daphne (ASGI)

**Project Type**: Web service (REST API + WebSocket) + Web application (React SPA)

**Performance Goals**: Notificaciones en tiempo real < 5 s (SC-001); remoción de participante de chat < 2 s (SC-003)

**Constraints**: Adjuntos: tipos PDF/imágenes/Office; tamaño máximo configurable vía env var. No multi-tenancy. JWT auth. HTTPS en producción.

**Scale/Scope**: Decenas a cientos de usuarios concurrentes (entorno corporativo). 5 dominios funcionales (usuarios, hallazgos, acciones, chat, notificaciones).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Stack Tecnológico**: Feature uses only Django/Channels, React, Nginx, MySQL, Redis.
- [x] **II. Prohibición de Hardcode**: Límites de archivo, tipos permitidos, credenciales DB, JWT secret — todos desde env vars/settings.
- [x] **III. Separación de Responsabilidades**: Lógica de negocio (transiciones de estado, permisos) en Django; solo UI en React.
- [x] **IV. API First**: Endpoints REST y consumers WebSocket documentados en `contracts/` antes de implementación frontend.
- [x] **V. Escalabilidad**: Django Channels + Redis Channel Layer; tokens JWT sin estado; diseño stateless.
- [x] **VI. Seguridad**: JWT auth, validación server-side por rol, HTTPS enforced, principio de menor privilegio por rol.
- [x] **VII. Calidad del Código**: Apps Django por dominio, capa de servicios separada de vistas, DRY, tipos donde aplica.
- [x] **VIII. Observabilidad**: Logging estructurado Django; trazabilidad vía modelo `Notificacion` y `SolicitudCierreAccion`.
- [x] **IX. Compatibilidad de Infraestructura**: Ninguna tecnología nueva fuera del stack aprobado.
- [x] **X. Regla Suprema**: Trade-offs resueltos en orden: Mantenibilidad → Seguridad → Escalabilidad → Simplicidad → Rendimiento.
- [x] **XI. Configuración Dinámica**: `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `JWT_ACCESS_LIFETIME`, `JWT_REFRESH_LIFETIME` externalizados.

## Project Structure

### Documentation (this feature)

```text
specs/001-gestion-hallazgos/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── rest-api.md
│   └── websocket.md
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── config/                    # Django project: settings, urls, asgi, wsgi
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── users/                 # Usuarios, roles, auth (FR-001–003, FR-023–025)
│   ├── hallazgos/             # Hallazgo, transiciones de estado (FR-004–010, FR-022, FR-040)
│   ├── acciones/              # Accion, SolicitudCierreAccion (FR-014–019)
│   ├── chat/                  # Chat, Mensaje, consumers WS (FR-011–013)
│   ├── archivos/              # Archivo, manejo de uploads (FR-015)
│   └── notificaciones/        # Notificacion, push via Channels (FR-008)
├── tests/
│   ├── unit/
│   └── integration/
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
└── manage.py

frontend/
├── src/
│   ├── api/                   # Clientes REST (Axios) y WebSocket
│   ├── components/            # Componentes UI reutilizables
│   ├── pages/
│   │   ├── auth/
│   │   ├── hallazgos/
│   │   ├── acciones/
│   │   ├── chat/
│   │   └── users/
│   ├── context/               # AuthContext, NotificacionContext
│   └── hooks/
├── tests/
└── package.json

nginx/
└── nginx.conf

docker-compose.yml
.env.example
```

**Structure Decision**: Opción 2 — aplicación web con `backend/` y `frontend/` separados. El backend usa Django multi-app organizado por dominio. El frontend es un React SPA. Nginx enruta `/api/` y `/ws/` a Django (Daphne ASGI) y todo lo demás al build estático de React.
