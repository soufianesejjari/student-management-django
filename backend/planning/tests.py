from datetime import date, time
from decimal import Decimal

from django.test import TestCase

from academics.models import AcademicYear, Course, Subject
from planning.models import ClassSession, Room, TeacherMonthlyPayroll
from planning.services import (
    get_teacher_monthly_occurrences,
    get_validated_payroll_conflicts_for_dates,
    get_validated_payroll_conflicts_for_session,
)
from users.models import TeacherProfile, User


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
