from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    pass
    # We can add is_admin flag if needed, but is_staff/is_superuser usually suffice for Django.
    # The design asked for is_admin, so let's add it for explicit role handling if needed,
    # or we can rely on is_staff for "Admin" role.
    # Given "only 1 role is the admin responsible for everything", we might just use is_superuser.
    # But let's add the field to be consistent with the design request.
    is_admin = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return self.username

class StudentProfile(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('ARCHIVED', 'Archived'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    enrollment_date = models.DateField(auto_now_add=True)
    parent_name = models.CharField(max_length=255, null=True, blank=True)
    parent_phone = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    def __str__(self):
        return f"Student: {self.user.username}"

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
