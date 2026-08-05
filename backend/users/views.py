from rest_framework import viewsets, permissions, status, filters
from users.permissions import make_module_permission, StrictDjangoModelPermissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import FileResponse
from rest_framework.views import APIView
from django.contrib.auth.models import Permission
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoPasswordValidationError

from .models import User, StudentProfile, TeacherProfile
from .serializers import (
    UserSerializer,
    UserSelfSerializer,
    AdminSerializer,
    StudentProfileSerializer,
    TeacherProfileSerializer,
    SecretaireSerializer,
    PermissionSerializer,
)
from .permissions import IsAdminUser


# ---------------------------------------------------------------------------
# App labels whose permissions can be delegated to a secrétaire
# ---------------------------------------------------------------------------
DELEGATABLE_APPS = ('users', 'academics', 'planning', 'finances', 'dashboard', 'enrollments')


def get_delegatable_permissions():
    """Return the QuerySet of permissions that admin can assign to a secrétaire."""
    return (
        Permission.objects
        .filter(content_type__app_label__in=DELEGATABLE_APPS)
        .select_related('content_type')
        .order_by('content_type__app_label', 'codename')
    )


# ---------------------------------------------------------------------------
# Core user viewsets
# ---------------------------------------------------------------------------

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [make_module_permission('users'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'username']

    def get_permissions(self):
        # Self-service endpoints only require an authenticated session.
        if self.action in ('me', 'update_me', 'change_password'):
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='me/update')
    def update_me(self, request):
        """Authenticated user updates their own profile (no password)."""
        serializer = UserSelfSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSelfSerializer(request.user).data)

    @action(detail=False, methods=['post'], url_path='me/change-password')
    def change_password(self, request):
        """Authenticated user changes their own password.

        Body: { "current_password": "...", "new_password": "..." }
        """
        current = request.data.get('current_password', '')
        new = request.data.get('new_password', '')
        if not current or not new:
            return Response(
                {'detail': 'current_password et new_password sont requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(current):
            return Response(
                {'current_password': ['Mot de passe actuel incorrect.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new, user=request.user)
        except DjangoPasswordValidationError as exc:
            return Response(
                {'new_password': list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(new)
        request.user.save()
        return Response({'detail': 'Mot de passe mis à jour.'})


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [make_module_permission('users'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'user__username', 'phone', 'parent_phone', 'address', 'age_group', 'status']

    @action(detail=True, methods=['get'], url_path='registration-form')
    def registration_form(self, request, pk=None):
        """A printable registration form immediately available after creation."""
        from .registration_pdf import build_registration_form

        student = self.get_object()
        filename = f"fiche-inscription-{student.id}.pdf"
        return FileResponse(build_registration_form(student), as_attachment=True, filename=filename)


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer
    permission_classes = [make_module_permission('users'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'user__username', 'speciality', 'phone', 'cin', 'status']


# ---------------------------------------------------------------------------
# Secrétaire management (admin only)
# ---------------------------------------------------------------------------

class SecretaireViewSet(viewsets.ModelViewSet):
    """
    CRUD for secrétaire accounts — admin only.

    GET    /api/users/secretaires/                              → list
    POST   /api/users/secretaires/                              → create
    GET    /api/users/secretaires/{id}/                         → detail
    PATCH  /api/users/secretaires/{id}/                         → update
    DELETE /api/users/secretaires/{id}/                         → delete
    GET    /api/users/secretaires/{id}/permissions/             → list perms
    POST   /api/users/secretaires/{id}/permissions/assign/      → add perms
    POST   /api/users/secretaires/{id}/permissions/revoke/      → remove perms
    POST   /api/users/secretaires/{id}/permissions/set/         → replace all perms
    """

    serializer_class = SecretaireSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'username']

    def get_queryset(self):
        return User.objects.filter(role=User.Role.SECRETAIRE).prefetch_related(
            'user_permissions__content_type'
        )

    @action(detail=True, methods=['get'], url_path='permissions')
    def list_permissions(self, request, pk=None):
        secretaire = self.get_object()
        perms = secretaire.user_permissions.select_related('content_type').all()
        return Response(PermissionSerializer(perms, many=True).data)

    @action(detail=True, methods=['post'], url_path='permissions/assign')
    def assign_permissions(self, request, pk=None):
        """Body: { "permission_ids": [1, 5, 12] }"""
        secretaire = self.get_object()
        ids = request.data.get('permission_ids', [])
        perms = get_delegatable_permissions().filter(id__in=ids)
        secretaire.user_permissions.add(*perms)
        return Response(
            PermissionSerializer(
                secretaire.user_permissions.select_related('content_type').all(), many=True
            ).data
        )

    @action(detail=True, methods=['post'], url_path='permissions/revoke')
    def revoke_permissions(self, request, pk=None):
        """Body: { "permission_ids": [1, 5] }"""
        secretaire = self.get_object()
        ids = request.data.get('permission_ids', [])
        perms = get_delegatable_permissions().filter(id__in=ids)
        secretaire.user_permissions.remove(*perms)
        return Response(
            PermissionSerializer(
                secretaire.user_permissions.select_related('content_type').all(), many=True
            ).data
        )

    @action(detail=True, methods=['post'], url_path='permissions/set')
    def set_permissions(self, request, pk=None):
        """Body: { "permission_ids": [1, 5, 12] }  — replaces ALL permissions."""
        secretaire = self.get_object()
        ids = request.data.get('permission_ids', [])
        perms = get_delegatable_permissions().filter(id__in=ids)
        secretaire.user_permissions.set(perms)
        return Response(
            PermissionSerializer(
                secretaire.user_permissions.select_related('content_type').all(), many=True
            ).data
        )


# ---------------------------------------------------------------------------
# Admin account management (admin only)
# ---------------------------------------------------------------------------

class AdminViewSet(viewsets.ModelViewSet):
    """
    CRUD for admin accounts — admin only.

    GET    /api/users/admins/                → list
    POST   /api/users/admins/                → create another admin
    GET    /api/users/admins/{id}/           → detail
    PATCH  /api/users/admins/{id}/           → update
    DELETE /api/users/admins/{id}/           → delete
    """

    serializer_class = AdminSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'username']

    def get_queryset(self):
        return User.objects.filter(role=User.Role.ADMIN)


# ---------------------------------------------------------------------------
# Available permissions catalogue (admin only)
# ---------------------------------------------------------------------------

class AvailablePermissionsView(APIView):
    """
    GET /api/users/available-permissions/
    Returns all delegatable permissions grouped by app label.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        perms = get_delegatable_permissions()
        grouped: dict = {}
        for perm in perms:
            app = perm.content_type.app_label
            if app not in grouped:
                grouped[app] = []
            grouped[app].append(PermissionSerializer(perm).data)
        return Response(grouped)
