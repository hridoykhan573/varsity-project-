from rest_framework import serializers
from .models import Complaint


class ComplaintSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id', 'user', 'username', 'user_email', 
            'subject', 'description', 'document', 
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Automatically assign the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        return super().create(validated_data)
