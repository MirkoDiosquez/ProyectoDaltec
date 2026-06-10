# Spec Review Checklist: Sistema de Gestión de Hallazgos y Acciones Correctivas

**Purpose**: Auto-revisión pre-planning — validar calidad, completitud y claridad de los requisitos escritos en spec.md antes de proceder a `/speckit.plan`
**Created**: 2026-06-10
**Feature**: [spec.md](../spec.md)
**Depth**: Rápido · **Audience**: Autor · **Scope**: Todos los dominios

---

## Ciclo de Vida del Hallazgo

- [ ] CHK001 - ¿FR-014 especifica en qué momento se crean las tres acciones de un hallazgo (al crearse, al aprobarse, o manualmente por el Admin)? [Clarity, Spec §FR-014, Gap]
- [ ] CHK002 - ¿FR-009 aclara si el Admin puede reclasificar un hallazgo ya APROBADO o únicamente los que están en estado PENDIENTE? [Clarity, Spec §FR-009]
- [ ] CHK003 - ¿Los requisitos definen qué ocurre con el chat y las acciones de un hallazgo cuando este pasa a estado RECHAZADO (se preservan, se bloquean, se eliminan)? [Edge Case, Gap]

## Ciclo de Vida de las Acciones

- [ ] CHK004 - ¿FR-016 especifica si cualquier responsable del hallazgo puede solicitar el cierre de cualquier acción, o solo el responsable asignado específicamente a esa acción? [Clarity, Spec §FR-016]
- [ ] CHK005 - ¿Los requisitos definen qué sucede con una SolicitudCierreAccion pendiente si el responsable que la generó es removido del hallazgo antes de que el Admin la resuelva? [Edge Case, Gap]
- [ ] CHK006 - ¿FR-022 (cierre automático del Hallazgo) define qué sucede si una de las tres acciones nunca fue iniciada — puede cerrarse igualmente si las otras dos están CERRADAS? [Clarity, Spec §FR-022]

## Autorización y Visibilidad

- [ ] CHK007 - ¿FR-024 especifica si un Empleado que creó un hallazgo pero no fue asignado como responsable puede o no visualizarlo? [Clarity, Spec §FR-024]
- [ ] CHK008 - ¿Los requisitos de visibilidad por rol (FR-023/024/025) cubren explícitamente el acceso a los archivos adjuntos y a las acciones, no solo al hallazgo en sí? [Completeness, Spec §FR-023, Gap]
- [ ] CHK009 - ¿Los requisitos especifican si el Admin tiene acceso al chat de los hallazgos como participante activo (puede escribir) o solo como observador de solo lectura? [Gap, Completeness]

## Chat

- [ ] CHK010 - ¿FR-011 define cuándo se crea el chat asociado al hallazgo: al momento de creación del hallazgo, al aprobarse, o al asignarse el primer responsable? [Clarity, Spec §FR-011]
- [ ] CHK011 - ¿La regla de que el historial de mensajes se conserva cuando un responsable es removido está documentada como requisito (FR) o únicamente como supuesto? [Completeness, Spec §Assumptions]

## Notificaciones

- [ ] CHK012 - ¿Los requisitos cubren qué eventos adicionales generan notificaciones al Admin más allá de la creación de hallazgos — por ejemplo, solicitudes de cierre de acciones (FR-016/017)? [Completeness, Gap]
- [ ] CHK013 - ¿FR-008 define el comportamiento de las notificaciones cuando no hay sesión activa del Admin: ¿se acumulan para lectura posterior o se pierden? [Completeness, Spec §FR-008]

## Archivos Adjuntos

- [ ] CHK014 - ¿Los requisitos definen si los archivos pueden ser eliminados después de cargarse y qué rol tiene permiso para hacerlo? [Gap, Completeness]
- [ ] CHK015 - ¿FR-028/029 especifican que la validación de tipo y tamaño aplica en el backend (no solo en el frontend), de forma que no pueda ser eludida? [Clarity, Spec §FR-028]

## Criterios de Éxito Medibles

- [ ] CHK016 - ¿SC-001 ("menos de 5 segundos") define las condiciones de carga o infraestructura bajo las cuales se mide ese tiempo de respuesta? [Measurability, Spec §SC-001]
- [ ] CHK017 - ¿SC-006 ("múltiples usuarios simultáneamente") cuantifica el número mínimo de usuarios concurrentes que el sistema debe soportar sin degradación? [Measurability, Spec §SC-006]

## Consistencia entre Requisitos

- [ ] CHK018 - ¿FR-012 (solo responsables vigentes acceden al chat) es consistente con el supuesto documentado de que el historial de mensajes se conserva tras remover un responsable? ¿Está resuelto el aparente conflicto entre acceso y preservación? [Consistency, Spec §FR-012]
