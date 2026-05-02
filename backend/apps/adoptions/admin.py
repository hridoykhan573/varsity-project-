from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.db.models import Case, When, Value, IntegerField, Q
from django.urls import path
from django.http import JsonResponse

from apps.accounts.admin_user_display import format_user_admin_cell
from .models import AdoptionRequest


@admin.register(AdoptionRequest)
class AdoptionRequestAdmin(admin.ModelAdmin):
    list_display = ['pet', 'requester_display', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['pet__name', 'requester__username', 'requester__email']
    ordering = ['-created_at']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('search_suggestions/', self.admin_site.admin_view(self.search_suggestions_view), name='adoptions_adoptionrequest_suggest'),
        ]
        return custom_urls + urls

    def search_suggestions_view(self, request):
        term = request.GET.get('q', '').strip().lower()
        if not term: return JsonResponse([], safe=False)
        
        # Collect top matches from different entities
        suggestions = []
        
        # 1. Smart Keywords (Status, Types)
        keywords = ['Pending', 'Accepted', 'Rejected', 'Cat', 'Dog', 'Rabbit', 'April', 'March', '2026']
        for kw in keywords:
            if term in kw.lower(): suggestions.append({'val': kw, 'type': 'keyword'})

        # 2. Dynamic Matches (Pet Names, Requesters)
        pets = AdoptionRequest.objects.filter(pet__name__icontains=term).values_list('pet__name', flat=True).distinct()[:5]
        for p in pets: suggestions.append({'val': p, 'type': 'pet'})
        
        users = AdoptionRequest.objects.filter(Q(requester__username__icontains=term) | Q(requester__email__icontains=term)).values_list('requester__username', flat=True).distinct()[:5]
        for u in users: suggestions.append({'val': u, 'type': 'user'})

        return JsonResponse(suggestions[:10], safe=False)

    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        term = search_term.lower().strip()
        if not term: return queryset, use_distinct

        # Advanced Ranking Logic
        # 100: Exact Match (Status, Pet, User)
        # 50: Partial Match
        # 10: General search
        
        # Detect Intent
        status_map = {'pending': 'pending', 'accepted': 'accepted', 'rejected': 'rejected', 'pend': 'pending', 'acc': 'accepted', 'rej': 'rejected'}
        month_map = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
                     'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6, 'july': 7}
        
        q_intent = Q()
        
        # A. Status Intent
        if term in status_map:
            q_intent |= Q(status=status_map[term])
            
        # B. Month Intent
        for m_key, m_val in month_map.items():
            if term == m_key:
                q_intent |= Q(created_at__month=m_val)
                
        # C. Year Intent
        if term.isdigit() and len(term) == 4:
            q_intent |= Q(created_at__year=int(term))
        elif term.isdigit() and len(term) == 2 and 20 <= int(term) <= 30:
            q_intent |= Q(created_at__year=2000 + int(term))
            
        # D. Pet Type Intent
        if term in ['cat', 'dog', 'rabbit', 'bird']:
            q_intent |= Q(pet__pet_type=term)

        if q_intent: 
            queryset |= self.model.objects.filter(q_intent)

        # Apply weighted sorting
        queryset = queryset.annotate(
            relevance=Case(
                When(Q(status__iexact=term) | Q(pet__name__iexact=term) | Q(requester__username__iexact=term), then=Value(100)),
                When(Q(status__icontains=term) | Q(pet__name__icontains=term), then=Value(50)),
                default=Value(10),
                output_field=IntegerField(),
            )
        ).order_by('-relevance', '-created_at', 'pet__name')

        return queryset, use_distinct

    @admin.display(description=_('Requester'), ordering='requester__email')
    def requester_display(self, obj):
        return format_user_admin_cell(obj.requester)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('requester', 'pet')
