import csv
import io
import math
import statistics
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, v2_service
from ..auth import get_current_user
from .researcher import get_current_researcher

router = APIRouter(
    prefix="/api/v2",
    tags=["v2 Trait-Genome Link"]
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

@router.get("/datasets")
def list_datasets(db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    ids = _visible_ids(db, current)
    out = []
    for d in db.query(models.Dataset).filter(models.Dataset.id.in_(ids)).order_by(models.Dataset.id).all():
        out.append({
            "id": d.id, "code": d.code, "name": d.name, "kind": d.kind, "visible_to": d.visible_to,
            "citation": d.citation, "doi": d.doi, "license": d.license, "notes": d.notes,
            "n_queens": db.query(models.Queen).filter(models.Queen.dataset_id == d.id).count(),
            "n_samples": db.query(models.Sample).filter(models.Sample.dataset_id == d.id).count(),
            "n_observations": db.query(models.TraitObservation).filter(models.TraitObservation.dataset_id == d.id).count(),
            "n_breeding_values": db.query(models.BreedingValue).filter(models.BreedingValue.dataset_id == d.id).count(),
        })
    return out


@router.get("/traits/definitions")
def list_trait_definitions(db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    return [{
        "code": t.code, "name_ko": t.name_ko, "name_en": t.name_en, "unit": t.unit, "scale": t.scale,
        "level": t.level, "category": t.category, "min_value": t.min_value, "max_value": t.max_value,
        "protocol": t.protocol, "legacy_column": t.legacy_column,
    } for t in db.query(models.TraitDefinition).order_by(models.TraitDefinition.category, models.TraitDefinition.code).all()]


@router.get("/traits/summary")
def trait_summary(dataset: str, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    """데이터 세트의 형질별 건수·평균·표준편차·범위"""
    ds = v2_service.get_dataset(db, dataset)
    if ds is None or ds.id not in _visible_ids(db, current):
        raise HTTPException(status_code=404, detail="데이터 세트를 찾을 수 없습니다")
    O = models.TraitObservation
    rows = (db.query(O.trait_code, func.count(O.id), func.avg(O.value), func.avg(O.value * O.value),
                     func.min(O.value), func.max(O.value))
            .filter(O.dataset_id == ds.id).group_by(O.trait_code).all())
    defs = {t.code: t for t in db.query(models.TraitDefinition).all()}
    out = []
    for code, n, mean, mean_sq, vmin, vmax in rows:
        var = max((mean_sq or 0) - (mean or 0) ** 2, 0) * n / (n - 1) if n > 1 else 0
        t = defs.get(code)
        out.append({"trait_code": code, "name_ko": t.name_ko if t else code, "unit": t.unit if t else None,
                    "n": n, "mean": round(mean, 4), "sd": round(math.sqrt(var), 4),
                    "min": vmin, "max": vmax})
    return sorted(out, key=lambda r: r["trait_code"])


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
    sample_ids = [s.id for s in samples]
    genos = (db.query(models.SampleGenotype, models.Marker)
             .join(models.Marker, models.Marker.id == models.SampleGenotype.marker_id)
             .filter(models.SampleGenotype.sample_id.in_(sample_ids)).all()) if sample_ids else []
    matings = db.query(models.Mating).filter(models.Mating.queen_id == queen.id).all()
    bvs = db.query(models.BreedingValue).filter(models.BreedingValue.queen_id == queen.id).all()
    colonies = (db.query(models.ColonyQueen, models.Colony)
                .join(models.Colony, models.Colony.id == models.ColonyQueen.colony_id)
                .filter(models.ColonyQueen.queen_id == queen.id).all())
    daughters = db.query(models.Queen).filter(models.Queen.mother_queen_id == queen.id).limit(100).all()
    return {
        "queen": {**_queen_brief(queen), "birth_date": queen.birth_date, "origin": queen.origin,
                  "external_id": queen.external_id, "ancestry": v2_service.ancestry_dict(queen)},
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
                     "platform": s.platform, "biosample": s.biosample, "run_accessions": s.run_accessions,
                     "collected_date": s.collected_date, "status": s.status} for s in samples],
        "genotypes": [{"sample_id": g.sample_id, "panel": m.panel, "marker_code": m.marker_code, "trait_code": m.trait_code,
                       "effect": m.effect, "effect_allele": m.effect_allele, "gt": g.gt, "af": g.af} for g, m in genos],
        "breeding_values": [{"trait_code": b.trait_code, "value": b.value, "accuracy": b.accuracy, "model": b.model,
                             "model_version": b.model_version, "run_date": b.run_date} for b in bvs],
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
    """봉군의 현재 여왕 프로필(형질·시료·유전형·육종가)과 여왕 이력"""
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


# ========== 마커 ==========

@router.get("/markers")
def list_markers(panel: Optional[str] = None, trait: Optional[str] = None, max_p: Optional[float] = None,
                 limit: int = 500, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    q = db.query(models.Marker)
    if panel:
        q = q.filter(models.Marker.panel == panel)
    if trait:
        q = q.filter(models.Marker.trait_code == trait)
    if max_p is not None:
        q = q.filter(models.Marker.p_value <= max_p)
    panels = [r[0] for r in db.query(models.Marker.panel).distinct().all()]
    items = q.order_by(models.Marker.p_value).limit(min(limit, 5000)).all()
    return {"panels": panels, "items": [{
        "id": m.id, "panel": m.panel, "marker_code": m.marker_code, "assembly": m.assembly, "chrom": m.chrom,
        "pos": m.pos, "ref": m.ref, "alt": m.alt, "trait_code": m.trait_code, "effect": m.effect,
        "effect_allele": m.effect_allele, "allele_freq": m.allele_freq, "p_value": m.p_value,
        "population": m.population, "source": m.source} for m in items]}


# ========== 적재 (관리자) ==========

@router.post("/import/{kind}")
async def import_rows(kind: str, request: Request, dataset: Optional[str] = None, dry_run: bool = True,
                      db: Session = Depends(get_db), current: models.User = Depends(get_current_admin)):
    """CSV(text/csv) 또는 JSON {"rows": [...]} 로 행을 올린다. 기본은 검사만(dry_run=true)."""
    if kind not in list(v2_service.IMPORTERS) + ["markers"]:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 종류: {kind}")
    body = await request.body()
    if len(body) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="20 MB 이하로 나눠 올려 주세요")
    ctype = request.headers.get("content-type", "")
    if "json" in ctype:
        import json
        rows = json.loads(body.decode("utf-8")).get("rows", [])
    else:
        rows = list(csv.DictReader(io.StringIO(body.decode("utf-8-sig"))))
    return v2_service.run_import(db, kind, rows, dataset, dry_run)


@router.post("/migrate-legacy")
def migrate_legacy(db: Session = Depends(get_db), current: models.User = Depends(get_current_admin)):
    """v1 기록(queen_tag·mother_colony_id·sample_id·trait_records)을 v2 테이블에 잇는다."""
    return v2_service.migrate_legacy(db)


# ========== 교배 예측 ==========

class SireIn(BaseModel):
    queen_id: int
    share: float = Field(1.0, gt=0)


class CrossIn(BaseModel):
    dam_queen_id: int
    sires: Optional[List[SireIn]] = None   # 비우면 어미의 교미 기록을 쓴다
    panel: Optional[str] = None


@router.post("/cross/predict")
def cross_predict(body: CrossIn, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    """어미 여왕 × 수벌 생산 여왕들 → 딸의 마커별 유전형 분포, 형질별 기대 마커 점수, 공통 조상 경고"""
    dam = _queen_or_404(db, current, body.dam_queen_id)
    if body.sires:
        for s in body.sires:
            _queen_or_404(db, current, s.queen_id)
        sires = [(s.queen_id, s.share) for s in body.sires]
        source = "manual"
    else:
        sires = v2_service.recorded_sires(db, dam.id)
        source = "recorded"
    if not sires:
        raise HTTPException(status_code=400, detail="수벌 쪽 여왕이 없습니다(교미 기록 없음). 수벌 생산 여왕을 직접 골라 주세요.")
    out = v2_service.predict_cross(db, dam.id, sires, body.panel)
    tags = {q.id: q.tag for q in db.query(models.Queen).filter(models.Queen.id.in_([dam.id] + [s for s, _ in sires])).all()}
    out["dam_tag"] = dam.tag
    for s in out["sires"]:
        s["tag"] = tags.get(s["queen_id"])
    out["sire_source"] = source
    # 실제 교미 기록으로 예측했을 때만 실제 딸과 비교할 수 있다
    out["actual_daughters"] = v2_service.daughters_summary(db, dam.id, body.panel) if source == "recorded" else None
    return out


@router.get("/cross/validate")
def cross_validate(dataset: str, panel: Optional[str] = None, db: Session = Depends(get_db),
                   current: models.User = Depends(get_current_researcher)):
    """데이터 세트의 모든 어미(교미 기록·유전형 있음, 딸 2마리 이상)에 대해 예측과 실제 딸을 비교"""
    ds = v2_service.get_dataset(db, dataset)
    if ds is None or ds.id not in _visible_ids(db, current):
        raise HTTPException(status_code=404, detail="데이터 세트를 찾을 수 없습니다")
    dam_ids = [r[0] for r in db.query(models.Queen.mother_queen_id)
               .filter(models.Queen.dataset_id == ds.id, models.Queen.mother_queen_id.isnot(None))
               .group_by(models.Queen.mother_queen_id).having(func.count(models.Queen.id) >= 2).all()]
    pairs: dict = {}
    bv_pairs: dict = {}
    freq_pred, freq_obs = [], []
    n_fam = 0
    for dam_id in dam_ids:
        sires = v2_service.recorded_sires(db, dam_id)
        if not sires:
            continue
        pred = v2_service.predict_cross(db, dam_id, sires, panel)
        if not pred["dam_has_genotype"]:
            continue
        act = v2_service.daughters_summary(db, dam_id, panel)
        if not act.get("n_genotyped"):
            continue
        n_fam += 1
        for t in pred["traits"]:
            a = act["mean_marker_score"].get(t["trait_code"])
            if a is not None:
                pairs.setdefault(t["trait_code"], []).append((t["expected_daughter_score"], a))
            b = act["mean_true_queen_effect"].get(t["trait_code"])
            if b is not None:
                bv_pairs.setdefault(t["trait_code"], []).append((t["expected_daughter_score"], b))
        for m in pred["markers"]:
            o = act["allele_freq"].get(f"{m['panel']}|{m['marker_code']}")
            if o is not None:
                freq_pred.append((m["p_dam"] + m["p_drone"]) / 2)
                freq_obs.append(o)

    def corr(xs):
        if len(xs) < 3:
            return None
        a, b = [x for x, _ in xs], [y for _, y in xs]
        try:
            return round(statistics.correlation(a, b), 3)
        except statistics.StatisticsError:
            return None

    return {
        "dataset": dataset, "n_families": n_fam,
        "marker_score": [{"trait_code": t, "n": len(v), "r_pred_vs_daughter_mean": corr(v),
                          "mean_abs_error": round(sum(abs(x - y) for x, y in v) / len(v), 4)} for t, v in sorted(pairs.items())],
        "true_queen_effect": [{"trait_code": t, "n": len(v), "r_pred_vs_daughter_true_effect": corr(v)}
                              for t, v in sorted(bv_pairs.items())],
        "allele_freq": {"n": len(freq_pred), "r_pred_vs_observed": corr(list(zip(freq_pred, freq_obs))),
                        "mean_abs_error": round(sum(abs(x - y) for x, y in zip(freq_pred, freq_obs)) / len(freq_pred), 4) if freq_pred else None},
    }
