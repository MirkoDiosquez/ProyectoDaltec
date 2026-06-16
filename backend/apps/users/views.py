"""
Auth views for ProyectoDaltec.

T012: LoginView, TokenRefreshView, LogoutView
T057: User CRUD (implemented later)

Login is DNI-based: the request supplies `dni` + `password`.
We authenticate via `CustomUser.objects.get(dni=...)` + `check_password()`,
then issue access + refresh tokens using simplejwt.
The refresh token is returned both in the response body and in an HttpOnly
cookie (so the frontend Axios interceptor can refresh silently).

Contract: contracts/rest-api.md — Auth section
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Attach the refresh token as an HttpOnly cookie.
    Frontend Axios interceptors read this cookie via the browser automatically;
    it is never accessible to JavaScript (mitigates XSS — Constitution VI).
    """
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,       # HTTPS only in production (dev proxy handles this)
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,  # 7 days — overridden by JWT_REFRESH_LIFETIME
    )


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Authenticate with DNI + password; return JWT access + refresh tokens.

    Response 200: { "access": "...", "refresh": "..." }
    Response 401: Invalid credentials.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        dni = request.data.get("dni")
        password = request.data.get("password")

        if not dni or not password:
            return Response(
                {"detail": "DNI y contraseña son requeridos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(dni=dni)
        except User.DoesNotExist:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "La cuenta está desactivada."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "access": access_token,
                "refresh": refresh_token,
                "user": {
                    "id": user.pk,
                    "nombre": user.nombre,
                    "apellido": user.apellido,
                    "tipo": user.tipo,
                },
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, refresh_token)
        return response


class TokenRefreshView(APIView):
    """
    POST /api/v1/auth/refresh/
    Renew the access token using the refresh token from the HttpOnly cookie
    or from the request body (fallback for non-browser clients).

    Response 200: { "access": "..." }
    Response 401: Invalid or expired refresh token.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        # Prefer cookie (browser clients); fall back to body (API clients)
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get(
            "refresh"
        )

        if not refresh_token:
            return Response(
                {"detail": "Refresh token no encontrado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
        except TokenError:
            return Response(
                {"detail": "Refresh token inválido o expirado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response({"access": access_token}, status=status.HTTP_200_OK)
        # If ROTATE_REFRESH_TOKENS=True, a new refresh token is issued
        if hasattr(refresh, "token") and str(refresh) != refresh_token:
            _set_refresh_cookie(response, str(refresh))
        return response


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklist the refresh token so it cannot be reused.
    Clears the HttpOnly cookie.

    Response 204: No content.
    Response 400: Invalid token.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get(
            "refresh"
        )

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                # Already blacklisted or invalid — treat as success (idempotent)
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie("refresh_token")
        return response
