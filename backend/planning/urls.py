from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoomViewSet, ClassSessionViewSet, AvailabilityCheckView, SmartSchedulingView

router = DefaultRouter()
router.register(r'rooms', RoomViewSet)
router.register(r'sessions', ClassSessionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('check-availability/', AvailabilityCheckView.as_view(), name='check-availability'),
    path('suggest-slots/', SmartSchedulingView.as_view(), name='suggest-slots'),
]
