from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_bootstrap_systemtech_admin'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='school_or_profession',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
