from rest_framework import serializers
from .models import AcademicYear, Subject, Course, Enrollment, Subscription, StudentFee
from users.models import StudentProfile
from django.db.models import Sum
from planning.models import ClassSession


def _sessions_overlap(left, right, academic_year):
    """Return whether two recurring sessions can occur at the same time."""
    left_end = left.end_date or academic_year.end_date
    right_end = right.end_date or academic_year.end_date
    return (
        left.pk != right.pk
        and left.day_of_week == right.day_of_week
        and left.start_date <= right_end
        and right.start_date <= left_end
        and left.start_time < right.end_time
        and left.end_time > right.start_time
    )


def validate_enrollment_sessions(student, course, academic_year, sessions, instance=None):
    """Validate exact session assignments for one enrollment."""
    sessions = list(sessions)
    invalid = [
        session for session in sessions
        if session.course_id != course.id or session.academic_year_id != academic_year.id
    ]
    if invalid:
        raise serializers.ValidationError({
            'assigned_sessions': "Chaque créneau doit appartenir au cours et à l'année scolaire de l'inscription."
        })

    other_enrollment_ids = (
        Enrollment.objects
        .filter(student=student, academic_year=academic_year, status='ACTIVE')
        .exclude(pk=getattr(instance, 'pk', None))
        .values_list('pk', flat=True)
    )
    other_sessions = list(
        ClassSession.objects
        .filter(student_enrollments__id__in=other_enrollment_ids)
        .select_related('course')
        .distinct()
    )

    checked = []
    for session in sessions:
        for other in other_sessions + checked:
            if _sessions_overlap(session, other, academic_year):
                raise serializers.ValidationError({
                    'assigned_sessions': (
                        f"Conflit de planning avec {other.course.name} "
                        f"({other.start_time.strftime('%H:%M')}-{other.end_time.strftime('%H:%M')})."
                    )
                })
        checked.append(session)

    return sessions

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'created_at']
        read_only_fields = ['created_at']


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
        academic_year_id = self.context.get('academic_year_id')
        queryset = obj.enrollments.filter(status='ACTIVE')
        if academic_year_id:
            queryset = queryset.filter(academic_year_id=academic_year_id)
        else:
            queryset = queryset.filter(academic_year=AcademicYear.get_active())
        return queryset.count()

    def get_schedule_summary(self, obj):
        academic_year_id = self.context.get('academic_year_id')
        sessions = obj.sessions.all()
        if academic_year_id:
            sessions = sessions.filter(academic_year_id=academic_year_id)
        else:
            sessions = sessions.filter(academic_year=AcademicYear.get_active())
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
    student_phone = serializers.SerializerMethodField()
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_subject = serializers.CharField(source='course.subject.name', read_only=True)
    assigned_sessions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ClassSession.objects.all(),
        required=False,
    )
    assigned_session_details = serializers.SerializerMethodField()
    needs_schedule_assignment = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_name', 'student_phone', 'academic_year', 'academic_year_name',
            'course', 'course_name', 'course_subject',
            'assigned_sessions', 'assigned_session_details', 'needs_schedule_assignment',
            'enrolled_at', 'status', 'billing_plan', 'default_price', 'custom_price',
            'is_promotional', 'promotional_reason', 'is_free_offer', 'notes', 'final_price',
            'is_active'
        ]
        read_only_fields = ['enrolled_at', 'final_price', 'is_active']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() or obj.student.user.username

    def get_student_phone(self, obj):
        return obj.student.phone or obj.student.parent_phone or ""

    def get_assigned_session_details(self, obj):
        return [
            {
                'id': session.id,
                'day_of_week': session.day_of_week,
                'start_time': session.start_time.isoformat(),
                'end_time': session.end_time.isoformat(),
                'start_date': session.start_date.isoformat(),
                'end_date': session.end_date.isoformat() if session.end_date else None,
                'teacher_name': session.teacher.user.get_full_name() or session.teacher.user.username,
                'room_name': session.room.name,
            }
            for session in obj.assigned_sessions.all()
        ]

    def get_needs_schedule_assignment(self, obj):
        return obj.status == 'ACTIVE' and not obj.assigned_sessions.exists()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        assignment_fields = {'assigned_sessions', 'student', 'course', 'academic_year'}
        if assignment_fields.intersection(attrs):
            student = attrs.get('student') or self.instance.student
            course = attrs.get('course') or self.instance.course
            academic_year = attrs.get('academic_year') or self.instance.academic_year
            sessions = attrs.get('assigned_sessions', self.instance.assigned_sessions.all())
            validate_enrollment_sessions(
                student,
                course,
                academic_year,
                sessions,
                self.instance,
            )
        return attrs

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
    academic_year = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.all(),
        required=False,
        allow_null=True,
        default=AcademicYear.get_active,
    )
    assigned_sessions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ClassSession.objects.all(),
        required=False,
    )
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'course', 'academic_year', 'custom_price', 'notes',
            'subscription_type', 'subscription_start_date', 'is_free_offer', 'assigned_sessions'
        ]

    def validate_academic_year(self, value):
        return value or AcademicYear.get_active()
    
    def validate(self, attrs):
        # Check for duplicate enrollment
        student = attrs['student']
        course = attrs['course']
        academic_year = attrs.get('academic_year') or AcademicYear.get_active()
        attrs['academic_year'] = academic_year

        existing = Enrollment.objects.filter(
            student=student,
            course=course,
            academic_year=academic_year,
            status='ACTIVE'
        ).exists()
        
        if existing:
            raise serializers.ValidationError(
                "Student is already enrolled in this course for this academic year."
            )

        subscription_start_date = attrs.get('subscription_start_date')
        if subscription_start_date and not (academic_year.start_date <= subscription_start_date <= academic_year.end_date):
            raise serializers.ValidationError(
                "Subscription start date must be inside the selected academic year."
            )

        if 'assigned_sessions' in attrs:
            validate_enrollment_sessions(
                student,
                course,
                academic_year,
                attrs['assigned_sessions'],
            )
        
        return attrs
    
    def create(self, validated_data):
        from .services import BillingService, EnrollmentService
        
        subscription_type = validated_data.pop('subscription_type')
        subscription_start_date = validated_data.pop('subscription_start_date')
        is_free_offer = validated_data.pop('is_free_offer', False)
        assigned_sessions = validated_data.pop('assigned_sessions', None)
        
        student = validated_data['student']
        course = validated_data['course']
        academic_year = validated_data['academic_year']
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
            academic_year=academic_year,
            billing_plan=subscription_type,
            default_price=pricing['default_price'],
            custom_price=effective_custom_price,
            is_promotional=effective_is_promotional,
            promotional_reason=effective_reason,
            is_free_offer=is_free_offer,
            notes=validated_data.get('notes', '')
        )

        if assigned_sessions is None:
            available_sessions = list(
                ClassSession.objects.filter(course=course, academic_year=academic_year)[:2]
            )
            assigned_sessions = available_sessions if len(available_sessions) == 1 else []
        enrollment.assigned_sessions.set(assigned_sessions)
        
        BillingService.create_subscription_for_period(
            enrollment=enrollment,
            subscription_type=subscription_type,
            start_date=subscription_start_date,
        )
        
        return enrollment

