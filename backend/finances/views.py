from rest_framework import viewsets, permissions, views, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from .models import Payment, Expense
from .serializers import PaymentSerializer, ExpenseSerializer
from datetime import datetime

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['student__user__first_name', 'student__user__last_name', 'amount']

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['description', 'category', 'amount']

class FinancialReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Simple aggregation for monthly/yearly reports
        Params: year (default current), month (optional)
        """
        year = request.query_params.get('year', datetime.now().year)
        month = request.query_params.get('month')

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
            'month': month,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_profit': net_profit
        })
