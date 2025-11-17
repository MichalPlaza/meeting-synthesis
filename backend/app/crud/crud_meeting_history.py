from datetime import datetime

from ..models.meeting_history import serialize_value


async def save_changes_history(db, meeting_id: str, old_doc: dict, update_fields: dict, user):
    history_entries = []

    for field, new_value in update_fields.items():
        parts = field.split(".")
        old_value = old_doc

        for p in parts:
            if old_value is None:
                break
            old_value = old_value.get(p, None)

        entry = {
            "meeting_id": meeting_id,
            "field": field,
            "old_value": serialize_value(old_value),
            "new_value": serialize_value(new_value),
            "user_id": user.id,
            "username": user.username,
            "changed_at": datetime.utcnow(),
        }

        history_entries.append(entry)

    if history_entries:
        await db["meeting_history"].insert_many(history_entries)
