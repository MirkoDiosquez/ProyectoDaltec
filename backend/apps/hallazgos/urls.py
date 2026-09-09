from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from apps.hallazgos.views import HallazgoViewSet
from apps.solicitud_cambio_responsable.viewsets import SolicitudCambioResponsableViewSet

router = DefaultRouter()
router.register(r"", HallazgoViewSet, basename="hallazgo")

# Nested router for routes under /hallazgos/{hallazgo_id}/
nested_router = DefaultRouter()
nested_router.register(
    r"solicitudes-cambio-responsable",
    SolicitudCambioResponsableViewSet,
    basename="solicitud_cambio_responsable"
)

urlpatterns = [
    path("", include(router.urls)),
    # Nested routes under /hallazgos/{hallazgo_id}/
    re_path(
        r"^(?P<hallazgo_id>\d+)/",
        include(nested_router.urls)
    ),
]


