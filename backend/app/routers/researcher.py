import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/v1/researcher",
    tags=["Researcher Console"]
)

# Dependency guard to check researcher role
def get_current_researcher(current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["researcher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="연구원 또는 관리자 권한이 필요합니다"
        )
    return current_user


@router.get("/stats", response_model=schemas.ResearcherStats)
def read_global_statistics(
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """전국 농가의 통합 빅데이터 통계 연산"""
    total_farmers = db.query(models.User).filter(models.User.role == "farmer").count()
    total_apiaries = db.query(models.Apiary).count()
    total_colonies = db.query(models.Colony).count()
    total_records = db.query(models.TraitRecord).count()

    # Averages
    avg_honey = db.query(func.avg(models.TraitRecord.honey_production)).scalar() or 0.0
    avg_propolis = db.query(func.avg(models.TraitRecord.propolis_production)).scalar() or 0.0
    avg_royal_jelly = db.query(func.avg(models.TraitRecord.royal_jelly_production)).scalar() or 0.0
    avg_survival = db.query(func.avg(models.TraitRecord.overwintering_survival)).scalar() or 0.0

    # Status breakdown
    active_colonies = db.query(models.Colony).filter(models.Colony.status == "Active").count()
    weak_colonies = db.query(models.Colony).filter(models.Colony.status == "Weak").count()
    dead_colonies = db.query(models.Colony).filter(models.Colony.status == "Dead").count()
    queen_types = db.query(models.Colony.queen_tag).distinct().count()

    return {
        "total_farmers": total_farmers,
        "total_apiaries": total_apiaries,
        "total_colonies": total_colonies,
        "total_records": total_records,
        "avg_honey": round(float(avg_honey), 2),
        "avg_propolis": round(float(avg_propolis), 2),
        "avg_royal_jelly": round(float(avg_royal_jelly), 2),
        "avg_survival_rate": round(float(avg_survival), 2),
        "active_colonies": active_colonies,
        "weak_colonies": weak_colonies,
        "dead_colonies": dead_colonies,
        "queen_types": queen_types
    }


@router.get("/farmers")
def read_farmers_registry(
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """전국 양봉 협력 농가 가입 현황 모니터링"""
    farmers = db.query(models.User).filter(models.User.role == "farmer").all()
    res = []
    for f in farmers:
        apiaries_count = len(f.apiaries)
        colonies_count = sum(len(a.colonies) for a in f.apiaries)
        res.append({
            "id": f.id,
            "username": f.username,
            "farm_name": f.farm_name or "미지정",
            "apiaries_count": apiaries_count,
            "colonies_count": colonies_count
        })
    return res


@router.get("/morphological", response_model=List[schemas.MorphologicalRecord])
def read_morphological_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """실험실 형태학적 측정 샘플 전체 조회"""
    return crud.get_morphological_records(db, skip=skip, limit=limit)


@router.post("/morphological", response_model=schemas.MorphologicalRecord, status_code=status.HTTP_201_CREATED)
def create_morphological_record(
    record: schemas.MorphologicalRecordCreate,
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """여왕벌(queen_tag) 기준 연구실 정밀 형태학적 측정 샘플링 기입"""
    # Verify colony exists if provided
    if record.colony_id:
        colony = crud.get_colony(db, colony_id=record.colony_id)
        if not colony:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found")
    return crud.create_morphological_record(db=db, record=record)


@router.delete("/morphological/{record_id}")
def delete_morphological_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    success = crud.delete_morphological_record(db, record_id=record_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return {"message": f"Successfully deleted Morphological Record {record_id}"}


@router.get("/export/csv")
def export_global_csv(
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """전국 농가의 형질 내검 기록 및 형태 측정 기록을 Excel 호환 BOM CSV 패키지로 일괄 추출"""
    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "농가아이디",
        "농장명",
        "봉장명",
        "벌통코드",
        "여왕벌태그",
        "날짜",
        "꿀생산량(kg)",
        "프로폴리스(g)",
        "로얄젤리(g)",
        "온순함",
        "바이러스저항성",
        "응애저항성",
        "분봉률(%)",
        "월동생존율(%)",
        "VSH율(%)",
        "핀테스트청소율(%)",
        "기온(°C)",
        "습도(%)",
        "실험실_큐비탈지수",
        "실험실_혀길이(mm)",
        "실험실_복판색상",
        "실험실_후경길이(mm)",
        "실험실_후경너비(mm)",
        "비고"
    ]
    writer.writerow(headers)

    # Query all trait records joined with colony, apiary, and owner user
    records = db.query(models.TraitRecord).join(models.Colony).join(models.Apiary).join(models.User).all()

    for r in records:
        colony = r.colony
        apiary = colony.apiary
        user = apiary.owner_user

        # Fetch latest morphological sample matching the queen_tag of this colony, if any
        morph = db.query(models.MorphologicalRecord).filter(
            models.MorphologicalRecord.queen_tag == colony.queen_tag
        ).order_by(models.MorphologicalRecord.date.desc()).first()

        writer.writerow([
            user.username,
            user.farm_name or "미지정",
            apiary.name,
            colony.code,
            colony.queen_tag,
            r.date,
            r.honey_production,
            r.propolis_production,
            r.royal_jelly_production,
            r.temperament,
            r.virus_resistance,
            r.mite_resistance,
            r.swarming_rate,
            r.overwintering_survival,
            r.vsh_rate,
            r.hygienic_rate,
            r.temperature if r.temperature is not None else "",
            r.humidity if r.humidity is not None else "",
            morph.cubital_index if morph else "",
            morph.proboscis_length if morph else "",
            morph.tergite_color if morph else "",
            morph.basitarsus_length if morph else "",
            morph.basitarsus_width if morph else "",
            r.notes or ""
        ])

    csv_data = "\ufeff" + output.getvalue()
    return Response(
        content=csv_data.encode("utf-8"),
        media_type="text/csv;charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=MelittaBreed_Researcher_MasterData.csv"
        }
    )
