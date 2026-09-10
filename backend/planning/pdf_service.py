# PDF Report Generation Service
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
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
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=50)
        
        story = []
        self._add_header(story)
        
        title_text = f"Emploi du Temps : {teacher_data['name']}"
        title = Paragraph(title_text, self.title_style)
        story.append(title)
        
        subtitle = Paragraph(f"{start_date.strftime('%d-%m-%Y')} - {end_date.strftime('%d-%m-%Y')}", 
                            self.styles['Normal'])
        story.append(subtitle)
        story.append(Spacer(1, 20))
        
        days_of_week = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        schedule_data = [['Heure'] + days_of_week]
        
        time_slots = []
        for hour in range(8, 21):
            time_slots.append(f"{hour:02d}:00")
        
        for time_slot in time_slots:
            row = [time_slot]
            for day_idx in range(7):
                day_sessions = [s for s in sessions_data['occurrences'] 
                               if s['day_of_week'] == day_idx and 
                               s['start_time'][:5] <= time_slot < s['end_time'][:5]]
                
                if day_sessions:
                    cell_text = '\n'.join([f"{s['course']}\n{s['room']}" for s in day_sessions])
                    row.append(cell_text)
                else:
                    row.append('')
            
            schedule_data.append(row)
        
        schedule_table = Table(schedule_data, colWidths=[0.8*inch] + [0.9*inch]*7)
        schedule_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ACADEMY_PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 1), (0, -1), colors.lightgrey),
        ]))
        
        story.append(schedule_table)
        
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
        timetable_style = ParagraphStyle(
            'StudentTimetableCell',
            parent=cell_style,
            fontSize=6.3,
            leading=7.2,
            alignment=TA_CENTER,
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
        
        days_of_week = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        schedule_data = [['Heure'] + days_of_week]
        
        time_slots = []
        for hour in range(8, 21):
            time_slots.append(f"{hour:02d}:00")
        
        all_sessions = []
        for enrollment in enrollments_data:
            for session in enrollment['sessions']:
                all_sessions.append({
                    **session,
                    'course_name': enrollment['course_name']
                })
        
        for time_slot in time_slots:
            row = [time_slot]
            for day_idx in range(7):
                day_sessions = [s for s in all_sessions 
                               if s['day_of_week'] == day_idx and 
                               s['start_time'][:5] <= time_slot < s['end_time'][:5]]
                
                if day_sessions:
                    cell_text = '<br/>'.join([f"<b>{s['course_name']}</b><br/>{s['room_name']}" for s in day_sessions])
                    row.append(Paragraph(cell_text, timetable_style))
                else:
                    row.append('')
            
            schedule_data.append(row)
        
        schedule_table = Table(schedule_data, colWidths=[13*mm] + [23*mm]*7, rowHeights=[8*mm] + [7.5*mm]*13, repeatRows=1)
        schedule_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ACADEMY_PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 7.2),
            ('FONTSIZE', (0, 1), (0, -1), 6.7),
            ('GRID', (0, 0), (-1, -1), 0.45, colors.HexColor('#B9B9B9')),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#F1F1F1')),
        ]))
        
        story.append(schedule_table)

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
