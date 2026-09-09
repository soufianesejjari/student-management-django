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
            'is_promotional', 'promotional_reason', 'is_free_offer', 'notes', 'final_price'
        ]
        read_only_fields = ['enrolled_at', 'final_price']
    
    def get_student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
    
    def get_course_name(self, obj):
        return obj.course.name
    
    def get_course_subject(self, obj):
        return obj.course.subject.name if obj.course.subject else None


class EnrollmentCreateSerializer(serializers.ModelSerializer):
    """
    Specialized serializer for creating enrollments with pricing calculation.
    Automatically adds the configured free course (e.g. Solfège) if the student
    does not already have it and has never received the offer before.
    """
    subscription_type = serializers.ChoiceField(
        choices=Subscription.SUBSCRIPTION_TYPE_CHOICES,
        write_only=True,
        required=True
    )
    subscription_start_date = serializers.DateField(write_only=True, required=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'course', 'custom_price', 'notes',
            'subscription_type', 'subscription_start_date',
        ]

    def validate(self, attrs):
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

    def _create_single_enrollment(self, student, course, custom_price, subscription_type,
                                   subscription_start_date, notes='', is_free_offer=False):
        """Helper: create one Enrollment + its first Subscription."""
        from enrollments.services import EnrollmentService
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta

        pricing = EnrollmentService.suggest_enrollment_price(student.id, course.id)

        if is_free_offer:
            effective_price = 0
            is_promotional = True
            promotional_reason = pricing.get('offer_reason') or 'Free course offer'
        else:
            effective_price = custom_price if custom_price is not None else pricing['suggested_price']
            is_promotional = pricing['is_promotional']
            promotional_reason = pricing['reason']

        enrollment = Enrollment.objects.create(
            student=student,
            course=course,
            default_price=pricing['default_price'],
            custom_price=effective_price,
            is_promotional=is_promotional,
            promotional_reason=promotional_reason,
            is_free_offer=is_free_offer,
            notes=notes,
        )

        period_months = {
            'MONTHLY': 1,
            'QUARTERLY': 3,
            'ANNUAL': 12,
        }[subscription_type]
        end_date = subscription_start_date + relativedelta(months=period_months) - timedelta(days=1)

        Subscription.objects.create(
            enrollment=enrollment,
            subscription_type=subscription_type,
            start_date=subscription_start_date,
            end_date=end_date,
            amount=enrollment.custom_price,
        )

        return enrollment

    def create(self, validated_data):
        from enrollments.services import EnrollmentService

        subscription_type = validated_data.pop('subscription_type')
        subscription_start_date = validated_data.pop('subscription_start_date')

        student = validated_data['student']
        course = validated_data['course']
        custom_price = validated_data.get('custom_price')
        notes = validated_data.get('notes', '')

        # Create the main enrollment
        enrollment = self._create_single_enrollment(
            student=student,
            course=course,
            custom_price=custom_price,
            subscription_type=subscription_type,
            subscription_start_date=subscription_start_date,
            notes=notes,
            is_free_offer=False,
        )

        # Auto-add the free offer course if the student qualifies
        # (only after the main enrollment is saved, so the check is up to date)
        qualifies, free_course, _ = EnrollmentService.student_qualifies_for_free_offer(student)

        # Do not offer the free course if the student just enrolled in it
        offer = EnrollmentService.get_offer_settings()
        if qualifies and free_course and course.id != offer.get('free_course_id'):
            self._create_single_enrollment(
                student=student,
                course=free_course,
                custom_price=0,
                subscription_type=subscription_type,
                subscription_start_date=subscription_start_date,
                notes='Auto-added free offer course',
                is_free_offer=True,
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
