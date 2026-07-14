from django.urls import path
from .views import DashboardStatsView, ReportsView, ReportsExcelExportView, UpcomingClassesView

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('upcoming-classes/', UpcomingClassesView.as_view(), name='upcoming-classes'),
    path('reports/', ReportsView.as_view(), name='dashboard-reports'),
    path('reports/export/', ReportsExcelExportView.as_view(), name='dashboard-reports-export'),
]
