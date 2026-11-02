import datetime
import json
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


def _missing(visit: models.FieldVisit, species: str, record: Optional[models.FieldRecord], values: dict) -> List[str]:
    if record is None:
        return ["기록 없음"]
    unknown = json.loads(record.unknown_json or "[]")
    missing = []
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
            "missing": _missing(visit, group.species, record, data["values"]),
            "samples": [{"code": s.code, "sample_type": s.sample_type, "n_individuals": s.n_individuals,
                         "storage": s.storage, "status": s.status} for s in samples],
        })
    return {
        "id": visit.id, "round_no": visit.round_no, "round_label": field_traits.ROUNDS[visit.round_no],
        "date": visit.date, "status": visit.status, "weather": visit.weather,
        "group": {"id": group.id, "code": group.code, "species": group.species, "year": group.year},
        "fields": field_traits.fields_for(group.species, visit.round_no),
        "queen_status": field_traits.QUEEN_STATUS,
        "colonies": colonies,
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
    return {"record": data, "missing": _missing(visit, group.species, record, data["values"]), "warnings": warnings}


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
    if queen_id is None:
        warnings.append("이 봉군에 연결된 여왕이 없습니다")
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
        missing = _missing(visit, group.species, record, values)
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
    return {"id": event.id}
