"""URL configuration for archivos app (T068)."""
from rest_framework.routers import DefaultRouter
from .viewsets import ArchivoViewSet

app_name = 'archivos'

router = DefaultRouter()
router.register(r'archivos', ArchivoViewSet, basename='archivo')

urlpatterns = router.urls
