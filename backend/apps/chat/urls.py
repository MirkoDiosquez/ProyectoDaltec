from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.chat.views import ChatViewSet

router = DefaultRouter()
router.register(r"chats", ChatViewSet, basename="chat")

urlpatterns = [
    path("", include(router.urls)),
]

