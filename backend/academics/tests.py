from datetime import date
from decimal import Decimal

from django.test import TestCase

from academics.models import AcademicYear, Course, Enrollment, Subject, Subscription
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
