"""
Base settings for ProyectoDaltec.

All sensitive values come from environment variables (Constitution Principle II).
Never hardcode secrets, credentials, or environment-specific paths.
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ["SECRET_KEY"]

DEBUG = False

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost").split(",")

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "channels",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
]

LOCAL_APPS = [
    "apps.users",
    "apps.hallazgos",
    "apps.acciones",
    "apps.chat",
    "apps.archivos",
    "apps.notificaciones",
    "apps.catalogos",
    "apps.contacto_externo",
    "apps.analisis_cinco_porques",
    "apps.solicitud_cambio_responsable",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Daphne is the ASGI server — WSGI_APPLICATION is still needed for admin/runserver
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Custom user model
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "users.CustomUser"

# ---------------------------------------------------------------------------
# Database — MySQL 8 (all values from env)
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ.get("DB_HOST", "db"),
        "PORT": os.environ.get("DB_PORT", "3306"),
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# ---------------------------------------------------------------------------
# Channel Layers — Redis 7
# ---------------------------------------------------------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            # socket_timeout=None prevents redis-py's default 5s socket timeout
            # from racing with channels_redis's brpop_timeout=5 and raising
            # redis.exceptions.TimeoutError that crashes the WS consumer.
            "hosts": [{"address": os.environ.get("REDIS_URL", "redis://redis:6379/0"), "socket_timeout": None}],
            "capacity": 1500,        # max messages queued per channel
            "expiry": 60,            # message TTL in Redis (seconds)
            "group_expiry": 86400,   # group membership TTL (24 h)
        },
    }
}

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & Media
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = os.environ.get("STATIC_ROOT", str(BASE_DIR / "staticfiles"))
MEDIA_URL = "/media/"
MEDIA_ROOT = os.environ.get("MEDIA_ROOT", str(BASE_DIR / "media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# CORS — origins from env (comma-separated)
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True  # Required for HttpOnly refresh-token cookie

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
}

# ---------------------------------------------------------------------------
# SimpleJWT — access token in memory (frontend), refresh via HttpOnly cookie
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_LIFETIME", "15"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.environ.get("JWT_REFRESH_LIFETIME", "7"))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": os.environ["SECRET_KEY"],
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ---------------------------------------------------------------------------
# File upload constraints (from env — Constitution Principle II)
# ---------------------------------------------------------------------------
# MAX_FILE_SIZE is in bytes (default 1 GiB)
MAX_FILE_SIZE = int(os.environ.get("MAX_FILE_SIZE", str(1024 * 1024 * 1024)))
# Comma-separated MIME types e.g. "application/pdf,image/jpeg,image/png"
ALLOWED_FILE_TYPES = [
    t.strip()
    for t in os.environ.get(
        "ALLOWED_FILE_TYPES",
        "application/pdf,image/jpeg,image/png,image/gif,"
        "application/msword,"
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
        "text/plain,text/csv,application/json,application/xml,text/xml,"
        "application/rtf,application/vnd.ms-powerpoint,"
        "application/vnd.openxmlformats-officedocument.presentationml.presentation,"
        "application/vnd.ms-excel,"
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
        "application/zip,application/x-zip-compressed,application/x-rar-compressed,"
        "application/x-7z-compressed,image/webp,video/mp4,video/mpeg,video/quicktime,"
        "audio/mpeg,audio/wav,audio/x-wav",
    ).split(",")
    if t.strip()
]

# FILE_UPLOAD_WHITELIST: per-MIME-type max file sizes (in bytes)
FILE_UPLOAD_WHITELIST = {
    "image/jpeg": MAX_FILE_SIZE,
    "image/png": MAX_FILE_SIZE,
    "image/gif": MAX_FILE_SIZE,
    "image/webp": MAX_FILE_SIZE,
    "application/pdf": MAX_FILE_SIZE,
    "application/msword": MAX_FILE_SIZE,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": MAX_FILE_SIZE,
    "application/rtf": MAX_FILE_SIZE,
    "application/vnd.ms-excel": MAX_FILE_SIZE,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": MAX_FILE_SIZE,
    "application/vnd.ms-powerpoint": MAX_FILE_SIZE,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": MAX_FILE_SIZE,
    "text/plain": MAX_FILE_SIZE,
    "text/csv": MAX_FILE_SIZE,
    "application/json": MAX_FILE_SIZE,
    "application/xml": MAX_FILE_SIZE,
    "text/xml": MAX_FILE_SIZE,
    "application/zip": MAX_FILE_SIZE,
    "application/x-zip-compressed": MAX_FILE_SIZE,
    "application/x-rar-compressed": MAX_FILE_SIZE,
    "application/x-7z-compressed": MAX_FILE_SIZE,
    "video/mp4": MAX_FILE_SIZE,
    "video/mpeg": MAX_FILE_SIZE,
    "video/quicktime": MAX_FILE_SIZE,
    "audio/mpeg": MAX_FILE_SIZE,
    "audio/wav": MAX_FILE_SIZE,
    "audio/x-wav": MAX_FILE_SIZE,
}

# ---------------------------------------------------------------------------
# Logging — Structured logging for observability
# ---------------------------------------------------------------------------
from config.logging_config import get_log_config

LOGGING = get_log_config()
