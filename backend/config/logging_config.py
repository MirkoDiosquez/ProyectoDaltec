"""
Structured logging configuration for ProyectoDaltec.

Provides business-critical event logging for:
- Hallazgo lifecycle (create, update, close)
- Porqué (5-why analysis) approval workflow
- Solicitud de cambio responsable (responsibility change requests)
- Chat message events (including #urgente detection)
- Notification dispatch
- User authentication events

All logs are structured as JSON for observability and can be shipped to
centralized logging systems (ELK, Splunk, etc.).

Environment variables (from Constitution Principle II):
- LOG_LEVEL: DEBUG, INFO, WARNING, ERROR (default: INFO)
- LOG_FORMAT: json or text (default: json for production)
"""
import logging
import os
from logging.handlers import RotatingFileHandler


def get_log_config():
    """Return logging configuration dictionary for Django LOGGING setting."""
    
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    log_format = os.environ.get("LOG_FORMAT", "json" if not os.environ.get("DEBUG") else "text").lower()
    
    # Ensure logs directory exists
    logs_dir = os.path.join(os.environ.get("LOG_ROOT", "/app/logs"), "")
    os.makedirs(logs_dir, exist_ok=True)
    
    # Formatters: JSON for structured logging, text for development
    formatters = {
        "json": {
            "format": '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s", "module": "%(module)s", "funcName": "%(funcName)s", "lineno": %(lineno)d}'
        },
        "text": {
            "format": "%(asctime)s [%(levelname)s] %(name)s.%(funcName)s:%(lineno)d - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "verbose": {
            "format": "%(asctime)s [%(levelname)s] %(process)d %(thread)d %(name)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    }
    
    # Handlers: console + rotating files for business-critical events
    handlers = {
        "console": {
            "level": log_level,
            "class": "logging.StreamHandler",
            "formatter": log_format,
        },
        "file_hallazgos": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(logs_dir, "hallazgos.log"),
            "maxBytes": 10485760,  # 10 MB
            "backupCount": 5,
            "formatter": log_format,
        },
        "file_porques": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(logs_dir, "porques_approval.log"),
            "maxBytes": 10485760,  # 10 MB
            "backupCount": 5,
            "formatter": log_format,
        },
        "file_solicitudes": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(logs_dir, "solicitudes_cambio.log"),
            "maxBytes": 10485760,  # 10 MB
            "backupCount": 5,
            "formatter": log_format,
        },
        "file_chat": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(logs_dir, "chat_urgente.log"),
            "maxBytes": 10485760,  # 10 MB
            "backupCount": 5,
            "formatter": log_format,
        },
        "file_notificaciones": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(logs_dir, "notificaciones.log"),
            "maxBytes": 10485760,  # 10 MB
            "backupCount": 5,
            "formatter": log_format,
        },
    }
    
    # Loggers: application-specific loggers for business events
    loggers = {
        # Hallazgos events
        "apps.hallazgos": {
            "handlers": ["console", "file_hallazgos"],
            "level": "INFO",
            "propagate": False,
        },
        # Porqué approval workflow
        "apps.analisis_cinco_porques": {
            "handlers": ["console", "file_porques"],
            "level": "INFO",
            "propagate": False,
        },
        # Solicitud de cambio responsable
        "apps.solicitud_cambio_responsable": {
            "handlers": ["console", "file_solicitudes"],
            "level": "INFO",
            "propagate": False,
        },
        # Chat messages (including #urgente)
        "apps.chat": {
            "handlers": ["console", "file_chat"],
            "level": "INFO",
            "propagate": False,
        },
        # Notification dispatch
        "apps.notificaciones": {
            "handlers": ["console", "file_notificaciones"],
            "level": "INFO",
            "propagate": False,
        },
        # Django framework
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING" if not os.environ.get("DEBUG") else "DEBUG",
            "propagate": False,
        },
    }
    
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": formatters,
        "handlers": handlers,
        "loggers": loggers,
        "root": {
            "level": log_level,
            "handlers": ["console"],
        },
    }
