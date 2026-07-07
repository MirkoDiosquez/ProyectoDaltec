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
    
    Phase 2: tiene_urgente field tracks if message contains #urgente tag (case-insensitive).
    Pre-save signal detects (?i)#urgente pattern and sets tiene_urgente=True.
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
    
    # Phase 2: Urgent message tracking
    tiene_urgente = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Has #urgente tag",
        help_text="True if message contains #urgente (case-insensitive)"
    )

    class Meta:
        verbose_name = "Mensaje"
        verbose_name_plural = "Mensajes"
        ordering = ["fecha_hora"]
        indexes = [
            models.Index(fields=['chat', 'tiene_urgente']),
            models.Index(fields=['tiene_urgente']),
        ]

    def __str__(self):
        tag = " [URGENTE]" if self.tiene_urgente else ""
        return f"[{self.fecha_hora}] {self.autor}: {self.contenido[:50]}{tag}"


# ---------------------------------------------------------------------------
# Signals
# ---------------------------------------------------------------------------

from django.db.models.signals import pre_save
from django.dispatch import receiver
import re


@receiver(pre_save, sender=Mensaje)
def detect_urgente_tag(sender, instance, **kwargs):
    """
    Pre-save signal: Detect case-insensitive #urgente tag in message content.
    
    Sets tiene_urgente=True if message matches pattern (?i)#urgente.
    This triggers notification dispatch for all chat participants.
    """
    if instance.contenido:
        # Case-insensitive regex match for #urgente
        if re.search(r'(?i)#urgente', instance.contenido):
            instance.tiene_urgente = True
        else:
            instance.tiene_urgente = False
    else:
        instance.tiene_urgente = False

