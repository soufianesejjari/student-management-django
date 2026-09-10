from datetime import date, time
from decimal import Decimal
from io import BytesIO

from django.test import TestCase
from pypdf import PdfReader, PdfWriter

from academics.models import AcademicYear, Course, Enrollment, Subject
from planning.models import ClassSession, Room, TeacherMonthlyPayroll
from planning.pdf_service import PDFReportGenerator, WeeklyScheduleGrid
from planning.services import (
    build_student_schedule_pdf_data,
    get_teacher_monthly_occurrences,
    get_validated_payroll_conflicts_for_dates,
    get_validated_payroll_conflicts_for_session,
)
from users.models import StudentProfile, TeacherProfile, User
from users.registration_pdf import build_registration_form


class PlanningPayrollSyncTests(TestCase):
    def setUp(self):
        AcademicYear.objects.filter(is_active=True).update(is_active=False)
        self.academic_year, _ = AcademicYear.objects.get_or_create(
            name='2025-2026',
            defaults={
                'start_date': date(2025, 9, 1),
                'end_date': date(2026, 8, 31),
                'is_active': True,
            },
        )
        self.academic_year.start_date = date(2025, 9, 1)
        self.academic_year.end_date = date(2026, 8, 31)
        self.academic_year.is_active = True
        self.academic_year.save()

        self.user = User.objects.create_user(username='teacher', first_name='Test', last_name='Teacher')
        self.teacher = TeacherProfile.objects.create(
            user=self.user,
            speciality='Piano',
            hourly_rate=Decimal('100.00'),
        )
        self.subject = Subject.objects.create(name='Piano', subject_type='INSTRUMENT')
        self.course = Course.objects.create(
            name='Piano A',
            subject=self.subject,
            level='BEGINNER',
            price=Decimal('500.00'),
        )
        self.room = Room.objects.create(name='Room A', capacity=4)

    def create_one_week_session(self):
        return ClassSession.objects.create(
            course=self.course,
            academic_year=self.academic_year,
            teacher=self.teacher,
            room=self.room,
            day_of_week=0,
            start_time=time(10, 0),
            end_time=time(11, 0),
            start_date=date(2025, 9, 1),
            end_date=date(2025, 9, 7),
        )

    def test_one_week_session_is_counted_in_teacher_payroll_calculation(self):
        self.create_one_week_session()

        occurrences, total_hours, worked_hours, total_expense = get_teacher_monthly_occurrences(
            self.teacher,
            2025,
            9,
            self.academic_year,
        )

        self.assertEqual(len(occurrences), 1)
        self.assertEqual(total_hours, 1)
        self.assertEqual(worked_hours, 1)
        self.assertEqual(total_expense, 100)

    def test_validated_month_locks_session_and_occurrence_changes(self):
        session = self.create_one_week_session()
        payroll = TeacherMonthlyPayroll.objects.create(
            teacher=self.teacher,
            academic_year=self.academic_year,
            year=2025,
            month=9,
            status='VALIDATED',
        )

        session_conflicts = get_validated_payroll_conflicts_for_session(session)
        date_conflicts = get_validated_payroll_conflicts_for_dates(
            self.teacher.id,
            self.academic_year,
            [date(2025, 9, 1)],
        )

        self.assertEqual([item.id for item in session_conflicts], [payroll.id])
        self.assertEqual([item.id for item in date_conflicts], [payroll.id])

    def test_student_documents_fit_two_pages_with_matching_branding(self):
        student_user = User.objects.create_user(
            username='student-pdf',
            first_name='Nora',
            last_name='Amrani',
            email='nora@example.com',
        )
        student = StudentProfile.objects.create(
            user=student_user,
            phone='0600000000',
            age_group='6-12ans',
        )
        Enrollment.objects.create(
            student=student,
            course=self.course,
            academic_year=self.academic_year,
            billing_plan='QUARTERLY',
            default_price=self.course.price,
            custom_price=self.course.price,
        )
        ClassSession.objects.create(
            course=self.course,
            academic_year=self.academic_year,
            teacher=self.teacher,
            room=self.room,
            day_of_week=0,
            start_time=time(10, 0),
            end_time=time(11, 0),
            start_date=date(2025, 9, 1),
            end_date=date(2026, 8, 31),
        )

        student_data, enrollments_data = build_student_schedule_pdf_data(
            student,
            date(2025, 9, 1),
            date(2025, 9, 7),
            self.academic_year,
        )
        schedule = PDFReportGenerator().generate_student_schedule(
            student_data,
            enrollments_data,
            date(2025, 9, 1),
            date(2025, 9, 7),
            page_label='2 / 2',
        )

        writer = PdfWriter()
        for source in (build_registration_form(student, page_label='1 / 2'), schedule):
            for page in PdfReader(source).pages:
                writer.add_page(page)
        combined = BytesIO()
        writer.write(combined)
        pages = PdfReader(combined).pages

        self.assertEqual(len(pages), 2)
        self.assertIn("FICHE D'INSCRIPTION ÉLÈVE", pages[0].extract_text())
        self.assertIn("PLANNING DE L'ÉLÈVE", pages[1].extract_text())
        self.assertIn('THE MUSICAL ACADEMY', pages[0].extract_text())
        self.assertIn('THE MUSICAL ACADEMY', pages[1].extract_text())

    def test_schedule_block_uses_exact_start_minute_and_duration(self):
        grid = WeeklyScheduleGrid([], hour_height=30)
        box = grid.session_box({
            'day_of_week': 1,
            'start_time': '18:30:00',
            'end_time': '20:00:00',
        })
        _, y, _, height = box

        expected_bottom = grid.body_height - (12 * grid.hour_height)
        self.assertEqual(y, expected_bottom)
        self.assertEqual(height, 1.5 * grid.hour_height)
