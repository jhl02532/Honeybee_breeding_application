"""전체 내보내기: 모든 테이블 CSV + 분석용 긴 표 + 코드표를 zip 하나로 묶는다.

비밀번호 해시는 넣지 않는다. 플랫폼이 멈춰도 이 묶음만으로 기록을 옮기거나 R 로 분석할 수 있어야 한다.
"""
import csv
import datetime
import io
import json
import zipfile

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import field_traits, models
from .database import Base

USER_COLUMNS = ["id", "username", "role", "full_name", "farm_name"]

LONG_COLUMNS = [
    "group_code", "species", "year", "farm", "apiary", "round_no", "visit_date", "visit_status",
    "hive_code", "colony_code", "queen_tag", "queen_status", "trait_code", "trait_name", "value", "unit",
    "assessor",
]

README = """K-BEE BANK 전체 내보내기
만든 시각(UTC): {now}

[파일]
- tables/<테이블>.csv : DB 테이블 원본. 열 이름은 DB 와 같다. users 는 비밀번호 해시를 뺐다.
- field_long.csv : 현장 기록 형질 값을 한 줄에 하나씩 편 분석용 표.
- codebook.json : 회차, 여왕 상태, 교미 방식, 사건 종류, 형질 사전(단위·범위·회차·종).
- counts.csv : 테이블별 행 수.

[주요 연결]
- 봉군 colonies.id ← test_group_colonies.colony_id, field_records.colony_id, field_events.colony_id, samples.colony_id
- 여왕 queens.id ← colony_queens.queen_id(재임 기간 start_date~end_date), field_records.queen_id, samples.queen_id
- 어미 queens.mother_queen_id → queens.id, 교미 matings.queen_id → queens.id, 수벌군 mating_sires.sire_queen_id → queens.id
- 방문 field_visits.id ← field_records.visit_id, trait_observations.visit_id, samples.visit_id
- 형질 값 trait_observations(visit_id 가 있으면 현장 기록, legacy_record_id 가 있으면 v1 기록 이전분)
- 값이 비어 있으면 측정 안 함, field_records.unknown_json 에 있으면 모름.
- 수정 이력 record_revisions(table_name, record_id, field, old_value, new_value)
"""


def _csv(rows, columns) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(columns)
    for r in rows:
        w.writerow(["" if v is None else v for v in r])
    return ("﻿" + buf.getvalue()).encode("utf-8")


def _field_long(db: Session):
    O = models.TraitObservation
    q = (db.query(O, models.FieldVisit, models.TestGroup, models.Apiary, models.Colony, models.Queen,
                  models.TestGroupColony, models.FieldRecord, models.TraitDefinition, models.User)
         .join(models.FieldVisit, models.FieldVisit.id == O.visit_id)
         .join(models.TestGroup, models.TestGroup.id == models.FieldVisit.group_id)
         .join(models.Apiary, models.Apiary.id == models.TestGroup.apiary_id)
         .join(models.Colony, models.Colony.id == O.colony_id)
         .outerjoin(models.Queen, models.Queen.id == O.queen_id)
         .outerjoin(models.TestGroupColony, (models.TestGroupColony.group_id == models.TestGroup.id)
                    & (models.TestGroupColony.colony_id == O.colony_id))
         .outerjoin(models.FieldRecord, (models.FieldRecord.visit_id == O.visit_id)
                    & (models.FieldRecord.colony_id == O.colony_id))
         .outerjoin(models.TraitDefinition, models.TraitDefinition.code == O.trait_code)
         .outerjoin(models.User, models.User.id == models.FieldRecord.assessor_id)
         .order_by(models.TestGroup.code, models.FieldVisit.round_no, models.TestGroupColony.hive_code, O.trait_code))
    for o, v, g, a, c, qn, m, rec, td, u in q.all():
        yield [g.code, g.species, g.year, a.owner, a.name, v.round_no, v.date, v.status,
               m.hive_code if m else None, c.code, qn.tag if qn else None, rec.queen_status if rec else None,
               o.trait_code, td.name_ko if td else None, o.value, td.unit if td else None,
               u.username if u else None]


def build_export_zip(db: Session) -> bytes:
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    out = io.BytesIO()
    counts = []
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for table in Base.metadata.sorted_tables:
            cols = [c.name for c in table.columns]
            if table.name == "users":
                cols = [c for c in USER_COLUMNS if c in cols]
            rows = db.execute(select(*[table.c[c] for c in cols]).order_by(*table.primary_key.columns)).all()
            z.writestr(f"tables/{table.name}.csv", _csv(rows, cols))
            counts.append((table.name, len(rows)))
        long_rows = list(_field_long(db))
        z.writestr("field_long.csv", _csv(long_rows, LONG_COLUMNS))
        counts.append(("field_long", len(long_rows)))
        z.writestr("codebook.json", json.dumps({
            "rounds": field_traits.ROUNDS,
            "queen_status": field_traits.QUEEN_STATUS,
            "mating_methods": field_traits.MATING_METHODS,
            "queen_origins": field_traits.QUEEN_ORIGINS,
            "event_types": field_traits.EVENT_TYPES,
            "traits": [{**t, "species": list(t["species"])} for t in field_traits.FIELD_TRAITS],
        }, ensure_ascii=False, indent=2))
        z.writestr("counts.csv", _csv(counts, ["table", "rows"]))
        z.writestr("README.txt", README.format(now=now))
    return out.getvalue()
