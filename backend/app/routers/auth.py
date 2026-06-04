from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, models
from ..auth import create_access_token, verify_password, get_current_user, get_password_hash

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """회원 가입 - 유저 생성 후 JWT 토큰 발급"""
    if user.role == schemas.UserRole.ADMIN:
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


@router.post("/register/farmer", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register_farmer(farmer_data: schemas.FarmerRegister, db: Session = Depends(get_db)):
    """농가 회원 가입 - 유저 생성 + 양봉장 생성 + 초기 벌통 생성 원스톱 트랜잭션"""
    existing = crud.get_user_by_username(db, username=farmer_data.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 아이디입니다")
        
    try:
        # 1. 유저 생성 (role="farmer")
        db_user = models.User(
            username=farmer_data.username,
            hashed_password=get_password_hash(farmer_data.password),
            farm_name=farmer_data.apiary_name,
            role="farmer",
            full_name=farmer_data.full_name,
            phone=farmer_data.phone,
            experience_years=farmer_data.experience_years
        )
        db.add(db_user)
        db.flush() # ID 획득
        
        # 2. 양봉장 생성
        db_apiary = models.Apiary(
            name=farmer_data.apiary_name,
            owner=farmer_data.username,
            location=farmer_data.apiary_address,
            latitude=farmer_data.latitude,
            longitude=farmer_data.longitude,
            owner_id=db_user.id
        )
        db.add(db_apiary)
        db.flush() # ID 획득
        
        # 3. 초기 벌통 생성
        owner_initials = (db_user.username[:3].upper() + "XXX")[:3]
        region_code = crud.get_region_code(db_apiary.location)
        
        for i in range(1, farmer_data.total_colony_count + 1):
            if farmer_data.queen_lines:
                q_line = farmer_data.queen_lines[(i - 1) % len(farmer_data.queen_lines)]
            elif farmer_data.queen_lineage and farmer_data.queen_lineage not in ["", "모름", "선택 안 함", "모름 / 선택 안 함"]:
                q_line = farmer_data.queen_lineage
            else:
                species = farmer_data.queen_species or ""
                if "cerana" in species.lower() or "동양벌" in species or "토종벌" in species:
                    q_line = "기타 일반 재래종"
                else:
                    q_line = "이탈리안"
                
            breed_code = crud.BREED_MAP.get(q_line, "GT")

            
            c_code = f"C-{region_code}-{owner_initials}-26-01-{i:02d}"
            q_tag = f"Q-{breed_code}-{region_code}-26-{owner_initials}-{i:02d}"
            
            db_colony = models.Colony(
                code=c_code,
                apiary_id=db_apiary.id,
                status="Active",
                queen_tag=q_tag
            )
            db.add(db_colony)
            
        db.commit()
        db.refresh(db_user)
        
        token = create_access_token(data={"sub": db_user.id})
        return {"access_token": token, "token_type": "bearer", "user": db_user}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회원 가입 처리 중 서버 오류가 발생했습니다: {str(e)}"
        )



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
