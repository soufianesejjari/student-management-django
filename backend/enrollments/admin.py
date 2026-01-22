from django.contrib import admin
from .models import Enrollment, Subscription, Payment

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'status', 'custom_price', 'is_promotional', 'enrolled_at']
    list_filter = ['status', 'is_promotional', 'enrolled_at']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'course__name']
    readonly_fields = ['enrolled_at', 'default_price']

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'subscription_type', 'start_date', 'end_date', 'amount', 'payment_status']
    list_filter = ['subscription_type', 'payment_status', 'created_at']
    search_fields = ['enrollment__student__user__first_name', 'enrollment__course__name']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'student', 'amount', 'payment_method', 'payment_date']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['receipt_number', 'student__user__first_name', 'student__user__last_name']
    readonly_fields = ['payment_date']
