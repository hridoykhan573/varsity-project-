"""
Vaccination roadmap: due dates from estimated birth, not from "sync day + offset".
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import List, Tuple

from .models import Pet

Row = Tuple[str, date, date, str]  # title, record_date, next_due_date, notes


def estimated_birth_date(pet: Pet, today: date) -> date:
    if getattr(pet, "birth_date", None):
        return pet.birth_date
    # Approximate from age in whole months (Pet.age)
    return today - timedelta(days=int(round(pet.age * 30.437)))


def is_puppy_route(pet: Pet) -> bool:
    age = pet.age
    pt = pet.pet_type
    if pt in ("dog", "cat"):
        return age <= 4
    if pt == "rabbit":
        return age <= 3
    if pt == "bird":
        return age <= 2
    return False


def build_vaccination_schedule(pet: Pet, today: date | None = None) -> List[Row]:
    """
    Returns rows: (title, date_logged, next_due_date, notes).
    """
    today = today or date.today()
    birth = estimated_birth_date(pet, today)
    rows: List[Row] = []
    pt = pet.pet_type

    if pt == "dog":
        if is_puppy_route(pet):
            rows.extend(
                [
                    ("DHPP 1st Dose", today, birth + timedelta(days=49), "6-8 weeks vaccination"),
                    ("DHPP 2nd Dose", today, birth + timedelta(days=77), "10-12 weeks vaccination"),
                    ("DHPP 3rd Dose + Rabies", today, birth + timedelta(days=98), "12-16 weeks vaccination"),
                ]
            )
            rows.append(
                ("DHPP & Rabies Booster", today, birth + timedelta(days=365), "Annual booster"),
            )
        else:
            rows.append(
                ("DHPP & Rabies Booster", today, today + timedelta(days=365), "Annual booster"),
            )

    elif pt == "cat":
        if is_puppy_route(pet):
            rows.extend(
                [
                    ("FVRCP 1st Dose", today, birth + timedelta(days=49), "6-8 weeks vaccination"),
                    ("FVRCP 2nd Dose", today, birth + timedelta(days=77), "10-12 weeks vaccination"),
                    ("FVRCP 3rd Dose + Rabies", today, birth + timedelta(days=98), "12-16 weeks vaccination"),
                ]
            )
            rows.append(
                ("FVRCP & Rabies Booster", today, birth + timedelta(days=365), "Annual booster"),
            )
        else:
            rows.append(
                ("FVRCP & Rabies Booster", today, today + timedelta(days=365), "Annual booster"),
            )

    elif pt == "rabbit":
        if is_puppy_route(pet):
            rows.extend(
                [
                    ("Myxomatosis", today, birth + timedelta(days=42), "5-7 weeks vaccination"),
                    ("RHD1 + RHD2", today, birth + timedelta(days=49), "7-10 weeks vaccination"),
                ]
            )
            rows.append(
                ("Annual Booster (Myxo+RHD)", today, birth + timedelta(days=365), "Annual booster"),
            )
        else:
            rows.append(
                ("Annual Booster (Myxo+RHD)", today, today + timedelta(days=365), "Annual booster"),
            )

    elif pt == "bird":
        if is_puppy_route(pet):
            rows.extend(
                [
                    ("Polyomavirus", today, birth + timedelta(days=28), "3-4 weeks vaccination"),
                    ("Pacheco's Disease", today, birth + timedelta(days=49), "6-8 weeks vaccination"),
                ]
            )
            rows.append(
                ("Polyomavirus Booster", today, birth + timedelta(days=365), "Annual booster"),
            )
        else:
            rows.append(
                ("Polyomavirus Booster", today, today + timedelta(days=365), "Annual booster"),
            )

    return rows
