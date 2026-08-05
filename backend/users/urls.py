from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    StudentProfileViewSet,
    TeacherProfileViewSet,
    SecretaireViewSet,
    AdminViewSet,
    AvailablePermissionsView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'students', StudentProfileViewSet)
router.register(r'teachers', TeacherProfileViewSet)
router.register(r'secretaires', SecretaireViewSet, basename='secretaire')
router.register(r'admins', AdminViewSet, basename='admin')

urlpatterns = [
    path('', include(router.urls)),
    path('available-permissions/', AvailablePermissionsView.as_view(), name='available-permissions'),
]
