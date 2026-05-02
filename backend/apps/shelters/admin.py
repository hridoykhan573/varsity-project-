from django.contrib import admin, messages
from django.utils.translation import gettext_lazy as _

from apps.accounts.admin_user_display import format_user_admin_cell
from .models import Shelter, Service


@admin.register(Shelter)
class ShelterAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'owner_display', 'location', 'is_verified', 'is_active',
        'active_services_count', 'rating_avg',
    ]
    list_filter = ['is_verified', 'is_active']
    list_editable = ['is_verified', 'is_active']
    search_fields = ['name', 'location', 'owner__username', 'owner__email']
    ordering = ['-rating_avg']
    actions = ['verify_shelters']

    @admin.display(description=_('Owner'), ordering='owner__email')
    def owner_display(self, obj):
        return format_user_admin_cell(obj.owner)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('owner')

    def active_services_count(self, obj):
        return obj.services.filter(is_available=True).count()

    active_services_count.short_description = "Active Services"

    @admin.action(description="Mark selected shelters as verified")
    def verify_shelters(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"Successfully verified {updated} shelter(s).", level=messages.SUCCESS)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'shelter', 'service_type', 'price', 'is_available']
    list_filter = ['service_type', 'is_available']
    list_editable = ['is_available']
    search_fields = ['name', 'shelter__name']
