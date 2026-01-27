from django.db import models
from django.utils import timezone


class Enrollment(models.Model):
    """
    Links students to courses with enrollment-specific metadata and pricing.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    student = models.ForeignKey(
        'users.StudentProfile',
        on_delete=models.CASCADE,
        related_name='enrollment_records'
    )
    course = models.ForeignKey(
        'academics.Course',
        on_delete=models.CASCADE,
        related_name='enrollment_records'
    )
    
    # Enrollment metadata
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE'
    )
    
    # Pricing fields
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
    
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-enrolled_at']
        unique_together = ['student', 'course']
    
    def __str__(self):
        return f"{self.student} enrolled in {self.course}"
    
    @property
    def final_price(self):
        """Returns the price that will be charged."""
        return self.custom_price


class Subscription(models.Model):
    """
    Payment subscription for an enrollment (monthly or quarterly).
    """
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
    
    def __str__(self):
        return f"{self.enrollment} - {self.get_subscription_type_display()} ({self.start_date} to {self.end_date})"


class Payment(models.Model):
    """
    Individual payment transaction for a subscription.
    """
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('CARD', 'Card'),
        ('TRANSFER', 'Bank Transfer'),
        ('CHECK', 'Check'),
    ]
    
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    student = models.ForeignKey(
        'users.StudentProfile',
        on_delete=models.CASCADE,
        related_name='enrollment_payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES
    )
    receipt_number = models.CharField(max_length=50, unique=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"Payment {self.receipt_number} - {self.student} - {self.amount}€"
