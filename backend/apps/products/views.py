from django_filters import rest_framework as django_filters
from rest_framework import viewsets, permissions, filters, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import F, ExpressionWrapper, DecimalField
from django.db import transaction
from .models import Product, Order, OrderItem
from .serializers import ProductSerializer, OrderSerializer

class IsSellerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and getattr(request.user, 'is_seller', False)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user

class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(method='filter_by_final_price_gte')
    max_price = django_filters.NumberFilter(method='filter_by_final_price_lte')

    class Meta:
        model = Product
        fields = ['seller', 'category', 'min_price', 'max_price']

    def filter_by_final_price_gte(self, queryset, name, value):
        return queryset.annotate(
            final_price_calc=ExpressionWrapper(
                F('price') * (1.0 - F('discount_percent') / 100.0),
                output_field=DecimalField()
            )
        ).filter(final_price_calc__gte=value)

    def filter_by_final_price_lte(self, queryset, name, value):
        return queryset.annotate(
            final_price_calc=ExpressionWrapper(
                F('price') * (1.0 - F('discount_percent') / 100.0),
                output_field=DecimalField()
            )
        ).filter(final_price_calc__lte=value)

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsSellerOrReadOnly]
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']
    
    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        items_data = request.data.get('items', [])
        home_address = request.data.get('home_address')
        road_number = request.data.get('road_number', '')
        shipping_email = request.data.get('shipping_email', '')
        contact_phone = request.data.get('contact_phone')

        if not items_data:
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
        if not home_address or not contact_phone:
            return Response({'error': 'Home address and contact phone are required'}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = 0
        order = Order.objects.create(
            user=request.user,
            total_amount=0,
            home_address=home_address,
            road_number=road_number,
            shipping_email=shipping_email,
            contact_phone=contact_phone
        )

        for item in items_data:
            try:
                product = Product.objects.get(id=item['product_id'])
                quantity = int(item['quantity'])
                
                if product.stock < quantity:
                    raise Exception(f"Insufficient stock for {product.name}")
                
                price = product.final_price
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price_at_purchase=price
                )
                total_amount += price * quantity
            except Product.DoesNotExist:
                return Response({'error': f'Product {item["product_id"]} not found'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        order.total_amount = total_amount
        order.save()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class SellerOrderListView(generics.ListAPIView):
    """View for sellers to see ACTIVE orders for their products (not archived)."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['custom_id', 'user__first_name', 'user__last_name', 'user__email', 'home_address', 'road_number', 'shipping_email', 'contact_phone', 'created_at']

    def get_queryset(self):
        # Filter orders that contain at least one product belonging to this seller
        # AND exclude if the seller has archived it already
        return Order.objects.filter(
            items__product__seller=self.request.user
        ).exclude(
            archived_by=self.request.user
        ).distinct().order_by('-created_at')

class SellerOrderHistoryListView(generics.ListAPIView):
    """View for sellers to see ALL orders (including archived ones)."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['custom_id', 'user__first_name', 'user__last_name', 'user__email', 'home_address', 'road_number', 'shipping_email', 'contact_phone', 'created_at']

    def get_queryset(self):
        return Order.objects.filter(
            items__product__seller=self.request.user
        ).distinct().order_by('-created_at')

class SellerOrderArchiveView(APIView):
    """View for sellers to archive (soft-delete) an order from their inbox."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            # Ensure the order involves this seller
            order = Order.objects.get(pk=pk, items__product__seller=request.user)
            order.archived_by.add(request.user)
            return Response({'message': 'Order archived from inbox'})
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

class OrderUpdateStatusView(APIView):
    """View for sellers to update the status of an order."""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            # Ensure the order contains products from this seller
            order = Order.objects.select_for_update().get(pk=pk, items__product__seller=request.user)
            old_status = order.status
            new_status = request.data.get('status')
            
            if new_status not in ['pending', 'processing', 'shipped', 'delivered', 'cancelled']:
                return Response({'error': 'Invalid status'}, status=400)

            # Trigger Stock Changes
            # 1. Pending -> Processing (Seller confirms)
            if old_status == 'pending' and new_status == 'processing':
                for item in order.items.all():
                    product = item.product
                    if product.stock < item.quantity:
                        return Response({'error': f'Insufficient stock for {product.name}'}, status=400)
                    product.stock = F('stock') - item.quantity
                    product.save()
                    product.refresh_from_db()
                    # Broadcast update
                    from apps.notifications.utils import broadcast_shop_update
                    broadcast_shop_update('STOCK_UPDATE', {
                        'product_id': product.id,
                        'new_stock': product.stock
                    })

            # 2. Processing -> Cancelled (Seller cancels)
            elif old_status == 'processing' and new_status == 'cancelled':
                for item in order.items.all():
                    product = item.product
                    product.stock = F('stock') + item.quantity
                    product.save()
                    product.refresh_from_db()
                    # Broadcast update
                    from apps.notifications.utils import broadcast_shop_update
                    broadcast_shop_update('STOCK_UPDATE', {
                        'product_id': product.id,
                        'new_stock': product.stock
                    })

            order.status = new_status
            order.save()
            return Response(OrderSerializer(order).data)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found or access denied'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class SellerOrderDeleteView(APIView):
    """View for sellers to delete an order and notify the buyer."""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def delete(self, request, pk):
        try:
            # Ensure the order involves this seller
            order = Order.objects.select_for_update().get(pk=pk, items__product__seller=request.user)
            buyer = order.user
            custom_id = order.custom_id
            
            # Restore stock if order was processing/shipped/delivered
            if order.status in ['processing', 'shipped', 'delivered']:
                for item in order.items.all():
                    product = item.product
                    product.stock = F('stock') + item.quantity
                    product.save()
                    product.refresh_from_db()
                    # Broadcast update
                    from apps.notifications.utils import broadcast_shop_update
                    broadcast_shop_update('STOCK_UPDATE', {
                        'product_id': product.id,
                        'new_stock': product.stock
                    })

            # Notify Buyer
            from apps.notifications.utils import create_notification
            create_notification(
                recipient=buyer,
                notification_type='order_deleted',
                title='Order Deleted',
                message=f'Your order {custom_id} has been deleted by the seller.',
                related_object_id=None,
                related_object_type='order'
            )

            # Hard Delete
            order.delete()
            return Response({'message': 'Order deleted and buyer notified.'})
        except Order.DoesNotExist:
            return Response({'error': 'Order not found or access denied'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
