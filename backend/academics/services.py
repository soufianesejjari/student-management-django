"""
Business logic services for academic enrollments and subscription billing.
"""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings as django_settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from academics.models import AcademicYear, Course, Enrollment, Subscription, AcademySettings
from users.models import StudentProfile


class EnrollmentService:
    """Service for handling enrollment-related business logic."""

    @staticmethod
    def get_offer_settings():
        """
        Return the course offer configuration as a plain dict,
        reading from the AcademySettings DB singleton.
        Falls back to COURSE_OFFER_FALLBACK from settings.py on DB error.
        """
        try:
            s = AcademySettings.get()
            return {
                'enabled': s.offer_enabled,
                'free_course_id': s.free_course_id,
                'max_times': s.offer_max_times,
            }
        except Exception:
            fallback = getattr(django_settings, 'COURSE_OFFER_FALLBACK', {})
            return {
                'enabled': fallback.get('enabled', False),
                'free_course_id': fallback.get('free_course_id'),
                'max_times': fallback.get('max_times', 1),
            }

    @staticmethod
    def suggest_enrollment_price(student_id, course_id):
        """
        Suggests a price for enrolling a student in a course based on:
        - Course default price
        - Promotional rules (e.g., 3rd course of different type is free)

        Returns:
            dict: {
                'default_price': Decimal,
                'suggested_price': Decimal,
                'is_promotional': bool,
                'reason': str
            }
        """
        try:
            student = StudentProfile.objects.get(id=student_id)
            course = Course.objects.get(id=course_id)
        except (StudentProfile.DoesNotExist, Course.DoesNotExist):
            return {
                'default_price': 0,
                'suggested_price': 0,
                'is_promotional': False,
                'reason': 'Invalid student or course'
            }

        # Get all active enrollments for this student
        academic_year = AcademicYear.get_active()
        active_enrollments = Enrollment.objects.filter(
            student=student,
            status='ACTIVE',
            academic_year=academic_year,
        ).select_related('course__subject')

        # Group enrollments by subject
        subject_counts = {}
        for enrollment in active_enrollments:
            if enrollment.course.subject:
                subject_id = enrollment.course.subject.id
                subject_counts[subject_id] = subject_counts.get(subject_id, 0) + 1

        # Check promotional rule: 3rd course of different type is free
        # If student has ≥2 courses of the same subject
        has_two_same_subject = any(count >= 2 for count in subject_counts.values())

        # Check if new course is a different subject
        new_subject_id = course.subject.id if course.subject else None
        is_different_subject = (
            new_subject_id is not None and
            (new_subject_id not in subject_counts or subject_counts[new_subject_id] == 0)
        )

        if has_two_same_subject and is_different_subject:
            reason = f"Student has {max(subject_counts.values())} courses of same subject - 3rd course of different type FREE"
            return {
                'default_price': course.price,
                'suggested_price': 0,
                'is_promotional': True,
                'reason': reason
            }
        else:
            return {
                'default_price': course.price,
                'suggested_price': course.price,
                'is_promotional': False,
                'reason': ''
            }


