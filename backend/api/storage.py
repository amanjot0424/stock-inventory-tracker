import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = os.path.join(BASE_DIR, 'data')

USERS_FILE = os.path.join(DATA_DIR, 'users.json')
RECORDS_FILE = os.path.join(DATA_DIR, 'records.json')


def _read_json(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def _write_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


# --- User Helpers ---
def get_all_users():
    return _read_json(USERS_FILE)


def find_user_by_credentials(username, password):
    users = get_all_users()
    for user in users:
        if user.get('username') == username and user.get('password') == password:
            return {
                "id": user['id'],
                "username": user['username'],
                "role": user['role'],
                "name": user.get('name', '')
            }
    return None


def get_user_by_id(user_id):
    users = get_all_users()
    for user in users:
        if user.get('id') == user_id:
            return user
    return None


# --- Record CRUD Helpers ---
def get_all_records():
    return _read_json(RECORDS_FILE)


def get_record_by_id(record_id):
    records = get_all_records()
    for record in records:
        if record.get('id') == record_id:
            return record
    return None


def create_record(data, user_id=None):
    records = get_all_records()
    existing_ids = [r["id"] for r in records if isinstance(r.get("id"), int)]
    
    # Simple integer auto-increment: 1, 2, 3...
    new_id = (max(existing_ids) + 1) if existing_ids else 1

    new_record = {
        "id": new_id,
        "name": str(data.get("name", "")).strip(),
        "category": str(data.get("category", "Electronics")).strip(),
        "quantity": int(data.get("quantity", 0)),
        "unit_price": float(data.get("unit_price", 0.0)),
        "description": str(data.get("description", "")).strip(),
        "status": str(data.get("status", "In Stock")).strip(),
        "user_id": user_id
    }

    records.append(new_record)
    _write_json(RECORDS_FILE, records)
    return new_record


def update_record(pk, data):
    records = get_all_records()
    for item in records:
        if str(item.get("id")) == str(pk):
            item["name"] = str(data.get("name", item.get("name"))).strip()
            item["category"] = str(data.get("category", item.get("category"))).strip()
            item["quantity"] = int(data.get("quantity", item.get("quantity", 0)))
            item["unit_price"] = float(data.get("unit_price", item.get("unit_price", 0.0)))
            item["description"] = str(data.get("description", item.get("description", ""))).strip()
            item["status"] = str(data.get("status", item.get("status", "In Stock"))).strip()
            _write_json(RECORDS_FILE, records)
            return item
    return None


def delete_record(record_id):
    records = get_all_records()
    new_records = [r for r in records if r.get('id') != record_id]
    if len(new_records) == len(records):
        return False
    _write_json(RECORDS_FILE, new_records)
    return True

def create_user(username, password, name, role="User"):
    users = get_all_users()
    # Check if username already exists
    if any(u.get("username").lower() == username.lower() for u in users):
        return None, "Username already exists."

    existing_ids = [u["id"] for u in users if isinstance(u.get("id"), int)]
    new_id = (max(existing_ids) + 1) if existing_ids else 1

    new_user = {
        "id": new_id,
        "username": username.strip(),
        "password": password,  # Plain text as per local assignment mock setup
        "role": role,
        "name": name.strip() or username.strip()
    }
    users.append(new_user)
    _write_json(USERS_FILE, users)
    return {
        "id": new_user["id"],
        "username": new_user["username"],
        "role": new_user["role"],
        "name": new_user["name"]
    }, None