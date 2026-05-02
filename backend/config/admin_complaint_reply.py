"""
Staff-only endpoint: POST /admin/complaint-reply/
Saves admin reply, marks complaint as Done, notifies the user.
"""
import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from apps.complaints.models import Complaint
from apps.notifications.utils import create_notification


@login_required(login_url='/admin/login/')
@csrf_protect
@require_POST
def admin_complaint_reply(request):
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': 'Staff only.'}, status=403)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'Invalid JSON.'}, status=400)

    complaint_id = data.get('complaint_id')
    reply_text = (data.get('reply') or '').strip()

    if not complaint_id:
        return JsonResponse({'ok': False, 'error': 'complaint_id is required.'}, status=400)
    if not reply_text:
        return JsonResponse({'ok': False, 'error': 'Reply message cannot be empty.'}, status=400)

    try:
        complaint = Complaint.objects.select_related('user').get(pk=complaint_id)
    except Complaint.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Complaint not found.'}, status=404)

    # Save reply & mark Done
    complaint.admin_reply = reply_text
    complaint.reply_at = timezone.now()
    complaint.status = 'DONE'
    complaint.save(update_fields=['admin_reply', 'reply_at', 'status', 'updated_at'])

    # Notify the user
    try:
        create_notification(
            recipient=complaint.user,
            notification_type='admin_message',
            title='Admin replied to your complaint',
            message=(
                f'Your complaint "{complaint.subject}" has been reviewed.\n\n'
                f'Admin reply: {reply_text}'
            ),
            related_object_id=complaint.pk,
            related_object_type='Complaint',
            action_url='/dashboard/messages',
        )
    except Exception:
        pass  # Notification failure should not block the reply from saving

    return JsonResponse({
        'ok': True,
        'complaint_id': complaint.pk,
        'new_status': complaint.get_status_display(),
        'reply_at': complaint.reply_at.isoformat(),
    })
