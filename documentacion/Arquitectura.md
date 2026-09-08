# Arquitectura del sistema

## Visión general
El proyecto está dividido en dos grandes bloques:
- Frontend: interfaz web para usuarios.
- Backend: lógica de negocio, autenticación, API REST y servicios.

Además, existe una capa de infraestructura y soporte con Nginx, base de datos, archivos estáticos y servicios como Redis.

## Diagrama conceptual

```text
Usuario (Web Browser)
        |
        v
Frontend (React + Vite)
        |
        | HTTP / API REST
        v
Backend (Django + DRF)
        |
        +--> Modelos y lógica de negocio
        +--> Autenticación / permisos
        +--> Endpoints para hallazgos, acciones, usuarios, chat, reportes
        |
        +--> Base de datos (MySQL)
        +--> Archivos adjuntos / media
        +--> WebSockets y notificaciones
```

## Capas del sistema

### 1) Frontend
La capa visual está construida con React y organiza la experiencia de usuario en páginas, componentes y contextos.

Componentes principales:
- Páginas de autenticación
- Dashboard del sistema
- Listado y detalle de hallazgos
- Formulario de creación de hallazgos y quejas
- Gestión de usuarios
- Sección de chat
- Panel de notificaciones
- Panel de perfil

Se utiliza routing para proteger páginas por roles y controlar qué usuario puede acceder a cada funcionalidad.

### 2) Backend
El backend está desarrollado con Django y Django REST Framework. Aquí se implementa:
- Entidades del dominio
- Validaciones de negocio
- Permisos por rol
- Endpoints REST
- Lógica de cierre, aprobación y asignación
- Control de archivos
- Autenticación con JWT

### 3) Base de datos
La persistencia se hace en MySQL. Allí se guardan:
- Usuarios
- Hallazgos
- Acciones asociadas
- Chat y mensajes
- Notificaciones
- Archivos
- Catálogos y metadatos

### 4) Servidor web y proxy
Nginx participa como capa de entrada para servir la aplicación y apuntar al backend y frontend según la configuración del despliegue.

### 5) Archivos y media
Los adjuntos se guardan en el sistema de archivos del servidor y se exponen a través de la API para poder descargarlos o visualizarlos desde la interfaz.

## Organización del repositorio

```text
ProyectoDaltec/
├── backend/               # Lógica del sistema
│   ├── apps/              # Modulos funcionales
│   ├── config/            # Configuración global del proyecto
│   ├── templates/         # Plantillas de reportes
│   └── tests/             # Pruebas automatizadas
├── frontend/              # Aplicación en React
│   ├── src/               # Componentes, páginas y lógica del cliente
│   └── public/            # Archivos públicos
├── nginx/                 # Configuración del proxy web
├── scripts/               # Automatizaciones y despliegue
├── specs/                 # Especificaciones del producto
├── docs/                  # Documentación técnica
├── docker-compose.yml     # Orquestación local
├── README.md              # Resumen del proyecto
└── documentacion/         # Documentación general del sistema
```

## Cómo correr cada parte

### Backend
Desde la carpeta backend:

```bash
python manage.py migrate
python manage.py runserver
```

Si se usa Docker:

```bash
docker-compose up --build
```

### Frontend
Desde la carpeta frontend:

```bash
npm install
npm run dev
```

### Base de datos
La base de datos se levanta con Docker Compose o con una instancia MySQL ya configurada en el entorno.

### Nginx
Se sirve como componente de infraestructura; normalmente se levanta junto con el stack Docker o en un entorno de despliegue.

## Patrones de diseño observables
- Separación por aplicaciones dentro de backend.
- Uso de serializadores para transformar datos entre modelos y respuestas API.
- Vistas y viewsets para agrupar operaciones por recurso.
- Contextos y hooks en frontend para manejar sesión, notificaciones y estado global.
- Enfoque de API-first para mantener el frontend desacoplado del backend.

## Seguridad y control
- Autenticación mediante tokens JWT.
- Control de permisos por tipo de usuario.
- Validación de entradas y reglas de negocio en backend.
- Restricción de acceso a acciones según rol.

## Comentario final
La arquitectura permite que el sistema crezca por módulos sin romper la lógica central. Cada área funcional vive separada y se integra a través de una API clara, facilitando mantenimiento, pruebas y evolución del producto.
