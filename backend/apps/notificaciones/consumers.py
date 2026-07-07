from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificacionConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications (T121).
    
    Connection:
    - ws://notificaciones/ (upgrades to wss:// in production)
    
    Groups:
    - notificaciones_{user_id}: Personal notification stream for each user
    
    Events:
    - notificacion.nueva: New notification with tipo field and payload
    - notificacion.marca_leida: When notification is marked as read
    
    Supports all user types (admin, empleado, cliente).
    """
    
    async def connect(self):
        """Connect user to personal notification stream."""
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        # Group name for this specific user
        self.group_name = f"notificaciones_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Send connection confirmation
        await self.send_json({
            "type": "connection_established",
            "user_id": user.id,
            "message": "Connected to notification stream"
        })

    async def disconnect(self, close_code):
        """Disconnect user from notification stream."""
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notificacion_nueva(self, event):
        """
        Handle new notification event (T121).
        
        Payload includes:
        - id: notification ID
        - tipo: notification category (cambio_responsable_pendiente, etc.)
        - titulo: notification title
        - mensaje: notification message
        - fecha: timestamp
        - leida: read status
        """
        await self.send_json(event.get("payload", {}))
    
    async def notificacion_marca_leida(self, event):
        """Handle notification marked as read event."""
        await self.send_json(event.get("payload", {}))

