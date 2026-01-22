"""
URL configuration for enrollments app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnrollmentViewSet, SubscriptionViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]
