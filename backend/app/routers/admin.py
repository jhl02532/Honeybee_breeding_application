from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["SaaS Administration"]
)

# Dependency guard to enforce role == admin
def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="최고 관리자 권한이 필요합니다."
        )
    return current_user


@router.get("/stats")
def read_global_system_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """시스템 전체 메트릭 요약 정보"""
    total_users = db.query(models.User).count()
    farmers_count = db.query(models.User).filter(models.User.role == "farmer").count()
    researchers_count = db.query(models.User).filter(models.User.role == "researcher").count()
    admins_count = db.query(models.User).filter(models.User.role == "admin").count()

    total_apiaries = db.query(models.Apiary).count()
    total_colonies = db.query(models.Colony).count()
    total_trait_records = db.query(models.TraitRecord).count()
    total_morph_records = db.query(models.MorphologicalRecord).count()

    # Colony status breakdown
    active_colonies = db.query(models.Colony).filter(models.Colony.status == "Active").count()
    weak_colonies = db.query(models.Colony).filter(models.Colony.status == "Weak").count()
    dead_colonies = db.query(models.Colony).filter(models.Colony.status == "Dead").count()

    # Averages
    avg_honey = db.query(func.avg(models.TraitRecord.honey_production)).scalar() or 0.0
    avg_propolis = db.query(func.avg(models.TraitRecord.propolis_production)).scalar() or 0.0
    avg_royal_jelly = db.query(func.avg(models.TraitRecord.royal_jelly_production)).scalar() or 0.0
    avg_survival = db.query(func.avg(models.TraitRecord.overwintering_survival)).scalar() or 0.0

    return {
        "total_users": total_users,
        "farmers_count": farmers_count,
        "researchers_count": researchers_count,
        "admins_count": admins_count,
        "total_apiaries": total_apiaries,
        "total_colonies": total_colonies,
        "total_trait_records": total_trait_records,
        "total_morph_records": total_morph_records,
        "active_colonies": active_colonies,
        "weak_colonies": weak_colonies,
        "dead_colonies": dead_colonies,
        "avg_honey": round(float(avg_honey), 2),
        "avg_propolis": round(float(avg_propolis), 2),
        "avg_royal_jelly": round(float(avg_royal_jelly), 2),
        "avg_survival_rate": round(float(avg_survival), 2),
    }


@router.get("/users")
def list_system_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """전체 회원 상세 정보 및 연동 데이터 통계 조회"""
    users = db.query(models.User).all()
    res = []
    for u in users:
        apiaries_count = len(u.apiaries)
        colonies_count = sum(len(a.colonies) for a in u.apiaries)
        res.append({
            "id": u.id,
            "username": u.username,
            "farm_name": u.farm_name or "미지정",
            "role": u.role,
            "apiaries_count": apiaries_count,
            "colonies_count": colonies_count
        })
    return res


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """회원 권한 격상/격하 (farmer <-> researcher <-> admin)"""
    if role not in ["farmer", "researcher", "admin"]:
        raise HTTPException(status_code=400, detail="올바르지 않은 역할 정보입니다.")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    # Prevent self-demotion or modifying the current active admin's role
    if user.id == admin.id and role != "admin":
        raise HTTPException(status_code=400, detail="자기 자신의 관리자 권한을 해제할 수 없습니다.")
        
    user.role = role
    db.commit()
    db.refresh(user)
    return {"message": "역할이 성공적으로 변경되었습니다.", "user_id": user.id, "role": user.role}