class BillingService:
    """
    Small-project billing engine.

    It is intentionally idempotent and database-only: API views can call it
    before reads/writes without requiring Redis, Celery or a cron process.
    """

    PLAN_MONTHS = {
        'MONTHLY': 1,
        'QUARTERLY': 3,
    }

    @classmethod
    def period_end_date(cls, start_date, plan, academic_year=None):
        months = cls.PLAN_MONTHS.get(plan, 1)
        end_date = start_date + relativedelta(months=months) - timedelta(days=1)
        if academic_year and end_date > academic_year.end_date:
            return academic_year.end_date
        return end_date

    @staticmethod
    def covered_months(start_date, end_date):
        months = 0
        cursor = start_date
        while cursor <= end_date:
            months += 1
            cursor = cursor + relativedelta(months=1)
        return max(months, 1)

    @classmethod
    def subscription_amount(cls, enrollment, start_date, end_date):
        monthly_price = enrollment.custom_price or Decimal('0')
        return monthly_price * cls.covered_months(start_date, end_date)

    @staticmethod
    def _status_for_amount(amount, end_date, today):
        if amount <= 0:
            return 'PAID'
        if end_date < today:
            return 'OVERDUE'
        return 'PENDING'

    @classmethod
    def _status_for_unpaid_subscription(cls, subscription, today):
        return cls._status_for_amount(subscription.amount, subscription.end_date, today)

    @classmethod
    def create_subscription_for_period(cls, enrollment, subscription_type, start_date):
        end_date = cls.period_end_date(start_date, subscription_type, enrollment.academic_year)
        amount = cls.subscription_amount(enrollment, start_date, end_date)
        today = timezone.now().date()

        subscription, created = Subscription.objects.get_or_create(
            enrollment=enrollment,
            start_date=start_date,
            end_date=end_date,
            defaults={
                'subscription_type': subscription_type,
                'amount': amount,
                'payment_status': cls._status_for_amount(amount, end_date, today),
            },
        )

        if not created:
            changed_fields = []
            if subscription.subscription_type != subscription_type:
                subscription.subscription_type = subscription_type
                changed_fields.append('subscription_type')
            if subscription.amount != amount and subscription.payment_status != 'PAID':
                subscription.amount = amount
                changed_fields.append('amount')
            if changed_fields:
                subscription.save(update_fields=changed_fields)

        return subscription, created

    @classmethod
    def sync_subscription_payment_status(cls, subscription, today=None):
        today = today or timezone.now().date()
        if not subscription or subscription.payment_status == 'CANCELLED':
            return False

        from finances.models import Payment

        paid_amount = (
            Payment.objects
            .filter(subscription=subscription, status='PAID')
            .aggregate(total=Sum('amount'))['total']
            or Decimal('0')
        )

        if paid_amount >= subscription.amount:
            next_status = 'PAID'
        else:
            next_status = cls._status_for_unpaid_subscription(subscription, today)

        if subscription.payment_status != next_status:
            subscription.payment_status = next_status
            subscription.save(update_fields=['payment_status'])
            return True
        return False

    @classmethod
    def sync_enrollment_subscriptions(cls, enrollment_id, today=None):
        today = today or timezone.now().date()
        result = {
            'enrollment_id': enrollment_id,
            'created': 0,
            'updated_statuses': 0,
            'subscriptions': [],
        }

        with transaction.atomic():
            enrollment = (
                Enrollment.objects
                .select_for_update()
                .select_related('academic_year')
                .get(pk=enrollment_id)
            )

            for subscription in enrollment.subscriptions.select_for_update().all():
                if cls.sync_subscription_payment_status(subscription, today):
                    result['updated_statuses'] += 1

            if enrollment.status != 'ACTIVE':
                return result

            latest = (
                enrollment.subscriptions
                .order_by('-end_date', '-start_date', '-id')
                .first()
            )

            if latest:
                next_start = latest.end_date + timedelta(days=1)
            else:
                enrolled_date = enrollment.enrolled_at.date() if enrollment.enrolled_at else today
                next_start = max(enrolled_date, enrollment.academic_year.start_date)

            academic_year = enrollment.academic_year
            guard = 0
            while next_start <= today and next_start <= academic_year.end_date and guard < 24:
                guard += 1
                plan = enrollment.billing_plan or 'MONTHLY'
                subscription, created = cls.create_subscription_for_period(
                    enrollment=enrollment,
                    subscription_type=plan,
                    start_date=next_start,
                )
                cls.sync_subscription_payment_status(subscription, today)
                if created:
                    result['created'] += 1
                result['subscriptions'].append(subscription.id)
                next_start = subscription.end_date + timedelta(days=1)

        return result

    @classmethod
    def sync_due_subscriptions(cls, today=None, academic_year=None, student_id=None, enrollment_id=None):
        today = today or timezone.now().date()
        academic_year = academic_year or AcademicYear.get_active()
        queryset = Enrollment.objects.filter(status='ACTIVE', academic_year=academic_year)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if enrollment_id:
            queryset = queryset.filter(id=enrollment_id)

        summary = {
            'academic_year': academic_year.name,
            'date': today,
            'created': 0,
            'updated_statuses': 0,
            'enrollments': [],
        }
        for enrollment in queryset.only('id').iterator():
            result = cls.sync_enrollment_subscriptions(enrollment.id, today=today)
            summary['created'] += result['created']
            summary['updated_statuses'] += result['updated_statuses']
            summary['enrollments'].append(result)
        return summary

    @classmethod
    def student_payment_summary(cls, student, academic_year=None, today=None, sync=True):
        from finances.models import Payment

        today = today or timezone.now().date()
        academic_year = academic_year or AcademicYear.get_active()
        if sync:
            cls.sync_due_subscriptions(today=today, academic_year=academic_year, student_id=student.id)

        subscriptions = list(
            Subscription.objects
            .filter(
                enrollment__student=student,
                enrollment__academic_year=academic_year,
                enrollment__status='ACTIVE',
                start_date__lte=today,
            )
            .exclude(payment_status='CANCELLED')
            .order_by('end_date')
        )

        if not subscriptions:
            return {
                'status': 'NONE',
                'total_due': Decimal('0'),
                'total_paid': Decimal('0'),
                'balance': Decimal('0'),
                'days_overdue': None,
            }

        paid_rows = (
            Payment.objects
            .filter(subscription__in=subscriptions, status='PAID')
            .values('subscription_id')
            .annotate(total=Sum('amount'))
        )
        paid_by_subscription = {
            row['subscription_id']: row['total'] or Decimal('0')
            for row in paid_rows
        }

        total_due = sum((subscription.amount for subscription in subscriptions), Decimal('0'))
        total_paid = sum(paid_by_subscription.values(), Decimal('0'))
        balance = Decimal('0')
        overdue_dates = []
        has_pending = False

        for subscription in subscriptions:
            paid = paid_by_subscription.get(subscription.id, Decimal('0'))
            remaining = max(subscription.amount - paid, Decimal('0'))
            if remaining > 0:
                balance += remaining
                if subscription.end_date < today:
                    overdue_dates.append(subscription.end_date)
                else:
                    has_pending = True

        if balance <= 0:
            status = 'PAID'
            days_overdue = None
        elif overdue_dates:
            status = 'OVERDUE'
            days_overdue = (today - min(overdue_dates)).days
        elif has_pending:
            status = 'PENDING'
            days_overdue = None
        else:
            status = 'PENDING'
            days_overdue = None

        return {
            'status': status,
            'total_due': total_due,
            'total_paid': total_paid,
            'balance': balance,
            'days_overdue': days_overdue,
        }
