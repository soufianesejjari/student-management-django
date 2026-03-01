"""
Custom JWT token serializer that embeds role & permissions into token claims.
This lets the frontend know the user's role and permissions without an extra API call.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT payload with:
      - role       : 'admin' | 'secretaire'
      - is_admin   : bool
      - username   : str
      - full_name  : str
      - email      : str
      - permissions: list[str]  ('*' for admins who bypass all checks)
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['role'] = user.role
        token['is_admin'] = user.is_admin or user.is_superuser
        token['username'] = user.username
        token['email'] = user.email
        token['full_name'] = f"{user.first_name} {user.last_name}".strip() or user.username

        if user.is_admin or user.is_superuser:
            # Admins bypass all permission checks
            token['permissions'] = ['*']
        else:
            # Collect all permissions from groups + direct user permissions
            token['permissions'] = sorted(user.get_all_permissions())

        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
