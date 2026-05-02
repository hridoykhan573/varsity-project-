import json
import logging
from django.http import JsonResponse
from .security import validate_data_recursive

logger = logging.getLogger('security')

class SQLInjectionMiddleware:
    """
    Middleware to intercept incoming requests and scan for SQL injection patterns.
    High-risk patterns result in a 400 Bad Request.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Check GET parameters
        if request.GET:
            if validate_data_recursive(request.GET.dict()):
                logger.error(f"Blocked SQL Injection attempt in GET: {request.path} | IP: {request.META.get('REMOTE_ADDR')}")
                return JsonResponse({"error": "Security alert: Suspicious pattern detected."}, status=400)

        # 2. Check POST/PUT/PATCH data
        if request.method in ['POST', 'PUT', 'PATCH']:
            # Check standard form data
            if request.POST:
                if validate_data_recursive(request.POST.dict()):
                    logger.error(f"Blocked SQL Injection attempt in POST: {request.path} | IP: {request.META.get('REMOTE_ADDR')}")
                    return JsonResponse({"error": "Security alert: Suspicious pattern detected."}, status=400)
            
            # Check JSON data in body
            if request.content_type == 'application/json' and request.body:
                try:
                    data = json.loads(request.body)
                    if validate_data_recursive(data):
                        logger.error(f"Blocked SQL Injection attempt in JSON body: {request.path} | IP: {request.META.get('REMOTE_ADDR')}")
                        return JsonResponse({"error": "Security alert: Suspicious pattern detected."}, status=400)
                except json.JSONDecodeError:
                    pass # Invalid JSON will be handled by other parts of the system

        return self.get_response(request)
