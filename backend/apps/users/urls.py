# This module is kept for backward compatibility.
# Auth URLs: apps.users.urls.auth (T012)
# User CRUD URLs: registered in T057
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views import UserViewSet

router = DefaultRouter()
router.register(r"usuarios", UserViewSet, basename="usuario")

urlpatterns = [
    path("", include(router.urls)),
]
