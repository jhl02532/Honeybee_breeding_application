import datetime
import json
import statistics
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from .. import field_traits, models, v2_service
from ..auth import get_current_user
from .researcher import get_current_researcher

router = APIRouter(
    prefix="/api/v2/field",
    tags=["v2 Field Records"]
)

DATASET_CODE = "field_2027"
REQUEUEN_WAIT_DAYS = 42
MIN_DRONES = 6
FRAMES_JUMP = 5
NO_QUEEN_STATUS = ("QL", "DL")
MIN_COMPARE = 3
MIN_GROUP_COLONIES = 8


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def _group_or_404(db: Session, group_id: int) -> models.TestGroup:
    group = db.query(models.TestGroup).filter(models.TestGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="검정군을 찾을 수 없습니다")
    return group


def _visit_or_404(db: Session, visit_id: int) -> models.FieldVisit:
    visit = db.query(models.FieldVisit).filter(models.FieldVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="방문 기록을 찾을 수 없습니다")
    return visit


def _require_open(visit: models.FieldVisit) -> None:
    if visit.status != "open":
        raise HTTPException(status_code=409, detail="마감된 방문입니다. 관리자가 다시 열어야 수정할 수 있습니다")


def _require_member(db: Session, visit: models.FieldVisit, colony_id: int) -> models.TestGroupColony:
    member = (db.query(models.TestGroupColony)
              .filter(models.TestGroupColony.group_id == visit.group_id,
                      models.TestGroupColony.colony_id == colony_id).first())
    if not member:
        raise HTTPException(status_code=404, detail="이 검정군의 봉군이 아닙니다")
    return member


def _dataset(db: Session) -> models.Dataset:
    return v2_service.ensure_dataset(db, DATASET_CODE, "2027 시범 현장 기록", "own_research")


def _revise(db: Session, table: str, record_id: int, field: str, old, new, user_id: int) -> None:
    if old == new:
        return
    db.add(models.RecordRevision(table_name=table, record_id=record_id, field=field,
                                 old_value=None if old is None else str(old),
                                 new_value=None if new is None else str(new),
                                 changed_by=user_id, changed_at=_now()))


def _days_between(start: str, end: str) -> Optional[int]:
    try:
        return (datetime.date.fromisoformat(end) - datetime.date.fromisoformat(start)).days
    except ValueError:
        return None


def _requeen_warning(db: Session, colony_id: int, date: str) -> Optional[str]:
    """여왕 교체 직후 값은 이전 여왕의 일벌이 섞여 있어 평가 제외 후보로 표시한다."""
    links = db.query(models.ColonyQueen).filter(models.ColonyQueen.colony_id == colony_id).all()
    starts = [l.start_date for l in links if l.start_date and l.start_date <= date]
    events = (db.query(models.FieldEvent)
              .filter(models.FieldEvent.colony_id == colony_id,
                      models.FieldEvent.event_type == "queen_replaced",
                      models.FieldEvent.date <= date).all())
    starts += [e.date for e in events]
    if not starts:
        return None
    days = _days_between(max(starts), date)
    if days is not None and days < REQUEUEN_WAIT_DAYS:
        return f"여왕 교체 후 {days}일째입니다. 6주 이내 평가는 제외 후보로 표시됩니다"
    return None


def _observations(db: Session, visit_id: int, colony_id: int) -> Dict[str, models.TraitObservation]:
    rows = (db.query(models.TraitObservation)
            .filter(models.TraitObservation.visit_id == visit_id,
                    models.TraitObservation.colony_id == colony_id).all())
    return {o.trait_code: o for o in rows}


def _record_json(db: Session, visit: models.FieldVisit, record: Optional[models.FieldRecord], colony_id: int) -> dict:
    obs = _observations(db, visit.id, colony_id)
    return {
        "saved": record is not None,
        "queen_status": record.queen_status if record else None,
        "boxes": record.boxes if record else None,
        "supers": record.supers if record else None,
        "drone_brood": record.drone_brood if record else None,
        "notes": record.notes if record else None,
        "unknown": json.loads(record.unknown_json or "[]") if record else [],
        "values": {code: o.value for code, o in obs.items()},
    }


def _missing(visit: models.FieldVisit, species: str, record: Optional[models.FieldRecord], values: dict,
             has_queen: bool) -> List[str]:
    if record is None:
        return ["기록 없음"]
    unknown = json.loads(record.unknown_json or "[]")
    missing = []
    if not has_queen and record.queen_status not in NO_QUEEN_STATUS:
        missing.append("여왕 등록")
    if not record.queen_status:
        missing.append("여왕 상태")
    if record.boxes is None:
        missing.append("상자 수")
    for field in field_traits.fields_for(species, visit.round_no):
        if field["required"] and field["code"] not in values and field["code"] not in unknown:
            missing.append(field["name_ko"])
    return missing


