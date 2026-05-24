from rest_framework import serializers
from .models import Payment, Expense
from academics.serializers import SubscriptionSerializer

class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_username = serializers.CharField(source='student.user.username', read_only=True)
    subscription_details = SubscriptionSerializer(source='subscription', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'student', 'student_name', 'student_username', 'subscription', 'subscription_details', 'amount', 'date', 'method', 'status', 'invoice_ref', 'notes', 'created_at']
        read_only_fields = ['created_at']

    def get_student_name(self, obj):
        full_name = obj.student.user.get_full_name()
        return full_name.strip() or obj.student.user.username

    def create(self, validated_data):
        import uuid
        
        # Auto-generate receipt number if not provided
        if 'invoice_ref' not in validated_data or not validated_data['invoice_ref']:
            validated_data['invoice_ref'] = f"INV-{uuid.uuid4().hex[:8].upper()}"
        
        payment = super().create(validated_data)
        
        # Update subscription status if fully paid
        if payment.subscription and payment.status == 'PAID':
            subscription = payment.subscription
            # Logic: If payment covers the subscription amount, mark subscription as PAID
            # For now, simple logic: if payment is linked, mark subscription as paid
            # You might want to sum up all payments for this subscription later
            subscription.payment_status = 'PAID'
            subscription.save()
            
        return payment

class ExpenseSerializer(serializers.ModelSerializer):
    salary_teacher_id = serializers.SerializerMethodField()
    salary_teacher_name = serializers.SerializerMethodField()
    salary_payroll_id = serializers.SerializerMethodField()
    salary_year = serializers.SerializerMethodField()
    salary_month = serializers.SerializerMethodField()
    salary_worked_hours = serializers.SerializerMethodField()
    salary_hourly_rate = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'description', 'amount', 'date', 'category', 'status', 'created_at',
            'salary_teacher_id', 'salary_teacher_name', 'salary_payroll_id',
            'salary_year', 'salary_month', 'salary_worked_hours', 'salary_hourly_rate',
        ]
        read_only_fields = [
            'created_at', 'salary_teacher_id', 'salary_teacher_name', 'salary_payroll_id',
            'salary_year', 'salary_month', 'salary_worked_hours', 'salary_hourly_rate',
        ]

    def _payroll(self, obj):
        try:
            return obj.teacher_payroll
        except Exception:
            return None

    def get_salary_teacher_id(self, obj):
        payroll = self._payroll(obj)
        return payroll.teacher_id if payroll else None

    def get_salary_teacher_name(self, obj):
        payroll = self._payroll(obj)
        if not payroll:
            return None
        return payroll.teacher.user.get_full_name() or payroll.teacher.user.username

    def get_salary_payroll_id(self, obj):
        payroll = self._payroll(obj)
        return payroll.id if payroll else None

    def get_salary_year(self, obj):
        payroll = self._payroll(obj)
        return payroll.year if payroll else None

    def get_salary_month(self, obj):
        payroll = self._payroll(obj)
        return payroll.month if payroll else None

    def get_salary_worked_hours(self, obj):
        payroll = self._payroll(obj)
        return float(payroll.worked_hours) if payroll else None

    def get_salary_hourly_rate(self, obj):
        payroll = self._payroll(obj)
        return float(payroll.hourly_rate) if payroll else None

    def validate(self, attrs):
        if self.instance and self._payroll(self.instance):
            changed_locked_fields = []
            for field in ('amount', 'date', 'category', 'description'):
                if field in attrs and attrs[field] != getattr(self.instance, field):
                    changed_locked_fields.append(field)
            if changed_locked_fields:
                raise serializers.ValidationError(
                    "Salary expense details are managed by teacher payroll. Reopen and revalidate the payroll to change them."
                )
        return attrs
