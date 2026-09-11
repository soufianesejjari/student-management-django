"""Downloadable student registration form matching the academy paper form."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

from musical_academy.pdf_branding import (
    LIGHT_RED,
    MUTED_TEXT,
    PRIMARY_RED,
    academy_identity,
    academy_logo_path,
    draw_academy_footer,
    draw_academy_header,
)


def _value(value):
    return str(value) if value else "-"


def build_registration_form(student, page_label=None):
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
    left = 18 * mm
    right = width - left
    content_width = right - left
    identity = academy_identity(academy)

    draw_academy_header(pdf, identity, academy_logo_path())

    pdf.setFillColor(colors.HexColor('#202020'))
    pdf.setFont('Helvetica-Bold', 18)
    pdf.drawCentredString(width / 2, height - 45 * mm, "FICHE D'INSCRIPTION ÉLÈVE")
    pdf.setFillColor(MUTED_TEXT)
    pdf.setFont('Helvetica', 8.5)
    pdf.drawCentredString(width / 2, height - 51 * mm, f"ANNÉE SCOLAIRE {academic_year.name}")

    meta_y = height - 67 * mm
    pdf.setFillColor(LIGHT_RED)
    pdf.roundRect(left, meta_y, content_width, 10 * mm, 2 * mm, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor('#333333'))
    pdf.setFont('Helvetica-Bold', 9)
    pdf.drawString(left + 4 * mm, meta_y + 3.5 * mm, f"N° D'INSCRIPTION : {student.id:05d}")
    pdf.drawRightString(right - 4 * mm, meta_y + 3.5 * mm, f"DATE : {student.enrollment_date.strftime('%d / %m / %Y')}")

    def section_heading(text, y):
        pdf.setFillColor(PRIMARY_RED)
        pdf.rect(left, y - 1.5 * mm, 2 * mm, 6 * mm, fill=1, stroke=0)
        pdf.setFillColor(colors.HexColor('#252525'))
        pdf.setFont('Helvetica-Bold', 10.5)
        pdf.drawString(left + 5 * mm, y, text)
        pdf.setStrokeColor(colors.HexColor('#DDDDDD'))
        pdf.setLineWidth(0.5)
        pdf.line(left + 5 * mm, y - 2.5 * mm, right, y - 2.5 * mm)
        return y - 8 * mm

    def compact_field(x, y, field_width, label, value):
        field_height = 10 * mm
        pdf.setStrokeColor(colors.HexColor('#E4E4E4'))
        pdf.setFillColor(colors.white)
        pdf.roundRect(x, y - field_height, field_width, field_height, 1.5 * mm, fill=1, stroke=1)
        pdf.setFillColor(MUTED_TEXT)
        pdf.setFont('Helvetica-Bold', 7)
        pdf.drawString(x + 3 * mm, y - 3.3 * mm, label.upper())
        text = _value(value)
        font_size = 10
        while font_size > 7 and pdf.stringWidth(text, 'Helvetica', font_size) > field_width - 6 * mm:
            font_size -= 0.5
        pdf.setFillColor(colors.HexColor('#202020'))
        pdf.setFont('Helvetica', font_size)
        pdf.drawString(x + 3 * mm, y - 7.5 * mm, text)

    y = section_heading("INFORMATIONS DE L'ÉLÈVE", height - 78 * mm)
    gap = 4 * mm
    half = (content_width - gap) / 2
    compact_field(left, y, half, 'Nom', student.user.last_name)
    compact_field(left + half + gap, y, half, 'Prénom', student.user.first_name)
    y -= 13 * mm
    compact_field(left, y, half, 'Date de naissance', student.date_of_birth.strftime('%d / %m / %Y') if student.date_of_birth else None)
    compact_field(left + half + gap, y, half, 'Catégorie', student.age_group)
    y -= 13 * mm
    compact_field(left, y, half, 'Téléphone', student.phone)
    compact_field(left + half + gap, y, half, 'E-mail', student.user.email)
    y -= 13 * mm
    compact_field(left, y, content_width, 'Adresse', student.address)
    y -= 13 * mm
    school_or_profession_label = 'Profession' if student.age_group == 'Adulte' else 'École'
    compact_field(left, y, content_width, school_or_profession_label, student.school_or_profession)

    y = section_heading('PROGRAMME ET ENCADREMENT', y - 17 * mm)
    course_rows = [[
        Paragraph('<b>COURS</b>', ParagraphStyle('th1', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
        Paragraph('<b>PROFESSEUR</b>', ParagraphStyle('th2', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
        Paragraph('<b>HORAIRES</b>', ParagraphStyle('th3', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
        Paragraph('<b>TARIF</b>', ParagraphStyle('th4', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
    ]]
    cell_style = ParagraphStyle('registrationCell', fontName='Helvetica', fontSize=8.2, leading=10, textColor=colors.HexColor('#303030'))
    plan_labels = {'MONTHLY': 'Mensuel', 'QUARTERLY': 'Trimestriel', 'ANNUAL': 'Annuel'}
    for enrollment in courses:
        subject = enrollment.course.subject.name if enrollment.course.subject_id else enrollment.course.name
        teacher_names = []
        course_schedules = []
        sessions = enrollment.assigned_sessions.select_related(
            'teacher__user', 'room'
        ).order_by('day_of_week', 'start_time')
        for session in sessions:
            days = ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche')
            teacher_names.append(session.teacher.user.get_full_name() or session.teacher.user.username)
            course_schedules.append(f"{days[session.day_of_week]} {session.start_time.strftime('%H:%M')}-{session.end_time.strftime('%H:%M')}")
        has_course_sessions = enrollment.course.sessions.filter(academic_year=academic_year).exists()
        if not course_schedules and not has_course_sessions and enrollment.course.default_teacher_id:
            teacher_names.append(enrollment.course.default_teacher.user.get_full_name())
        plan = plan_labels.get(enrollment.billing_plan, enrollment.billing_plan)
        course_rows.append([
            Paragraph(f"<b>{subject}</b><br/>{enrollment.course.name}", cell_style),
            Paragraph(', '.join(dict.fromkeys(filter(None, teacher_names))) or 'À affecter', cell_style),
            Paragraph(
                '<br/>'.join(course_schedules)
                or ('À affecter' if has_course_sessions else 'À planifier'),
                cell_style,
            ),
            Paragraph(f"{enrollment.custom_price:.0f} DH/mois<br/>{plan}", cell_style),
        ])

    if len(course_rows) == 1:
        course_rows.append([
            Paragraph('Programme à définir', cell_style),
            Paragraph('-', cell_style),
            Paragraph('-', cell_style),
            Paragraph('-', cell_style),
        ])

    course_table = Table(course_rows, colWidths=[46 * mm, 40 * mm, 55 * mm, 33 * mm], repeatRows=1)
    course_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_RED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.45, colors.HexColor('#D8D8D8')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 3 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2.3 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.3 * mm),
    ]))
    _, table_height = course_table.wrapOn(pdf, content_width, 65 * mm)
    course_table.drawOn(pdf, left, y - table_height)
    y -= table_height + 7 * mm

    student_registration_fee = (
        student.fees
        .filter(academic_year=academic_year, fee_type='REGISTRATION')
        .only('amount')
        .first()
    )
    registration_fee = (
        student_registration_fee.amount
        if student_registration_fee
        else academy.default_registration_fee
    )
    pdf.setFillColor(LIGHT_RED)
    pdf.roundRect(left, y - 11 * mm, content_width, 11 * mm, 2 * mm, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor('#252525'))
    pdf.setFont('Helvetica-Bold', 9.5)
    pdf.drawString(left + 4 * mm, y - 6.8 * mm, "FRAIS D'INSCRIPTION")
    pdf.setFillColor(PRIMARY_RED)
    pdf.setFont('Helvetica-Bold', 12)
    pdf.drawRightString(right - 4 * mm, y - 7 * mm, f"{registration_fee:.0f} DH")

    draw_academy_footer(pdf, identity, page_label)
    pdf.save()
    buffer.seek(0)
    return buffer
