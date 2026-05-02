import json
from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse
from django.utils.decorators import method_decorator

from .models import GroupMember, GroupMemberActivity, PortalMessage
from .permissions import PERMISSION_BUTTONS, CATEGORY_ORDER
from apps.accounts.models import CustomUser
from apps.notifications.utils import create_notification


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _member_from_session(request):
    """Return the authenticated GroupMember or None."""
    member_id = request.session.get('group_member_id')
    if not member_id:
        return None
    try:
        return GroupMember.objects.select_related('group').get(pk=member_id, is_active=True)
    except GroupMember.DoesNotExist:
        return None


@csrf_protect
@require_http_methods(['GET', 'POST'])
def group_login_view(request):
    """Login page for group portal members."""
    # Already logged in → go to dashboard
    if request.session.get('group_member_id'):
        member = _member_from_session(request)
        if member:
            return redirect('group_portal:dashboard')

    error = None

    if request.method == 'POST':
        email = (request.POST.get('email') or '').strip().lower()
        password = request.POST.get('password') or ''

        if not email or not password:
            error = 'Please enter both email and password.'
        else:
            try:
                member = GroupMember.objects.select_related('group').get(
                    email__iexact=email, is_active=True
                )
                if member.check_password(password):
                    # --- AUTO-SYNC SHADOW DJANGO USER ---
                    from django.contrib.auth import get_user_model
                    from django.contrib.auth import login
                    User = get_user_model()
                    
                    # Use unique identifiers so it NEVER collides with their real public account
                    shadow_username = f"gm_{member.pk}_{member.email.split('@')[0]}"[:150]
                    shadow_email = f"shadow_gm_{member.pk}_{member.email}"[:254]
                    
                    try:
                        shadow_user = User.objects.get(email=shadow_email)
                    except User.DoesNotExist:
                        shadow_user = User(email=shadow_email, username=shadow_username)
                    
                    # Ensure it has staff access, no superuser, and syncs
                    shadow_user.is_staff = True
                    shadow_user.is_active = True
                    shadow_user.is_superuser = False
                    shadow_user.first_name = "Shadow"
                    shadow_user.last_name = f"GM_{member.pk}"
                    shadow_user.role = 'admin' # Matches CustomUser model roles
                    shadow_user.save()
                    
                    # Sync the Group securely so Django Admin enforces exact same permissions
                    shadow_user.groups.set([member.group])
                    
                    # Log the shadow user into Django's auth system transparently!
                    login(request, shadow_user, backend='django.contrib.auth.backends.ModelBackend')
                    # ------------------------------------

                    # Store member ID + load permissions into session
                    request.session['group_member_id'] = member.pk
                    request.session['group_member_email'] = member.email
                    request.session['group_member_name'] = member.display_name or member.email
                    request.session['group_member_group'] = member.group.name
                    perm_codenames = list(member.get_permissions())
                    request.session['group_member_permissions'] = perm_codenames
                    
                    # Force session save and clear any permission cache
                    request.session.save()

                    # Log login activity
                    GroupMemberActivity.objects.create(
                        member=member,
                        action='Logged in to Group Portal (Shadow Session Sync)',
                        permission_codename='',
                        ip_address=_get_client_ip(request),
                    )
                    return redirect('group_portal:dashboard')
                else:
                    error = 'Invalid email or password.'
            except GroupMember.DoesNotExist:
                error = 'Invalid email or password.'

    return render(request, 'group_portal/login.html', {'error': error})


