from rest_framework import serializers
from .models import Payment, Expense

class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'student', 'student_name', 'amount', 'date', 'method', 'status', 'invoice_ref', 'created_at']

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'description', 'amount', 'date', 'category', 'status', 'created_at']
