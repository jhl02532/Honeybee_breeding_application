# backend/scripts/seed_users.py
"""관리자 수동 계정 발급·비밀번호 교체 스크립트.

비밀번호는 코드나 명령행 인자에 적지 않는다. 터미널에서 직접 입력하거나(getpass),
SEED_USER_PASSWORD 환경변수로 넘긴다. --random 을 주면 임의 비밀번호를 만들어 한 번만 출력한다.
운영 DB에 쓰려면 DATABASE_URL 을 Render PostgreSQL 외부 접속 주소로 설정하고 실행한다.

    python scripts/seed_users.py create <ID> <farmer|researcher|admin> <이름> [--species GT]
    python scripts/seed_users.py set-password <ID> [--random]
    python scripts/seed_users.py list
"""
import argparse
import getpass
import os
import secrets
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

MIN_LENGTH = 12


def read_password(random_password=False):
    if random_password:
        password = secrets.token_urlsafe(16)
        print(f"🔑 임의 비밀번호(다시 표시되지 않음): {password}")
        return password
    password = os.getenv("SEED_USER_PASSWORD") or getpass.getpass("새 비밀번호: ")
    if len(password) < MIN_LENGTH:
        sys.exit(f"❌ 비밀번호는 {MIN_LENGTH}자 이상이어야 합니다.")
    if not os.getenv("SEED_USER_PASSWORD") and getpass.getpass("비밀번호 확인: ") != password:
        sys.exit("❌ 비밀번호가 일치하지 않습니다.")
    return password


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


def set_password(username, password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"❌ 없는 ID입니다: {username}")
            return
        user.hashed_password = get_password_hash(password)
        db.commit()
        print(f"✅ 비밀번호 교체 완료 -> ID: {username}")
    except Exception as e:
        db.rollback()
        print(f"🔥 교체 실패: {str(e)}")
    finally:
        db.close()


def list_users():
    db = SessionLocal()
    try:
        for user in db.query(User).order_by(User.id).all():
            print(f"{user.id}\t{user.username}\t{user.role}\t{user.full_name or ''}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="꿀벌 육종 플랫폼 계정 발급·비밀번호 교체")
    sub = parser.add_subparsers(dest="command", required=True)

    p_create = sub.add_parser("create", help="계정 발급")
    p_create.add_argument("username")
    p_create.add_argument("role", choices=["farmer", "researcher", "admin"])
    p_create.add_argument("name")
    p_create.add_argument("--species", default="GT")
    p_create.add_argument("--random", action="store_true", help="임의 비밀번호 생성")

    p_pw = sub.add_parser("set-password", help="비밀번호 교체")
    p_pw.add_argument("username")
    p_pw.add_argument("--random", action="store_true", help="임의 비밀번호 생성")

    sub.add_parser("list", help="계정 목록")

    args = parser.parse_args()
    if args.command == "create":
        create_issued_user(args.username, read_password(args.random), args.role, args.name, args.species)
    elif args.command == "set-password":
        set_password(args.username, read_password(args.random))
    else:
        list_users()
