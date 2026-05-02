from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from config.admin_views import admin_logout_compat
from config.admin_broadcast import admin_broadcast_message, admin_broadcast_search_users
from config.admin_visitors import admin_recent_visitors
from config.admin_complaint_reply import admin_complaint_reply
from apps.group_portal.views import admin_quick_add_group_member

urlpatterns = [
    # Must be before admin.site.urls so Log out works for GET and POST (avoids blank 405 page).
    path('admin/logout/', admin_logout_compat),
    path('admin/broadcast-users/', admin_broadcast_search_users, name='admin-broadcast-search'),
    path('admin/broadcast-message/', admin_broadcast_message, name='admin-broadcast-message'),
    path('admin/recent-visitors/', admin_recent_visitors, name='admin-recent-visitors'),
    path('admin/complaint-reply/', admin_complaint_reply, name='admin-complaint-reply'),
    path('admin/quick-add-member/', admin_quick_add_group_member, name='admin-quick-add-member'),
    path('admin/', admin.site.urls),

    path('group/', include('apps.group_portal.urls', namespace='group_portal')),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/pets/', include('apps.pets.urls')),
    path('api/shelters/', include('apps.shelters.urls')),
    path('api/adoptions/', include('apps.adoptions.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/bootcamps/', include('apps.bootcamps.urls')),
    path('api/complaints/', include('apps.complaints.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/vet/', include('apps.veterinary.urls')),
    path('api/core/', include('apps.core.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "🐾 PawHub Admin Command Center"
admin.site.site_title = "PawHub | Admin Portal"
admin.site.index_title = "Platform Overview & Management"
