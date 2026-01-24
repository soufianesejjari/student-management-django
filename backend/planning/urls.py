from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoomViewSet, 
    ClassSessionViewSet, 
    AvailabilityCheckView, 
    SmartSchedulingView, 
    TeacherSessionsView,
    TeacherPaymentReportView,
    TeacherSchedulePDFView,
    StudentSchedulePDFView
)

router = DefaultRouter()
router.register(r'rooms', RoomViewSet)
router.register(r'sessions', ClassSessionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('check-availability/', AvailabilityCheckView.as_view(), name='check-availability'),
    path('suggest-slots/', SmartSchedulingView.as_view(), name='suggest-slots'),
    path('teacher/<int:teacher_id>/sessions/', TeacherSessionsView.as_view(), name='teacher-sessions'),
    path('teacher/<int:teacher_id>/payment-report/', TeacherPaymentReportView.as_view(), name='teacher-payment-report'),
    path('teacher/<int:teacher_id>/schedule-pdf/', TeacherSchedulePDFView.as_view(), name='teacher-schedule-pdf'),
    path('student/<int:pk>/schedule-pdf/', StudentSchedulePDFView.as_view(), name='student-schedule-pdf'),
]
