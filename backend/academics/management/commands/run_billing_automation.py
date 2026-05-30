from django.core.management.base import BaseCommand

from academics.services import BillingService


class Command(BaseCommand):
    help = 'Run the automatic billing sync once.'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Run even if the job already succeeded today.')

    def handle(self, *args, **options):
        result = BillingService.run_billing_automation(force=options['force'])
        self.stdout.write(self.style.SUCCESS(str(result)))
