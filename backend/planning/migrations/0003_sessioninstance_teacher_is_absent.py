# Generated migration for adding teacher_is_absent field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planning', '0002_alter_classsession_end_date_sessioninstance'),
    ]

    operations = [
        migrations.AddField(
            model_name='sessioninstance',
            name='teacher_is_absent',
            field=models.BooleanField(default=False),
        ),
    ]
