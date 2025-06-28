from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_users
from ..schemas.user_schema import Token, UserCreate, UserLogin, UserResponse
from ..services.security import create_access_token, create_refresh_token, verify_password


async def register_new_user(
    db: AsyncIOMotorDatabase, user_data: UserCreate
) -> UserResponse:
    if await crud_users.get_user_by_email(db, email=user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Użytkownik o tym adresie email już istnieje.",
        )
    if await crud_users.get_user_by_username(db, username=user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Użytkownik o tej nazwie użytkownika już istnieje.",
        )

    created_user = await crud_users.create_user(db, user_data)

    return UserResponse(
        id=created_user.id,
        username=created_user.username,
        email=created_user.email,
        full_name=created_user.full_name,
        created_at=created_user.created_at,
        updated_at=created_user.updated_at,
    )


async def authenticate_user(db: AsyncIOMotorDatabase, form_data: UserLogin) -> Token:
    user = await crud_users.get_user_by_email(
        db, email=form_data.username_or_email
    )
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowa nazwa użytkownika, email lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {"sub": user.username, "email": user.email}
    access_token = create_access_token(data=token_data)
    
    refresh_token = None
    if form_data.remember_me:
        refresh_token = create_refresh_token(data=token_data)

    return Token(
        access_token=access_token, 
        refresh_token=refresh_token, 
        token_type="bearer"
    )