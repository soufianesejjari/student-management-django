from rest_framework import serializers
from .models import Room, ClassSession, SessionInstance
from datetime import datetime, time

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity', 'resources', 'is_active']

class ClassSessionSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source='room.name', read_only=True)

    class Meta:
        model = ClassSession
        fields = ['id', 'course', 'course_name', 'teacher', 'teacher_name', 'room', 'room_name', 
                  'day_of_week', 'start_time', 'end_time', 'start_date', 'end_date', 'recurrence_rule']

    def get_teacher_name(self, obj):
        return obj.teacher.user.get_full_name() or obj.teacher.user.username

class AvailabilityCheckSerializer(serializers.Serializer):
    """For the POST /check-availability/ endpoint"""
    teacher_id = serializers.IntegerField()
    room_id = serializers.IntegerField()
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

class SlotSuggestionSerializer(serializers.Serializer):
    """For the POST /suggest-slots/ endpoint"""
    teacher_id = serializers.IntegerField()
    duration_minutes = serializers.IntegerField(min_value=30)
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)

class SessionInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionInstance
        fields = '__all__'
