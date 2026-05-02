from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pets", "0004_pet_latitude_pet_longitude"),
    ]

    operations = [
        migrations.AddField(
            model_name="pet",
            name="birth_date",
            field=models.DateField(
                blank=True,
                help_text="If set, vaccination due dates use this; otherwise age (months) is used to estimate.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="healthrecord",
            name="reminder_sent",
            field=models.BooleanField(
                default=False,
                help_text="Set after a due-date notification is sent; cleared when next_due_date changes.",
            ),
        ),
    ]
