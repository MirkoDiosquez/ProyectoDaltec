# Feature Specification: Mejoras al Sistema de Gestión de Hallazgos

**Feature Branch**: `003-mejoras-hallazgos`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Mejoras al sistema existente de gestión de hallazgos: sector/subsección al crear, datos de contacto de cliente externo, análisis de 5 porqués, adjuntos visualizables, archivos en chat, lista de responsables con toggle, solicitud de cambio de responsable, y panel de notificaciones diferenciado por rol."

---

## Clarifications

### Session 2026-07-05

- Q: ¿Quién puede agregar porqués y quién los aprueba en el análisis de los 5 porqués? → A: Ambos (responsables y Admin) pueden agregar; los de responsables quedan "pendiente" hasta que el Admin los aprueba; los agregados por el Admin quedan automáticamente "aprobados".
- Q: ¿El campo `sector` es independiente del campo `tipo` existente (NO_CONFORMIDAD, OPORTUNIDAD_MEJORA, QUEJA_CLIENTE) o lo reemplaza? → A: Son dimensiones independientes y ortogonales; coexisten en el hallazgo sin restricciones entre sí.
- Q: ¿El panel del Admin muestra los pendientes en una lista unificada o en secciones categorizadas? → A: Secciones categorizadas separadas por tipo de pendiente (una sección por cada categoría).
- Q: ¿La etiqueta #URGENTE requiere mayúsculas exactas o es case-insensitive? → A: Case-insensitive; se detecta en cualquier capitalización (#urgente, #Urgente, #URGENTE).
- Q: ¿Qué métodos de adjunción se deben soportar al enviar archivos en el chat? → A: Ambos: ícono clickeable + soporte de drag-drop en la zona de composición.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Clasificación por Sector y Subsección al Crear Hallazgo (Priority: P1)

Un usuario que registra un hallazgo debe poder clasificarlo según el sector de origen eligiendo de una lista cerrada. Si el sector es "Interno", debe seleccionar también una subsección del área afectada.

**Why this priority**: Es la base estructural que afecta a todos los hallazgos nuevos y determina cómo se organiza la información de origen. Sin esta clasificación, no es posible filtrar ni reportar hallazgos por área.

**Independent Test**: Crear un hallazgo seleccionando sector "Proveedor" → verificar que se guarda sin subsección. Crear otro con sector "Interno" sin subsección → verificar que el sistema impide el envío. Crear con "Interno" + subsección "Producción" → verificar que se guarda correctamente.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en el formulario de creación de hallazgo, **When** selecciona sector "Reclamo cliente" y envía, **Then** el hallazgo se crea sin subsección y el campo subsección no aparece en el formulario.
2. **Given** un usuario en el formulario de creación, **When** selecciona sector "Interno" y no elige subsección, **Then** el sistema bloquea el envío y muestra un mensaje de error indicando que la subsección es obligatoria.
3. **Given** un usuario en el formulario de creación, **When** selecciona sector "Interno" y subsección "Ingeniería", **Then** el hallazgo se crea con ambos campos correctamente asociados.
4. **Given** un usuario en el formulario, **When** cambia el sector de "Interno" a "Proveedor", **Then** el campo subsección desaparece y su valor previo se descarta.

---

### User Story 2 — Datos de Contacto de Cliente Externo en Reclamos de Admins (Priority: P2)

Cuando un administrador registra un hallazgo de sector "Reclamo cliente", debe poder ingresar los datos de contacto de la persona o empresa que realiza el reclamo (nombre, teléfono, email), sin crear una cuenta de usuario en el sistema.

**Why this priority**: Permite que el Admin capture la trazabilidad del reclamo externo al momento de cargarlo, sin necesidad de un sistema de usuarios separado para clientes no digitalizados.

**Independent Test**: Admin crea hallazgo con sector "Reclamo cliente" e ingresa nombre "Empresa X", teléfono "1234567890", email "empresa@x.com" → verificar que los datos de contacto quedan guardados en el hallazgo y son visibles en el detalle.

