from django.urls import path
from .views import SendStudentSchedulesView, SendTeacherSchedulesView

urlpatterns = [
    path('students/send-schedule/', SendStudentSchedulesView.as_view(), name='send-student-schedules'),
    path('teachers/send-schedule/', SendTeacherSchedulesView.as_view(), name='send-teacher-schedules'),
]
