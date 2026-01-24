from rest_framework import viewsets, permissions, status, views, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.db import transaction
from datetime import datetime, timedelta, time, date
from .models import Room, ClassSession, SessionInstance
from .serializers import (
    RoomSerializer, 
    ClassSessionSerializer, 
    AvailabilityCheckSerializer, 
    SlotSuggestionSerializer,
    SessionInstanceSerializer
)
from users.models import TeacherProfile, TeacherAvailability, TeacherPreferences

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'capacity']

class ClassSessionViewSet(viewsets.ModelViewSet):
    queryset = ClassSession.objects.all()
    serializer_class = ClassSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['course__name', 'teacher__user__first_name', 'teacher__user__last_name', 'room__name']

    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Create a new class session with custom conflict validation.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        force_conflicts = request.data.get('force_conflicts', False)
        
        try:
            # We use a transaction to ensure we can check for soft conflicts after saving 
            # (since our logic uses model instance) but rollback if needed.
            # However, hard conflicts (Room/Teacher) are raised during .save() -> .clean()
            
            with transaction.atomic():
                instance = serializer.save() 
                
                # Check Student Conflicts (Soft)
                conflicts = instance.get_student_conflicts()
                
                if conflicts and not force_conflicts:
                    # If we don't force, we must rollback manually by raising an exception 
                    # OR we just let the transaction finish then delete. 
                    # To effectively "rollback" and return error, raising an error is best inside atomic block.
                    # But here we want to return a specific 409 response.
                    # So we allow save, then delete.
                    instance.delete()
                    
                    return Response({
                        "status": "conflict",
                        "message": "Student scheduling conflicts detected",
                        "conflicts": conflicts,
                        "can_force": True
                    }, status=status.HTTP_409_CONFLICT)
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            # Catch Django ValidationErrors (Room/Teacher hard conflicts) from model.clean()
            return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
             return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post']) 
    def check_conflicts(self, request):
        """Dry-run check for conflicts"""
        # Logic to simulate creation and return conflicts
        pass

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """
        Create a SessionInstance to reschedule a specific occurrence.
        """
        session = self.get_object()
        data = request.data
        
        original_date = data.get('original_date')
        new_date = data.get('new_date')
        new_start = data.get('new_start_time')
        new_end = data.get('new_end_time')
        notes = data.get('notes', '')
        
        # Create Instance
        instance, created = SessionInstance.objects.update_or_create(
            class_session=session,
            original_date=original_date,
            defaults={
                'is_rescheduled': True,
                'new_date': new_date,
                'new_start_time': new_start,
                'new_end_time': new_end,
                'notes': notes
            }
        )
        
        return Response(SessionInstanceSerializer(instance).data)

    @action(detail=True, methods=['post'])
    def cancel_occurrence(self, request, pk=None):
        """
        Cancel a specific occurrence
        """
        session = self.get_object()
        date_str = request.data.get('original_date')
        notes = request.data.get('notes', '')
        
        instance, created = SessionInstance.objects.update_or_create(
            class_session=session,
            original_date=date_str,
            defaults={
                'is_cancelled': True,
                'notes': notes
            }
        )
        return Response(SessionInstanceSerializer(instance).data)

    @action(detail=False, methods=['get'])
    def grid(self, request):
        """
        Return all sessions in a format suitable for calendar grid.
        Params: start_date, end_date
        Returns: { recurring: [...], instances: [...] }
        """
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Default to current week if no date provided
        today = date.today()
        if not start_date_str:
            start_date = today - timedelta(days=today.weekday())
        else:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            
        if not end_date_str:
            end_date = start_date + timedelta(days=6)
        else:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        # Filter sessions that are active within this range
        # A session is active if its recurrence period overlaps with the requested range
        sessions = ClassSession.objects.filter(
            Q(start_date__lte=end_date) &
            (Q(end_date__gte=start_date) | Q(end_date__isnull=True))
        )
        
        # Get all session instances (exceptions) within the date range
        instances = SessionInstance.objects.filter(
            original_date__gte=start_date,
            original_date__lte=end_date
        ).select_related('class_session', 'class_session__course', 'class_session__teacher', 'class_session__room')
        
        # Serialize both
        sessions_serializer = self.get_serializer(sessions, many=True)
        instances_serializer = SessionInstanceSerializer(instances, many=True)
        
        return Response({
            'recurring': sessions_serializer.data,
            'instances': instances_serializer.data
        })