def _previous_frames(db: Session, visit: models.FieldVisit, colony_id: int) -> Optional[float]:
    row = (db.query(models.TraitObservation)
           .join(models.FieldVisit, models.FieldVisit.id == models.TraitObservation.visit_id)
           .filter(models.TraitObservation.colony_id == colony_id,
                   models.TraitObservation.trait_code == "frames_bees",
                   models.FieldVisit.group_id == visit.group_id,
                   models.FieldVisit.round_no < visit.round_no)
           .order_by(models.FieldVisit.round_no.desc()).first())
    return row.value if row else None


def _current_link(db: Session, colony_id: int) -> Optional[models.ColonyQueen]:
    return (db.query(models.ColonyQueen)
            .filter(models.ColonyQueen.colony_id == colony_id, models.ColonyQueen.end_date.is_(None))
            .order_by(models.ColonyQueen.id.desc()).first())


def _sync_colony_tag(db: Session, colony_id: int) -> None:
    """봉군 목록에 보이는 queen_tag 를 현재 여왕 ID 와 맞춘다."""
    link = _current_link(db, colony_id)
    colony = db.query(models.Colony).filter(models.Colony.id == colony_id).first()
    if link is not None and colony is not None:
        colony.queen_tag = db.query(models.Queen).filter(models.Queen.id == link.queen_id).first().tag


def _mating(db: Session, queen_id: int) -> Optional[models.Mating]:
    return db.query(models.Mating).filter(models.Mating.queen_id == queen_id).order_by(models.Mating.id).first()


def _queen_json(db: Session, queen: models.Queen, colony_id: int) -> dict:
    link = (db.query(models.ColonyQueen)
            .filter(models.ColonyQueen.colony_id == colony_id, models.ColonyQueen.queen_id == queen.id)
            .order_by(models.ColonyQueen.id.desc()).first())
    mating = _mating(db, queen.id)
    sire = mating.sires[0] if mating and mating.sires else None
    sire_queen = db.query(models.Queen).filter(models.Queen.id == sire.sire_queen_id).first() if sire else None
    return {
        "id": queen.id, "tag": queen.tag, "origin": queen.origin,
        "birth_year": int(queen.birth_date[:4]) if queen.birth_date else None,
        "mother_queen_id": queen.mother_queen_id, "mother_tag": queen.mother.tag if queen.mother else None,
        "introduced_date": link.start_date if link else None,
        "mating_method": mating.method if mating else None,
        "sire_queen_id": sire_queen.id if sire_queen else None, "sire_tag": sire_queen.tag if sire_queen else None,
    }


def _queen_options(db: Session, species: str) -> List[dict]:
    """어미와 수벌군 여왕 후보: 같은 종 검정군의 여왕과 현장 등록 여왕."""
    linked = (db.query(models.Queen)
              .join(models.ColonyQueen, models.ColonyQueen.queen_id == models.Queen.id)
              .join(models.TestGroupColony, models.TestGroupColony.colony_id == models.ColonyQueen.colony_id)
              .join(models.TestGroup, models.TestGroup.id == models.TestGroupColony.group_id)
              .filter(models.TestGroup.species == species).all())
    registered = (db.query(models.Queen)
                  .filter(models.Queen.dataset_id == _dataset(db).id, models.Queen.species == species).all())
    queens = {q.id: q for q in linked + registered}
    return [{"id": q.id, "tag": q.tag} for q in sorted(queens.values(), key=lambda q: q.tag)]


def _check_queen_input(db: Session, body: "QueenIn", queen_id: Optional[int]) -> None:
    errors = []
    if body.origin is not None and body.origin not in field_traits.QUEEN_ORIGINS:
        errors.append("여왕 출처가 올바르지 않습니다")
    if body.mating_method is not None and body.mating_method not in field_traits.MATING_METHODS:
        errors.append("교미 방식이 올바르지 않습니다")
    if body.sire_queen_id is not None and body.mating_method is None:
        errors.append("수벌군을 기록하려면 교미 방식도 입력하세요")
    for label, other in [("어미", body.mother_queen_id), ("수벌군", body.sire_queen_id)]:
        if other is not None and not db.query(models.Queen).filter(models.Queen.id == other).first():
            errors.append(f"{label} 여왕을 찾을 수 없습니다")
    ancestor = body.mother_queen_id
    while ancestor is not None and queen_id is not None:
        if ancestor == queen_id:
            errors.append("어미 기록이 순환합니다")
            break
        row = db.query(models.Queen).filter(models.Queen.id == ancestor).first()
        ancestor = row.mother_queen_id if row else None
    if errors:
        raise HTTPException(status_code=422, detail=errors)
    field_id = _dataset(db).id
    farm = v2_service.get_dataset(db, "farm")
    clash = (db.query(models.Queen)
             .filter(models.Queen.dataset_id.in_([field_id, farm.id if farm else field_id]),
                     models.Queen.tag == body.tag, models.Queen.id != (queen_id or 0)).first())
    if clash:
        raise HTTPException(status_code=409, detail="이미 있는 여왕 ID입니다")


