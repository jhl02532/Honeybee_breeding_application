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
