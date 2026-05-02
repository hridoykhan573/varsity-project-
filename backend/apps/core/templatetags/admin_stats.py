from django import template
from django.apps import apps
from django.contrib.auth import get_user_model

register = template.Library()

@register.simple_tag
def get_admin_stats():
    """
    Returns real-time counts from key models for the dashboard.
    """
    User = get_user_model()
    Pet = apps.get_model('pets', 'Pet')
    Booking = apps.get_model('bookings', 'Booking')
    AdoptionRequest = apps.get_model('adoptions', 'AdoptionRequest')
    DoctorAppointment = apps.get_model('appointments', 'Appointment')
    Product = apps.get_model('products', 'Product')
    PortalMessage = apps.get_model('group_portal', 'PortalMessage')
    Complaint = apps.get_model('complaints', 'Complaint')

    return {
        'total_accounts': User.objects.count(),
        'registered_pets': Pet.objects.count(),
        'active_bookings': Booking.objects.count(),
        'doctor_appointments': DoctorAppointment.objects.count(),
        'ongoing_adoptions': AdoptionRequest.objects.count(),
        'total_food_products': Product.objects.filter(category='food').count(),
        'total_accessories': Product.objects.filter(category='accessories').count(),
        'unread_portal_messages': PortalMessage.objects.filter(is_for_admin=True, is_read=False).count(),
        'total_complaints': Complaint.objects.count(),
    }
