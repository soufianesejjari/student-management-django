from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, ExpenseViewSet, FinancialReportView, PaymentStatusView

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'expenses', ExpenseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('reports/', FinancialReportView.as_view(), name='financial-reports'),
    path('payment-status/', PaymentStatusView.as_view(), name='payment-status'),
]
