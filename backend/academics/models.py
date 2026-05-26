from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


class AcademicYear(models.Model):
    """School year boundary used to isolate enrollments, schedules and billing."""

    name = models.CharField(max_length=20, unique=True, help_text="Example: 2025-2026")
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']
        constraints = [
            models.UniqueConstraint(
                fields=['is_active'],
                condition=Q(is_active=True),
                name='only_one_active_academic_year',
            )
        ]

    def __str__(self):
        return self.name

    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError("Academic year end date must be after start date")

    def save(self, *args, **kwargs):
        self.clean()
        if self.is_active:
            AcademicYear.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    @classmethod
    def default_dates_for(cls, today=None):
        today = today or timezone.now().date()
        start_year = today.year if today.month >= 9 else today.year - 1
        return (
            timezone.datetime(start_year, 9, 1).date(),
            timezone.datetime(start_year + 1, 8, 31).date(),
        )

    @classmethod
    def get_active(cls):
        today = timezone.now().date()
        active = cls.objects.filter(is_active=True).first()
        if active:
            return active

        current = cls.objects.filter(start_date__lte=today, end_date__gte=today).first()
        if current:
            current.is_active = True
            current.save(update_fields=['is_active'])
            return current

        start_date, end_date = cls.default_dates_for(today)
        return cls.objects.create(
            name=f"{start_date.year}-{end_date.year}",
            start_date=start_date,
            end_date=end_date,
            is_active=True,
        )

class Subject(models.Model):
    """Musical instruments or subject areas (Piano, Guitar, Solfège, etc.)"""
    SUBJECT_TYPE_CHOICES = (
        ('SOLFEGE', 'Solfege'),
        ('INSTRUMENT', 'Instrument'),
    )
    name = models.CharField(max_length=100, unique=True)
    color_code = models.CharField(max_length=20, default='#3788d8')
    subject_type = models.CharField(
        max_length=20,
        choices=SUBJECT_TYPE_CHOICES,
        default='INSTRUMENT'
    )

    def __str__(self):
        return self.name

class Course(models.Model):
    """Specific courses like 'Piano Beginner 1'"""
    LEVEL_CHOICES = (
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('ADVANCED', 'Advanced'),
    )
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    )

    name = models.CharField(max_length=200)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='courses')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    default_teacher = models.ForeignKey('users.TeacherProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='default_courses')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.level})"

    def save(self, *args, **kwargs):
        # Check if status is changing to INACTIVE
        if self.pk:
            old_instance = Course.objects.get(pk=self.pk)
            if old_instance.status == 'ACTIVE' and self.status == 'INACTIVE':
                # Disable related Enrollments
                self.enrollments.filter(status='ACTIVE').update(status='CANCELLED')
                
                # Stop/Cancel related ClassSessions
                # "le cours c'ets la source de descartivation de planing.. pour tjr"
                # We should set end_date=today for all active sessions
                from planning.models import ClassSession
                today = timezone.now().date()
                ClassSession.objects.filter(
                    course=self,
                    end_date__isnull=True
                ).update(end_date=today)
                
                ClassSession.objects.filter(
                    course=self,
                    end_date__gt=today
                ).update(end_date=today)

        super().save(*args, **kwargs)

class Enrollment(models.Model):
    """Student enrollments in courses with flexible pricing"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    BILLING_PLAN_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly (3 months)'),
    ]
    
    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.PROTECT,
        related_name='enrollments'
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    billing_plan = models.CharField(
        max_length=20,
        choices=BILLING_PLAN_CHOICES,
        default='MONTHLY',
        help_text="Plan used for future automatic subscription periods."
    )
    
    # Flexible pricing fields
    default_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Original course price at time of enrollment"
    )
    custom_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Actual price charged (admin can override)"
    )
    is_promotional = models.BooleanField(
        default=False,
        help_text="Whether a promotional rule was suggested"
    )
    promotional_reason = models.CharField(
        max_length=255,
        blank=True,
        help_text="Reason for promotional pricing"
    )
    is_free_offer = models.BooleanField(
        default=False,
        help_text="Whether this enrollment was auto-added as a free offer course"
    )
    notes = models.TextField(blank=True)
    
    # Backward compatibility property
    @property
    def is_active(self):
        return self.status == 'ACTIVE'

    class Meta:
        unique_together = ('student', 'course', 'academic_year')
        ordering = ['-enrolled_at']

    def __str__(self):
        return f"{self.student} enrolled in {self.course}"
    
    @property
    def final_price(self):
        """Returns the price that will be charged."""
        return self.custom_price


class Subscription(models.Model):
    """Payment subscription for an enrollment (monthly or quarterly)"""
    SUBSCRIPTION_TYPE_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly (3 months)'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    subscription_type = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_TYPE_CHOICES,
        default='MONTHLY'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Amount to be paid for this subscription period"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-start_date']
        unique_together = ('enrollment', 'start_date', 'end_date')
    
    def __str__(self):
        return f"{self.enrollment} - {self.get_subscription_type_display()} ({self.start_date} to {self.end_date})"


class AcademySettings(models.Model):
    """
    Singleton model – only one row ever exists (pk=1).
    Stores school-wide configurable settings that admins can change at runtime
    without touching code or environment variables.
    """

    # ── Course Offer ──────────────────────────────────────────────────────────
    school_name = models.CharField(max_length=255, default="The Musical Academy")
    school_address = models.CharField(max_length=255, blank=True, default="à coté du café LE CAVALLI, Av. Taha Houcine, Fès 30050")
    school_city = models.CharField(max_length=100, blank=True, default="Fès")
    school_postal_code = models.CharField(max_length=20, blank=True, default="30050")
    school_phone = models.CharField(max_length=50, blank=True, default="+212 695-969711")
    school_email = models.EmailField(blank=True, default="contact@themusicalacademy.net")
    school_description = models.TextField(blank=True, default="The Musical Academy est une école de musique proposant des cours pour tous les niveaux et tous les âges.")
    school_country = models.CharField(max_length=100, blank=True, default="Maroc")
    school_tax_id = models.CharField(max_length=100, blank=True, default="")

    offer_enabled = models.BooleanField(
        default=False,
        help_text="When enabled, students automatically receive the free course on their first enrollment.",
    )
    free_course = models.ForeignKey(
        'Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        help_text="The course offered for free (e.g. Solfège). Leave blank to disable the offer.",
    )
    offer_max_times = models.PositiveSmallIntegerField(
        default=1,
        help_text="How many times a student can receive the free course offer.",
    )

    class Meta:
        verbose_name = "Academy Settings"
        verbose_name_plural = "Academy Settings"

    def __str__(self):
        return "Academy Settings"

    def save(self, *args, **kwargs):
        # Force singleton: always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        """Return the singleton instance, creating it with defaults if it doesn't exist."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
