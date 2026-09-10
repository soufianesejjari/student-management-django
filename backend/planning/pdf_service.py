# PDF Report Generation Service
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import Flowable, SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime, timedelta
from calendar import monthrange
import os

from musical_academy.pdf_branding import draw_academy_footer, draw_academy_header

# Academy identity constants
ACADEMY_NAME = "The Musical Academy"
ACADEMY_PHONE = "+212 695-969711"
ACADEMY_EMAIL = "contact@themusicalacademy.net"
ACADEMY_ADDRESS = "à coté du café LE CAVALLI, Av. Taha Houcine, Fès 30050"
ACADEMY_PRIMARY_COLOR = colors.HexColor('#B91C1C')
ACADEMY_PRIMARY_LIGHT = colors.HexColor('#FEE2E2')


class WeeklyScheduleGrid(Flowable):
    """Hourly grid with course blocks positioned at their exact minute."""

    days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

    def __init__(self, sessions, width=174*mm, start_hour=8, end_hour=21, hour_height=10*mm):
        super().__init__()
        self.sessions = sessions
        self.width = width
        self.start_hour = start_hour
        self.end_hour = end_hour
        self.hour_height = hour_height
        self.header_height = 8 * mm
        self.time_column_width = 14 * mm
        self.day_width = (self.width - self.time_column_width) / 7
        self.body_height = (self.end_hour - self.start_hour) * self.hour_height
        self.height = self.body_height + self.header_height

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    @staticmethod
    def _minutes(value):
        hour, minute = str(value)[:5].split(':')
        return int(hour) * 60 + int(minute)

    def session_box(self, session):
        """Return exact x/y/width/height for a session, useful for QA too."""
        grid_start = self.start_hour * 60
        grid_end = self.end_hour * 60
        start = max(self._minutes(session['start_time']), grid_start)
        end = min(self._minutes(session['end_time']), grid_end)
        if end <= start or not 0 <= int(session['day_of_week']) <= 6:
            return None

        top = self.body_height - ((start - grid_start) / 60) * self.hour_height
        bottom = self.body_height - ((end - grid_start) / 60) * self.hour_height
        padding = 1.1
        x = self.time_column_width + int(session['day_of_week']) * self.day_width + padding
        return x, bottom, self.day_width - 2 * padding, top - bottom

    @staticmethod
    def _fit_text(pdf, text, max_width, font_name, preferred_size, minimum_size=4.5):
        text = str(text or '-')
        size = preferred_size
        while size > minimum_size and pdf.stringWidth(text, font_name, size) > max_width:
            size -= 0.25
        if pdf.stringWidth(text, font_name, size) <= max_width:
            return text, size

        shortened = text
        while shortened and pdf.stringWidth(f'{shortened}...', font_name, size) > max_width:
            shortened = shortened[:-1]
        return f'{shortened}...', size

    def _draw_block_text(self, pdf, session, x, y, width, height):
        course = session.get('course_name') or session.get('course') or '-'
        room = session.get('room_name') or session.get('room') or '-'
        time_range = f"{str(session['start_time'])[:5]} - {str(session['end_time'])[:5]}"
        center_x = x + width / 2

        course, course_size = self._fit_text(pdf, course, width - 4, 'Helvetica-Bold', 6.2)
        room, room_size = self._fit_text(pdf, room, width - 4, 'Helvetica', 5.3)
        time_range, time_size = self._fit_text(pdf, time_range, width - 4, 'Helvetica', 5.1)

        pdf.setFillColor(colors.HexColor('#611014'))
        if height >= 24:
            pdf.setFont('Helvetica-Bold', course_size)
            pdf.drawCentredString(center_x, y + height - 9, course)
            pdf.setFont('Helvetica', room_size)
            pdf.drawCentredString(center_x, y + height - 17, room)
            pdf.setFont('Helvetica', time_size)
            pdf.drawCentredString(center_x, y + 4, time_range)
        elif height >= 14:
            pdf.setFont('Helvetica-Bold', course_size)
            pdf.drawCentredString(center_x, y + height - 8, course)
            pdf.setFont('Helvetica', time_size)
            pdf.drawCentredString(center_x, y + 3, time_range)
        else:
            pdf.setFont('Helvetica-Bold', course_size)
            pdf.drawCentredString(center_x, y + max((height - course_size) / 2, 1.5), course)

    def draw(self):
        pdf = self.canv
        pdf.saveState()

        pdf.setFillColor(colors.white)
        pdf.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        pdf.setFillColor(ACADEMY_PRIMARY_COLOR)
        pdf.rect(0, self.body_height, self.width, self.header_height, fill=1, stroke=0)
        pdf.setFillColor(colors.HexColor('#F3F3F3'))
        pdf.rect(0, 0, self.time_column_width, self.body_height, fill=1, stroke=0)

        pdf.setStrokeColor(colors.HexColor('#B8B8B8'))
        pdf.setLineWidth(0.45)
        for column in range(9):
            if column == 0:
                x = 0
            elif column == 1:
                x = self.time_column_width
            else:
                x = self.time_column_width + (column - 1) * self.day_width
            pdf.line(x, 0, x, self.height)
        pdf.line(self.width, 0, self.width, self.height)

        for index in range(self.end_hour - self.start_hour + 1):
            y = self.body_height - index * self.hour_height
            pdf.line(0, y, self.width, y)

        pdf.setFillColor(colors.white)
        pdf.setFont('Helvetica-Bold', 7)
        pdf.drawCentredString(self.time_column_width / 2, self.body_height + 2.7*mm, 'Heure')
        for day_index, day in enumerate(self.days):
            center_x = self.time_column_width + (day_index + 0.5) * self.day_width
            pdf.drawCentredString(center_x, self.body_height + 2.7*mm, day)

        pdf.setFillColor(colors.HexColor('#202020'))
        pdf.setFont('Helvetica', 6.5)
        for index, hour in enumerate(range(self.start_hour, self.end_hour)):
            center_y = self.body_height - (index + 0.5) * self.hour_height - 2.2
            pdf.drawCentredString(self.time_column_width / 2, center_y, f'{hour:02d}:00')

        for session in sorted(self.sessions, key=lambda item: (item['day_of_week'], item['start_time'])):
            box = self.session_box(session)
            if not box:
                continue
            x, y, block_width, block_height = box
            pdf.setFillColor(colors.HexColor('#FADBDD'))
            pdf.setStrokeColor(ACADEMY_PRIMARY_COLOR)
            pdf.setLineWidth(0.8)
            pdf.roundRect(x, y, block_width, block_height, 2, fill=1, stroke=1)
            self._draw_block_text(pdf, session, x, y, block_width, block_height)

        pdf.restoreState()

