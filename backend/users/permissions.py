"""
Reusable DRF permission classes for role-based access control.

Usage examples
--------------
class MyView(APIView):
    permission_classes = [IsAdminUser]          # only admins

class MyView(APIView):
    permission_classes = [IsAdminOrReadOnly]     # admin writes, secretaire reads

class MyView(APIView):
    permission_classes = [HasModulePermission('finances')]  # secretaire needs finances perm
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_admin(user):
    return user and user.is_authenticated and (user.is_admin or user.is_superuser)


class IsAdminUser(BasePermission):
    """Only admin/superuser can access this endpoint."""

    message = "Seuls les administrateurs ont accès à cette ressource."

    def has_permission(self, request, view):
        return _is_admin(request.user)


class IsAdminOrReadOnly(BasePermission):
    """Admin full access; secretaire read-only (safe methods)."""

    message = "Vous n'avez pas la permission d'effectuer cette action."

    def has_permission(self, request, view):
        if _is_admin(request.user):
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.method in SAFE_METHODS
        )


class HasModulePermission(BasePermission):
    """
    Admin always passes.
    Secretaire passes only when the user holds at least one Django permission
    whose codename matches the given module label pattern.

    Example:
        HasModulePermission('finances')  → checks for any perm containing 'finances'
    """

    message = "Vous n'avez pas accès à ce module."

    def __init__(self, module_label: str):
        self.module_label = module_label

    def has_permission(self, request, view):
        if _is_admin(request.user):
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        perms = request.user.get_all_permissions()
        return any(self.module_label in p for p in perms)


def make_module_permission(module_label: str):
    """
    Factory that returns a DRF permission class for a given module.

    Usage:
        permission_classes = [make_module_permission('finances')]
    """

    class _Permission(BasePermission):
        message = f"Accès au module '{module_label}' refusé."

        def has_permission(self, request, view):
            if _is_admin(request.user):
                return True
            if not request.user or not request.user.is_authenticated:
                return False
            perms = request.user.get_all_permissions()
            return any(module_label in p for p in perms)

    _Permission.__name__ = f"{module_label.capitalize()}Permission"
    return _Permission
from rest_framework.permissions import DjangoModelPermissions

class StrictDjangoModelPermissions(DjangoModelPermissions):
    """
    Extends DjangoModelPermissions to also require 'view' permission for GET requests
    and bypasses all checks for admin users.
    """
    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': [],
        'HEAD': [],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }

    def has_permission(self, request, view):
        # Admin bypass
        if request.user and request.user.is_authenticated and (request.user.is_admin or request.user.is_superuser or getattr(request.user, 'role', '') == 'admin'):
            return True
            
        # Defer to standard Django model perm checks
        return super().has_permission(request, view)

