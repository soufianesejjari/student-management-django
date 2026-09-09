from django.db import models
from users.models import StudentProfile

class Payment(models.Model):
    PLAN_CHOICES = (
        ('MONTHLY', 'Monthly'),
        ('TRIMESTER', 'Trimester'),
        ('ANNUAL', 'Annual'),
    )
    METHOD_CHOICES = (
        ('CARD', 'Credit Card'),
        ('TRANSFER', 'Bank Transfer'),
        ('CASH', 'Cash'),
        ('CHECK', 'Check'),
    )
    STATUS_CHOICES = (
        ('PAID', 'Paid'),
        ('PENDING', 'Pending'),
        ('LATE', 'Late'),
    )

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='payments')
    subscription = models.ForeignKey(
        'academics.Subscription',
        on_delete=models.CASCADE,
        related_name='payments',
        null=True,
        blank=True,
        help_text="Link to subscription (if applicable)"
    )
    student_fee = models.ForeignKey(
        'academics.StudentFee',
        on_delete=models.CASCADE,
        related_name='payments',
        null=True,
        blank=True,
        help_text="Link to one-time student fee (if applicable)"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    invoice_ref = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.invoice_ref} - {self.student.user.username} - {self.amount}"

class Expense(models.Model):
    CATEGORY_CHOICES = (
        ('SALARY', 'Salary'),
        ('RENT', 'Rent'),
        ('UTILITIES', 'Utilities'),
        ('EQUIPMENT', 'Equipment'),
        ('MAINTENANCE', 'Maintenance'),
        ('OTHER', 'Other'),
    )
    STATUS_CHOICES = (
        ('PAID', 'Paid'),
        ('PENDING', 'Pending'),
    )

    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PAID')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} - {self.amount}"
