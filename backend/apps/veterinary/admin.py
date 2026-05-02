from django.contrib import admin
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import format_html
from apps.core.admin_mixins import AdvancedSearchMixin
from .models import DoctorProfile, HealthBlog, Prescription, EmergencyRequest


@admin.register(Prescription)
class PrescriptionAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = ['prescription_id', 'doctor_name', 'owner_name', 'pet_name', 'pet_type', 'created_at']
    list_filter = ['pet_type', 'created_at']
    search_fields = ['prescription_id', 'doctor__email', 'owner__email', 'pet_name', 'diagnosis']
    ordering = ['-created_at']
    readonly_fields = ['prescription_id', 'created_at', 'updated_at']

    @admin.display(description='Doctor')
    def doctor_name(self, obj):
        return format_html('<strong>{}</strong><br><small style="color:#888">{}</small>',
                           obj.doctor.get_full_name() or obj.doctor.username, obj.doctor.email)

    @admin.display(description='Owner')
    def owner_name(self, obj):
        return format_html('{}<br><small style="color:#888">{}</small>',
                           obj.owner.get_full_name() or obj.owner.username, obj.owner.email)


@admin.register(EmergencyRequest)
class EmergencyRequestAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = ['id', 'patient_name', 'assigned_doctor', 'status_badge', 'payment_status', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['patient__email', 'doctor__email', 'message']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'distance_km']
    actions = ['force_end_selected', 'mark_resolved']

    @admin.display(description='Patient')
    def patient_name(self, obj):
        return obj.patient.get_full_name() or obj.patient.email

    @admin.display(description='Assigned Doctor')
    def assigned_doctor(self, obj):
        if obj.doctor:
            return format_html('<span style="color:#059669;font-weight:700">Dr. {}</span>',
                               obj.doctor.get_full_name() or obj.doctor.email)
        return format_html('<span style="color:#ef4444;font-weight:700">{}</span>', '⚠ Unassigned')

    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b', 'accepted': '#3b82f6',
            'active': '#10b981', 'resolved': '#6b7280', 'cancelled': '#ef4444'
        }
        color = colors.get(obj.status, '#a3aed0')
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;border-radius:12px;font-size:.75rem;font-weight:700">{}</span>',
            color, obj.get_status_display()
        )

    @admin.action(description='✅ Force-End selected consultations (mark resolved)')
    def force_end_selected(self, request, queryset):
        count = queryset.exclude(status__in=['resolved', 'cancelled']).update(status='resolved')
        self.message_user(request, f'✅ {count} consultation(s) marked as resolved.', messages.SUCCESS)

    @admin.action(description='🔴 Mark selected as cancelled')
    def mark_resolved(self, request, queryset):
        count = queryset.update(status='cancelled')
        self.message_user(request, f'🔴 {count} request(s) cancelled.', messages.WARNING)



@admin.register(HealthBlog)
class HealthBlogAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = ('title', 'author', 'created_at', 'updated_at')
    search_fields = ('title', 'content', 'author__email')
    list_filter = ('created_at', 'author')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(DoctorProfile)
