# Generated migration file for adding teacher hourly_rate field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='teacherprofile',
            name='hourly_rate',
            field=models.DecimalField(decimal_places=2, default=0.0, help_text='Pay rate per hour in currency units', max_digits=10),
        ),
    ]
