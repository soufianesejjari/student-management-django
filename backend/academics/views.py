from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
