from decimal import Decimal
from datetime import time

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from academics.models import AcademicYear, Course, Enrollment, Subject
from planning.models import ClassSession, Room
from users.models import StudentProfile, TeacherProfile, User
from users.serializers import StudentProfileSerializer, TeacherProfileSerializer
from users.views import StudentProfileViewSet, UserViewSet


class ProfileAccountSafetyTests(TestCase):
    def setUp(self):
        self.academic_year = AcademicYear.get_active()

    def test_student_profile_creates_non_login_user(self):
        serializer = StudentProfileSerializer(data={
            'first_name': 'Nora',
            'last_name': 'Amrani',
            'email': 'nora@example.com',
            'phone': '0600000000',
            'address': 'Casablanca',
            'age_group': '6-12ans',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        student = serializer.save()

        self.assertEqual(student.user.role, User.Role.STUDENT)
        self.assertFalse(student.user.is_admin)
        self.assertFalse(student.user.is_active)
        self.assertFalse(student.user.has_usable_password())
        self.assertNotIn(student.user, UserViewSet.queryset)

    def test_teacher_profile_creates_non_login_user(self):
        serializer = TeacherProfileSerializer(data={
            'first_name': 'Yasmine',
            'last_name': 'Alaoui',
            'email': 'yasmine@example.com',
            'speciality': 'Piano',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        teacher = serializer.save()

        self.assertEqual(teacher.user.role, User.Role.TEACHER)
        self.assertFalse(teacher.user.is_admin)
        self.assertFalse(teacher.user.is_active)
        self.assertFalse(teacher.user.has_usable_password())

    def test_deleting_student_profile_also_deletes_internal_user(self):
        user = User.objects.create_user(
            username='student-record',
            role=User.Role.STUDENT,
            is_active=False,
        )
        student = StudentProfile.objects.create(user=user)

        StudentProfileViewSet().perform_destroy(student)

        self.assertFalse(User.objects.filter(pk=user.pk).exists())


class RegistrationFormReadinessTests(TestCase):
    def setUp(self):
        self.academic_year = AcademicYear.get_active()
        student_user = User.objects.create_user(
            username='student',
            role=User.Role.STUDENT,
            is_active=False,
        )
        self.student = StudentProfile.objects.create(user=student_user)

    def test_fiche_waits_for_course_with_teacher(self):
        self.assertFalse(StudentProfileSerializer(self.student).data['registration_form_ready'])

        subject = Subject.objects.create(name='Piano')
        teacher_user = User.objects.create_user(
            username='teacher',
            first_name='Sara',
            role=User.Role.TEACHER,
            is_active=False,
        )
        teacher = TeacherProfile.objects.create(user=teacher_user, speciality='Piano')
        course = Course.objects.create(
            name='Piano débutant',
            subject=subject,
            level='BEGINNER',
            default_teacher=teacher,
            price=Decimal('400.00'),
        )
        Enrollment.objects.create(
            student=self.student,
            course=course,
            academic_year=self.academic_year,
            default_price=course.price,
            custom_price=course.price,
        )

        self.assertTrue(StudentProfileSerializer(self.student).data['registration_form_ready'])

    def test_registration_form_endpoint_rejects_incomplete_fiche(self):
        admin = User.objects.create_user(username='admin', password='secret')
        request = APIRequestFactory().get(f'/api/users/students/{self.student.pk}/registration-form/')
        force_authenticate(request, user=admin)

        response = StudentProfileViewSet.as_view({'get': 'registration_form'})(
            request,
            pk=self.student.pk,
        )

        self.assertEqual(response.status_code, 409)

    def test_fiche_accepts_professor_selected_during_planning(self):
        subject = Subject.objects.create(name='Guitare')
        course = Course.objects.create(
            name='Guitare débutant',
            subject=subject,
            level='BEGINNER',
            price=Decimal('350.00'),
        )
        Enrollment.objects.create(
            student=self.student,
            course=course,
            academic_year=self.academic_year,
            default_price=course.price,
            custom_price=course.price,
        )
        teacher_user = User.objects.create_user(
            username='planning-teacher',
            role=User.Role.TEACHER,
            is_active=False,
        )
        teacher = TeacherProfile.objects.create(user=teacher_user, speciality='Guitare')
        room = Room.objects.create(name='Salle 1')
        ClassSession.objects.create(
            course=course,
            academic_year=self.academic_year,
            teacher=teacher,
            room=room,
            day_of_week=1,
            start_time=time(10, 0),
            end_time=time(11, 0),
            start_date=self.academic_year.start_date,
        )

        self.assertTrue(StudentProfileSerializer(self.student).data['registration_form_ready'])
