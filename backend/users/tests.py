from decimal import Decimal
from datetime import time

from django.test import TestCase
from pypdf import PdfReader
from rest_framework.test import APIRequestFactory, force_authenticate

from academics.models import AcademicYear, AcademySettings, Course, Enrollment, StudentFee, Subject
from finances.models import Payment
from planning.models import ClassSession, Room
from users.models import StudentProfile, TeacherProfile, User
from users.registration_pdf import build_registration_form
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

    def test_student_creation_can_override_default_fee_amounts(self):
        settings = AcademySettings.get()
        settings.default_registration_fee = Decimal('200.00')
        settings.default_insurance_fee = Decimal('50.00')
        settings.save()
        serializer = StudentProfileSerializer(data={
            'first_name': 'Nora',
            'last_name': 'Amrani',
            'email': 'nora@example.com',
            'phone': '0600000000',
            'address': 'Casablanca',
            'age_group': '6-12ans',
            'registration_fee_status': 'PAID',
            'registration_fee_amount': '300.00',
            'insurance_fee_status': 'PENDING',
            'insurance_fee_amount': '75.00',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        student = serializer.save()

        registration = StudentFee.objects.get(student=student, fee_type='REGISTRATION')
        insurance = StudentFee.objects.get(student=student, fee_type='INSURANCE')
        self.assertEqual(registration.amount, Decimal('300.00'))
        self.assertEqual(registration.status, 'PAID')
        self.assertEqual(insurance.amount, Decimal('75.00'))
        self.assertEqual(insurance.status, 'PENDING')
        self.assertTrue(Payment.objects.filter(
            student=student,
            student_fee=registration,
            amount=Decimal('300.00'),
            status='PAID',
        ).exists())

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
        enrollment = Enrollment.objects.create(
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

    def test_registration_pdf_uses_student_fee_override(self):
        academy = AcademySettings.get()
        academy.default_registration_fee = Decimal('200.00')
        academy.save(update_fields=['default_registration_fee'])
        StudentFee.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            fee_type='REGISTRATION',
            amount=Decimal('300.00'),
            status='PAID',
            due_date=self.academic_year.start_date,
        )

        pdf_buffer = build_registration_form(self.student)
        pdf_text = PdfReader(pdf_buffer).pages[0].extract_text()

        self.assertIn("FRAIS D'INSCRIPTION", pdf_text)
        self.assertIn("300 DH", pdf_text)
        self.assertNotIn("200 DH", pdf_text)

    def test_registration_pdf_uses_school_for_child_and_profession_for_adult(self):
        self.student.age_group = '6-12ans'
        self.student.school_or_profession = 'École Al Qods'
        self.student.save(update_fields=['age_group', 'school_or_profession'])

        child_pdf_text = PdfReader(build_registration_form(self.student)).pages[0].extract_text()
        self.assertIn('ÉCOLE', child_pdf_text)
        self.assertIn('École Al Qods', child_pdf_text)

        self.student.age_group = 'Adulte'
        self.student.school_or_profession = 'Architecte'
        self.student.save(update_fields=['age_group', 'school_or_profession'])

        adult_pdf_text = PdfReader(build_registration_form(self.student)).pages[0].extract_text()
        self.assertIn('PROFESSION', adult_pdf_text)
        self.assertIn('Architecte', adult_pdf_text)
        self.assertNotIn('ÉCOLE', adult_pdf_text)

    def test_fiche_accepts_professor_selected_during_planning(self):
        subject = Subject.objects.create(name='Guitare')
        course = Course.objects.create(
            name='Guitare débutant',
            subject=subject,
            level='BEGINNER',
            price=Decimal('350.00'),
        )
        enrollment = Enrollment.objects.create(
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
        session = ClassSession.objects.create(
            course=course,
            academic_year=self.academic_year,
            teacher=teacher,
            room=room,
            day_of_week=1,
            start_time=time(10, 0),
            end_time=time(11, 0),
            start_date=self.academic_year.start_date,
        )
        enrollment.assigned_sessions.add(session)

        self.assertTrue(StudentProfileSerializer(self.student).data['registration_form_ready'])
