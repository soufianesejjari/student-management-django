from rest_framework import viewsets, permissions, filters, status
from users.permissions import make_module_permission, StrictDjangoModelPermissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Subject, Course, Enrollment, Subscription, AcademySettings
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
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class CourseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Courses
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'subject__name']

class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Enrollments
    """
    queryset = Enrollment.objects.all().select_related('student__user', 'course__subject')
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]
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
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]
    
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
    GET  /api/academics/offer-settings/          – full settings + optional student eligibility
    PATCH /api/academics/offer-settings/update/  – save settings to DB
    """
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _build_payload(s: AcademySettings):
        """Serialize an AcademySettings instance to a response dict."""
        free_course = None
        if s.free_course_id:
            fc = Course.objects.filter(pk=s.free_course_id).select_related('subject').first()
            if fc:
                free_course = {
                    'id': fc.id,
                    'name': fc.name,
                    'status': fc.status,
                    'subject_type': fc.subject.subject_type if fc.subject else None,
                }
        return {
            'enabled': s.offer_enabled,
            'free_course_id': s.free_course_id,
            'max_times': s.offer_max_times,
            'free_course': free_course,
        }

    # ── GET /api/academics/offer-settings/ ──────────────────────────────────

    def list(self, request):
        s = AcademySettings.get()
        payload = self._build_payload(s)

        # Optional per-student eligibility check
        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response(payload)

        try:
            student_id_int = int(student_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'student_id must be an integer'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        free_course_id = s.free_course_id
        max_times = s.offer_max_times

        active_qs = Enrollment.objects.filter(student_id=student_id_int, status='ACTIVE')
        active_count = active_qs.count()

        # How many times has the student already received the free offer (ever)
        existing_free = (
            Enrollment.objects.filter(
                student_id=student_id_int,
                course_id=free_course_id,
                is_free_offer=True,
            ).count()
            if free_course_id else 0
        )

        already_enrolled = bool(free_course_id) and active_qs.filter(course_id=free_course_id).exists()

        can_add = (
            s.offer_enabled
            and bool(payload['free_course'])
            and payload['free_course']['status'] == 'ACTIVE'
            and existing_free < max_times
            and not already_enrolled
        )

        payload.update({
            'student_id': student_id_int,
            'active_enrollments_count': active_count,
            'existing_free_course_count': existing_free,
            'can_add_free_course': can_add,
            'should_auto_add': can_add,
        })
        return Response(payload)

    # ── PATCH /api/academics/offer-settings/update/ ──────────────────────────

    @action(detail=False, methods=['patch'], url_path='update')
    def update_settings(self, request):
        """
        Accepts: { enabled, free_course_id, max_times }
        All fields are optional (partial update).
        """
        s = AcademySettings.get()
        data = request.data

        if 'enabled' in data:
            s.offer_enabled = bool(data['enabled'])

        if 'free_course_id' in data:
            fc_id = data['free_course_id']
            if fc_id is None or fc_id == '':
                s.free_course = None
            else:
                try:
                    s.free_course = Course.objects.get(pk=int(fc_id))
                except Course.DoesNotExist:
                    return Response(
                        {'error': f'Course {fc_id} not found'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        if 'max_times' in data:
            try:
                v = int(data['max_times'])
                if v < 1:
                    raise ValueError
                s.offer_max_times = v
            except (ValueError, TypeError):
                return Response(
                    {'error': 'max_times must be a positive integer'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        s.save()
        return Response(self._build_payload(s))
