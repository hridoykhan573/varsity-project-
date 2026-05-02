"""
Staff-only JSON: recently registered app users (new visitors), excluding admin-role accounts.
"""
from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from apps.accounts.models import CustomUser


@login_required(login_url='/admin/login/')
@require_GET
def admin_recent_visitors(request):
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': 'Staff only.'}, status=403)

    try:
        days = int(request.GET.get('days', '30'))
    except (TypeError, ValueError):
        days = 30
    days = max(1, min(days, 365))

    now = timezone.now()
    since = now - timedelta(days=days)

    base = CustomUser.objects.exclude(role='admin')

    count_7d = base.filter(created_at__gte=now - timedelta(days=7)).count()
    count_window = base.filter(created_at__gte=since).count()

    qs = base.filter(created_at__gte=since).order_by('-created_at')[:120]

    visitors = []
    for u in qs:
        visitors.append(
            {
                'id': u.id,
                'email': u.email,
                'username': u.username,
                'role': u.role,
                'role_display': u.get_role_display(),
                'joined_at': u.created_at.isoformat(),
                'is_active': u.is_active,
            }
        )

    return JsonResponse(
        {
            'ok': True,
            'days': days,
            'count_in_window': count_window,
            'count_last_7_days': count_7d,
            'visitors': visitors,
        }
    )
