
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from .db.mongodb_utils import get_database
from .services import security
from .crud import crud_users
from .models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
logger = logging.getLogger(__name__)


async def get_current_user(
        database: AsyncIOMotorDatabase = Depends(get_database),
        token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data = security.decode_token(token)

    if token_data is None or token_data.username is None:
        logger.warning("Token data is invalid or username is missing.")
        raise credentials_exception

    user = await crud_users.get_user_by_username(database, username=token_data.username)

    if user is None:
        logger.warning(f"User {token_data.username} not found in database.")
        raise credentials_exception

    logger.info(f"User {user.username} successfully authenticated.")
    return user

