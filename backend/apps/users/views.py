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
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.serializers import (
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


class IsAdminUserTipo(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(
            request.user, "is_admin", False
        )


class UserViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all().order_by("apellido", "nombre", "dni")

    def get_permissions(self):
        if self.action in ("me", "list", "retrieve", "update", "partial_update"):
            return [IsAuthenticated()]
        return [IsAdminUserTipo()]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        if self.action in ("retrieve", "me"):
            return UserDetailSerializer
        return UserListSerializer

    def get_object(self):
        obj = super().get_object()
        actor = self.request.user

        if getattr(actor, "is_admin", False):
            if getattr(obj, "is_admin", False) and obj.pk != actor.pk:
                raise PermissionDenied(
                    "Un administrador no puede editar el perfil ni rol de otro administrador."
                )
            return obj

        if actor.pk != obj.pk:
            raise PermissionDenied("No tiene permisos para editar este perfil.")

        return obj

    def get_queryset(self):
        queryset = self.queryset
        tipo = self.request.query_params.get("tipo")
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        output = UserListSerializer(user, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        user = request.user
        if request.method.lower() == "get":
            data = UserDetailSerializer(user, context={"request": request}).data
            return Response(data, status=status.HTTP_200_OK)

        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()
        data = UserDetailSerializer(updated_user, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)


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

        return Response(
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
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token no encontrado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)
            # Accessing .access_token blacklists the old token and rotates to
            # a new refresh token when ROTATE_REFRESH_TOKENS=True (settings).
            access_token = str(refresh.access_token)
            new_refresh_token = str(refresh)
        except TokenError:
            return Response(
                {"detail": "Refresh token inválido o expirado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {"access": access_token, "refresh": new_refresh_token},
            status=status.HTTP_200_OK,
        )


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
        refresh_token = request.data.get("refresh")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                # Already blacklisted or invalid — treat as success (idempotent)
                pass

        return Response(status=status.HTTP_204_NO_CONTENT)
