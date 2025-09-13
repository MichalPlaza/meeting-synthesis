from fastapi import APIRouter, Depends, status, Body, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db.mongodb_utils import get_database
from ...schemas.user_schema import Token, UserCreate, UserLogin, UserResponse, RefreshTokenRequest
from ...services import user_service, security
from ...crud import crud_users

router = APIRouter()


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(
    user: UserCreate, database: AsyncIOMotorDatabase = Depends(get_database)
):
    return await user_service.register_new_user(database=database, user_data=user)


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: UserLogin = Body(...), database: AsyncIOMotorDatabase = Depends(get_database)
):
    return await user_service.authenticate_user(database=database, form_data=form_data)


@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(
    request: RefreshTokenRequest, database: AsyncIOMotorDatabase = Depends(get_database)
):
    token_data = security.decode_token(request.refresh_token)
    if not token_data or not token_data.username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await crud_users.get_user_by_username(database, username=token_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    new_access_token = security.create_access_token(data={"sub": user.username, "email": user.email})
    
    return Token(access_token=new_access_token, token_type="bearer")