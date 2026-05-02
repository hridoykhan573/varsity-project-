from django.contrib import admin
from django.utils.html import format_html
from .models import Appointment, DoctorAvailability, DoctorDateSchedule

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'doctor_name', 'owner_name', 'pet_name', 
        'appointment_date', 'time_slot', 'status', 'status_badge', 'created_at'
    ]
    list_filter = ['status', 'appointment_date', 'created_at']
    search_fields = ['doctor__email', 'pet_owner__email', 'pet_name', 'symptoms']
    list_editable = ['status']
    ordering = ['-appointment_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at']

    @admin.display(description='Doctor')
    def doctor_name(self, obj):
        return format_html('<strong>Dr. {}</strong><br><small>{}</small>', 
                           obj.doctor.get_full_name() or obj.doctor.username, obj.doctor.email)

    @admin.display(description='Pet Owner')
    def owner_name(self, obj):
        return format_html('{}<br><small>{}</small>', 
                           obj.pet_owner.get_full_name() or obj.pet_owner.username, obj.pet_owner.email)

    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'confirmed': '#3b82f6',
            'rejected': '#ef4444',
            'completed': '#10b981',
            'cancelled': '#6b7280',
        }
        color = colors.get(obj.status, '#64748b')
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;border-radius:12px;font-size:0.7rem;font-weight:700">{}</span>',
            color, obj.get_status_display()
        )

@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'day_of_week', 'start_time', 'end_time', 'slot_duration', 'capacity', 'is_active']
    list_filter = ['day_of_week', 'is_active']
    search_fields = ['doctor__email']

@admin.register(DoctorDateSchedule)
class DoctorDateScheduleAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'date', 'max_slots', 'is_active', 'created_at']
    list_filter = ['date', 'is_active']
    search_fields = ['doctor__email']
