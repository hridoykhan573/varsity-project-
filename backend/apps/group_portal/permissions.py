"""
Mapping of Django permission codenames → button metadata for the group portal.
Add or remove entries here to control which actions are visible.
"""

# Each entry: codename → {label, icon (FontAwesome class), color_class, admin_url_name}
PERMISSION_BUTTONS = {
    # ── Users ──────────────────────────────────────────────────────
    'view_customuser': {
        'label': 'View Users',
        'icon': 'fa-users',
        'color': 'btn-view',
        'admin_url': '/admin/accounts/customuser/',
        'category': 'Users',
    },
    'add_customuser': {
        'label': 'Add User',
        'icon': 'fa-user-plus',
        'color': 'btn-add',
        'admin_url': '/admin/accounts/customuser/add/',
        'category': 'Users',
    },
    'change_customuser': {
        'label': 'Edit Users',
        'icon': 'fa-user-edit',
        'color': 'btn-change',
        'admin_url': '/admin/accounts/customuser/',
        'category': 'Users',
    },

    # ── Pets ───────────────────────────────────────────────────────
    'view_pet': {
        'label': 'View Pets',
        'icon': 'fa-paw',
        'color': 'btn-view',
        'admin_url': '/admin/pets/pet/',
        'category': 'Pets',
    },
    'add_pet': {
        'label': 'Add Pet',
        'icon': 'fa-plus-circle',
        'color': 'btn-add',
        'admin_url': '/admin/pets/pet/add/',
        'category': 'Pets',
    },
    'change_pet': {
        'label': 'Edit Pets',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/pets/pet/',
        'category': 'Pets',
    },

    # ── Shelters ───────────────────────────────────────────────────
    'view_shelter': {
        'label': 'View Shelters',
        'icon': 'fa-home',
        'color': 'btn-view',
        'admin_url': '/admin/shelters/shelter/',
        'category': 'Shelters',
    },
    'add_shelter': {
        'label': 'Add Shelter',
        'icon': 'fa-plus-circle',
        'color': 'btn-add',
        'admin_url': '/admin/shelters/shelter/add/',
        'category': 'Shelters',
    },
    'change_shelter': {
        'label': 'Edit Shelters',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/shelters/shelter/',
        'category': 'Shelters',
    },

    # ── Bookings ───────────────────────────────────────────────────
    'view_booking': {
        'label': 'View Bookings',
        'icon': 'fa-calendar-check',
        'color': 'btn-view',
        'admin_url': '/admin/bookings/booking/',
        'category': 'Bookings',
    },
    'add_booking': {
        'label': 'Add Booking',
        'icon': 'fa-calendar-plus',
        'color': 'btn-add',
        'admin_url': '/admin/bookings/booking/add/',
        'category': 'Bookings',
    },
    'change_booking': {
        'label': 'Edit Bookings',
        'icon': 'fa-calendar-alt',
        'color': 'btn-change',
        'admin_url': '/admin/bookings/booking/',
        'category': 'Bookings',
    },

    # ── Adoptions ──────────────────────────────────────────────────
    'view_adoptionrequest': {
        'label': 'View Adoptions',
        'icon': 'fa-hand-holding-heart',
        'color': 'btn-view',
        'admin_url': '/admin/adoptions/adoptionrequest/',
        'category': 'Adoptions',
    },
    'add_adoptionrequest': {
        'label': 'Add Adoption',
        'icon': 'fa-heart',
        'color': 'btn-add',
        'admin_url': '/admin/adoptions/adoptionrequest/add/',
        'category': 'Adoptions',
    },
    'change_adoptionrequest': {
        'label': 'Edit Adoptions',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/adoptions/adoptionrequest/',
        'category': 'Adoptions',
    },

    # ── Reviews ────────────────────────────────────────────────────
    'view_review': {
        'label': 'View Reviews',
        'icon': 'fa-star',
        'color': 'btn-view',
        'admin_url': '/admin/reviews/review/',
        'category': 'Reviews',
    },
    'change_review': {
        'label': 'Edit Reviews',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/reviews/review/',
        'category': 'Reviews',
    },

    # ── Complaints ─────────────────────────────────────────────────
    'view_complaint': {
        'label': 'View Complaints',
        'icon': 'fa-comment-dots',
        'color': 'btn-view',
        'admin_url': '/admin/complaints/complaint/',
        'category': 'Complaints',
    },
    'change_complaint': {
        'label': 'Manage Complaints',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/complaints/complaint/',
        'category': 'Complaints',
    },

    # ── Products ───────────────────────────────────────────────────
    'view_product': {
        'label': 'View Products',
        'icon': 'fa-shopping-basket',
        'color': 'btn-view',
        'admin_url': '/admin/products/product/',
        'category': 'Products',
    },
    'add_product': {
        'label': 'Add Product',
        'icon': 'fa-plus-circle',
        'color': 'btn-add',
        'admin_url': '/admin/products/product/add/',
        'category': 'Products',
    },
    'change_product': {
        'label': 'Edit Products',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/products/product/',
        'category': 'Products',
    },

    # ── Payments ───────────────────────────────────────────────────
    'view_payment': {
        'label': 'View Payments',
        'icon': 'fa-credit-card',
        'color': 'btn-view',
        'admin_url': '/admin/payments/payment/',
        'category': 'Payments',
    },
    'change_payment': {
        'label': 'Edit Payments',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/payments/payment/',
        'category': 'Payments',
    },

    # ── Notifications ──────────────────────────────────────────────
    'view_notification': {
        'label': 'View Notifications',
        'icon': 'fa-bell',
        'color': 'btn-view',
        'admin_url': '/admin/notifications/notification/',
        'category': 'Notifications',
    },
    'add_notification': {
        'label': 'Add Notification',
        'icon': 'fa-bell',
        'color': 'btn-add',
        'admin_url': '/admin/notifications/notification/add/',
        'category': 'Notifications',
    },

    # ── Health Records ─────────────────────────────────────────────
    'view_healthrecord': {
        'label': 'View Health Records',
        'icon': 'fa-notes-medical',
        'color': 'btn-view',
        'admin_url': '/admin/pets/healthrecord/',
        'category': 'Health',
    },
    'add_healthrecord': {
        'label': 'Add Health Record',
        'icon': 'fa-plus-circle',
        'color': 'btn-add',
        'admin_url': '/admin/pets/healthrecord/add/',
        'category': 'Health',
    },
    'change_healthrecord': {
        'label': 'Edit Health Records',
        'icon': 'fa-edit',
        'color': 'btn-change',
        'admin_url': '/admin/pets/healthrecord/',
        'category': 'Health',
    },
}

# Category display order
CATEGORY_ORDER = [
    'Users', 'Pets', 'Shelters', 'Bookings',
    'Adoptions', 'Reviews', 'Complaints',
    'Products', 'Payments', 'Notifications', 'Health',
]
