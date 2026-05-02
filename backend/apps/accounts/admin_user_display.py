"""Shared changelist rendering for AUTH_USER_MODEL: circular avatar + name/email + role."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.html import format_html

AVATAR_PLACEHOLDER_CLASSES = (
    'admin-user-avatar--ph0',
    'admin-user-avatar--ph1',
    'admin-user-avatar--ph2',
    'admin-user-avatar--ph3',
    'admin-user-avatar--ph4',
    'admin-user-avatar--ph5',
)


def initials_for_user(user):
    first = (user.first_name or '').strip()
    last = (user.last_name or '').strip()
    if first and last:
        return (first[0] + last[0]).upper()
    if first:
        return first[:2].upper()
    if last:
        return last[:2].upper()
    uname = (user.username or '').strip()
    if uname:
        return uname[:2].upper()
    em = (user.email or '?').strip()
    return em[:2].upper()


def render_avatar_only(user, size=40):
    if user is None or not getattr(user, 'pk', None):
        return format_html(
            '<span class="admin-user-avatar admin-user-avatar--placeholder admin-user-avatar--ph0">{}</span>', '?'
        )
    if getattr(user, 'avatar', None) and user.avatar:
        return format_html(
            '<span class="admin-user-avatar">'
            '<img src="{}" alt="" loading="lazy" width="{}" height="{}"/>'
            '</span>',
            user.avatar.url,
            size,
            size,
        )
    ph_class = AVATAR_PLACEHOLDER_CLASSES[user.pk % len(AVATAR_PLACEHOLDER_CLASSES)]
    return format_html(
        '<span class="admin-user-avatar admin-user-avatar--placeholder {}">{}</span>',
        ph_class,
        initials_for_user(user),
    )


def _role_label(user):
    if hasattr(user, 'get_role_display'):
        try:
            return user.get_role_display() or ''
        except (TypeError, ValueError, AttributeError):
            return str(getattr(user, 'role', '') or '')
    return ''


def format_user_admin_cell(user):
    """
    Avatar + name + email + role; entire cell links to the user's admin change page.
    """
    if user is None:
        return format_html(
            '<span class="admin-user-cell"><span class="admin-user-cell__empty">{}</span></span>', '—'
        )

    UserModel = get_user_model()
    opts = UserModel._meta
    url = reverse(f'admin:{opts.app_label}_{opts.model_name}_change', args=[user.pk])

    avatar = render_avatar_only(user, size=40)
    full = (user.get_full_name() or '').strip()
    email = (user.email or user.username or '').strip()
    role = _role_label(user)
    role_html = (
        format_html('<span class="admin-user-cell__role">({})</span>', role) if role else ''
    )

    if full:
        text = format_html(
            '<span class="admin-user-cell__meta">'
            '<span class="admin-user-cell__name">{}</span>'
            '<span class="admin-user-cell__sub">'
            '<span class="admin-user-cell__email">{}</span>{}'
            '</span>'
            '</span>',
            full,
            email,
            role_html,
        )
    else:
        text = format_html(
            '<span class="admin-user-cell__meta">'
            '<span class="admin-user-cell__name admin-user-cell__name--solo">{}</span>'
            '<span class="admin-user-cell__sub">{}</span>'
            '</span>',
            email,
            role_html,
        )

    return format_html(
        '<a class="admin-user-cell admin-user-cell--link" href="{}">{} {}</a>',
        url,
        avatar,
        text,
    )
