import re
from datetime import datetime
from django.db.models import Q
from django.core.exceptions import FieldDoesNotExist

class AdvancedSearchMixin:
    """
    Mixin to enable searching on non-traditional fields in Django Admin
    including Date, DateTime, Boolean, Decimal, and select CharFields mapped to choices
    for fields: START DATE, END DATE, STATUS, PAYMENT STATUS, TOTAL PRICE, TITLE, CREATED AT, IS READ
    """
    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        term = search_term.lower().strip()
        if not term:
            return queryset, use_distinct

        extra_q = Q()
        model = self.model
        
        def has_field(field_name):
            try:
                model._meta.get_field(field_name)
                return True
            except FieldDoesNotExist:
                return False

        # 1. Flexible Date Searching (START DATE, END DATE, CREATED AT)
        date_fields = [f for f in ['start_date', 'end_date', 'created_at', 'birth_date', 'date'] if has_field(f)]
        if date_fields:
            # Try full date YYYY-MM-DD
            try:
                d = datetime.strptime(term, "%Y-%m-%d").date()
                for f in date_fields:
                    if f == 'created_at': extra_q |= Q(created_at__date=d)
                    else: extra_q |= Q(**{f: d})
            except ValueError:
                # Try Year (e.g. "2026")
                if term.isdigit() and len(term) == 4:
                    year = int(term)
                    for f in date_fields:
                        extra_q |= Q(**{f"{f}__year": year})
                
                # Try Month Name (e.g. "April", "Apr")
                months = {
                    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
                    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
                    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
                    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                }
                if term in months:
                    month_num = months[term]
                    for f in date_fields:
                        extra_q |= Q(**{f"{f}__month": month_num})
                
                # Try Day of month (e.g. "02")
                if term.isdigit() and 1 <= int(term) <= 31 and len(term) <= 2:
                    day_num = int(term)
                    for f in date_fields:
                        extra_q |= Q(**{f"{f}__day": day_num})

        # 2. Status & Payment Status
        if has_field('status'):
            extra_q |= Q(status__icontains=term)
        if has_field('payment_status'):
            extra_q |= Q(payment_status__icontains=term)
            
        # 3. TITLE
        if has_field('title'):
            extra_q |= Q(title__icontains=term)

        # 4. Total Price / Amount
        try:
            num = float(term)
            if has_field('total_price'): extra_q |= Q(total_price=num)
            if has_field('total_amount'): extra_q |= Q(total_amount=num)
            if has_field('price'): extra_q |= Q(price=num)
        except ValueError:
            pass

        # 5. IS READ (read=true, unread=false)
        if has_field('is_read'):
            true_terms = ['read=true', 'true', 'read', 'is_read=true', 'unread=false']
            false_terms = ['unread=true', 'false', 'unread', 'read=false', 'is_read=false']
            if term in true_terms:
                extra_q |= Q(is_read=True)
            elif term in false_terms:
                extra_q |= Q(is_read=False)

        # 6. Global Choice Fields Matching
        # This fixes searches for display values (e.g., "for sale" mapping to DB value "sale")
        for field in model._meta.get_fields():
            if getattr(field, 'choices', None):
                matched_keys = []
                for db_val, display_val in field.choices:
                    if term in str(display_val).lower():
                        matched_keys.append(db_val)
                if matched_keys:
                    extra_q |= Q(**{f"{field.name}__in": matched_keys})

        if extra_q:
            queryset |= model.objects.filter(extra_q)

        return queryset, use_distinct
