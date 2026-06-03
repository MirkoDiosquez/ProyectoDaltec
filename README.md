# ProyectoDaltec

Proyecto de las pasantías — Diosquez y Buhler

**Stack:** Django + Channels · ASGI (Daphne) · MySQL · Redis · React (Vite)

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Backend — Django](#3-backend--django)
4. [Base de datos — MySQL](#4-base-de-datos--mysql)
5. [Redis](#5-redis)
6. [Frontend — React](#6-frontend--react)
7. [Correr el proyecto](#7-correr-el-proyecto)
8. [Estructura del proyecto](#8-estructura-del-proyecto)
9. [Variables de entorno](#9-variables-de-entorno)

---

## 1. Requisitos previos

Asegurarse de tener instalado:

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|----------|
| Python | 3.11+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |
| Redis | 7+ | https://redis.io/downloads/ (Windows: https://github.com/tporadowski/redis/releases) |
| Git | cualquiera | https://git-scm.com/ |

---

## 2. Clonar el repositorio

```bash
git clone <URL-del-repositorio>
cd ProyectoDaltec
```

---

## 3. Backend — Django

### 3.1 Crear y activar el entorno virtual

```bash
# Windows
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

### 3.2 Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3.3 Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
```

Editar `.env` con los valores reales (ver sección [Variables de entorno](#9-variables-de-entorno)).

### 3.4 Ejecutar migraciones

```bash
python manage.py makemigrations
python manage.py migrate
```

### 3.5 Crear superusuario

```bash
python manage.py createsuperuser
```

### 3.6 Recolectar archivos estáticos (solo producción)

```bash
python manage.py collectstatic
```

---

## 4. Base de datos — MySQL

Crear la base de datos antes de ejecutar las migraciones:

```sql
-- Ejecutar en MySQL Workbench o consola MySQL
CREATE DATABASE daltec_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Verificar que en `.env` los valores `DB_*` apunten al servidor correcto.

---

## 5. Redis

Redis es necesario para que Django Channels funcione (channel layer).

**Windows** — descargar e instalar desde:  
https://github.com/tporadowski/redis/releases

Iniciar el servidor Redis:

```bash
# Windows (desde la carpeta de instalación)
redis-server

# macOS / Linux
redis-server
```

Verificar que Redis está corriendo:

```bash
redis-cli ping
# Debe responder: PONG
```

---

## 6. Frontend — React

### 6.1 Crear el proyecto React (primera vez)

```bash
mkdir frontend
cd frontend
npm create vite@latest . -- --template react
npm install
```

### 6.2 Instalar dependencias adicionales recomendadas

```bash
npm install axios react-router-dom
```

### 6.3 Configurar proxy hacia Django (desarrollo)

En `frontend/vite.config.js` agregar:

```js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws':  'http://localhost:8000',
    },
  },
}
```

### 6.4 Si ya existe la carpeta frontend

```bash
cd frontend
npm install
```

---

## 7. Correr el proyecto

Necesitás **tres terminales** abiertas simultáneamente:

**Terminal 1 — Redis**
```bash
redis-server
```

**Terminal 2 — Django (ASGI con Daphne)**
```bash
# Desde la raíz del proyecto, con el venv activo
.\venv\Scripts\Activate.ps1   # Windows
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

O con el servidor de desarrollo estándar:
```bash
python manage.py runserver
```

**Terminal 3 — React**
```bash
cd frontend
npm run dev
```

Accesos:
- **Django API / Admin:** http://localhost:8000
- **React frontend:** http://localhost:5173

---

## 8. Estructura del proyecto

```
ProyectoDaltec/
│
├── config/                     # Configuración principal de Django
│   ├── __init__.py
│   ├── settings.py             # Settings (MySQL, Redis, Channels, CORS, JWT)
│   ├── urls.py                 # URLs raíz + endpoints JWT
│   ├── asgi.py                 # Entry point ASGI (HTTP + WebSocket)
│   ├── wsgi.py                 # Entry point WSGI (fallback)
│   └── routing.py              # Rutas WebSocket globales
│
├── apps/                       # Apps Django del proyecto
│   └── <nombre_app>/           # Cada funcionalidad en su propia app
│       ├── migrations/
│       ├── consumers.py        # WebSocket consumers (Channels)
│       ├── routing.py          # Rutas WebSocket de la app
│       ├── models.py
│       ├── views.py
│       ├── serializers.py      # DRF serializers
│       └── urls.py
│
├── frontend/                   # Aplicación React (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/           # Llamadas a la API Django
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── templates/                  # Templates HTML (si se usan)
├── static/                     # Archivos estáticos fuente
├── staticfiles/                # Generado por collectstatic (no versionar)
├── media/                      # Archivos subidos por usuarios (no versionar)
│
├── manage.py
├── requirements.txt
├── .env                        # Variables de entorno locales (no versionar)
├── .env.example                # Plantilla de variables de entorno
└── .gitignore
```

---

## 9. Variables de entorno

Copiar `.env.example` como `.env` y completar:

```env
# Django
DEBUG=True
SECRET_KEY=cambia-esta-clave-por-una-segura
ALLOWED_HOSTS=localhost,127.0.0.1

# MySQL
DB_NAME=daltec_db
DB_USER=root
DB_PASSWORD=tu_password
DB_HOST=127.0.0.1
DB_PORT=3306

# Redis
REDIS_URL=redis://127.0.0.1:6379/0

# CORS (React en desarrollo)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:5173
```

> **Nunca subir el archivo `.env` al repositorio.** Ya está en `.gitignore`.

---

## Crear una nueva app Django

```bash
# Desde la raíz del proyecto, con el venv activo
mkdir apps\nombre_app          # Windows
python manage.py startapp nombre_app apps/nombre_app
```

Luego agregar `'apps.nombre_app'` en `INSTALLED_APPS` dentro de `config/settings.py`.

