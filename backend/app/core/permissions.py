# app/core/permissions.py
from fastapi import Depends, HTTPException, Request, status

from ..auth_dependencies import get_current_user


async def require_approval(user=Depends(get_current_user)):
    if not user.is_approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not approved")
    return user


async def require_edit_permission(request: Request, user=Depends(get_current_user)):
    if request.method in {"PATCH", "PUT", "DELETE", "POST"} and not user.can_edit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User cannot edit data")
    return user
