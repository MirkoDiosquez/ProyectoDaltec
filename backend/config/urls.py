"""
URL configuration for ProyectoDaltec.
App-specific URLs are registered in T012, T028, T043, T053, T057, T061.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    # T012
    path("api/v1/auth/", include("apps.users.urls.auth")),
    path("api/v1/hallazgos/", include("apps.hallazgos.urls")),
    path("api/v1/", include("apps.acciones.urls")),
    # T053
    path("api/v1/", include("apps.chat.urls")),
    # T061
    path("api/v1/", include("apps.notificaciones.urls")),
    # T057: path("api/v1/", include("apps.users.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
