from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.acciones.models import Accion, EstadoAccion
from apps.hallazgos.models import EstadoHallazgo


@receiver(post_save, sender=Accion)
def cerrar_hallazgo_si_corresponde(sender, instance, **kwargs):
	hallazgo = instance.hallazgo
	if hallazgo.estado == EstadoHallazgo.CERRADO:
		return

	todas_cerradas = not hallazgo.acciones.exclude(estado=EstadoAccion.CERRADA).exists()
	if todas_cerradas and hallazgo.acciones.exists():
		hallazgo.estado = EstadoHallazgo.CERRADO
		hallazgo.save(update_fields=["estado"])
