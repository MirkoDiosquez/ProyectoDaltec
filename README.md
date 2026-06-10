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
              │ Verificación de Eficiencia  │       │
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

El workflow de especificación utiliza [Spec Kit](https://github.com/speckit) con los comandos `/speckit.specify`, `/speckit.clarify`, `/speckit.checklist`, `/speckit.plan` y `/speckit.implement`.
