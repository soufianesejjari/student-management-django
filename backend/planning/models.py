from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Q

class Room(models.Model):
    """Salles/Rooms for classes"""
    name = models.CharField(max_length=100, unique=True)
    capacity = models.IntegerField(default=10)
    resources = models.TextField(blank=True, help_text="e.g., Grand Piano, Projector")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class SessionInstance(models.Model):
    """Individual occurrence of a class session (for exceptions/rescheduling)"""
    class_session = models.ForeignKey('ClassSession', on_delete=models.CASCADE, related_name='instances')
    original_date = models.DateField()
    
    # Rescheduling fields
    is_rescheduled = models.BooleanField(default=False)
    new_date = models.DateField(null=True, blank=True)
    new_start_time = models.TimeField(null=True, blank=True)
    new_end_time = models.TimeField(null=True, blank=True)
    new_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Cancellation field
    is_cancelled = models.BooleanField(default=False)
    
    # Attendance field for teacher
    teacher_is_absent = models.BooleanField(default=False)
    
    # Audit
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('class_session', 'original_date')
        ordering = ['original_date']

    def __str__(self):
        status = "Cancelled" if self.is_cancelled else "Rescheduled" if self.is_rescheduled else "Normal"
        return f"{self.class_session} - {self.original_date} ({status})"


class TeacherMonthlyPayroll(models.Model):
    """Validated monthly salary calculation for a teacher, linked to an expense."""

    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('VALIDATED', 'Validated'),
    )

    teacher = models.ForeignKey('users.TeacherProfile', on_delete=models.CASCADE, related_name='monthly_payrolls')
    academic_year = models.ForeignKey('academics.AcademicYear', on_delete=models.PROTECT, related_name='teacher_payrolls')
    expense = models.OneToOneField(
        'finances.Expense',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='teacher_payroll',
    )
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    total_sessions = models.PositiveIntegerField(default=0)
    cancelled_sessions = models.PositiveIntegerField(default=0)
    absent_sessions = models.PositiveIntegerField(default=0)
    total_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    worked_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    validated_at = models.DateTimeField(null=True, blank=True)
    reopened_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_teacher_payrolls',
    )
    reopened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reopened_teacher_payrolls',
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('teacher', 'academic_year', 'year', 'month')
        ordering = ['-year', '-month', 'teacher__user__last_name']

    def __str__(self):
        return f"{self.teacher} payroll {self.year}-{self.month:02d} ({self.status})"

class ClassSession(models.Model):
    """The core scheduling unit - represents a recurring class session"""
    course = models.ForeignKey('academics.Course', on_delete=models.CASCADE, related_name='sessions')
    academic_year = models.ForeignKey('academics.AcademicYear', on_delete=models.PROTECT, related_name='sessions')
    teacher = models.ForeignKey('users.TeacherProfile', on_delete=models.CASCADE, related_name='sessions')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='sessions')
    day_of_week = models.IntegerField(help_text="0=Monday, 6=Sunday")
    start_time = models.TimeField()
    end_time = models.TimeField()
    start_date = models.DateField(help_text="When this session plan starts")
    end_date = models.DateField(null=True, blank=True, help_text="When this session plan ends (None = Indefinite)")
    recurrence_rule = models.CharField(max_length=255, blank=True, null=True, help_text="RRULE format for complex recurrence")

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return f"{self.course.name} - {days[self.day_of_week]} {self.start_time}-{self.end_time} ({self.room.name})"

    def get_student_conflicts(self):
        """
        Check if any enrolled students have other classes at this time.
        Returns a list of dictionaries with student info and conflicting session.
        """
        conflicts = []
        # Only students explicitly assigned to this exact recurring session
        # are affected by a change to this planning slot.
        enrolled_students = self.student_enrollments.filter(
            status='ACTIVE',
            academic_year=self.academic_year,
        ).select_related('student__user')
        
        for enrollment in enrolled_students:
            student = enrollment.student
            
            # Find overlapping sessions for this student
            # Conflict condition: Same day AND Overlapping Time
            student_sessions = ClassSession.objects.filter(
                academic_year=self.academic_year,
                student_enrollments__student=student,
                student_enrollments__status='ACTIVE',
                student_enrollments__academic_year=self.academic_year,
                day_of_week=self.day_of_week
            ).filter(
                # (StartA < EndB) and (EndA > StartB)
                Q(start_time__lt=self.end_time, end_time__gt=self.start_time)
            ).exclude(pk=self.pk).distinct()

            if student_sessions.exists():
                for conflict_session in student_sessions:
                    conflicts.append({
                        'student_name': student.user.get_full_name() or student.user.username,
                        'student_id': student.id,
                        'conflicting_session': str(conflict_session),
                        'conflicting_course': conflict_session.course.name
                    })
        
        return conflicts

    def clean(self):
        """Validate no conflicts for room and teacher"""
        from academics.models import AcademicYear

        if not self.academic_year_id:
            self.academic_year = AcademicYear.get_active()

        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time")

        if not (self.academic_year.start_date <= self.start_date <= self.academic_year.end_date):
            raise ValidationError("Session start date must be inside the academic year")

        if self.end_date and not (self.academic_year.start_date <= self.end_date <= self.academic_year.end_date):
            raise ValidationError("Session end date must be inside the academic year")

        effective_end_date = self.end_date or self.academic_year.end_date

        # Check room conflicts
        room_conflicts = ClassSession.objects.filter(
            academic_year=self.academic_year,
            room=self.room,
            day_of_week=self.day_of_week
        ).filter(
            Q(start_date__lte=effective_end_date) &
            (Q(end_date__gte=self.start_date) | Q(end_date__isnull=True)) &
            Q(start_time__lt=self.end_time, end_time__gt=self.start_time)
        ).exclude(pk=self.pk)

        if room_conflicts.exists():
            raise ValidationError(f"Room {self.room.name} is already booked at this time")

        # Check teacher conflicts
        teacher_conflicts = ClassSession.objects.filter(
            academic_year=self.academic_year,
            teacher=self.teacher,
            day_of_week=self.day_of_week
        ).filter(
            Q(start_date__lte=effective_end_date) &
            (Q(end_date__gte=self.start_date) | Q(end_date__isnull=True)) &
            Q(start_time__lt=self.end_time, end_time__gt=self.start_time)
        ).exclude(pk=self.pk)

        if teacher_conflicts.exists():
            raise ValidationError(f"Teacher {self.teacher.user.get_full_name()} already has a class at this time")
        
        # NOTE: Student conflicts are NOT checked here to allow "Soft" validation (Force option)
        # They should be checked in the View/Service layer using get_student_conflicts()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