@require_http_methods(['GET'])
def group_dashboard_view(request):
    """Permission-driven dashboard for authenticated group members."""
    member = _member_from_session(request)
    if not member:
        return redirect('group_portal:login')

    # Refresh permissions from DB in case admin has changed them
    perm_codenames = member.get_permissions()
    request.session['group_member_permissions'] = list(perm_codenames)

    # Build button groups based on permission codenames
    categories = {}
    for codename, btn_def in PERMISSION_BUTTONS.items():
        if codename in perm_codenames:
            cat = btn_def['category']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append({
                'codename': codename,
                'label': btn_def['label'],
                'icon': btn_def['icon'],
                'color': btn_def['color'],
                'admin_url': btn_def['admin_url'],
            })

    # Sort categories by defined order
    ordered_categories = []
    for cat in CATEGORY_ORDER:
        if cat in categories:
            ordered_categories.append({'name': cat, 'buttons': categories[cat]})
    # Append any leftover categories not in CATEGORY_ORDER
    for cat, btns in categories.items():
        if cat not in CATEGORY_ORDER:
            ordered_categories.append({'name': cat, 'buttons': btns})

    # Recent activity for this member (last 20, non-deleted)
    recent_activity = GroupMemberActivity.objects.filter(
        member=member,
        is_deleted_by_user=False
    ).order_by('-timestamp')[:20]

    # Messages for this member (Direct + Group Broadcasts)
    from django.db.models import Q
    messages = PortalMessage.objects.filter(
        Q(recipient_member=member) | Q(recipient_group=member.group)
    ).order_by('-created_at')
    
    unread_count = messages.filter(is_read=False).count()

    # For the Messaging Compose UI (same as admin broadcast)
    from apps.accounts.models import CustomUser
    from django.contrib.auth.models import Group
    role_list = [{'value': c[0], 'label': c[1]} for c in CustomUser.ROLE_CHOICES if c[0] != 'admin']
    portal_groups = Group.objects.all().order_by('name')

    ctx = {
        'member': member,
        'ordered_categories': ordered_categories,
        'recent_activity': recent_activity,
        'total_permissions': len(perm_codenames),
        'messages': messages,
        'unread_count': unread_count,
        'role_choices': role_list,
        'portal_groups': portal_groups,
    }
    return render(request, 'group_portal/dashboard.html', ctx)


@csrf_protect
@require_http_methods(['POST'])
def group_track_activity(request):
    """AJAX: log when a member clicks an action button."""
    member = _member_from_session(request)
    if not member:
        return JsonResponse({'ok': False, 'error': 'Not authenticated.'}, status=401)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    action = (data.get('action') or '').strip()
    codename = (data.get('codename') or '').strip()

    if not action:
        return JsonResponse({'ok': False, 'error': 'Action required.'}, status=400)

    # Verify the member still has this permission
    if codename and codename not in member.get_permissions():
        return JsonResponse({'ok': False, 'error': 'Permission removed.'}, status=403)

    activity = GroupMemberActivity.objects.create(
        member=member,
        action=action,
        permission_codename=codename,
        ip_address=_get_client_ip(request),
    )
    return JsonResponse({'ok': True, 'log_id': activity.pk})


@csrf_protect
@require_http_methods(['POST'])
def group_delete_activity(request):
    """AJAX: Soft-delete an activity for the member."""
    member = _member_from_session(request)
    if not member:
        return JsonResponse({'ok': False, 'error': 'Not authenticated.'}, status=401)

    try:
        data = json.loads(request.body)
        log_id = data.get('log_id')
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    if not log_id:
        return JsonResponse({'ok': False, 'error': 'Log ID required.'}, status=400)

    try:
        activity = GroupMemberActivity.objects.get(pk=log_id, member=member)
        activity.is_deleted_by_user = True
        activity.save()
        return JsonResponse({'ok': True})
    except GroupMemberActivity.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Activity not found.'}, status=404)


@require_http_methods(['GET', 'POST'])
def group_logout_view(request):
    """Clear group member session."""
    member_id = request.session.get('group_member_id')
    if member_id:
        try:
            member = GroupMember.objects.get(pk=member_id)
            GroupMemberActivity.objects.create(
                member=member,
                action='Logged out of Group Portal',
                permission_codename='',
                ip_address=_get_client_ip(request),
            )
        except GroupMember.DoesNotExist:
            pass
            
    # Completely destroy the Django session, flushing both Group Portal
    # credentials and the proxy shadow User admin credentials securely.
    from django.contrib.auth import logout
    logout(request)
    
    return redirect('group_portal:login')


@csrf_protect
@require_http_methods(['POST'])
def admin_quick_add_group_member(request):
    """AJAX endpoint for the admin to quickly add a group portal member."""
    # Ensure they are admin staff
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': 'Unauthorized'}, status=403)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    group_id = data.get('group_id')
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not group_id or not email or not password:
        return JsonResponse({'ok': False, 'error': 'Group, email, and password are required.'}, status=400)

    if len(password) < 8:
        return JsonResponse({'ok': False, 'error': 'Password must be at least 8 characters.'}, status=400)

    if GroupMember.objects.filter(email__iexact=email).exists():
        return JsonResponse({'ok': False, 'error': 'A member with this email already exists.'}, status=400)

    try:
        from django.contrib.auth.models import Group
        group = Group.objects.get(pk=group_id)
    except Group.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Group not found.'}, status=404)

    member = GroupMember(
        email=email,
        display_name='',
        group=group,
        is_active=True
    )
    member.set_password(password)
    member.save()

    return JsonResponse({'ok': True, 'msg': f'Member {email} added to {group.name} successfully.'})


