import django_filters
from .models import Pet


class PetFilter(django_filters.FilterSet):
    min_age = django_filters.NumberFilter(field_name='age', lookup_expr='gte')
    max_age = django_filters.NumberFilter(field_name='age', lookup_expr='lte')
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')

    class Meta:
        model = Pet
        fields = {
            'pet_type': ['exact'],
            'breed': ['icontains'],
            'gender': ['exact'],
            'status': ['exact'],
            'listing_type': ['exact'],
            'is_vaccinated': ['exact'],
            'is_neutered': ['exact'],
            'location': ['icontains'],
        }
