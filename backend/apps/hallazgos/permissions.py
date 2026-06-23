from rest_framework.permissions import BasePermission
from rest_framework.exceptions import ValidationError

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
            if tipo not in {
                TipoHallazgo.NO_CONFORMIDAD,
                TipoHallazgo.OPORTUNIDAD_MEJORA,
            }:
                raise ValidationError(
                    {"tipo": ["Un empleado solo puede crear No Conformidad u Oportunidad de Mejora."]}
                )
            return True

        if getattr(user, "is_cliente", False):
            if tipo != TipoHallazgo.QUEJA_CLIENTE:
                raise ValidationError(
                    {"tipo": ["Un cliente solo puede crear Queja de Cliente."]}
                )
            return True

        return False
