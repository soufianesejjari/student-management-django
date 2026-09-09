from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import Permission
from rest_framework.test import APITestCase

from academics.models import AcademicYear
from finances.models import Expense, Payment
from users.models import StudentProfile, User


class FinanceDeletionPermissionTests(APITestCase):
    def setUp(self):
        AcademicYear.objects.filter(is_active=True).update(is_active=False)
        self.academic_year = AcademicYear.objects.create(
            name='2026-2027-finance-tests',
            start_date=date(2026, 9, 1),
            end_date=date(2027, 8, 31),
            is_active=True,
        )
        self.admin = User.objects.create_user(
            username='finance-admin',
            role=User.Role.ADMIN,
        )
        self.secretary = User.objects.create_user(
            username='finance-secretary',
            role=User.Role.SECRETAIRE,
        )
        student_user = User.objects.create_user(username='finance-student')
        self.student = StudentProfile.objects.create(user=student_user)
        self.payment = Payment.objects.create(
            student=self.student,
            amount=Decimal('300.00'),
            date=date(2026, 9, 9),
            method='CASH',
            status='PAID',
        )
        self.expense = Expense.objects.create(
            description='Test expense',
            amount=Decimal('100.00'),
            date=date(2026, 9, 9),
            category='OTHER',
        )

    def test_new_expense_is_paid_by_default(self):
        self.assertEqual(self.expense.status, 'PAID')

    @patch('users.tma_sync.schedule_student_sync')
    def test_secretary_needs_each_delete_permission(self, _schedule_sync):
        view_permissions = Permission.objects.filter(
            content_type__app_label='finances',
            codename__in=['view_payment', 'view_expense'],
        )
        self.secretary.user_permissions.add(*view_permissions)
        self.client.force_authenticate(self.secretary)

        payment_url = f'/api/finances/payments/{self.payment.id}/'
        expense_url = f'/api/finances/expenses/{self.expense.id}/'
        self.assertEqual(self.client.delete(payment_url).status_code, 403)
        self.assertEqual(self.client.delete(expense_url).status_code, 403)

        delete_payment = Permission.objects.get(
            content_type__app_label='finances',
            codename='delete_payment',
        )
        self.secretary.user_permissions.add(delete_payment)
        self.secretary = User.objects.get(pk=self.secretary.pk)
        self.client.force_authenticate(self.secretary)
        self.assertEqual(self.client.delete(payment_url).status_code, 204)
        self.assertEqual(self.client.delete(expense_url).status_code, 403)

        delete_expense = Permission.objects.get(
            content_type__app_label='finances',
            codename='delete_expense',
        )
        self.secretary.user_permissions.add(delete_expense)
        self.secretary = User.objects.get(pk=self.secretary.pk)
        self.client.force_authenticate(self.secretary)
        self.assertEqual(self.client.delete(expense_url).status_code, 204)

    @patch('users.tma_sync.schedule_student_sync')
    def test_admin_can_delete_payment_and_expense(self, _schedule_sync):
        self.client.force_authenticate(self.admin)

        self.assertEqual(
            self.client.delete(f'/api/finances/payments/{self.payment.id}/').status_code,
            204,
        )
        self.assertEqual(
            self.client.delete(f'/api/finances/expenses/{self.expense.id}/').status_code,
            204,
        )