**Acceptance Scenarios**:

1. **Given** el Admin en el formulario de creación de hallazgo con sector "Reclamo cliente", **When** ingresa nombre de contacto, teléfono y email y envía, **Then** el hallazgo queda registrado con esos datos de contacto asociados.
2. **Given** el Admin crea un hallazgo de "Reclamo cliente", **When** no ingresa ningún dato de contacto, **Then** el sistema permite igualmente la creación (los datos de contacto son opcionales).
3. **Given** un usuario no-administrador crea un hallazgo, **When** el sector es distinto de "Reclamo cliente" o el usuario no es admin, **Then** el campo de datos de contacto no se muestra.
4. **Given** un hallazgo con datos de contacto guardados, **When** cualquier usuario con acceso al detalle lo visualiza, **Then** los datos de contacto del cliente externo son visibles en la sección correspondiente.

---

### User Story 3 — Análisis de los 5 Porqués (Priority: P3)

Dentro del detalle de un hallazgo, los responsables pueden agregar causas raíz encadenadas ("porqués") una a una. Cada porqué ingresado pasa a estado "pendiente de aprobación" y un admin puede aprobarlo,si es un admin el que lo agrega no requiere aprobacion.

**Why this priority**: Es una herramienta de análisis de causa raíz estándar en gestión de calidad. Su ausencia limita la capacidad de documentar la investigación del hallazgo.

**Independent Test**: Con un hallazgo aprobado y un responsable asignado, Responsable agrega "Porqué 1" → estado queda "pendiente". Admin aprueba "Porqué 1" → estado cambia a "aprobado". Responsable agrega "Porqué 2" → Admin lo aprueba. Admin agrega "Porqué 3" directamente → queda en estado "aprobado" sin requerir aprobación adicional. Verificar cadena de 3 causas en el detalle del hallazgo.

**Acceptance Scenarios**:

1. **Given** un hallazgo con al menos un responsable asignado, **When** el responsable agrega un porqué con texto descriptivo, **Then** el porqué queda registrado en estado "pendiente de aprobación" asociado al hallazgo.
2. **Given** un porqué en estado "pendiente", **When** el Admin lo aprueba, **Then** el porqué cambia a estado "aprobado".
3. **Given** un porqué en estado "pendiente", **When** un usuario que no es Admin intenta aprobarlo, **Then** el sistema rechaza la acción.
5. **Given** el Admin agrega directamente un porqué, **When** el porqué es creado, **Then** queda automáticamente en estado "aprobado" sin requerir aprobación adicional.
4. **Given** un hallazgo con varios porqués aprobados, **When** un usuario visualiza el detalle, **Then** los porqués se muestran en orden de carga formando una cadena de causas visible.


---

### User Story 4 — Previsualización y Descarga de Archivos Adjuntos (Priority: P4)

En cualquier sección del sistema donde se puedan cargar archivos (hallazgos,acciones, chat), los archivos deben poder visualizarse directamente en el navegador y descargarse, sin depender de aplicaciones externas.

**Why this priority**: Mejora la usabilidad básica del sistema. Sin previsualización inline, los usuarios deben descargar archivos para ver su contenido, lo que aumenta la fricción operativa.

**Independent Test**: Subir una imagen JPG y un PDF a un hallazgo → verificar que al hacer clic en cada archivo se muestra una previsualización en el navegador sin descargar. Hacer clic en "Descargar" → verificar que el archivo se descarga con nombre original.

**Acceptance Scenarios**:

1. **Given** un archivo de imagen (JPG, PNG, GIF) adjunto a cualquier entidad del sistema, **When** el usuario hace clic en el archivo, **Then** se muestra una previsualización inline dentro del navegador sin abrir una aplicación externa.
2. **Given** un archivo PDF adjunto, **When** el usuario hace clic en él, **Then** se muestra una previsualización del documento dentro de la interfaz del sistema.
3. **Given** cualquier archivo adjunto (imagen, PDF, u otro tipo soportado), **When** el usuario selecciona "Descargar", **Then** el archivo se descarga con su nombre original preservado.
4. **Given** un tipo de archivo no previsualizable (ej. .xlsx, .zip), **When** el usuario hace clic en él, **Then** el sistema inicia la descarga directamente (no muestra previsualización).

---

### User Story 5 — Archivos Adjuntos en el Chat del Hallazgo (Priority: P5)

Los participantes del chat de un hallazgo pueden enviar archivos adjuntos junto con o en lugar de mensajes de texto. Los archivos recibidos pueden visualizarse y descargarse directamente en el chat.

**Why this priority**: Completa la funcionalidad de comunicación del chat, que actualmente solo permite texto.

**Independent Test**: Un responsable sube un archivo desde el chat → el otro responsable ve el archivo en el hilo del chat y puede previsualizarlo → puede descargarlo.

**Acceptance Scenarios**:

1. **Given** un participante del chat de un hallazgo, **When** adjunta un archivo y envía el mensaje, **Then** el archivo aparece en el hilo del chat para todos los participantes.
2. **Given** un archivo enviado en el chat, **When** otro participante hace clic en él, **Then** puede previsualizarlo o descargarlo directamente desde la interfaz del chat.
3. **Given** el Admin leyendo el chat en modo solo lectura, **When** hay archivos enviados por participantes, **Then** el Admin puede visualizarlos y descargarlos aunque no pueda enviar mensajes.

---

### User Story 6 — Gestión de Responsables con Lista y Toggle (Priority: P6)

La sección de gestión de responsables de un hallazgo muestra una lista de todos los usuarios del sistema, permitiendo agregar o quitar responsables directamente desde esa lista.

**Why this priority**: Simplifica el flujo de asignación que actualmente requiere conocer IDs o DNIs de usuarios.

**Independent Test**: Admin abre la sección de responsables de un hallazgo → ve la lista de todos los usuarios → hace clic en "Agregar" junto a un usuario → ese usuario pasa a ser responsable. Hace clic en "Quitar" junto a un responsable → queda eliminado de la lista de responsables.

**Acceptance Scenarios**:

1. **Given** el Admin en la sección de gestión de responsables de un hallazgo, **When** abre la lista de usuarios, **Then** ve todos los usuarios disponibles del sistema con indicador visual de quiénes ya son responsables.
2. **Given** la lista de usuarios con un usuario no-responsable visible, **When** el Admin hace clic en "Agregar", **Then** el usuario queda inmediatamente como responsable del hallazgo.
3. **Given** la lista con un responsable activo, **When** el Admin hace clic en "Quitar", **Then** el usuario queda removido de los responsables del hallazgo.

---

### User Story 7 — Solicitud de Cambio de Responsable (Priority: P7)

Un responsable asignado a un hallazgo puede solicitar al Admin que agregue un responsable adicional o que lo reemplace por otro usuario. La solicitud queda registrada y visible para el Admin hasta que sea resuelta.

**Why this priority**: Permite que los responsables gestionen su carga de trabajo sin necesidad de comunicación fuera del sistema.

**Independent Test**: Responsable envía solicitud "agregar a usuario Y como responsable adicional" → Admin ve la solicitud en el panel de notificaciones/pendientes → Admin aprueba → Usuario Y queda como responsable. Responsable envía solicitud "reemplazarme por usuario Z" → Admin rechaza con observación → solicitud queda marcada como rechazada.

**Acceptance Scenarios**:

1. **Given** un responsable asignado a un hallazgo, **When** envía una solicitud de responsable adicional indicando el usuario propuesto, **Then** la solicitud queda registrada en estado "pendiente" y visible para el Admin.
2. **Given** un responsable asignado, **When** solicita reemplazo proponiendo otro usuario, **Then** la solicitud queda registrada como "cambio de responsable" en estado "pendiente".
3. **Given** el Admin con una solicitud pendiente visible, **When** la aprueba, **Then** el sistema ejecuta la acción correspondiente (agrega al propuesto o realiza el reemplazo) y la solicitud pasa a "aprobada".
4. **Given** el Admin con una solicitud pendiente, **When** la rechaza con una observación, **Then** la solicitud pasa a "rechazada" y el responsable recibe notificación del rechazo con la observación.
5. **Given** una solicitud de "reemplazo", **When** el Admin la aprueba, **Then** el responsable solicitante queda removido y el usuario propuesto queda agregado como responsable.

---

### User Story 8 — Panel de Notificaciones Diferenciado por Rol (Priority: P8)

El sistema cuenta con un panel de notificaciones que muestra contenido relevante según el rol del usuario: el Admin ve pendientes de aprobación y cierres; los empleados ven cuándo los asignan como responsables; cualquier usuario recibe alerta cuando se envía un mensaje con "#URGENTE" en un chat donde participa.

**Why this priority**: Centraliza la atención sobre acciones pendientes y eventos críticos, reemplazando la necesidad de revisar manualmente el estado de cada hallazgo.

**Independent Test**: Crear hallazgo → asignar responsable → empleado recibe notificación de asignación. Admin crea porqué → responsable no ve pendiente de aprobación del porqué en su panel (solo el admin lo ve). Participante de chat envía "#URGENTE mensaje" → todos los participantes del chat reciben notificación de urgencia.

**Acceptance Scenarios**:

1. **Given** un empleado autenticado, **When** es agregado como responsable de un hallazgo, **Then** recibe una notificación en su panel indicando el hallazgo al que fue asignado.
2. **Given** el Admin autenticado, **When** hay solicitudes de cierre de hallazgo pendientes de resolver, **Then** esas solicitudes aparecen en su panel de notificaciones/pendientes.
3. **Given** el Admin autenticado, **When** hay porqués pendientes de aprobación de responsables, **Then** esos porqués aparecen en el panel del Admin como pendientes de resolución.
4. **Given** el Admin con solicitudes de cambio de responsable pendientes, **When** accede a su panel, **Then** ve dichas solicitudes listadas como pendientes.
5. **Given** un participante activo en el chat de un hallazgo, **When** cualquier usuario envía un mensaje que contiene "#URGENTE", **Then** todos los participantes del chat reciben una notificación de urgencia en su panel independientemente de si están conectados al chat en ese momento.
6. **Given** un mensaje de chat con "#URGENTE", **When** el Admin (quien puede leer el chat) está conectado, **Then** el Admin también recibe la notificación de urgencia.

---

### Edge Cases

- ¿Qué sucede si un responsable que tiene una solicitud pendiente es removido del hallazgo antes de que el Admin la resuelva? La solicitud debe quedar marcada como anulada automáticamente.
- ¿Puede un responsable enviar múltiples solicitudes de cambio mientras hay una pendiente? El sistema debe bloquear una segunda solicitud si ya existe una activa no resuelta.
- ¿Qué sucede con los porqués pendientes si se remueve al único responsable? El sistema debe notificar al Admin que no hay responsables disponibles para aprobar los porqués pendientes.
- ¿Qué pasa si se sube un archivo con tipo MIME no soportado al chat? El sistema rechaza el archivo e informa al usuario con un mensaje descriptivo.
- ¿Puede un responsable aprobar sus propios porqués? No — los responsables agregan porqués que quedan en "pendiente"; solo el Admin puede aprobarlos. Los porqués que el Admin agrega directamente se aprueban automáticamente.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Sector y Subsección

