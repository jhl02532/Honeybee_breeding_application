"""
MelittaBreed Authentication Module
- JWT access token creation & verification
- bcrypt password hashing & verification (using bcrypt directly, no passlib)
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .database import get_db
from . import models

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    # 운영 DB(PostgreSQL)에서는 반드시 JWT_SECRET_KEY 를 설정해야 한다.
    # 로컬 SQLite 개발 환경에서만 프로세스마다 임의 키를 만든다(재시작하면 토큰 무효).
    if os.getenv("DATABASE_URL", "sqlite").startswith("sqlite"):
        import secrets
        SECRET_KEY = secrets.token_urlsafe(48)
    else:
        raise RuntimeError("JWT_SECRET_KEY 환경변수가 설정되지 않았습니다.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# --- Password hashing (direct bcrypt, bypassing passlib compatibility issues) ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

# --- JWT token ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


STAFF_ROLES = ("researcher", "admin")


def require_staff(user: models.User) -> None:
    """2027 시범은 연구자가 모두 기록한다. 농가 계정으로는 로그인하지 않는다."""
    if user.role not in STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="농가 계정은 사용하지 않습니다. 연구실에 문의하세요")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """Decode JWT and return the User ORM instance, or raise 401."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 유효하지 않습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    require_staff(user)
    return user
