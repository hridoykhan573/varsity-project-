from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.accounts.admin_user_display import format_user_admin_cell
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = [
        'user_display', 'shelter', 'target_user_display',
        'rating', 'is_verified', 'created_at',
    ]
    list_filter = ['rating', 'is_verified']
    search_fields = [
        'user__username', 'user__email', 'shelter__name',
        'target_user__username', 'target_user__email',
    ]
    ordering = ['-created_at']

    @admin.display(description=_('Reviewer'), ordering='user__email')
    def user_display(self, obj):
        return format_user_admin_cell(obj.user)

    @admin.display(description=_('Reviewed user'), ordering='target_user__email')
    def target_user_display(self, obj):
        if obj.target_user_id:
            return format_user_admin_cell(obj.target_user)
        return '—'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'shelter', 'target_user',
        )
