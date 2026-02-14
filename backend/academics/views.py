from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings as django_settings
from .models import Subject, Course, Enrollment, Subscription
from .serializers import (
    SubjectSerializer, 
    CourseSerializer, 
    EnrollmentSerializer, 
    EnrollmentCreateSerializer,
    SubscriptionSerializer
)
from .services import EnrollmentService

class SubjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Subjects
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class CourseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Courses
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'subject__name']

class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Enrollments
    """
    queryset = Enrollment.objects.all().select_related('student__user', 'course__subject')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['student__user__first_name', 'student__user__last_name', 'course__name']

    def get_serializer_class(self):
        if self.action == 'create':
            return EnrollmentCreateSerializer
        return EnrollmentSerializer

    def get_queryset(self):
        """
        Optionally restrict to a specific course via query param ?course_id=
        """
        queryset = super().get_queryset()
        
        # Filter by course ID (supporting both 'course_id' and 'course')
        course_id = self.request.query_params.get('course_id') or self.request.query_params.get('course')
        if course_id is not None:
            queryset = queryset.filter(course_id=course_id)
            
        # Filter by student ID (supporting both 'student_id' and 'student')
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('student')
        if student_id is not None:
            queryset = queryset.filter(student_id=student_id)
            
        return queryset

    @action(detail=False, methods=['post'], url_path='suggest-price')
    def suggest_price(self, request):
        """
        Calculate suggested price for enrolling a student in a course.
        POST /api/academics/enrollments/suggest-price/
        Body: { "student_id": 1, "course_id": 2 }
        """
        student_id = request.data.get('student_id')
        course_id = request.data.get('course_id')
        
        if not student_id or not course_id:
            return Response(
                {'error': 'student_id and course_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pricing = EnrollmentService.suggest_enrollment_price(student_id, course_id)
        return Response(pricing)

class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Subscriptions
    """
    queryset = Subscription.objects.all().select_related('enrollment__student__user', 'enrollment__course')
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by student
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(enrollment__student_id=student_id)
        
        # Filter by enrollment
        enrollment_id = self.request.query_params.get('enrollment')
        if enrollment_id:
            queryset = queryset.filter(enrollment_id=enrollment_id)
        
        # Filter by payment status
        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        return queryset


class CourseOfferSettingsViewSet(viewsets.ViewSet):
    """
    Read-only endpoint to expose free-course offer configuration and student eligibility.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        offer_settings = getattr(django_settings, 'COURSE_OFFER_SETTINGS', {})
        enabled = bool(offer_settings.get('enabled', False))
        free_course_id = offer_settings.get('free_course_id')
        max_times = int(offer_settings.get('max_times', 1))

        free_course = None
        if free_course_id:
            free_course_obj = Course.objects.filter(id=free_course_id).select_related('subject').first()
            if free_course_obj:
                free_course = {
                    'id': free_course_obj.id,
                    'name': free_course_obj.name,
                    'status': free_course_obj.status,
                    'subject_type': free_course_obj.subject.subject_type if free_course_obj.subject else None,
                }

        payload = {
            'enabled': enabled,
            'free_course_id': free_course_id,
            'max_times': max_times,
            'free_course': free_course,
        }

        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response(payload)

        try:
            student_id_int = int(student_id)
        except (TypeError, ValueError):
            return Response({'error': 'student_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

        active_enrollments = Enrollment.objects.filter(
            student_id=student_id_int,
            status='ACTIVE'
        )
        active_count = active_enrollments.count()
        existing_free_course_count = 0
        if free_course_id:
            existing_free_course_count = active_enrollments.filter(course_id=free_course_id).count()

        eligible_by_count = existing_free_course_count < max_times
        can_add_free_course = (
            enabled and
            bool(free_course) and
            free_course['status'] == 'ACTIVE' and
            eligible_by_count
        )
        should_auto_add = can_add_free_course and active_count == 0

        payload.update({
            'student_id': student_id_int,
            'active_enrollments_count': active_count,
            'existing_free_course_count': existing_free_course_count,
            'can_add_free_course': can_add_free_course,
            'should_auto_add': should_auto_add,
        })

        return Response(payload)
