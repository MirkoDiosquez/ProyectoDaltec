from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.core.exceptions import PermissionDenied

from .models import (
    ClienteProfile,
    CustomUser,
    EmpleadoProfile,
    PROTECTED_USER_DNI,
    is_protected_user,
)


class EmpleadoProfileInline(admin.StackedInline):
    model = EmpleadoProfile
    can_delete = False


class ClienteProfileInline(admin.StackedInline):
    model = ClienteProfile
    can_delete = False


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("dni", "nombre", "apellido", "tipo", "email", "is_active")
    list_filter = ("tipo", "is_active")
    search_fields = ("dni", "nombre", "apellido", "email")
    ordering = ("apellido", "nombre")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Datos personales", {"fields": ("dni", "nombre", "apellido", "sexo", "email")}),
        ("Rol", {"fields": ("tipo",)}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "dni", "nombre", "apellido", "sexo", "email", "tipo", "password1", "password2"),
        }),
    )

    def get_inlines(self, request, obj=None):
        if obj is None:
            return []
        if obj.tipo == "EMPLEADO":
            return [EmpleadoProfileInline]
        if obj.tipo == "CLIENTE":
            return [ClienteProfileInline]
        return []

    def has_change_permission(self, request, obj=None):
        has_permission = super().has_change_permission(request, obj)
        if not has_permission:
            return False
        if obj is not None and is_protected_user(obj):
            return False
        return True

    def has_delete_permission(self, request, obj=None):
        has_permission = super().has_delete_permission(request, obj)
        if not has_permission:
            return False
        if obj is not None and is_protected_user(obj):
            return False
        return True

    def save_model(self, request, obj, form, change):
        if change and is_protected_user(obj):
            raise PermissionDenied("No está permitido modificar la cuenta protegida.")
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        if is_protected_user(obj):
            raise PermissionDenied("No está permitido modificar la cuenta protegida.")
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        if queryset.filter(dni=PROTECTED_USER_DNI).exists():
            raise PermissionDenied("No está permitido modificar la cuenta protegida.")
        super().delete_queryset(request, queryset)