class AvailabilityCheckView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AvailabilityCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Check Room Availability
        room_conflict = ClassSession.objects.filter(
            room_id=data['room_id'],
            day_of_week=data['day_of_week'],
            start_time__lt=data['end_time'],
            end_time__gt=data['start_time']
        )
        
        if room_conflict.exists():
            conflict = room_conflict.first()
            return Response({
                'is_available': False, 
                'reason': 'Room Occupied',
                'details': f"Occupied by {conflict.course.name} ({conflict.start_time.strftime('%H:%M')}-{conflict.end_time.strftime('%H:%M')})"
            }, status=status.HTTP_200_OK)

        # Check Teacher Availability
        teacher_conflict = ClassSession.objects.filter(
            teacher_id=data['teacher_id'],
            day_of_week=data['day_of_week'],
            start_time__lt=data['end_time'],
            end_time__gt=data['start_time']
        )
        
        if teacher_conflict.exists():
             conflict = teacher_conflict.first()
             return Response({
                 'is_available': False, 
                 'reason': 'Teacher Busy',
                 'details': f"Teacher busy with {conflict.course.name} ({conflict.start_time.strftime('%H:%M')}-{conflict.end_time.strftime('%H:%M')})"
             }, status=status.HTTP_200_OK)

        return Response({'is_available': True}, status=status.HTTP_200_OK)


class SmartSchedulingView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Suggest slots for a teacher based on preferences (minimizing gaps)
        """
        serializer = SlotSuggestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        teacher_id = data['teacher_id']
        duration = data['duration_minutes']
        day = data['day_of_week']
        
        teacher = TeacherProfile.objects.get(pk=teacher_id)
        
        # 1. Get Teacher's Existing Schedule for that Day
        existing_sessions = ClassSession.objects.filter(
            teacher=teacher,
            day_of_week=day
        ).order_by('start_time')
        
        # 2. Get Teacher Availability Rules (if any)
        availabilities = TeacherAvailability.objects.filter(
            teacher=teacher,
            day_of_week=day
        )
        
        # If no explicit availability, assume 9am-6pm (default business hours)
        possible_slots = []
        start_hour = 9
        end_hour = 18
        
        if availabilities.exists():
            # Use defined availabilities ranges
            pass 
            # (Simplification: for now we use the main logic of finding gaps)
        
        # 3. Algorithm: "Successive" Strategy
        # Look for slots immediately BEFORE starts and AFTER ends of existing classes
        
        suggested_slots = []
        
        # Check immediately after existing sessions
        for session in existing_sessions:
            # End of current session
            slot_start = session.end_time
            # Calculate end time of potential new slot
            # Convert to datetime for math
            dummy_date = date.today()
            dt_start = datetime.combine(dummy_date, slot_start)
            dt_end = dt_start + timedelta(minutes=duration)
            slot_end = dt_end.time()
            
            # Verify if this new slot overlaps with the NEXT session
            # Find next session
            next_session = existing_sessions.filter(start_time__gte=slot_end).first()
            is_overlap = False
            
            # Check overlap with ANY session
            overlap = existing_sessions.filter(
                start_time__lt=slot_end,
                end_time__gt=slot_start
            ).exists()
            
            if not overlap and dt_end.hour < 20: # Example limit
                suggested_slots.append({
                    'start': slot_start,
                    'end': slot_end,
                    'score': 100,
                    'reason': 'Immediately follows existing class (No gap)'
                })

        # Check immediately before existing sessions
        for session in existing_sessions:
            slot_end = session.start_time
            dt_end = datetime.combine(date.today(), slot_end)
            dt_start = dt_end - timedelta(minutes=duration)
            slot_start = dt_start.time()
            
            if dt_start.hour >= 8: # Example limit
                 # Check overlap
                overlap = existing_sessions.filter(
                    start_time__lt=slot_end,
                    end_time__gt=slot_start
                ).exists()
                
                if not overlap:
                    suggested_slots.append({
                        'start': slot_start,
                        'end': slot_end,
                        'score': 100,
                        'reason': 'Immediately precedes existing class (No gap)'
                    })
                    
        # If no classes exist, suggest start of availability (or 9am)
        if not existing_sessions.exists():
             suggested_slots.append({
                'start': time(9, 0),
                'end': (datetime.combine(date.today(), time(9,0)) + timedelta(minutes=duration)).time(),
                'score': 80,
                'reason': 'Start of day (Empty schedule)'
            })
            
        return Response(suggested_slots)
