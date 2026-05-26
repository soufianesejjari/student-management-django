from rest_framework import viewsets, permissions, views, status, filters
from users.permissions import make_module_permission, StrictDjangoModelPermissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import ProtectedError
from django.db.models import Sum, Q
from .models import Payment, Expense
from .serializers import PaymentSerializer, ExpenseSerializer
from datetime import datetime
from users.models import StudentProfile
from academics.models import AcademicYear
from academics.services import BillingService

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('student__user', 'subscription__enrollment__course')
    serializer_class = PaymentSerializer
    permission_classes = [make_module_permission('finances'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'student__user__first_name',
        'student__user__last_name',
        'student__user__username',
        'student__user__email',
        'invoice_ref'
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        academic_year_id = self.request.query_params.get('academic_year')
        all_years = self.request.query_params.get('all_years') in ('1', 'true', 'True')

        if academic_year_id:
            academic_year = AcademicYear.objects.filter(pk=academic_year_id).first()
        elif not all_years:
            academic_year = AcademicYear.get_active()
        else:
            academic_year = None

        if academic_year:
            queryset = queryset.filter(
                Q(subscription__enrollment__academic_year=academic_year) |
                Q(subscription__isnull=True, date__gte=academic_year.start_date, date__lte=academic_year.end_date)
            )
        
        # Filter by student ID
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            
        # Filter by subscription ID
        subscription_id = self.request.query_params.get('subscription_id') or self.request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
            
        return queryset

    def perform_destroy(self, instance):
        subscription = instance.subscription
        super().perform_destroy(instance)
        if subscription:
            BillingService.sync_subscription_payment_status(subscription)

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().select_related(
        'teacher_payroll__teacher__user',
        'teacher_payroll__academic_year',
    )
    serializer_class = ExpenseSerializer
    permission_classes = [make_module_permission('finances'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = ['description', 'category', 'amount']

    def get_queryset(self):
        queryset = super().get_queryset()
        academic_year_id = self.request.query_params.get('academic_year')
        all_years = self.request.query_params.get('all_years') in ('1', 'true', 'True')

        if academic_year_id:
            academic_year = AcademicYear.objects.filter(pk=academic_year_id).first()
        elif not all_years:
            academic_year = AcademicYear.get_active()
        else:
            academic_year = None

        if academic_year:
            queryset = queryset.filter(date__gte=academic_year.start_date, date__lte=academic_year.end_date)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        expense_status = self.request.query_params.get('status')
        if expense_status:
            queryset = queryset.filter(status=expense_status)

        teacher_id = self.request.query_params.get('teacher_id') or self.request.query_params.get('teacher')
        if teacher_id:
            queryset = queryset.filter(teacher_payroll__teacher_id=teacher_id)

        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(teacher_payroll__year=year)

        month = self.request.query_params.get('month')
        if month:
            queryset = queryset.filter(teacher_payroll__month=month)

        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This salary expense is linked to a teacher payroll and cannot be deleted directly."},
                status=status.HTTP_400_BAD_REQUEST,
            )

class FinancialReportView(views.APIView):
    queryset = Payment.objects.all()
    permission_classes = [make_module_permission('finances'), StrictDjangoModelPermissions]

    def get(self, request):
        """
        Simple aggregation for monthly/yearly reports
        Params: year (default current), month (optional)
        """
        academic_year_id = request.query_params.get('academic_year')
        academic_year = AcademicYear.objects.filter(pk=academic_year_id).first() if academic_year_id else None

        year = request.query_params.get('year', datetime.now().year)
        month = request.query_params.get('month')

        if academic_year:
            payments = Payment.objects.filter(
                Q(subscription__enrollment__academic_year=academic_year) |
                Q(subscription__isnull=True, date__gte=academic_year.start_date, date__lte=academic_year.end_date)
            )
            expenses = Expense.objects.filter(date__gte=academic_year.start_date, date__lte=academic_year.end_date)
        else:
            payments = Payment.objects.filter(date__year=year)
            expenses = Expense.objects.filter(date__year=year)

        if month:
            payments = payments.filter(date__month=month)
            expenses = expenses.filter(date__month=month)

        paid_payments = payments.filter(status='PAID')
        paid_expenses = expenses.filter(status='PAID')
        pending_payments = payments.exclude(status='PAID')

        total_income = paid_payments.aggregate(Sum('amount'))['amount__sum'] or 0
        total_expenses = paid_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        net_profit = total_income - total_expenses
        pending_amount = pending_payments.aggregate(Sum('amount'))['amount__sum'] or 0

        return Response({
            'year': year,
            'academic_year': academic_year.name if academic_year else None,
            'month': month,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'pending_payments_count': pending_payments.count(),
            'pending_payments_amount': pending_amount,
            'paid_payments_count': paid_payments.count(),
            'paid_expenses_count': paid_expenses.count(),
        })


class PaymentStatusView(views.APIView):
    """
    Simple view showing all students with their payment status
    """
    queryset = Payment.objects.all()
    permission_classes = [make_module_permission('finances'), StrictDjangoModelPermissions]

    def get(self, request):
        academic_year_id = request.query_params.get('academic_year')
        academic_year = AcademicYear.objects.filter(pk=academic_year_id).first() if academic_year_id else AcademicYear.get_active()
        BillingService.sync_due_subscriptions(academic_year=academic_year)
        
        students = StudentProfile.objects.filter(status='ACTIVE').select_related('user')
        
        students_data = []
        
        for student in students:
            summary = BillingService.student_payment_summary(student, academic_year=academic_year, sync=False)
            last_payment = (
                Payment.objects
                .filter(student=student, status='PAID', subscription__enrollment__academic_year=academic_year)
                .order_by('-date')
                .first()
            )
            
            students_data.append({
                'student_id': student.id,
                'student_name': f"{student.user.first_name} {student.user.last_name}",
                'total_due': float(summary['total_due']),
                'total_paid': float(summary['total_paid']),
                'balance': float(summary['balance']),
                'status': summary['status'],
                'last_payment_date': last_payment.date if last_payment else None,
                'days_overdue': summary['days_overdue']
            })
        
        return Response(students_data)
