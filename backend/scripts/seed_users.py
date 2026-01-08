"""Seed script to populate database with initial users."""

import asyncio
from datetime import UTC, datetime

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DATABASE_NAME = "meeting_synthesis"


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password_bytes = bcrypt.hashpw(password=password_bytes, salt=salt)
    return hashed_password_bytes.decode('utf-8')


async def seed_users():
    """Create initial users in the database."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE_NAME]

    now = datetime.now(UTC)

    # Define users to create
    users = [
        {
            "username": "michal",
            "email": "michal@gmail.com",
            "hashed_password": get_password_hash("password"),
            "full_name": "Michal Plaza",
            "role": "admin",
            "manager_id": None,
            "is_approved": True,
            "can_edit": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "username": "manager",
            "email": "manager@example.com",
            "hashed_password": get_password_hash("password"),
            "full_name": "Project Manager",
            "role": "project_manager",
            "manager_id": None,
            "is_approved": True,
            "can_edit": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "username": "developer",
            "email": "developer@example.com",
            "hashed_password": get_password_hash("password"),
            "full_name": "Developer User",
            "role": "developer",
            "manager_id": None,
            "is_approved": True,
            "can_edit": True,
            "created_at": now,
            "updated_at": now,
        },
    ]

    for user_data in users:
        # Check if user already exists
        existing = await db["users"].find_one({"email": user_data["email"]})
        if existing:
            print(f"User {user_data['email']} already exists, skipping...")
            continue

        result = await db["users"].insert_one(user_data)
        print(f"Created user: {user_data['email']} (ID: {result.inserted_id})")

    print("\nSeeding complete!")
    print("\nYou can now login with:")
    print("  Email: michal@gmail.com")
    print("  Password: password")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_users())
