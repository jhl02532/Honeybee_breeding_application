import csv
import datetime
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from .. import export, models, v2_service
from ..auth import get_current_user
from .researcher import get_current_researcher

router = APIRouter(
    prefix="/api/v2",
    tags=["v2 Breeding Records"]
)


def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다")
    return current_user


def _visible_ids(db: Session, user: models.User):
    return v2_service.visible_dataset_ids(db, user.role)


def _farmer_owns_queen(db: Session, user: models.User, queen_id: int) -> bool:
    """농가는 자기 양봉장 봉군에 있었던 여왕만 볼 수 있다."""
    return (db.query(models.ColonyQueen)
            .join(models.Colony, models.Colony.id == models.ColonyQueen.colony_id)
            .join(models.Apiary, models.Apiary.id == models.Colony.apiary_id)
            .filter(models.ColonyQueen.queen_id == queen_id, models.Apiary.owner_id == user.id)
            .first() is not None)


def _queen_brief(q: Optional[models.Queen]):
    if q is None:
        return None
    return {"id": q.id, "tag": q.tag, "line": q.line, "species": q.species, "dataset_id": q.dataset_id}


# ========== 데이터 세트 · 형질 정의 ==========

@router.get("/traits/definitions")
def list_trait_definitions(db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    return [{
        "code": t.code, "name_ko": t.name_ko, "name_en": t.name_en, "unit": t.unit, "scale": t.scale,
        "level": t.level, "category": t.category, "min_value": t.min_value, "max_value": t.max_value,
        "protocol": t.protocol, "legacy_column": t.legacy_column,
    } for t in db.query(models.TraitDefinition).order_by(models.TraitDefinition.category, models.TraitDefinition.code).all()]


@router.get("/traits/observations")
def list_observations(
    dataset: str,
    trait: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    format: str = "json",
    limit: int = 5000,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_researcher)
):
    """조건을 골라 형질 값을 내보낸다(format=csv 면 파일)."""
    ds = v2_service.get_dataset(db, dataset)
    if ds is None or ds.id not in _visible_ids(db, current):
        raise HTTPException(status_code=404, detail="데이터 세트를 찾을 수 없습니다")
    O = models.TraitObservation
    q = (db.query(O, models.Queen.tag, models.Colony.code, models.Sample.code)
         .outerjoin(models.Queen, models.Queen.id == O.queen_id)
         .outerjoin(models.Colony, models.Colony.id == O.colony_id)
         .outerjoin(models.Sample, models.Sample.id == O.sample_id)
         .filter(O.dataset_id == ds.id))
    if trait:
        q = q.filter(O.trait_code.in_(trait.split(",")))
    if date_from:
        q = q.filter(O.date >= date_from)
    if date_to:
        q = q.filter(O.date <= date_to)
    rows = [{"trait_code": o.trait_code, "value": o.value, "date": o.date, "queen_tag": qt,
             "colony_code": cc, "sample_code": sc, "method_note": o.method_note}
            for o, qt, cc, sc in q.order_by(O.trait_code, O.id).limit(min(limit, 200000)).all()]
    if format == "csv":
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=["trait_code", "value", "date", "queen_tag", "colony_code", "sample_code", "method_note"])
        w.writeheader()
        w.writerows(rows)
        return Response(content="﻿" + buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": f"attachment; filename=KBEEBANK_{ds.code}_traits.csv"})
    return rows


# ========== 여왕벌 · 계통 ==========

@router.get("/queens")
def list_queens(
    dataset: str,
    q: Optional[str] = None,
    line: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_researcher)
):
    ds = v2_service.get_dataset(db, dataset)
    if ds is None or ds.id not in _visible_ids(db, current):
        raise HTTPException(status_code=404, detail="데이터 세트를 찾을 수 없습니다")
    base = db.query(models.Queen).filter(models.Queen.dataset_id == ds.id)
    if q:
        base = base.filter(models.Queen.tag.ilike(f"%{q}%"))
    if line:
        base = base.filter(models.Queen.line == line)
    total = base.count()
    queens = base.order_by(models.Queen.tag).offset(skip).limit(min(limit, 500)).all()
    ids = [x.id for x in queens]
    obs_n = dict(db.query(models.TraitObservation.queen_id, func.count(models.TraitObservation.id))
                 .filter(models.TraitObservation.queen_id.in_(ids)).group_by(models.TraitObservation.queen_id).all())
    smp_n = dict(db.query(models.Sample.queen_id, func.count(models.Sample.id))
                 .filter(models.Sample.queen_id.in_(ids)).group_by(models.Sample.queen_id).all())
    lines = [r[0] for r in db.query(models.Queen.line).filter(models.Queen.dataset_id == ds.id).distinct().all() if r[0]]
    return {
        "total": total, "lines": sorted(lines),
        "items": [{**_queen_brief(x), "mother_queen_id": x.mother_queen_id, "external_id": x.external_id,
                   "n_observations": obs_n.get(x.id, 0), "n_samples": smp_n.get(x.id, 0)} for x in queens],
    }


def _queen_or_404(db: Session, current: models.User, queen_id: int) -> models.Queen:
    queen = db.query(models.Queen).get(queen_id)
    if queen is None:
        raise HTTPException(status_code=404, detail="여왕벌을 찾을 수 없습니다")
    if current.role == "farmer":
        if not _farmer_owns_queen(db, current, queen_id):
            raise HTTPException(status_code=403, detail="해당 여왕벌을 조회할 권한이 없습니다")
    elif queen.dataset_id not in _visible_ids(db, current):
        raise HTTPException(status_code=404, detail="여왕벌을 찾을 수 없습니다")
    return queen


