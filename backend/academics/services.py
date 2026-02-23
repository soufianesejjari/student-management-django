"""
Business logic service for enrollment pricing calculations.
"""
from django.conf import settings as django_settings
from academics.models import Course, Enrollment, AcademySettings
from users.models import StudentProfile


class EnrollmentService:
    """Service for handling enrollment-related business logic."""

    @staticmethod
    def get_offer_settings():
        """
        Return the course offer configuration as a plain dict,
        reading from the AcademySettings DB singleton.
        Falls back to COURSE_OFFER_FALLBACK from settings.py on DB error.
        """
        try:
            s = AcademySettings.get()
            return {
                'enabled': s.offer_enabled,
                'free_course_id': s.free_course_id,
                'max_times': s.offer_max_times,
            }
        except Exception:
            fallback = getattr(django_settings, 'COURSE_OFFER_FALLBACK', {})
            return {
                'enabled': fallback.get('enabled', False),
                'free_course_id': fallback.get('free_course_id'),
                'max_times': fallback.get('max_times', 1),
            }

    @staticmethod
    def suggest_enrollment_price(student_id, course_id):
        """
        Suggests a price for enrolling a student in a course based on:
        - Course default price
        - Promotional rules (e.g., 3rd course of different type is free)

        Returns:
            dict: {
                'default_price': Decimal,
                'suggested_price': Decimal,
                'is_promotional': bool,
                'reason': str
            }
        """
        try:
            student = StudentProfile.objects.get(id=student_id)
            course = Course.objects.get(id=course_id)
        except (StudentProfile.DoesNotExist, Course.DoesNotExist):
            return {
                'default_price': 0,
                'suggested_price': 0,
                'is_promotional': False,
                'reason': 'Invalid student or course'
            }

        # Get all active enrollments for this student
        active_enrollments = Enrollment.objects.filter(
            student=student,
            status='ACTIVE'
        ).select_related('course__subject')

        # Group enrollments by subject
        subject_counts = {}
        for enrollment in active_enrollments:
            if enrollment.course.subject:
                subject_id = enrollment.course.subject.id
                subject_counts[subject_id] = subject_counts.get(subject_id, 0) + 1

        # Check promotional rule: 3rd course of different type is free
        # If student has ≥2 courses of the same subject
        has_two_same_subject = any(count >= 2 for count in subject_counts.values())

        # Check if new course is a different subject
        new_subject_id = course.subject.id if course.subject else None
        is_different_subject = (
            new_subject_id is not None and
            (new_subject_id not in subject_counts or subject_counts[new_subject_id] == 0)
        )

        if has_two_same_subject and is_different_subject:
            reason = f"Student has {max(subject_counts.values())} courses of same subject - 3rd course of different type FREE"
            return {
                'default_price': course.price,
                'suggested_price': 0,
                'is_promotional': True,
                'reason': reason
            }
        else:
            return {
                'default_price': course.price,
                'suggested_price': course.price,
                'is_promotional': False,
                'reason': ''
            }
