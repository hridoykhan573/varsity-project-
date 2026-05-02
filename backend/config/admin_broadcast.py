"""
Staff-only: search users (Site & Portal) for broadcast picker + POST broadcast to roles and/or specific user IDs.
"""
import json

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.models import Group

from apps.accounts.models import CustomUser
from apps.group_portal.models import GroupMember, PortalMessage
from apps.notifications.utils import create_notification

VALID_AUDIENCES = frozenset({'owner', 'shelter_staff', 'seller'})


def _recipient_queryset_for_broadcast():
    return CustomUser.objects.filter(is_active=True, role__in=VALID_AUDIENCES).exclude(role='admin')


@login_required(login_url='/admin/login/')
@require_GET
def admin_broadcast_search_users(request):
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': 'Staff only.'}, status=403)

    q = (request.GET.get('q') or '').strip()
    role = (request.GET.get('role') or '').strip()

    if len(q) < 1:
        return JsonResponse({'ok': True, 'results': []})

    results = []

    # 1. Search Main Site Users
    qs = _recipient_queryset_for_broadcast()
    if role in VALID_AUDIENCES:
        qs = qs.filter(role=role)

    qs = qs.filter(
        Q(email__icontains=q)
        | Q(username__icontains=q)
        | Q(first_name__icontains=q)
        | Q(last_name__icontains=q)
    ).order_by('email')[:20]

    for u in qs:
        results.append({
            'id': f"u_{u.id}",
            'email': u.email,
            'username': u.username,
            'role': u.role,
            'label': f'{u.email} ({u.get_role_display()})',
            'type': 'site_user'
        })

    # 2. Search Group Portal Members (only if no role filter or if role filter matches generic types)
    if not role:
        mqs = GroupMember.objects.filter(
            Q(email__icontains=q) | Q(display_name__icontains=q)
        ).select_related('group').order_by('email')[:20]
        
        for m in mqs:
            results.append({
                'id': f"m_{m.id}",
                'email': m.email,
                'label': f'{m.email} [Portal: {m.group.name}]',
                'type': 'portal_member'
            })

    return JsonResponse({'ok': True, 'results': results})


@login_required(login_url='/admin/login/')
@csrf_protect
@require_POST
def admin_broadcast_message(request):
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': 'Staff only.'}, status=403)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    title = (data.get('title') or '').strip()
    message = (data.get('message') or '').strip()
    audiences = data.get('audiences') or []        # Site Roles (owner, etc.)
    portal_groups = data.get('portal_groups') or [] # Portal Groups (IDs)
    recipient_ids = data.get('user_ids') or []     # Specific IDs (prefixed with u_ or m_)

    if not title or not message:
        return JsonResponse({'ok': False, 'error': 'Title and message are required.'}, status=400)

    sent_count = 0

    # A. Role Broadcasts (Site-wide Roles)
    for r_code in audiences:
        if r_code in VALID_AUDIENCES:
            # Create persistent PortalMessage
            PortalMessage.objects.create(
                sender_user=request.user,
                recipient_role=r_code,
                subject=title,
                body=message
            )
            # Also send push notifications to these users
            users = _recipient_queryset_for_broadcast().filter(role=r_code)
            for u in users:
                create_notification(
                    recipient=u,
                    notification_type='admin_message',
                    title=title,
                    message=message,
                    related_object_id=request.user.id
                )
                sent_count += 1

    # B. Portal Group Broadcasts
    for g_id in portal_groups:
        try:
            group_obj = Group.objects.get(pk=g_id)
            PortalMessage.objects.create(
                sender_user=request.user,
                recipient_group=group_obj,
                subject=title,
                body=message
            )
            sent_count += 1
        except Group.DoesNotExist:
            continue

    # C. Individual Recipients
    for r_str in recipient_ids:
        if not r_str: continue 
        try:
            if isinstance(r_str, int) or r_str.isdigit():
                rtype, rpk = 'u', r_str
            else:
                rtype, rpk = r_str.split('_', 1)
        except ValueError:
            rtype, rpk = 'u', r_str

        if rtype == 'u': # Site User
            try:
                u_obj = CustomUser.objects.get(pk=rpk)
                PortalMessage.objects.create(sender_user=request.user, recipient_user=u_obj, subject=title, body=message)
                create_notification(recipient=u_obj, notification_type='admin_message', title=title, message=message, related_object_id=request.user.id)
                sent_count += 1
            except CustomUser.DoesNotExist: pass
        elif rtype == 'm': # Portal Member
            try:
                m_obj = GroupMember.objects.get(pk=rpk)
                PortalMessage.objects.create(sender_user=request.user, recipient_member=m_obj, subject=title, body=message)
                sent_count += 1
            except GroupMember.DoesNotExist: pass

    if sent_count == 0:
        return JsonResponse({'ok': False, 'error': 'No recipients matched your selection.'}, status=400)

    return JsonResponse({'ok': True, 'sent': sent_count, 'title': title})
