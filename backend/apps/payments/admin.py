from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.accounts.admin_user_display import format_user_admin_cell
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'booking', 'user_display', 'amount', 'method', 'status',
        'transaction_id', 'created_at',
    ]
    list_filter = ['method', 'status']
    search_fields = ['user__username', 'user__email', 'transaction_id']
    ordering = ['-created_at']

    @admin.display(description=_('User'), ordering='user__email')
    def user_display(self, obj):
        return format_user_admin_cell(obj.user)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'booking', 'order')

    def changelist_view(self, request, extra_context=None):
        import json
        from django.db.models import Count
        # Aggregate payment methods
        method_counts = list(Payment.objects.values('method').annotate(count=Count('id')))
        
        labels = []
        data = []
        for item in method_counts:
            # item is like {'method': 'card', 'count': 45}
            labels.append(item['method'].title() if item['method'] else 'Unknown')
            data.append(item['count'])

        chart_data = {
            'labels': labels,
            'data': data
        }
        
        extra_context = extra_context or {}
        extra_context['payment_method_data'] = json.dumps(chart_data)
        
        return super().changelist_view(request, extra_context=extra_context)
