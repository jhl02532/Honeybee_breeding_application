# backend/scripts/seed_users.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

def create_issued_user(username, password, role, name, species="GT"):
    db = SessionLocal()
    try:
        # 중복 ID 체크
        exists = db.query(User).filter(User.username == username).first()
        if exists:
            print(f"❌ 이미 존재하는 ID입니다: {username}")
            return
            
        hashed = get_password_hash(password)
        new_user = User(
            username=username,
            hashed_password=hashed,
            role=role, # 'admin', 'researcher', 'farmer'
            full_name=name,
            queen_species=species, # 기본값 세팅
            farm_name="실험실 소속" if role in ["admin", "researcher"] else "인천 협력농가"
        )
        db.add(new_user)
        db.commit()
        print(f"✅ 성공! 발급 완료 -> ID: {username} | 이름: {name} | 권한: {role}")
    except Exception as e:
        db.rollback()
        print(f"🔥 발급 실패: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    # 터미널에서 'python seed_users.py'로 직접 구동
    print("🌱 꿀벌 육종 플랫폼 사용자 발급 시작...")
    create_issued_user("incheon_farmer01", "melitta2026!", "farmer", "김양봉 농민", "GT")
    create_issued_user("incheon_admin", "labmaster77!", "admin", "실험실장", "GT")
    print("🌱 시딩 완료.")
