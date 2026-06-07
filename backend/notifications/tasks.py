"""Celery tasks for sending schedule emails."""
from smtplib import SMTPException
from datetime import date, timedelta

from celery import shared_task


def _current_week():
    today = date.today()
    start = today - timedelta(days=today.weekday())
    return start, start + timedelta(days=6)


@shared_task(
    bind=True,
    name='notifications.tasks.send_student_schedule_email',
    autoretry_for=(SMTPException,),
    retry_backoff=True,
    max_retries=3,
)
def send_student_schedule_email(self, student_id):
    from users.models import StudentProfile
    from planning.services import build_student_schedule_pdf_data
    from planning.pdf_service import PDFReportGenerator
    from notifications.email_service import send_schedule_email

    try:
        student = StudentProfile.objects.select_related('user').get(pk=student_id)
    except StudentProfile.DoesNotExist:
        return {'status': 'skipped', 'reason': 'not_found', 'student_id': student_id}

    email = student.user.email
    if not email:
        return {'status': 'skipped', 'reason': 'no_email', 'student_id': student_id}

    start_date, end_date = _current_week()
    student_data, enrollments_data = build_student_schedule_pdf_data(student, start_date, end_date)

    pdf_buffer = PDFReportGenerator().generate_student_schedule(
        student_data, enrollments_data, start_date, end_date
    )

    name = student_data['name']
    week_label = f"{start_date.strftime('%d/%m/%Y')} – {end_date.strftime('%d/%m/%Y')}"
    send_schedule_email(
        to_email=email,
        name=name,
        pdf_buffer=pdf_buffer,
        filename=f"schedule_{student.user.username}_{start_date}.pdf",
        subject=f"Your schedule – {week_label}",
        body=(
            f"Dear {name},\n\n"
            f"Please find attached your schedule for the week of {week_label}.\n\n"
            "The Musical Academy"
        ),
    )
    return {'status': 'sent', 'student_id': student_id, 'email': email}


@shared_task(
    bind=True,
    name='notifications.tasks.send_teacher_schedule_email',
    autoretry_for=(SMTPException,),
    retry_backoff=True,
    max_retries=3,
)
def send_teacher_schedule_email(self, teacher_id):
    from users.models import TeacherProfile
    from planning.services import build_teacher_schedule_pdf_data
    from planning.pdf_service import PDFReportGenerator
    from notifications.email_service import send_schedule_email

    try:
        teacher = TeacherProfile.objects.select_related('user').get(pk=teacher_id)
    except TeacherProfile.DoesNotExist:
        return {'status': 'skipped', 'reason': 'not_found', 'teacher_id': teacher_id}

    email = teacher.user.email
    if not email:
        return {'status': 'skipped', 'reason': 'no_email', 'teacher_id': teacher_id}

    start_date, end_date = _current_week()
    teacher_data, sessions_data = build_teacher_schedule_pdf_data(teacher, start_date, end_date)

    pdf_buffer = PDFReportGenerator().generate_teacher_schedule(
        teacher_data, sessions_data, start_date, end_date
    )

    name = teacher_data['name']
    week_label = f"{start_date.strftime('%d/%m/%Y')} – {end_date.strftime('%d/%m/%Y')}"
    send_schedule_email(
        to_email=email,
        name=name,
        pdf_buffer=pdf_buffer,
        filename=f"schedule_{teacher.user.username}_{start_date}.pdf",
        subject=f"Your schedule – {week_label}",
        body=(
            f"Dear {name},\n\n"
            f"Please find attached your schedule for the week of {week_label}.\n\n"
            "The Musical Academy"
        ),
    )
    return {'status': 'sent', 'teacher_id': teacher_id, 'email': email}
