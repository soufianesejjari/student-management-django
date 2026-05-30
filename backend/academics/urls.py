from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AcademicYearViewSet, SubjectViewSet, CourseViewSet, EnrollmentViewSet, SubscriptionViewSet, StudentFeeViewSet, CourseOfferSettingsViewSet

router = DefaultRouter()
router.register(r'academic-years', AcademicYearViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'enrollments', EnrollmentViewSet)
router.register(r'subscriptions', SubscriptionViewSet)
router.register(r'student-fees', StudentFeeViewSet)
router.register(r'offer-settings', CourseOfferSettingsViewSet, basename='offer-settings')

urlpatterns = [
    path('', include(router.urls)),
]
