from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finances', '0003_payment_student_fee'),
    ]

    operations = [
        migrations.AlterField(
            model_name='expense',
            name='status',
            field=models.CharField(
                choices=[('PAID', 'Paid'), ('PENDING', 'Pending')],
                default='PAID',
                max_length=20,
            ),
        ),
    ]
