from rest_framework import serializers
from .models import Subject, Course, Enrollment, Subscription
from users.models import StudentProfile
from django.db.models import Count

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'color_code', 'subject_type']

class CourseSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()
    schedule_summary = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'subject', 'subject_name', 'level', 'default_teacher', 'teacher_name', 'price', 'status', 'enrollment_count', 'schedule_summary', 'created_at']

    def get_teacher_name(self, obj):
        if obj.default_teacher:
            return obj.default_teacher.user.get_full_name() or obj.default_teacher.user.username
        return None

    def get_enrollment_count(self, obj):
        return obj.enrollments.filter(status='ACTIVE').count()

    def get_schedule_summary(self, obj):
        sessions = obj.sessions.all()
        if not sessions.exists():
            return "Non planifié"
        
        days_map = {0: 'Lun', 1: 'Mar', 2: 'Mer', 3: 'Jeu', 4: 'Ven', 5: 'Sam', 6: 'Dim'}
        res = []
        for s in sessions:
            day = days_map.get(s.day_of_week, '')
            start = s.start_time.strftime("%H:%M")
            end = s.end_time.strftime("%H:%M")
            res.append(f"{day} {start}-{end}")
        return ", ".join(res)

class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_subject = serializers.CharField(source='course.subject.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_name', 'course', 'course_name', 'course_subject',
            'enrolled_at', 'status', 'default_price', 'custom_price',
            'is_promotional', 'promotional_reason', 'notes', 'final_price',
            'is_active'
        ]
        read_only_fields = ['enrolled_at', 'final_price', 'is_active']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() or obj.student.user.username

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
        from .services import EnrollmentService
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
            is_free_offer=is_free_offer,
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
        return obj.enrollment.student.user.get_full_name() or obj.enrollment.student.user.username
    
    def get_course_name(self, obj):
        return obj.enrollment.course.name