class PDFReportGenerator:
    """Service for generating PDF reports"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=TA_CENTER
        )
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12
        )
        self.footer_style = ParagraphStyle(
            'CustomFooter',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#888888'),
            alignment=TA_CENTER
        )
        self.logo_path = self._find_logo_path()
        self.academy = self._load_academy_identity()

    def _load_academy_identity(self):
        try:
            from academics.models import AcademySettings
            settings = AcademySettings.get()
            return {
                'name': settings.school_name or ACADEMY_NAME,
                'phone': settings.school_phone or ACADEMY_PHONE,
                'email': settings.school_email or ACADEMY_EMAIL,
                'address': settings.school_address or ACADEMY_ADDRESS,
            }
        except Exception:
            return {
                'name': ACADEMY_NAME,
                'phone': ACADEMY_PHONE,
                'email': ACADEMY_EMAIL,
                'address': ACADEMY_ADDRESS,
            }
    
    def _find_logo_path(self):
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '..', 'media', 'logo.png'),
            os.path.join(os.path.dirname(__file__), 'media', 'logo.png'),
            '/app/backend/media/logo.png',
            'backend/media/logo.png',
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return path
        return None

    def _add_header(self, story):
        """Add logo + academy name header to story"""
        if self.logo_path:
            try:
                logo = Image(self.logo_path, width=1.5*inch, height=0.75*inch, kind='proportional')
                story.append(logo)
                story.append(Spacer(1, 6))
            except:
                pass
        academy_header = Paragraph(
            f"<b>{self.academy['name']}</b>", 
            ParagraphStyle('AcademyHeader', parent=self.styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=ACADEMY_PRIMARY_COLOR)
        )
        story.append(academy_header)
        contact_line = Paragraph(
            f"{self.academy['phone']} | {self.academy['email']}<br/>{self.academy['address']}",
            ParagraphStyle('AcademyContact', parent=self.styles['Normal'], fontSize=7, alignment=TA_CENTER, textColor=colors.HexColor('#666666'))
        )
        story.append(contact_line)
        story.append(Spacer(1, 16))

    def generate_teacher_payment_report(self, teacher_data, sessions_data):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, 
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=50)
        
        story = []
        self._add_header(story)
        
        title = Paragraph(f"Rapport de Paiement - {sessions_data['month']}", self.title_style)
        story.append(title)
        story.append(Spacer(1, 12))
        payroll = sessions_data.get('payroll') or {}
        expense_ref = payroll.get('expense_id') or 'Non générée'
        expense_status = payroll.get('expense_status') or 'N/A'
        
        teacher_info = f"""
        <para align=left>
        <b>Professeur :</b> {teacher_data['name']}<br/>
        <b>Taux Horaire :</b> {teacher_data['hourly_rate']:.2f} MAD/heure<br/>
        <b>Dépense salaire :</b> {expense_ref}<br/>
        <b>Statut dépense :</b> {expense_status}<br/>
        <b>Date du Rapport :</b> {datetime.now().strftime('%d-%m-%Y')}
        </para>
        """
        story.append(Paragraph(teacher_info, self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        story.append(Paragraph("Résumé Mensuel", self.heading_style))
        summary = sessions_data['summary']
        
        summary_data = [
            ['Métrique', 'Valeur'],
            ['Total des Séances Planifiées', str(summary['total_sessions'])],
            ['Séances Annulées', str(summary['cancelled_sessions'])],
            ['Absences du Professeur', str(summary['absent_sessions'])],
            ['Total Heures Planifiées', f"{summary['total_hours']:.1f}h"],
            ['Heures Travaillées', f"{summary['worked_hours']:.1f}h"],
            ['Taux Horaire', f"{teacher_data['hourly_rate']:.2f} MAD/h"],
            ['Total Paiement Dû', f"{summary['total_expense']:.2f} MAD"]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ACADEMY_PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), ACADEMY_PRIMARY_LIGHT),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        story.append(Paragraph("Détail des Séances", self.heading_style))
        
        session_data = [['Date', 'Cours', 'Heure', 'Heures', 'Statut', 'Montant']]
        
        for session in sessions_data['occurrences']:
            if session['is_cancelled']:
                status = 'Annulé'
            elif session['teacher_is_absent']:
                status = 'Absent'
            else:
                status = 'Présent'
            amount = 0 if (session['is_cancelled'] or session['teacher_is_absent']) else session['duration_hours'] * session['hourly_rate']
            
            session_data.append([
                session['date'],
                session['course'],
                f"{session['start_time'][:5]} - {session['end_time'][:5]}",
                f"{session['duration_hours']:.1f}h",
                status,
                f"{amount:.2f} MAD"
            ])
        
        sessions_table = Table(session_data, colWidths=[1*inch, 1.8*inch, 1.2*inch, 0.7*inch, 0.8*inch, 0.8*inch])
        sessions_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ACADEMY_PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        
        story.append(sessions_table)
        
        doc.build(story, onFirstPage=self._add_footer, onLaterPages=self._add_footer)
        buffer.seek(0)
        return buffer
    
    def generate_teacher_schedule(self, teacher_data, sessions_data, start_date, end_date):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                               rightMargin=15*mm, leftMargin=15*mm,
                               topMargin=18*mm, bottomMargin=18*mm)
        
        story = []
        self._add_header(story)
        
        title_text = f"Emploi du Temps : {teacher_data['name']}"
        title = Paragraph(title_text, self.title_style)
        story.append(title)
        
        subtitle = Paragraph(f"{start_date.strftime('%d-%m-%Y')} - {end_date.strftime('%d-%m-%Y')}", 
                            self.styles['Normal'])
        story.append(subtitle)
        story.append(Spacer(1, 20))
        
        story.append(WeeklyScheduleGrid(sessions_data['occurrences'], width=178.9*mm))
        
        doc.build(story, onFirstPage=self._add_footer, onLaterPages=self._add_footer)
        buffer.seek(0)
        return buffer
    
    def generate_student_schedule(self, student_data, enrollments_data, start_date, end_date, page_label=None):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                               rightMargin=18*mm, leftMargin=18*mm,
                               topMargin=42*mm, bottomMargin=25*mm)
        
        story = []

        title_style = ParagraphStyle(
            'StudentScheduleTitle',
            parent=self.title_style,
            fontSize=18,
            leading=21,
            textColor=colors.HexColor('#202020'),
            spaceAfter=5,
        )
        section_style = ParagraphStyle(
            'StudentScheduleSection',
            parent=self.heading_style,
            fontSize=10.5,
            leading=13,
            textColor=ACADEMY_PRIMARY_COLOR,
            spaceBefore=8,
            spaceAfter=6,
        )
        cell_style = ParagraphStyle(
            'StudentScheduleCell',
            parent=self.styles['Normal'],
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor('#303030'),
        )
        title = Paragraph("PLANNING DE L'ÉLÈVE", title_style)
        story.append(title)

        info_data = [[
            Paragraph(f"<b>ÉLÈVE</b><br/>{student_data['name']}", cell_style),
            Paragraph(f"<b>PÉRIODE</b><br/>{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}", cell_style),
        ]]
        info_table = Table(info_data, colWidths=[87*mm, 87*mm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FCEDEE')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E8C8CA')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E8C8CA')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 9),
            ('RIGHTPADDING', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ]))
        story.append(info_table)
        story.append(Paragraph("COURS ET HORAIRES", section_style))
        
        courses_data = [[
            Paragraph('<b>COURS</b>', ParagraphStyle('scheduleTh1', parent=cell_style, textColor=colors.white)),
            Paragraph('<b>PROFESSEUR</b>', ParagraphStyle('scheduleTh2', parent=cell_style, textColor=colors.white)),
            Paragraph('<b>JOURS ET HEURES</b>', ParagraphStyle('scheduleTh3', parent=cell_style, textColor=colors.white)),
        ]]
        
        for enrollment in enrollments_data:
            course_schedule = []
            for session in enrollment['sessions']:
                days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
                day_name = days[session['day_of_week']]
                course_schedule.append(f"{day_name} {session['start_time'][:5]}-{session['end_time'][:5]}")
            
            courses_data.append([
                Paragraph(enrollment['course_name'], cell_style),
                Paragraph(enrollment['teacher_name'], cell_style),
                Paragraph('<br/>'.join(course_schedule), cell_style),
            ])

        if len(courses_data) == 1:
            courses_data.append([
                Paragraph('Aucun cours planifié pour cette période', cell_style),
                Paragraph('-', cell_style),
                Paragraph('-', cell_style),
            ])
        
        courses_table = Table(courses_data, colWidths=[53*mm, 50*mm, 71*mm], repeatRows=1)
        courses_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ACADEMY_PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.45, colors.HexColor('#D8D8D8')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        story.append(courses_table)
        story.append(Paragraph("EMPLOI DU TEMPS HEBDOMADAIRE", section_style))
        
        all_sessions = []
        for enrollment in enrollments_data:
            for session in enrollment['sessions']:
                all_sessions.append({
                    **session,
                    'course_name': enrollment['course_name']
                })

        story.append(WeeklyScheduleGrid(all_sessions, width=174*mm))

        def add_student_page_branding(pdf_canvas, _doc):
            draw_academy_header(pdf_canvas, self.academy, self.logo_path)
            draw_academy_footer(pdf_canvas, self.academy, page_label)

        doc.build(story, onFirstPage=add_student_page_branding, onLaterPages=add_student_page_branding)
        buffer.seek(0)
        return buffer

    def _add_footer(self, canvas, doc):
        """Draw footer on every page with academy contact info"""
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(colors.HexColor('#888888'))
        page_width = A4[0]
        y = 35
        line1 = f"{ACADEMY_NAME} | {ACADEMY_PHONE} | {ACADEMY_EMAIL}"
        line2 = ACADEMY_ADDRESS
        canvas.drawCentredString(page_width / 2, y, line1)
        canvas.drawCentredString(page_width / 2, y - 10, line2)
        canvas.restoreState()
