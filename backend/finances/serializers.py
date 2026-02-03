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
    class Meta:
        model = Expense
        fields = ['id', 'description', 'amount', 'date', 'category', 'status', 'created_at']
