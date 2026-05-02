from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from apps.accounts.models import CustomUser
from apps.pets.models import Pet
from apps.veterinary.models import DoctorProfile, Prescription, EmergencyRequest, HealthBlog
from apps.payments.models import Payment
from apps.shelters.models import Shelter
from apps.core.security import is_suspicious_string, sanitize_sql_input

class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        category = request.query_params.get('category', 'all').lower()

        # Input validation for security
        if is_suspicious_string(query):
            return Response({'error': 'Invalid search query format detected.'}, status=400)
        
        query = sanitize_sql_input(query)

        if len(query) < 2:
            return Response({"results": []})

        results = []
        is_admin = request.user.is_staff or getattr(request.user, 'role', '') == 'admin'

        # ── 1. Users ──
        if category in ['all', 'users']:
            user_qs = CustomUser.objects.filter(
                Q(username__icontains=query) |
                Q(email__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(phone__icontains=query)
            )
            # Normal users can search other users by name/email
            for u in user_qs[:10]:
                results.append({
                    "id": u.id,
                    "type": "user",
                    "title": f"{u.get_full_name()} ({u.username})",
                    "subtitle": u.email,
                    "badge": u.get_role_display() if hasattr(u, 'get_role_display') else u.role,
                    "status": "Active" if u.is_active else "Inactive",
                    "link": f"/users/{u.id}" if not is_admin else f"/admin/accounts/customuser/{u.id}/change/"
                })

        # ── 2. Doctors ──
        if category in ['all', 'doctors']:
            doc_qs = DoctorProfile.objects.filter(
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query) |
                Q(user__email__icontains=query) |
                Q(specialization__icontains=query) |
                Q(bvc_number__icontains=query)
            )
            if not is_admin:
                doc_qs = doc_qs.filter(approval_status='approved')
            
            for doc in doc_qs[:10]:
                title = f"Dr. {doc.user.get_full_name() or doc.user.username}"
                results.append({
                    "id": doc.id,
                    "type": "doctor",
                    "title": title,
                    "subtitle": f"{doc.specialization} | BVC: {doc.bvc_number}",
                    "badge": "Verified" if doc.is_bvc_verified else "Pending",
                    "status": doc.approval_status,
                    "link": f"/doctors/{doc.id}" if not is_admin else f"/admin/veterinary/doctorprofile/{doc.id}/change/"
                })

        # ── 3. Pets ──
        if category in ['all', 'pets']:
            pet_qs = Pet.objects.filter(
                Q(name__icontains=query) |
                Q(breed__icontains=query) |
                Q(pet_type__icontains=query)
            )
            if not is_admin:
                pet_qs = pet_qs.filter(Q(owner=request.user) | Q(status='available'))
                
            for pet in pet_qs[:10]:
                results.append({
                    "id": pet.id,
                    "type": "pet",
                    "title": f"{pet.name}",
                    "subtitle": f"{pet.pet_type.capitalize()} • {pet.breed}",
                    "badge": pet.status.capitalize(),
                    "status": pet.status,
                    "link": f"/pets/{pet.id}" if not is_admin else f"/admin/pets/pet/{pet.id}/change/"
                })

        # ── 4. Shelters ──
        if category in ['all', 'shelters']:
            sh_qs = Shelter.objects.filter(
                Q(name__icontains=query) |
                Q(location__icontains=query) |
                Q(contact_email__icontains=query)
            )
            if not is_admin:
                sh_qs = sh_qs.filter(status='approved')
                
            for sh in sh_qs[:5]:
                results.append({
                    "id": sh.id,
                    "type": "shelter",
                    "title": sh.name,
                    "subtitle": sh.location[:40],
                    "badge": sh.status.capitalize(),
                    "status": sh.status,
                    "link": f"/shelters/{sh.id}" if not is_admin else f"/admin/shelters/shelter/{sh.id}/change/"
                })

        # Admin / Specific Only Data (Prescriptions, Consultations, Payments)
        if is_admin:
            # ── 5. Prescriptions ──
            if category in ['all', 'prescriptions']:
                rx_qs = Prescription.objects.filter(
                    Q(prescription_id__icontains=query) |
                    Q(diagnosis__icontains=query) |
                    Q(doctor__first_name__icontains=query) |
                    Q(owner__first_name__icontains=query) |
                    Q(pet_name__icontains=query)
                )
                for rx in rx_qs[:5]:
                    results.append({
                        "id": rx.id,
                        "type": "prescription",
                        "title": f"Rx: {rx.prescription_id}",
                        "subtitle": f"Pet: {rx.pet_name} | Doc: {rx.doctor.get_full_name()}",
                        "badge": "Record",
                        "status": "valid",
                        "link": f"/admin/veterinary/prescription/{rx.id}/change/"
                    })

            # ── 6. Consultations (Emergencies) ──
            if category in ['all', 'consultations']:
                er_qs = EmergencyRequest.objects.filter(
                    Q(message__icontains=query) |
                    Q(status__icontains=query) |
                    Q(patient__first_name__icontains=query)
                )
                for er in er_qs[:5]:
                    results.append({
                        "id": er.id,
                        "type": "consultation",
                        "title": f"Consultation #{er.id}",
                        "subtitle": f"Patient: {er.patient.get_full_name() or er.patient.email}",
                        "badge": er.status.capitalize(),
                        "status": er.status,
                        "link": f"/admin/veterinary/emergencyrequest/{er.id}/change/"
                    })

            # ── 7. Payments ──
            if category in ['all', 'payments']:
                pay_qs = Payment.objects.filter(
                    Q(transaction_id__icontains=query) |
                    Q(user__email__icontains=query) |
                    Q(method__icontains=query)
                )
                for pay in pay_qs[:5]:
                    results.append({
                        "id": pay.id,
                        "type": "payment",
                        "title": f"Txn: {pay.transaction_id}",
                        "subtitle": f"Amount: {pay.amount} | User: {pay.user.email}",
                        "badge": pay.status.capitalize(),
                        "status": pay.status,
                        "link": f"/admin/payments/payment/{pay.id}/change/"
                    })

        # Final Sorting (Admin sees all up to limits, user sees filtered)
        # Sort results slightly so exact matches could theoretically be bubbled up if needed, 
        # but here we just return the assembled list directly for speed.
        return Response({"results": results})
