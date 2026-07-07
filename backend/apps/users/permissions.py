"""Permissions for users app."""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Permission class to check if user is admin."""
    
    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, 'is_admin', False))
