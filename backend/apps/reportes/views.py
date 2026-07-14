from django.core.exceptions import PermissionDenied
from django.http import FileResponse, Http404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.reportes.models import ReporteHallazgos
from apps.reportes.serializers import ReporteHallazgosSerializer
from apps.reportes.services import ReporteHallazgosService


class ReporteHallazgosViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = ReporteHallazgos.objects.select_related("creado_por")
    serializer_class = ReporteHallazgosSerializer
    permission_classes = [IsAuthenticated]

    def _check_admin(self):
        if not getattr(self.request.user, "is_admin", False):
            raise PermissionDenied("Solo administradores pueden gestionar reportes.")

    def get_queryset(self):
        self._check_admin()
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        self._check_admin()
        reporte = ReporteHallazgosService.generar_reporte(request.user)
        serializer = self.get_serializer(reporte)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        self._check_admin()
        reporte = self.get_object()
        ReporteHallazgosService.eliminar_reporte(reporte)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        self._check_admin()
        reporte = self.get_object()

        if not reporte.archivo:
            raise Http404("Archivo de reporte no encontrado")

        try:
            response = FileResponse(
                reporte.archivo.open("rb"),
                content_type="application/vnd.ms-excel",
            )
            response["Content-Disposition"] = f'attachment; filename="{reporte.nombre}"'
            return response
        except FileNotFoundError:
            raise Http404("Archivo de reporte no encontrado en almacenamiento")
