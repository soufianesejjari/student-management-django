"""
Serializers for Enrollment, Subscription, and Payment models.
"""
from rest_framework import serializers
from .models import Enrollment, Subscription, Payment
from academics.models import Course
from users.models import StudentProfile


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_name = serializers.SerializerMethodField()
    course_subject = serializers.SerializerMethodField()
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_name', 'course', 'course_name', 'course_subject',
            'enrolled_at', 'status', 'default_price', 'custom_price',
            'is_promotional', 'promotional_reason', 'notes', 'final_price'
        ]
        read_only_fields = ['enrolled_at',  'final_price']
    
    def get_student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    
    def get_course_name(self, obj):
        return obj.course.name
    
    def get_course_subject(self, obj):
        return obj.course.subject.name if obj.course.subject else None


class EnrollmentCreateSerializer(serializers.ModelSerializer):
    """
    Specialized serializer for creating enrollments with pricing calculation.
    """
    subscription_type = serializers.ChoiceField(
        choices=Subscription.SUBSCRIPTION_TYPE_CHOICES,
        write_only=True,
        required=True
    )
    subscription_start_date = serializers.DateField(write_only=True, required=True)
    is_free_offer = serializers.BooleanField(write_only=True, required=False, default=False)
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'course', 'custom_price', 'notes',
            'subscription_type', 'subscription_start_date', 'is_free_offer'
        ]
    
    def validate(self, attrs):
        # Check for duplicate enrollment
        student = attrs['student']
        course = attrs['course']

        existing = Enrollment.objects.filter(
            student=student,
            course=course,
            status='ACTIVE'
        ).exists()
        
        if existing:
            raise serializers.ValidationError(
                "Student is already enrolled in this course."
            )
        
        return attrs
    
    def create(self, validated_data):
        from enrollments.services import EnrollmentService
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta
        
        subscription_type = validated_data.pop('subscription_type')
        subscription_start_date = validated_data.pop('subscription_start_date')
        is_free_offer = validated_data.pop('is_free_offer', False)
        
        student = validated_data['student']
        course = validated_data['course']
        custom_price = validated_data.get('custom_price')
        
        # Get suggested pricing
        pricing = EnrollmentService.suggest_enrollment_price(student.id, course.id)
        
        # Create enrollment
        effective_custom_price = 0 if is_free_offer else (
            custom_price if custom_price is not None else pricing['suggested_price']
        )
        effective_is_promotional = pricing['is_promotional'] or is_free_offer
        effective_reason = pricing['reason'] if pricing['reason'] else (
            "Free course offer" if is_free_offer else ""
        )

        enrollment = Enrollment.objects.create(
            student=student,
            course=course,
            default_price=pricing['default_price'],
            custom_price=effective_custom_price,
            is_promotional=effective_is_promotional,
            promotional_reason=effective_reason,
            notes=validated_data.get('notes', '')
        )
        
        # Calculate subscription end date
        if subscription_type == 'MONTHLY':
            end_date = subscription_start_date + relativedelta(months=1) - timedelta(days=1)
        else:  # QUARTERLY
            end_date = subscription_start_date + relativedelta(months=3) - timedelta(days=1)
        
        # Create initial subscription
        Subscription.objects.create(
            enrollment=enrollment,
            subscription_type=subscription_type,
            start_date=subscription_start_date,
            end_date=end_date,
            amount=enrollment.custom_price
        )
        
        return enrollment


class SubscriptionSerializer(serializers.ModelSerializer):
    enrollment_details = EnrollmentSerializer(source='enrollment', read_only=True)
    student_name = serializers.SerializerMethodField()
    course_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'enrollment', 'enrollment_details', 'student_name', 'course_name',
            'subscription_type', 'start_date', 'end_date', 'amount',
            'payment_status', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_student_name(self, obj):
        return f"{obj.enrollment.student.user.first_name} {obj.enrollment.student.user.last_name}"
    
    def get_course_name(self, obj):
        return obj.enrollment.course.name


class PaymentSerializer(serializers.ModelSerializer):
    subscription_details = SubscriptionSerializer(source='subscription', read_only=True)
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'subscription', 'subscription_details', 'student', 'student_name',
            'amount', 'payment_date', 'payment_method', 'receipt_number', 'notes'
        ]
        read_only_fields = ['payment_date']
    
    def get_student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    
    def create(self, validated_data):
        import uuid
        
        # Auto-generate receipt number if not provided
        if 'receipt_number' not in validated_data or not validated_data['receipt_number']:
            validated_data['receipt_number'] = f"RCP-{uuid.uuid4().hex[:8].upper()}"
        
        # Create payment
        payment = super().create(validated_data)
        
        # Update subscription status to PAID
        subscription = payment.subscription
        subscription.payment_status = 'PAID'
        subscription.save()
        
        return payment
