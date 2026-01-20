from rest_framework import viewsets, permissions, filters
from .models import Subject, Course, Enrollment
from .serializers import SubjectSerializer, CourseSerializer, EnrollmentSerializer

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
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['student__user__first_name', 'student__user__last_name', 'course__name']

    def get_queryset(self):
        """
        Optionally restrict to a specific course via query param ?course_id=
        """
        queryset = Enrollment.objects.all()
        course_id = self.request.query_params.get('course_id')
        if course_id is not None:
            queryset = queryset.filter(course_id=course_id)
        return queryset
