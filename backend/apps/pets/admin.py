from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.accounts.admin_user_display import format_user_admin_cell
from apps.core.admin_mixins import AdvancedSearchMixin
from .models import Pet, HealthRecord


@admin.register(Pet)
class PetAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = [
        'name', 'pet_type', 'breed', 'status', 'listing_type',
        'owner_display', 'location', 'created_at',
    ]
    list_filter = ['pet_type', 'status', 'listing_type', 'is_vaccinated', 'gender']
    search_fields = ['name', 'breed', 'location', 'owner__username', 'owner__email', 'pet_type', 'status', 'listing_type']
    ordering = ['-created_at']

    @admin.display(description=_('Owner'), ordering='owner__email')
    def owner_display(self, obj):
        return format_user_admin_cell(obj.owner)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('owner')


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ['pet', 'record_type', 'title', 'date', 'next_due_date']
    list_filter = ['record_type']
    search_fields = ['pet__name', 'title']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('pet', 'pet__owner')
