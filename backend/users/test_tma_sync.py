from datetime import date, time
from decimal import Decimal
from unittest.mock import Mock, patch

import requests
from django.test import TestCase, override_settings

from academics.models import AcademicYear, Course, Enrollment, Subject
from planning.models import ClassSession, Room
from users.models import StudentProfile, TeacherProfile, User
from users.tma_sync import (
    RetryableTmaSyncError,
    build_student_payload,
    send_student_to_tma,
)


class TmaSyncPayloadTests(TestCase):
    def test_builds_essential_payload_from_current_models(self):
        academic_year = AcademicYear.get_active()
        student_user = User.objects.create_user(
            username='yasmine',
            first_name='Yasmine',
            last_name='Bennani',
            email='parent@example.com',
            role=User.Role.STUDENT,
            is_active=False,
        )
        student = StudentProfile.objects.create(
            user=student_user,
            parent_name='Mme Bennani',
            date_of_birth=date(2017, 1, 1),
        )
        teacher_user = User.objects.create_user(
            username='karim',
            first_name='Karim',
            last_name='Idrissi',
            role=User.Role.TEACHER,
            is_active=False,
        )
        teacher = TeacherProfile.objects.create(
            user=teacher_user,
            speciality='Piano',
        )
        subject = Subject.objects.create(name='Piano')
        course = Course.objects.create(
            name='Piano enfants',
            subject=subject,
            level='BEGINNER',
            default_teacher=teacher,
            price=Decimal('1200.00'),
        )
        enrollment = Enrollment.objects.create(
            student=student,
            course=course,
            academic_year=academic_year,
            billing_plan='QUARTERLY',
            default_price=Decimal('1200.00'),
            custom_price=Decimal('1200.00'),
        )
        room = Room.objects.create(name='Salle 2')
        selected_session = ClassSession.objects.create(
            course=course,
            academic_year=academic_year,
            teacher=teacher,
            room=room,
            day_of_week=2,
            start_time=time(17, 0),
            end_time=time(18, 0),
            start_date=academic_year.start_date,
        )
        ClassSession.objects.create(
            course=course,
            academic_year=academic_year,
            teacher=teacher,
            room=room,
            day_of_week=4,
            start_time=time(18, 0),
            end_time=time(19, 0),
            start_date=academic_year.start_date,
        )
        enrollment.assigned_sessions.add(selected_session)

        payload = build_student_payload(student.id)

        self.assertEqual(payload['external_id'], str(student.id))
        self.assertEqual(payload['nom'], 'Yasmine Bennani')
        self.assertEqual(payload['parent_email'], 'parent@example.com')
        self.assertEqual(payload['programme'], 'Piano enfants')
        self.assertEqual(payload['formule'], 'Trimestriel')
        self.assertEqual(payload['salle'], 'Salle 2')
        self.assertEqual(payload['prof'], 'Karim Idrissi')
        self.assertEqual(payload['creneaux'], [{'jour': 'Mercredi', 'heure': '17h00'}])
        self.assertEqual(payload['inscription_statut'], 'a_venir')
        self.assertNotIn('paiements', payload)


@override_settings(
    TMA_SYNC_ENABLED=True,
    SYNC_API_KEY='test-secret',
    TMA_SYNC_API_URL='https://example.test/sync',
    TMA_SYNC_CONNECT_TIMEOUT=2,
    TMA_SYNC_READ_TIMEOUT=5,
)
class TmaSyncRequestTests(TestCase):
    @patch('users.tma_sync.build_student_payload', return_value={
        'external_id': '1',
        'nom': 'Test',
        'creneaux': [],
    })
    @patch('users.tma_sync.requests.post')
    def test_rejected_request_does_not_raise(self, post, _build_payload):
        post.return_value = Mock(status_code=401)

        result = send_student_to_tma(1)

        self.assertEqual(result['status'], 'rejected')
        self.assertEqual(result['http_status'], 401)

    @patch('users.tma_sync.build_student_payload', return_value={
        'external_id': '1',
        'nom': 'Test',
        'creneaux': [],
    })
    @patch('users.tma_sync.requests.post', side_effect=requests.Timeout('offline'))
    def test_network_failure_is_retryable(self, _post, _build_payload):
        with self.assertRaises(RetryableTmaSyncError):
            send_student_to_tma(1)
