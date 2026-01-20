from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, CourseViewSet, EnrollmentViewSet

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'enrollments', EnrollmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
