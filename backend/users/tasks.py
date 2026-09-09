"""Asynchronous TMA Connect synchronization tasks."""
from celery import shared_task

from users.tma_sync import RetryableTmaSyncError, send_student_to_tma


@shared_task(
    bind=True,
    name='users.tasks.sync_student_to_tma',
    autoretry_for=(RetryableTmaSyncError,),
    retry_backoff=True,
    retry_backoff_max=900,
    retry_jitter=True,
    max_retries=5,
)
def sync_student_to_tma_task(self, student_id):
    return send_student_to_tma(student_id)


@shared_task(bind=True, name='users.tasks.sync_course_students_to_tma')
def sync_course_students_to_tma_task(self, course_id):
    from academics.models import AcademicYear, Enrollment

    student_ids = list(
        Enrollment.objects
        .filter(
            course_id=course_id,
            academic_year=AcademicYear.get_active(),
            status='ACTIVE',
        )
        .values_list('student_id', flat=True)
        .distinct()
    )
    for student_id in student_ids:
        sync_student_to_tma_task.delay(student_id)
    return {'status': 'queued', 'students': len(student_ids), 'course_id': course_id}
