from django.db import models

class Subject(models.Model):
    """Musical instruments or subject areas (Piano, Guitar, Solfège, etc.)"""
    name = models.CharField(max_length=100, unique=True)
    color_code = models.CharField(max_length=20, default='#3788d8')

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

class Enrollment(models.Model):
    """Student enrollments in courses"""
    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student} enrolled in {self.course}"
