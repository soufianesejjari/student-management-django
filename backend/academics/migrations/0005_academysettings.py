from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0004_enrollment_is_free_offer'),
    ]

    operations = [
        migrations.CreateModel(
            name='AcademySettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('offer_enabled', models.BooleanField(
                    default=False,
                    help_text='When enabled, students automatically receive the free course on their first enrollment.',
                )),
                ('offer_max_times', models.PositiveSmallIntegerField(
                    default=1,
                    help_text='How many times a student can receive the free course offer.',
                )),
                ('free_course', models.ForeignKey(
                    blank=True,
                    help_text='The course offered for free (e.g. Solfège). Leave blank to disable the offer.',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to='academics.course',
                )),
            ],
            options={
                'verbose_name': 'Academy Settings',
                'verbose_name_plural': 'Academy Settings',
            },
        ),
    ]
