# PDF Report Generation Service
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime, timedelta
from calendar import monthrange

class PDFReportGenerator:
    """Service for generating PDF reports"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12
        )
    
    def generate_teacher_payment_report(self, teacher_data, sessions_data):
        """
        Generate monthly payment report for a teacher
        Args:
            teacher_data: dict with teacher info (id, name, hourly_rate)
            sessions_data: dict with sessions and summary
        Returns:
            BytesIO buffer with PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, 
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=18)
        
        story = []
        
        # Title
        title = Paragraph(f"Payment Report - {sessions_data['month']}", self.title_style)
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Teacher Info
        teacher_info = f"""
        <para align=left>
        <b>Teacher:</b> {teacher_data['name']}<br/>
        <b>Hourly Rate:</b> ${teacher_data['hourly_rate']:.2f}/hour<br/>
        <b>Report Date:</b> {datetime.now().strftime('%B %d, %Y')}
        </para>
        """
        story.append(Paragraph(teacher_info, self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Summary Section
        story.append(Paragraph("Monthly Summary", self.heading_style))
        summary = sessions_data['summary']
        
        summary_data = [
            ['Metric', 'Value'],
            ['Total Sessions Scheduled', str(summary['total_sessions'])],
            ['Cancelled Sessions', str(summary['cancelled_sessions'])],
            ['Teacher Absences', str(summary['absent_sessions'])],
            ['Total Hours Scheduled', f"{summary['total_hours']:.1f}h"],
            ['Hours Worked', f"{summary['worked_hours']:.1f}h"],
            ['Total Payment Due', f"${summary['total_expense']:.2f}"]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a90e2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#d4edda')),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Detailed Sessions
        story.append(Paragraph("Session Details", self.heading_style))
        
        session_data = [['Date', 'Course', 'Time', 'Hours', 'Status', 'Amount']]
        
        for session in sessions_data['occurrences']:
            status = 'Cancelled' if session['is_cancelled'] else ('Absent' if session['teacher_is_absent'] else 'Present')
            amount = 0 if (session['is_cancelled'] or session['teacher_is_absent']) else session['duration_hours'] * session['hourly_rate']
            
            session_data.append([
                session['date'],
                session['course'],
                f"{session['start_time'][:5]} - {session['end_time'][:5]}",
                f"{session['duration_hours']:.1f}h",
                status,
                f"${amount:.2f}"
            ])
        
        sessions_table = Table(session_data, colWidths=[1*inch, 1.8*inch, 1.2*inch, 0.7*inch, 0.8*inch, 0.8*inch])
        sessions_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a90e2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        
        story.append(sessions_table)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_teacher_schedule(self, teacher_data, sessions_data, start_date, end_date):
        """
        Generate weekly/monthly schedule for a teacher
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=18)
        
        story = []
        
        # Title
        title_text = f"Schedule: {teacher_data['name']}"
        title = Paragraph(title_text, self.title_style)
        story.append(title)
        
        subtitle = Paragraph(f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}", 
                            self.styles['Normal'])
        story.append(subtitle)
        story.append(Spacer(1, 20))
        
        # Group sessions by day
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        # Create schedule data
        schedule_data = [['Time'] + days_of_week]
        
        # Build time slots (8 AM to 8 PM)
        time_slots = []
        for hour in range(8, 21):
            time_slots.append(f"{hour:02d}:00")
        
        for time_slot in time_slots:
            row = [time_slot]
            for day_idx in range(7):
                # Find sessions for this day and time
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
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a90e2')),
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
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_student_schedule(self, student_data, enrollments_data, start_date, end_date):
        """
        Generate weekly/monthly schedule for a student
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=18)
        
        story = []
        
        # Title
        title_text = f"Student Schedule: {student_data['name']}"
        title = Paragraph(title_text, self.title_style)
        story.append(title)
        
        subtitle = Paragraph(f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}", 
                            self.styles['Normal'])
        story.append(subtitle)
        story.append(Spacer(1, 20))
        
        # List enrolled courses
        story.append(Paragraph("Enrolled Courses", self.heading_style))
        
        courses_data = [['Course', 'Teacher', 'Days & Times']]
        
        for enrollment in enrollments_data:
            course_schedule = []
            for session in enrollment['sessions']:
                days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                day_name = days[session['day_of_week']]
                course_schedule.append(f"{day_name} {session['start_time'][:5]}-{session['end_time'][:5]}")
            
            courses_data.append([
                enrollment['course_name'],
                enrollment['teacher_name'],
                ', '.join(course_schedule)
            ])
        
        courses_table = Table(courses_data, colWidths=[2*inch, 2*inch, 2.5*inch])
        courses_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a90e2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(courses_table)
        story.append(Spacer(1, 20))
        
        # Weekly Schedule Grid (similar to teacher schedule)
        story.append(PageBreak())
        story.append(Paragraph("Weekly Schedule", self.heading_style))
        
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        schedule_data = [['Time'] + days_of_week]
        
        time_slots = []
        for hour in range(8, 21):
            time_slots.append(f"{hour:02d}:00")
        
        # Flatten all sessions from enrollments
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
                    cell_text = '\n'.join([f"{s['course_name']}\n{s['room_name']}" for s in day_sessions])
                    row.append(cell_text)
                else:
                    row.append('')
            
            schedule_data.append(row)
        
        schedule_table = Table(schedule_data, colWidths=[0.8*inch] + [0.9*inch]*7)
        schedule_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a90e2')),
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
        
        doc.build(story)
        buffer.seek(0)
        return buffer
