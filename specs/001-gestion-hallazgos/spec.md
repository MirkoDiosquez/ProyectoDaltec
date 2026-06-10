# Feature Specification: Sistema de Gestión de Hallazgos y Acciones Correctivas

**Feature Branch**: `001-gestion-hallazgos`

**Created**: 2026-06-10

**Status**: Draft

## Clarifications

### Session 2026-06-10

- Q: ¿Bajo qué condición un Hallazgo pasa al estado CERRADO? → A: Automáticamente cuando las 3 acciones (Inmediata, Correctiva, Verificación) están en estado CERRADA.
- Q: ¿Qué hallazgos puede ver cada rol? → A: Los Empleados ven solo los hallazgos donde son responsables; el Admin ve todos los hallazgos del sistema; los Clientes ven solo sus propias Quejas.
- Q: ¿El estado RECHAZADO es terminal o puede reabrirse? → A: RECHAZADO es un estado terminal. El Empleado debe crear un nuevo hallazgo si desea reintentar.
- Q: ¿Qué ocurre si el Admin asigna un responsable ya asignado al mismo hallazgo? → A: El sistema ignora la asignación duplicada y muestra un aviso informativo; no es un error bloqueante.
- Q: ¿El sistema limita tipo o tamaño de archivos adjuntos? → A: Se permiten tipos comunes (PDF, imágenes, Office); el tamaño máximo es configurable mediante variable de entorno o archivo de configuración.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro y Aprobación de Hallazgo (Priority: P1)

Un empleado detecta una No Conformidad en su sector y la registra en el sistema con descripción y evidencias adjuntas. El sistema notifica al Administrador, quien la revisa, la aprueba y asigna responsables para su gestión.

**Why this priority**: Es el flujo central del sistema. Sin la capacidad de crear y aprobar hallazgos, ninguna funcionalidad posterior tiene sentido.

**Independent Test**: Se puede testear completamente registrando un hallazgo como Empleado, verificando que el Admin recibe la notificación, y que el Admin puede aprobarlo y asignar responsables.

**Acceptance Scenarios**:

1. **Given** un Empleado autenticado, **When** crea un hallazgo de tipo No Conformidad con descripción, **Then** el hallazgo queda en estado PENDIENTE y el Admin recibe una notificación.
2. **Given** un hallazgo en estado PENDIENTE, **When** el Admin lo aprueba, **Then** el estado cambia a APROBADO y el Admin puede asignar responsables.
3. **Given** un hallazgo en estado PENDIENTE, **When** el Admin lo rechaza, **Then** el estado cambia a RECHAZADO.
4. **Given** un hallazgo en estado PENDIENTE, **When** el Admin lo reclasifica a Oportunidad de Mejora, **Then** el tipo cambia y permanece PENDIENTE hasta nueva decisión.
5. **Given** un Empleado, **When** intenta crear un hallazgo de tipo Queja de Cliente, **Then** el sistema rechaza la operación con mensaje de error apropiado.

---

### User Story 2 - Queja de Cliente (Priority: P2)

Un Cliente externo detecta un problema con el servicio y lo registra como Queja de Cliente. El sistema la registra automáticamente sin requerir aprobación y notifica al Administrador.

**Why this priority**: Las quejas de cliente tienen un flujo diferente al resto de hallazgos (aprobación automática) y representan un canal crítico de retroalimentación externa.

**Independent Test**: Un usuario de tipo Cliente crea una queja; se verifica que el estado es APROBADO automáticamente y que el Admin recibe notificación.

**Acceptance Scenarios**:

1. **Given** un Cliente autenticado, **When** crea una Queja de Cliente, **Then** el hallazgo se registra automáticamente en estado APROBADO y se notifica al Admin.
2. **Given** un Cliente autenticado, **When** intenta crear un hallazgo de tipo No Conformidad, **Then** el sistema rechaza la operación.
3. **Given** una Queja de Cliente registrada, **When** el Admin la visualiza, **Then** puede asignar responsables sin necesidad de aprobarla.

---

