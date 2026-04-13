from rest_framework import serializers
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from .models import User, StudentProfile, TeacherProfile, TeacherAvailability, TeacherPreferences


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_admin', 'role', 'avatar']


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
    password = serializers.CharField(write_only=True, required=False, default='password123')

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

    def create(self, validated_data):
        password = validated_data.pop('password', 'password123')
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
    email = serializers.EmailField(write_only=True)
    username = serializers.CharField(write_only=True)
    courses = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = ['id', 'user', 'enrollment_date', 'parent_name', 'parent_phone', 'status', 'courses', 'first_name', 'last_name', 'email', 'username', 'address', 'phone', 'date_of_birth', 'age_group']

    def get_courses(self, obj):
        return ", ".join([e.course.name for e in obj.enrollments.filter(status='ACTIVE')])
    
    def create(self, validated_data):
        user_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'email': validated_data.pop('email'),
            'username': validated_data.pop('username'),
        }
        # Create user with default password
        user = User.objects.create_user(**user_data, password='password123')
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
    username = serializers.CharField(write_only=True)
    
    availabilities = TeacherAvailabilitySerializer(many=True, read_only=True)
    preferences = TeacherPreferencesSerializer(read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = TeacherProfile
        fields = ['id', 'user', 'speciality', 'bio', 'status', 'color_code', 'hourly_rate', 'availabilities', 'preferences', 'student_count', 'first_name', 'last_name', 'email', 'username', 'cin', 'phone']

    def get_student_count(self, obj):
        # Count total active enrollments in courses where this teacher is the default teacher
        from django.db.models import Count
        count = 0
        for course in obj.default_courses.all():
            count += course.enrollments.filter(status='ACTIVE').count()
        return count

    def create(self, validated_data):
        user_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'email': validated_data.pop('email'),
            'username': validated_data.pop('username'),
        }
        # Create user with default password
        user = User.objects.create_user(**user_data, password='password123')
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
