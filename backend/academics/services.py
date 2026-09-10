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

from academics.models import (
    AcademicYear,
    AcademySettings,
    BillingAutomationRun,
    BillingAutomationState,
    Course,
    Enrollment,
    StudentFee,
    Subscription,
)
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
        'ANNUAL': 12,
    }
    AUTOMATION_JOB_NAME = 'billing_daily_sync'

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
    def subscription_amount(cls, enrollment, start_date, end_date, subscription_type=None):
        monthly_price = enrollment.custom_price or Decimal('0')
        billed_months = 10 if subscription_type == 'ANNUAL' else cls.covered_months(start_date, end_date)
        return monthly_price * billed_months

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
        amount = cls.subscription_amount(enrollment, start_date, end_date, subscription_type)
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
    @transaction.atomic
    def update_current_unpaid_subscription_plan(cls, enrollment, subscription_type):
        """Recalculate the current due when its payment has not started yet.

        Paid and partially paid periods are accounting history and must stay
        unchanged. In that case, the enrollment plan is used by the next due.
        """
        subscription = (
            enrollment.subscriptions
            .select_for_update()
            .exclude(payment_status__in=['PAID', 'CANCELLED'])
            .order_by('start_date', 'id')
            .first()
        )
        if not subscription or subscription.payments.filter(status='PAID').exists():
            return None

        end_date = cls.period_end_date(
            subscription.start_date,
            subscription_type,
            enrollment.academic_year,
        )
        amount = cls.subscription_amount(
            enrollment,
            subscription.start_date,
            end_date,
            subscription_type,
        )

        duplicate_period = (
            enrollment.subscriptions
            .exclude(pk=subscription.pk)
            .filter(start_date=subscription.start_date, end_date=end_date)
            .exists()
        )
        if duplicate_period:
            return None

        subscription.subscription_type = subscription_type
        subscription.end_date = end_date
        subscription.amount = amount
        subscription.payment_status = cls._status_for_amount(
            amount,
            end_date,
            timezone.now().date(),
        )
        subscription.save(update_fields=[
            'subscription_type',
            'end_date',
            'amount',
            'payment_status',
        ])
        return subscription

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

    @staticmethod
    def _month_is_finished(day, today):
        next_month = day.replace(day=28) + timedelta(days=4)
        last_day = next_month - timedelta(days=next_month.day)
        return today > last_day

    @staticmethod
    def remaining_balance(amount, paid_amount):
        return max((amount or Decimal('0')) - (paid_amount or Decimal('0')), Decimal('0'))

    @classmethod
    def _status_for_unpaid_fee(cls, fee, today):
        if fee.amount <= 0:
            return 'PAID'
        if cls._month_is_finished(fee.due_date, today):
            return 'OVERDUE'
        return 'PENDING'

    @classmethod
    def sync_student_fee_status(cls, fee, today=None):
        today = today or timezone.now().date()
        if not fee or fee.status == 'EXEMPT':
            return False

        from finances.models import Payment

        paid_amount = (
            Payment.objects
            .filter(student_fee=fee, status='PAID')
            .aggregate(total=Sum('amount'))['total']
            or Decimal('0')
        )

        if paid_amount >= fee.amount:
            next_status = 'PAID'
        else:
            next_status = cls._status_for_unpaid_fee(fee, today)

        if fee.status != next_status:
            fee.status = next_status
            fee.save(update_fields=['status', 'updated_at'])
            return True
        return False

    @classmethod
    def sync_student_fees(cls, student=None, academic_year=None, today=None):
        today = today or timezone.now().date()
        academic_year = academic_year or AcademicYear.get_active()
        queryset = StudentFee.objects.filter(academic_year=academic_year).exclude(status='EXEMPT')
        if student:
            queryset = queryset.filter(student=student)

        updated = 0
        for fee in queryset:
            if cls.sync_student_fee_status(fee, today=today):
                updated += 1
        return updated

    @classmethod
    def create_default_student_fees(
        cls,
        student,
        academic_year=None,
        registration_status='PENDING',
        insurance_status='PENDING',
        registration_amount=None,
        insurance_amount=None,
        payment_method='CASH',
        user=None,
    ):
        from finances.models import Payment

        academic_year = academic_year or AcademicYear.get_active()
        settings = AcademySettings.get()
        today = timezone.now().date()
        fee_configs = [
            (
                'REGISTRATION',
                settings.default_registration_fee if registration_amount is None else registration_amount,
                registration_status,
            ),
            (
                'INSURANCE',
                settings.default_insurance_fee if insurance_amount is None else insurance_amount,
                insurance_status,
            ),
        ]
        created_fees = []

        for fee_type, amount, requested_status in fee_configs:
            amount = Decimal(str(amount or 0))
            if amount <= 0:
                continue

            normalized_status = requested_status if requested_status in {'PENDING', 'PAID', 'EXEMPT'} else 'PENDING'
            initial_status = 'EXEMPT' if normalized_status == 'EXEMPT' else 'PENDING'
            fee, created = StudentFee.objects.get_or_create(
                student=student,
                academic_year=academic_year,
                fee_type=fee_type,
                defaults={
                    'amount': amount,
                    'status': initial_status,
                    'due_date': today,
                },
            )

            if not created:
                created_fees.append(fee)
                continue

            if normalized_status == 'PAID':
                import uuid
                Payment.objects.create(
                    student=student,
                    student_fee=fee,
                    amount=amount,
                    date=today,
                    method=payment_method,
                    status='PAID',
                    invoice_ref=f"INV-{uuid.uuid4().hex[:8].upper()}",
                    notes=f"Auto payment for {fee.get_fee_type_display()}",
                )
                cls.sync_student_fee_status(fee, today=today)
                fee.refresh_from_db()

            created_fees.append(fee)

        return created_fees

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
            cls.sync_student_fees(student=student, academic_year=academic_year, today=today)

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
            subscriptions = []

        subscription_paid_rows = (
            Payment.objects
            .filter(subscription__in=subscriptions, status='PAID')
            .values('subscription_id')
            .annotate(total=Sum('amount'))
        )
        paid_by_subscription = {
            row['subscription_id']: row['total'] or Decimal('0')
            for row in subscription_paid_rows
        }

        fees = list(
            StudentFee.objects
            .filter(student=student, academic_year=academic_year)
            .exclude(status='EXEMPT')
            .order_by('due_date')
        )
        fee_paid_rows = (
            Payment.objects
            .filter(student_fee__in=fees, status='PAID')
            .values('student_fee_id')
            .annotate(total=Sum('amount'))
        )
        paid_by_fee = {
            row['student_fee_id']: row['total'] or Decimal('0')
            for row in fee_paid_rows
        }

        total_due = sum((subscription.amount for subscription in subscriptions), Decimal('0'))
        total_due += sum((fee.amount for fee in fees), Decimal('0'))
        total_paid = sum(paid_by_subscription.values(), Decimal('0')) + sum(paid_by_fee.values(), Decimal('0'))
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

        for fee in fees:
            paid = paid_by_fee.get(fee.id, Decimal('0'))
            remaining = max(fee.amount - paid, Decimal('0'))
            if remaining > 0:
                balance += remaining
                if fee.status == 'OVERDUE' or cls._month_is_finished(fee.due_date, today):
                    overdue_dates.append(fee.due_date)
                else:
                    has_pending = True

        if total_due <= 0:
            status = 'NONE'
            days_overdue = None
        elif balance <= 0:
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

    @classmethod
    def pending_billing_summary(cls, academic_year=None, today=None, through_date=None, sync=True):
        """
        Return real outstanding student debt, even when no PENDING Payment row exists yet.

        Finance must be based on generated dues:
        Subscription/StudentFee amount - paid Payment rows.
        """
        from finances.models import Payment

        today = today or timezone.now().date()
        through_date = through_date or today
        academic_year = academic_year or AcademicYear.get_active()
        sync_date = min(today, through_date)

        if sync:
            cls.sync_due_subscriptions(today=sync_date, academic_year=academic_year)
            cls.sync_student_fees(academic_year=academic_year, today=today)

        subscriptions = list(
            Subscription.objects
            .filter(
                enrollment__academic_year=academic_year,
                enrollment__status='ACTIVE',
                start_date__lte=through_date,
            )
            .exclude(payment_status__in=['PAID', 'CANCELLED'])
            .select_related('enrollment__student__user', 'enrollment__course')
        )
        subscription_paid_rows = (
            Payment.objects
            .filter(subscription__in=subscriptions, status='PAID')
            .values('subscription_id')
            .annotate(total=Sum('amount'))
        )
        paid_by_subscription = {
            row['subscription_id']: row['total'] or Decimal('0')
            for row in subscription_paid_rows
        }

        fees = list(
            StudentFee.objects
            .filter(academic_year=academic_year, due_date__lte=through_date)
            .exclude(status__in=['PAID', 'EXEMPT'])
            .select_related('student__user')
        )
        fee_paid_rows = (
            Payment.objects
            .filter(student_fee__in=fees, status='PAID')
            .values('student_fee_id')
            .annotate(total=Sum('amount'))
        )
        paid_by_fee = {
            row['student_fee_id']: row['total'] or Decimal('0')
            for row in fee_paid_rows
        }

        subscription_amount = Decimal('0')
        subscription_count = 0
        fee_amount = Decimal('0')
        fee_count = 0

        for subscription in subscriptions:
            balance = cls.remaining_balance(subscription.amount, paid_by_subscription.get(subscription.id))
            if balance > 0:
                subscription_amount += balance
                subscription_count += 1

        for fee in fees:
            balance = cls.remaining_balance(fee.amount, paid_by_fee.get(fee.id))
            if balance > 0:
                fee_amount += balance
                fee_count += 1

        return {
            'academic_year': academic_year.name,
            'through_date': through_date,
            'subscriptions_count': subscription_count,
            'subscriptions_amount': subscription_amount,
            'student_fees_count': fee_count,
            'student_fees_amount': fee_amount,
            'count': subscription_count + fee_count,
            'amount': subscription_amount + fee_amount,
        }

    @classmethod
    def run_billing_automation(cls, today=None, force=False, stale_after_seconds=7200):
        """
        Run the automatic billing sync once with DB state/logging.

        The job is safe to call from a scheduler, a management command, or a view:
        subscription creation is idempotent and the state row prevents normal
        duplicate executions.
        """
        today = today or timezone.localdate()
        now = timezone.now()

        with transaction.atomic():
            state, _ = (
                BillingAutomationState.objects
                .select_for_update()
                .get_or_create(job_name=cls.AUTOMATION_JOB_NAME)
            )
            if state.is_running and state.last_started_at:
                age = (now - state.last_started_at).total_seconds()
                if age < stale_after_seconds:
                    BillingAutomationRun.objects.create(
                        job_name=cls.AUTOMATION_JOB_NAME,
                        status='SKIPPED',
                        started_at=now,
                        finished_at=now,
                        result={'reason': 'already_running', 'last_started_at': state.last_started_at.isoformat()},
                    )
                    return {'status': 'SKIPPED', 'reason': 'already_running'}

            if not force and state.last_success_at and timezone.localtime(state.last_success_at).date() >= today:
                BillingAutomationRun.objects.create(
                    job_name=cls.AUTOMATION_JOB_NAME,
                    status='SKIPPED',
                    started_at=now,
                    finished_at=now,
                    result={'reason': 'already_succeeded_today', 'last_success_at': state.last_success_at.isoformat()},
                )
                return {'status': 'SKIPPED', 'reason': 'already_succeeded_today'}

            state.is_running = True
            state.last_started_at = now
            state.last_error = ''
            state.run_count += 1
            state.save(update_fields=['is_running', 'last_started_at', 'last_error', 'run_count', 'updated_at'])
            run = BillingAutomationRun.objects.create(
                job_name=cls.AUTOMATION_JOB_NAME,
                status='SKIPPED',
                started_at=now,
            )

        try:
            academic_year = AcademicYear.get_active()
            subscriptions_summary = cls.sync_due_subscriptions(today=today, academic_year=academic_year)
            fees_updated = cls.sync_student_fees(academic_year=academic_year, today=today)
            pending_summary = cls.pending_billing_summary(
                academic_year=academic_year,
                today=today,
                through_date=today,
                sync=False,
            )
            result = {
                'status': 'SUCCESS',
                'date': today.isoformat(),
                'academic_year': academic_year.name,
                'subscriptions_created': subscriptions_summary['created'],
                'subscription_statuses_updated': subscriptions_summary['updated_statuses'],
                'student_fees_updated': fees_updated,
                'pending_count': pending_summary['count'],
                'pending_amount': str(pending_summary['amount']),
                'pending_subscriptions_count': pending_summary['subscriptions_count'],
                'pending_student_fees_count': pending_summary['student_fees_count'],
            }

            finished_at = timezone.now()
            with transaction.atomic():
                state = BillingAutomationState.objects.select_for_update().get(job_name=cls.AUTOMATION_JOB_NAME)
                state.is_running = False
                state.last_finished_at = finished_at
                state.last_success_at = finished_at
                state.last_error = ''
                state.last_result = result
                state.success_count += 1
                state.save(update_fields=[
                    'is_running',
                    'last_finished_at',
                    'last_success_at',
                    'last_error',
                    'last_result',
                    'success_count',
                    'updated_at',
                ])
                run.status = 'SUCCESS'
                run.finished_at = finished_at
                run.result = result
                run.save(update_fields=['status', 'finished_at', 'result'])
            return result
        except Exception as exc:
            finished_at = timezone.now()
            error = str(exc)
            with transaction.atomic():
                state = BillingAutomationState.objects.select_for_update().get(job_name=cls.AUTOMATION_JOB_NAME)
                state.is_running = False
                state.last_finished_at = finished_at
                state.last_error = error
                state.error_count += 1
                state.save(update_fields=[
                    'is_running',
                    'last_finished_at',
                    'last_error',
                    'error_count',
                    'updated_at',
                ])
                run.status = 'ERROR'
                run.finished_at = finished_at
                run.error = error
                run.save(update_fields=['status', 'finished_at', 'error'])
            raise
