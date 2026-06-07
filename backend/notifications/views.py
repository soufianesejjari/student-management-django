from rest_framework import views, status
from rest_framework.response import Response
from users.permissions import IsAdminUser


class SendStudentSchedulesView(views.APIView):
    """POST /api/notifications/students/send-schedule/
    Body (optional): { "ids": [1, 2, 3] }
    Omit "ids" to send to all active students.
    Returns: { "queued": N, "skipped": [...] }
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        from users.models import StudentProfile
        from notifications.tasks import send_student_schedule_email

        ids = request.data.get('ids')
        if ids is not None:
            students = StudentProfile.objects.filter(pk__in=ids).select_related('user')
        else:
            students = StudentProfile.objects.filter(status='ACTIVE').select_related('user')

        queued, skipped = 0, []
        for student in students:
            if not student.user.email:
                skipped.append({'id': student.id, 'reason': 'no_email'})
                continue
            send_student_schedule_email.delay(student.id)
            queued += 1

        return Response({'queued': queued, 'skipped': skipped}, status=status.HTTP_202_ACCEPTED)


class SendTeacherSchedulesView(views.APIView):
    """POST /api/notifications/teachers/send-schedule/
    Body (optional): { "ids": [1, 2, 3] }
    Omit "ids" to send to all active teachers.
    Returns: { "queued": N, "skipped": [...] }
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        from users.models import TeacherProfile
        from notifications.tasks import send_teacher_schedule_email

        ids = request.data.get('ids')
        if ids is not None:
            teachers = TeacherProfile.objects.filter(pk__in=ids).select_related('user')
        else:
            teachers = TeacherProfile.objects.filter(status='ACTIVE').select_related('user')

        queued, skipped = 0, []
        for teacher in teachers:
            if not teacher.user.email:
                skipped.append({'id': teacher.id, 'reason': 'no_email'})
                continue
            send_teacher_schedule_email.delay(teacher.id)
            queued += 1

        return Response({'queued': queued, 'skipped': skipped}, status=status.HTTP_202_ACCEPTED)
