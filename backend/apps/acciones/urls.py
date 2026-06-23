from django.urls import path

from apps.acciones.views import AccionViewSet, SolicitudCierreViewSet

accion_detail = AccionViewSet.as_view({
	"get": "retrieve",
	"patch": "partial_update",
})
accion_upload = AccionViewSet.as_view({"post": "upload_archivo"})
accion_solicitar = AccionViewSet.as_view({"post": "solicitar_cierre"})

solicitud_list = SolicitudCierreViewSet.as_view({"get": "list"})
solicitud_aprobar = SolicitudCierreViewSet.as_view({"post": "aprobar"})
solicitud_rechazar = SolicitudCierreViewSet.as_view({"post": "rechazar"})

urlpatterns = [
	path(
		"hallazgos/<int:hallazgo_id>/acciones/<int:pk>/",
		accion_detail,
		name="accion-detail",
	),
	path(
		"hallazgos/<int:hallazgo_id>/acciones/<int:pk>/upload_archivo/",
		accion_upload,
		name="accion-upload-archivo",
	),
	path(
		"hallazgos/<int:hallazgo_id>/acciones/<int:pk>/solicitar_cierre/",
		accion_solicitar,
		name="accion-solicitar-cierre",
	),
	path("solicitudes-cierre/", solicitud_list, name="solicitud-cierre-list"),
	path("solicitudes-cierre/<int:pk>/aprobar/", solicitud_aprobar, name="solicitud-cierre-aprobar"),
	path("solicitudes-cierre/<int:pk>/rechazar/", solicitud_rechazar, name="solicitud-cierre-rechazar"),
]

