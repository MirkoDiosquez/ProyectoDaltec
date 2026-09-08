# Funciones y métodos del sistema

## Objetivo
Este documento describe el funcionamiento de las principales funciones y secciones que componen el sistema, tanto del backend como del frontend, para facilitar mantenimiento y comprensión del código.

## 1) Autenticación

### LoginView
Se encarga de autenticar al usuario mediante DNI y contraseña.

Proceso:
- recibe `dni` y `password`
- busca el usuario por dni
- verifica la contraseña
- valida que el usuario esté activo
- genera tokens JWT de acceso y refresh
- devuelve la información básica del usuario

Este método permite que el frontend pueda iniciar sesión y guardar la sesión del usuario.

### TokenRefreshView
Renueva el token de acceso cuando el token de refresh sigue siendo válido.

Su función es:
- recibir el refresh token
- validarlo
- generar un nuevo access token
- mantener la sesión activa sin volver a pedir credenciales.

### LogoutView
Cierra la sesión del usuario.

Realiza:
- recibir el refresh token
- invalidarlo o ponerlo en blacklisted
- responder sin contenido para indicar cierre exitoso

## 2) Gestión de usuarios

### UserViewSet
Es el punto central para las operaciones sobre usuarios.

Funciones principales:
- listar usuarios
- crear nuevos usuarios
- obtener perfil de un usuario
- editar perfil propio o por administrador
- desactivar o activar usuarios
- cambiar avatar
- borrar usuarios bajo validaciones de seguridad

Además, revisa permisos según el rol de quien hace la petición para evitar que un usuario normal acceda a datos o acciones restringidas.

### me
Endpoint que devuelve el perfil actual del usuario autenticado y permite editarlo.

Se usa para:
- mostrar perfil del usuario actual
- actualizar nombre, apellido, contraseña o datos personales
- mantener la sesión con datos conocidos en la UI

### set_avatar
Permite cambiar la imagen de perfil del usuario autenticado sin requerir contraseña.

Es útil para:
- actualizar avatar desde la pantalla de perfil
- no forzar confirmación extra cuando el usuario solo desea cambiar su imagen

## 3) Hallazgos

### HallazgoViewSet
Es la pieza central de la gestión de hallazgos.

Sus principales tareas son:
- crear hallazgos
- listar hallazgos de acuerdo a permisos
- obtener detalle completo
- aprobar o rechazar hallazgos
- asignar responsables
- cambiar estados
- validar cierres y flujo completo de un hallazgo

Es posible que dentro del modulo se encapsulen más acciones específicas en funciones de servicio o viewsets anidados.

## 4) Acciones

### AccionViewSet
Gestiona las acciones asociadas a cada hallazgo.

Permite:
- consultar acciones por hallazgo
- subir archivos asociados
- solicitar cierre de una acción
- revisar estados de cumplimiento
- mantener la trazabilidad del trabajo realizado

## 5) Chat

### ChatViewSet
Administra la sección de chat vinculada al hallazgo.

Su función es permitir:
- abrir conversaciones por hallazgo
- listar mensajes
- enviar mensajes entre usuarios involucrados
- mantener una comunicación activa entre responsables y administrador

## 6) Notificaciones

### NotificacionViewSet
Maneja el registro, consulta y marca como leída de las notificaciones del sistema.

Se usa para:
- avisar nuevos cambios
- marcar mensajes urgentes
- notificar cierre o aprobación de acciones
- informar tareas pendientes

## 7) Archivos

### ArchivoViewSet
Se encarga del manejo de archivos adjuntos.

Su objetivo es:
- guardar evidencia documental
- relacionar archivos con hallazgos o acciones
- permitir descargar o consultar cada recurso
- mantener la trazabilidad de la información respaldatoria

## 8) Frontend - LoginPage

### LoginPage
Es la pantalla de acceso al sistema.

Su flujo es:
- toma DNI y contraseña
- valida que los campos no estén vacíos
- ejecuta el proceso de login
- si funciona, redirige según la ruta anterior o al listado de hallazgos
- si falla, muestra el mensaje de error correspondiente

También evita que un usuario autenticado vuelva al inicio de sesión por error.

## 9) Frontend - App.jsx

### ProtectedRoute
Protege rutas que requieren autenticación.

Si no hay usuario autenticado, redirige al login. Esto evita acceso a secciones sensibles sin sesión activa.

### RoleRoute
Restringe acceso por rol.

Ejemplo:
- Admin tiene acceso a gestión de usuarios
- Empleado puede crear hallazgos
- Cliente puede crear quejas

Esto permite diferenciar permisos dentro del sistema sin depender exclusivamente del backend.

### ProtectedLayout
Agrega el navbar y mantiene la estructura global de las páginas protegidas.

## 10) Comentarios para mantener el código legible
Para que el código sea más claro, conviene documentar:
- qué hace cada función
- qué parámetros recibe
- qué devuelve
- qué validaciones aplica
- qué permisos exige
- qué casos de error maneja

En este proyecto se puede seguir una convención simple:
- comentarios de bloque para clases o módulos complejos
- comentarios cortos dentro de funciones para explicar pasos clave
- docstrings en viewsets, endpoints y métodos relevantes

## 11) Recomendación general
La clave del sistema está en la combinación de:
- roles de usuario
- permisos
- flujo de hallazgo
- seguimiento de acciones
- evidencias y notificaciones

Entender estas piezas permite leer el código con más facilidad y detectar rápidamente dónde debe corregirse un problema o agregarse una funcionalidad.