class DoctorProfileAdmin(AdvancedSearchMixin, admin.ModelAdmin):
    list_display = [
        'doctor_name', 'bvc_number_display', 'bvc_type', 'division_code',
        'specialization', 'approval_badge', 'bvc_verified_badge',
        'consultation_fee', 'created_at',
    ]
    list_filter = ['approval_status', 'is_bvc_verified', 'bvc_type', 'division_code', 'specialization']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'bvc_number']
    ordering = ['-created_at']
    readonly_fields = ['bvc_number', 'bvc_type', 'division_code', 'created_at', 'updated_at']
    actions = ['approve_doctors', 'reject_doctors', 'mark_bvc_verified']

    fieldsets = (
        ('👤 Doctor Identity', {
            'fields': ('user', 'bvc_number', 'bvc_type', 'division_code', 'is_bvc_verified'),
        }),
        ('⚖️ Approval Status', {
            'fields': ('approval_status', 'rejection_reason'),
        }),
        ('🏥 Professional Details', {
            'fields': ('specialization', 'years_experience', 'consultation_fee', 'clinic_name', 'clinic_address'),
            'classes': ('collapse',),
        }),
        ('📅 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def save_model(self, request, obj, form, change):
        """Ensure the user's active status is fully synced when saving via the form."""
        super().save_model(request, obj, form, change)
        if obj.approval_status == 'approved' and not obj.user.is_active:
            obj.user.is_active = True
            obj.user.save(update_fields=['is_active'])
        elif obj.approval_status == 'rejected' and obj.user.is_active:
            obj.user.is_active = False
            obj.user.save(update_fields=['is_active'])

    # ── Display helpers ──────────────────────────────────────────────────────

    @admin.display(description='Doctor Name', ordering='user__first_name')
    def doctor_name(self, obj):
        name = obj.user.get_full_name() or obj.user.username
        return format_html('<strong>{}</strong><br><small style="color:#888">{}</small>', name, obj.user.email)

    @admin.display(description='BVC Number')
    def bvc_number_display(self, obj):
        return format_html(
            '<code style="background:#1a1a2e;color:#fb923c;padding:2px 6px;border-radius:4px">{}</code>',
            obj.bvc_number
        )

    @admin.display(description='Status')
    def approval_badge(self, obj):
        if obj.approval_status == 'pending':
            from django.urls import reverse
            approve_url = reverse('admin:veterinary_approve_doctor', args=[obj.pk])
            return format_html(
                '<a href="{}" style="background:#f59e0b;color:#1a1a00;padding:4px 10px;border-radius:12px;font-size:.75rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;transition:0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" title="Click to Quick Approve & Verify">⏳ Pending <span style="margin-left:6px;padding-left:6px;border-left:1px solid rgba(0,0,0,0.2);">Approve ☑</span></a>',
                approve_url
            )
        elif obj.approval_status == 'approved':
            return format_html('<span style="background:#10b981;color:#001a0d;padding:3px 10px;border-radius:12px;font-size:.75rem;font-weight:700">{}</span>', '✅ Approved')
        else:
            return format_html('<span style="background:#ef4444;color:#1a0000;padding:3px 10px;border-radius:12px;font-size:.75rem;font-weight:700">{}</span>', '❌ Rejected')

    @admin.display(description='BVC Verified', boolean=False)
    def bvc_verified_badge(self, obj):
        if obj.is_bvc_verified:
            return format_html('<span style="color:#10b981;font-weight:700">{}</span>', '✔ Verified')
        return format_html('<span style="color:#f59e0b;font-weight:700">{}</span>', '⚠ Unverified')

    # ── Admin Actions ────────────────────────────────────────────────────────

    @admin.action(description='✅ Approve selected doctors (activates their accounts)')
    def approve_doctors(self, request, queryset):
        approved_count = 0
        for profile in queryset.exclude(approval_status='approved'):
            profile.approval_status = 'approved'
            profile.save(update_fields=['approval_status'])

            # Activate the linked user account
            profile.user.is_active = True
            profile.user.save(update_fields=['is_active'])

            # Send approval email to the doctor
            try:
                send_mail(
                    subject="🎉 Your PawHub Doctor Account Has Been Approved!",
                    message=(
                        f"Dear Dr. {profile.user.get_full_name() or profile.user.username},\n\n"
                        f"Congratulations! Your veterinary doctor registration on PawHub has been "
                        f"reviewed and approved.\n\n"
                        f"You can now log in at {settings.FRONTEND_URL}/login with your registered "
                        f"email and password to access your doctor dashboard.\n\n"
                        f"Your BVC Number: {profile.bvc_number}\n\n"
                        f"Welcome to PawHub! 🐾\n\nThe PawHub Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[profile.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

            approved_count += 1

        self.message_user(
            request,
            f"✅ {approved_count} doctor account(s) approved and activated. Approval emails sent.",
            messages.SUCCESS,
        )

    @admin.action(description='❌ Reject selected doctors (deactivates their accounts)')
    def reject_doctors(self, request, queryset):
        rejected_count = 0
        for profile in queryset.exclude(approval_status='rejected'):
            profile.approval_status = 'rejected'
            profile.save(update_fields=['approval_status'])

            # Deactivate the user account for safety
            profile.user.is_active = False
            profile.user.save(update_fields=['is_active'])

            # Send rejection notification
            try:
                send_mail(
                    subject="PawHub Doctor Registration — Application Update",
                    message=(
                        f"Dear {profile.user.get_full_name() or profile.user.username},\n\n"
                        f"Thank you for registering on PawHub. After reviewing your application, "
                        f"we are unable to approve your account at this time.\n\n"
                        f"If you believe this is in error or wish to appeal, please contact our "
                        f"support team.\n\nThe PawHub Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[profile.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

            rejected_count += 1

        self.message_user(
            request,
            f"❌ {rejected_count} doctor account(s) rejected.",
            messages.WARNING,
        )

    @admin.action(description='🔐 Mark BVC as Verified (manual check)')
    def mark_bvc_verified(self, request, queryset):
        count = queryset.update(is_bvc_verified=True)
        self.message_user(request, f"🔐 {count} BVC number(s) marked as verified.", messages.SUCCESS)

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('<int:doctor_id>/quick-approve/', self.admin_site.admin_view(self.quick_approve_view), name='veterinary_approve_doctor'),
        ]
        return custom_urls + urls

    def quick_approve_view(self, request, doctor_id):
        from django.shortcuts import get_object_or_404, redirect
        profile = get_object_or_404(DoctorProfile, pk=doctor_id)
        
        if profile.approval_status != 'approved':
            profile.approval_status = 'approved'
            profile.is_bvc_verified = True
            profile.save(update_fields=['approval_status', 'is_bvc_verified'])
            
            profile.user.is_active = True
            profile.user.save(update_fields=['is_active'])

            try:
                send_mail(
                    subject="🎉 Your PawHub Doctor Account Has Been Approved!",
                    message=(
                        f"Dear Dr. {profile.user.get_full_name() or profile.user.username},\n\n"
                        f"Congratulations! Your veterinary doctor registration on PawHub has been "
                        f"reviewed and approved.\n\n"
                        f"You can now log in at {settings.FRONTEND_URL}/login with your registered "
                        f"email and password to access your doctor dashboard.\n\n"
                        f"Your BVC Number: {profile.bvc_number}\n\n"
                        f"Welcome to PawHub! 🐾\n\nThe PawHub Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[profile.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass
                
            self.message_user(request, f"✅ Dr. {profile.user.get_full_name() or profile.user.username} approved, BVC marked verified, and account activated.", messages.SUCCESS)
            
        return redirect('admin:veterinary_doctorprofile_changelist')
