from django.core.management.base import BaseCommand
from academics.models import Subject


DEFAULT_SUBJECTS = [
    {'name': 'Piano', 'color_code': '#FF6B6B'},
    {'name': 'Guitar', 'color_code': '#4ECDC4'},
    {'name': 'Violin', 'color_code': '#45B7D1'},
    {'name': 'Flute', 'color_code': '#96CEB4'},
    {'name': 'Saxophone', 'color_code': '#FFEAA7'},
    {'name': 'Drums', 'color_code': '#DFE6E9'},
    {'name': 'Cello', 'color_code': '#A29BFE'},
    {'name': 'Vocals', 'color_code': '#FD79A8'},
    {'name': 'Music Theory', 'color_code': '#74B9FF'},
    {'name': 'Solfège', 'color_code': '#81ECEC'},
]


class Command(BaseCommand):
    help = 'Seed default musical subjects into the database'

    def handle(self, *args, **options):
        created_count = 0
        for subject_data in DEFAULT_SUBJECTS:
            subject, created = Subject.objects.get_or_create(
                name=subject_data['name'],
                defaults={'color_code': subject_data['color_code']}
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created subject: {subject.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Subject already exists: {subject.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Seeding complete: {created_count} new subjects created')
        )
