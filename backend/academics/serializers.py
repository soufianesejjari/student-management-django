from rest_framework import serializers
from .models import Subject, Course, Enrollment

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'color_code']

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
        return obj.enrollments.filter(is_active=True).count()

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

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'student_name', 'course', 'course_name', 'enrolled_at', 'is_active']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() or obj.student.user.username
