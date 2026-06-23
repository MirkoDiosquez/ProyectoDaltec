from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.hallazgos.views import HallazgoViewSet

router = DefaultRouter()
router.register(r"", HallazgoViewSet, basename="hallazgo")

urlpatterns = [
	path("", include(router.urls)),
]

