"""
Chat models for ProyectoDaltec.

Chat represents a discussion channel associated with a single Hallazgo.
Participantes are synced with Hallazgo.responsables (FR-012, FR-013).

Mensaje represents a message in a chat, with autor and fecha_hora auto-set.

Refs: FR-012, FR-013, data-model.md
"""
from django.conf import settings
from django.db import models


class Chat(models.Model):
    """
    OneToOne with Hallazgo; auto-created when Hallazgo is created.

    FR-012: Only current responsables of the Hallazgo are participants.
    FR-013: Removing a responsable removes them from chat (handled in service).
    """

    hallazgo = models.OneToOneField(
        "hallazgos.Hallazgo",
        on_delete=models.CASCADE,
        related_name="chat",
        verbose_name="Hallazgo",
    )
    participantes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="chats_participando",
        blank=True,
        verbose_name="Participantes",
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación",
    )

    class Meta:
        verbose_name = "Chat"
        verbose_name_plural = "Chats"

    def __str__(self):
        return f"Chat-Hallazgo#{self.hallazgo_id}"


class Mensaje(models.Model):
    """
    Message in a Chat. Contenido and fecha_hora are captured automatically.

    FR-012: Only current chat participants can send messages (enforced at view/service).
    History is retained even if a participant is removed; they just lose future access.
    """

    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name="mensajes",
        verbose_name="Chat",
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="mensajes_enviados",
        verbose_name="Autor",
    )
    contenido = models.TextField(verbose_name="Contenido")
    fecha_hora = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha y Hora",
    )

    class Meta:
        verbose_name = "Mensaje"
        verbose_name_plural = "Mensajes"
        ordering = ["fecha_hora"]

    def __str__(self):
        return f"[{self.fecha_hora}] {self.autor}: {self.contenido[:50]}"

