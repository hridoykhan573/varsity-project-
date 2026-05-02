import math
from datetime import datetime
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.decorators import action
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import DoctorProfile, HealthBlog, EmergencyRequest, Prescription
from .serializers import (
    DoctorRegisterSerializer, DoctorProfileSerializer, 
    DoctorPublicSerializer, HealthBlogSerializer,
    EmergencyRequestSerializer, PrescriptionSerializer
)
from apps.appointments.models import Appointment
from apps.notifications.utils import create_notification

User = get_user_model()

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points in km."""
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlamb = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlamb/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


class DoctorRegisterView(APIView):
    """
    Public endpoint to register as a veterinary doctor.
    Creates a CustomUser(role='doctor', is_active=False) + DoctorProfile.
    Account must be approved by admin before the doctor can log in.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = DoctorRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Notify admin(s) via email about a new pending registration
        try:
            send_mail(
                subject="[PawHub] New Doctor Registration — Pending Approval",
                message=(
                    f"A new veterinary doctor has registered and is awaiting approval.\n\n"
                    f"Name: {user.get_full_name()}\n"
                    f"Email: {user.email}\n"
                    f"BVC Number: {user.doctor_profile.bvc_number}\n\n"
                    f"Please log in to the admin panel to review and approve this registration."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.DEFAULT_FROM_EMAIL],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response(
            {
                "detail": (
                    "Registration successful! Your account is pending admin review. "
                    "You will be notified once approved."
                ),
                "email": user.email,
                "bvc_number": user.doctor_profile.bvc_number,
            },
            status=status.HTTP_201_CREATED,
        )


class DoctorProfileView(generics.RetrieveUpdateAPIView):
    """Authenticated doctor: retrieve and update their own profile."""
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if self.request.user.role != 'doctor':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only veterinary doctors can access this endpoint.")
        try:
            return self.request.user.doctor_profile
        except DoctorProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Doctor profile not found.")


class DoctorListView(generics.ListAPIView):
    """
    Public listing of *approved* veterinary doctors.
    Supports ?specialization=cardiology and ?division=DHK filters.
    """
    serializer_class = DoctorPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        is_online = self.request.query_params.get('is_online')

        # Base queryset: users must be active
        qs = DoctorProfile.objects.filter(user__is_active=True).select_related('user')

        # If not just looking for online doctors, enforce approved status for public list
        if is_online != 'true':
            qs = qs.filter(approval_status='approved')

        specialization = self.request.query_params.get('specialization')
        division = self.request.query_params.get('division')

        if specialization:
            qs = qs.filter(specialization=specialization)
        if division:
            qs = qs.filter(division_code__iexact=division)
        if is_online == 'true':
            qs = qs.filter(user__is_online=True)

        return qs


from rest_framework import viewsets
from .models import HealthBlog
from .serializers import HealthBlogSerializer

class HealthBlogViewSet(viewsets.ModelViewSet):
    """
    Public can view blogs.
    Only approved doctors can create, update, delete their own blogs.
    """
    serializer_class = HealthBlogSerializer
    queryset = HealthBlog.objects.all().select_related('author', 'author__doctor_profile')
    lookup_field = 'slug'
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'comments']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'role') and self.request.user.role == 'doctor':
            try:
                if self.request.user.doctor_profile.is_approved:
                    serializer.save(author=self.request.user)
                    return
            except:
                pass
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Only approved veterinary doctors can create health blogs.")

    def perform_update(self, serializer):
        blog = self.get_object()
        if blog.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit your own blogs.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own blogs.")
        instance.delete()

    from rest_framework.decorators import action
    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, slug=None):
        blog = self.get_object()
        from .models import HealthBlogComment
        from .serializers import HealthBlogCommentSerializer

        if request.method == 'GET':
            comments = blog.comments.all().select_related('user')
            serializer = HealthBlogCommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = HealthBlogCommentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(blog=blog, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmergencyViewSet(viewsets.ModelViewSet):
    """
    Handles emergency requests.
    POST: Triggers a new emergency search.
    """
    serializer_class = EmergencyRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return EmergencyRequest.objects.filter(doctor=user)
        return EmergencyRequest.objects.filter(patient=user)

    def create(self, request, *args, **kwargs):
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        message = request.data.get('message')
        forced_doc_id = request.data.get('forced_doctor_id')
        images = request.FILES.getlist('images')

        target_doc = None
        min_dist = 0

        # If we have a forced doctor, we skip the proximity search
        if forced_doc_id:
            try:
                target_doc = User.objects.get(
                    id=forced_doc_id,
                    role='doctor',
                    is_online=True,
                )
            except User.DoesNotExist:
                return Response({"error": "Selected doctor is no longer online or available."}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Normal proximity search
            if lat is None or lng is None:
                return Response({"error": "Location required for automatic matching."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                lat_f, lng_f = float(lat), float(lng)
            except ValueError:
                return Response({"error": "Invalid coordinates."}, status=status.HTTP_400_BAD_REQUEST)

            doctors = User.objects.filter(
                role='doctor',
                is_available=True,
            ).select_related('doctor_profile')

            if not doctors.exists():
                return Response({"error": "No doctors are currently online."}, status=status.HTTP_404_NOT_FOUND)

            min_dist = float('inf')
            for doc in doctors:
                if doc.latitude and doc.longitude:
                    dist = haversine(lat_f, lng_f, float(doc.latitude), float(doc.longitude))
                    if dist < min_dist:
                        min_dist = dist
                        target_doc = doc

            if not target_doc:
                return Response({"error": "Could not locate nearby active doctors."}, status=status.HTTP_404_NOT_FOUND)

        # Create the request
        emergency = EmergencyRequest.objects.create(
            patient=request.user,
            doctor=target_doc,
            latitude=lat,
            longitude=lng,
            message=message,
            distance_km=min_dist,
            status='accepted'
        )

        # Handle images
        from .models import EmergencyImage
        for img in images:
            EmergencyImage.objects.create(emergency=emergency, image=img)

        self._notify_doctor(emergency, request.user)
        return Response(self.get_serializer(emergency).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def my_emergencies(self, request):
        """Returns emergencies assigned to the current doctor that are NOT yet active."""
        if request.user.role != 'doctor':
            return Response({"error": "Only doctors can access this."}, status=status.HTTP_403_FORBIDDEN)
        
        # Only return 'accepted' (meaning recently assigned but not yet started/consulting)
        emergencies = EmergencyRequest.objects.filter(
            doctor=request.user, 
            status__in=['pending', 'accepted']
        ).order_by('-created_at')
        serializer = self.get_serializer(emergencies, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active_consultations(self, request):
        """Returns emergencies assigned to the doctor that are currently in progress."""
        if request.user.role != 'doctor':
            return Response({"error": "Only doctors can access this."}, status=status.HTTP_403_FORBIDDEN)
        
        emergencies = EmergencyRequest.objects.filter(
            doctor=request.user, 
            status='active'
        ).order_by('-updated_at')
        serializer = self.get_serializer(emergencies, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Moves an emergency from accepted/pending to active."""
        emergency = self.get_object()
        if emergency.doctor != request.user:
            return Response({"error": "Not your emergency."}, status=status.HTTP_403_FORBIDDEN)
        
        emergency.status = 'active'
        emergency.save()
        
        # Trigger a notification to the patient that the doctor is now consulting
        create_notification(
            recipient=emergency.patient,
            notification_type='emergency_update',
            title='👨‍⚕️ Consultation Started',
            message=f"Dr. {request.user.get_full_name()} has approved your request and is starting the consultation.",
            related_object_id=emergency.id,
            related_object_type='emergency'
        )
        
        return Response(self.get_serializer(emergency).data)

        return Response(self.get_serializer(emergency).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Marks a consultation as completed (resolved)."""
        emergency = self.get_object()
        if emergency.doctor != request.user:
            return Response({"error": "Not your emergency."}, status=status.HTTP_403_FORBIDDEN)
        
        emergency.status = 'resolved'
        emergency.save()
        
        # Notify patient that the case is resolved and they can now review
        create_notification(
            recipient=emergency.patient,
            notification_type='emergency_update',
            title='✅ Consultation Completed',
            message=f"Dr. {request.user.get_full_name()} has marked the consultation as completed. Please share your rating in the history section!",
            related_object_id=emergency.id,
            related_object_type='emergency'
        )
        
        return Response(self.get_serializer(emergency).data)

    @action(detail=False, methods=['post'], url_path='select')
    def select_consultation(self, request):
        """Sets the currently focused consultation for the doctor."""
        consult_id = request.data.get('consultation_id')
        if not consult_id:
            return Response({"error": "Consultation ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            profile = request.user.doctor_profile
            profile.selected_consultation_id = consult_id
            profile.save()
            return Response({"detail": "Consultation selected successfully."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='selected')
    def get_selected(self, request):
        """Returns the pet owner details for the doctor's currently selected consultation."""
        try:
            profile = request.user.doctor_profile
            consult_id = profile.selected_consultation_id
            if not consult_id:
                return Response({"error": "No consultation selected."}, status=status.HTTP_404_NOT_FOUND)
            
            emergency = EmergencyRequest.objects.get(id=consult_id)
            owner = emergency.patient
            return Response({
                'id': owner.id,
                'full_name': owner.get_full_name() or owner.username,
                'email': owner.email,
                'pet_name': "Pet",
            })
        except EmergencyRequest.DoesNotExist:
            return Response({"error": "Selected consultation no longer exists."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Returns emergencies requested by the current user."""
        emergencies = EmergencyRequest.objects.filter(patient=request.user).order_by('-created_at')
        serializer = self.get_serializer(emergencies, many=True)
        return Response(serializer.data)

    def _notify_doctor(self, emergency, user):
        create_notification(
            recipient=emergency.doctor,
            notification_type='emergency',
            title='🚨 EMERGENCY HELP REQUESTED',
            message=f"Urgent: {user.get_full_name() or user.username} is requesting help.",
            related_object_id=emergency.id,
            related_object_type='emergency',
            action_url=f"/emergencies/{emergency.id}"
        )


class PrescriptionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing veterinary prescriptions."""
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Prescription.objects.all()
        if user.role == 'doctor':
            return Prescription.objects.filter(doctor=user)
        return Prescription.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)

    @action(detail=False, methods=['get'])
    def search_owners(self, request):
        """Allows doctors to search for pet owners by name or email."""
        from apps.accounts.models import CustomUser
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return Response([])
        
        users = CustomUser.objects.filter(
            models.Q(first_name__icontains=query) | 
            models.Q(last_name__icontains=query) |
            models.Q(email__icontains=query)
        ).exclude(role='doctor')[:10]
        
        results = [{
            'id': u.id,
            'full_name': u.get_full_name() or u.username,
            'email': u.email,
            'avatar': u.avatar.url if u.avatar else None
        } for u in users]
        
        return Response(results)

    @action(detail=False, methods=['get'], url_path='pet-owners/list')
    def pet_owners_list(self, request):
        """Returns a list of all pet owner emails and names for the searchable dropdown."""
        from apps.accounts.models import CustomUser
        owners = CustomUser.objects.filter(role='owner').order_by('email')
        results = [{
            'id': u.id,
            'email': u.email,
            'full_name': u.get_full_name() or u.username
        } for u in owners]
        return Response(results)


class AdminDoctorActivityViewSet(viewsets.ViewSet):
    """
    Admin-only ViewSet for monitoring and managing all doctor activities.
    Covers: prescriptions, ongoing consultations, fees, and emergency cases.
    """
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['get'], url_path='prescriptions')
    def all_prescriptions(self, request):
        """Returns ALL prescriptions across the platform."""
        from django.db.models import Q
        qs = Prescription.objects.select_related('doctor', 'owner').order_by('-created_at')

        # Optional search filter
        q = request.query_params.get('q', '')
        if q:
            qs = qs.filter(
                Q(doctor__email__icontains=q) |
                Q(owner__email__icontains=q) |
                Q(pet_name__icontains=q) |
                Q(prescription_id__icontains=q)
            )

        serializer = PrescriptionSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=True, methods=['delete'], url_path='prescriptions/delete')
    def delete_prescription(self, request, pk=None):
        """Admin can delete any prescription by ID."""
        try:
            prescription = Prescription.objects.get(pk=pk)
            prescription.delete()
            return Response({'detail': 'Prescription deleted.'}, status=status.HTTP_204_NO_CONTENT)
        except Prescription.DoesNotExist:
            return Response({'error': 'Prescription not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='consultations')
    def all_consultations(self, request):
        """Returns ALL ongoing consultations (active emergency requests) across the platform."""
        status_filter = request.query_params.get('status', 'active')

        qs = EmergencyRequest.objects.select_related('doctor', 'patient').order_by('-updated_at')
        if status_filter != 'all':
            qs = qs.filter(status=status_filter)

        serializer = EmergencyRequestSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=True, methods=['post'], url_path='consultations/force-end')
    def force_end_consultation(self, request, pk=None):
        """Admin can force-end an ongoing consultation (sets status to resolved)."""
        try:
            emergency = EmergencyRequest.objects.get(pk=pk)
            emergency.status = 'resolved'
            emergency.save()
            create_notification(
                recipient=emergency.patient,
                notification_type='emergency_update',
                title='✅ Consultation Ended by Admin',
                message='An administrator has ended your consultation session.',
                related_object_id=emergency.id,
                related_object_type='emergency'
            )
            if emergency.doctor:
                create_notification(
                    recipient=emergency.doctor,
                    notification_type='emergency_update',
                    title='⚠️ Consultation Force-Ended',
                    message='An administrator has ended one of your consultations.',
                    related_object_id=emergency.id,
                    related_object_type='emergency'
                )
            return Response({'detail': 'Consultation has been force-ended.'})
        except EmergencyRequest.DoesNotExist:
            return Response({'error': 'Consultation not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='consultations/reassign')
    def reassign_consultation(self, request, pk=None):
        """Admin can reassign an emergency to a different doctor."""
        new_doctor_id = request.data.get('doctor_id')
        if not new_doctor_id:
            return Response({'error': 'doctor_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            emergency = EmergencyRequest.objects.get(pk=pk)
            new_doctor = User.objects.get(id=new_doctor_id, role='doctor')
            old_doctor = emergency.doctor
            emergency.doctor = new_doctor
            emergency.status = 'accepted'
            emergency.save()

            # Notify new doctor
            create_notification(
                recipient=new_doctor,
                notification_type='emergency',
                title='🚨 Emergency Reassigned to You',
                message=f'Admin has reassigned an emergency case to you.',
                related_object_id=emergency.id,
                related_object_type='emergency'
            )
            return Response({'detail': f'Emergency reassigned to Dr. {new_doctor.get_full_name()}.'})
        except EmergencyRequest.DoesNotExist:
            return Response({'error': 'Emergency not found.'}, status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response({'error': 'Target doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='fees')
    def doctor_fees(self, request):
        """Returns all doctor profiles with their fee structures for admin review."""
        profiles = DoctorProfile.objects.filter(
            approval_status='approved'
        ).select_related('user').order_by('-updated_at')

        results = []
        for p in profiles:
            results.append({
                'id': p.id,
                'doctor_id': p.user.id,
                'full_name': p.user.get_full_name() or p.user.email,
                'email': p.user.email,
                'specialization': p.get_specialization_display(),
                'consultation_fee': str(p.consultation_fee or 0),
                'emergency_fee': str(p.emergency_fee or 0),
                'bvc_number': p.bvc_number,
                'is_bvc_verified': p.is_bvc_verified,
                'approval_status': p.approval_status,
                'clinic_name': p.clinic_name,
            })

        return Response({'count': len(results), 'results': results})

    @action(detail=True, methods=['patch'], url_path='fees/update')
    def update_doctor_fee(self, request, pk=None):
        """Admin can update a doctor's consultation or emergency fee."""
        try:
            profile = DoctorProfile.objects.get(pk=pk)
            if 'consultation_fee' in request.data:
                profile.consultation_fee = request.data['consultation_fee']
            if 'emergency_fee' in request.data:
                profile.emergency_fee = request.data['emergency_fee']
            if 'approval_status' in request.data:
                profile.approval_status = request.data['approval_status']
            profile.save()
            return Response({'detail': 'Doctor profile updated.'})
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='emergencies')
    def all_emergencies(self, request):
        """Returns ALL emergency cases with full doctor and patient details for admin oversight."""
        status_filter = request.query_params.get('status', '')
        qs = EmergencyRequest.objects.select_related('doctor', 'patient').order_by('-created_at')
        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = EmergencyRequestSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})


from django.utils.timezone import make_aware

class DoctorPatientViewSet(viewsets.ViewSet):
    """
    Expert system for doctors to manage their unique patients.
    Filters unique users who have consumed any service (Emergency or Prescription)
    and aggregates their full medical interaction history.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        if request.user.role != 'doctor':
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # 1. Gather all services for this doctor
        emergencies = EmergencyRequest.objects.filter(doctor=request.user).select_related('patient')
        prescriptions = Prescription.objects.filter(doctor=request.user).select_related('owner')
        appointments = Appointment.objects.filter(doctor=request.user).select_related('pet_owner')

        patient_map = {}

        # Process Emergencies
        for e in emergencies:
            p_id = e.patient.id
            if p_id not in patient_map:
                patient_map[p_id] = {
                    'id': p_id,
                    'full_name': e.patient.get_full_name() or e.patient.username,
                    'email': e.patient.email,
                    'avatar': request.build_absolute_uri(e.patient.avatar.url) if e.patient.avatar else None,
                    'services': [],
                    'total_spend': 0
                }
            
            patient_map[p_id]['services'].append({
                'id': f"EM-{e.id}",
                'type': 'Emergency Consultation',
                'pet_name': e.pet_name or 'Unknown Pet',
                'time': e.created_at,
                'status': e.get_status_display(),
                'payment': e.payment_status if hasattr(e, 'payment_status') else 'paid',
                'amount': str(getattr(e, 'amount', '500.00'))
            })
            if hasattr(e, 'payment_status') and e.payment_status == 'paid':
                patient_map[p_id]['total_spend'] += float(getattr(e, 'amount', 0))
            elif not hasattr(e, 'payment_status'):
                 patient_map[p_id]['total_spend'] += 500.0

        # Process Prescriptions
        for p in prescriptions:
            o_id = p.owner.id
            if o_id not in patient_map:
                patient_map[o_id] = {
                    'id': o_id,
                    'full_name': p.owner.get_full_name() or p.owner.username,
                    'email': p.owner.email,
                    'avatar': request.build_absolute_uri(p.owner.avatar.url) if p.owner.avatar else None,
                    'services': [],
                    'total_spend': 0
                }
            
            patient_map[o_id]['services'].append({
                'id': f"PX-{p.id}",
                'type': 'Medical Prescription',
                'pet_name': p.pet_name,
                'time': p.created_at,
                'status': 'Issued',
                'payment': 'Paid',
                'amount': '0.00'
            })

        # Process Appointments
        for a in appointments:
            o_id = a.pet_owner.id
            if o_id not in patient_map:
                patient_map[o_id] = {
                    'id': o_id,
                    'full_name': a.pet_owner.get_full_name() or a.pet_owner.username,
                    'email': a.pet_owner.email,
                    'avatar': request.build_absolute_uri(a.pet_owner.avatar.url) if a.pet_owner.avatar else None,
                    'services': [],
                    'total_spend': 0
                }
            
            patient_map[o_id]['services'].append({
                'id': f"AP-{a.id}",
                'type': 'Veterinary Appointment',
                'pet_name': a.pet_name,
                'time': make_aware(datetime.combine(a.appointment_date, datetime.min.time())), # Rough time
                'status': a.get_status_display(),
                'payment': 'paid' if a.status == 'completed' else 'pending',
                'amount': '500.00' # Assuming a default appointment fee for display
            })

        # Sort services by time for each patient
        for p_id in patient_map:
            patient_map[p_id]['services'].sort(key=lambda x: x['time'], reverse=True)
            patient_map[p_id]['latest_service'] = patient_map[p_id]['services'][0]['type'] if patient_map[p_id]['services'] else 'N/A'
            patient_map[p_id]['service_count'] = len(patient_map[p_id]['services'])

        results = list(patient_map.values())
        return Response({
            'unique_patient_count': len(results),
            'patients': results
        })


