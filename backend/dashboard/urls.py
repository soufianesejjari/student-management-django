from django.urls import path
from .views import (
    DashboardStatsView, ReportsView, ReportsExcelExportView, StudentPaymentsExcelExportView,
    TeacherPayrollExcelExportView, UpcomingClassesView,
)

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('upcoming-classes/', UpcomingClassesView.as_view(), name='upcoming-classes'),
    path('reports/', ReportsView.as_view(), name='dashboard-reports'),
    path('reports/export/', ReportsExcelExportView.as_view(), name='dashboard-reports-export'),
    path('students/<int:student_id>/payments/export/', StudentPaymentsExcelExportView.as_view(), name='student-payments-export'),
    path('teachers/<int:teacher_id>/payrolls/export/', TeacherPayrollExcelExportView.as_view(), name='teacher-payrolls-export'),
]
