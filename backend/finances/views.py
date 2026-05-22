from rest_framework import viewsets, permissions, views, status, filters
from users.permissions import make_module_permission, StrictDjangoModelPermissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Q
from .models import Payment, Expense
from .serializers import PaymentSerializer, ExpenseSerializer
from datetime import datetime, timedelta, date
from users.models import StudentProfile
from academics.models import AcademicYear

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

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
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

        return queryset

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

        total_income = payments.aggregate(Sum('amount'))['amount__sum'] or 0
        total_expenses = expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        net_profit = total_income - total_expenses

        return Response({
            'year': year,
            'academic_year': academic_year.name if academic_year else None,
            'month': month,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_profit': net_profit
        })


class PaymentStatusView(views.APIView):
    """
    Simple view showing all students with their payment status
    """
    queryset = Payment.objects.all()
    permission_classes = [make_module_permission('finances'), StrictDjangoModelPermissions]

    def get(self, request):
        from academics.models import Enrollment
        academic_year_id = request.query_params.get('academic_year')
        academic_year = AcademicYear.objects.filter(pk=academic_year_id).first() if academic_year_id else AcademicYear.get_active()
        
        students = StudentProfile.objects.filter(status='ACTIVE').select_related('user')
        today = date.today()
        current_month = today.month
        current_year = today.year
        
        students_data = []
        
        for student in students:
            # Get active enrollments
            enrollments = Enrollment.objects.filter(
                student=student,
                academic_year=academic_year,
                status='ACTIVE'
            ).select_related('course')
            
            # Calculate total monthly amount from all enrollments
            total_monthly = sum(e.custom_price for e in enrollments)
            
            # Get all payments for this month
            month_payments = Payment.objects.filter(
                student=student,
                date__month=current_month,
                date__year=current_year
            ).filter(
                Q(subscription__enrollment__academic_year=academic_year) |
                Q(subscription__isnull=True)
            )
            
            total_paid = month_payments.aggregate(Sum('amount'))['amount__sum'] or 0
            balance = total_monthly - total_paid
            
            # Get last payment
            last_payment = month_payments.order_by('-date').first()
            
            # Determine status
            if balance <= 0:
                payment_status = 'PAID'
            elif today.day > 7:  # Give 7 days grace period
                days_overdue = (today - date(current_year, current_month, 8)).days
                payment_status = 'OVERDUE'
            else:
                days_overdue = None
                payment_status = 'PENDING'
            
            students_data.append({
                'student_id': student.id,
                'student_name': f"{student.user.first_name} {student.user.last_name}",
                'total_due': float(total_monthly),
                'total_paid': float(total_paid),
                'balance': float(balance),
                'status': payment_status,
                'last_payment_date': last_payment.date if last_payment else None,
                'days_overdue': days_overdue if payment_status == 'OVERDUE' else None
            })
        
        return Response(students_data)
