# Spec Review Checklist: Sistema de Gestión de Hallazgos y Acciones Correctivas

**Purpose**: Auto-revisión pre-planning — validar calidad, completitud y claridad de los requisitos escritos en spec.md antes de proceder a `/speckit.plan`
**Created**: 2026-06-10
**Feature**: [spec.md](../spec.md)
**Depth**: Rápido · **Audience**: Autor · **Scope**: Todos los dominios

---

## Ciclo de Vida del Hallazgo

- [x] CHK001 - ¿FR-014 especifica en qué momento se crean las tres acciones de un hallazgo (al crearse, al aprobarse, o manualmente por el Admin)? [Clarity, Spec §FR-014, Gap]
- [x] CHK002 - ¿FR-009 aclara si el Admin puede reclasificar un hallazgo ya APROBADO o únicamente los que están en estado PENDIENTE? [Clarity, Spec §FR-009]
- [x] CHK003 - ¿Los requisitos definen qué ocurre con el chat y las acciones de un hallazgo cuando este pasa a estado RECHAZADO (se preservan, se bloquean, se eliminan)? [Edge Case, Gap]

## Ciclo de Vida de las Acciones

- [x] CHK004 - ¿FR-016 especifica si cualquier responsable del hallazgo puede solicitar el cierre de cualquier acción, o solo el responsable asignado específicamente a esa acción? [Clarity, Spec §FR-016]
- [x] CHK005 - ¿Los requisitos definen qué sucede con una SolicitudCierreAccion pendiente si el responsable que la generó es removido del hallazgo antes de que el Admin la resuelva? [Edge Case, Gap]
- [x] CHK006 - ¿FR-022 (cierre automático del Hallazgo) define qué sucede si una de las tres acciones nunca fue iniciada — puede cerrarse igualmente si las otras dos están CERRADAS? [Clarity, Spec §FR-022]

## Autorización y Visibilidad

- [x] CHK007 - ¿FR-024 especifica si un Empleado que creó un hallazgo pero no fue asignado como responsable puede o no visualizarlo? [Clarity, Spec §FR-024]
- [x] CHK008 - ¿Los requisitos de visibilidad por rol (FR-023/024/025) cubren explícitamente el acceso a los archivos adjuntos y a las acciones, no solo al hallazgo en sí? [Completeness, Spec §FR-023, Gap]
- [x] CHK009 - ¿Los requisitos especifican si el Admin tiene acceso al chat de los hallazgos como participante activo (puede escribir) o solo como observador de solo lectura? [Gap, Completeness]

## Chat

- [x] CHK010 - ¿FR-011 define cuándo se crea el chat asociado al hallazgo: al momento de creación del hallazgo, al aprobarse, o al asignarse el primer responsable? [Clarity, Spec §FR-011]
- [x] CHK011 - ¿La regla de que el historial de mensajes se conserva cuando un responsable es removido está documentada como requisito (FR) o únicamente como supuesto? [Completeness, Spec §Assumptions]

## Notificaciones

- [x] CHK012 - ¿Los requisitos cubren qué eventos adicionales generan notificaciones al Admin más allá de la creación de hallazgos — por ejemplo, solicitudes de cierre de acciones (FR-016/017)? [Completeness, Gap]
- [x] CHK013 - ¿FR-008 define el comportamiento de las notificaciones cuando no hay sesión activa del Admin: ¿se acumulan para lectura posterior o se pierden? [Completeness, Spec §FR-008]

## Archivos Adjuntos

- [x] CHK014 - ¿Los requisitos definen si los archivos pueden ser eliminados después de cargarse y qué rol tiene permiso para hacerlo? [Gap, Completeness]
- [x] CHK015 - ¿FR-028/029 especifican que la validación de tipo y tamaño aplica en el backend (no solo en el frontend), de forma que no pueda ser eludida? [Clarity, Spec §FR-028]

## Criterios de Éxito Medibles

- [x] CHK016 - ¿SC-001 ("menos de 5 segundos") define las condiciones de carga o infraestructura bajo las cuales se mide ese tiempo de respuesta? [Measurability, Spec §SC-001]
- [x] CHK017 - ¿SC-006 ("múltiples usuarios simultáneamente") cuantifica el número mínimo de usuarios concurrentes que el sistema debe soportar sin degradación? [Measurability, Spec §SC-006]

## Consistencia entre Requisitos

- [x] CHK018 - ¿FR-012 (solo responsables vigentes acceden al chat) es consistente con el supuesto documentado de que el historial de mensajes se conserva tras remover un responsable? ¿Está resuelto el aparente conflicto entre acceso y preservación? [Consistency, Spec §FR-012]

---

## Reconciliación 2026-06-16 — Audit post-clarificación

**Propósito**: Evaluar qué ítems CHK001–CHK018 quedaron cubiertos por las sesiones de clarificación y documentar los gaps remanentes como nuevos ítems.

### Ítems resueltos (CHK001–CHK018)

- [x] CHK001 — RESUELTO: FR-014 actualizado especifica creación automática al crear el Hallazgo [Spec §FR-014]
- [x] CHK002 — RESUELTO: FR-009 indica explícitamente "en estado PENDIENTE" [Spec §FR-009]
- [x] CHK004 — RESUELTO: FR-016 "cualquier acción que esté a su cargo"; sin asignación por acción individual [Spec §FR-016]
- [x] CHK007 — RESUELTO: FR-024 + Clarification 2026-06-10 — Empleados ven solo donde son responsables [Spec §FR-024]
- [x] CHK009 — RESUELTO: FR-031 define acceso Admin de solo lectura al chat [Spec §FR-031]
- [x] CHK011 — RESUELTO: Historial documentado en Assumptions section
- [x] CHK012 — RESUELTO: US3 Scenario 3 cubre notificación al Admin por solicitud de cierre
- [x] CHK013 — RESUELTO: Modelo Notificacion con leida=False implica acumulación; Assumption cubre canal
- [x] CHK015 — RESUELTO: FR-028 especifica "validar en el backend" explícitamente [Spec §FR-028]
- [x] CHK018 — RESUELTO: Acceso removido (FR-012) y preservación de historial (Assumption) son consistentes

### Gaps remanentes — nuevos ítems de calidad de requisitos

- [x] CHK019 — RESUELTO: FR-034 define eliminación en cascada de Acciones al rechazar; Chat no existe en PENDIENTE (FR-011 actualizado) [Spec §FR-034, FR-011]
- [x] CHK020 — RESUELTO: FR-036 define que la SolicitudCierreAccion permanece activa aunque el solicitante sea removido [Spec §FR-036]
- [x] CHK021 — RESUELTO: FR-016 actualizado exige EN_PROGRESO previo; PENDIENTE→SOLICITUD_CIERRE directo no permitido [Spec §FR-016]
- [x] CHK022 — RESUELTO: FR-035 define visibilidad transitiva; archivos y acciones heredan permisos del Hallazgo [Spec §FR-035]
- [x] CHK023 — RESUELTO: FR-011 actualizado define creación del Chat al momento de aprobación del Hallazgo [Spec §FR-011]
- [x] CHK024 — RESUELTO (2026-06-23): FR-039 define eliminación de adjuntos por creador del archivo con autorización explícita del Admin [Spec §FR-039]
- [x] CHK025 — RESUELTO (2026-06-23): SC-001 define medición en entorno de producción, hasta 50 usuarios concurrentes y adjuntos de hasta 3 GB [Spec §SC-001]
- [x] CHK026 — RESUELTO (2026-06-23): SC-006 cuantifica soporte mínimo de 30 usuarios simultáneos [Spec §SC-006]
