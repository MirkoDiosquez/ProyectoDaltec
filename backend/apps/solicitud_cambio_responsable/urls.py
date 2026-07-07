"""URL configuration for responsibility change requests."""
from django.urls import path, re_path
from rest_framework.routers import DefaultRouter

from apps.solicitud_cambio_responsable.viewsets import SolicitudCambioResponsableViewSet

# Create a router, but we'll use custom path patterns since this is a nested route
# under /hallazgos/{hallazgo_id}/

app_name = 'solicitud_cambio_responsable'

# Generate URL patterns for nested routes: /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/
urlpatterns = [
    # This will be included with a pattern like:
    # path('<int:hallazgo_id>/solicitudes-cambio-responsable/', include('apps.solicitud_cambio_responsable.urls'))
]

# The viewset will be hooked up at the hallazgos level