- **FR-001**: Al crear un hallazgo, el sistema DEBE presentar un campo "Sector" con exactamente estas opciones: "Reclamo cliente", "Proveedor", "Interno". No se admite texto libre.
- **FR-001b**: El campo "Sector" es independiente del campo "Tipo" existente (NO_CONFORMIDAD, OPORTUNIDAD_MEJORA, QUEJA_CLIENTE); ambos coexisten en el hallazgo sin restricciones cruzadas entre sí.
- **FR-002**: El campo "Sector" DEBE ser obligatorio al crear un hallazgo.
- **FR-003**: Cuando el sector seleccionado es "Interno", el sistema DEBE mostrar un campo "Subsección" obligatorio con exactamente estas opciones: "Administración", "Compras", "Producción", "Ingeniería", "Ventas", "Postventas", "RRHH", "Servicios de terceros", "Otros".
- **FR-004**: Cuando el sector es distinto de "Interno", el campo "Subsección" NO DEBE aparecer ni ser enviado.
- **FR-005**: El sistema DEBE rechazar la creación de un hallazgo con sector "Interno" si no se provee una subsección válida.
- **FR-006**: Las opciones de sector y subsección DEBEN estar definidas fuera del código fuente (configurable), no hardcodeadas.

#### Datos de Contacto de Cliente Externo

- **FR-007**: Cuando el Admin crea un hallazgo con sector "Reclamo cliente", el sistema DEBE mostrar campos opcionales: nombre/empresa del reclamante, número de contacto y email de contacto.
- **FR-008**: Los datos de contacto ingresados DEBEN asociarse al hallazgo sin crear una cuenta de usuario en el sistema.
- **FR-009**: Los datos de contacto del hallazgo DEBEN ser visibles en el detalle del hallazgo para cualquier usuario con acceso.
- **FR-010**: Los campos de contacto NO DEBEN aparecer cuando el creador no es Admin, o cuando el sector es distinto de "Reclamo cliente".
- **FR-011**: Los datos de contacto NO DEBEN ser modificables una vez creado el hallazgo (inmutables post-creación).

#### Análisis de los 5 Porqués

- **FR-012**: El detalle de un hallazgo DEBE incluir una sección "Análisis de los 5 Porqués".
- **FR-013**: Tanto el Admin como los responsables asignados al hallazgo PUEDEN agregar nuevos porqués.
- **FR-014**: Cada porqué DEBE contener al menos un texto descriptivo (causa) y opcionalmente un archivo adjunto. El sistema DEBE permitir adjuntar archivos al crear un porqué mediante: (1) botón clickeable "Adjuntar", (2) drag-drop sobre la zona de edición.
- **FR-015**: Los porqués agregados por un responsable DEBEN quedar en estado "pendiente de aprobación". Los porqués agregados por el Admin quedan automáticamente en estado "aprobado".
- **FR-016**: El Admin DEBE poder aprobar porqués en estado "pendiente de aprobación".
- **FR-017**: Solo el Admin puede aprobar porqués; los responsables únicamente pueden agregar porqués, no aprobarlos.
- **FR-018**: Los porqués DEBEN mostrarse en orden de carga, formando una cadena de causas visible.
- **FR-019**: El sistema NO DEBE limitar el número de porqués a exactamente 5; "5 porqués" es el nombre de la metodología, no un límite técnico.
- **FR-020**: Un porqué aprobado NO DEBE poder ser editado ni eliminado.

#### Archivos Adjuntos — Previsualización y Descarga

- **FR-021**: En todas las secciones donde se admitan archivos adjuntos (chat, porqués, hallazgos, acciones), el sistema DEBE mostrar una previsualización inline para tipos de archivo soportados (imágenes: JPG, PNG, GIF, WEBP; documentos: PDF).
- **FR-021b**: En todas las secciones donde se admitan archivos, el sistema DEBE soportar dos métodos de adjunción: (1) click en un ícono/botón "Adjuntar archivo", (2) drag-drop directo sobre la zona de composición.
- **FR-022**: El sistema DEBE ofrecer una opción de descarga para todos los archivos adjuntos, preservando el nombre original del archivo.
- **FR-023**: Para tipos de archivo no previsualizable (ej. .xlsx, .zip, .docx), el sistema DEBE iniciar la descarga directamente al hacer clic.
- **FR-024**: La previsualización DEBE mostrarse dentro de la interfaz del sistema, sin redirigir a aplicaciones o servicios externos.