def _apply_queen(db: Session, queen: models.Queen, body: "QueenIn", user_id: int) -> None:
    birth = str(body.birth_year) if body.birth_year else None
    for name, new in [("tag", body.tag), ("birth_date", birth), ("mother_queen_id", body.mother_queen_id),
                      ("origin", body.origin)]:
        _revise(db, "queens", queen.id, name, getattr(queen, name), new, user_id)
        setattr(queen, name, new)
    mating = _mating(db, queen.id)
    if mating is not None:
        old_sire = mating.sires[0].sire_queen_id if mating.sires else None
        _revise(db, "matings", mating.id, "method", mating.method, body.mating_method, user_id)
        _revise(db, "matings", mating.id, "sire_queen_id", old_sire, body.sire_queen_id, user_id)
    if body.mating_method is None:
        if mating is not None:
            db.delete(mating)
        return
    if mating is None:
        mating = models.Mating(queen_id=queen.id, method=body.mating_method)
        db.add(mating)
    mating.method = body.mating_method
    mating.sires = [models.MatingSire(sire_queen_id=body.sire_queen_id)] if body.sire_queen_id else []


def _relink(db: Session, colony_id: int, link: models.ColonyQueen) -> List[str]:
    """기록은 날짜 기준 여왕으로 다시 잇는다. 시료는 채집 당시 여왕 값이라 바꾸지 않고 재채집을 알린다."""
    db.flush()
    for record, date in (db.query(models.FieldRecord, models.FieldVisit.date)
                         .join(models.FieldVisit, models.FieldVisit.id == models.FieldRecord.visit_id)
                         .filter(models.FieldRecord.colony_id == colony_id).all()):
        record.queen_id = v2_service.queen_for_colony_on(db, colony_id, date)
    for observation in (db.query(models.TraitObservation)
                        .filter(models.TraitObservation.colony_id == colony_id,
                                models.TraitObservation.visit_id.isnot(None)).all()):
        observation.queen_id = v2_service.queen_for_colony_on(db, colony_id, observation.date)
    if not link.start_date:
        return []
    stale = (db.query(models.Sample)
             .filter(models.Sample.colony_id == colony_id, models.Sample.visit_id.isnot(None),
                     models.Sample.queen_id != link.queen_id, models.Sample.collected_date >= link.start_date).all())
    return [f"시료 {s.code} 는 이전 여왕 기준입니다. 새 여왕 기준으로 다시 채집하세요" for s in stale]


def _exclusions(db: Session, visit: models.FieldVisit, colony_id: int, record: Optional[models.FieldRecord],
                queen_id: Optional[int]) -> List[str]:
    """기록은 남기되 비교표에서 빼는 사유."""
    reasons = []
    if record is None:
        reasons.append("기록 없음")
    if queen_id is None:
        reasons.append("여왕 미확정")
    if record is not None and record.queen_status == "QL":
        reasons.append("무왕")
    if record is not None and record.queen_status == "DL":
        reasons.append("일벌 산란")
    if _requeen_warning(db, colony_id, visit.date):
        reasons.append("도입 42일 미만")
    samples = (db.query(models.Sample)
               .filter(models.Sample.colony_id == colony_id, models.Sample.visit_id.isnot(None),
                       models.Sample.collected_date <= visit.date).all())
    if any(s.queen_id != v2_service.queen_for_colony_on(db, colony_id, s.collected_date) for s in samples):
        reasons.append("시료-여왕 불일치")
    return reasons


def _rank_scores(values: Dict[int, float], better: str) -> Dict[int, dict]:
    """같은 검정군의 비교 대상 안에서만 z 와 순위를 낸다. 좋은 방향이 양수다."""
    if len(values) < MIN_COMPARE:
        return {}
    spread = statistics.stdev(values.values())
    if spread == 0:
        return {}
    center = statistics.mean(values.values())
    sign = 1 if better == "high" else -1
    return {key: {"z": round(sign * (value - center) / spread, 2),
                  "rank": 1 + sum(sign * other > sign * value for other in values.values())}
            for key, value in values.items()}


def _honey_totals(db: Session, colony_ids: List[int], date: str) -> Dict[int, float]:
    """방문일까지의 채밀 합계. 채밀 기록이 없는 봉군은 값이 없다."""
    rows = (db.query(models.FieldEvent)
            .filter(models.FieldEvent.colony_id.in_(colony_ids), models.FieldEvent.event_type == "honey_harvest",
                    models.FieldEvent.date >= date[:4], models.FieldEvent.date <= date).all())
    totals: Dict[int, float] = {}
    for row in rows:
        totals[row.colony_id] = totals.get(row.colony_id, 0) + (row.value or 0)
    return totals