@router.delete("/users/{user_id}")
def delete_system_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """회원 영구 강제 탈퇴 및 종속된 다중 테넌트 데이터 연쇄 삭제"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="자기 자신을 강제 탈퇴할 수 없습니다.")

    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} and all related multi-tenant records successfully purged."}


@router.get("/apiaries")
def list_all_apiaries(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """전체 등록된 양봉장 데이터 통합 조회"""
    apiaries = db.query(models.Apiary).all()
    res = []
    for a in apiaries:
        owner_name = a.owner_user.username if a.owner_user else (a.owner or "Unknown")
        res.append({
            "id": a.id,
            "name": a.name,
            "owner": owner_name,
            "location": a.location,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "owner_id": a.owner_id
        })
    return res


@router.delete("/apiaries/{apiary_id}")
def delete_system_apiary(
    apiary_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """양봉장 강제 삭제"""
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="양봉장을 찾을 수 없습니다.")
    db.delete(apiary)
    db.commit()
    return {"message": f"Apiary {apiary_id} successfully deleted."}


@router.get("/colonies")
def list_all_colonies(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """전체 등록된 벌통/봉군 데이터 통합 조회"""
    colonies = db.query(models.Colony).all()
    res = []
    for c in colonies:
        apiary_name = c.apiary.name if c.apiary else "Unknown"
        owner_name = c.apiary.owner_user.username if c.apiary and c.apiary.owner_user else "Unknown"
        res.append({
            "id": c.id,
            "code": c.code,
            "apiary_name": apiary_name,
            "owner": owner_name,
            "status": c.status,
            "queen_tag": c.queen_tag,
            "mother_colony_id": c.mother_colony_id
        })
    return res


@router.delete("/colonies/{colony_id}")
def delete_system_colony(
    colony_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """벌통/봉군 강제 삭제"""
    colony = db.query(models.Colony).filter(models.Colony.id == colony_id).first()
    if not colony:
        raise HTTPException(status_code=404, detail="벌통을 찾을 수 없습니다.")
    db.delete(colony)
    db.commit()
    return {"message": f"Colony {colony_id} successfully deleted."}


@router.get("/traits")
def list_all_traits(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """전체 내검 행동 형질 기록 데이터 통합 조회"""
    records = db.query(models.TraitRecord).all()
    res = []
    for r in records:
        colony_code = r.colony.code if r.colony else "Unknown"
        owner_name = r.colony.apiary.owner_user.username if r.colony and r.colony.apiary and r.colony.apiary.owner_user else "Unknown"
        res.append({
            "id": r.id,
            "colony_code": colony_code,
            "owner": owner_name,
            "date": r.date,
            "honey_production": r.honey_production,
            "propolis_production": r.propolis_production,
            "royal_jelly_production": r.royal_jelly_production,
            "temperament": r.temperament,
            "virus_resistance": r.virus_resistance,
            "mite_resistance": r.mite_resistance,
            "swarming_rate": r.swarming_rate,
            "overwintering_survival": r.overwintering_survival,
            "vsh_rate": r.vsh_rate,
            "hygienic_rate": r.hygienic_rate,
            "notes": r.notes
        })
    return res


@router.delete("/traits/{record_id}")
def delete_system_trait_record(
    record_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """내검 행동 형질 기록 강제 삭제"""
    record = db.query(models.TraitRecord).filter(models.TraitRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="형질 기록을 찾을 수 없습니다.")
    db.delete(record)
    db.commit()
    return {"message": f"Trait Record {record_id} successfully deleted."}


@router.get("/morphological")
def list_all_morphological_records(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """전체 연구실 형태 측정 데이터 통합 조회"""
    records = db.query(models.MorphologicalRecord).all()
    res = []
    for r in records:
        colony_code = r.colony.code if r.colony else "Unknown"
        res.append({
            "id": r.id,
            "queen_tag": r.queen_tag,
            "colony_code": colony_code,
            "date": r.date,
            "cubital_index": r.cubital_index,
            "proboscis_length": r.proboscis_length,
            "tergite_color": r.tergite_color,
            "basitarsus_length": r.basitarsus_length,
            "basitarsus_width": r.basitarsus_width,
            "researcher_notes": r.researcher_notes
        })
    return res


@router.delete("/morphological/{record_id}")
def delete_system_morphological_record(
    record_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """형태 측정 기록 강제 삭제"""
    record = db.query(models.MorphologicalRecord).filter(models.MorphologicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="형태 측정 기록을 찾을 수 없습니다.")
    db.delete(record)
    db.commit()
    return {"message": f"Morphological Record {record_id} successfully deleted."}
