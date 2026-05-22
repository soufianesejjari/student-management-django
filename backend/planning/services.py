from datetime import date, datetime, timedelta
from calendar import monthrange
from django.db.models import Q
from .models import ClassSession, SessionInstance

def get_teacher_monthly_occurrences(teacher, year, month, academic_year=None):
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    
    # We will search instances bounded by +/- 31 days to catch cross-month rescheduling
    search_start = first_day - timedelta(days=31)
    search_end = last_day + timedelta(days=31)
    
    sessions = ClassSession.objects.filter(
        teacher=teacher
    ).filter(
        Q(start_date__lte=search_end) & 
        (Q(end_date__gte=search_start) | Q(end_date__isnull=True))
    ).select_related('course', 'room')

    if academic_year:
        sessions = sessions.filter(academic_year=academic_year)
    
    instances = SessionInstance.objects.filter(
        class_session__in=sessions,
        original_date__gte=search_start,
        original_date__lte=search_end
    ).select_related('new_room')
    
    # Organize instances by (session_id, original_date)
    instance_map = {(inst.class_session_id, inst.original_date): inst for inst in instances}
    
    occurrences = []
    
    for session in sessions:
        current_day = max(search_start, session.start_date)
        end_limit = min(search_end, session.end_date) if session.end_date else search_end
        
        # Advance current_day to the first valid day of week for this session
        days_to_add = (session.day_of_week - current_day.weekday()) % 7
        current_day += timedelta(days=days_to_add)
        
        while current_day <= end_limit:
            instance = instance_map.get((session.id, current_day))
            
            actual_date = current_day
            actual_start = session.start_time
            actual_end = session.end_time
            actual_room = session.room.name
            is_cancelled = False
            is_absent = False
            
            if instance:
                is_cancelled = instance.is_cancelled
                is_absent = instance.teacher_is_absent
                if instance.is_rescheduled:
                    if instance.new_date:
                        actual_date = instance.new_date
                    if instance.new_start_time:
                        actual_start = instance.new_start_time
                    if instance.new_end_time:
                        actual_end = instance.new_end_time
                    if instance.new_room:
                        actual_room = instance.new_room.name
            
            # Check if this resulting session lands in the target month!
            if first_day <= actual_date <= last_day:
                start_dt = datetime.combine(actual_date, actual_start)
                end_dt = datetime.combine(actual_date, actual_end)
                duration_hours = max((end_dt - start_dt).total_seconds() / 3600, 0)
                
                occurrences.append({
                    'id': session.id,
                    'instance_id': instance.id if instance else None,
                    'date': actual_date.isoformat(),
                    'day_of_week': actual_date.weekday(),
                    'course': session.course.name,
                    'start_time': actual_start.isoformat(),
                    'end_time': actual_end.isoformat(),
                    'room': actual_room,
                    'duration_hours': duration_hours,
                    'is_cancelled': is_cancelled,
                    'teacher_is_absent': is_absent,
                    'hourly_rate': float(teacher.hourly_rate),
                })
                
            current_day += timedelta(days=7)
            
    # Sort occurrences by date and time
    occurrences.sort(key=lambda x: (x['date'], x['start_time']))
    
    total_hours = sum(o['duration_hours'] for o in occurrences if not o['is_cancelled'])
    worked_hours = sum(o['duration_hours'] for o in occurrences if not o['is_cancelled'] and not o['teacher_is_absent'])
    total_expense = worked_hours * float(teacher.hourly_rate)
    
    return occurrences, total_hours, worked_hours, total_expense