#### Archivos en el Chat

- **FR-025**: El chat de hallazgo DEBE permitir enviar archivos adjuntos (solos o junto con texto) usando dos métodos: (1) botón clickeable "Adjuntar", (2) drag-drop sobre la zona de composición.
- **FR-026**: Los archivos enviados en el chat DEBEN aparecer en el hilo de mensajes con previsualización inline (cuando el tipo sea soportado) y opción de descarga.
- **FR-027**: El Admin en modo solo-lectura del chat DEBE poder visualizar y descargar los archivos enviados por participantes.

#### Gestión de Responsables con Lista

- **FR-028**: La sección de responsables de un hallazgo DEBE mostrar una lista de todos los usuarios del sistema disponibles para ser asignados.
- **FR-029**: La lista DEBE indicar visualmente cuáles usuarios ya son responsables del hallazgo (con diferenciación clara).
- **FR-030**: Desde la lista, el Admin DEBE poder agregar un usuario como responsable con una sola acción.
- **FR-031**: Desde la lista, el Admin DEBE poder quitar a un responsable activo con una sola acción.

#### Solicitud de Cambio de Responsable

- **FR-032**: Un responsable asignado a un hallazgo DEBE poder enviar una solicitud al Admin de dos tipos: (a) agregar un responsable adicional o (b) reemplazarlo por otro usuario.
- **FR-033**: La solicitud DEBE incluir el usuario propuesto y opcionalmente una observación.
- **FR-034**: El sistema NO DEBE permitir que un responsable envíe una nueva solicitud si ya tiene una solicitud activa (pendiente) sin resolver para ese hallazgo.
- **FR-035**: La solicitud DEBE quedar en estado "pendiente" y visible para el Admin hasta ser aprobada o rechazada.
- **FR-036**: Cuando el Admin aprueba una solicitud de tipo "adicional", el usuario propuesto DEBE quedar agregado como responsable.
- **FR-037**: Cuando el Admin aprueba una solicitud de tipo "reemplazo", el solicitante DEBE ser removido y el propuesto agregado.
- **FR-038**: El Admin DEBE poder rechazar una solicitud con una observación; el responsable solicitante DEBE recibir notificación del rechazo con la observación incluida.
- **FR-039**: Si el responsable solicitante es removido del hallazgo antes de que la solicitud sea resuelta, la solicitud DEBE quedar anulada automáticamente.

#### Panel de Notificaciones

