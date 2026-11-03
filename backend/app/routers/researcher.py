from fastapi import Depends, HTTPException, status

from .. import models
from ..auth import get_current_user


# Dependency guard to check researcher role
def get_current_researcher(current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["researcher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="연구원 또는 관리자 권한이 필요합니다"
        )
    return current_user
