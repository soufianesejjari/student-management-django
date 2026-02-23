# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollment',
            name='is_free_offer',
            field=models.BooleanField(
                default=False,
                help_text='Whether this enrollment was auto-created as a free offer (e.g. free Solfège with any course)',
            ),
        ),
    ]
