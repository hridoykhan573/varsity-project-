from datetime import date

from apps.notifications.utils import create_notification

from .models import HealthRecord


def process_vaccination_reminders_for_user(user):
    """
    Create one notification per due/overdue vaccination record (not yet reminded).
    Called when the user loads their notification list so reminders appear without a cron.
    """
    today = date.today()
    qs = (
        HealthRecord.objects.filter(
            pet__owner=user,
            record_type="vaccination",
            reminder_sent=False,
            next_due_date__isnull=False,
            next_due_date__lte=today,
        )
        .select_related("pet")
        .order_by("next_due_date")
    )

    for hr in qs:
        create_notification(
            recipient=user,
            notification_type="vaccine_reminder",
            title=f"Vaccination due: {hr.pet.name}",
            message=(
                f"{hr.title} — due on {hr.next_due_date.strftime('%b %d, %Y')}. "
                f"Schedule a visit with your veterinarian to keep {hr.pet.name} protected."
            ),
            related_object_id=hr.id,
            related_object_type="HealthRecord",
            action_url=f"/pets/{hr.pet_id}",
        )
        hr.reminder_sent = True
        hr.save(update_fields=["reminder_sent"])
