from django.contrib import admin
from .models import Subject, Course, Enrollment, Subscription, StudentFee, AcademySettings


@admin.register(AcademySettings)
class AcademySettingsAdmin(admin.ModelAdmin):
    """Singleton admin – only editable, not deletable."""
    fields = (
        'default_registration_fee',
        'default_insurance_fee',
        'offer_enabled',
        'free_course',
        'offer_max_times',
    )

    def has_add_permission(self, request):
        # Only one row may ever exist
        return not AcademySettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(Subject)
admin.site.register(Course)
admin.site.register(Enrollment)
admin.site.register(Subscription)
admin.site.register(StudentFee)
