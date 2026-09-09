from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0002_add_is_free_offer_to_enrollment'),
    ]

    operations = [
        migrations.AlterField(
            model_name='subscription',
            name='subscription_type',
            field=models.CharField(
                choices=[
                    ('MONTHLY', 'Monthly'),
                    ('QUARTERLY', 'Quarterly (3 months)'),
                    ('ANNUAL', 'Annual'),
                ],
                default='MONTHLY',
                max_length=20,
            ),
        ),
    ]
