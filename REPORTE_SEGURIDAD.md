# Informe de auditoría de seguridad

**Sistema:** ProyectoDaltec — gestión de hallazgos, acciones, chat y notificaciones  
**Fecha:** 29-09-2026  
**Alcance:** repositorio completo disponible en el workspace; lectura estática del estado de trabajo actual, incluidos cambios locales sin commit.  
**Tipo de evaluación:** revisión de código/configuración y comprobaciones locales no destructivas. No se modificó código de aplicación ni se contactaron servicios externos.

## 1. Resumen ejecutivo

La revisión encontró **27 hallazgos**: **0 críticos, 6 altos, 13 medios y 8 bajos**. Hay exposición de credenciales y respaldos en Git, controles de acceso insuficientes en descargas de archivos y una ruta plausible de XSS almacenado mediante contenido servido desde el mismo origen. También hay configuración de desarrollo seleccionada en el Compose actual, ausencia de TLS en el Nginx del repositorio, debilidades en el ciclo de vida de JWT y restricciones de acceso incompletas en varias superficies.

**Evaluación de preparación para producción: no aprobada con la configuración y código inspeccionados.** Los hallazgos SEC-01 a SEC-06 requieren resolver antes de un despliegue expuesto. SEC-11 también debe corregirse antes de que usuarios no confiables puedan acceder a solicitudes de cambio de responsables. La exposición real a Internet, el uso productivo de las credenciales, el contenido de los respaldos y la posible terminación TLS externa no pudieron verificarse.

### Conteo por estado

| Estado | Cantidad | Interpretación |
|---|---:|---|
| Confirmada por evidencia estática | 20 | La ruta/configuración vulnerable está presente; las condiciones de explotación se indican en cada hallazgo. |
| Probable; requiere concurrencia/reproducción | 1 | Riesgo de carrera respaldado por el patrón código/BD, no reproducido. |
| Riesgo de configuración o despliegue | 4 | La configuración insegura está en el repo; impacto externo depende del entorno real o del contenido almacenado. |
| Hardening | 2 | Brecha defensiva demostrada, sin explotación directa demostrada. |

Los hallazgos “confirmados” son confirmados por inspección estática; no significa que se haya explotado un sistema desplegado. No se encontró evidencia suficiente para afirmar SQL injection, SSRF, open redirect, bypass general de CSRF o XSS DOM en React. La ruta de XSS descrita sí tiene evidencia estática, pero no se ejecutó en navegador.

## 2. Arquitectura, datos y límites de confianza

### Mapa de arquitectura

```text
Navegador (React/Vite)
  ├─ JWT access/refresh en localStorage ── Authorization: Bearer ──┐
  ├─ WebSocket con access JWT en query string ─────────────────────┤
  └─ UI, formularios y uploads ────────────────────────────────────┤
                                                                    ▼
                      Nginx (HTTP, puerto 80 en config actual)
                       ├─ /api y /ws ──► Django/DRF + Daphne (ASGI)
                       ├─ /static ─────► volumen de archivos estáticos
                       ├─ /media ──────► volumen público de uploads
                       └─ SPA ─────────► build frontend
                                             │
                    Django views/serializers/services/models
                       ├─► MySQL 8: usuarios, hallazgos, acciones,
                       │   solicitudes, archivos, mensajes, auditoría
                       ├─► Redis 7: Channels / grupos WebSocket
                       ├─► filesystem/volúmenes: media y reportes
                       └─► scripts/CI: backups, registry y SSH de deploy
```

