from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserLoginHistory
from django.shortcuts import render
from django.http import HttpResponseRedirect
from apps.notifications.models import Notification
from django.contrib import messages
from django.contrib.admin import helpers

from .admin_user_display import render_avatar_only

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    # ... existing attributes ...
    list_display = [
        'avatar_preview',
        'display_name',
        'email',
        'role',
        'is_active',
        'created_at',
    ]
    list_display_links = ('email',)
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['email', 'username', 'first_name', 'last_name', 'phone']
    ordering = ['-created_at']
    actions = ['send_custom_alert']
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Extra Info', {'fields': ('role', 'phone', 'avatar', 'location', 'bio')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    def render_change_form(self, request, context, add=False, change=False, form_url='', obj=None):
        if obj:
            # Fetch latest 10 login logs for the history list
            login_history = UserLoginHistory.objects.filter(user=obj).order_by('-timestamp')[:10]
            context.update({
                'login_history': login_history,
                'current_user': obj
            })
        return super().render_change_form(request, context, add, change, form_url, obj)


    def save_model(self, request, obj, form, change):
        # Standard fields from the custom HTML form
        if 'first_name' in request.POST:
            obj.first_name = request.POST.get('first_name')
        if 'last_name' in request.POST:
            obj.last_name = request.POST.get('last_name')
        if 'email' in request.POST:
            obj.email = request.POST.get('email')
        if 'username' in request.POST:
            obj.username = request.POST.get('username')

        # Custom fields from the custom HTML form
        if 'role' in request.POST:
            obj.role = request.POST.get('role')
        if 'phone' in request.POST:
            obj.phone = request.POST.get('phone')
        if 'location' in request.POST:
            obj.location = request.POST.get('location')
        if 'bio' in request.POST:
            obj.bio = request.POST.get('bio')

        # Handle Avatar file upload
        if 'avatar' in request.FILES:
            obj.avatar = request.FILES['avatar']

        # Handle optional password update
        p1 = request.POST.get('password1', '').strip()
        p2 = request.POST.get('password2', '').strip()
        if p1 and p1 == p2:
            obj.set_password(p1)
        
        # Save the object manually to ensure all fields from request.POST/FILES are committed
        obj.save()

    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        
        # Smart Filter keywords
        term = search_term.lower().strip()
        
        # Role Filters
        if term == 'staff' or term == 'shelter':
            queryset |= self.model.objects.filter(role='shelter_staff')
        elif term == 'seller':
            queryset |= self.model.objects.filter(role='seller')
        elif term == 'owner':
            queryset |= self.model.objects.filter(role='owner')
        elif term == 'admin':
            queryset |= self.model.objects.filter(role='admin')
            
        # Status Filters
        elif term == 'active':
            queryset = queryset.filter(is_active=True)
        elif term == 'inactive':
            queryset = queryset.filter(is_active=False)
            
        return queryset, use_distinct

    @admin.display(description='Avatar', ordering=False)
    def avatar_preview(self, obj):
        if not obj.pk:
            return '—'
        return render_avatar_only(obj, size=48)

    @admin.display(description='Name', ordering='username')
    def display_name(self, obj):
        full = (obj.get_full_name() or '').strip()
        if full:
            return full
        if (obj.username or '').strip():
            return obj.username.strip()
        if obj.email:
            return obj.email.split('@')[0]
        return '—'

    def send_custom_alert(self, request, queryset):
        if 'post' in request.POST:
            title = request.POST.get('title')
            message = request.POST.get('message')

            for user in queryset:
                Notification.objects.create(
                    recipient=user,
                    notification_type='system',
                    title=title,
                    message=message
                )

            self.message_user(request, f"Custom alert broadcasted to {queryset.count()} users.")
            return HttpResponseRedirect(request.get_full_path())

        return render(request, 'admin/send_alert.html', context={
            'queryset': queryset,
            'action_checkbox_name': helpers.ACTION_CHECKBOX_NAME
        })

    send_custom_alert.short_description = 'Send custom alert message'
