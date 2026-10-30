"""v2 형질·유전체 연결 구조의 공통 로직.

- 기준 데이터(데이터 세트, 형질 정의) 시드
- 기존 v1 기록(queen_tag, mother_colony_id, sample_id, trait_records)을 v2 테이블로 잇기
- CSV 행 단위 적재 (API 와 scripts/ 에서 같이 쓴다)
"""
import json
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy.orm import Session

from . import models


# ========== 기준 데이터 ==========

DATASETS = [
    # code, name, kind, visible_to, citation, doi, license
    ("farm", "농가 입력 기록", "farm", "all", None, None, None),
    ("inu_2026", "인천대 2026 채집 시료", "own_research", "researcher", None, None, None),
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


# ========== CSV 행 단위 적재 ==========
# 각 함수는 (적재 건수, 오류 목록)을 돌려준다. dry_run 이면 검사만 하고 되돌린다.
# 같은 (dataset, 코드) 를 다시 올리면 새로 만들지 않고 갱신한다.

def _f(v) -> Optional[float]:
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.upper() in ("NA", "NAN", "NULL", "-"):
        return None
    return float(s)


def _round2(v) -> Optional[float]:
    x = _f(v)
    return None if x is None else round(x, 2)


def _queen_by_tag(db: Session, dataset_id: int, tag: Optional[str]) -> Optional[models.Queen]:
    if not tag:
        return None
    return db.query(models.Queen).filter(models.Queen.dataset_id == dataset_id, models.Queen.tag == tag).first()


def import_queens(db: Session, ds: models.Dataset, rows: Iterable[dict]) -> Tuple[int, List[str]]:
    """열: tag, mother_tag, species, line, birth_date, origin, external_id, ancestry_json"""
    n, errors, pending_mothers, seen = 0, [], [], {}
    for i, r in enumerate(rows, start=2):
        tag = (r.get("tag") or "").strip()
        if not tag:
            errors.append(f"{i}행: tag 가 비어 있음")
            continue
        q = seen.get(tag) or _queen_by_tag(db, ds.id, tag) or models.Queen(dataset_id=ds.id, tag=tag)
        seen[tag] = q
        for k in ("species", "line", "birth_date", "origin", "external_id", "ancestry_json"):
            if r.get(k) not in (None, ""):
                setattr(q, k, r[k])
        db.add(q)
        if r.get("mother_tag"):
            pending_mothers.append((i, q, r["mother_tag"]))
        n += 1
    db.flush()
    for i, q, mtag in pending_mothers:
        m = _queen_by_tag(db, ds.id, mtag)
        if m is None:
            errors.append(f"{i}행: 모계 여왕 '{mtag}' 없음")
        else:
            q.mother_queen_id = m.id
    return n, errors


def import_matings(db: Session, ds: models.Dataset, rows: Iterable[dict]) -> Tuple[int, List[str]]:
    """열: queen_tag, method, date, location, latitude, longitude, est_n_drones, sire_queen_tags(;로 구분), sire_shares(;)

    한 여왕의 교미는 (queen, date, method) 로 구분해 다시 올리면 수벌 목록을 바꾼다.
    """
    n, errors = 0, []
    for i, r in enumerate(rows, start=2):
        q = _queen_by_tag(db, ds.id, r.get("queen_tag"))
        if q is None:
            errors.append(f"{i}행: 여왕 '{r.get('queen_tag')}' 없음")
            continue
        method = r.get("method") or "natural_open"
        m = (db.query(models.Mating)
             .filter(models.Mating.queen_id == q.id, models.Mating.method == method,
                     models.Mating.date == (r.get("date") or None)).first())
        if m is None:
            m = models.Mating(queen_id=q.id, method=method, date=r.get("date") or None)
            db.add(m)
        m.location = r.get("location") or None
        m.latitude, m.longitude = _round2(r.get("latitude")), _round2(r.get("longitude"))
        m.est_n_drones = int(_f(r.get("est_n_drones"))) if _f(r.get("est_n_drones")) is not None else None
        m.sires.clear()
        tags = [t for t in (r.get("sire_queen_tags") or "").split(";") if t.strip()]
        shares = [s for s in (r.get("sire_shares") or "").split(";")]
        for j, t in enumerate(tags):
            sq = _queen_by_tag(db, ds.id, t.strip())
            if sq is None:
                errors.append(f"{i}행: 수벌 쪽 여왕 '{t}' 없음")
                continue
            share = _f(shares[j]) if j < len(shares) else None
            m.sires.append(models.MatingSire(sire_queen_id=sq.id, share=share))
        n += 1
    return n, errors


SAMPLE_TYPES = {"queen", "worker", "worker_pool", "drone", "drone_pool", "larva"}


def import_samples(db: Session, ds: models.Dataset, rows: Iterable[dict]) -> Tuple[int, List[str]]:
    """열: code, queen_tag, colony_code, sample_type, n_individuals, collected_date, latitude, longitude,
    location, platform, biosample, run_accessions, file_uri, status, attributes_json"""
    n, errors, seen = 0, [], {}
    for i, r in enumerate(rows, start=2):
        code = (r.get("code") or "").strip()
        st = r.get("sample_type") or "worker"
        if not code:
            errors.append(f"{i}행: code 가 비어 있음")
            continue
        if st not in SAMPLE_TYPES:
            errors.append(f"{i}행: sample_type '{st}' 은 허용되지 않음")
            continue
        if code in seen:
            errors.append(f"{i}행: 시료 '{code}' 가 파일 안에서 중복 — 뒤의 행으로 덮어씀")
        s = (seen.get(code)
             or db.query(models.Sample).filter(models.Sample.dataset_id == ds.id, models.Sample.code == code).first()
             or models.Sample(dataset_id=ds.id, code=code))
        seen[code] = s
        s.sample_type = st
        if r.get("queen_tag"):
            q = _queen_by_tag(db, ds.id, r["queen_tag"])
            if q is None:
                errors.append(f"{i}행: 여왕 '{r['queen_tag']}' 없음")
            else:
                s.queen_id = q.id
        if r.get("colony_code"):
            c = db.query(models.Colony).filter(models.Colony.code == r["colony_code"]).first()
            if c is None:
                errors.append(f"{i}행: 봉군 '{r['colony_code']}' 없음")
            else:
                s.colony_id = c.id
        ni = _f(r.get("n_individuals"))
        s.n_individuals = int(ni) if ni is not None else None
        s.latitude, s.longitude = _round2(r.get("latitude")), _round2(r.get("longitude"))
        for k in ("collected_date", "location", "platform", "biosample", "run_accessions", "file_uri",
                  "status", "attributes_json"):
            if r.get(k) not in (None, ""):
                setattr(s, k, r[k])
        db.add(s)
        n += 1
    return n, errors


def import_trait_observations(db: Session, ds: models.Dataset, rows: Iterable[dict]) -> Tuple[int, List[str]]:
    """열: trait_code, value, date, queen_tag | colony_code | sample_code, method_note

    같은 (데이터 세트, 형질, 대상, 날짜) 값이 있으면 덮어쓴다.
    """
    defs = {d.code: d for d in db.query(models.TraitDefinition).all()}
    n, errors = 0, []
    for i, r in enumerate(rows, start=2):
        code = r.get("trait_code")
        td = defs.get(code)
        if td is None:
            errors.append(f"{i}행: 형질 '{code}' 정의 없음")
            continue
        try:
            v = _f(r.get("value"))
        except ValueError:
            errors.append(f"{i}행: 값 '{r.get('value')}' 이 숫자가 아님")
            continue
        if v is None:
            continue  # 측정 안 함은 저장하지 않는다
        if (td.min_value is not None and v < td.min_value) or (td.max_value is not None and v > td.max_value):
            errors.append(f"{i}행: {code} 값 {v} 이 범위({td.min_value}~{td.max_value}) 밖")
            continue
        queen = _queen_by_tag(db, ds.id, r.get("queen_tag"))
        sample = None
        if r.get("sample_code"):
            sample = db.query(models.Sample).filter(models.Sample.dataset_id == ds.id,
                                                    models.Sample.code == r["sample_code"]).first()
        colony = None
        if r.get("colony_code"):
            colony = db.query(models.Colony).filter(models.Colony.code == r["colony_code"]).first()
        if queen is None and sample is None and colony is None:
            errors.append(f"{i}행: 대상(queen_tag/colony_code/sample_code)을 찾지 못함")
            continue
        q = db.query(models.TraitObservation).filter(
            models.TraitObservation.dataset_id == ds.id, models.TraitObservation.trait_code == code,
            models.TraitObservation.date == (r.get("date") or None),
            models.TraitObservation.queen_id == (queen.id if queen else None),
            models.TraitObservation.sample_id == (sample.id if sample else None),
            models.TraitObservation.colony_id == (colony.id if colony else None))
        obs = q.first() or models.TraitObservation(dataset_id=ds.id, trait_code=code)
        obs.value, obs.date = v, r.get("date") or None
        obs.queen_id = queen.id if queen else (sample.queen_id if sample else None)
        obs.sample_id = sample.id if sample else None
        obs.colony_id = colony.id if colony else None
        obs.method_note = r.get("method_note") or None
        db.add(obs)
        n += 1
    return n, errors


def import_markers(db: Session, rows: Iterable[dict]) -> Tuple[int, List[str]]:
    """열: panel, marker_code, assembly, chrom, pos, ref, alt, trait_code, effect, effect_allele,
    allele_freq, p_value, population, source"""
    defs = {d.code for d in db.query(models.TraitDefinition.code).all()}
    n, errors = 0, []
    for i, r in enumerate(rows, start=2):
        if not r.get("panel") or not r.get("marker_code"):
            errors.append(f"{i}행: panel·marker_code 필요")
            continue
        tc = r.get("trait_code") or None
        if tc and tc not in defs:
            errors.append(f"{i}행: 형질 '{tc}' 정의 없음")
            continue
        pop = r.get("population") or None
        m = (db.query(models.Marker).filter(models.Marker.panel == r["panel"],
                                            models.Marker.marker_code == r["marker_code"],
                                            models.Marker.trait_code == tc,
                                            models.Marker.population == pop).first()
             or models.Marker(panel=r["panel"], marker_code=r["marker_code"], trait_code=tc, population=pop))
        for k in ("assembly", "chrom", "ref", "alt", "effect_allele", "source"):
            if r.get(k) not in (None, ""):
                setattr(m, k, r[k])
        pos = _f(r.get("pos"))
        m.pos = int(pos) if pos is not None else None
        m.effect, m.allele_freq, m.p_value = _f(r.get("effect")), _f(r.get("allele_freq")), _f(r.get("p_value"))
        db.add(m)
        n += 1
    return n, errors


def import_genotypes(db: Session, ds: models.Dataset, rows: Iterable[dict]) -> Tuple[int, List[str]]:
    """열: sample_code, panel, marker_code, gt, af, depth (gt 또는 af 중 하나 이상)"""
    n, errors = 0, []
    sample_cache: Dict[str, Optional[models.Sample]] = {}
    marker_cache: Dict[Tuple[str, str], Optional[int]] = {}
    for i, r in enumerate(rows, start=2):
        sc = r.get("sample_code")
        if sc not in sample_cache:
            sample_cache[sc] = db.query(models.Sample).filter(models.Sample.dataset_id == ds.id,
                                                              models.Sample.code == sc).first()
        s = sample_cache[sc]
        key = (r.get("panel"), r.get("marker_code"))
        if key not in marker_cache:
            m = db.query(models.Marker).filter(models.Marker.panel == key[0], models.Marker.marker_code == key[1]).first()
            marker_cache[key] = m.id if m else None
        mid = marker_cache[key]
        if s is None or mid is None:
            errors.append(f"{i}행: 시료 '{sc}' 또는 마커 '{key[1]}' 없음")
            continue
        gt, af = (r.get("gt") or None), _f(r.get("af"))
        if gt is None and af is None:
            errors.append(f"{i}행: gt·af 가 모두 비어 있음")
            continue
        if af is not None and not 0 <= af <= 1:
            errors.append(f"{i}행: af {af} 가 0~1 밖")
            continue
        g = (db.query(models.SampleGenotype).filter(models.SampleGenotype.sample_id == s.id,
                                                    models.SampleGenotype.marker_id == mid).first()
             or models.SampleGenotype(sample_id=s.id, marker_id=mid))
        g.gt, g.af = gt, af
        d = _f(r.get("depth"))
        g.depth = int(d) if d is not None else None
        db.add(g)
        n += 1
    return n, errors


def import_breeding_values(db: Session, ds: models.Dataset, rows: Iterable[dict]) -> Tuple[int, List[str]]:
    """열: queen_tag, trait_code, value, accuracy, model, model_version, run_date"""
    defs = {d.code for d in db.query(models.TraitDefinition.code).all()}
    n, errors = 0, []
    for i, r in enumerate(rows, start=2):
        q = _queen_by_tag(db, ds.id, r.get("queen_tag"))
        if q is None or r.get("trait_code") not in defs or not r.get("model"):
            errors.append(f"{i}행: 여왕·형질·model 확인 필요")
            continue
        bv = (db.query(models.BreedingValue).filter(
            models.BreedingValue.dataset_id == ds.id, models.BreedingValue.queen_id == q.id,
            models.BreedingValue.trait_code == r["trait_code"], models.BreedingValue.model == r["model"],
            models.BreedingValue.model_version == (r.get("model_version") or None)).first()
            or models.BreedingValue(dataset_id=ds.id, queen_id=q.id, trait_code=r["trait_code"], model=r["model"],
                                    model_version=r.get("model_version") or None))
        bv.value, bv.accuracy, bv.run_date = _f(r.get("value")), _f(r.get("accuracy")), r.get("run_date") or None
        if bv.value is None:
            errors.append(f"{i}행: value 가 비어 있음")
            continue
        db.add(bv)
        n += 1
    return n, errors


IMPORTERS = {
    "queens": import_queens,
    "matings": import_matings,
    "samples": import_samples,
    "traits": import_trait_observations,
    "genotypes": import_genotypes,
    "breeding_values": import_breeding_values,
}


def run_import(db: Session, kind: str, rows: List[dict], dataset_code: Optional[str], dry_run: bool) -> dict:
    if kind == "markers":
        n, errors = import_markers(db, rows)
    else:
        ds = get_dataset(db, dataset_code or "")
        if ds is None:
            return {"imported": 0, "errors": [f"데이터 세트 '{dataset_code}' 없음"], "dry_run": dry_run}
        n, errors = IMPORTERS[kind](db, ds, rows)
    if dry_run:
        db.rollback()
    else:
        db.commit()
    return {"imported": n, "errors": errors[:200], "error_count": len(errors), "dry_run": dry_run}


def ancestry_dict(q: models.Queen) -> Optional[dict]:
    if not q.ancestry_json:
        return None
    try:
        return json.loads(q.ancestry_json)
    except ValueError:
        return None


# ========== 교배 예측 ==========
# 꿀벌: 딸(여왕·일벌) = 어미 여왕의 생식세포(감수분열) × 수벌(반수체, 수벌을 낳은 여왕의 생식세포 그대로).
# 마커별로 어미 쪽 대립유전자 1 확률 pd = dosage(어미)/2, 수벌 쪽 pq = Σ 비율 × dosage(수벌 생산 여왕)/2.
# 수벌 쪽 유전형이 없으면 마커의 집단 빈도(allele_freq)로 대신하고 그 수를 따로 센다.

def _dosage(gt: Optional[str], af: Optional[float]) -> Optional[float]:
    if gt:
        alleles = gt.replace("|", "/").split("/")
        return float(sum(1 for a in alleles if a == "1")) * (2 / len(alleles))  # 수벌(반수체) 1 → 2 로 환산
    if af is not None:
        return 2 * af
    return None


def queen_dosages(db: Session, queen_ids: List[int], panel: Optional[str] = None) -> Dict[int, Dict[Tuple[str, str], float]]:
    """여왕별 {(panel, marker_code): 대립유전자 1 개수(0–2)}. 여왕 시료(queen) 를 먼저, 없으면 다른 시료를 쓴다."""
    q = (db.query(models.Sample.queen_id, models.Sample.sample_type, models.Marker.panel, models.Marker.marker_code,
                  models.SampleGenotype.gt, models.SampleGenotype.af)
         .join(models.SampleGenotype, models.SampleGenotype.sample_id == models.Sample.id)
         .join(models.Marker, models.Marker.id == models.SampleGenotype.marker_id)
         .filter(models.Sample.queen_id.in_(queen_ids)))
    if panel:
        q = q.filter(models.Marker.panel == panel)
    out: Dict[int, Dict[Tuple[str, str], float]] = {}
    rank: Dict[Tuple[int, Tuple[str, str]], int] = {}
    for qid, st, pnl, code, gt, af in q.all():
        d = _dosage(gt, af)
        if d is None:
            continue
        key = (pnl, code)
        r = 0 if st == "queen" else 1
        if (qid, key) in rank and rank[(qid, key)] <= r:
            continue
        rank[(qid, key)] = r
        out.setdefault(qid, {})[key] = d
    return out


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


def ancestors(db: Session, queen_id: int, depth: int = 3) -> Dict[int, int]:
    """{조상 여왕 id: 몇 대 위} (모계와 부계 후보 모두)"""
    found: Dict[int, int] = {}
    frontier = [queen_id]
    for gen in range(1, depth + 1):
        nxt = []
        for qid in frontier:
            for p, _ in queen_parents(db, db.query(models.Queen).get(qid)):
                if p not in found:
                    found[p] = gen
                    nxt.append(p)
        frontier = nxt
    return found


# ========== 근연계수·근교계수 (반수이배체 계통) ==========
# 계통은 여왕만으로 적는다. 여왕 X 의 대립유전자는 반은 어미 D 의 생식세포, 반은 수벌에서 오며,
# 수벌은 수벌 생산 여왕 P 의 생식세포 그대로이므로 θ(수벌, Y) = θ(P, Y).
# X 의 아비 수벌이 어느 P 에서 왔는지는 모르므로 어미의 교미 기록 비율 w 로 평균한다.
#   θ(X, Y) = ½ θ(D, Y) + ½ Σ w θ(P, Y)          (X 가 Y 보다 뒤 세대)
#   θ(X, X) = ½ (1 + F_X),   F_X = Σ w θ(D, P)
# 같은 어미의 딸끼리는 같은 수벌을 받았을 확률(1 / (w·교미 수벌 수))만큼 부계 대립유전자가 같다.
# 근연계수 θ 는 두 여왕에서 무작위로 뽑은 대립유전자가 같은 조상에서 온 확률, 딸의 근교계수는 θ(어미, 수벌 생산 여왕).
# 계통이 끊긴 여왕(어미 미상)은 서로 무관한 기초 개체로 본다.

class Kinship:
    def __init__(self, db: Session, queen_ids: Iterable[int] = ()):
        self.db = db
        self._dam: Dict[int, Optional[int]] = {}
        self._pat: Dict[int, Tuple[List[Tuple[int, float]], Optional[int]]] = {}
        self._gen: Dict[int, int] = {}
        self._memo: Dict[Tuple[int, int], float] = {}
        ids = list(queen_ids)
        if ids:
            ds = {r[0] for r in db.query(models.Queen.dataset_id).filter(models.Queen.id.in_(ids)).all()}
            self._load(db.query(models.Queen.id, models.Queen.mother_queen_id).filter(models.Queen.dataset_id.in_(ds)).all())

    def _load(self, rows) -> None:
        for qid, mid in rows:
            self._dam[qid] = mid
        dams = {m for _, m in rows if m}
        ms = self.db.query(models.Mating).filter(models.Mating.queen_id.in_(dams)).all() if dams else []
        by_dam: Dict[int, List[models.Mating]] = {}
        for m in ms:
            by_dam.setdefault(m.queen_id, []).append(m)
        for d in dams:
            self._pat[d] = self._mixture(by_dam.get(d, []))

    @staticmethod
    def _mixture(matings: List[models.Mating]) -> Tuple[List[Tuple[int, float]], Optional[int]]:
        """어미의 교미 기록 → ([(수벌 생산 여왕, 비율)], 교미 수벌 수). 출처 미상 수벌은 분모에만 들어간다."""
        raw: List[Tuple[Optional[int], float]] = []
        n_drones = 0
        for m in matings:
            if not m.sires:
                continue
            known = [s.share for s in m.sires if s.share is not None]
            fill = (sum(known) / len(known)) if known else 1.0 / len(m.sires)
            raw += [(s.sire_queen_id, s.share if s.share is not None else fill) for s in m.sires]
            n_drones = n_drones + m.est_n_drones if (n_drones is not None and m.est_n_drones) else None
        total = sum(w for _, w in raw)
        if total <= 0:
            return [], None
        mix: Dict[int, float] = {}
        for sid, w in raw:
            if sid:
                mix[sid] = mix.get(sid, 0.0) + w / total
        return list(mix.items()), (n_drones or None)

    def dam(self, qid: int) -> Optional[int]:
        if qid not in self._dam:
            q = self.db.query(models.Queen).get(qid)
            self._dam[qid] = q.mother_queen_id if q else None
        return self._dam[qid]

    def paternal(self, qid: int) -> Tuple[List[Tuple[int, float]], Optional[int]]:
        """여왕 qid 의 부계 후보 = 어미의 교미 상대"""
        d = self.dam(qid)
        if not d:
            return [], None
        if d not in self._pat:
            self._pat[d] = self._mixture(self.db.query(models.Mating).filter(models.Mating.queen_id == d).all())
        return self._pat[d]

    def generation(self, qid: int) -> int:
        if qid not in self._gen:
            self._gen[qid] = 0  # 순환 기록 방지
            d = self.dam(qid)
            if d:
                self._gen[qid] = 1 + max([self.generation(d)] + [self.generation(p) for p, _ in self.paternal(qid)[0]])
        return self._gen[qid]

    def inbreeding(self, qid: int) -> float:
        d = self.dam(qid)
        if not d:
            return 0.0
        return sum(w * self.theta(d, p) for p, w in self.paternal(qid)[0])

    def theta(self, a: int, b: int) -> float:
        if a == b:
            return 0.5 * (1 + self.inbreeding(a))
        key = (a, b) if a < b else (b, a)
        if key in self._memo:
            return self._memo[key]
        if self.generation(a) < self.generation(b):
            a, b = b, a
        da = self.dam(a)
        if not da:
            v = 0.0  # 두 여왕 모두 기초 개체
        elif da == self.dam(b):
            v = self._sisters(a)
        else:
            v = 0.5 * self.theta(da, b) + 0.5 * sum(w * self.theta(p, b) for p, w in self.paternal(a)[0])
        self._memo[key] = v
        return v

    def _sisters(self, a: int) -> float:
        """같은 어미의 두 딸: ¼[θ(D,D) + 2 Σ w θ(D,P) + θ(수벌, 수벌)]"""
        d = self.dam(a)
        mix, n = self.paternal(a)
        dd = self.theta(d, d)
        dp = sum(w * self.theta(d, p) for p, w in mix)
        pp = sum(wi * wj * self.theta(pi, pj) for pi, wi in mix for pj, wj in mix)
        if n:
            for p, w in mix:
                same = min(1.0, 1.0 / (w * n))  # 같은 수벌일 확률
                pp += w * w * same * (1 - self.theta(p, p))
        return 0.25 * (dd + 2 * dp + pp)

    def cross_inbreeding(self, dam_id: int, sires: List[Tuple[int, float]]) -> float:
        """어미 × 수벌 생산 여왕들(비율 합 1) → 딸(여왕·일벌)의 기대 근교계수"""
        return sum(w * self.theta(dam_id, s) for s, w in sires)


INBREEDING_LEVELS = [(0.125, "high"), (0.0625, "moderate")]  # 반형제 교배 F=0.125, 사촌 F≈0.0625


def inbreeding_level(f: float) -> str:
    for cut, label in INBREEDING_LEVELS:
        if f >= cut:
            return label
    return "low"


def predict_cross(db: Session, dam_id: int, sires: List[Tuple[int, float]], panel: Optional[str] = None) -> dict:
    """어미 여왕 × 수벌 생산 여왕들(비율) → 딸의 마커별 유전형 분포와 형질별 기대 마커 점수"""
    total = sum(s for _, s in sires) or 1.0
    sires = [(sid, s / total) for sid, s in sires]
    dos = queen_dosages(db, [dam_id] + [sid for sid, _ in sires], panel)
    dam = dos.get(dam_id, {})
    mq = db.query(models.Marker)
    if panel:
        mq = mq.filter(models.Marker.panel == panel)
    markers = [m for m in mq.all() if (m.panel, m.marker_code) in dam and m.effect is not None]
    rows, scores = [], {}
    for m in markers:
        key = (m.panel, m.marker_code)
        pd = dam[key] / 2
        pq, fallback = 0.0, 0.0
        for sid, share in sires:
            d = dos.get(sid, {}).get(key)
            if d is None:
                pq += share * (m.allele_freq if m.allele_freq is not None else 0.5)
                fallback += share
            else:
                pq += share * d / 2
        p11, p00 = pd * pq, (1 - pd) * (1 - pq)
        expected = m.effect * (pd + pq)
        sc = scores.setdefault(m.trait_code, {"trait_code": m.trait_code, "dam_score": 0.0, "expected_daughter_score": 0.0,
                                              "n_markers": 0, "n_markers_sire_fallback": 0})
        sc["dam_score"] += m.effect * dam[key]
        sc["expected_daughter_score"] += expected
        sc["n_markers"] += 1
        sc["n_markers_sire_fallback"] += 1 if fallback > 0.5 else 0
        rows.append({"marker_code": m.marker_code, "panel": m.panel, "trait_code": m.trait_code, "effect": m.effect,
                     "dam_dosage": dam[key], "p_dam": round(pd, 4), "p_drone": round(pq, 4),
                     "p_00": round(p00, 4), "p_01": round(1 - p11 - p00, 4), "p_11": round(p11, 4),
                     "expected_contribution": round(expected, 5), "sire_fallback_share": round(fallback, 3)})
    rows.sort(key=lambda r: -abs(r["effect"]))
    # 공통 조상(3대): 어미 쪽과 수벌 생산 여왕 쪽 조상(본인 포함)이 겹치면 근친
    dam_anc = {**ancestors(db, dam_id), dam_id: 0}
    warnings = []
    for sid, share in sires:
        sire_anc = {**ancestors(db, sid), sid: 0}
        common = set(dam_anc) & set(sire_anc)
        if common:
            closest = min(common, key=lambda a: dam_anc[a] + sire_anc[a])
            q = db.query(models.Queen).get(closest)
            warnings.append({"sire_queen_id": sid, "share": round(share, 3), "n_common": len(common),
                             "closest_common": q.tag if q else closest,
                             "dam_gen": dam_anc[closest], "sire_gen": sire_anc[closest]})
    kin = Kinship(db, [dam_id] + [sid for sid, _ in sires])
    f_daughter = kin.cross_inbreeding(dam_id, sires)
    inbreeding = {"expected_daughter_f": round(f_daughter, 4), "level": inbreeding_level(f_daughter),
                  "dam_f": round(kin.inbreeding(dam_id), 4),
                  "per_sire": [{"sire_queen_id": sid, "share": round(s, 3), "kinship": round(kin.theta(dam_id, sid), 4)}
                               for sid, s in sires]}
    for sc in scores.values():
        sc["dam_score"] = round(sc["dam_score"], 4)
        sc["expected_daughter_score"] = round(sc["expected_daughter_score"], 4)
    return {"dam_id": dam_id, "sires": [{"queen_id": sid, "share": round(s, 3), "has_genotype": sid in dos} for sid, s in sires],
            "dam_has_genotype": bool(dam), "traits": sorted(scores.values(), key=lambda r: r["trait_code"] or ""),
            "markers": rows, "inbreeding": inbreeding, "inbreeding_warnings": warnings}


def recorded_sires(db: Session, queen_id: int) -> List[Tuple[int, float]]:
    """여왕의 교미 기록에서 (수벌 생산 여왕, 비율). 비율이 없으면 같게 나눈다."""
    out: List[Tuple[int, float]] = []
    for m in db.query(models.Mating).filter(models.Mating.queen_id == queen_id).all():
        sires = [s for s in m.sires if s.sire_queen_id]
        for s in sires:
            out.append((s.sire_queen_id, s.share if s.share is not None else 1.0 / len(sires)))
    return out


def daughters_summary(db: Session, dam_id: int, panel: Optional[str] = None) -> dict:
    """어미의 실제 딸 여왕들(mother_queen_id) 마커 점수·참값 여왕 효과 평균 — 예측 검증용"""
    ds = [q.id for q in db.query(models.Queen).filter(models.Queen.mother_queen_id == dam_id).all()]
    if not ds:
        return {"n": 0}
    dos = queen_dosages(db, ds, panel)
    mq = db.query(models.Marker)
    if panel:
        mq = mq.filter(models.Marker.panel == panel)
    markers = [m for m in mq.all() if m.effect is not None]
    per_trait: Dict[str, List[float]] = {}
    freq: Dict[Tuple[str, str], List[float]] = {}
    for d in ds:
        g = dos.get(d)
        if not g:
            continue
        sc: Dict[str, float] = {}
        for m in markers:
            v = g.get((m.panel, m.marker_code))
            if v is None:
                continue
            sc[m.trait_code] = sc.get(m.trait_code, 0.0) + m.effect * v
            freq.setdefault((m.panel, m.marker_code), []).append(v / 2)
        for t, v in sc.items():
            per_trait.setdefault(t, []).append(v)
    bv: Dict[str, List[float]] = {}
    for b in db.query(models.BreedingValue).filter(models.BreedingValue.queen_id.in_(ds),
                                                   models.BreedingValue.model_version == "queen_effect").all():
        bv.setdefault(b.trait_code, []).append(b.value)
    mean = lambda xs: round(sum(xs) / len(xs), 4) if xs else None
    return {"n": len(ds), "n_genotyped": sum(1 for d in ds if dos.get(d)),
            "mean_marker_score": {t: mean(v) for t, v in per_trait.items()},
            "mean_true_queen_effect": {t: mean(v) for t, v in bv.items()},
            "allele_freq": {f"{k[0]}|{k[1]}": mean(v) for k, v in freq.items()}}