Las rutas HTTP se montan en [backend/config/urls.py](backend/config/urls.py#L10-L27); el montaje WebSocket y el middleware de token están en [backend/config/asgi.py](backend/config/asgi.py#L15-L40). Las conexiones de base de datos y Redis se configuran en [backend/config/settings/base.py](backend/config/settings/base.py#L95-L127). Nginx y Compose están descritos en [nginx/nginx.conf](nginx/nginx.conf#L20-L90) y [docker-compose.yml](docker-compose.yml#L1-L74).

### Trust boundaries

1. **Internet/navegador ↔ Nginx:** transporte HTTP en la configuración inspeccionada; WebSocket tokens en URL. No se evidenció TLS en el Nginx del repo.
2. **Navegador ↔ API:** todo dato enviado por React es no confiable. Las guardas de React son presentación; los permisos efectivos deben estar en Django.
3. **Usuario autenticado ↔ recursos de otros usuarios:** ownership de hallazgo, chat, solicitud y archivo debe aplicarse por objeto y acción.
4. **Django ↔ MySQL/Redis/almacenamiento:** servicios internos alcanzables por la red Compose; el backend corre como root y tiene un volumen de backups escribible.
5. **Uploads ↔ usuarios del sitio:** `/media/` se publica directamente en el mismo origen, sin autorización de Django.
6. **CI/CD ↔ producción/registry:** el workflow confía en claves SSH y host remoto; la validación de host está deshabilitada.

### Identidades y componentes

- Autenticación: DNI + contraseña, JWT SimpleJWT HS256; access configurado en 15 min y refresh en 7 días por defecto. Login, refresh y logout están en [backend/apps/users/views.py](backend/apps/users/views.py#L200-L327).
- Roles de aplicación: `ADMIN`, `EMPLEADO`, `CLIENTE`; definidos en [backend/apps/users/models.py](backend/apps/users/models.py#L18-L24). Perfiles de empleado/cliente separados.
- Persistencia: MySQL 8, Redis/Channels; archivos persistidos en media local/volúmenes y reportes Excel.
- Integraciones observadas: GitHub Actions, GitHub Container Registry, SSH de despliegue y una imagen/logo remoto solicitado por el navegador. No se identificó una función backend de descarga de URL controlada por usuarios.

## 3. Superficie de ataque e inventario de endpoints

La API DRF usa JWT y permiso predeterminado `IsAuthenticated` en [backend/config/settings/base.py](backend/config/settings/base.py#L173-L185); algunas vistas usan `AllowAny` explícitamente. Los routers generan operaciones CRUD según los mixins/ViewSets: se indica abajo el conjunto expuesto y las excepciones revisadas. “Autenticado” no implica permiso sobre el objeto.

| Familia / rutas principales | Métodos/acciones | Autenticación y autorización observada | Datos/recursos |
|---|---|---|---|
| `/api/v1/auth/login/`, `/refresh/` | POST | Públicas (`AllowAny`); no se halló throttling. | DNI, password, refresh JWT; devuelve tokens. |
| `/api/v1/auth/logout/` | POST | JWT requerido; blacklisting del refresh si lo recibe. | Refresh token. |
| `/api/v1/usuarios/` | GET list, POST create, GET/PATCH/PUT/DELETE detalle; `/me/`, `/me/avatar/`, `/activar/`, `/desactivar/` | Login requerido; create/acciones administrativas restringidas. Lista es global para cualquier autenticado; detalle/edición ajena se bloquea salvo admin. | DNI, email, tipo, estado, perfiles, avatar, password (write-only). |
| `/api/v1/hallazgos/` | GET list/detail, POST, PATCH/PUT, DELETE; `aprobar`, `rechazar`, `reclasificar`, `add/remove_responsable`, uploads, historial, estadísticas | JWT; queryset por rol para list/detail; create usa permiso de tipo; servicios aplican checks para varias transiciones. Estadísticas agrega globalmente sin permiso admin. | Hallazgos, responsables, acciones, adjuntos, contacto externo y métricas. |
| `/api/v1/hallazgos/{id}/solicitudes-cambio-responsable/` | CRUD de router anidado y `approve`/`reject` | JWT; crear valida responsable; approve/reject admin. List/retrieve/update/delete genéricos quedan en queryset solo filtrado por hallazgo ID, sin scope del actor. | Solicitud, solicitante, tipo, usuario propuesto y estado. |
| `/api/v1/hallazgos/{id}/acciones/{pk}/` | GET, PATCH; upload, solicitar cierre, porqués GET/POST, aprobar/rechazar/desaprobar | JWT; checks de responsable/admin en servicios revisados; aprobación admin. | Acciones, estados, adjuntos y análisis de causa. |
| `/api/v1/solicitudes-cierre/` | GET, aprobar/rechazar POST | JWT; autorización y scope administrados en ViewSet/servicios; requiere pruebas de rol/ownership adicionales. | Solicitudes de cierre y estados. |
| `/api/v1/sectores/`, `/subsecciones/`, `/tipos/` | CRUD generado por routers | JWT; escrituras restringidas a admin en ViewSets inspeccionados. | Catálogos. |
| `/api/v1/chats/` | GET list/detail | JWT; detalle comprueba participante/admin; listado hereda queryset global. | Participantes, recuentos y datos de chats. |
| `/api/v1/notificaciones/` | CRUD y acciones de lectura | JWT; queryset de notificaciones limitado al destinatario en código revisado. | Mensajes/avisos del usuario. |
| `/api/v1/archivos/` | CRUD generado; `upload`, `preview`, `download`, `owner_delete`, `admin_delete`, `admin_bulk_delete`, `admin_files` | JWT; el ViewSet activo usa queryset global. Algunas acciones custom añaden chequeo, pero el CRUD heredado y lectura de archivo carecen de scope. | Metadatos y contenido binario. |
| `/api/v1/reportes/` | GET list, POST create, DELETE y `download` | JWT + admin en vistas revisadas. | Reportes Excel/XLSM. |
| `/ws/chat/{hallazgo_id}/` | WebSocket, `chat.send`, `chat.delete_message`, pong | JWT access por `?token=`; participante o admin al conectar; admin puede enviar aunque el contrato lo describe read-only; revocación incompleta. | Mensajes, IDs de archivos y eventos. |
| `/ws/notificaciones/` | WebSocket | JWT access por query string; revisar estado activo y ciclo de revocación. | Notificaciones del usuario. |
| `/admin/` | Interfaz Django | Autenticación/sesión Django; dependerá del despliegue HTTPS y hardening. | Administración global. |

El módulo separado `AnalisisCincoPorquesViewSet` no aparece montado en las URLs inspeccionadas; el flujo activo de porqués se encuentra bajo acciones. Si se monta el ViewSet separado, volver a revisar sus permisos y queryset.

## 4. Hallazgos detallados

### SEC-01 — Secretos de entorno rastreados en Git

- **Severidad:** HIGH · **Estado:** Confirmada (exposición en el repositorio; vigencia productiva desconocida) · **Componente:** secretos/auth/DB.
- **Archivo/línea:** [.env](.env#L6-L15), [docker-compose.yml](docker-compose.yml#L7-L10), [backend/config/settings/base.py](backend/config/settings/base.py#L16-L20) y [base.py](backend/config/settings/base.py#L99-L109).
- **Descripción/evidencia:** el archivo de entorno está rastreado y contiene una clave Django/JWT predecible y credenciales DB de apariencia de desarrollo. La clave se usa también para firmar JWT. La auditoría de historial local confirma presencia del archivo en varios commits; no se reproduce ningún valor aquí. No se determinó si esas credenciales estuvieron desplegadas.
- **Impacto/condiciones:** si se reutilizaron en un entorno accesible, permite falsificar tokens con la clave conocida y acceder/modificar la base con las credenciales disponibles. La exposición en un repo compartido ya invalida el secreto como secreto.
- **Verificación segura:** confirmar con el responsable de operaciones, sin imprimir valores, si alguno se reutilizó; invalidar sesiones/tokens firmados antes de rotar. La búsqueda histórica se limitó a metadatos del historial para no volcar credenciales.
- **Mitigación/código sugerido:** rotar `SECRET_KEY`, contraseñas MySQL y cualquier token derivado; invalidar refresh tokens; mover secretos a un gestor de secretos/variables protegidas; purgar historia Git según el proceso del repositorio y notificar a quienes clonaron. Generar clave aleatoria criptográfica, distinta por entorno.
- **CWE/OWASP/CVSS:** CWE-798, CWE-522 · OWASP A02/A05 · CVSS orientativo 8.1 si las credenciales fueron válidas en producción; impacto real por confirmar. **Confianza:** alta en el versionado, media en el impacto externo.

### SEC-02 — Reglas de `.gitignore` no se aplican correctamente

- **Severidad:** HIGH · **Estado:** Confirmada · **Componente:** repositorio/secretos.
- **Archivo/línea:** [.gitignore](.gitignore#L3-L6).
- **Descripción/evidencia:** el archivo está codificado UTF-16LE con NULs; Git no reconoce las reglas de exclusión. La comprobación `git check-ignore` no produjo reglas efectivas para `.env` ni un backup. Aun corregida la codificación, las reglas existentes no cubren todos los nombres de configuración de entornos ni respaldos.
- **Impacto/condiciones:** facilita volver a commitear secretos, dumps, artefactos o caches; el `.env` y dumps ya están rastreados (SEC-01/03).
- **Verificación segura:** después de corregir, validar con `git check-ignore -v` y `git ls-files` en rutas representativas; no agregar ni borrar archivos durante esa prueba.
- **Mitigación/código sugerido:** reescribir en UTF-8, añadir patrones explícitos para `.env`, `.env.*` con excepción de plantilla sanitizada, backups, certificados y artefactos; retirar del índice secretos/dumps usando el proceso aprobado sin destruir copias operativas.
- **CWE/OWASP/CVSS:** CWE-522 · OWASP A05 · CVSS N/A (debilidad habilitadora). **Confianza:** alta.

### SEC-03 — Dumps de base de datos versionados

- **Severidad:** HIGH · **Estado:** Riesgo de configuración (archivos rastreados; contenido no inspeccionado) · **Componente:** privacidad/backups.
- **Evidencia:** existen cuatro dumps bajo [backups/](backups/backup_20260908_151653.sql); el historial local registra más rutas de backup. El script crea dumps sin cifrado en [scripts/backup_db.sh](scripts/backup_db.sh#L44-L57).
- **Impacto/condiciones:** si contienen datos reales de empleados/clientes, hallazgos, documentos o hashes de contraseña, cualquier lector del repositorio o sus clones históricos puede obtenerlos. No se abrió el contenido para evitar divulgar PII/secretos.
- **Verificación segura:** un custodio autorizado clasifica los dumps y revisa acceso al repo remoto/logs de CI. No subirlos a scanners públicos.
- **Mitigación/código sugerido:** remover los dumps del control de versiones e historial siguiendo política de retención; cifrar backups con claves fuera del repositorio, limitar acceso y aplicar expiración. Si eran datos reales, evaluar incidente de privacidad y rotación de credenciales.
- **CWE/OWASP/CVSS:** CWE-552, CWE-200 · OWASP A02/A05 · CVSS depende de datos/alcance. **Confianza:** alta en la presencia; baja en sensibilidad del contenido.

### SEC-04 — Compose selecciona configuración de desarrollo y no hay TLS en Nginx

- **Severidad:** HIGH · **Estado:** Riesgo de configuración/despliegue · **Componente:** Django, Nginx, transporte.
- **Archivo/línea:** [.env](.env#L7-L9), [development.py](backend/config/settings/development.py#L3-L8), [docker-compose.yml](docker-compose.yml#L33-L49), [nginx.conf](nginx/nginx.conf#L20-L43), [production.py](backend/config/settings/production.py#L5-L15).
- **Descripción/evidencia:** el `.env` actual selecciona settings de desarrollo; estos fuerzan `DEBUG=True` y `ALLOWED_HOSTS=["*"]`. El Compose publicado inicia Daphne detrás de Nginx, que escucha solo en 80, aunque Compose mapea también host 443 a contenedor 443. No hay listener/certificados TLS. `SECURE_SSL_REDIRECT` en settings de producción se decide con comparación sensible a mayúsculas y puede quedar desactivado si el valor es `true` minúscula. La guía de despliegue no evidencia un selector de producción coherente con el entorno esperado.
- **Impacto/condiciones:** si esta topología se publica directamente, tráfico y JWT viajan sin cifrar; `DEBUG` filtra diagnóstico; redirect/HSTS pueden fallar o entrar en bucle si existe terminador TLS externo mal configurado. No se observó el despliegue remoto.
- **Verificación segura:** validar el target autorizado mediante handshake TLS, redirect HTTP→HTTPS, cabeceras, WSS, `DEBUG=False`, `ALLOWED_HOSTS` exacto y `X-Forwarded-Proto` sin contactar infraestructura desde esta auditoría.
- **Mitigación/código sugerido:** settings productivos explícitos y fail-closed; normalizar booleanos con parser estricto; terminación TLS probada (proxy externo documentado o Nginx configurado); `SECURE_PROXY_SSL_HEADER` solo si el proxy sobreescribe el header confiablemente; no iniciar producción si `DEBUG` está activo.
- **CWE/OWASP/CVSS:** CWE-489, CWE-16 · OWASP A05 · CVSS aproximado 8.1 si se expone como está. **Confianza:** alta sobre el repo, media sobre producción.

### SEC-05 — Upload con MIME declarado por cliente y publicación same-origin (XSS/lectura pública)

- **Severidad:** HIGH · **Estado:** Confirmada por inspección estática; confirmar comportamiento HTTP/browser en staging · **Componente:** archivos/Nginx.
- **Archivo/línea:** [serializers.py](backend/apps/archivos/serializers.py#L34-L65), [models.py](backend/apps/archivos/models.py#L5-L7), [nginx.conf](nginx/nginx.conf#L8-L9) y [nginx.conf](nginx/nginx.conf#L66-L70), [docker-compose.yml](docker-compose.yml#L34-L38) y [compose](docker-compose.yml#L64-L68).
- **Descripción/evidencia:** la validación confía en `UploadedFile.content_type`, controlable por el cliente, y no valida magic bytes ni extensión. Se conserva el nombre original. Nginx sirve el volumen `/media/` directamente por extensión, en el mismo origen, con cache pública y sin pasar autorización de Django. El allowlist contempla tipos activos como HTML/XML no de imagen, además de `text/plain`.
- **Impacto/condiciones:** un usuario autenticado puede intentar cargar contenido HTML bajo una extensión activa y declarar un MIME permitido; si el navegador lo interpreta como HTML al abrirlo, puede ejecutar script same-origin. Independientemente del XSS, cualquier persona que conozca el URL puede obtener contenido de adjuntos que deberían ser privados. No se verificó cabecera final ni política MIME del navegador.
- **Verificación segura:** en staging aislado, cargar un HTML inocuo tipo marcador con nombre `.html` y MIME permitido; probar sin cookies la ruta media y las URLs de preview/download; inspeccionar `Content-Type`, `Content-Disposition`, `X-Content-Type-Options` y caché. No utilizar scripts de exfiltración.
- **Mitigación/código sugerido:** media privado servido tras autorización de objeto; validar firma real y extensión compatible; renombrar a UUID; limitar allowlist a formatos requeridos; servir contenido no confiable como attachment y/o desde dominio separado sin cookies; `X-Content-Type-Options: nosniff`; antivirus/CDR donde aplique.
- **CWE/OWASP/CVSS:** CWE-434, CWE-79, CWE-552 · OWASP A01/A05/API1 · CVSS orientativo 8.1 (sube si hay PII sensible). **Confianza:** alta en la cadena de código, media en ejecución exacta del payload.

### SEC-06 — BOLA/IDOR en API de archivos; operaciones heredadas sin ownership

- **Severidad:** HIGH · **Estado:** Confirmada · **Componente:** DRF archivos.
- **Archivo/línea:** router activo [archivos/urls.py](backend/apps/archivos/urls.py#L3-L8); ViewSet activo [viewsets.py](backend/apps/archivos/viewsets.py#L18-L24), preview [viewsets.py](backend/apps/archivos/viewsets.py#L45-L79), download [viewsets.py](backend/apps/archivos/viewsets.py#L82-L97). La clase filtrada en [views.py](backend/apps/archivos/views.py#L18-L40) no es la que monta el router.
- **Descripción/evidencia:** `ArchivoViewSet` hereda `ModelViewSet`, limita solo a `IsAuthenticated` y declara `Archivo.objects.all()`. Preview/download llaman `get_object()` sobre ese queryset sin validar uploader, padre ni acceso al hallazgo. DELETE genérico heredado no equivale a las acciones custom `owner_delete`/`admin_delete`.
- **Impacto/condiciones:** cualquier usuario autenticado que conozca o enumere un ID puede listar/recuperar metadatos, previsualizar/descargar archivos ajenos y potencialmente borrar el registro por el DELETE genérico. La exposición de contenido es directa.
- **Verificación segura:** dos usuarios de prueba; cargar archivo privado con A; con B probar list/retrieve/preview/download/DELETE y esperar 404/403 sin revelar existencia, salvo rol autorizado.
- **Mitigación/código sugerido:** `get_queryset()` debe filtrar por relación con recurso legible por el actor; validación de acceso al padre en cada acción; deshabilitar update/destroy genéricos y dejar solo acciones expresamente autorizadas. Reusar policy común de acceso a hallazgo.
- **CWE/OWASP/CVSS:** CWE-639, CWE-862 · OWASP API1/A01 · CVSS aproximado 8.1. **Confianza:** alta.

### SEC-07 — JWT accesibles a JavaScript y access token en URL de WebSocket

- **Severidad:** MEDIUM · **Estado:** Confirmada · **Componente:** frontend/auth.
- **Archivo/línea:** [AuthContext.jsx](frontend/src/context/AuthContext.jsx#L4-L15), [AuthContext.jsx](frontend/src/context/AuthContext.jsx#L88-L110), [AuthContext.jsx](frontend/src/context/AuthContext.jsx#L119-L144), login backend [users/views.py](backend/apps/users/views.py#L241-L253), WebSocket [chat.js](frontend/src/api/chat.js#L49-L54) y [middleware.py](backend/apps/users/middleware.py#L55-L68).
- **Descripción/evidencia:** se guardan ambos bearer tokens accesibles por cualquier JavaScript same-origin. El access JWT además viaja como `?token=` en el URL WebSocket; la config Nginx no evidencia redacción de query strings. Se imprime en consola un prefijo del access token. La documentación/comentarios mencionan cookie HttpOnly, pero la respuesta actual devuelve refresh en JSON.
- **Impacto/condiciones:** ante XSS, dependencia JS comprometida o extensión con acceso al sitio, un atacante puede extraer tokens y actuar como usuario. Proxy/APM con logging estándar puede retener el token de URL; la retención real no se comprobó. El refresh extiende la ventana de compromiso.
- **Verificación segura:** inspeccionar Application Storage tras login y confirmar el contenido sin copiar tokens; probar que logout elimina almacenamiento local.
- **Mitigación/código sugerido:** preferir refresh en cookie `HttpOnly; Secure; SameSite` y rotado; aplicar CSRF adecuado a endpoints que autentican por cookie; access de vida corta en memoria. CSP y eliminación de XSS son controles complementarios, no sustitutos.
- **CWE/OWASP/CVSS:** CWE-522, CWE-922 · OWASP A02/A07/API2 · CVSS aproximado 6.5 condicionado a XSS. **Confianza:** alta.

### SEC-08 — Refresh no rota ni revoca tokens como aparenta la configuración

- **Severidad:** MEDIUM · **Estado:** Confirmada · **Componente:** SimpleJWT.
- **Archivo/línea:** settings [base.py](backend/config/settings/base.py#L189-L204), implementación [users/views.py](backend/apps/users/views.py#L270-L296), logout [users/views.py](backend/apps/users/views.py#L299-L327).
- **Descripción/evidencia:** `ROTATE_REFRESH_TOKENS=True` y `BLACKLIST_AFTER_ROTATION=True`, pero el endpoint construye `RefreshToken` directamente, obtiene un access y devuelve el mismo `str(refresh)`. No usa el serializer estándar que rota y blacklistea. El refresh se acepta desde body; login no setea cookie; logout solo blacklistea si el cliente remite refresh.
- **Impacto/condiciones:** un refresh robado puede reutilizarse hasta expirar (7 días por defecto), aunque el cliente crea que hubo rotación. Además, refresh no consulta estado actual del usuario, por lo que una cuenta desactivada puede seguir obteniendo tokens.
- **Verificación segura:** emitir refresh en entorno de prueba, refrescar una vez y verificar que el token anterior sea rechazado; desactivar usuario y probar refresh con token de prueba.
- **Mitigación/código sugerido:** emplear `TokenRefreshSerializer`/`TokenRefreshView` de SimpleJWT con rotación/blacklist y comprobar usuario activo; prueba de regresión para replay, logout y desactivación. No devolver refresh en JSON si se adopta cookie.
- **CWE/OWASP/CVSS:** CWE-613 · OWASP A07/API2 · CVSS aproximado 6.5. **Confianza:** alta.

### SEC-09 — Revocación incompleta de sockets y cuentas desactivadas

- **Severidad:** MEDIUM · **Estado:** Confirmada · **Componente:** autenticación WebSocket/chat.
- **Archivo/línea:** [middleware.py](backend/apps/users/middleware.py#L24-L35) y [middleware.py](backend/apps/users/middleware.py#L55-L68); conexión y broadcast [consumers.py](backend/apps/chat/consumers.py#L38-L66) y [consumers.py](backend/apps/chat/consumers.py#L201-L206); actualización de participantes [services.py](backend/apps/solicitud_cambio_responsable/services.py#L127-L145).
- **Descripción/evidencia:** middleware obtiene el usuario de un access JWT sin comprobar `is_active`. La pertenencia se valida al conectar y al enviar, pero no antes de entregar broadcasts. Cambio de responsable actualiza participantes sin evento dirigido de revocación. Otro flujo manda un evento de expulsión a todo el grupo y el consumidor cierra todas las conexiones sin filtrar el `user_id`.
- **Impacto/condiciones:** una cuenta desactivada con JWT válido puede abrir socket; un responsable removido puede continuar recibiendo mensajes en un socket ya abierto. En el flujo alternativo, se pueden desconectar usuarios no afectados (disponibilidad).
- **Verificación segura:** con usuarios de test, abrir socket, desactivar/remover participante y comprobar inmediatamente envío y recepción; verificar que la expulsión no cierre sockets ajenos.
- **Mitigación/código sugerido:** comprobar `is_active` en handshake; revocar/cerrar sockets específicos al logout/desactivación/remoción; comprobar membership antes de cada entrega o versionar permisos/sesión; payload de revocación validado por `user_id` y dirigido a grupo personal.
- **CWE/OWASP/CVSS:** CWE-613, CWE-863 · OWASP A01/A07/API1 · CVSS 6.5 aprox. **Confianza:** alta.

### SEC-10 — Admin no responsable puede escribir en chat por WebSocket

- **Severidad:** MEDIUM · **Estado:** Confirmada; divergencia con la política declarada · **Componente:** autorización de negocio.
- **Archivo/línea:** permiso de envío [consumers.py](backend/apps/chat/consumers.py#L114-L141); `_check_participant_access` [consumers.py](backend/apps/chat/consumers.py#L230-L247); regla de UI [ChatPage.jsx](frontend/src/pages/chat/ChatPage.jsx#L39-L49) y [ChatPage.jsx](frontend/src/pages/chat/ChatPage.jsx#L295-L295).
- **Descripción/evidencia:** backend concede acceso a todo admin y el handler de `chat.send` acepta el resultado del mismo chequeo. El comentario del consumer dice que admin es read-only y UI solo permite enviar si es responsable asignado, pero esa condición no se aplica en servidor.
- **Impacto/condiciones:** admin autenticado no responsable puede escribir mensajes en cualquier chat al que conecte, alterando el historial/notificando participantes.
- **Verificación segura:** enviar un mensaje inocuo por WebSocket con admin no participante/responsable; el backend debería rechazarlo si se confirma como política.
- **Mitigación/código sugerido:** separar autorización de lectura de escritura; exigir responsabilidad/permiso explícito dentro de `_handle_chat_send`; cubrir con test de rol y relación.
- **CWE/OWASP/CVSS:** CWE-862 · OWASP A01/API5 · CVSS aproximado 4.3. **Confianza:** alta.

### SEC-11 — IDOR y CRUD heredado en solicitudes de cambio de responsable

- **Severidad:** MEDIUM · **Estado:** Confirmada · **Componente:** autorización/serialización.
- **Archivo/línea:** [viewsets.py](backend/apps/solicitud_cambio_responsable/viewsets.py#L24-L49), [viewsets.py](backend/apps/solicitud_cambio_responsable/viewsets.py#L51-L89), serializer [serializers.py](backend/apps/solicitud_cambio_responsable/serializers.py#L36-L60).
- **Descripción/evidencia:** ViewSet `ModelViewSet` requiere solo login y filtra por `hallazgo_id` de URL, no por solicitante, responsable o admin. Crear valida responsabilidad y aprobar/rechazar validan admin, pero acciones heredadas de list/retrieve/update/delete continúan expuestas. `solicitante`, `tipo` y `usuario_propuesto` son escribibles; el serializer solo marca estado y campos de resolución como read-only.
- **Impacto/condiciones:** cualquier usuario autenticado que conozca un ID de hallazgo puede consultar/borrar solicitudes de otros y cambiar solicitante/tipo/usuario propuesto de objetos en ese hallazgo. No equivale por sí sola a aprobación, pero permite manipular decisiones pendientes.
- **Verificación segura:** A crea solicitud; B no relacionado prueba list/retrieve/PATCH/DELETE; esperar denegación. Probar overposting de solicitante y usuario propuesto en datos de test.
- **Mitigación/código sugerido:** reemplazar `ModelViewSet` por acciones explícitas; queryset limitado a admin y partes autorizadas; solo solicitante puede crear, no actualizar estado/campos internos; desactivar destroy genérico y validar propuesto como empleado activo.
- **CWE/OWASP/CVSS:** CWE-639, CWE-862, CWE-915 · OWASP API1/API3/API5 · CVSS aprox. 6.5. **Confianza:** alta.

### SEC-12 — Directorio global de usuarios expone DNI/email a todo autenticado

- **Severidad:** MEDIUM · **Estado:** Confirmada · **Componente:** API/privacidad.
- **Archivo/línea:** permisos y queryset [users/views.py](backend/apps/users/views.py#L44-L85), campos devueltos [users/serializers.py](backend/apps/users/serializers.py#L68-L86). El frontend pide una lista amplia en [HallazgoDetailPage.jsx](frontend/src/pages/hallazgos/HallazgoDetailPage.jsx#L147-L153).
- **Descripción/evidencia:** `list` permite cualquier autenticado y retorna todos los usuarios salvo filtro opcional `tipo`; el serializer incluye DNI, email, rol, estado activo, sector/empresa y avatar.
- **Impacto/condiciones:** empleado o cliente puede enumerar identificadores de login, contacto y estructura interna, incluyendo usuarios desactivados. La UI no es barrera efectiva.
- **Verificación segura:** solicitar list como usuario de cada rol y comparar campos/filas con la política de necesidad mínima.
- **Mitigación/código sugerido:** directorio completo admin-only; endpoint específico para selección de responsables con queryset de empleados activos y DTO mínimo (id/nombre/apellido); paginar/filtrar por hallazgo sin exponer DNI/email.
- **CWE/OWASP/CVSS:** CWE-200 · OWASP A01/API3 · CVSS aproximado 5.3. **Confianza:** alta.

### SEC-13 — Listado de chats revela metadatos de otros chats

- **Severidad:** LOW · **Estado:** Confirmada · **Componente:** API/chat.
- **Archivo/línea:** [views.py](backend/apps/chat/views.py#L15-L64), serializer [serializers.py](backend/apps/chat/serializers.py#L75-L90).
- **Descripción/evidencia:** la comprobación de participante/admin se implementa en `get_object`/`check_object_permissions`, pero el `list` heredado itera el queryset global y no realiza esos checks por objeto. El listado serializer expone metadatos de participantes/recuentos. El detalle sí comprueba acceso.
- **Impacto/condiciones:** autenticado puede enumerar chats ajenos y metadatos organizacionales; el código revisado no demuestra exposición del historial completo por el list serializer.
- **Verificación segura:** usuario no participante consulta `/chats/` y comprueba IDs, participantes y recuentos.
- **Mitigación/código sugerido:** scope del queryset a chats del participante o admin; si el endpoint no se necesita, desactivar `list`.
- **CWE/OWASP/CVSS:** CWE-862, CWE-200 · OWASP API1/A01 · CVSS 3.1 aprox. **Confianza:** alta.

### SEC-14 — Estadísticas globales accesibles a cualquier autenticado

- **Severidad:** LOW · **Estado:** Confirmada · **Componente:** autorización/exposición de datos.
- **Archivo/línea:** [hallazgos/views.py](backend/apps/hallazgos/views.py#L63-L66), agregaciones [hallazgos/views.py](backend/apps/hallazgos/views.py#L268-L343).
- **Descripción/evidencia:** permiso predeterminado de la acción es `IsAuthenticated`; la acción consulta `Hallazgo.objects` y `Accion.objects` globalmente, no el queryset acotado por usuario ni una comprobación admin.
- **Impacto/condiciones:** clientes/empleados pueden conocer volumen, tendencia, categorías y cantidad de acciones de toda la organización; posible inferencia de actividad interna.
- **Verificación segura:** ejecutar GET de estadísticas con cliente y empleado de pruebas y verificar alcance autorizado.
- **Mitigación/código sugerido:** admin-only o agregados construidos sobre queryset filtrado por rol; limitar métricas y granularidad.
- **CWE/OWASP/CVSS:** CWE-862/CWE-200 · OWASP API1/API5 · CVSS 3.1. **Confianza:** alta.

### SEC-15 — Análisis de causa de empleado nace autoaprobado

- **Severidad:** MEDIUM · **Estado:** Confirmada; incumple la especificación/contrato · **Componente:** lógica de negocio.
- **Archivo/línea:** [porque_service.py](backend/apps/analisis_cinco_porques/services/porque_service.py#L55-L84), requisitos [spec.md](specs/003-mejoras-hallazgos/spec.md#L17) y [spec.md](specs/003-mejoras-hallazgos/spec.md#L203-L205), test esperado [test_porques.py](backend/tests/contract/test_porques.py#L61-L75).
- **Descripción/evidencia:** el flujo de empleado responsable asigna estado `aprobado` y se atribuye `aprobado_por` al propio autor; admin también autoaprueba, lo cual puede ser política válida. Es inconsistente para empleados responsables, cuyo análisis debía quedar pendiente.
- **Impacto/condiciones:** responsable publica una causa raíz aprobada sin revisión administrativa y puede omitir notificación/flujo pendiente previsto.
- **Verificación segura:** crear porqué con responsable no-admin y comprobar estado, autor y aprobador.
- **Mitigación/código sugerido:** crear registros de responsable como `pendiente`, `aprobado_por=None`; solo transición admin cambia estado; alinear test y notificaciones.
- **CWE/OWASP/CVSS:** CWE-841 · OWASP A04/API5 · CVSS aprox. 4.3. **Confianza:** alta.

### SEC-16 — Carreras en invariantes y transiciones de workflows

- **Severidad:** MEDIUM · **Estado:** Probable; requiere prueba concurrente · **Componente:** MySQL/lógica de negocio.
- **Archivo/línea:** creación solicitud [services.py](backend/apps/solicitud_cambio_responsable/services.py#L60-L86), constraints [models.py](backend/apps/solicitud_cambio_responsable/models.py#L88-L95); solicitudes cierre [acciones/services.py](backend/apps/acciones/services.py#L60-L88), constraint condicional [acciones/models.py](backend/apps/acciones/models.py#L95-L105), backend MySQL [base.py](backend/config/settings/base.py#L99-L103); resolución [hallazgos/services.py](backend/apps/hallazgos/services.py#L68-L85) y [acciones/services.py](backend/apps/acciones/services.py#L102-L135).
- **Descripción/evidencia:** varios flujos hacen `exists()`/comprobación de estado y luego `create` o `save` en transacción sin bloqueo de fila. Se usa unicidad condicional que MySQL no garantiza de la misma forma que PostgreSQL.
- **Impacto/condiciones:** solicitudes duplicadas o aprobaciones/rechazos competidores con side effects repetidos bajo solicitudes simultáneas.
- **Verificación segura:** test concurrente local con dos transacciones sincronizadas para el mismo recurso; no ejecutado en esta revisión.
- **Mitigación/código sugerido:** constraints compatibles con MySQL (por ejemplo, claves únicas generadas o tabla de estado); `select_for_update()` sobre fila de acción/solicitud y transición condicional; idempotencia y test concurrente.
- **CWE/OWASP/CVSS:** CWE-362, CWE-367 · OWASP A04 · CVSS aprox. 5.3. **Confianza:** media.

### SEC-17 — Sin throttling de login y validación de password inconsistente

- **Severidad:** MEDIUM · **Estado:** Confirmada · **Componente:** autenticación/abuso.
- **Archivo/línea:** Login público [users/views.py](backend/apps/users/views.py#L200-L211), settings DRF [base.py](backend/config/settings/base.py#L173-L185), validadores configurados [base.py](backend/config/settings/base.py#L133-L139), creación [serializers.py](backend/apps/users/serializers.py#L153-L153) y [serializers.py](backend/apps/users/serializers.py#L217-L223), cambio [serializers.py](backend/apps/users/serializers.py#L230-L240).
- **Descripción/evidencia:** no hay throttle DRF global ni específico para login. `UserCreateSerializer` llama `set_password()` sin `validate_password()`; cambio de contraseña define mínimo de seis caracteres y tampoco aplica el conjunto de validadores Django.
- **Impacto/condiciones:** guessing online sin límite visible; creación/actualización por admin puede introducir claves más débiles que la política declarada. No se encontró flujo de reset de contraseña ni MFA en rutas activas.
- **Verificación segura:** pruebas de policy sobre varias contraseñas en entorno local; confirmar rate limit por cuenta/IP y respuesta uniforme sin enumerar DNI.
- **Mitigación/código sugerido:** `validate_password(password, user)` en creación/cambio; longitud objetivo de política moderna; throttling distribuido (no solo memoria de proceso), detección/alerta de intentos y MFA para admins. Implementar reset con token de un uso y expiración si el negocio lo necesita.
- **CWE/OWASP/CVSS:** CWE-307, CWE-521 · OWASP A07/API2 · CVSS aprox. 6.5. **Confianza:** alta.

### SEC-18 — Preview de archivos carga el archivo entero en memoria

- **Severidad:** MEDIUM · **Estado:** Confirmada por configuración/código · **Componente:** disponibilidad.
- **Archivo/línea:** límites MIME [base.py](backend/config/settings/base.py#L211-L247), Nginx [nginx.conf](nginx/nginx.conf#L35-L35), lectura completa [viewsets.py](backend/apps/archivos/viewsets.py#L46-L79).
- **Descripción/evidencia:** límite default de upload es 1 GiB y Nginx permite request body de 1G; preview de imágenes/PDF usa `file_obj.read()` y crea `HttpResponse` en memoria.
- **Impacto/condiciones:** usuario autenticado puede subir archivos grandes y provocar alto consumo de RAM al previsualizar; peticiones concurrentes pueden agotar workers.
- **Verificación segura:** medir consumo en staging con archivos de tamaños controlados y límite inferior; no realizar DoS ni enviar cargas grandes a producción.
- **Mitigación/código sugerido:** streaming `FileResponse`, límites por tipo mucho menores para preview, cuota por usuario, rate limit, timeout y storage fuera de memoria.
- **CWE/OWASP/CVSS:** CWE-400 · OWASP API4 · CVSS aprox. 5.3. **Confianza:** alta.

### SEC-19 — Formula injection en reportes de hoja de cálculo

- **Severidad:** LOW · **Estado:** Confirmada por flujo estático · **Componente:** exportación.
- **Archivo/línea:** entradas a filas [reportes/services.py](backend/apps/reportes/services.py#L108-L112) y [reportes/services.py](backend/apps/reportes/services.py#L187-L188); escritura directa de celdas [reportes/services.py](backend/apps/reportes/services.py#L241-L255).
- **Descripción/evidencia:** texto controlado por usuarios se pasa a celdas Excel sin neutralizar prefijos interpretables como fórmula.
- **Impacto/condiciones:** un admin/usuario que abra un reporte manipulado en spreadsheet puede activar fórmula/links o ejecutar acciones según cliente/configuración. No se evaluó el archivo en Excel.
- **Verificación segura:** generar reporte local con valores inocuos que empiecen por `=`, `+`, `-`, `@`; confirmar que se serializan como texto literal.
- **Mitigación/código sugerido:** forzar tipo string y escapar prefijos peligrosos según formato/exportador; añadir prueba para cada columna controlada.
- **CWE/OWASP/CVSS:** CWE-1236 · OWASP A03 · CVSS 4.3 aprox. **Confianza:** alta en el flujo.

### SEC-20 — Mensajes de chat y fragmento de access token en consola del navegador

- **Severidad:** LOW · **Estado:** Confirmada · **Componente:** privacidad/logging frontend.
- **Archivo/línea:** token parcial [AuthContext.jsx](frontend/src/context/AuthContext.jsx#L103-L112); mensajes recibidos/enviados [chat.js](frontend/src/api/chat.js#L64-L68) y [chat.js](frontend/src/api/chat.js#L139-L145); logs adicionales [ChatPage.jsx](frontend/src/pages/chat/ChatPage.jsx#L95-L145).
- **Descripción/evidencia:** consola expone contenido de mensajes, eventos completos y primeros caracteres del access token. No se observó si una herramienta de monitoreo captura consola.
- **Impacto/condiciones:** PII/contenido laboral queda accesible en herramientas de soporte, capturas o telemetría del navegador; fragmento de token no basta normalmente para autenticar, pero es innecesario.
- **Verificación segura:** inspeccionar DevTools en build de producción y confirmar ausencia de datos sensibles; revisar política de captura de consola del navegador.
- **Mitigación/código sugerido:** eliminar logs de payload y tokens; si se necesitan diagnósticos, usar códigos de correlación y redacción explícita en builds no productivos.
- **CWE/OWASP/CVSS:** CWE-532, CWE-359 · OWASP A09 · CVSS 2.4. **Confianza:** alta.

### SEC-21 — Notificaciones anteriores pueden permanecer tras logout/cambio de cuenta

- **Severidad:** LOW · **Estado:** Confirmada por flujo frontend · **Componente:** privacidad/sesión compartida.
- **Archivo/línea:** contexto y fetch [NotificacionContext.jsx](frontend/src/context/NotificacionContext.jsx#L23-L57), estado/global provider [main.jsx](frontend/src/main.jsx#L11-L17), función de limpieza definida pero no usada [NotificacionContext.jsx](frontend/src/context/NotificacionContext.jsx#L154-L156).
- **Descripción/evidencia:** al perder autenticación se cierra socket pero no se vacía `notificaciones`; una petición asíncrona antigua puede actualizar estado tras cambio de usuario. La función `clearNotificaciones()` existe pero no tiene caller observado.
- **Impacto/condiciones:** en navegador compartido, el usuario siguiente puede ver temporalmente o hasta recarga avisos del anterior, si el fetch nuevo falla o llega fuera de orden.
- **Verificación segura:** usuario A carga avisos; logout/login B con fetch B retrasado o fallido; confirmar que nunca se muestra estado A.
- **Mitigación/código sugerido:** limpiar en transición de identidad/logout; abortar `fetch` anterior con `AbortController`; asociar resultados a user ID/version de sesión.
- **CWE/OWASP/CVSS:** CWE-922/CWE-200 · OWASP A07 · CVSS 2.4. **Confianza:** alta.

### SEC-22 — Cabeceras defensivas incompletas/inconsistentes por ubicación Nginx

- **Severidad:** LOW · **Estado:** Hardening · **Componente:** reverse proxy/frontend.
- **Archivo/línea:** cabeceras servidor [nginx.conf](nginx/nginx.conf#L27-L32); locations con `add_header` [nginx.conf](nginx/nginx.conf#L59-L90).
- **Descripción/evidencia:** no hay Content-Security-Policy, Permissions-Policy, COOP/CORP. Las locations para `/static/`, `/media/`, `/index.html`, `/assets/` y `/` definen su propio `add_header`, que en Nginx 1.25 sustituye herencia de `add_header` del nivel server; por ello algunas respuestas no reciben X-Frame-Options/nosniff/referrer policy configurados arriba. HSTS está definido en servidor HTTP, donde clientes no deben confiarlo.
- **Impacto/condiciones:** reduce defensa en profundidad frente a clickjacking, MIME sniffing y XSS; la falta de CSP agrava una eventual inyección. Clickjacking depende de response final y del contenido.
- **Verificación segura:** `curl -I` contra cada location en entorno local/staging; revisar política efectiva de CSP en report-only antes de aplicar.
- **Mitigación/código sugerido:** centralizar cabeceras heredables o repetirlas con `always` en cada location; definir CSP compatible con aplicación; habilitar HSTS solo en HTTPS probado; mantener `frame-ancestors 'none'`/XFO y `nosniff`.
- **CWE/OWASP/CVSS:** CWE-693 · OWASP A05 · CVSS N/A (hardening). **Confianza:** alta.

### SEC-23 — Backend corre como root y recibe backups en volumen escribible

- **Severidad:** MEDIUM · **Estado:** Riesgo de configuración · **Componente:** Docker/segmentación.
- **Archivo/línea:** [backend/Dockerfile](backend/Dockerfile#L1-L20), [docker-compose.yml](docker-compose.yml#L27-L39).
- **Descripción/evidencia:** imagen no declara `USER`, por lo que el proceso suele correr como root. Monta `./backups:/backups` con escritura; el mismo directorio contiene dumps rastreados. MySQL/Redis no publican puertos al host en Compose (control positivo), pero los servicios comparten red y Redis por defecto no configura autenticación ni TLS.
- **Impacto/condiciones:** compromiso de una dependencia o endpoint puede permitir alterar backups y acceder a otros servicios internos; usuario root aumenta impacto dentro del contenedor.
- **Verificación segura:** `docker compose config` (validación local reportada exitosa) y revisión de usuario efectivo/ACLs en imagen antes de deploy; no iniciar servicios durante esta auditoría.
- **Mitigación/código sugerido:** usuario no root con permisos mínimos, filesystem read-only donde posible, backup fuera del contenedor y volumen de solo lectura si backend solo necesita leer; separar redes backend/db/cache y limitar capabilities.
- **CWE/OWASP/CVSS:** CWE-250, CWE-732 · OWASP A05 · CVSS 5.3 aprox. **Confianza:** alta en configuración, media en runtime.

### SEC-24 — Django 4.2.13 fuera de ventana de soporte y dependencias no reproducibles

- **Severidad:** MEDIUM · **Estado:** Hardening/riesgo de dependencia; CVE aplicable no confirmado · **Componente:** supply chain.
- **Archivo/línea:** [backend/requirements/base.txt](backend/requirements/base.txt#L1-L12), [frontend/package.json](frontend/package.json#L1-L24), [frontend/package-lock.json](frontend/package-lock.json#L1-L25), [frontend/Dockerfile](frontend/Dockerfile#L1-L12), [backend/Dockerfile](backend/Dockerfile#L1-L20).
- **Descripción/evidencia:** Django está fijado en 4.2.13; la rama 4.2 terminó soporte de seguridad en abril de 2026. No hay lock completo/hashes para dependencias Python. El `package.json` actual declara `ag-charts-*` que no están en las dependencias raíz del lock revisado, mientras CI usa `npm ci`; Docker frontend usa `npm install`. Imágenes base usan tags mutables.
- **Impacto/condiciones:** falta de parches futuros y builds no reproducibles; discrepancia manifest/lock puede hacer fallar `npm ci` o resolver diferente. No se afirmó CVE concreta ni se ejecutó npm.
- **Verificación segura:** ejecutar `npm ci`, tests SCA y `pip-audit` en un agente CI aislado; comparar lock tras resolver y evaluar avisos por uso real.
- **Mitigación/código sugerido:** actualizar a rama Django soportada tras tests/migración; generar locks completos y consistentes; `pip-audit`/OSV/npm audit con revisión de explotabilidad; fijar imágenes por digest y automatizar Dependabot/SBOM.
- **CWE/OWASP/CVSS:** CWE-1104 · OWASP A06/API8 · CVSS N/A sin advisory aplicable. **Confianza:** alta en versiones/config; media en impacto.

### SEC-25 — Deploy SSH desactiva validación de host y Actions no fijadas por SHA

- **Severidad:** MEDIUM · **Estado:** Riesgo de configuración CI/CD · **Componente:** cadena de despliegue.
- **Archivo/línea:** [deploy.yml](.github/workflows/deploy.yml#L36-L77), [deploy.yml](.github/workflows/deploy.yml#L95-L146); CI [ci.yml](.github/workflows/ci.yml#L69-L72).
- **Descripción/evidencia:** SSH usa `StrictHostKeyChecking=no`; steps de Actions referencian tags versionados (`@vN`) en vez de commit SHA inmutable. Deploy depende de build propio; no se verificó protección de ramas/environment o si CI separado bloquea deploy.
- **Impacto/condiciones:** MITM del host o cambio comprometido de una Action/tag puede ejecutar código en entorno con credenciales de despliegue.
- **Verificación segura:** comprobar branch protection, aprobaciones de environment, permisos mínimos de `GITHUB_TOKEN` y host key almacenado como secreto/known_hosts.
- **Mitigación/código sugerido:** fijar Actions a SHA revisado con comentario de versión; verificar fingerprint SSH; permisos workflow mínimos; exigir CI/tests y aprobación protegida antes de deploy.
- **CWE/OWASP/CVSS:** CWE-295, CWE-829 · OWASP A08 · CVSS 6.5 aprox. **Confianza:** alta en workflow, media en controles externos.

### SEC-26 — Scripts de restauración exponen password MySQL en argumentos de proceso

- **Severidad:** LOW · **Estado:** Confirmada · **Componente:** operaciones/admin.
- **Archivo/línea:** [restore_latest_backup.ps1](scripts/restore_latest_backup.ps1#L117-L130), [RestaurarBackup.cs](scripts/RestaurarBackup.cs#L271-L279).
- **Descripción/evidencia:** el password se interpola en argumentos `mysql -p...` y en comandos PowerShell. En el host puede quedar visible en lista de procesos, trazas o errores.
- **Impacto/condiciones:** requiere acceso local/proceso concurrente o exposición de logs; podría permitir acceso DB con privilegios root.
- **Verificación segura:** revisar historial de shell y visibilidad de procesos en una VM de prueba, sin imprimir el secreto.
- **Mitigación/código sugerido:** usar archivo de opciones MySQL con permisos 0600/ACL equivalente montado temporalmente, secret store o stdin seguro; evitar argumentos, logs y command strings con credenciales.
- **CWE/OWASP/CVSS:** CWE-214, CWE-522 · OWASP A02/A05 · CVSS 3.3. **Confianza:** alta.

### SEC-27 — Errores de almacenamiento devuelven excepción interna al cliente

- **Severidad:** LOW · **Estado:** Confirmada · **Componente:** manejo de errores.
- **Archivo/línea:** [archivos/viewsets.py](backend/apps/archivos/viewsets.py#L50-L79), [archivos/viewsets.py](backend/apps/archivos/viewsets.py#L83-L97).
- **Descripción/evidencia:** handlers devuelven `str(e)` en respuestas preview/download.
- **Impacto/condiciones:** un error de backend de almacenamiento puede revelar ruta, proveedor, nombre interno o detalle de excepción. No se observó un stack trace completo en esta respuesta.
- **Verificación segura:** simular error de storage en test y comprobar que el cliente recibe mensaje genérico, mientras el log interno conserva contexto saneado.
- **Mitigación/código sugerido:** respuesta genérica con ID de correlación; log estructurado server-side sin token/PII; limitar permisos y revisar redacción.
- **CWE/OWASP/CVSS:** CWE-209 · OWASP A05/A09 · CVSS 2.4. **Confianza:** alta.

## 5. Revisión por dominio

### Autenticación, sesión y password

- JWT HS256 usa `SECRET_KEY`; lifetimes cortas/largas están configuradas, pero refresh no rota realmente (SEC-08), se almacena en `localStorage` (SEC-07), no se verifican cuentas activas en middleware WS (SEC-09) y no hay throttling visible (SEC-17).
- Login devuelve mensaje distinto para cuenta desactivada si se conoce la contraseña; no se observó enumeración directa por DNI con password incorrecto porque responde credenciales inválidas. Evitar variaciones innecesarias en mensajes.
- `logout` no invalida access JWT ya emitido; ventana residual limitada por expiración y sin denylist de access. Evaluar denylist/versionado de sesión para incidentes y privilegios altos.
- No se identificó MFA, reset de contraseña ni cambio con invalidación de todos los dispositivos en las rutas activas.
- Hashing se realiza con `set_password()` de Django, control positivo; las rutas de escritura no aplican todos los validadores Django.

### Autorización, serializers y lógica de negocio

- Control positivo: queryset de hallazgos se acota por tipo de usuario en [hallazgos/views.py](backend/apps/hallazgos/views.py#L71-L97); acciones verifican responsable/admin en [acciones/views.py](backend/apps/acciones/views.py#L35-L58) y [acciones/services.py](backend/apps/acciones/services.py#L15-L26); notificaciones por destinatario en [notificaciones/views.py](backend/apps/notificaciones/views.py#L25-L39); reportes requieren admin en [reportes/views.py](backend/apps/reportes/views.py#L21-L45).
- Los serializadores de `HallazgoSerializer` son de solo lectura; `HallazgoCreateSerializer` define campos permitidos explícitos y el serializador de usuarios impide que no-admin cambie `tipo`. No se encontró evidencia de mass assignment directo de `is_staff`, `is_superuser`, password hash o permisos por usuario no-admin.
- Riesgos confirmados: archivos (SEC-06), requests (SEC-11), listado de usuarios/chats (SEC-12/13), métricas (SEC-14), divergencia de policy de chat (SEC-10).
- Lógica de aprobación y solicitudes puede competir concurrentemente (SEC-16); no hay pagos, saldo o stock en el alcance inspeccionado.

### Entradas, inyecciones, XSS, CSRF, CORS y redirecciones

- Frontend: no se encontraron usos de `dangerouslySetInnerHTML`, `innerHTML` o `document.write` en los archivos revisados; React escapa texto ordinario. El riesgo XSS concreto es el contenido de `/media/` (SEC-05), no DOM-XSS probado.
- SQL: el barrido no encontró `raw()`, `RawSQL`, SQL dinámico controlado por request ni concatenación SQL. El comando de inicialización de ID usa validación y SQL acotado; revisar de nuevo si se amplía.
- Shell: no se encontró command injection desde datos HTTP. El uso operacional de comandos tiene riesgo de exponer secretos en argumentos (SEC-26).
- SSRF/open redirect: no se identificó descarga backend de URL controlada ni parámetros `next`/`return_url` con redirect arbitrario. No equivale a prueba exhaustiva dinámica.
- CSRF: `CsrfViewMiddleware` está activo y la API usa JWT en header; no se localizaron `csrf_exempt`. No se identificó combinación wildcard CORS + credenciales. `CORS_ALLOW_CREDENTIALS=True` con lista exacta de orígenes es una configuración innecesaria/confusa mientras no exista cookie de refresh; confirmar que producción nunca define origen wildcard/reflejado.
- Validación de uploads y tamaño se cubre en SEC-05/18. No se encontró WebSocket límite de longitud explícito; `Mensaje.contenido` es `TextField`, por lo que conviene añadir límite por frame/mensaje y rate limit (hardening asociado a SEC-17/18).

### Infraestructura, cabeceras, backups y dependencias

- Compose no publica directamente MySQL/Redis al host (positivo), pero no separa redes; Redis interno no tiene auth/TLS, y el backend es root con backup writable (SEC-23).
- Nginx no define TLS listener en config inspeccionada; `/media/` es público/cacheable (SEC-05), las cabeceras son inconsistentes (SEC-22), y query strings de acceso pueden llegar al log de acceso por configuración estándar.
- Python tiene pins directos, pero no lock transitive con hashes; frontend lock/manifiesto no parecen alineados. No se obtuvo SBOM ni reporte de advisories.
- CI/CD usa secretos GitHub para SSH y `GITHUB_TOKEN`; no se inspeccionaron configuraciones remotas de branch protection, runner, host, firewall, rotación ni registry visibility.

### Privacidad y logging

- PII de DNI/email aparece en el directorio global (SEC-12) y el DNI de creador/responsables se incluye en algunas representaciones de hallazgo. Confirmar necesidad para clientes/otros roles y aplicar mínimo necesario.
- No se inspeccionaron contenidos de backups ni logs almacenados del despliegue. Se encontró logging de mensajes/tokens en navegador (SEC-20), query JWT WebSocket (SEC-07) y excepción de storage a cliente (SEC-27).
- No hay evidencia estática de que Django registre Authorization/password; revisar configuración de proxy, APM y retención de logs en producción antes de declarar que los tokens no quedan registrados.

## 6. Mapeo OWASP / CWE

| Riesgo principal | OWASP Top 10 2021 | OWASP API Top 10 2023 | ASVS orientativo | CWE |
|---|---|---|---|---|
| Archivos y solicitudes con autorización/ownership insuficiente | A01 Broken Access Control | API1 BOLA, API3 BOPLA, API5 BFLA | V4, V13 | CWE-639, 862, 915 |
| Token lifecycle y autenticación débil | A07 Identification and Authentication Failures | API2 Broken Authentication | V2, V3 | CWE-307, 613, 521 |
| Upload público/activo y XSS | A03 Injection, A05 Security Misconfiguration | API8 Security Misconfiguration | V5, V12, V14 | CWE-79, 434, 552 |
| Secretos/backup/deploy | A02 Cryptographic Failures, A05, A08 Software and Data Integrity Failures | API8 | V6, V14, V15 | CWE-798, 522, 295, 829 |
| DoS por preview y ausencia de límites | A04 Insecure Design | API4 Unrestricted Resource Consumption | V11, V13 | CWE-400 |
| Carrera en workflow | A04 Insecure Design | API6 Unrestricted Access to Sensitive Business Flows | V8, V11 | CWE-362, 367, 841 |
| Fórmulas Excel y errores excesivos | A03 Injection, A05 | API8 | V5, V7 | CWE-1236, 209 |
| Logging/UI residual | A09 Security Logging and Monitoring Failures | API8 | V7, V8 | CWE-532, 200 |

No aplica un hallazgo API10 (Unsafe Consumption of APIs) con evidencia disponible; no se identificó consumo backend de APIs externas basado en input de usuario.

## 7. Pruebas de seguridad faltantes

Hay tests de integración/contrato, pero la cobertura revisada deja huecos relevantes:

1. **Archivos:** dos usuarios, list/retrieve/preview/download/delete cruzado; acceso a media sin auth; MIME/extensión falsificados; tamaño y streaming; autorización del padre.
2. **Autenticación:** login throttling, mensajes uniformes, refresh rotation/replay, blacklist, logout, usuario desactivado/eliminado, expiración y cambio de password invalidando sesiones.
3. **WebSockets:** JWT real por middleware (los tests actuales fijan `scope.user` directamente), usuario inactivo, token expirado, revocación tras quitar responsable/logout, permisos admin read-only, límites por mensaje y rate limit. Ejemplos actuales: [test_chat.py](backend/tests/integration/test_chat.py#L89-L95), [test_websocket_urgente.py](backend/tests/integration/test_websocket_urgente.py#L128-L133).
4. **BOLA/BFLA:** pruebas parametrizadas por rol para cada acción de hallazgo, acción, solicitud, chat, reporte, usuario y catálogo; probar ID cambiado en path/body.
5. **Requests/workflows:** probar update/delete de request ajeno, campos overposted; concurrencia para duplicados y transiciones. El test de unicidad actual es secuencial en [test_solicitud_uniqueness.py](backend/tests/unit/test_solicitud_uniqueness.py#L72-L96).
6. **Password:** invocar `validate_password` y comprobar política en creación y cambio; tests de reset si se implementa.
7. **Uploads/reportes:** firma MIME, nombre, extensión doble, fórmula Excel, límites; salida de error genérica; no ejecutar payloads activos en producción.
8. **Frontend/privacidad:** logout/cambio de usuario con fetch pendiente; no tokens/PII en consola; impedir que rutas UI se confundan con controles de backend.
9. **Proxy/deploy:** smoke tests HTTPS/HSTS/headers por location, CSP, WSS, host validation SSH y headers de proxy confiables.

## 8. Priorización

### Prioridad inmediata — bloquear despliegue expuesto

- **SEC-01:** rotar secretos commiteados; invalidar tokens posiblemente firmados con ellos.
- **SEC-02/03:** corregir ignore, evaluar sensibilidad y retirar secretos/backups del repo/historia según política.
- **SEC-04:** no publicar Compose actual como producción; seleccionar settings productivos, `DEBUG=False`, hosts explícitos y HTTPS probado.
- **SEC-05/06:** cerrar media público/same-origin y BOLA de todas las operaciones de archivo.
- **SEC-11:** cerrar lectura/manipulación de solicitudes de cambio ajenas antes de habilitar el módulo a usuarios reales.

### Corto plazo — 7 días

- **SEC-07/08/09:** rediseñar almacenamiento, rotación, revocación y autenticación WS.
- **SEC-10/12/13/14:** aplicar mínimo privilegio a chat, directorio, métricas y todos los listados.
- **SEC-15/16/17:** alinear aprobación de porqués, hacer transiciones atómicas y aplicar throttling/password policy.
- **SEC-18:** streaming, cuota y límites de upload/preview.
- **SEC-23/25:** usuario Docker no-root, aislamiento y SSH host verification/Actions pinning.

### Hardening — 30 días

- **SEC-19/20/21/22/26/27:** neutralización de fórmulas, eliminar logs sensibles, aislamiento de notificaciones, cabeceras CSP, secret handling de restore y errores genéricos.
- **SEC-24:** actualización Django soportada, dependencia reproducible/SCA/SBOM; fijar imágenes por digest.
- Verificar cookies/CORS, límites por WebSocket, auditoría estructurada para transiciones privilegiadas y rotación de sesiones.

### Largo plazo

- Automatizar suite de autorización BOLA por endpoint/método y revisión ASVS por release.
- Secret scanning pre-commit/CI, SCA, análisis estático y container scan en pipeline con excepciones documentadas.
- Threat modeling actualizado cuando se agreguen integraciones, storage S3, pagos o consumo de URLs.
- Programa de gestión de vulnerabilidades, retención/cifrado de backups y pruebas periódicas de restauración.

## 9. Checklist previo a producción

- [ ] Rotar todo secreto presente o históricamente presente en Git; confirmar que no se reutilizó.
- [ ] Purgar/restringir dumps y evaluar sensibilidad, exposición remota y clones existentes.
- [ ] Reparar `.gitignore` UTF-8 y validar reglas; añadir secret scanner en CI.
- [ ] Producción selecciona settings productivos; `DEBUG=False`; hosts y orígenes CORS exactos; booleanos estrictos.
- [ ] TLS real en edge; HTTP redirige correctamente; HSTS solo desde HTTPS; proxy headers confiables; WSS operativo.
- [ ] Archivo privado por defecto: autorización de objeto en todos los métodos; sin acceso a media no autenticado.
- [ ] Upload valida firmas/extensión/tamaño; nombre aleatorio; no HTML/SVG activo same-origin; streaming y cuotas.
- [ ] Tests negativos BOLA/BFLA de dos usuarios y tres roles para cada endpoint sensible.
- [ ] Refresh rota/blacklistea; refresh no accesible a JS; logout/desactivación revocan; WS valida estado y membership.
- [ ] Rate limits para login, refresh, upload, chat y operaciones costosas; límites de payload y paginación efectiva.
- [ ] Lista de usuarios, chat y estadísticas respetan mínimo privilegio; revisar PII de serializers.
- [ ] Flujos de aprobación no permiten autoaprobación indebida; concurrencia y constraints se prueban en MySQL real.
- [ ] Reportes neutralizan fórmulas; errores no devuelven excepciones; logs no incluyen tokens, contraseñas o mensajes.
- [ ] Headers por ruta: CSP, `nosniff`, `frame-ancestors`/XFO, Referrer-Policy; validar response real.
- [ ] Contenedores no-root, permisos mínimos, filesystem/volúmenes restringidos y segmentación de redes.
- [ ] Django en rama soportada; lockfiles reproducibles; SCA, SBOM, imágenes por digest y dependencias CI fijadas por SHA.
- [ ] SSH valida host; permisos GitHub mínimos; aprobaciones/branch protection verificadas.
- [ ] Backups cifrados, segregados, con acceso y retención; restore probado sin secretos en argumentos.
- [ ] Test de seguridad automatizado y evidencia de remediación revisada por una segunda persona.

## 10. Segunda pasada obligatoria — resultado

Se realizó una pasada específica posterior a la consolidación de hallazgos y se contrastaron rutas activas, permisos por rol, serializers, módulos de archivos/chat/auth, settings, infraestructura, configuración de CI y pruebas. Resultado de las preguntas requeridas:

- **¿Acceso a datos de otro usuario?** Sí: archivos (SEC-06), solicitudes de cambio (SEC-11), listado de usuarios/chats y estadísticas (SEC-12/13/14); verificar también la superficie de reportes, cuyas vistas revisadas sí exigen admin.
- **¿Elevación de privilegios?** No se halló escritura directa de `is_staff`/`is_superuser` por serializer no-admin; cambio de tipo está bloqueado para no-admin. Sí hay fallos de autorización funcional en chat y requests (SEC-10/11), pero no evidencia de convertirse en admin.
- **¿Validación solo React?** Sí existe política UI de solo lectura para admin de chat que backend no aplica (SEC-10); además las guardas de rutas nunca se consideran controles de seguridad. Se verificó que varias reglas importantes sí existen en servicios backend.
- **¿Endpoint sin permisos?** No hay endpoint mutativo REST público obvio fuera de login/refresh; se encontraron endpoints autenticados con autorización de objeto/rol incompleta: archivos, stats, listados, requests y WebSocket.
- **¿Secreto expuesto?** Sí, `.env` rastreado en Git y presente en historia local; no se imprimen valores. Dumps rastreados y no inspeccionados.
- **¿Serializer demasiado permisivo?** Sí, serializer de solicitud deja escribibles solicitante/tipo/usuario propuesto y el ViewSet conserva CRUD heredado; no se encontró mass assignment de roles de usuario para no-admin.
- **¿Race condition crítica?** Riesgo probable en solicitudes/transiciones con check-then-write y unicidad condicional no soportada por MySQL; sin reproducir.
- **¿Modificar propiedades internas?** Request fields manipulables en SEC-11; User serializer protege cambio de rol no-admin y campos de privilegios no aparecen escribibles.
- **¿SSRF/upload?** Sin ruta SSRF evidenciada; sí upload MIME spoofable, URL pública same-origin y límite alto (SEC-05/18).
- **¿Abuso/DoS?** Login sin throttling, preview completo en RAM, upload hasta 1 GiB, mensajes WS sin longitud máxima explícita y agregados globales sin limitación visible.
- **¿CORS + cookies?** No se encontró wildcard CORS; orígenes vienen de lista explícita y middleware CSRF activo. `CORS_ALLOW_CREDENTIALS=True` está habilitado pese a que el flujo actual no usa cookie HttpOnly; normalizar y validar config productiva.
- **¿Desarrollo activo en producción?** El Compose y `.env` del workspace seleccionan development; uso en servidor real no comprobable. Bloqueante hasta evidenciar lo contrario.
- **¿Logs/errores sensibles?** Frontend escribe mensajes y token parcial; preview/download devuelve excepciones. Query token de WebSocket puede quedar en logs de proxy; revisar redacción efectiva.

## 11. Alcance y limitaciones

- No se inició la aplicación ni se enviaron requests a infraestructura externa; no se ejecutaron payloads de XSS, pruebas destructivas, escaneo de red ni cargas grandes.
- No se instalaron herramientas. En el entorno local no están disponibles Node/npm ni `pip-audit`, `gitleaks`, `trufflehog`, `semgrep` o `bandit`; no hubo análisis de advisories online. Por eso no se atribuyen CVEs específicos a dependencias.
- `docker compose config --quiet` fue reportado exitoso por la revisión de configuración; no implica que los servicios estén seguros o ejecutables.
- No se inspeccionaron contenidos de dumps, secretos en logs de servidor, ambiente remoto, DNS/TLS real, certificados, políticas GitHub, firewall, base productiva ni visibilidad del remote.
- El workspace tenía múltiples modificaciones no committeadas al momento de la revisión, incluidas settings/configuración, frontend, tests y Compose. El reporte describe el estado de trabajo observado; comparar cada hallazgo con `HEAD` antes de remediar o desplegar.
- CVSS son aproximaciones de triage, no puntuaciones CVSS vectoriales validadas contra un entorno productivo.

## 12. Resultado final

**Total:** 27 hallazgos — **0 CRITICAL, 6 HIGH, 13 MEDIUM, 8 LOW**.  
**Confirmados por evidencia estática:** 20.  
**Requieren prueba adicional/concurrencia o entorno:** 1 probable y 4 dependientes de configuración/producción, además de validar en navegador la cadena de SEC-05.  
**Hardening:** 2.  
**Bloqueantes recomendados para producción:** SEC-01 a SEC-06 y SEC-11; mantener además SEC-07/08/09/17 como gates de seguridad antes de manejar datos sensibles o usuarios externos.