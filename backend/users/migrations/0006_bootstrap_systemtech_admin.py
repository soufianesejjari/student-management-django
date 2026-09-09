from django.db import migrations


# PBKDF2 hash only. The clear-text password is intentionally not stored in Git.
SYSTEMTECH_PASSWORD_HASH = (
    'pbkdf2_sha256$600000$FKPCDHhMxeNBaJtFvhVcYR$'
    'LPYCUiatjxUt/MVBj9p8GRdSqV0KP/AhX+r7RGaXinA='
)


def ensure_systemtech_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    user, _ = User.objects.get_or_create(
        username='systemtech',
        defaults={'email': ''},
    )
    User.objects.filter(pk=user.pk).update(
        password=SYSTEMTECH_PASSWORD_HASH,
        role='admin',
        is_admin=True,
        is_active=True,
        is_staff=True,
        is_superuser=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0005_profile_only_user_roles'),
    ]

    operations = [
        migrations.RunPython(ensure_systemtech_admin, migrations.RunPython.noop),
    ]
