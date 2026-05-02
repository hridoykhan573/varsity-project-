from django.urls import path
from . import views

app_name = 'group_portal'

urlpatterns = [
    path('', views.group_login_view, name='login'),
    path('login/', views.group_login_view, name='login'),
    path('dashboard/', views.group_dashboard_view, name='dashboard'),
    path('logout/', views.group_logout_view, name='logout'),
    path('track/', views.group_track_activity, name='track'),
    path('delete-activity/', views.group_delete_activity, name='delete_activity'),
    path('upload-profile-picture/', views.group_upload_profile_picture, name='upload_profile_picture'),
    path('send-to-admin/', views.group_send_message_to_admin, name='send_message_to_admin'),
    path('broadcast-search/', views.group_member_search_recipients_api, name='broadcast_search'),
    path('broadcast-send/', views.group_member_send_broadcast_api, name='broadcast_send'),
    path('mark-read/', views.group_mark_message_read, name='mark_message_read'),
    
    # Admin Messaging Center
    path('admin-messaging/', views.admin_messaging_center, name='admin_messaging_center'),
    path('admin-messaging/search/', views.admin_search_recipients_api, name='admin_search_recipients'),
    path('admin-messaging/send/', views.admin_send_broadcast_api, name='admin_send_broadcast'),
    path('admin-messaging/mark-read/', views.admin_mark_message_read, name='admin_mark_message_read'),
]