### User Story 3 - Gestión de Acciones y Cierre (Priority: P3)

Un Empleado responsable de un hallazgo aprobado completa la información de las acciones asignadas (Acción Inmediata, Acción Correctiva, Verificación de Eficiencia), adjunta evidencias y solicita el cierre de cada acción al finalizarla.

**Why this priority**: Sin el ciclo de acciones, el sistema no puede cerrar hallazgos. Es el flujo operativo post-aprobación.

**Independent Test**: Con un hallazgo aprobado y responsables asignados, un Empleado completa una acción, la adjunta con archivo, solicita cierre y el Admin aprueba.

**Acceptance Scenarios**:

1. **Given** un Empleado responsable de un hallazgo, **When** actualiza la descripción y fechas de una acción, **Then** los cambios se persisten y son visibles para el Admin.
2. **Given** un Empleado responsable, **When** adjunta un archivo a una acción, **Then** el archivo queda asociado con nombre, fecha y usuario que lo cargó.
3. **Given** una acción en progreso, **When** un Empleado responsable solicita su cierre, **Then** el estado cambia a SOLICITUD_CIERRE y el Admin recibe la notificación.
4. **Given** una solicitud de cierre pendiente, **When** el Admin la aprueba, **Then** la acción queda en estado CERRADA.
5. **Given** una solicitud de cierre pendiente, **When** el Admin la rechaza, **Then** la acción vuelve a estado EN_PROGRESO para continuar su ejecución.

---

### User Story 4 - Comunicación mediante Chat (Priority: P4)

Los responsables de un hallazgo colaboran a través de un chat asociado. Al remover un responsable del hallazgo, este pierde automáticamente acceso al chat.

**Why this priority**: La comunicación colaborativa es un diferenciador del sistema, pero no bloquea el flujo principal.

**Independent Test**: Con un hallazgo con dos responsables asignados, ambos pueden enviar mensajes. Al remover uno, ese usuario ya no puede acceder al chat.

**Acceptance Scenarios**:

1. **Given** un hallazgo aprobado con responsables asignados, **When** se visualiza el hallazgo, **Then** existe un chat con todos los responsables como participantes.
2. **Given** un responsable del chat, **When** envía un mensaje, **Then** el mensaje es visible para todos los participantes con fecha y hora.
3. **Given** un responsable removido del hallazgo, **When** intenta acceder al chat, **Then** el sistema le deniega el acceso y el mensaje no está disponible para él.

---

### User Story 5 - Gestión de Usuarios por el Administrador (Priority: P5)

El Administrador crea nuevos usuarios en el sistema, asignándoles tipo (Empleado o Cliente) y credenciales de acceso (DNI y contraseña).

**Why this priority**: Es prerequisito para el uso del sistema pero es una operación de administración puntual.

**Independent Test**: El Admin crea un usuario de tipo Empleado con DNI y contraseña. El usuario creado puede autenticarse y acceder al sistema.

**Acceptance Scenarios**:

1. **Given** el Admin autenticado, **When** crea un usuario con DNI, nombre y contraseña, **Then** el usuario puede iniciar sesión con esas credenciales.
2. **Given** cualquier usuario no administrador, **When** intenta crear otro usuario, **Then** el sistema rechaza la operación.
3. **Given** el Admin, **When** crea un usuario con DNI duplicado, **Then** el sistema rechaza la operación con mensaje de error.

---

### Edge Cases

- ¿Qué sucede si el Admin intenta asignar un responsable que ya fue asignado al mismo hallazgo? El sistema ignora la operación y muestra un aviso informativo (FR-027).
- ¿Qué ocurre si se solicita cerrar una acción que ya está en estado CERRADA?
- ¿Puede el Admin aprobar un hallazgo que ya fue rechazado anteriormente? No; RECHAZADO es un estado terminal (FR-026).
- ¿Puede un Empleado acceder al chat de un hallazgo donde ya no es responsable?
- ¿Qué sucede si un Cliente intenta acceder a hallazgos que no le pertenecen? El sistema debe denegar el acceso (FR-025).

