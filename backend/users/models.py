from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):

    class Role(models.TextChoices):
        ADMIN = 'admin', _('Admin')
        SECRETAIRE = 'secretaire', _('Secrétaire')
        STUDENT = 'student', _('Student record')
        TEACHER = 'teacher', _('Teacher record')

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ADMIN,
        help_text=_('Role determines base access level'),
    )
    # Keep is_admin for backwards compatibility — kept in sync via save()
    is_admin = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def save(self, *args, **kwargs):
        # Keep is_admin in sync with role field
        self.is_admin = self.role == self.Role.ADMIN
        super().save(*args, **kwargs)

    @property
    def is_secretaire(self):
        return self.role == self.Role.SECRETAIRE

    def __str__(self):
        return self.username


class StudentProfile(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('ARCHIVED', 'Archived'),
    )
    AGE_GROUP_CHOICES = (
        ('2-5ans', '2-5ans'),
        ('6-12ans', '6-12ans'),
        ('Adulte', 'Adulte'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    enrollment_date = models.DateField(auto_now_add=True)
    parent_name = models.CharField(max_length=255, null=True, blank=True)
    parent_phone = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    address = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    age_group = models.CharField(max_length=20, choices=AGE_GROUP_CHOICES, default='6-12ans')
    school_or_profession = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return f"Student: {self.user.username}"

    @property
    def registration_form_ready(self):
        """A fiche is complete once its exact planning (or future teacher) is known."""
        from academics.models import AcademicYear

        academic_year = AcademicYear.get_active()
        enrollments = self.enrollments.filter(
            status='ACTIVE',
            academic_year=academic_year,
        ).select_related('course__default_teacher')
        for enrollment in enrollments:
            if enrollment.assigned_sessions.exists():
                return True
            has_planning = enrollment.course.sessions.filter(academic_year=academic_year).exists()
            if not has_planning and enrollment.course.default_teacher_id:
                return True
        return False

class TeacherProfile(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('ON_LEAVE', 'On Leave'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    speciality = models.CharField(max_length=100)
    bio = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    color_code = models.CharField(max_length=20, default='#3788d8') # Default blue for calendar
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Pay rate per hour in currency units")
    cin = models.CharField(max_length=50, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return f"Teacher: {self.user.username}"

class TeacherAvailability(models.Model):
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.IntegerField(help_text="0=Monday, 6=Sunday")
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_preferred = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.teacher} - Day {self.day_of_week}: {self.start_time}-{self.end_time}"

class TeacherPreferences(models.Model):
    teacher = models.OneToOneField(TeacherProfile, on_delete=models.CASCADE, related_name='preferences')
    min_consecutive_hours = models.IntegerField(default=1)
    max_daily_hours = models.IntegerField(default=8)
    max_gaps_per_day = models.IntegerField(default=1, help_text="Max gap duration in hours")

    def __str__(self):
        return f"Prefs for {self.teacher}"
