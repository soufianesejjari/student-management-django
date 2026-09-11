from rest_framework import viewsets, permissions, filters, status
from users.permissions import make_module_permission, StrictDjangoModelPermissions
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal, InvalidOperation
from django.db import transaction
from .models import AcademicYear, Subject, Course, Enrollment, Subscription, StudentFee, AcademySettings
from .serializers import (
    AcademicYearSerializer,
    SubjectSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    EnrollmentCreateSerializer,
    SubscriptionSerializer,
    StudentFeeSerializer,
)
from .services import BillingService, EnrollmentService


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    @action(detail=False, methods=['get'])
    def current(self, request):
        return Response(self.get_serializer(AcademicYear.get_active()).data)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        academic_year = self.get_object()
        academic_year.is_active = True
        academic_year.save()
        return Response(self.get_serializer(academic_year).data)

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

    def perform_update(self, serializer):
        course = serializer.save()
        from users.tma_sync import schedule_course_students_sync
        schedule_course_students_sync(course.id)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        academic_year_id = self.request.query_params.get('academic_year')
        if academic_year_id:
            context['academic_year_id'] = academic_year_id
        return context

class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Enrollments
    """
    queryset = Enrollment.objects.all().select_related(
        'student__user', 'course__subject', 'academic_year'
    ).prefetch_related(
        'assigned_sessions__teacher__user', 'assigned_sessions__room'
    )
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['student__user__first_name', 'student__user__last_name', 'course__name']

    def get_serializer_class(self):
        if self.action == 'create':
            return EnrollmentCreateSerializer
        return EnrollmentSerializer

    def perform_create(self, serializer):
        enrollment = serializer.save()
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(enrollment.student_id)

    def perform_update(self, serializer):
        previous_plan = serializer.instance.billing_plan
        with transaction.atomic():
            enrollment = serializer.save()
            if enrollment.billing_plan != previous_plan:
                BillingService.update_current_unpaid_subscription_plan(
                    enrollment,
                    enrollment.billing_plan,
                )
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(enrollment.student_id)

    def perform_destroy(self, instance):
        student_id = instance.student_id
        super().perform_destroy(instance)
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(student_id)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('academic_year'):
            data['academic_year'] = AcademicYear.get_active().pk

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        """
        Optionally restrict to a specific course via query param ?course_id=
        """
        queryset = super().get_queryset()
        academic_year = self.request.query_params.get('academic_year')
        all_years = self.request.query_params.get('all_years') in ('1', 'true', 'True')

        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)
        elif not all_years:
            queryset = queryset.filter(academic_year=AcademicYear.get_active())
        
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
    queryset = Subscription.objects.all().select_related('enrollment__student__user', 'enrollment__course', 'enrollment__academic_year')
    serializer_class = SubscriptionSerializer
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]

    def perform_create(self, serializer):
        subscription = serializer.save()
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(subscription.enrollment.student_id)

    def perform_update(self, serializer):
        subscription = serializer.save()
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(subscription.enrollment.student_id)

    def perform_destroy(self, instance):
        student_id = instance.enrollment.student_id
        super().perform_destroy(instance)
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(student_id)

    def list(self, request, *args, **kwargs):
        academic_year = self._requested_academic_year()
        student_id = request.query_params.get('student')
        BillingService.sync_due_subscriptions(academic_year=academic_year, student_id=student_id)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        subscription = self.get_object()
        BillingService.sync_enrollment_subscriptions(subscription.enrollment_id)
        subscription.refresh_from_db()
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    def _requested_academic_year(self):
        academic_year_id = self.request.query_params.get('academic_year')
        if academic_year_id:
            return AcademicYear.objects.filter(pk=academic_year_id).first() or AcademicYear.get_active()
        return AcademicYear.get_active()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        academic_year = self.request.query_params.get('academic_year')
        all_years = self.request.query_params.get('all_years') in ('1', 'true', 'True')

        if academic_year:
            queryset = queryset.filter(enrollment__academic_year_id=academic_year)
        elif not all_years:
            queryset = queryset.filter(enrollment__academic_year=AcademicYear.get_active())
        
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

    @action(detail=False, methods=['post'], url_path='sync-due')
    def sync_due(self, request):
        academic_year_id = request.data.get('academic_year') or request.query_params.get('academic_year')
        student_id = request.data.get('student') or request.data.get('student_id') or request.query_params.get('student')
        enrollment_id = request.data.get('enrollment') or request.data.get('enrollment_id')
        academic_year = AcademicYear.objects.filter(pk=academic_year_id).first() if academic_year_id else AcademicYear.get_active()
        summary = BillingService.sync_due_subscriptions(
            academic_year=academic_year,
            student_id=student_id,
            enrollment_id=enrollment_id,
        )
        return Response(summary)


class StudentFeeViewSet(viewsets.ModelViewSet):
    queryset = StudentFee.objects.all().select_related('student__user', 'academic_year')
    serializer_class = StudentFeeSerializer
    permission_classes = [make_module_permission('academics'), StrictDjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        academic_year = self.request.query_params.get('academic_year')
        all_years = self.request.query_params.get('all_years') in ('1', 'true', 'True')

        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)
        elif not all_years:
            queryset = queryset.filter(academic_year=AcademicYear.get_active())

        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        fee_type = self.request.query_params.get('fee_type')
        if fee_type:
            queryset = queryset.filter(fee_type=fee_type)

        fee_status = self.request.query_params.get('status')
        if fee_status:
            queryset = queryset.filter(status=fee_status)

        return queryset

    def list(self, request, *args, **kwargs):
        academic_year_id = request.query_params.get('academic_year')
        academic_year = AcademicYear.objects.filter(pk=academic_year_id).first() if academic_year_id else AcademicYear.get_active()
        student_id = request.query_params.get('student') or request.query_params.get('student_id')
        if student_id:
            from users.models import StudentProfile
            student = StudentProfile.objects.filter(pk=student_id).first()
            if student:
                BillingService.sync_student_fees(student=student, academic_year=academic_year)
        else:
            BillingService.sync_student_fees(academic_year=academic_year)
        return super().list(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = serializer.save()
        BillingService.sync_student_fee_status(instance)
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(instance.student_id)


class CourseOfferSettingsViewSet(viewsets.ViewSet):
    """
    GET  /api/academics/offer-settings/          – full settings + optional student eligibility
    PATCH /api/academics/offer-settings/update/  – save settings to DB
    """
    queryset = AcademySettings.objects.all()
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
            'school': {
                'name': s.school_name,
                'address': s.school_address,
                'city': s.school_city,
                'postal_code': s.school_postal_code,
                'phone': s.school_phone,
                'email': s.school_email,
                'description': s.school_description,
                'country': s.school_country,
                'tax_id': s.school_tax_id,
            },
            'student_fees': {
                'registration_fee': s.default_registration_fee,
                'insurance_fee': s.default_insurance_fee,
            },
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
        academic_year = AcademicYear.get_active()

        active_qs = Enrollment.objects.filter(
            student_id=student_id_int,
            academic_year=academic_year,
            status='ACTIVE',
        )
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

        if 'school' in data and isinstance(data['school'], dict):
            school = data['school']
            mapping = {
                'name': 'school_name',
                'address': 'school_address',
                'city': 'school_city',
                'postal_code': 'school_postal_code',
                'phone': 'school_phone',
                'email': 'school_email',
                'description': 'school_description',
                'country': 'school_country',
                'tax_id': 'school_tax_id',
            }
            for payload_key, model_field in mapping.items():
                if payload_key in school:
                    setattr(s, model_field, school[payload_key] or '')

        if 'student_fees' in data and isinstance(data['student_fees'], dict):
            student_fees = data['student_fees']
            for payload_key, model_field in {
                'registration_fee': 'default_registration_fee',
                'insurance_fee': 'default_insurance_fee',
            }.items():
                if payload_key in student_fees:
                    try:
                        setattr(s, model_field, Decimal(str(student_fees[payload_key] or 0)))
                    except (InvalidOperation, TypeError, ValueError):
                        return Response(
                            {'error': f'{payload_key} must be a valid amount'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

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
