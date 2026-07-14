from rest_framework.routers import DefaultRouter

from apps.reportes.views import ReporteHallazgosViewSet

router = DefaultRouter()
router.register(r"reportes", ReporteHallazgosViewSet, basename="reporte-hallazgos")

urlpatterns = router.urls
