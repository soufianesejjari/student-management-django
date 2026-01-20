from django.db import models
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

class ClassSession(models.Model):
    """The core scheduling unit - represents a recurring class session"""
    course = models.ForeignKey('academics.Course', on_delete=models.CASCADE, related_name='sessions')
    teacher = models.ForeignKey('users.TeacherProfile', on_delete=models.CASCADE, related_name='sessions')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='sessions')
    day_of_week = models.IntegerField(help_text="0=Monday, 6=Sunday")
    start_time = models.TimeField()
    end_time = models.TimeField()
    start_date = models.DateField(help_text="When this session plan starts")
    end_date = models.DateField(help_text="When this session plan ends")
    recurrence_rule = models.CharField(max_length=255, blank=True, null=True, help_text="RRULE format for complex recurrence")

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return f"{self.course.name} - {days[self.day_of_week]} {self.start_time}-{self.end_time} ({self.room.name})"

    def clean(self):
        """Validate no conflicts for room and teacher"""
        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time")

        # Check room conflicts
        room_conflicts = ClassSession.objects.filter(
            room=self.room,
            day_of_week=self.day_of_week
        ).filter(
            Q(start_time__lt=self.end_time, end_time__gt=self.start_time)
        ).exclude(pk=self.pk)

        if room_conflicts.exists():
            raise ValidationError(f"Room {self.room.name} is already booked at this time")

        # Check teacher conflicts
        teacher_conflicts = ClassSession.objects.filter(
            teacher=self.teacher,
            day_of_week=self.day_of_week
        ).filter(
            Q(start_time__lt=self.end_time, end_time__gt=self.start_time)
        ).exclude(pk=self.pk)

        if teacher_conflicts.exists():
            raise ValidationError(f"Teacher {self.teacher.user.get_full_name()} already has a class at this time")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
