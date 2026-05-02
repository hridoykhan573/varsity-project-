from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'role', 'is_online', 'last_active']

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_username', 'content', 'image', 'is_read', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSimpleSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'last_message', 'unread_count', 'updated_at', 'created_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()
