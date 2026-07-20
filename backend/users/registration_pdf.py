"""Downloadable student registration form matching the academy paper form."""
from io import BytesIO

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def _value(value):
    return str(value) if value else "-"


def _wrapped_lines(text, max_chars=78):
    """Wrap at words so multiple subjects/timetables never leave the page."""
    words = str(text or '-').split()
    lines, line = [], ''
    for word in words:
        candidate = f'{line} {word}'.strip()
        if line and len(candidate) > max_chars:
            lines.append(line)
            line = word
        else:
            line = candidate
    return lines + [line] if line else ['-']


def build_registration_form(student):
    """Return a populated, printable A4 registration PDF for a student."""
    from academics.models import AcademySettings, AcademicYear

    academy = AcademySettings.get()
    academic_year = AcademicYear.get_active()
    courses = list(student.enrollments.filter(academic_year=academic_year, status='ACTIVE').select_related(
        'course__subject', 'course__default_teacher'
    ))

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    red = colors.HexColor('#D8262B')
    left = 20 * mm

    logo_path = settings.BASE_DIR / 'media' / 'logo.png'
    if logo_path.exists():
        pdf.drawImage(str(logo_path), left, height - 34 * mm, width=54 * mm, height=23 * mm, preserveAspectRatio=True, mask='auto')
    else:
        pdf.setFont('Helvetica-Bold', 18)
        pdf.setFillColor(red)
        pdf.drawString(left, height - 20 * mm, academy.school_name.upper())

    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(0.7)
    pdf.line(left, height - 37 * mm, width - left, height - 37 * mm)

    pdf.setFillColor(colors.black)
    pdf.setFont('Helvetica', 18)
    pdf.drawCentredString(width / 2, height - 61 * mm, "FICHE D'INSCRIPTION")
    pdf.drawCentredString(width / 2, height - 70 * mm, "ÉLÈVE")

    right_x = 105 * mm
    pdf.setFont('Helvetica', 11.5)
    pdf.drawString(right_x, height - 91 * mm, f"N° d'inscription : {student.id:05d}")
    pdf.drawString(right_x, height - 99 * mm, f"Date d'inscription : {student.enrollment_date.strftime('%d / %m / %Y')}")

    def heading(text, y):
        pdf.setFont('Helvetica-Bold', 11.5)
        pdf.drawString(left + 10 * mm, y, text)
        return y - 11 * mm

    def field(label, value, y, max_chars=74):
        pdf.setFont('Helvetica', 11.5)
        lines = _wrapped_lines(_value(value), max_chars)
        pdf.drawString(left + 10 * mm, y, f"{label} : {lines[0]}")
        for line in lines[1:]:
            y -= 6 * mm
            pdf.drawString(left + 29 * mm, y, line)
        return y - 7.5 * mm

    y = heading("INFORMATIONS DE L'ÉLÈVE", height - 129 * mm)
    y = field('Nom', student.user.last_name, y)
    y = field('Prénom', student.user.first_name, y)
    y = field('Date de naissance', student.date_of_birth.strftime('%d / %m / %Y') if student.date_of_birth else None, y)
    y = field('Téléphone', student.phone, y)
    y = field('E-mail', student.user.email, y)
    y = field('Adresse', student.address, y)
    y = field('École', student.parent_name, y)
    y = field('Classe', student.age_group, y)

    y -= 4 * mm
    y = heading('PROGRAMME CHOISI', y)
    program_lines = []
    teacher_names = []
    schedules = []
    for enrollment in courses:
        subject = enrollment.course.subject.name if enrollment.course.subject_id else enrollment.course.name
        program_lines.append(f"[ ] {subject} - {enrollment.course.name}")
        course_schedules = []
        sessions = enrollment.course.sessions.filter(academic_year=academic_year).select_related('teacher__user').order_by('day_of_week', 'start_time')
        for session in sessions:
            days = ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche')
            teacher_names.append(session.teacher.user.get_full_name() or session.teacher.user.username)
            course_schedules.append(f"{days[session.day_of_week]} {session.start_time.strftime('%H:%M')}-{session.end_time.strftime('%H:%M')}")
        if not course_schedules and enrollment.course.default_teacher_id:
            teacher_names.append(enrollment.course.default_teacher.user.get_full_name())
        if course_schedules:
            schedules.append(f"{enrollment.course.name} : {', '.join(course_schedules)}")

    pdf.setFont('Helvetica', 11.5)
    for line in program_lines or ['[ ] Programme à définir']:
        for wrapped in _wrapped_lines(line, 76):
            pdf.drawString(left + 10 * mm, y, wrapped)
            y -= 6.5 * mm
    y -= 4 * mm
    y = field('Professeur(s)', ', '.join(dict.fromkeys(filter(None, teacher_names))), y)
    y = field('Horaire(s) des cours', ' | '.join(dict.fromkeys(schedules)), y, max_chars=66)

    pdf.setFont('Helvetica-Bold', 11.5)
    registration_fee = academy.default_registration_fee
    pdf.drawString(left + 10 * mm, y - 3 * mm, f"Frais d'inscription : {registration_fee:.0f} DH")

    pdf.setStrokeColor(red)
    pdf.setLineWidth(2)
    pdf.line(left, 27 * mm, width - left, 27 * mm)
    pdf.setFillColor(colors.black)
    pdf.setFont('Helvetica-Bold', 10.5)
    pdf.drawCentredString(width / 2, 20 * mm, academy.school_name.upper())
    pdf.setFont('Helvetica', 9.5)
    pdf.drawCentredString(width / 2, 14 * mm, academy.school_address)
    pdf.drawCentredString(width / 2, 8 * mm, f"TEL: {academy.school_phone}       Mail: {academy.school_email}")
    pdf.save()
    buffer.seek(0)
    return buffer