## Requirements *(mandatory)*

### Functional Requirements

**Gestión de Usuarios**

- **FR-001**: El sistema DEBE permitir que únicamente el Administrador cree usuarios de tipo Empleado, Cliente y Administrador.
- **FR-002**: El sistema DEBE autenticar a todos los usuarios mediante DNI y contraseña.
- **FR-003**: El sistema DEBE rechazar la creación de usuarios con DNI duplicado.
- **FR-023**: El Administrador DEBE poder visualizar todos los hallazgos del sistema.
- **FR-024**: Los Empleados DEBEN poder visualizar únicamente los hallazgos en los que estén asignados como responsables.
- **FR-025**: Los Clientes DEBEN poder visualizar únicamente los hallazgos (Quejas de Cliente) que ellos mismos crearon.

**Gestión de Hallazgos**

- **FR-004**: El sistema DEBE permitir a los Empleados crear hallazgos de tipo No Conformidad y Oportunidad de Mejora.
- **FR-005**: El sistema DEBE permitir a los Clientes crear hallazgos de tipo Queja de Cliente únicamente.
- **FR-006**: Los hallazgos creados por Empleados (No Conformidad, Oportunidad de Mejora) DEBEN quedar en estado PENDIENTE hasta aprobación administrativa.
- **FR-007**: Las Quejas de Cliente DEBEN registrarse automáticamente en estado APROBADO sin requerir aprobación.
- **FR-008**: Todo hallazgo creado DEBE generar una notificación al Administrador.
- **FR-009**: El Administrador DEBE poder aprobar, rechazar o reclasificar hallazgos en estado PENDIENTE.
- **FR-010**: El Administrador DEBE poder asignar y remover responsables de cualquier hallazgo aprobado.

**Gestión de Chat**

- **FR-011**: Cada hallazgo DEBE tener un chat colaborativo asociado.
- **FR-012**: Solo los responsables vigentes del hallazgo DEBEN tener acceso al chat.
- **FR-013**: Al remover un responsable del hallazgo, el sistema DEBE eliminarlo automáticamente de los participantes del chat.

**Gestión de Acciones**

- **FR-014**: Cada hallazgo DEBE poder contener exactamente una Acción Inmediata, una Acción Correctiva y una Verificación de Eficiencia.
- **FR-015**: Los responsables DEBEN poder actualizar descripción, fechas y adjuntar archivos en cada acción.
- **FR-016**: Un Empleado responsable DEBE poder solicitar el cierre de cualquier acción que esté a su cargo.
- **FR-017**: El Administrador DEBE poder aprobar o rechazar solicitudes de cierre de acciones.
- **FR-018**: Ninguna acción PUEDE quedar en estado CERRADA sin aprobación explícita del Administrador.
- **FR-019**: El rechazo de una solicitud de cierre DEBE mantener la acción activa para futuras correcciones.
- **FR-022**: El sistema DEBE transicionar automáticamente un Hallazgo al estado CERRADO cuando sus tres acciones (Acción Inmediata, Acción Correctiva y Verificación de Eficiencia) estén en estado CERRADA.
- **FR-026**: El estado RECHAZADO de un Hallazgo es terminal; no puede ser reabierto ni modificado. Si el Empleado desea reintentar, debe crear un nuevo hallazgo.
- **FR-027**: Si el Admin intenta asignar como responsable a un Empleado que ya está asignado al mismo hallazgo, el sistema DEBE ignorar la operación y devolver un aviso informativo sin interrumpir el flujo.
- **FR-028**: El sistema DEBE validar en el backend que los archivos adjuntos sean de tipos permitidos (PDF, imágenes: JPG/PNG/GIF, documentos Office: DOC/DOCX/XLS/XLSX/PPT/PPTX).
- **FR-029**: El sistema DEBE rechazar archivos que superen el tamaño máximo configurado. Dicho límite DEBE ser configurable mediante variable de entorno o archivo de configuración, sin hardcode en el código fuente.

**Archivos Adjuntos**

