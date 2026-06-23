from rest_framework.permissions import BasePermission

from apps.hallazgos.models import TipoHallazgo


class HallazgoTipoPermission(BasePermission):
    message = "No tiene permisos para crear este tipo de hallazgo."

    def has_permission(self, request, view):
        if view.action != "create":
            return True

        user = request.user
        tipo = request.data.get("tipo")

        if getattr(user, "is_admin", False):
            return True

        if getattr(user, "is_empleado", False):
            return tipo in {
                TipoHallazgo.NO_CONFORMIDAD,
                TipoHallazgo.OPORTUNIDAD_MEJORA,
            }

        if getattr(user, "is_cliente", False):
            return tipo == TipoHallazgo.QUEJA_CLIENTE

        return False