class GroupHive(BaseModel):
    colony_id: int
    hive_code: str = Field(min_length=1, max_length=50)


class GroupIn(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    apiary_id: int
    species: str
    year: int = Field(ge=2026, le=2100)
    notes: Optional[str] = None
    hives: List[GroupHive] = Field(min_length=1)


class VisitIn(BaseModel):
    group_id: int
    round_no: int = Field(ge=1, le=3)
    date: datetime.date
    weather: Optional[str] = None
    notes: Optional[str] = None


class RecordIn(BaseModel):
    queen_status: Optional[str] = None
    boxes: Optional[int] = Field(default=None, ge=0, le=10)
    supers: Optional[int] = Field(default=None, ge=0, le=10)
    drone_brood: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=500)
    values: Dict[str, Optional[float]] = {}
    unknown: List[str] = []


class SampleIn(BaseModel):
    colony_id: int
    code: str = Field(min_length=1, max_length=100)
    sample_type: str
    n_individuals: Optional[int] = Field(default=None, ge=1, le=1000)
    storage: Optional[str] = Field(default=None, max_length=100)


class QueenIn(BaseModel):
    tag: str = Field(min_length=1, max_length=100)
    birth_year: Optional[int] = Field(default=None, ge=2000, le=2100)
    mother_queen_id: Optional[int] = None
    introduced_date: Optional[datetime.date] = None
    origin: Optional[str] = None
    mating_method: Optional[str] = None
    sire_queen_id: Optional[int] = None


class QueenRegisterIn(QueenIn):
    replace: bool = False


class EventIn(BaseModel):
    colony_id: int
    event_type: str
    date: datetime.date
    value: Optional[float] = Field(default=None, ge=0, le=1000)
    notes: Optional[str] = Field(default=None, max_length=500)


@router.get("/dictionary")
def read_dictionary(current: models.User = Depends(get_current_researcher)):
    return {
        "rounds": field_traits.ROUNDS,
        "queen_status": field_traits.QUEEN_STATUS,
        "mating_methods": field_traits.MATING_METHODS,
        "queen_origins": field_traits.QUEEN_ORIGINS,
        "event_types": field_traits.EVENT_TYPES,
        "traits": [{**t, "species": list(t["species"])} for t in field_traits.FIELD_TRAITS],
    }