- **FR-020**: Los hallazgos y las acciones DEBEN permitir adjuntar archivos de evidencia.
- **FR-021**: Cada archivo adjunto DEBE registrar: nombre, fecha de carga, usuario que lo cargó, y ubicación lógica del archivo.

### Key Entities

- **Usuario**: Representa a cualquier persona del sistema. Tiene DNI, nombre, apellido, sexo, email, contraseña y tipo (Admin, Empleado, Cliente). Los Clientes tienen empresa asociada.
- **Hallazgo**: Registro central del sistema. Tiene descripción, fecha de creación, ubicación, tipo (No Conformidad, Oportunidad de Mejora, Queja de Cliente) y estado (Pendiente, Aprobado, Rechazado, Cerrado). Tiene una lista de responsables, un chat asociado, tres acciones y archivos adjuntos. El estado CERRADO se alcanza automáticamente cuando sus tres acciones están en estado CERRADA. El estado RECHAZADO es terminal e irreversible.
- **Acción**: Representa una tarea de mejora asociada a un hallazgo. Tiene descripción, fecha de inicio, fecha de fin, estado y archivos adjuntos. Existen tres subtipos: Acción Inmediata, Acción Correctiva, Verificación de Eficiencia.
- **SolicitudCierreAccion**: Representa el flujo de aprobación del cierre de una acción. Tiene fecha de solicitud, observación, empleado solicitante y administrador resolvente.
- **Chat**: Canal de comunicación asociado a un hallazgo. Contiene mensajes y una lista de participantes (los responsables vigentes del hallazgo).
- **Mensaje**: Texto enviado en un chat. Tiene contenido, fecha/hora y usuario emisor.
- **Archivo**: Evidencia adjunta a un hallazgo o acción. Tiene nombre, ruta de almacenamiento, fecha de carga y usuario que lo cargó.
- **Notificación**: Aviso generado automáticamente al Administrador. Tiene título, mensaje, fecha, estado de lectura y referencia al hallazgo que la originó.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Empleado puede registrar un hallazgo y el Administrador recibe la notificación en menos de 5 segundos.
- **SC-002**: El 100% de las acciones cerradas tiene aprobación explícita del Administrador registrada en el sistema.
- **SC-003**: Al remover un responsable del hallazgo, el sistema elimina al usuario del chat en menos de 2 segundos sin intervención manual.
- **SC-004**: Un usuario puede completar el flujo completo (crear hallazgo → aprobación → asignar responsables → completar acciones → solicitar cierre → aprobar cierre) en una sola sesión sin errores del sistema.
- **SC-005**: El 100% de los hallazgos de tipo Queja de Cliente se registran en estado APROBADO de forma automática, sin acción del Administrador.
- **SC-006**: El sistema soporta múltiples usuarios operando simultáneamente sin pérdida de datos ni inconsistencias en estados de hallazgos.

## Assumptions

- Los usuarios acceden al sistema desde navegadores web de escritorio en entornos de red corporativa.
- El almacenamiento de archivos adjuntos se gestiona en el servidor; el sistema registra la ruta lógica, no el contenido binario en base de datos.
- Un Administrador también puede ser responsable de hallazgos si así se requiere en el futuro, pero no está contemplado en el alcance actual.
- La empresa del Cliente es un dato de catálogo cerrado (número fijo de empresas registradas); su gestión no es parte de este alcance.
- Las notificaciones son en tiempo real dentro del sistema web; no se contempla envío por email o SMS en esta versión.
- El sistema opera en un único tenant (organización); no se contempla multi-tenancy en este alcance.
- Las contraseñas deben almacenarse de forma segura (hash); la política de complejidad de contraseñas seguirá estándares de la industria.
- Los tipos de archivo permitidos en adjuntos son: PDF, imágenes (JPG, PNG, GIF) y documentos Office (DOC, DOCX, XLS, XLSX, PPT, PPTX). El tamaño máximo por archivo es configurable y no está hardcodeado.
- El historial de mensajes de un chat se conserva aunque un responsable sea removido; solo pierde acceso futuro.
