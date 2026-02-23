"""
Business logic service for enrollment pricing calculations.
"""
from django.conf import settings
from academics.models import Course
from users.models import StudentProfile
from .models import Enrollment


class EnrollmentService:
    """Service for handling enrollment-related business logic."""

    @staticmethod
    def get_offer_settings():
        """Return the course offer configuration from Django settings."""
        return getattr(settings, 'COURSE_OFFER_SETTINGS', {
            'enabled': False,
            'free_course_id': None,
            'max_times': 1,
        })

    @staticmethod
    def student_qualifies_for_free_offer(student):
        """
        Check whether a student should receive the configured free course.

        Rules:
        - Offer must be enabled and a free_course_id must be configured.
        - Student must have at least one ACTIVE non-free-offer enrollment.
        - Student must NOT already have an ACTIVE enrollment in the free course.
        - Student must NOT already have received the offer more times than max_times.

        Returns: (qualifies: bool, free_course: Course | None, reason: str)
        """
        offer = EnrollmentService.get_offer_settings()

        if not offer.get('enabled'):
            return False, None, "Offer is disabled"

        free_course_id = offer.get('free_course_id')
        if not free_course_id:
            return False, None, "No free course configured"

        try:
            free_course = Course.objects.get(id=free_course_id, status='ACTIVE')
        except Course.DoesNotExist:
            return False, None, "Configured free course not found or inactive"

        max_times = offer.get('max_times', 1)

        # Count how many times student already received this as a free offer
        already_received = Enrollment.objects.filter(
            student=student,
            course=free_course,
            is_free_offer=True,
        ).count()

        if already_received >= max_times:
            return False, None, "Student already received the free course offer"

        # Student must already have at least one paid (non-free) active enrollment
        has_paid_enrollment = Enrollment.objects.filter(
            student=student,
            status='ACTIVE',
            is_free_offer=False,
        ).exclude(course=free_course).exists()

        if not has_paid_enrollment:
            return False, None, "Student has no paid enrollments"

        # Make sure the student is not already actively enrolled in the free course
        already_enrolled = Enrollment.objects.filter(
            student=student,
            course=free_course,
            status='ACTIVE',
        ).exists()

        if already_enrolled:
            return False, None, "Student is already enrolled in the free course"

        return True, free_course, f"Free {free_course.name} with any course enrollment"

    @staticmethod
    def suggest_enrollment_price(student_id, course_id):
        """
        Suggests a price for enrolling a student in a course.
        Also returns offer eligibility information.

        Returns:
            dict: {
                'default_price': Decimal,
                'suggested_price': Decimal,
                'is_promotional': bool,
                'reason': str,
                'offer_eligible': bool,
                'offer_course_id': int | None,
                'offer_course_name': str | None,
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
                'reason': 'Invalid student or course',
                'offer_eligible': False,
                'offer_course_id': None,
                'offer_course_name': None,
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
        has_two_same_subject = any(count >= 2 for count in subject_counts.values())
        new_subject_id = course.subject.id if course.subject else None
        is_different_subject = (
            new_subject_id is not None and
            (new_subject_id not in subject_counts or subject_counts[new_subject_id] == 0)
        )

        if has_two_same_subject and is_different_subject:
            reason = f"Student has {max(subject_counts.values())} courses of same subject - 3rd course of different type FREE"
            is_promotional = True
            suggested_price = 0
        else:
            reason = ''
            is_promotional = False
            suggested_price = course.price

        # Check free offer eligibility
        qualifies, free_course, offer_reason = EnrollmentService.student_qualifies_for_free_offer(student)

        # If enrolling directly into the free course itself, don't offer it again
        offer = EnrollmentService.get_offer_settings()
        if course.id == offer.get('free_course_id'):
            qualifies = False
            free_course = None

        return {
            'default_price': course.price,
            'suggested_price': suggested_price,
            'is_promotional': is_promotional,
            'reason': reason,
            'offer_eligible': qualifies,
            'offer_course_id': free_course.id if free_course else None,
            'offer_course_name': free_course.name if free_course else None,
            'offer_reason': offer_reason if qualifies else None,
        }
