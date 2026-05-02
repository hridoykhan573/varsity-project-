from rest_framework import generics, permissions, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from .models import Pet, HealthRecord
from .serializers import PetSerializer, PetListSerializer, HealthRecordSerializer
from .filters import PetFilter
from datetime import date

from apps.notifications.utils import create_notification

from .reminders import process_vaccination_reminders_for_user
from .vaccination_schedule import build_vaccination_schedule


class PetListCreateView(generics.ListCreateAPIView):
    queryset = Pet.objects.select_related('owner').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PetFilter
    search_fields = ['name', 'breed', 'description', 'location']
    ordering_fields = ['created_at', 'price', 'age']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PetListSerializer
        return PetSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]


class PetCategoryCountView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        counts = Pet.objects.filter(status='available').values('pet_type').annotate(count=Count('id'))
        count_dict = {item['pet_type']: item['count'] for item in counts}
        return Response(count_dict)


class PlatformStatsView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        from apps.shelters.models import Shelter
        from apps.reviews.models import Review
        
        total_pets = Pet.objects.count()
        total_shelters = Shelter.objects.count()
        total_adoptions = Pet.objects.filter(status__in=['adopted', 'sold']).count()
        
        total_reviews = Review.objects.count()
        if total_reviews > 0:
            positive_reviews = Review.objects.filter(rating__gte=4).count()
            happy_owners = int((positive_reviews / total_reviews) * 100)
        else:
            happy_owners = 100
            
        return Response({
            'total_pets': total_pets,
            'total_shelters': total_shelters,
            'total_adoptions': total_adoptions,
            'happy_owners_percent': happy_owners
        })

class PetDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Pet.objects.select_related('owner').prefetch_related('health_records').all()
    serializer_class = PetSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        if serializer.instance.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit your own pet listings.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own pet listings.")
        
        # Restriction: Sold/Adopted pets can ONLY be deleted by Admin
        if instance.status in ['sold', 'adopted'] and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Sold or Adopted pet history can only be deleted by an administrator.")
            
        instance.delete()


class MyPetsView(generics.ListAPIView):
    """View to list active pets owned by the user (excluding sold/adopted)."""
    serializer_class = PetListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Pet.objects.filter(
            owner=self.request.user
        ).exclude(
            status__in=['sold', 'adopted']
        ).order_by('-created_at')


class MyPetHistoryView(generics.ListAPIView):
    """View to list sold or adopted pets (the user's pet history)."""
    serializer_class = PetListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Pet.objects.filter(
            owner=self.request.user,
            status__in=['sold', 'adopted']
        ).order_by('-updated_at')


class HealthRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = HealthRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return HealthRecord.objects.filter(pet_id=self.kwargs['pet_pk'])

    def perform_create(self, serializer):
        pet = Pet.objects.get(pk=self.kwargs['pet_pk'])
        if pet.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the pet owner can add health records.")
        serializer.save(pet=pet)


class HealthRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HealthRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return HealthRecord.objects.filter(pet_id=self.kwargs['pet_pk'])

class SyncVaccinationView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        pet = Pet.objects.get(pk=kwargs['pet_pk'])
        if pet.owner != request.user and not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only sync your own pets.")

        today = date.today()
        rows = build_vaccination_schedule(pet, today)
        created_count = 0
        updated_count = 0

        for title, rec_date, due_date, notes in rows:
            existing = HealthRecord.objects.filter(pet=pet, title=title).first()
            if existing:
                prev_due = existing.next_due_date
                changed = prev_due != due_date or existing.notes != notes
                if not changed:
                    continue
                existing.record_type = "vaccination"
                existing.date = rec_date
                existing.next_due_date = due_date
                existing.notes = notes
                if prev_due != due_date:
                    existing.reminder_sent = False
                existing.save()
                updated_count += 1
            else:
                HealthRecord.objects.create(
                    pet=pet,
                    record_type="vaccination",
                    title=title,
                    date=rec_date,
                    next_due_date=due_date,
                    notes=notes,
                    reminder_sent=False,
                )
                created_count += 1

        # Push via WebSocket + DB (same as adoption/booking notifications)
        if created_count or updated_count:
            parts = []
            if created_count:
                parts.append(f"{created_count} new record{'s' if created_count != 1 else ''}")
            if updated_count:
                parts.append(f"{updated_count} updated")
            detail = ", ".join(parts)
            create_notification(
                recipient=request.user,
                notification_type="vaccine_reminder",
                title=f"Vaccination plan: {pet.name}",
                message=(
                    f"We synced your vaccination roadmap for {pet.name} ({detail}). "
                    f"Due dates follow your pet's estimated birth — set birth date on the pet for best accuracy."
                ),
                related_object_id=pet.id,
                related_object_type="Pet",
                action_url=f"/pets/{pet.id}",
            )

        process_vaccination_reminders_for_user(request.user)

        msg = f"Synced {pet.name}: {created_count} new, {updated_count} updated health record(s)."
        return Response({"message": msg, "created": created_count, "updated": updated_count})