- **FR-040**: Los empleados (no admin) DEBEN recibir una notificación cuando son agregados como responsables de un hallazgo.
- **FR-041**: El Admin DEBE ver en su panel una sección "Cierres pendientes" con las solicitudes de cierre de hallazgo sin resolver.
- **FR-042**: El Admin DEBE ver en su panel una sección "Porqués a aprobar" con los porqués en estado "pendiente" (agregados por responsables y aún no aprobados).
- **FR-043**: El Admin DEBE ver en su panel una sección "Cambios de responsable" con las solicitudes de cambio de responsable pendientes.
- **FR-043b**: Cada sección del panel del Admin DEBE mostrar el conteo de ítems pendientes y permitir navegar al detalle del hallazgo correspondiente.
- **FR-044**: Cuando un mensaje de chat contiene la etiqueta "#urgente" (case-insensitive; acepta #urgente, #Urgente, #URGENTE, etc.), TODOS los participantes activos del chat (incluyendo el Admin en modo lectura) DEBEN recibir una notificación de urgencia, independientemente de si están conectados al chat en ese momento.
- **FR-045**: Las notificaciones de urgencia por "#urgente" DEBEN llegar a los destinatarios en tiempo real cuando están conectados al sistema.

### Key Entities

- **Sector**: Clasificación de origen del hallazgo. Valores cerrados: "Reclamo cliente", "Proveedor", "Interno". Asociado a un hallazgo. Dimensión ortogonal al campo `tipo` existente (NO_CONFORMIDAD, OPORTUNIDAD_MEJORA, QUEJA_CLIENTE); ambos campos coexisten de forma independiente.
- **Subsección**: Subdivisión del sector "Interno". Valores cerrados: Administración, Compras, Producción, Ingeniería, Ventas, Postventas, RRHH, Servicios de terceros, Otros. Obligatoria solo cuando sector = "Interno".
- **ContactoExterno**: Datos del reclamante externo (nombre/empresa, teléfono, email). Asociado 1:1 a un hallazgo de sector "Reclamo cliente" creado por Admin. No genera usuario en el sistema.
- **PorQue** (causa raíz): Texto descriptivo de una causa raíz, opcionalmente con archivo adjunto. Estado: pendiente / aprobado. Pertenece a un hallazgo. Puede ser creado por el Admin (queda aprobado automáticamente) o por un responsable asignado (queda pendiente hasta aprobación del Admin).
- **SolicitudCambioResponsable**: Solicitud de un responsable activo para agregar un responsable adicional o reemplazarse. Tipo: "adicional" / "reemplazo". Estado: pendiente / aprobada / rechazada / anulada. Contiene usuario propuesto y observación opcional.
- **Mensaje** (extendido): La entidad Mensaje del chat se extiende para soportar archivos adjuntos además de texto.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede clasificar un hallazgo por sector en menos de 30 segundos desde el formulario de creación, sin cometer errores de tipeo gracias a las listas cerradas.
- **SC-002**: El Admin puede registrar un reclamo de cliente externo con sus datos de contacto en una única operación, sin crear una cuenta de usuario adicional.
- **SC-003**: Un análisis de causa raíz completo (múltiples porqués aprobados) puede ser documentado y visualizado dentro del detalle del hallazgo, formando una cadena de causas legible.
- **SC-004**: Los usuarios pueden previsualizar imágenes y PDFs adjuntos sin salir del sistema ni instalar software adicional, reduciendo la fricción operativa.
- **SC-005**: Un responsable puede enviar una solicitud de cambio de responsable y el Admin la visualiza en su panel en menos de 5 segundos.
- **SC-006**: Al enviar un mensaje con "#URGENTE" en un chat, todos los participantes reciben la notificación en tiempo real en menos de 3 segundos.
- **SC-007**: El Admin puede agregar o quitar un responsable de un hallazgo en no más de 2 clics desde la lista de usuarios.

---

## Assumptions

- Las opciones de sector y subsección definidas en este documento son las definitivas para v1; cambios futuros podrán incorporarse sin modificar el código fuente (almacenadas fuera del código).
- Los archivos adjuntos en el chat siguen las mismas reglas de validación de tipo y tamaño que los archivos adjuntos en hallazgos y porqués.
- La previsualización de PDF se implementa usando capacidades nativas del navegador o componentes estándar disponibles en el ecosistema frontend del proyecto, sin servicios externos de terceros.
- El campo "#urgente" es case-insensitive (detecta #urgente, #Urgente, #URGENTE, etc.); variaciones se aceptan todas como activadoras de la notificación de urgencia.
- Las solicitudes de cambio de responsable solo pueden ser enviadas por responsables actuales del hallazgo; usuarios que no son responsables no tienen esta opción.
- Los datos de contacto externo (ContactoExterno) son opcionales en su totalidad: si el Admin no los ingresa, el hallazgo se crea igualmente.
- El límite práctico de porqués por hallazgo no está definido; se usará un límite razonable configurable (ej. 10) como protección contra abuso, almacenado fuera del código fuente.
- La sección de "Gestión de Responsables con Lista" reemplaza o complementa el flujo actual de agregar responsable por ID/DNI; ambas formas deben seguir siendo funcionales para compatibilidad hacia atrás.