def _queen_profile(db: Session, queen: models.Queen) -> dict:
    defs = {t.code: t for t in db.query(models.TraitDefinition).all()}
    obs = (db.query(models.TraitObservation).filter(models.TraitObservation.queen_id == queen.id)
           .order_by(models.TraitObservation.date, models.TraitObservation.trait_code).all())
    samples = db.query(models.Sample).filter(models.Sample.queen_id == queen.id).all()
    matings = db.query(models.Mating).filter(models.Mating.queen_id == queen.id).all()
    colonies = (db.query(models.ColonyQueen, models.Colony)
                .join(models.Colony, models.Colony.id == models.ColonyQueen.colony_id)
                .filter(models.ColonyQueen.queen_id == queen.id).all())
    daughters = db.query(models.Queen).filter(models.Queen.mother_queen_id == queen.id).limit(100).all()
    return {
        "queen": {**_queen_brief(queen), "birth_date": queen.birth_date, "origin": queen.origin,
                  "external_id": queen.external_id},
        "mother": _queen_brief(queen.mother),
        "daughters": [_queen_brief(d) for d in daughters],
        "colonies": [{"colony_id": c.id, "code": c.code, "start_date": l.start_date, "end_date": l.end_date,
                      "change_reason": l.change_reason} for l, c in colonies],
        "matings": [{
            "id": m.id, "method": m.method, "date": m.date, "location": m.location, "est_n_drones": m.est_n_drones,
            "sires": [{"sire_queen": _queen_brief(db.query(models.Queen).get(s.sire_queen_id)) if s.sire_queen_id else None,
                       "share": s.share} for s in m.sires],
        } for m in matings],
        "observations": [{"trait_code": o.trait_code, "name_ko": defs[o.trait_code].name_ko if o.trait_code in defs else o.trait_code,
                          "unit": defs[o.trait_code].unit if o.trait_code in defs else None,
                          "value": o.value, "date": o.date, "sample_id": o.sample_id} for o in obs],
        "samples": [{"id": s.id, "code": s.code, "sample_type": s.sample_type, "n_individuals": s.n_individuals,
                     "collected_date": s.collected_date, "status": s.status} for s in samples],
    }


@router.get("/queens/{queen_id}")
def read_queen(queen_id: int, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    return _queen_profile(db, _queen_or_404(db, current, queen_id))


@router.get("/queens/{queen_id}/pedigree")
def read_pedigree(queen_id: int, depth: int = 4, db: Session = Depends(get_db),
                  current: models.User = Depends(get_current_user)):
    """모계(어미 여왕)와 부계 후보(어미와 교미한 수벌을 낸 여왕)를 depth 대까지 거슬러 올라간 노드·간선"""
    root = _queen_or_404(db, current, queen_id)
    depth = max(1, min(depth, 8))
    nodes, edges, frontier = {root.id: {**_queen_brief(root), "generation": 0}}, [], [root]
    for gen in range(1, depth + 1):
        nxt = []
        for q in frontier:
            for pid, kind in v2_service.queen_parents(db, q):
                edges.append({"child": q.id, "parent": pid, "kind": kind})
                if pid not in nodes:
                    p = db.query(models.Queen).get(pid)
                    nodes[pid] = {**_queen_brief(p), "generation": gen}
                    nxt.append(p)
        frontier = nxt
        if not frontier:
            break
    return {"root": root.id, "nodes": list(nodes.values()), "edges": edges}


@router.get("/colonies/{colony_id}/profile")
def read_colony_profile(colony_id: int, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """봉군의 현재 여왕 프로필(형질·시료)과 여왕 이력"""
    colony = db.query(models.Colony).get(colony_id)
    if colony is None:
        raise HTTPException(status_code=404, detail="봉군을 찾을 수 없습니다")
    apiary = db.query(models.Apiary).get(colony.apiary_id)
    if current.role == "farmer" and (apiary is None or apiary.owner_id != current.id):
        raise HTTPException(status_code=403, detail="해당 봉군을 조회할 권한이 없습니다")
    queen = v2_service.ensure_colony_queen(db, colony)
    db.commit()
    history = (db.query(models.ColonyQueen, models.Queen)
               .join(models.Queen, models.Queen.id == models.ColonyQueen.queen_id)
               .filter(models.ColonyQueen.colony_id == colony.id).order_by(models.ColonyQueen.id).all())
    return {
        "colony": {"id": colony.id, "code": colony.code, "status": colony.status, "apiary": apiary.name if apiary else None},
        "queen_history": [{"queen": _queen_brief(q), "start_date": l.start_date, "end_date": l.end_date,
                           "change_reason": l.change_reason} for l, q in history],
        "current": _queen_profile(db, queen),
    }


# ========== 전체 내보내기 ==========

@router.get("/export/all")
def export_all(db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    """모든 테이블 CSV + 현장 기록 긴 표 + 코드표 zip. 비밀번호 해시는 뺀다."""
    data = export.build_export_zip(db)
    name = f"KBEEBANK_export_{datetime.date.today():%Y%m%d}.zip"
    return Response(content=data, media_type="application/zip",
                    headers={"Content-Disposition": f"attachment; filename={name}"})


# ========== 기존 기록 이전 (관리자) ==========

@router.post("/migrate-legacy")
def migrate_legacy(db: Session = Depends(get_db), current: models.User = Depends(get_current_admin)):
    """v1 기록(queen_tag·mother_colony_id·sample_id·trait_records)을 v2 테이블에 잇는다."""
    return v2_service.migrate_legacy(db)
