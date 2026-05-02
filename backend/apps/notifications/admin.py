from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.accounts.admin_user_display import format_user_admin_cell
from apps.core.admin_mixins import AdvancedSearchMixin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = [
        'recipient_display', 'notification_type', 'title', 'is_read', 'created_at',
    ]
    list_filter = ['notification_type', 'is_read']
    search_fields = ['recipient__username', 'recipient__email', 'title']
    ordering = ['-created_at']

    @admin.display(description=_('Recipient'), ordering='recipient__email')
    def recipient_display(self, obj):
        return format_user_admin_cell(obj.recipient)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recipient')
