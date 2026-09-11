from django.db import migrations, models
from django.db.models import Q


def cancel_open_subscriptions_for_cancelled_enrollments(apps, schema_editor):
    Subscription = apps.get_model('academics', 'Subscription')
    Subscription.objects.filter(
        enrollment__status='CANCELLED',
        payment_status__in=['PENDING', 'OVERDUE'],
    ).update(payment_status='CANCELLED')


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0012_enrollment_assigned_sessions'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name='enrollment',
            constraint=models.UniqueConstraint(
                fields=('student', 'course', 'academic_year'),
                condition=Q(status='ACTIVE'),
                name='unique_active_student_course_year',
            ),
        ),
        migrations.RunPython(
            cancel_open_subscriptions_for_cancelled_enrollments,
            migrations.RunPython.noop,
        ),
    ]