@csrf_protect
@require_http_methods(['POST'])
def group_upload_profile_picture(request):
    """AJAX: Upload and set the profile picture for the group member."""
    member = _member_from_session(request)
    if not member:
        return JsonResponse({'ok': False, 'error': 'Not authenticated.'}, status=401)

    if 'profile_picture' not in request.FILES:
        return JsonResponse({'ok': False, 'error': 'No file provided.'}, status=400)

    image = request.FILES['profile_picture']
    
    # Simple validation
    if image.size > 2 * 1024 * 1024:  # 2MB
        return JsonResponse({'ok': False, 'error': 'File too large (Max 2MB).'}, status=400)
    
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if image.content_type not in allowed_types:
        return JsonResponse({'ok': False, 'error': 'Invalid file type. Please use JPG, PNG or WEBP.'}, status=400)

    # Save to member
    member.profile_picture = image
    member.save()

    return JsonResponse({
        'ok': True, 
        'image_url': member.profile_picture.url,
        'msg': 'Profile picture updated successfully!'
    })


@csrf_protect
@require_http_methods(['POST'])
def group_send_message_to_admin(request):
    """AJAX: Send a message from the portal member to Admin or specific site roles."""
    member = _member_from_session(request)
    if not member:
        return JsonResponse({'ok': False, 'error': 'Not authenticated.'}, status=401)

    try:
        data = json.loads(request.body)
        recipient = data.get('recipient', 'admin')
        subject = (data.get('subject') or '').strip()
        message_body = (data.get('body') or '').strip()
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    if not subject or not message_body:
        return JsonResponse({'ok': False, 'error': 'Subject and body are required.'}, status=400)

    # Prepare message parameters
    msg_kwargs = {
        'sender_member': member,
        'subject': subject,
        'body': message_body
    }

    if recipient == 'admin':
        msg_kwargs['is_for_admin'] = True
        log_action = f"Sent message to Admin: {subject}"
    elif recipient.startswith('role_'):
        role_code = recipient.replace('role_', '')
        msg_kwargs['recipient_role'] = role_code
        log_action = f"Broadcast message to {role_code}s: {subject}"
    else:
        return JsonResponse({'ok': False, 'error': 'Invalid recipient selection.'}, status=400)

    # Create message
    msg = PortalMessage.objects.create(**msg_kwargs)

    # Log activity
    GroupMemberActivity.objects.create(
        member=member,
        action=log_action,
        ip_address=_get_client_ip(request),
    )

    return JsonResponse({'ok': True, 'msg_id': msg.pk})


@csrf_protect
@require_http_methods(['POST'])
def group_mark_message_read(request):
    """AJAX: Mark a received message as read."""
    member = _member_from_session(request)
    if not member:
        return JsonResponse({'ok': False, 'error': 'Not authenticated.'}, status=401)

    try:
        data = json.loads(request.body)
        msg_id = data.get('msg_id')
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    if not msg_id:
        return JsonResponse({'ok': False, 'error': 'Message ID required.'}, status=400)

    try:
        from django.db.models import Q
        # Security: only mark as read if it's addressed to the member or their group
        msg = PortalMessage.objects.get(
            Q(pk=msg_id),
            Q(recipient_member=member) | Q(recipient_group=member.group) | Q(recipient_user__email=request.user.email if request.user.is_authenticated else None)
        )
        msg.is_read = True
        msg.save()
        return JsonResponse({'ok': True})
    except PortalMessage.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Message not found.'}, status=404)


