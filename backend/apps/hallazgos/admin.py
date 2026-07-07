from django.contrib import admin

from apps.hallazgos.models import Hallazgo, HallazgoResponsable


@admin.register(Hallazgo)
class HallazgoAdmin(admin.ModelAdmin):
    list_display = ["id", "tipo", "estado", "creado_por", "cliente_asociado", "fecha_creacion"]
    list_filter = ["tipo", "estado", "cliente_asociado"]
    search_fields = [
        "descripcion",
        "ubicacion",
        "creado_por__nombre",
        "creado_por__apellido",
        "creado_por__dni",
        "cliente_asociado__nombre",
        "cliente_asociado__apellido",
        "cliente_asociado__dni",
    ]
    raw_id_fields = ["creado_por", "cliente_asociado"]


@admin.register(HallazgoResponsable)
class HallazgoResponsableAdmin(admin.ModelAdmin):
    list_display = ["hallazgo", "responsable", "fecha_asignacion"]
