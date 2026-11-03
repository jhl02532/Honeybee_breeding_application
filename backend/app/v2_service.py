"""v2 육종 기록 구조의 공통 로직.

- 기준 데이터(데이터 세트, 형질 정의) 시드
- 기존 v1 기록(queen_tag, mother_colony_id, sample_id, trait_records)을 v2 테이블로 잇기
"""
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from . import field_traits, models


# ========== 기준 데이터 ==========

DATASETS = [
    # code, name, kind, visible_to, citation, doi, license
    ("farm", "농가 입력 기록", "farm", "all", None, None, None),
    ("inu_2026", "인천대 2026 채집 시료", "own_research", "researcher", None, None, None),
    ("field_2027", "2027 시범 현장 기록", "own_research", "researcher", None, None, None),
]

# code, name_ko, name_en, unit, scale, level, category, min, max, legacy_column
TRAIT_DEFINITIONS = [
    ("honey_kg", "채밀량", "Honey yield", "kg", "continuous", "colony", "production", 0, None, "honey_production"),
    ("propolis_g", "프로폴리스 생산량", "Propolis yield", "g", "continuous", "colony", "production", 0, None, "propolis_production"),
    ("royal_jelly_g", "로열젤리 생산량", "Royal jelly yield", "g", "continuous", "colony", "production", 0, None, "royal_jelly_production"),
    ("temperament", "온순성", "Gentleness", "1-5", "ordinal", "colony", "behaviour", 1, 5, "temperament"),
    ("virus_resistance", "바이러스 저항성", "Virus resistance", "1-5", "ordinal", "colony", "disease", 1, 5, "virus_resistance"),
    ("mite_resistance", "응애 저항성", "Mite resistance", "1-5", "ordinal", "colony", "disease", 1, 5, "mite_resistance"),
    ("swarming_pct", "분봉률", "Swarming rate", "%", "continuous", "colony", "behaviour", 0, 100, "swarming_rate"),
    ("overwinter_pct", "월동 생존율", "Overwintering survival", "%", "continuous", "colony", "overwintering", 0, 100, "overwintering_survival"),
    ("climate_adapt", "기후 적응성", "Climate adaptation", "1-5", "ordinal", "colony", "overwintering", 1, 5, "climate_adaptation"),
    ("vsh_pct", "VSH 청소율", "VSH removal", "%", "continuous", "colony", "disease", 0, 100, "vsh_rate"),
    ("hygienic_pct", "핀테스트 청소율", "Pin-test hygienic", "%", "continuous", "colony", "disease", 0, 100, "hygienic_rate"),
    ("temperature_c", "기온(기록 시)", "Air temperature", "°C", "continuous", "colony", "other", None, None, "temperature"),
    ("humidity_pct", "습도(기록 시)", "Humidity", "%", "continuous", "colony", "other", 0, 100, "humidity"),
]


def ensure_reference_data(db: Session) -> None:
    """데이터 세트·형질 정의 기본값을 넣는다. 이미 있으면 건드리지 않는다."""
    for code, name, kind, visible, citation, doi, lic in DATASETS:
        if not db.query(models.Dataset).filter(models.Dataset.code == code).first():
            db.add(models.Dataset(code=code, name=name, kind=kind, visible_to=visible,
                                  citation=citation, doi=doi, license=lic))
    for row in TRAIT_DEFINITIONS:
        ensure_trait_definition(db, *row)
    for trait in field_traits.FIELD_TRAITS:
        ensure_trait_definition(db, trait["code"], trait["name_ko"], trait["name_en"], trait["unit"], trait["scale"],
                                "colony", trait["category"], trait["min"], trait["max"], protocol=trait["protocol"])
    db.commit()


def ensure_trait_definition(db: Session, code, name_ko, name_en=None, unit=None, scale="continuous",
                            level="colony", category=None, min_value=None, max_value=None,
                            legacy_column=None, protocol=None) -> models.TraitDefinition:
    td = db.query(models.TraitDefinition).filter(models.TraitDefinition.code == code).first()
    if not td:
        td = models.TraitDefinition(code=code, name_ko=name_ko, name_en=name_en, unit=unit, scale=scale,
                                    level=level, category=category, min_value=min_value, max_value=max_value,
                                    legacy_column=legacy_column, protocol=protocol)
        db.add(td)
        db.flush()
    return td


def get_dataset(db: Session, code: str) -> Optional[models.Dataset]:
    return db.query(models.Dataset).filter(models.Dataset.code == code).first()


def ensure_dataset(db: Session, code: str, name: str, kind: str, visible_to: str = "researcher",
                   citation=None, doi=None, license=None, notes=None) -> models.Dataset:
    ds = get_dataset(db, code)
    if not ds:
        ds = models.Dataset(code=code, name=name, kind=kind, visible_to=visible_to,
                            citation=citation, doi=doi, license=license, notes=notes)
        db.add(ds)
        db.flush()
    return ds


def visible_dataset_ids(db: Session, role: str) -> List[int]:
    allowed = {"farmer": ["all"], "researcher": ["all", "researcher"], "admin": ["all", "researcher", "admin"]}
    levels = allowed.get(role, ["all"])
    return [d.id for d in db.query(models.Dataset).filter(models.Dataset.visible_to.in_(levels)).all()]


# ========== 기존 v1 기록 잇기 ==========

LEGACY_COLUMNS = [(row[9], row[0]) for row in TRAIT_DEFINITIONS]  # (trait_records 열, 형질 코드)


