from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.accounts.admin_user_display import format_user_admin_cell
from .models import Complaint


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('user_display', 'subject', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'subject', 'description')
    readonly_fields = ('created_at', 'updated_at', 'reply_at')
    fieldsets = (
        ('Reporter Information', {
            'fields': ('user',)
        }),
        ('Complaint Details', {
            'fields': ('subject', 'description', 'document')
        }),
        ('Admin Reply', {
            'fields': ('admin_reply', 'reply_at')
        }),
        ('Status', {
            'fields': ('status', 'created_at', 'updated_at')
        }),
    )

    @admin.display(description=_('User'), ordering='user__email')
    def user_display(self, obj):
        return format_user_admin_cell(obj.user)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

