from django.contrib import admin
from django.db.models import Q
from django.urls import reverse, path
from django.shortcuts import render, get_object_or_404
from django.utils.html import format_html
from apps.accounts.admin_user_display import format_user_admin_cell
from .models import Product, Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    raw_id_fields = ['product']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'seller_link', 'category', 'brand', 'price', 'stock', 'created_at']
    list_filter = ['category', 'seller', 'brand']
    search_fields = ['name', 'description', 'brand', 'seller__email', 'seller__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['title'] = 'Products'
        return super().changelist_view(request, extra_context=extra_context)

    @admin.display(description='Seller', ordering='seller__email')
    def seller_link(self, obj):
        return format_user_admin_cell(obj.seller)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('seller')

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<path:object_id>/buyers/', self.admin_site.admin_view(self.buyers_view), name='products_product_buyers'),
        ]
        return custom_urls + urls

    def buyers_view(self, request, object_id, *args, **kwargs):
        product = get_object_or_404(Product, pk=object_id)
        purchases = OrderItem.objects.filter(product=product).select_related('order', 'order__user')

        # Handle Smart Search
        search_query = request.GET.get('q', '').strip()
        if search_query:
            words = search_query.split()
            
            # Dictionaries for heuristic filtering
            order_statuses = ['pending', 'shipped', 'delivered', 'cancelled']
            payment_statuses = ['unpaid', 'paid']
            fluff_words = ['orders', 'order', 'from', 'by', 'between', 'in', 'on', 'at', 'with', 'for']
            
            unrecognized_terms = []
            
            for word in words:
                w_lower = word.lower()
                
                # Check for Order Status
                if w_lower in order_statuses:
                    purchases = purchases.filter(order__status=w_lower)
                    continue
                    
                # Check for Payment Status (paid | unpaid)
                if w_lower in payment_statuses:
                    purchases = purchases.filter(order__payment_status=w_lower)
                    continue
                    
                # Check if it's purely a number (quantity or price logic)
                if w_lower.isdigit():
                    num = int(w_lower)
                    purchases = purchases.filter(Q(quantity=num) | Q(price_at_purchase=num))
                    continue
                    
                # Ignore conversational fluff
                if w_lower in fluff_words:
                    continue
                    
                unrecognized_terms.append(word)
                
            # For remaining unknown text terms, AND them together
            for term in unrecognized_terms:
                purchases = purchases.filter(
                    Q(order__user__username__icontains=term) |
                    Q(order__user__first_name__icontains=term) |
                    Q(order__user__last_name__icontains=term) |
                    Q(order__user__email__icontains=term) |
                    Q(order__contact_phone__icontains=term) |
                    Q(order__home_address__icontains=term) |
                    Q(order__road_number__icontains=term) |
                    Q(order__created_at__icontains=term)
                )

        # Handle Sort
        sort_param = request.GET.get('sort', 'newest')
        if sort_param == 'newest':
            purchases = purchases.order_by('-order__created_at')
        elif sort_param == 'oldest':
            purchases = purchases.order_by('order__created_at')
        elif sort_param == 'qty_high':
            purchases = purchases.order_by('-quantity')
        elif sort_param == 'qty_low':
            purchases = purchases.order_by('quantity')
        elif sort_param == 'price_high':
            purchases = purchases.order_by('-price_at_purchase')
        elif sort_param == 'price_low':
            purchases = purchases.order_by('price_at_purchase')
        elif sort_param == 'name_asc':
            purchases = purchases.order_by('order__user__username')
        elif sort_param == 'name_desc':
            purchases = purchases.order_by('-order__user__username')
        elif sort_param == 'status':
            purchases = purchases.order_by('order__status', '-order__created_at')
        elif sort_param == 'payment':
            purchases = purchases.order_by('order__payment_status', '-order__created_at')
        elif sort_param == 'location':
            purchases = purchases.order_by('order__home_address', '-order__created_at')
        else:
            purchases = purchases.order_by('-order__created_at')

        context = self.admin_site.each_context(request)
        context.update({
            'title': f'Buyers for: {product.name}',
            'product': product,
            'purchases': purchases,
            'search_query': search_query,
            'sort_param': sort_param,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request, product),
        })
        return render(request, 'admin/products/product/buyers.html', context)

from apps.core.admin_mixins import AdvancedSearchMixin

@admin.register(Order)
class OrderAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = ['custom_id', 'user', 'total_amount', 'status', 'payment_status', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['custom_id', 'user__email', 'user__username', 'contact_phone']
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price_at_purchase']
    list_filter = ['order__status']
    search_fields = ['order__custom_id', 'product__name']
