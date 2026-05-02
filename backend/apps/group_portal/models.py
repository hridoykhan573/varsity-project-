from django.db import models
from django.contrib.auth.models import Group
from django.contrib.auth.hashers import make_password
from django.conf import settings


class GroupMember(models.Model):
    """
    A lightweight portal-only user managed by the admin.
    They authenticate at /group/login/ (NOT the main site login).
    """
    email = models.EmailField(unique=True, help_text='Login email for the group portal.')
    password_hash = models.CharField(
        max_length=255,
        help_text='Stored as a bcrypt/PBKDF2 hash — never plain-text.'
    )
    portal_password = models.CharField(
        max_length=128, blank=True,
        verbose_name="Password",
        help_text='Plain text password (Visible to Admin)'
    )
    display_name = models.CharField(max_length=150, blank=True)
    profile_picture = models.ImageField(upload_to='portal_profiles/', blank=True, null=True, help_text='Profile photo for the group portal.')
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='portal_members',
        help_text='The Django auth Group that determines this member\'s permissions.'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Used to detect if the raw password field has changed in the admin form
    _plain_password = None

    class Meta:
        verbose_name = 'Group Member'
        verbose_name_plural = 'Group Members'
        ordering = ['group__name', 'email']

    def __str__(self):
        name = self.display_name or self.email
        return f'{name} [{self.group.name}]'

    def set_password(self, raw_password):
        """Hash and store raw_password."""
        self.portal_password = raw_password
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        if self.portal_password and self.portal_password == raw_password:
            return True
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)

    def get_permissions(self):
        """Return set of permission codenames from the linked group."""
        return set(
            self.group.permissions.values_list('codename', flat=True)
        )


class GroupMemberActivity(models.Model):
    """Audit log: every action a group member takes on the portal is recorded."""
    member = models.ForeignKey(
        GroupMember,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    action = models.CharField(max_length=255, help_text='Human-readable description of the action taken.')
    permission_codename = models.CharField(max_length=100, blank=True, help_text='Permission codename that enabled this action.')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_deleted_by_user = models.BooleanField(default=False, help_text='If True, hide from the user but keep for admin auditing.')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Member Activity'
        verbose_name_plural = 'Member Activities'
        ordering = ['-timestamp']

    def __str__(self):
        return f'[{self.timestamp:%Y-%m-%d %H:%M}] {self.member.email} → {self.action}'


class PortalMessage(models.Model):
    """Bilateral messaging between Admins and Group Portal members."""
    # Senders
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='portal_sent_messages', help_text="Admin sender"
    )
    sender_member = models.ForeignKey(
        GroupMember, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='portal_sent_messages', help_text="Member sender"
    )

    # Recipients
    recipient_group = models.ForeignKey(
        Group, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='portal_group_messages', help_text="Broadcast to portal group"
    )
    recipient_member = models.ForeignKey(
        GroupMember, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='portal_received_messages', help_text="Direct message to portal member"
    )
    
    # NEW: main site user targeting
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='portal_received_messages', help_text="Direct message to main site user"
    )
    recipient_role = models.CharField(
        max_length=20, blank=True, null=True,
        choices=[('owner', 'Pet Owner'), ('shelter_staff', 'Shelter Staff'), ('seller', 'Pet Product Seller')],
        help_text="Broadcast to all users with this role"
    )

    is_for_admin = models.BooleanField(
        default=False, help_text="If True, message is sent to the site administrators"
    )

    subject = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Portal Message'
        verbose_name_plural = 'Portal Messages'
        ordering = ['-created_at']

    def __str__(self):
        timestamp = self.created_at.strftime('%Y-%m-%d %H:%M')
        if self.sender_user:
            return f"[{timestamp}] Admin → {self.recipient_group.name if self.recipient_group else self.recipient_member.email}"
        return f"[{timestamp}] {self.sender_member.email} → Admin"
