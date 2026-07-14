from django.contrib import admin

from apps.reportes.models import ReporteHallazgos


@admin.register(ReporteHallazgos)
class ReporteHallazgosAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "creado_por", "fecha_creacion")
    list_filter = ("fecha_creacion",)
    search_fields = ("nombre", "creado_por__nombre", "creado_por__apellido", "creado_por__email")