class SubscriptionSerializer(serializers.ModelSerializer):
    enrollment_details = EnrollmentSerializer(source='enrollment', read_only=True)
    student_name = serializers.SerializerMethodField()
    course_name = serializers.SerializerMethodField()
    course_id = serializers.IntegerField(source='enrollment.course_id', read_only=True)
    student_id = serializers.IntegerField(source='enrollment.student_id', read_only=True)
    academic_year = serializers.IntegerField(source='enrollment.academic_year_id', read_only=True)
    academic_year_name = serializers.CharField(source='enrollment.academic_year.name', read_only=True)
    amount_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'enrollment', 'enrollment_details', 'student_name', 'course_name',
            'course_id', 'student_id', 'academic_year', 'academic_year_name',
            'subscription_type', 'start_date', 'end_date', 'amount',
            'payment_status', 'amount_paid', 'balance', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_student_name(self, obj):
        return obj.enrollment.student.user.get_full_name() or obj.enrollment.student.user.username
    
    def get_course_name(self, obj):
        return obj.enrollment.course.name

    def get_amount_paid(self, obj):
        paid = obj.payments.filter(status='PAID').aggregate(total=Sum('amount'))['total'] or 0
        return float(paid)

    def get_balance(self, obj):
        paid = obj.payments.filter(status='PAID').aggregate(total=Sum('amount'))['total'] or 0
        return float(max(obj.amount - paid, 0))


class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    amount_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = StudentFee
        fields = [
            'id', 'student', 'student_name', 'academic_year', 'academic_year_name',
            'fee_type', 'amount', 'status', 'due_date', 'amount_paid', 'balance',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'amount_paid', 'balance']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() or obj.student.user.username

    def get_amount_paid(self, obj):
        paid = obj.payments.filter(status='PAID').aggregate(total=Sum('amount'))['total'] or 0
        return float(paid)

    def get_balance(self, obj):
        paid = obj.payments.filter(status='PAID').aggregate(total=Sum('amount'))['total'] or 0
        return float(max(obj.amount - paid, 0))
