from django.core.mail import EmailMessage
from django.conf import settings


def send_schedule_email(to_email, name, pdf_buffer, filename, subject, body):
    """Send a schedule PDF as an email attachment."""
    from_email = settings.DEFAULT_FROM_EMAIL
    try:
        from academics.models import AcademySettings
        school_email = AcademySettings.get().school_email or from_email
    except Exception:
        school_email = from_email

    msg = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email,
        to=[to_email],
        reply_to=[school_email],
    )
    msg.attach(filename, pdf_buffer.getvalue(), 'application/pdf')
    msg.send()
