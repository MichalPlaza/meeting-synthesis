import logging
from fastapi import APIRouter, Depends, status, Body, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from slowapi import Limiter
from slowapi.util import get_remote_address

from ...db.mongodb_utils import get_database
from ...schemas.user_schema import (
    Token, UserCreate, UserLogin, UserResponse, RefreshTokenRequest,
    PasswordResetRequest, PasswordResetConfirm, PasswordResetResponse
)
from ...services import user_service, security
from ...services.email_service import send_password_reset_email, is_email_configured
from ...crud import crud_users

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/minute")
async def register_user(
        request: Request,
        user: UserCreate,
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Registering new user: {user.username}")
    return await user_service.register_new_user(database=database, user_data=user)


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
        request: Request,
        form_data: UserLogin = Body(...),
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"User login attempt: {form_data.username_or_email}")
    return await user_service.authenticate_user(database=database, form_data=form_data)


@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(

        request: RefreshTokenRequest, database: AsyncIOMotorDatabase = Depends(get_database)

):
    logger.info("Attempting to refresh access token")

    token_data = security.decode_token(request.refresh_token)

    if not token_data or not token_data.username:
        logger.warning("Invalid refresh token provided")

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Invalid refresh token",

            headers={"WWW-Authenticate": "Bearer"},

        )

    user = await crud_users.get_user_by_username(database, username=token_data.username)

    if not user:
        logger.warning(f"User not found for token refresh: {token_data.username}")

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="User not found",

            headers={"WWW-Authenticate": "Bearer"},

        )

    new_access_token = security.create_access_token(data={"sub": user.username, "email": user.email})

    logger.info(f"Successfully refreshed access token for user: {user.username}")

    return Token(access_token=new_access_token, token_type="bearer")


@router.post("/password-reset/request", response_model=PasswordResetResponse)
@limiter.limit("3/minute")
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    database: AsyncIOMotorDatabase = Depends(get_database)
):
    """Request a password reset token.

    Generates a reset token valid for 1 hour and returns success message.
    For security, always returns success even if email doesn't exist.
    """
    logger.info(f"Password reset requested for email: {reset_request.email}")

    token = await user_service.create_password_reset_token(database, reset_request.email)

    # Always return success for security (don't reveal if email exists)
    if token:
        logger.info(f"Password reset token generated for: {reset_request.email}")

        # Send password reset email
        if is_email_configured():
            email_sent = await send_password_reset_email(reset_request.email, token)
            if email_sent:
                logger.info(f"Password reset email sent to: {reset_request.email}")
            else:
                logger.error(f"Failed to send password reset email to: {reset_request.email}")
        else:
            # Development mode: log the token for testing
            logger.warning("Email not configured. Token for testing:")
            logger.warning(f"Reset token: {token}")

    return PasswordResetResponse(
        message="If the email exists, a password reset link has been sent.",
        success=True
    )


@router.post("/password-reset/confirm", response_model=PasswordResetResponse)
@limiter.limit("5/minute")
async def confirm_password_reset(
    request: Request,
    reset_confirm: PasswordResetConfirm,
    database: AsyncIOMotorDatabase = Depends(get_database)
):
    """Reset password using a valid token.

    Verifies the token and updates the user's password.
    """
    logger.info("Password reset confirmation attempt")

    success = await user_service.reset_password(
        database,
        reset_confirm.token,
        reset_confirm.new_password
    )

    if not success:
        logger.warning("Password reset failed: invalid or expired token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    logger.info("Password reset successful")
    return PasswordResetResponse(
        message="Password has been reset successfully.",
        success=True
    )


@router.get("/password-reset/verify/{token}", response_model=PasswordResetResponse)
async def verify_reset_token(
    token: str,
    database: AsyncIOMotorDatabase = Depends(get_database)
):
    """Verify if a reset token is valid.

    Used by frontend to check token before showing reset form.
    """
    logger.info("Verifying password reset token")

    email = await user_service.verify_password_reset_token(database, token)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    return PasswordResetResponse(
        message="Token is valid",
        success=True
    )
