"""Small, best-effort integration with TMA Connect."""
import logging

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone


logger = logging.getLogger(__name__)

DAYS_FR = {
    0: 'Lundi',
    1: 'Mardi',
    2: 'Mercredi',
    3: 'Jeudi',
    4: 'Vendredi',
    5: 'Samedi',
    6: 'Dimanche',
}

PAYMENT_STATUS_MAP = {
    'PAID': 'paye',
    'PENDING': 'en_attente',
    'OVERDUE': 'en_retard',
    'NONE': 'a_venir',
}


class RetryableTmaSyncError(Exception):
    """Temporary TMA Connect error that Celery should retry."""


def _unique_text(values):
    return ' · '.join(dict.fromkeys(value for value in values if value))


def _age(date_of_birth, today):
    if not date_of_birth:
        return None
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )


def build_student_payload(student_id):
    """Build the simple payload supported by the current TMA Connect API."""
    from academics.models import AcademicYear
    from academics.services import BillingService
    from planning.models import ClassSession
    from users.models import StudentProfile

    student = StudentProfile.objects.select_related('user').get(pk=student_id)
    academic_year = AcademicYear.get_active()
    today = timezone.localdate()
    enrollments = list(
        student.enrollments
        .filter(status='ACTIVE', academic_year=academic_year)
        .select_related('course__subject', 'course__default_teacher__user')
        .order_by('course__name')
    )
    sessions = list(
        ClassSession.objects
        .filter(student_enrollments__in=enrollments, academic_year=academic_year)
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
        .select_related('teacher__user', 'room', 'course')
        .order_by('day_of_week', 'start_time')
        .distinct()
    ) if enrollments else []

    full_name = student.user.get_full_name().strip() or student.user.username
    payment_summary = BillingService.student_payment_summary(
        student,
        academic_year=academic_year,
        today=today,
        sync=False,
    )

    payload = {
        'external_id': str(student.pk),
        'nom': full_name,
        'inscription_statut': PAYMENT_STATUS_MAP.get(
            payment_summary['status'],
            'en_attente',
        ),
        # An empty list intentionally clears obsolete slots in Connect.
        'creneaux': [
            {
                'jour': DAYS_FR.get(session.day_of_week, str(session.day_of_week)),
                'heure': session.start_time.strftime('%Hh%M'),
            }
            for session in sessions
        ],
    }

    optional = {
        'age': _age(student.date_of_birth, today),
        'programme': _unique_text(
            enrollment.course.name for enrollment in enrollments
        ),
        'formule': _unique_text(
            {
                'MONTHLY': 'Mensuel',
                'QUARTERLY': 'Trimestriel',
                'ANNUAL': 'Annuel',
            }.get(enrollment.billing_plan, enrollment.billing_plan)
            for enrollment in enrollments
        ),
        'tarif': _unique_text(
            f"{enrollment.course.name}: {enrollment.custom_price} DH"
            for enrollment in enrollments
        ),
        'salle': _unique_text(session.room.name for session in sessions),
        'prof': _unique_text(
            session.teacher.user.get_full_name().strip()
            or session.teacher.user.username
            for session in sessions
        ),
        'groupe': _unique_text(session.course.name for session in sessions),
        'parent_nom': student.parent_name,
        # The current project stores one email on the student's internal user.
        'parent_email': student.user.email,
    }
    payload.update({key: value for key, value in optional.items() if value not in (None, '')})
    return payload


def send_student_to_tma(student_id):
    """Send one student. Only temporary failures are raised for retry."""
    from users.models import StudentProfile

    if not settings.TMA_SYNC_ENABLED or not settings.SYNC_API_KEY:
        return {'status': 'disabled', 'student_id': student_id}

    try:
        payload = build_student_payload(student_id)
    except StudentProfile.DoesNotExist:
        return {'status': 'skipped', 'reason': 'student_not_found', 'student_id': student_id}

    try:
        response = requests.post(
            settings.TMA_SYNC_API_URL,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'x-tma-sync-key': settings.SYNC_API_KEY,
            },
            timeout=(settings.TMA_SYNC_CONNECT_TIMEOUT, settings.TMA_SYNC_READ_TIMEOUT),
        )
    except requests.RequestException as exc:
        raise RetryableTmaSyncError(str(exc)) from exc

    if response.status_code == 429 or response.status_code >= 500:
        raise RetryableTmaSyncError(f'TMA Connect returned HTTP {response.status_code}')

    if response.status_code >= 400:
        logger.warning(
            'TMA Connect rejected student %s with HTTP %s',
            student_id,
            response.status_code,
        )
        return {
            'status': 'rejected',
            'student_id': student_id,
            'http_status': response.status_code,
        }

    # Never persist or log the response because it may contain parent_password.
    return {
        'status': 'sent',
        'student_id': student_id,
        'http_status': response.status_code,
    }


def _safe_delay(task, *args):
    try:
        task.delay(*args)
    except Exception:
        # A broker outage must never break the app's normal save operation.
        logger.exception('Could not queue TMA Connect synchronization')


def schedule_student_sync(student_id):
    """Queue after database commit and never fail the business operation."""
    if not settings.TMA_SYNC_ENABLED or not settings.SYNC_API_KEY or not student_id:
        return
    from users.tasks import sync_student_to_tma_task

    transaction.on_commit(lambda: _safe_delay(sync_student_to_tma_task, student_id))


def schedule_course_students_sync(course_id):
    """Queue one fan-out task when a course or its schedule changes."""
    if not settings.TMA_SYNC_ENABLED or not settings.SYNC_API_KEY or not course_id:
        return
    from users.tasks import sync_course_students_to_tma_task

    transaction.on_commit(lambda: _safe_delay(sync_course_students_to_tma_task, course_id))