def _farm_queen_tag(db: Session, farm_id: int, colony: models.Colony) -> str:
    """queen_tag 가 비었거나 다른 봉군과 겹치면 봉군 코드를 붙여 구분한다."""
    tag = (colony.queen_tag or "").strip()
    if not tag or tag.lower() == "unknown":
        return f"{colony.code}-Q"
    clash = db.query(models.Queen).filter(models.Queen.dataset_id == farm_id, models.Queen.tag == tag).first()
    if clash:
        link = db.query(models.ColonyQueen).filter(models.ColonyQueen.queen_id == clash.id).first()
        if link and link.colony_id != colony.id:
            return f"{tag}@{colony.code}"
    return tag


def ensure_colony_queen(db: Session, colony: models.Colony) -> models.Queen:
    """봉군의 현재 여왕을 돌려준다. 없으면 queen_tag 로 만든다(시작일 미상)."""
    link = (db.query(models.ColonyQueen)
            .filter(models.ColonyQueen.colony_id == colony.id, models.ColonyQueen.end_date.is_(None))
            .order_by(models.ColonyQueen.id.desc()).first())
    if link:
        return db.query(models.Queen).get(link.queen_id)
    farm = get_dataset(db, "farm")
    tag = _farm_queen_tag(db, farm.id, colony)
    queen = db.query(models.Queen).filter(models.Queen.dataset_id == farm.id, models.Queen.tag == tag).first()
    if not queen:
        queen = models.Queen(dataset_id=farm.id, tag=tag, species=colony.queen_species, origin="v1 이전")
        db.add(queen)
        db.flush()
    db.add(models.ColonyQueen(colony_id=colony.id, queen_id=queen.id, change_reason="migrated"))
    db.flush()
    return queen


def queen_for_colony_on(db: Session, colony_id: int, date: Optional[str]) -> Optional[int]:
    """기록 날짜에 그 봉군에 있던 여왕. 날짜가 없거나 이력이 하나면 현재 여왕."""
    links = db.query(models.ColonyQueen).filter(models.ColonyQueen.colony_id == colony_id).all()
    if not links:
        return None
    if date:
        for l in links:
            if (l.start_date is None or l.start_date <= date) and (l.end_date is None or date <= l.end_date):
                return l.queen_id
    current = [l for l in links if l.end_date is None]
    return (current or links)[-1].queen_id


def sync_trait_record(db: Session, record: models.TraitRecord) -> int:
    """trait_records 한 행을 trait_observations 로 옮긴다(이중 기록). null 은 옮기지 않는다."""
    farm = get_dataset(db, "farm")
    if farm is None:
        ensure_reference_data(db)
        farm = get_dataset(db, "farm")
    db.query(models.TraitObservation).filter(models.TraitObservation.legacy_record_id == record.id).delete()
    colony = db.query(models.Colony).get(record.colony_id)
    if colony is not None:
        ensure_colony_queen(db, colony)
    queen_id = queen_for_colony_on(db, record.colony_id, record.date)
    n = 0
    for col, code in LEGACY_COLUMNS:
        v = getattr(record, col, None)
        if v is None:
            continue
        db.add(models.TraitObservation(dataset_id=farm.id, trait_code=code, colony_id=record.colony_id,
                                       queen_id=queen_id, value=float(v), date=record.date,
                                       legacy_record_id=record.id))
        n += 1
    return n


def migrate_legacy(db: Session) -> Dict[str, int]:
    """v1 기록 전체를 v2 테이블에 잇는다. 여러 번 돌려도 결과가 같다."""
    ensure_reference_data(db)
    stats = {"queens_linked": 0, "mother_links": 0, "samples": 0, "trait_records": 0, "observations": 0}
    colonies = db.query(models.Colony).order_by(models.Colony.id).all()
    for c in colonies:
        ensure_colony_queen(db, c)
        stats["queens_linked"] += 1
    db.flush()
    for c in colonies:
        if c.mother_colony_id:
            q = ensure_colony_queen(db, c)
            mother_colony = db.query(models.Colony).get(c.mother_colony_id)
            if mother_colony is not None:
                mq = ensure_colony_queen(db, mother_colony)
                if mq.id != q.id and q.mother_queen_id != mq.id:
                    q.mother_queen_id = mq.id
                    stats["mother_links"] += 1
    inu = get_dataset(db, "inu_2026")
    for c in colonies:
        if not c.sample_id:
            continue
        s = db.query(models.Sample).filter(models.Sample.dataset_id == inu.id, models.Sample.code == c.sample_id).first()
        if not s:
            s = models.Sample(dataset_id=inu.id, code=c.sample_id, sample_type="worker",
                              platform="pore_c" if c.is_pore_c else None, status="collected")
            db.add(s)
        s.colony_id = c.id
        s.queen_id = ensure_colony_queen(db, c).id
        stats["samples"] += 1
    for r in db.query(models.TraitRecord).order_by(models.TraitRecord.id).all():
        stats["observations"] += sync_trait_record(db, r)
        stats["trait_records"] += 1
    db.commit()
    return stats


# ========== 계보 ==========

def queen_parents(db: Session, q: Optional[models.Queen]) -> List[Tuple[int, str]]:
    """여왕의 부모: 모계(어미 여왕) + 부계(어미와 교미한 수벌을 낸 여왕들).

    여왕 자신의 교미 상대는 그 여왕 '딸들'의 부계이지 자신의 부계가 아니다.
    실제 아비 수벌은 어미의 교미 상대 중 하나지만 어느 것인지 모르므로 모두 부계 후보로 둔다.
    """
    if q is None or not q.mother_queen_id:
        return []
    out = [(q.mother_queen_id, "dam")]
    for m in db.query(models.Mating).filter(models.Mating.queen_id == q.mother_queen_id).all():
        out += [(s.sire_queen_id, "sire") for s in m.sires if s.sire_queen_id]
    return out
