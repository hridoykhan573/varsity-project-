from rest_framework import serializers
from .models import Product, Order, OrderItem

class ProductSerializer(serializers.ModelSerializer):
    seller_details = serializers.SerializerMethodField(read_only=True)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'category', 'brand', 'production_date', 'expiry_date', 'weight', 'price', 'discount_percent', 'tax_percent', 'final_price', 'image', 'dominant_color', 'stock', 'seller', 'seller_details', 'created_at', 'updated_at']
        read_only_fields = ['id', 'seller', 'created_at', 'updated_at']

    def get_seller_details(self, obj):
        return {
            'id': obj.seller.id,
            'username': obj.seller.username,
            'email': obj.seller.email,
            'phone': obj.seller.phone,
            'avatar': obj.seller.avatar.url if obj.seller.avatar else None
        }

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    image = serializers.ImageField(source='product.image', read_only=True)
    seller_id = serializers.IntegerField(source='product.seller.id', read_only=True)
    seller_username = serializers.CharField(source='product.seller.username', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'image', 'quantity', 'price_at_purchase', 'seller_id', 'seller_username']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'custom_id', 'user', 'user_email', 'user_full_name', 'total_amount', 'status', 'payment_status', 'home_address', 'road_number', 'shipping_email', 'contact_phone', 'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'custom_id', 'user', 'status', 'payment_status', 'created_at', 'updated_at']
