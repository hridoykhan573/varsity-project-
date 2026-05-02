from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.models import Group

from .models import GroupMember, GroupMemberActivity, PortalMessage


class PortalMessageInline(admin.TabularInline):
    model = PortalMessage
    fk_name = 'recipient_member'
    extra = 1
    fields = ['sender_user', 'subject', 'body', 'is_read', 'created_at']
    readonly_fields = ['created_at']
    verbose_name = 'Direct Message to Member'
    verbose_name_plural = 'Direct Messages to Member'

    def get_queryset(self, request):
        # Only show messages sent to this specific member
        return super().get_queryset(request).filter(recipient_member__isnull=False)

    def has_add_permission(self, request, obj=None):
        return True


# ... (PasswordToggleWidget and GroupMemberForm remain the same)


class PasswordToggleWidget(forms.Widget):
    def render(self, name, value, attrs=None, renderer=None):
        val = value if value is not None else ''
        return format_html(
            '<div style="position:relative;display:inline-block;width:100%;max-width:280px;">'
            '<input type="password" name="{}" value="{}" class="vTextField" style="width:100%;padding-right:32px;box-sizing:border-box;" />'
            '<button type="button" onclick="var i=this.previousElementSibling; i.type=i.type===\'password\'?\'text\':\'password\'; this.innerText=i.type===\'password\'?\'👁️\':\'🙈\';" '
            'style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;">👁️</button>'
            '</div>', name, val
        )

class GroupMemberForm(forms.ModelForm):
    portal_password = forms.CharField(
        label='Current Password',
        required=False,
        widget=PasswordToggleWidget(),
        help_text='Admin can view and edit the current plain text password here.'
    )
    change_password = forms.CharField(
        label='Change Password',
        widget=forms.PasswordInput(render_value=False),
        required=False,
        min_length=8,
        help_text='Optional: Enter a new password (min 8 chars) here.'
    )
    confirm_change_password = forms.CharField(
        label='Confirm Change Password',
        widget=forms.PasswordInput(render_value=False),
        required=False,
    )

    class Meta:
        model = GroupMember
        fields = ['email', 'portal_password', 'display_name', 'group', 'is_active']

    def clean(self):
        cleaned = super().clean()
        pw = cleaned.get('change_password') or ''
        confirm = cleaned.get('confirm_change_password') or ''
        if pw or confirm:
            if pw != confirm:
                raise forms.ValidationError({'confirm_change_password': 'Passwords do not match.'})
            if len(pw) < 8:
                raise forms.ValidationError({'change_password': 'Password must be at least 8 characters.'})
        return cleaned

    def save(self, commit=True):
        member = super().save(commit=False)
        pw = self.cleaned_data.get('change_password') or ''
        if pw:
            # "Change Password" overrides the current password
            member.set_password(pw)
        else:
            # Or if they manually edited the portal_password text field:
            port_pw = self.cleaned_data.get('portal_password') or ''
            if port_pw and member.portal_password != port_pw:
                member.set_password(port_pw)
        if commit:
            member.save()
        return member


