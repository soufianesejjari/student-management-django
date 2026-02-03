from django.db import migrations, models


def set_solfege_type(apps, schema_editor):
    Subject = apps.get_model('academics', 'Subject')
    for subject in Subject.objects.all():
        name = (subject.name or '').lower()
        if 'solf' in name:
            subject.subject_type = 'SOLFEGE'
            subject.save(update_fields=['subject_type'])


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0002_alter_enrollment_options_remove_enrollment_is_active_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='subject',
            name='subject_type',
            field=models.CharField(choices=[('SOLFEGE', 'Solfege'), ('INSTRUMENT', 'Instrument')], default='INSTRUMENT', max_length=20),
        ),
        migrations.RunPython(set_solfege_type, migrations.RunPython.noop),
    ]
