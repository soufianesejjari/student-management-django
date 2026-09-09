from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0010_billingautomationstate_billingautomationrun'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrollment',
            name='billing_plan',
            field=models.CharField(
                choices=[
                    ('MONTHLY', 'Monthly'),
                    ('QUARTERLY', 'Quarterly (3 months)'),
                    ('ANNUAL', 'Annual'),
                ],
                default='MONTHLY',
                help_text='Plan used for future automatic subscription periods.',
                max_length=20,
            ),
        ),
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
