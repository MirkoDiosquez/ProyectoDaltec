from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ClienteProfile, CustomUser, EmpleadoProfile


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
