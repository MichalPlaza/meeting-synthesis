# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer 
from motor.motor_asyncio import AsyncIOMotorDatabase

from .db.mongodb_utils import get_database 
from .services import security 
from .crud import crud_users 
from .models.user import User 


# Declare OAuth2 security schema with Bearer token
# TokenUrl="/auth/login" specifies where the client can get the token (login endpoint)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    db: AsyncIOMotorDatabase = Depends(get_database), 
    token: str = Depends(oauth2_scheme) 
) -> User: 
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = security.decode_access_token(token) 

    if token_data is None or token_data.username is None: 
        raise credentials_exception

    user = await crud_users.get_user_by_username(db, username=token_data.username) 

    if user is None:
        raise credentials_exception

    return user
