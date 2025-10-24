
import logging
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
import bcrypt

from ..core.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY, REFRESH_TOKEN_EXPIRE_DAYS
from ..schemas.user_schema import TokenData

logger = logging.getLogger(__name__)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    logger.debug("Verifying password.")
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    logger.debug("Hashing password.")
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password_bytes = bcrypt.hashpw(password=password_bytes, salt=salt)
    return hashed_password_bytes.decode('utf-8')


def create_token(data: dict, expires_delta: timedelta) -> str:
    logger.debug("Creating token.")
    to_encode = data.copy()
    expire = datetime.now(UTC) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict) -> str:
    logger.debug("Creating access token.")
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_token(data, expires_delta)


def create_refresh_token(data: dict) -> str:
    logger.debug("Creating refresh token.")
    expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return create_token(data, expires_delta)


def decode_token(token: str) -> TokenData | None:
    logger.debug("Decoding token.")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.warning("Token does not contain a username (sub).")
            return None
        logger.debug(f"Token decoded for user: {username}")
        return TokenData(username=username)
    except JWTError:
        logger.warning("Invalid token or JWTError during decoding.")
        return None