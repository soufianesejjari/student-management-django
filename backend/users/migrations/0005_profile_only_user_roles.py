from django.db import migrations, models


def mark_profile_users_as_non_login(apps, schema_editor):
    User = apps.get_model('users', 'User')

    User.objects.filter(
        student_profile__isnull=False,
        is_superuser=False,
    ).update(role='student', is_admin=False, is_active=False)
    User.objects.filter(
        teacher_profile__isnull=False,
        is_superuser=False,
    ).update(role='teacher', is_admin=False, is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_studentprofile_address_studentprofile_age_group_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Admin'),
                    ('secretaire', 'Secrétaire'),
                    ('student', 'Student record'),
                    ('teacher', 'Teacher record'),
                ],
                default='admin',
                help_text='Role determines base access level',
                max_length=20,
            ),
        ),
        migrations.RunPython(mark_profile_users_as_non_login, migrations.RunPython.noop),
    ]
