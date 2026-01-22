"""
ViewSets for Enrollment, Subscription, and Payment APIs.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Enrollment, Subscription, Payment
from .serializers import (
    EnrollmentSerializer,
    EnrollmentCreateSerializer,
    SubscriptionSerializer,
    PaymentSerializer
)
from .services import EnrollmentService
from users.models import StudentProfile
from academics.models import Course


class EnrollmentViewSet(viewsets.ModelViewSet):
    """API endpoints for managing student enrollments in courses."""
    queryset = Enrollment.objects.all().select_related(
        'student__user', 'course__subject'
    )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EnrollmentCreateSerializer
        return EnrollmentSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by student if provided
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        # Filter by course if provided
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    @action(detail=False, methods=['post'], url_path='suggest-price')
    def suggest_price(self, request):
        """
        Calculate suggested price for enrolling a student in a course.
        POST /api/enrollments/suggest-price/
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
    """API endpoints for managing subscriptions."""
    queryset = Subscription.objects.all().select_related(
        'enrollment__student__user', 'enrollment__course'
    )
    serializer_class = SubscriptionSerializer
    
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


class PaymentViewSet(viewsets.ModelViewSet):
    """API endpoints for managing payments."""
    queryset = Payment.objects.all().select_related(
        'subscription__enrollment__student__user',
        'subscription__enrollment__course',
        'student__user'
    )
    serializer_class = PaymentSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by student
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        # Filter by subscription
        subscription_id = self.request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        
        return queryset
