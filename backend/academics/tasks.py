"""Celery tasks for academics billing automation."""
from celery import shared_task
from django.utils import timezone

from academics.services import BillingService


@shared_task(bind=True, name='academics.tasks.run_billing_automation')
def run_billing_automation_task(self, today=None, force=False):
    """Generate due subscriptions/fees and update billing status."""
    run_date = timezone.datetime.fromisoformat(today).date() if today else None
    return BillingService.run_billing_automation(today=run_date, force=force)
