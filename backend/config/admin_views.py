"""Admin-compatible logout: supports GET and POST so users never hit an empty 405 page."""
from django.contrib.auth import logout
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods


@never_cache
@csrf_protect
@require_http_methods(['GET', 'HEAD', 'POST', 'OPTIONS'])
def admin_logout_compat(request):
    if request.method in ('GET', 'POST'):
        if request.user.is_authenticated:
            logout(request)
    return redirect('admin:login')