@require_http_methods(['GET'])
def group_member_search_recipients_api(request):
    """AJAX API for portal members to search recipients (Site users & other members)."""
    member = _member_from_session(request)
    if not member:
        return JsonResponse({'results': []}, status=401)

    query = request.GET.get('q', '').strip()
    role_filter = request.GET.get('role', '')

    if not query and not role_filter:
        return JsonResponse({'results': []})

    results = []
    from django.db.models import Q

    # 1. Search CustomUsers (Main Site)
    user_qs = CustomUser.objects.filter(is_active=True).exclude(role='admin')
    if role_filter:
        user_qs = user_qs.filter(role=role_filter)
    if query:
        user_qs = user_qs.filter(Q(email__icontains=query) | Q(username__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query))
    
    for u in user_qs[:10]:
        results.append({
            'id': f"u_{u.pk}",
            'text': f"{u.email} ({u.get_role_display()})",
            'type': 'site_user'
        })

    # 2. Search GroupMembers (Portal Only)
    if not role_filter:
        member_qs = GroupMember.objects.filter(is_active=True)
        if query:
            member_qs = member_qs.filter(Q(email__icontains=query) | Q(display_name__icontains=query))
        
        for m in member_qs[:10]:
            results.append({
                'id': f"m_{m.pk}",
                'text': f"{m.email} [Portal: {m.group.name}]",
                'type': 'portal_member'
            })

    return JsonResponse({'results': results})


@csrf_protect
@require_http_methods(['POST'])
def group_member_send_broadcast_api(request):
    """AJAX endpoint for the portal 'Send Notification' button."""
    member = _member_from_session(request)
    if not member:
        return JsonResponse({'ok': False, 'error': 'Not authenticated.'}, status=401)

    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        message = data.get('message', '').strip()
        roles = data.get('roles', [])
        portal_groups = data.get('portal_groups', [])
        specific_recipients = data.get('recipients', [])
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    if not title or not message:
        return JsonResponse({'ok': False, 'error': 'Title and Message are required.'}, status=400)

    count = 0
    from django.contrib.auth.models import Group

    # A. Role Broadcasts (Site Users)
    for r_code in roles:
        PortalMessage.objects.create(
            sender_member=member,
            recipient_role=r_code,
            subject=title,
            body=message
        )
        # Also push notifications to site users
        users = CustomUser.objects.filter(role=r_code, is_active=True)
        for u in users:
            create_notification(
                recipient=u,
                notification_type='co_admin_message',
                title=title,
                message=message
            )
            count += 1

    # B. Portal Group Broadcasts
    for g_id in portal_groups:
        try:
            group_obj = Group.objects.get(pk=g_id)
            PortalMessage.objects.create(
                sender_member=member,
                recipient_group=group_obj,
                subject=title,
                body=message
            )
            count += 1
        except Group.DoesNotExist:
            continue

    # C. Specific Individual Recipients
    for r_str in specific_recipients:
        rtype, rpk = r_str.split('_', 1)
        if rtype == 'u': # Site User
            try:
                u_obj = CustomUser.objects.get(pk=rpk)
                PortalMessage.objects.create(
                    sender_member=member,
                    recipient_user=u_obj,
                    subject=title,
                    body=message
                )
                create_notification(
                    recipient=u_obj,
                    notification_type='co_admin_message',
                    title=title,
                    message=message
                )
                count += 1
            except CustomUser.DoesNotExist:
                continue
        elif rtype == 'm': # Portal Member
            try:
                m_obj = GroupMember.objects.get(pk=rpk)
                PortalMessage.objects.create(
                    sender_member=member,
                    recipient_member=m_obj,
                    subject=title,
                    body=message
                )
                count += 1
            except GroupMember.DoesNotExist:
                continue

    # Log activity
    GroupMemberActivity.objects.create(
        member=member,
        action=f"Sent broadcast notification: {title} ({count} targets)",
        ip_address=_get_client_ip(request),
    )

    return JsonResponse({'ok': True, 'msg': f'Broadcast sent successfully ({count} recipients notified).'})




# --- ADMIN MESSAGING CENTER (WowDash UI) ---

