"""
Auth URL patterns.
Registered in config/urls.py under /api/v1/auth/
"""
from django.urls import path

from apps.users.views import LoginView, LogoutView, TokenRefreshView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
