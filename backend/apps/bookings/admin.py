from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.accounts.admin_user_display import format_user_admin_cell
from apps.core.admin_mixins import AdvancedSearchMixin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = [
        'pet', 'shelter', 'user_display', 'start_date', 'end_date',
        'status', 'payment_status', 'total_price',
    ]
    list_filter = ['status', 'payment_status']
    search_fields = ['pet__name', 'shelter__name', 'user__username', 'user__email']
    ordering = ['-created_at']

    @admin.display(description=_('User'), ordering='user__email')
    def user_display(self, obj):
        return format_user_admin_cell(obj.user)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'pet', 'shelter')
