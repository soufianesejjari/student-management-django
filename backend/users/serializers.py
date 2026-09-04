from rest_framework import serializers
from django.contrib.auth.models import Permission
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
from .models import User, StudentProfile, TeacherProfile, TeacherAvailability, TeacherPreferences


def _generate_username(*parts):
    base = slugify(" ".join(str(part).strip() for part in parts if part)) or "user"
    username = base
    counter = 2

    while User.objects.filter(username=username).exists():
        username = f"{base}-{counter}"
        counter += 1

    return username


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_admin', 'role', 'avatar']


class UserSelfSerializer(serializers.ModelSerializer):
    """Serializer for a user editing their own profile (no password here)."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'avatar']
        read_only_fields = ['id', 'role']


class AdminSerializer(serializers.ModelSerializer):
    """Full serializer for admin user management by another admin."""
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'password',
        ]
        read_only_fields = ['role']

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.role = User.Role.ADMIN
        user.is_admin = True
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        # Keep admin flag in sync with role
        instance.is_admin = True
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PermissionSerializer(serializers.ModelSerializer):
    """Serializes a Django Permission as a flat codename like 'academics.view_course'."""
    full_codename = serializers.SerializerMethodField()
    app_label = serializers.CharField(source='content_type.app_label', read_only=True)
    model = serializers.CharField(source='content_type.model', read_only=True)

    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'full_codename', 'app_label', 'model']

    def get_full_codename(self, obj):
        return f"{obj.content_type.app_label}.{obj.codename}"


class SecretaireSerializer(serializers.ModelSerializer):
    """Full serializer for secretary user management by admin."""
    permissions = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'permissions', 'password',
        ]
        read_only_fields = ['role']

    def get_permissions(self, obj):
        perms = obj.user_permissions.select_related('content_type').all()
        return PermissionSerializer(perms, many=True).data

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.role = User.Role.SECRETAIRE
        user.is_admin = False
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    # Write-only fields for user creation
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    registration_fee_status = serializers.ChoiceField(
        choices=('PENDING', 'PAID', 'EXEMPT'),
        write_only=True,
        required=False,
        default='PENDING',
    )
    insurance_fee_status = serializers.ChoiceField(
        choices=('PENDING', 'PAID', 'EXEMPT'),
        write_only=True,
        required=False,
        default='PENDING',
    )
    courses = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_balance = serializers.SerializerMethodField()
    registration_form_ready = serializers.BooleanField(read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user', 'enrollment_date', 'parent_name', 'parent_phone', 'status',
            'courses', 'payment_status', 'payment_balance', 'first_name', 'last_name',
            'email', 'registration_fee_status', 'insurance_fee_status',
            'address', 'phone', 'date_of_birth', 'age_group', 'registration_form_ready',
        ]

    def get_courses(self, obj):
        from academics.models import AcademicYear

        return ", ".join([
            e.course.name
            for e in obj.enrollments.filter(status='ACTIVE', academic_year=AcademicYear.get_active())
        ])

    def _payment_summary(self, obj):
        from academics.services import BillingService

        summary = BillingService.student_payment_summary(obj)
        return summary['status'], float(summary['balance'])

    def get_payment_status(self, obj):
        return self._payment_summary(obj)[0]

    def get_payment_balance(self, obj):
        return self._payment_summary(obj)[1]

    @transaction.atomic
    def create(self, validated_data):
        from academics.services import BillingService

        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        email = validated_data.pop('email', '')
        registration_fee_status = validated_data.pop('registration_fee_status', 'PENDING')
        insurance_fee_status = validated_data.pop('insurance_fee_status', 'PENDING')
        user_data = {
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'username': validated_data.pop('username', None) or _generate_username(first_name, last_name, email),
            # Student users only hold profile/contact data. They are not login accounts.
            'role': User.Role.STUDENT,
            'is_active': False,
        }
        user = User.objects.create_user(**user_data)
        user.set_unusable_password()
        user.save(update_fields=['password'])
        validated_data['user'] = user
        student = super().create(validated_data)
        BillingService.create_default_student_fees(
            student,
            registration_status=registration_fee_status,
            insurance_status=insurance_fee_status,
        )
        return student

    def update(self, instance, validated_data):
        # Update user fields if present
        user = instance.user
        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        if 'email' in validated_data:
            user.email = validated_data.pop('email')
        if 'username' in validated_data:
            user.username = validated_data.pop('username')
        user.save()
        return super().update(instance, validated_data)

class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_preferred']

class TeacherPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherPreferences
        fields = ['min_consecutive_hours', 'max_daily_hours', 'max_gaps_per_day']

class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    # Write-only fields for user creation
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    availabilities = TeacherAvailabilitySerializer(many=True, read_only=True)
    preferences = TeacherPreferencesSerializer(read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = TeacherProfile
        fields = ['id', 'user', 'speciality', 'bio', 'status', 'color_code', 'hourly_rate', 'availabilities', 'preferences', 'student_count', 'first_name', 'last_name', 'email', 'username', 'cin', 'phone']

    def get_student_count(self, obj):
        # Count total active enrollments in courses where this teacher is the default teacher
        count = 0
        for course in obj.default_courses.all():
            count += course.enrollments.filter(status='ACTIVE').count()
        return count

    def create(self, validated_data):
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        email = validated_data.pop('email')
        user_data = {
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'username': validated_data.pop('username', None) or _generate_username(first_name, last_name, email),
            # Teacher users only hold profile/contact data. They are not login accounts.
            'role': User.Role.TEACHER,
            'is_active': False,
        }
        user = User.objects.create_user(**user_data)
        user.set_unusable_password()
        user.save(update_fields=['password'])
        validated_data['user'] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Update user fields if present
        user = instance.user
        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        if 'email' in validated_data:
            user.email = validated_data.pop('email')
        if 'username' in validated_data:
            user.username = validated_data.pop('username')
        user.save()
        return super().update(instance, validated_data)
