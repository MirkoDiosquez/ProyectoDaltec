from django.urls import path

from apps.acciones.views import AccionViewSet, SolicitudCierreViewSet

accion_detail = AccionViewSet.as_view({
	"get": "retrieve",
	"patch": "partial_update",
})
accion_upload = AccionViewSet.as_view({"post": "upload_archivo"})
accion_solicitar = AccionViewSet.as_view({"post": "solicitar_cierre"})
accion_porques = AccionViewSet.as_view({"get": "list_porques", "post": "create_porque"})
accion_porque_approve = AccionViewSet.as_view({"post": "approve_porque"})
accion_porque_reject = AccionViewSet.as_view({"post": "reject_porque"})

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
	path(
		"hallazgos/<int:hallazgo_id>/acciones/<int:pk>/porques/",
		accion_porques,
		name="accion-porques",
	),
	path(
		"hallazgos/<int:hallazgo_id>/acciones/<int:pk>/porques/<int:porque_id>/approve/",
		accion_porque_approve,
		name="accion-porque-approve",
	),
	path(
		"hallazgos/<int:hallazgo_id>/acciones/<int:pk>/porques/<int:porque_id>/reject/",
		accion_porque_reject,
		name="accion-porque-reject",
	),
	path("solicitudes-cierre/", solicitud_list, name="solicitud-cierre-list"),
	path("solicitudes-cierre/<int:pk>/aprobar/", solicitud_aprobar, name="solicitud-cierre-aprobar"),
	path("solicitudes-cierre/<int:pk>/rechazar/", solicitud_rechazar, name="solicitud-cierre-rechazar"),
]

