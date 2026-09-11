from django.db import migrations, models


def assign_unambiguous_existing_sessions(apps, schema_editor):
    Enrollment = apps.get_model('academics', 'Enrollment')
    ClassSession = apps.get_model('planning', 'ClassSession')

    for enrollment in Enrollment.objects.iterator():
        session_ids = list(
            ClassSession.objects
            .filter(
                course_id=enrollment.course_id,
                academic_year_id=enrollment.academic_year_id,
            )
            .values_list('id', flat=True)[:2]
        )
        if len(session_ids) == 1:
            enrollment.assigned_sessions.add(session_ids[0])


def clear_existing_assignments(apps, schema_editor):
    Enrollment = apps.get_model('academics', 'Enrollment')
    through = Enrollment.assigned_sessions.through
    through.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('planning', '0005_teachermonthlypayroll'),
        ('academics', '0011_add_annual_billing_plan'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollment',
            name='assigned_sessions',
            field=models.ManyToManyField(
                blank=True,
                help_text='Exact recurring class sessions attended by this student.',
                related_name='student_enrollments',
                to='planning.classsession',
            ),
        ),
        migrations.RunPython(
            assign_unambiguous_existing_sessions,
            clear_existing_assignments,
        ),
    ]
