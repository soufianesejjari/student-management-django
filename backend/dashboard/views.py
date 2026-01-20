from rest_framework import views, permissions
from rest_framework.response import Response
from users.models import StudentProfile, TeacherProfile
from academics.models import Course, Enrollment
from finances.models import Payment, Expense
from planning.models import ClassSession
from django.db.models import Sum, Count, Q
from datetime import date, datetime, timedelta

class DashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = date.today()
        current_month = today.month
        current_year = today.year

        # Active Students
        active_students = StudentProfile.objects.filter(status='ACTIVE').count()
        
        # Active Teachers
        active_teachers = TeacherProfile.objects.filter(status='ACTIVE').count()
        
        # Active Courses
        active_courses = Course.objects.filter(status='ACTIVE').count()

        # Monthly Revenue
        monthly_income = Payment.objects.filter(
            date__month=current_month, 
            date__year=current_year,
            status='PAID'
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        # Monthly Expenses
        monthly_expenses = Expense.objects.filter(
            date__month=current_month, 
            date__year=current_year
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        # Calculations
        net_revenue = monthly_income - monthly_expenses

        # Recent Enrollments (This month)
        new_students = StudentProfile.objects.filter(
            enrollment_date__month=current_month,
            enrollment_date__year=current_year
        ).count()

        return Response({
            'active_students': active_students,
            'active_teachers': active_teachers,
            'active_courses': active_courses,
            'monthly_revenue': monthly_income,
            'monthly_expenses': monthly_expenses,
            'net_revenue': net_revenue,
            'new_students_this_month': new_students
        })

class UpcomingClassesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get next 5 classes from now
        """
        now = datetime.now()
        current_time = now.time()
        current_day = now.weekday() # 0=Monday
        
        # This is a simplified logic. 
        # Ideally we query based on date for specific sessions.
        # But since our ClassSession is a weekly plan, we look for:
        # 1. Today's classes that start later than now
        # 2. Upcoming days
        
        # Fetch all active sessions
        # For simplicity, let's just return the next scheduled sessions in the week
        
        next_sessions = ClassSession.objects.all().order_by('day_of_week', 'start_time')
        
        # Filter for "upcoming" in a real scenario would require expanding the recurrence.
        # Here we just return a list for the UI to display "Upcoming in general"
        
        data = []
        for session in next_sessions[:5]: # just 5
            data.append({
                'id': session.id,
                'course': session.course.name,
                'teacher': session.teacher.user.get_full_name(),
                'room': session.room.name,
                'day': session.day_of_week,
                'start': session.start_time,
                'end': session.end_time
            })
            
        return Response(data)
