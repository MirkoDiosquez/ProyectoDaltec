# Guía de Funcionalidades del Sistema de Gestión de Hallazgos

## 1. Objetivo
Este documento explica las funciones principales del sistema y cómo utilizarlas en el trabajo diario.

El sistema permite:
- Registrar hallazgos (no conformidades, oportunidades de mejora y quejas de cliente).
- Asignar responsables y dar seguimiento a acciones.
- Gestionar análisis de causa raíz (5 porqués).
- Colaborar por chat con adjuntos.
- Notificar eventos importantes en tiempo real.
- Cerrar hallazgos con trazabilidad.

---

## 2. Perfiles y permisos

### Administrador
Puede:
- Crear usuarios.
- Aprobar o rechazar hallazgos.
- Asignar o remover responsables.
- Aprobar/rechazar solicitudes de cierre de acciones.
- Aprobar/rechazar análisis de 5 porqués.
- Aprobar/rechazar solicitudes de cambio de responsable.
- Ver todos los hallazgos y notificaciones.

### Empleado
Puede:
- Crear hallazgos (no conformidad y oportunidad de mejora).
- Ejecutar acciones cuando está asignado como responsable.
- Adjuntar evidencias.
- Solicitar cierre de acciones.
- Crear análisis de 5 porqués si es responsable del hallazgo.
- Participar en el chat del hallazgo.

### Cliente
Puede:
- Crear quejas de cliente.
- Ver sus propias quejas.

---

## 3. Flujo general de uso
1. Se crea un hallazgo.
2. El administrador lo evalúa (si aplica).
3. Se asignan responsables.
4. Se ejecutan acciones con evidencias.
5. Se solicita y aprueba el cierre de acciones.
6. Al cerrar todas las acciones requeridas, el hallazgo pasa a cerrado.

---

## 4. Funcionalidades y cómo usarlas

## 4.1 Inicio de sesión y acceso
1. Ingresar DNI y contraseña.
2. Confirmar el rol activo según el usuario.
3. Verificar que el panel muestre solo módulos permitidos para ese rol.

Uso recomendado:
- Si no aparecen catálogos o listas al entrar, refrescar la sesión y validar que el token esté activo.

## 4.2 Gestión de usuarios (Administrador)
1. Ir a módulo de usuarios.
2. Crear usuario con datos básicos y rol.
3. Definir permisos de acceso según funciones.
4. Guardar y validar que el usuario pueda iniciar sesión.

Buenas prácticas:
- Asignar solo los permisos necesarios.
- Evitar cuentas compartidas.

## 4.3 Registro de hallazgos
1. Ir a Crear Hallazgo.
2. Completar título y descripción.
3. Seleccionar clasificación:
- Sector.
- Subsección (cuando el sector lo requiere).
- Tipo (no conformidad, oportunidad de mejora o queja).
4. Adjuntar archivos de evidencia si corresponde.
5. Guardar.

Notas de uso:
- Las quejas de cliente pueden seguir flujo de aprobación automática según configuración.
- La clasificación por sector y subsección facilita filtros y reportes.

## 4.4 Gestión de acciones
Cada hallazgo puede tener acciones de seguimiento.

Cómo usar:
1. Entrar al detalle del hallazgo.
2. Crear o editar acción asignada.
3. Registrar avance y evidencia.
4. Cambiar estado según progreso.

Objetivo:
- Mantener trazabilidad completa entre hallazgo, acción y evidencia.

## 4.5 Solicitud de cierre de acciones
1. El responsable completa la acción.
2. Solicita cierre desde la acción.
3. El administrador revisa evidencia.
4. El administrador aprueba o rechaza la solicitud.

Resultado:
- Si se aprueban las acciones requeridas, el hallazgo puede cerrarse automáticamente.

## 4.6 Análisis de 5 porqués
1. Abrir el hallazgo.
2. Ir a sección Análisis 5 Porqués.
3. Registrar secuencia de porqué 1 a porqué 5.
4. Adjuntar soporte cuando aplique.
5. Enviar para revisión (si no lo crea un administrador).

Aprobación:
- Si lo crea un administrador, puede quedar autoaprobado según reglas.
- Si lo crea un responsable, requiere revisión administrativa.

## 4.7 Chat del hallazgo y adjuntos
1. Entrar al chat del hallazgo.
2. Enviar mensajes de coordinación.
3. Adjuntar archivos cuando se necesite contexto o evidencia.
4. Usar etiqueta #urgente para marcar prioridad.

Recomendación:
- Mantener conversaciones relacionadas solo al hallazgo actual.

## 4.8 Cambio de responsable
1. Responsable actual crea solicitud de cambio.
2. Indica tipo de solicitud (agregar o cambiar responsable) y usuario propuesto.
3. Administrador evalúa la solicitud.
4. Si se aprueba, el sistema actualiza responsables y participantes del chat.

## 4.9 Notificaciones
El panel de notificaciones muestra eventos clave por categoría.

Ejemplos:
- Cierres pendientes por aprobar.
- Aprobación de 5 porqués pendiente.
- Solicitudes de cambio de responsable.
- Mensajes urgentes de chat.

Cómo usar:
1. Abrir panel de notificaciones.
2. Entrar al evento desde el acceso directo.
3. Marcar como leído al resolver.

## 4.10 Archivos: carga, vista y descarga
1. Subir archivo desde hallazgo, acción, análisis o chat.
2. Previsualizar archivos compatibles (imagen/PDF).
3. Descargar cuando se necesite revisión local.

Validaciones esperadas:
- Tipo de archivo permitido.
- Tamaño máximo configurado.

## 4.11 Reportes y seguimiento
1. Aplicar filtros por estado, tipo, sector, subsección, fecha y responsable.
2. Revisar indicadores de abiertos, en proceso y cerrados.
3. Exportar resultados si el módulo lo permite.

Uso recomendado:
- Revisar semanalmente pendientes críticos y tiempos de cierre.

---

## 5. Recomendaciones operativas
- Completar descripciones claras y accionables.
- Adjuntar evidencia suficiente antes de solicitar cierre.
- Usar notificaciones como bandeja diaria de trabajo.
- Mantener responsables actualizados para evitar bloqueos.
- Estandarizar uso de etiquetas en chat (por ejemplo, #urgente).

---

## 6. Solución de problemas frecuentes

### No puedo ver un hallazgo
- Verificar rol y permisos.
- Confirmar si estás asignado como responsable o creador (según reglas del módulo).

### No aparece una lista de catálogos
- Esperar carga completa de sesión.
- Validar que la autenticación esté activa.
- Refrescar la vista si la sesión acaba de iniciar.

### Falla la carga de archivos
- Confirmar formato permitido.
- Validar tamaño máximo.
- Reintentar con conexión estable.

### No recibo notificaciones en tiempo real
- Verificar sesión activa.
- Confirmar conectividad y recargar el módulo.

---

## 7. Checklist rápido de uso diario
- Revisar notificaciones pendientes.
- Actualizar acciones en curso.
- Resolver solicitudes de cierre.
- Verificar urgentes en chat.
- Cerrar hallazgos completados.

---

## 8. Referencias internas del proyecto
- Documento general del sistema: README.md
- Arquitectura técnica: docs/ARCHITECTURE.md
- Despliegue: docs/DEPLOYMENT.md
- Checklist de despliegue: docs/DEPLOYMENT_CHECKLIST.md