class GroupMemberActivityInline(admin.TabularInline):
    model = GroupMemberActivity
    extra = 0
    readonly_fields = ['action', 'permission_codename', 'ip_address', 'is_deleted_by_user', 'timestamp']
    can_delete = False
    max_num = 30
    ordering = ['-timestamp']
    verbose_name = 'Recent Activity'
    verbose_name_plural = 'Recent Activity (last 30)'

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    form = GroupMemberForm
    list_display = [
        'email_display', 'portal_password', 'display_name', 'group_badge',
        'permission_count', 'is_active', 'created_at'
    ]
    list_display_links = ['email_display']
    list_filter = ['group', 'is_active']
    search_fields = ['email', 'display_name', 'group__name']
    ordering = ['group__name', 'email']
    readonly_fields = ['created_at', 'updated_at', 'portal_login_link']
    inlines = [GroupMemberActivityInline, PortalMessageInline]

    fieldsets = (
        ('Member Identity', {
            'fields': ('email', 'portal_password', 'display_name', 'group', 'is_active')
        }),
        ('Reset / Change Password', {
            'fields': ('change_password', 'confirm_change_password'),
            'classes': ('collapse',),
            'description': 'Use this to securely assign a new password instead of editing the plain-text box above.',
        }),
        ('Portal Access', {
            'fields': ('portal_login_link',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def save_model(self, request, obj, form, change):
        # We rely on the GroupMemberForm's save() to handle password syncing securely.
        super().save_model(request, obj, form, change)

    def email_display(self, obj):
        return format_html('<strong>{}</strong>', obj.email)
    email_display.short_description = 'Email'
    email_display.admin_order_field = 'email'

    def group_badge(self, obj):
        return format_html(
            '<span style="background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:20px;'
            'font-size:0.78rem;font-weight:700;">{}</span>',
            obj.group.name
        )
    group_badge.short_description = 'Group'
    group_badge.admin_order_field = 'group__name'

    def permission_count(self, obj):
        count = obj.group.permissions.count()
        color = '#15803d' if count > 0 else '#6b7280'
        return format_html(
            '<span style="color:{};font-weight:700;">{} permission{}</span>',
            color, count, '' if count == 1 else 's'
        )
    permission_count.short_description = 'Permissions'

    def portal_login_link(self, obj):
        return format_html(
            '<a href="/group/login/" target="_blank" style="color:#0d9488;font-weight:600;">{}</a>',
            '🔗 Open Group Portal Login'
        )
    portal_login_link.short_description = 'Portal Login'


@admin.register(GroupMemberActivity)
class GroupMemberActivityAdmin(admin.ModelAdmin):
    list_display = [
        'timestamp', 'member_email', 'group_name',
        'action', 'is_deleted_by_user', 'permission_codename', 'ip_address'
    ]
    list_filter = ['is_deleted_by_user', 'member__group', 'permission_codename']
    search_fields = ['member__email', 'action', 'ip_address']
    ordering = ['-timestamp']
    readonly_fields = [
        'member', 'action', 'permission_codename', 'ip_address', 'is_deleted_by_user', 'timestamp'
    ]
    date_hierarchy = 'timestamp'

    def member_email(self, obj):
        return format_html('<strong>{}</strong>', obj.member.email)
    member_email.short_description = 'Member'
    member_email.admin_order_field = 'member__email'

    def group_name(self, obj):
        return format_html(
            '<span style="background:#dbeafe;color:#1e40af;padding:2px 10px;'
            'border-radius:20px;font-size:0.78rem;font-weight:700;">{}</span>',
            obj.member.group.name
        )
    group_name.short_description = 'Group'
    group_name.admin_order_field = 'member__group__name'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


from apps.core.admin_mixins import AdvancedSearchMixin

@admin.register(PortalMessage)
class PortalMessageAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = ['created_at', 'sender_display', 'recipient_display', 'subject', 'read_portal_message', 'is_read']
    list_filter = ['is_read', 'is_for_admin', 'recipient_role', 'recipient_group']
    search_fields = ['subject', 'body', 'recipient_member__email', 'recipient_user__email', 'sender_member__email']
    readonly_fields = ['created_at']

    fieldsets = (
        ('Content', {
            'fields': ('subject', 'body', 'created_at', 'is_read')
        }),
        ('Routing (Targets)', {
            'fields': (
                'recipient_role', 'recipient_group', 'recipient_member', 'recipient_user', 'is_for_admin'
            ),
            'description': 'Targeting logic: role-based broadcast, group broadcast, or individual message.'
        }),
        ('Sender Information', {
            'fields': ('sender_user', 'sender_member'),
            'description': 'Leave blank for system messages; it will auto-fill with your account on save if created here.'
        }),
    )

    def read_portal_message(self, obj):
        """Returns a premium circular eye button for the quick-read popup."""
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
        received_at = obj.created_at.strftime('%b %d, %Y %H:%M')
        return format_html(
            '<button type="button" class="admin-read-msg-trigger" '
            'data-id="{}" data-subject="{}" data-body="{}" data-received="{}" '
            'title="Read Message" style="border:none; cursor:pointer; display:inline-flex; align-items:center; '
            'justify-content:center; width:42px; height:42px; border-radius:50%; background:#f0f9ff; color:#0369a1; transition:all 0.2s;">'
            '{}</button>',
            obj.pk, obj.subject, obj.body, received_at, format_html(icon)
        )
    read_portal_message.short_description = 'Read'
    read_portal_message.admin_order_field = 'subject'

    def sender_display(self, obj):
        if obj.sender_user:
            return format_html('<span style="color:#1d4ed8;font-weight:600;">👤 Staff: {}</span>', obj.sender_user.username)
        if obj.sender_member:
            return format_html('<span style="color:#ea580c;font-weight:600;">🏠 Portal: {}</span>', obj.sender_member.email)
        return format_html('<span style="color:#64748b;font-style:italic;">{}</span>', '🖥️ System')
    sender_display.short_description = 'Sender'

    def recipient_display(self, obj):
        if obj.recipient_role:
            return format_html('<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-weight:700;">📢 Role: {}</span>', obj.get_recipient_role_display())
        if obj.recipient_group:
            return format_html('<span style="background:#ecfdf5;color:#065f46;padding:2px 8px;border-radius:4px;font-weight:700;">🏘️ Group: {}</span>', obj.recipient_group.name)
        if obj.recipient_member:
            return format_html('<span style="color:#1e293b;">👤 Member: {}</span>', obj.recipient_member.email)
        if obj.recipient_user:
            return format_html('<span style="color:#1e293b;">👤 User: {}</span>', obj.recipient_user.email)
        if obj.is_for_admin:
            return format_html('<span style="background:#fff1f2;color:#9f1239;padding:2px 8px;border-radius:4px;font-weight:800;">{}</span>', '🛑 Admin Team')
        return format_html('<span style="color:#94a3b8;">{}</span>', '-')
    recipient_display.short_description = 'Recipient'

    def save_model(self, request, obj, form, change):
        if not obj.pk and not obj.sender_user and not obj.sender_member:
            # Auto-set sender to current admin if creating new message in admin
            obj.sender_user = request.user
        super().save_model(request, obj, form, change)
