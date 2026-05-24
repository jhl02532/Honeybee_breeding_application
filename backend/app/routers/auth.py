from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, models
from ..auth import create_access_token, verify_password, get_current_user

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """회원 가입 - 유저 생성 후 JWT 토큰 발급"""
    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="관리자 역할로는 가입할 수 없습니다."
        )
    existing = crud.get_user_by_username(db, username=user.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 아이디입니다")
    db_user = crud.create_user(db=db, user=user)
    token = create_access_token(data={"sub": db_user.id})
    return {"access_token": token, "token_type": "bearer", "user": db_user}



@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """로그인 - JWT 토큰 발급 (OAuth2 form)"""
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다")
    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login/json", response_model=schemas.Token)
def login_json(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    """로그인 - JWT 토큰 발급 (JSON body, for frontend convenience)"""
    user = crud.get_user_by_username(db, username=creds.username)
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다")
    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    """현재 로그인한 사용자 정보"""
    return current_user
