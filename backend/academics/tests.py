from datetime import date
from decimal import Decimal

from django.test import TestCase

from academics.models import (
    AcademicYear,
    AcademySettings,
    BillingAutomationRun,
    BillingAutomationState,
    Course,
    Enrollment,
    StudentFee,
    Subject,
    Subscription,
)
from academics.services import BillingService
from finances.models import Payment
from users.models import StudentProfile, User


class BillingServiceTests(TestCase):
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
        self.user = User.objects.create_user(username='student', first_name='Test', last_name='Student')
        self.student = StudentProfile.objects.create(user=self.user, status='ACTIVE')
        self.subject = Subject.objects.create(name='Piano', subject_type='INSTRUMENT')
        self.course = Course.objects.create(
            name='Piano A',
            subject=self.subject,
            level='BEGINNER',
            price=Decimal('500.00'),
        )

    def create_enrollment(self, billing_plan='QUARTERLY'):
        return Enrollment.objects.create(
            student=self.student,
            course=self.course,
            academic_year=self.academic_year,
            billing_plan=billing_plan,
            default_price=Decimal('500.00'),
            custom_price=Decimal('500.00'),
            status='ACTIVE',
        )

    def test_quarterly_then_monthly_generates_next_pending_period(self):
        enrollment = self.create_enrollment(billing_plan='QUARTERLY')
        initial_subscription, created = BillingService.create_subscription_for_period(
            enrollment,
            'QUARTERLY',
            date(2025, 9, 1),
        )

        self.assertTrue(created)
        self.assertEqual(initial_subscription.end_date, date(2025, 11, 30))
        self.assertEqual(initial_subscription.amount, Decimal('1500.00'))

        enrollment.billing_plan = 'MONTHLY'
        enrollment.save(update_fields=['billing_plan'])

        summary = BillingService.sync_due_subscriptions(
            today=date(2025, 12, 1),
            academic_year=self.academic_year,
            student_id=self.student.id,
        )

        self.assertEqual(summary['created'], 1)
        next_subscription = Subscription.objects.get(enrollment=enrollment, start_date=date(2025, 12, 1))
        self.assertEqual(next_subscription.subscription_type, 'MONTHLY')
        self.assertEqual(next_subscription.end_date, date(2025, 12, 31))
        self.assertEqual(next_subscription.amount, Decimal('500.00'))
        self.assertEqual(next_subscription.payment_status, 'PENDING')

    def test_monthly_subscription_generates_next_month_only_when_due(self):
        enrollment = self.create_enrollment(billing_plan='MONTHLY')
        BillingService.create_subscription_for_period(
            enrollment,
            'MONTHLY',
            date(2025, 9, 1),
        )

        early_summary = BillingService.sync_due_subscriptions(
            today=date(2025, 9, 30),
            academic_year=self.academic_year,
            enrollment_id=enrollment.id,
        )
        due_summary = BillingService.sync_due_subscriptions(
            today=date(2025, 10, 1),
            academic_year=self.academic_year,
            enrollment_id=enrollment.id,
        )

        self.assertEqual(early_summary['created'], 0)
        self.assertEqual(due_summary['created'], 1)
        october_subscription = Subscription.objects.get(enrollment=enrollment, start_date=date(2025, 10, 1))
        self.assertEqual(october_subscription.end_date, date(2025, 10, 31))
        self.assertEqual(october_subscription.amount, Decimal('500.00'))
        self.assertEqual(october_subscription.payment_status, 'PENDING')

    def test_quarterly_subscription_generates_next_quarter_only_after_period_end(self):
        enrollment = self.create_enrollment(billing_plan='QUARTERLY')
        BillingService.create_subscription_for_period(
            enrollment,
            'QUARTERLY',
            date(2025, 9, 1),
        )

        early_summary = BillingService.sync_due_subscriptions(
            today=date(2025, 11, 30),
            academic_year=self.academic_year,
            enrollment_id=enrollment.id,
        )
        due_summary = BillingService.sync_due_subscriptions(
            today=date(2025, 12, 1),
            academic_year=self.academic_year,
            enrollment_id=enrollment.id,
        )

        self.assertEqual(early_summary['created'], 0)
        self.assertEqual(due_summary['created'], 1)
        next_subscription = Subscription.objects.get(enrollment=enrollment, start_date=date(2025, 12, 1))
        self.assertEqual(next_subscription.subscription_type, 'QUARTERLY')
        self.assertEqual(next_subscription.end_date, date(2026, 2, 28))
        self.assertEqual(next_subscription.amount, Decimal('1500.00'))
        self.assertEqual(next_subscription.payment_status, 'PENDING')

    def test_partial_payment_keeps_subscription_pending_until_fully_paid(self):
        enrollment = self.create_enrollment(billing_plan='MONTHLY')
        subscription, _ = BillingService.create_subscription_for_period(
            enrollment,
            'MONTHLY',
            date(2026, 1, 1),
        )

        Payment.objects.create(
            student=self.student,
            subscription=subscription,
            amount=Decimal('200.00'),
            date=date(2026, 1, 3),
            method='CASH',
            status='PAID',
        )
        BillingService.sync_subscription_payment_status(subscription, today=date(2026, 1, 10))
        subscription.refresh_from_db()
        self.assertEqual(subscription.payment_status, 'PENDING')

        Payment.objects.create(
            student=self.student,
            subscription=subscription,
            amount=Decimal('300.00'),
            date=date(2026, 1, 4),
            method='CASH',
            status='PAID',
        )
        BillingService.sync_subscription_payment_status(subscription, today=date(2026, 1, 10))
        subscription.refresh_from_db()
        self.assertEqual(subscription.payment_status, 'PAID')

    def test_idempotent_sync_does_not_duplicate_periods(self):
        enrollment = self.create_enrollment(billing_plan='MONTHLY')
        BillingService.create_subscription_for_period(enrollment, 'MONTHLY', date(2025, 9, 1))

        first = BillingService.sync_due_subscriptions(
            today=date(2025, 10, 1),
            academic_year=self.academic_year,
            enrollment_id=enrollment.id,
        )
        second = BillingService.sync_due_subscriptions(
            today=date(2025, 10, 1),
            academic_year=self.academic_year,
            enrollment_id=enrollment.id,
        )

        self.assertEqual(first['created'], 1)
        self.assertEqual(second['created'], 0)
        self.assertEqual(Subscription.objects.filter(enrollment=enrollment).count(), 2)

    def test_default_student_fees_can_be_paid_or_exempted_on_student_creation(self):
        settings = AcademySettings.get()
        settings.default_registration_fee = Decimal('100.00')
        settings.default_insurance_fee = Decimal('50.00')
        settings.save()

        created_fees = BillingService.create_default_student_fees(
            self.student,
            academic_year=self.academic_year,
            registration_status='PAID',
            insurance_status='EXEMPT',
        )

        self.assertEqual(len(created_fees), 2)
        registration_fee = StudentFee.objects.get(student=self.student, fee_type='REGISTRATION')
        insurance_fee = StudentFee.objects.get(student=self.student, fee_type='INSURANCE')
        self.assertEqual(registration_fee.status, 'PAID')
        self.assertEqual(insurance_fee.status, 'EXEMPT')
        self.assertTrue(Payment.objects.filter(student_fee=registration_fee, status='PAID', amount=Decimal('100.00')).exists())

    def test_student_payment_summary_includes_unpaid_student_fees(self):
        StudentFee.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            fee_type='REGISTRATION',
            amount=Decimal('100.00'),
            status='PENDING',
            due_date=date(2026, 5, 1),
        )

        summary = BillingService.student_payment_summary(
            self.student,
            academic_year=self.academic_year,
            today=date(2026, 5, 15),
        )

        self.assertEqual(summary['status'], 'PENDING')
        self.assertEqual(summary['balance'], Decimal('100.00'))

        summary = BillingService.student_payment_summary(
            self.student,
            academic_year=self.academic_year,
            today=date(2026, 6, 1),
        )

        self.assertEqual(summary['status'], 'OVERDUE')

    def test_pending_billing_summary_counts_unpaid_dues_without_pending_payment_rows(self):
        enrollment = self.create_enrollment(billing_plan='MONTHLY')
        BillingService.create_subscription_for_period(
            enrollment,
            'MONTHLY',
            date(2026, 5, 1),
        )
        StudentFee.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            fee_type='REGISTRATION',
            amount=Decimal('100.00'),
            status='PENDING',
            due_date=date(2026, 5, 1),
        )

        summary = BillingService.pending_billing_summary(
            academic_year=self.academic_year,
            today=date(2026, 5, 15),
            through_date=date(2026, 5, 31),
        )

        self.assertEqual(summary['subscriptions_count'], 1)
        self.assertEqual(summary['subscriptions_amount'], Decimal('500.00'))
        self.assertEqual(summary['student_fees_count'], 1)
        self.assertEqual(summary['student_fees_amount'], Decimal('100.00'))
        self.assertEqual(summary['count'], 2)
        self.assertEqual(summary['amount'], Decimal('600.00'))

    def test_billing_automation_creates_due_periods_and_logs_run(self):
        enrollment = self.create_enrollment(billing_plan='MONTHLY')
        BillingService.create_subscription_for_period(
            enrollment,
            'MONTHLY',
            date(2025, 9, 1),
        )

        result = BillingService.run_billing_automation(today=date(2025, 10, 1), force=True)

        self.assertEqual(result['status'], 'SUCCESS')
        self.assertEqual(result['subscriptions_created'], 1)
        self.assertTrue(Subscription.objects.filter(enrollment=enrollment, start_date=date(2025, 10, 1)).exists())

        state = BillingAutomationState.objects.get(job_name=BillingService.AUTOMATION_JOB_NAME)
        self.assertFalse(state.is_running)
        self.assertEqual(state.success_count, 1)
        self.assertTrue(BillingAutomationRun.objects.filter(job_name=BillingService.AUTOMATION_JOB_NAME, status='SUCCESS').exists())

        skipped = BillingService.run_billing_automation(today=date(2025, 10, 1))
        self.assertEqual(skipped['status'], 'SKIPPED')
        self.assertEqual(skipped['reason'], 'already_succeeded_today')
