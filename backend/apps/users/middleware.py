"""
TokenAuthMiddleware — ASGI middleware for WebSocket JWT authentication.

The browser WebSocket API does not support custom headers, so the access token
is passed as a query parameter: ws://host/ws/.../?token=<access_token>

If the token is missing, invalid, or expired the connection is closed
immediately with close code 4001 (custom: "Unauthorized").

Sets scope["user"] to the authenticated CustomUser so consumers can access
it via self.scope["user"].

Refs: contracts/websocket.md — Autenticación WebSocket; T010
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user_from_token(token_key: str):
    """
    Validate the JWT access token and return the corresponding user.
    Returns AnonymousUser if the token is invalid or the user does not exist.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        validated_token = AccessToken(token_key)
        user_id = validated_token["user_id"]
        return User.objects.get(pk=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class TokenAuthMiddleware:
    """
    ASGI middleware that authenticates WebSocket connections via a JWT
    access token supplied in the ``?token=`` query parameter.

    On successful validation ``scope["user"]`` is set to the authenticated user.
    On failure the connection is closed with code 4001.

    Usage in asgi.py:
        TokenAuthMiddleware(URLRouter(websocket_urlpatterns))
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            query_string = scope.get("query_string", b"").decode("utf-8")
            params = parse_qs(query_string)
            token_list = params.get("token", [])

            if token_list:
                scope["user"] = await _get_user_from_token(token_list[0])
            else:
                scope["user"] = AnonymousUser()

            if not scope["user"].is_authenticated:
                # Close the WebSocket handshake with code 4001 (Unauthorized)
                await send({"type": "websocket.close", "code": 4001})
                return

        await self.inner(scope, receive, send)