@csrf_protect
@require_http_methods(['POST'])
def admin_mark_message_read(request):
    """AJAX: Mark any portal message as read (Admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': 'Unauthorized'}, status=403)

    try:
        data = json.loads(request.body)
        msg_id = data.get('msg_id')
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    if not msg_id:
        return JsonResponse({'ok': False, 'error': 'Message ID required.'}, status=400)

    try:
        msg = PortalMessage.objects.get(pk=msg_id)
        msg.is_read = True
        msg.save()
        return JsonResponse({'ok': True})
    except PortalMessage.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Message not found.'}, status=404)

def admin_messaging_center(request):
    """View to render the premium Admin Messaging Center."""
    if not request.user.is_authenticated or not request.user.is_staff:
        return redirect('admin:login')
    
    from django.contrib.auth.models import Group
    # Map CustomUser role choices for the UI
    from apps.accounts.models import CustomUser
    role_choices = [{'value': k, 'label': v} for k, v in CustomUser.ROLE_CHOICES if k != 'admin']
    
    # Also get Portal Groups
    portal_groups = Group.objects.all().order_by('name')

    return render(request, 'admin/compose_message.html', {
        'role_choices': role_choices,
        'portal_groups': portal_groups,
    })


@require_http_methods(['GET'])
def admin_search_recipients_api(request):
    """AJAX API for the 'Specific People' autocomplete search + Group List."""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'results': []}, status=403)

    # 1. Handle List Groups Request (for checkboxes)
    if request.GET.get('list_groups'):
        from django.contrib.auth.models import Group
        groups = Group.objects.all().order_by('name')
        return JsonResponse({
            'groups': [{'id': g.id, 'name': g.name} for g in groups]
        })

    query = request.GET.get('q', '').strip()
    role_filter = request.GET.get('role', '')

    if not query and not role_filter:
        return JsonResponse({'results': []})

    results = []
    from django.contrib.auth import get_user_model
    from django.db.models import Q
    User = get_user_model()

    # 1. Search CustomUsers (Main Site)
    user_qs = User.objects.all()
    if role_filter:
        user_qs = user_qs.filter(role=role_filter)
    if query:
        user_qs = user_qs.filter(Q(email__icontains=query) | Q(username__icontains=query) | Q(first_name__icontains=query))
    
    for u in user_qs[:10]:
        results.append({
            'id': f"u_{u.pk}",
            'text': f"{u.email} ({u.get_role_display()})",
            'type': 'site_user'
        })

    # 2. Search GroupMembers (Portal Only)
    if not role_filter: # GroupMembers don't have roles in CustomUser sense
        member_qs = GroupMember.objects.all()
        if query:
            member_qs = member_qs.filter(Q(email__icontains=query) | Q(display_name__icontains=query))
        
        for m in member_qs[:10]:
            results.append({
                'id': f"m_{m.pk}",
                'text': f"{m.email} [Portal: {m.group.name}]",
                'type': 'portal_member'
            })

    return JsonResponse({'results': results})


@csrf_protect
@require_http_methods(['POST'])
def admin_send_broadcast_api(request):
    """AJAX endpoint for the premium 'Send Notification' button."""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': 'Unauthorized'}, status=403)

    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        message = data.get('message', '').strip()
        roles = data.get('roles', []) # e.g. ['owner', 'shelter_staff']
        portal_groups = data.get('portal_groups', []) # e.g. [1, 2]
        specific_recipients = data.get('recipients', []) # e.g. ['u_1', 'm_5']
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    if not title or not message:
        return JsonResponse({'ok': False, 'error': 'Title and Message are required.'}, status=400)

    count = 0
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import Group
    User = get_user_model()

    # Process Role Broadcasts (Site Users)
    for r_code in roles:
        # We don't create individual rows for mass broadcast if we want to be efficient,
        # but for this bilateral system, it's safer to have records or one broadcast record.
        # Let's create ONE record with recipient_role set.
        PortalMessage.objects.create(
            sender_user=request.user,
            recipient_role=r_code,
            subject=title,
            body=message
        )
        count += 1

    # Process Portal Group Broadcasts
    for g_id in portal_groups:
        try:
            group_obj = Group.objects.get(pk=g_id)
            PortalMessage.objects.create(
                sender_user=request.user,
                recipient_group=group_obj,
                subject=title,
                body=message
            )
            count += 1
        except Group.DoesNotExist:
            continue

    # Process Specific Recipients
    for r_str in specific_recipients:
        rtype, rpk = r_str.split('_', 1)
        if rtype == 'u': # Site User
            try:
                u_obj = User.objects.get(pk=rpk)
                PortalMessage.objects.create(
                    sender_user=request.user,
                    recipient_user=u_obj,
                    subject=title,
                    body=message
                )
                count += 1
            except User.DoesNotExist:
                continue
        elif rtype == 'm': # Portal Member
            try:
                m_obj = GroupMember.objects.get(pk=rpk)
                PortalMessage.objects.create(
                    sender_user=request.user,
                    recipient_member=m_obj,
                    subject=title,
                    body=message
                )
                count += 1
            except GroupMember.DoesNotExist:
                continue

    return JsonResponse({'ok': True, 'msg': f'Broadcast initiated successfully ({count} targets matched/sent).'})