@router.get("/groups")
def list_groups(db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    rows = []
    for group in db.query(models.TestGroup).order_by(models.TestGroup.year.desc(), models.TestGroup.code).all():
        apiary = db.query(models.Apiary).filter(models.Apiary.id == group.apiary_id).first()
        rows.append({
            "id": group.id, "code": group.code, "species": group.species, "year": group.year,
            "apiary": apiary.name if apiary else None,
            "n_colonies": db.query(models.TestGroupColony).filter(models.TestGroupColony.group_id == group.id).count(),
            "visits": [{"id": v.id, "round_no": v.round_no, "date": v.date, "status": v.status}
                       for v in db.query(models.FieldVisit).filter(models.FieldVisit.group_id == group.id)
                       .order_by(models.FieldVisit.round_no).all()],
        })
    return rows


@router.post("/groups", status_code=status.HTTP_201_CREATED)
def create_group(body: GroupIn, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    if body.species not in field_traits.SPECIES:
        raise HTTPException(status_code=422, detail="종은 mellifera 또는 cerana 여야 합니다")
    if db.query(models.TestGroup).filter(models.TestGroup.code == body.code).first():
        raise HTTPException(status_code=409, detail="이미 있는 검정군 코드입니다")
    if len({h.colony_id for h in body.hives}) != len(body.hives) or len({h.hive_code for h in body.hives}) != len(body.hives):
        raise HTTPException(status_code=422, detail="봉군이나 벌통 ID가 중복되었습니다")
    colony_ids = {c.id for c in db.query(models.Colony).filter(models.Colony.apiary_id == body.apiary_id).all()}
    if any(h.colony_id not in colony_ids for h in body.hives):
        raise HTTPException(status_code=422, detail="이 양봉장의 봉군이 아닌 항목이 있습니다")
    group = models.TestGroup(code=body.code, apiary_id=body.apiary_id, species=body.species,
                             year=body.year, notes=body.notes)
    db.add(group)
    db.flush()
    for position, hive in enumerate(body.hives, start=1):
        db.add(models.TestGroupColony(group_id=group.id, colony_id=hive.colony_id,
                                      hive_code=hive.hive_code, position=position))
    db.commit()
    warnings = [f"검정군이 {len(body.hives)}군입니다. 10군 이상을 권장합니다"] if len(body.hives) < 10 else []
    return {"id": group.id, "warnings": warnings}


@router.post("/visits", status_code=status.HTTP_201_CREATED)
def create_visit(body: VisitIn, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    _group_or_404(db, body.group_id)
    exists = (db.query(models.FieldVisit)
              .filter(models.FieldVisit.group_id == body.group_id, models.FieldVisit.round_no == body.round_no).first())
    if exists:
        raise HTTPException(status_code=409, detail="이 회차 방문이 이미 있습니다")
    visit = models.FieldVisit(group_id=body.group_id, round_no=body.round_no, date=body.date.isoformat(),
                              assessor_id=current.id, weather=body.weather, notes=body.notes)
    db.add(visit)
    db.commit()
    return {"id": visit.id}


@router.get("/visits/{visit_id}")
def read_visit(visit_id: int, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    visit = _visit_or_404(db, visit_id)
    group = _group_or_404(db, visit.group_id)
    members = (db.query(models.TestGroupColony).filter(models.TestGroupColony.group_id == group.id)
               .order_by(models.TestGroupColony.position).all())
    colonies = []
    for member in members:
        colony = db.query(models.Colony).filter(models.Colony.id == member.colony_id).first()
        record = (db.query(models.FieldRecord)
                  .filter(models.FieldRecord.visit_id == visit.id, models.FieldRecord.colony_id == member.colony_id).first())
        data = _record_json(db, visit, record, member.colony_id)
        queen_id = v2_service.queen_for_colony_on(db, member.colony_id, visit.date)
        queen = db.query(models.Queen).filter(models.Queen.id == queen_id).first() if queen_id else None
        samples = db.query(models.Sample).filter(models.Sample.visit_id == visit.id,
                                                 models.Sample.colony_id == member.colony_id).all()
        colonies.append({
            "colony_id": member.colony_id, "hive_code": member.hive_code, "colony_code": colony.code if colony else None,
            "queen_tag": queen.tag if queen else None, "record": data,
            "queen": _queen_json(db, queen, member.colony_id) if queen else None,
            "missing": _missing(visit, group.species, record, data["values"], queen is not None),
            "samples": [{"code": s.code, "sample_type": s.sample_type, "n_individuals": s.n_individuals,
                         "storage": s.storage, "status": s.status} for s in samples],
        })
    return {
        "id": visit.id, "round_no": visit.round_no, "round_label": field_traits.ROUNDS[visit.round_no],
        "date": visit.date, "status": visit.status, "weather": visit.weather,
        "group": {"id": group.id, "code": group.code, "species": group.species, "year": group.year},
        "fields": field_traits.fields_for(group.species, visit.round_no),
        "queen_status": field_traits.QUEEN_STATUS,
        "mating_methods": field_traits.MATING_METHODS,
        "queen_origins": field_traits.QUEEN_ORIGINS,
        "queen_options": _queen_options(db, group.species),
        "colonies": colonies,
    }


@router.get("/visits/{visit_id}/comparison")
def read_comparison(visit_id: int, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    visit = _visit_or_404(db, visit_id)
    group = _group_or_404(db, visit.group_id)
    members = (db.query(models.TestGroupColony).filter(models.TestGroupColony.group_id == group.id)
               .order_by(models.TestGroupColony.position).all())
    colony_ids = [m.colony_id for m in members]
    metrics = [{"code": f["code"], "name_ko": f["name_ko"], "unit": f["unit"], "better": f["better"]}
               for f in field_traits.fields_for(group.species, visit.round_no) if "better" in f]
    for metric in metrics:
        if metric["code"] == "varroa_count":
            metric["unit"] = "마리/100 g"
    honey = _honey_totals(db, colony_ids, visit.date)
    if honey:
        metrics.append({"code": "honey_total", "name_ko": "채밀 누적", "unit": "kg", "better": "high"})

    rows, assessors = [], set()
    for member in members:
        record = (db.query(models.FieldRecord)
                  .filter(models.FieldRecord.visit_id == visit.id, models.FieldRecord.colony_id == member.colony_id).first())
        if record is not None and record.assessor_id:
            assessors.add(record.assessor_id)
        queen_id = v2_service.queen_for_colony_on(db, member.colony_id, visit.date)
        queen = db.query(models.Queen).filter(models.Queen.id == queen_id).first() if queen_id else None
        values = {code: o.value for code, o in _observations(db, visit.id, member.colony_id).items()}
        grams = values.pop("varroa_sample_g", None)
        if "varroa_count" in values:
            count = values.pop("varroa_count")
            if grams:
                values["varroa_count"] = round(count / grams * 100, 2)
        if member.colony_id in honey:
            values["honey_total"] = honey[member.colony_id]
        reasons = _exclusions(db, visit, member.colony_id, record, queen_id)
        rows.append({"colony_id": member.colony_id, "hive_code": member.hive_code,
                     "queen_tag": queen.tag if queen else None, "eligible": not reasons, "reasons": reasons,
                     "unknown": json.loads(record.unknown_json or "[]") if record else [],
                     "cells": {code: {"value": value, "z": None, "rank": None} for code, value in values.items()}})

    eligible = [row for row in rows if row["eligible"]]
    for metric in metrics:
        code = metric["code"]
        values = {row["colony_id"]: row["cells"][code]["value"] for row in eligible if code in row["cells"]}
        metric["n"] = len(values)
        scores = _rank_scores(values, metric["better"])
        for row in eligible:
            if row["colony_id"] in scores:
                row["cells"][code].update(scores[row["colony_id"]])

    warnings = []
    if visit.status == "open":
        warnings.append("입력 중인 방문입니다. 값이 바뀔 수 있습니다")
    if len(assessors) > 1:
        warnings.append(f"평가자가 {len(assessors)}명입니다. 평가자 차이가 섞일 수 있습니다")
    if len(eligible) < MIN_GROUP_COLONIES:
        warnings.append(f"비교 가능 봉군이 {len(eligible)}군입니다. {MIN_GROUP_COLONIES}군 미만이면 순위 해석에 주의하세요")
    return {
        "visit": {"id": visit.id, "round_no": visit.round_no, "round_label": field_traits.ROUNDS[visit.round_no],
                  "date": visit.date, "status": visit.status},
        "group": {"id": group.id, "code": group.code, "species": group.species, "year": group.year},
        "metrics": metrics, "rows": rows, "n_eligible": len(eligible), "warnings": warnings,
    }


@router.put("/visits/{visit_id}/records/{colony_id}")
def save_record(visit_id: int, colony_id: int, body: RecordIn, db: Session = Depends(get_db),
                current: models.User = Depends(get_current_researcher)):
    visit = _visit_or_404(db, visit_id)
    _require_open(visit)
    _require_member(db, visit, colony_id)
    group = _group_or_404(db, visit.group_id)
    fields = {f["code"]: f for f in field_traits.fields_for(group.species, visit.round_no)}

    errors = []
    if body.queen_status is not None and body.queen_status not in field_traits.QUEEN_STATUS:
        errors.append("여왕 상태 코드가 올바르지 않습니다")
    for code in list(body.values) + body.unknown:
        if code not in fields:
            errors.append(f"{code} 는 이 회차 항목이 아닙니다")
    for code, value in body.values.items():
        field = fields.get(code)
        if field is None or value is None:
            continue
        if not field["min"] <= value <= field["max"]:
            errors.append(f"{field['name_ko']} 값은 {field['min']}~{field['max']} 범위여야 합니다")
        elif round(value / field["step"]) * field["step"] != value:
            errors.append(f"{field['name_ko']} 값은 {field['step']} 단위로 입력합니다")
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    queen_id = v2_service.queen_for_colony_on(db, colony_id, visit.date)
    record = (db.query(models.FieldRecord)
              .filter(models.FieldRecord.visit_id == visit.id, models.FieldRecord.colony_id == colony_id).first())
    unknown_json = json.dumps(sorted(set(body.unknown)))
    if record is None:
        record = models.FieldRecord(visit_id=visit.id, colony_id=colony_id, assessor_id=current.id)
        db.add(record)
        db.flush()
    else:
        for name, new in [("queen_status", body.queen_status), ("boxes", body.boxes), ("supers", body.supers),
                          ("drone_brood", body.drone_brood), ("notes", body.notes), ("unknown_json", unknown_json)]:
            _revise(db, "field_records", record.id, name, getattr(record, name), new, current.id)
    record.queen_id = queen_id
    record.queen_status = body.queen_status
    record.boxes = body.boxes
    record.supers = body.supers
    record.drone_brood = body.drone_brood
    record.notes = body.notes
    record.unknown_json = unknown_json

    dataset = _dataset(db)
    existing = _observations(db, visit.id, colony_id)
    for code in fields:
        value = body.values.get(code)
        observation = existing.get(code)
        if observation is not None:
            _revise(db, "trait_observations", observation.id, code, observation.value, value, current.id)
            if value is None:
                db.delete(observation)
            else:
                observation.value = value
                observation.queen_id = queen_id
        elif value is not None:
            db.add(models.TraitObservation(dataset_id=dataset.id, trait_code=code, colony_id=colony_id,
                                           queen_id=queen_id, value=value, date=visit.date,
                                           measured_by=current.id, visit_id=visit.id))
    db.commit()

    warnings = []
    requeen = _requeen_warning(db, colony_id, visit.date)
    if requeen:
        warnings.append(requeen)
    if queen_id is None:
        warnings.append("이 봉군에 연결된 여왕이 없습니다")
    frames = body.values.get("frames_bees")
    previous = _previous_frames(db, visit, colony_id)
    if frames is not None and previous is not None and abs(frames - previous) >= FRAMES_JUMP:
        warnings.append(f"벌 프레임 수가 직전 회차 {previous}에서 {frames}로 크게 달라졌습니다")
    data = _record_json(db, visit, record, colony_id)
    return {"record": data, "missing": _missing(visit, group.species, record, data["values"], queen_id is not None),
            "warnings": warnings}


@router.post("/colonies/{colony_id}/queen", status_code=status.HTTP_201_CREATED)
def register_queen(colony_id: int, body: QueenRegisterIn, db: Session = Depends(get_db),
                   current: models.User = Depends(get_current_researcher)):
    member = db.query(models.TestGroupColony).filter(models.TestGroupColony.colony_id == colony_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="검정군에 등록된 봉군이 아닙니다")
    group = _group_or_404(db, member.group_id)
    link = _current_link(db, colony_id)
    adopt = link is not None and link.change_reason == "migrated" and not body.replace
    if link is not None and not adopt:
        if not body.replace:
            raise HTTPException(status_code=409, detail="이미 여왕이 있습니다. 교체로 등록하세요")
        if body.introduced_date is None:
            raise HTTPException(status_code=422, detail="교체 때는 도입일을 입력하세요")
        if link.start_date and link.start_date >= body.introduced_date.isoformat():
            raise HTTPException(status_code=422, detail="도입일이 이전 여왕의 시작일보다 늦어야 합니다")
    start = body.introduced_date.isoformat() if body.introduced_date else None
    _check_queen_input(db, body, link.queen_id if adopt else None)

    if adopt:
        queen = db.query(models.Queen).filter(models.Queen.id == link.queen_id).first()
        queen.species = group.species
        link.start_date = start
        link.change_reason = "introduced"
    else:
        queen = models.Queen(dataset_id=_dataset(db).id, tag=body.tag, species=group.species)
        db.add(queen)
        db.flush()
        if link is not None:
            link.end_date = (body.introduced_date - datetime.timedelta(days=1)).isoformat()
            logged = (db.query(models.FieldEvent)
                      .filter(models.FieldEvent.colony_id == colony_id, models.FieldEvent.date == start,
                              models.FieldEvent.event_type == "queen_replaced").first())
            if not logged:
                db.add(models.FieldEvent(colony_id=colony_id, event_type="queen_replaced", date=start,
                                         recorded_by=current.id))
        link = models.ColonyQueen(colony_id=colony_id, queen_id=queen.id, start_date=start,
                                  change_reason="requeen" if link is not None else "introduced")
        db.add(link)
    _apply_queen(db, queen, body, current.id)
    warnings = _relink(db, colony_id, link)
    _sync_colony_tag(db, colony_id)
    db.commit()
    return {"queen": _queen_json(db, queen, colony_id), "warnings": warnings}


@router.put("/queens/{queen_id}")
def update_queen(queen_id: int, colony_id: int, body: QueenIn, db: Session = Depends(get_db),
                 current: models.User = Depends(get_current_researcher)):
    link = (db.query(models.ColonyQueen)
            .join(models.TestGroupColony, models.TestGroupColony.colony_id == models.ColonyQueen.colony_id)
            .filter(models.ColonyQueen.colony_id == colony_id, models.ColonyQueen.queen_id == queen_id)
            .order_by(models.ColonyQueen.id.desc()).first())
    queen = db.query(models.Queen).filter(models.Queen.id == queen_id).first()
    if not link or not queen:
        raise HTTPException(status_code=404, detail="검정군 봉군의 여왕이 아닙니다")
    _check_queen_input(db, body, queen_id)
    start = body.introduced_date.isoformat() if body.introduced_date else None
    _revise(db, "colony_queens", link.id, "start_date", link.start_date, start, current.id)
    link.start_date = start
    _apply_queen(db, queen, body, current.id)
    warnings = _relink(db, colony_id, link)
    _sync_colony_tag(db, colony_id)
    db.commit()
    return {"queen": _queen_json(db, queen, colony_id), "warnings": warnings}


@router.post("/visits/{visit_id}/samples", status_code=status.HTTP_201_CREATED)
def add_sample(visit_id: int, body: SampleIn, db: Session = Depends(get_db),
               current: models.User = Depends(get_current_researcher)):
    visit = _visit_or_404(db, visit_id)
    _require_open(visit)
    _require_member(db, visit, body.colony_id)
    if body.sample_type not in ("drone_pool", "worker_pool", "queen"):
        raise HTTPException(status_code=422, detail="시료 유형이 올바르지 않습니다")
    record = (db.query(models.FieldRecord)
              .filter(models.FieldRecord.visit_id == visit.id, models.FieldRecord.colony_id == body.colony_id).first())
    if body.sample_type == "drone_pool" and record and record.queen_status in ("QL", "DL"):
        raise HTTPException(status_code=422, detail="무왕군이나 일벌 산란군의 수벌은 여왕 유전형이 아닙니다")
    dataset = _dataset(db)
    if db.query(models.Sample).filter(models.Sample.dataset_id == dataset.id, models.Sample.code == body.code).first():
        raise HTTPException(status_code=409, detail="이미 있는 튜브 번호입니다")
    queen_id = v2_service.queen_for_colony_on(db, body.colony_id, visit.date)
    if queen_id is None:
        raise HTTPException(status_code=422, detail="여왕을 먼저 등록해야 시료를 저장할 수 있습니다")
    db.add(models.Sample(dataset_id=dataset.id, code=body.code, colony_id=body.colony_id, queen_id=queen_id,
                         sample_type=body.sample_type, n_individuals=body.n_individuals,
                         collected_date=visit.date, status="stored", visit_id=visit.id, storage=body.storage))
    db.commit()
    warnings = []
    if body.sample_type == "drone_pool" and (body.n_individuals or 0) < MIN_DRONES:
        warnings.append(f"수벌이 {MIN_DRONES}마리 미만입니다. 저수량 시료로 표시하세요")
    requeen = _requeen_warning(db, body.colony_id, visit.date)
    if requeen:
        warnings.append(requeen)
    return {"warnings": warnings}


@router.post("/visits/{visit_id}/close")
def close_visit(visit_id: int, force: bool = False, db: Session = Depends(get_db),
                current: models.User = Depends(get_current_researcher)):
    visit = _visit_or_404(db, visit_id)
    _require_open(visit)
    group = _group_or_404(db, visit.group_id)
    incomplete = []
    members = db.query(models.TestGroupColony).filter(models.TestGroupColony.group_id == group.id).all()
    for member in members:
        record = (db.query(models.FieldRecord)
                  .filter(models.FieldRecord.visit_id == visit.id, models.FieldRecord.colony_id == member.colony_id).first())
        values = {o.trait_code: o.value for o in _observations(db, visit.id, member.colony_id).values()}
        has_queen = v2_service.queen_for_colony_on(db, member.colony_id, visit.date) is not None
        missing = _missing(visit, group.species, record, values, has_queen)
        if missing:
            incomplete.append({"hive_code": member.hive_code, "missing": missing})
    if incomplete and not force:
        return {"closed": False, "incomplete": incomplete}
    visit.status = "closed"
    visit.closed_at = _now()
    db.commit()
    return {"closed": True, "incomplete": incomplete}


@router.post("/visits/{visit_id}/reopen")
def reopen_visit(visit_id: int, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    if current.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다")
    visit = _visit_or_404(db, visit_id)
    _revise(db, "field_visits", visit.id, "status", visit.status, "open", current.id)
    visit.status = "open"
    visit.closed_at = None
    db.commit()
    return {"status": visit.status}


@router.get("/events")
def list_events(group_id: int, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    rows = (db.query(models.FieldEvent, models.TestGroupColony.hive_code)
            .join(models.TestGroupColony, models.TestGroupColony.colony_id == models.FieldEvent.colony_id)
            .filter(models.TestGroupColony.group_id == group_id)
            .order_by(models.FieldEvent.date.desc()).all())
    return [{"id": e.id, "colony_id": e.colony_id, "hive_code": hive, "event_type": e.event_type,
             "date": e.date, "value": e.value, "notes": e.notes} for e, hive in rows]


@router.post("/events", status_code=status.HTTP_201_CREATED)
def add_event(body: EventIn, db: Session = Depends(get_db), current: models.User = Depends(get_current_researcher)):
    if body.event_type not in field_traits.EVENT_TYPES:
        raise HTTPException(status_code=422, detail="사건 유형이 올바르지 않습니다")
    if body.event_type == "honey_harvest" and body.value is None:
        raise HTTPException(status_code=422, detail="채밀량을 입력하세요. 수확이 없으면 0을 입력합니다")
    if not db.query(models.TestGroupColony).filter(models.TestGroupColony.colony_id == body.colony_id).first():
        raise HTTPException(status_code=404, detail="검정군에 등록된 봉군이 아닙니다")
    event = models.FieldEvent(colony_id=body.colony_id, event_type=body.event_type, date=body.date.isoformat(),
                              value=body.value, notes=body.notes, recorded_by=current.id)
    db.add(event)
    if body.event_type == "honey_harvest":
        date = body.date.isoformat()
        db.add(models.TraitObservation(dataset_id=_dataset(db).id, trait_code="honey_kg", colony_id=body.colony_id,
                                       queen_id=v2_service.queen_for_colony_on(db, body.colony_id, date),
                                       value=body.value, date=date, measured_by=current.id))
    db.commit()
    warnings = ["새 여왕을 교체로 등록해야 이후 기록과 시료가 새 여왕에 연결됩니다"] if body.event_type == "queen_replaced" else []
    return {"id": event.id, "warnings": warnings}
