from rest_framework import viewsets, permissions, views, status, filters
from users.permissions import make_module_permission, StrictDjangoModelPermissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import ProtectedError
from django.db.models import Sum, Q
from .models import Payment, Expense
from .serializers import PaymentSerializer, ExpenseSerializer
from calendar import monthrange
from datetime import date, datetime
from users.models import StudentProfile
from academics.models import AcademicYear
from academics.services import BillingService

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related(
        'student__user',
        'subscription__enrollment__course',
        'student_fee__academic_year',
    )
    serializer_class = PaymentSerializer
    permission_classes = [make_module_permission('finances'), StrictDjangoModelPermissions]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'student__user__first_name',
        'student__user__last_name',
        'student__user__username',
        'student__user__email',
        'subscription__enrollment__course__name',
        'subscription__subscription_type',
        'student_fee__fee_type',
        'invoice_ref',
        'notes',
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
                Q(student_fee__academic_year=academic_year) |
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

        student_fee_id = self.request.query_params.get('student_fee_id') or self.request.query_params.get('student_fee')
        if student_fee_id:
            queryset = queryset.filter(student_fee_id=student_fee_id)
            
        return queryset

    def perform_destroy(self, instance):
        student_id = instance.student_id
        subscription = instance.subscription
        student_fee = instance.student_fee
        super().perform_destroy(instance)
        if subscription:
            BillingService.sync_subscription_payment_status(subscription)
        if student_fee:
            BillingService.sync_student_fee_status(student_fee)
        from users.tma_sync import schedule_student_sync
        schedule_student_sync(student_id)

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
        report_year = int(year)
        report_month = int(month) if month else None

        if academic_year:
            payments = Payment.objects.filter(
                Q(subscription__enrollment__academic_year=academic_year) |
                Q(student_fee__academic_year=academic_year) |
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
        manual_pending_payments = payments.exclude(status='PAID').filter(
            subscription__isnull=True,
            student_fee__isnull=True,
        )

        today = datetime.now().date()
        if report_month:
            pending_through_date = date(report_year, report_month, monthrange(report_year, report_month)[1])
        elif academic_year:
            pending_through_date = min(today, academic_year.end_date)
        else:
            pending_through_date = today

        billing_academic_year = academic_year or AcademicYear.get_active()
        pending_billing = BillingService.pending_billing_summary(
            academic_year=billing_academic_year,
            today=today,
            through_date=pending_through_date,
        )

        total_income = paid_payments.aggregate(Sum('amount'))['amount__sum'] or 0
        total_expenses = paid_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        net_profit = total_income - total_expenses
        manual_pending_amount = manual_pending_payments.aggregate(Sum('amount'))['amount__sum'] or 0
        pending_amount = pending_billing['amount'] + manual_pending_amount

        return Response({
            'year': year,
            'academic_year': academic_year.name if academic_year else None,
            'month': month,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'pending_payments_count': pending_billing['count'] + manual_pending_payments.count(),
            'pending_payments_amount': pending_amount,
            'pending_subscriptions_count': pending_billing['subscriptions_count'],
            'pending_subscriptions_amount': pending_billing['subscriptions_amount'],
            'pending_student_fees_count': pending_billing['student_fees_count'],
            'pending_student_fees_amount': pending_billing['student_fees_amount'],
            'pending_manual_payments_count': manual_pending_payments.count(),
            'pending_manual_payments_amount': manual_pending_amount,
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
        BillingService.sync_student_fees(academic_year=academic_year)
        
        students = StudentProfile.objects.filter(status='ACTIVE').select_related('user')
        
        students_data = []
        
        for student in students:
            summary = BillingService.student_payment_summary(student, academic_year=academic_year, sync=False)
            last_payment = (
                Payment.objects
                .filter(
                    Q(subscription__enrollment__academic_year=academic_year) |
                    Q(student_fee__academic_year=academic_year),
                    student=student,
                    status='PAID',
                )
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
