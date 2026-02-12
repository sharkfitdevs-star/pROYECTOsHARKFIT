from django.http import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok"})


def root_status(request):
    return JsonResponse({"service": "sharkfit-backend", "status": "ok"})
