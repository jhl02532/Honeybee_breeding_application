"""반수이배체 근연계수·근교계수 계산을 알려진 값으로 확인한다 (메모리 SQLite, 운영 DB 와 무관).

실행: cd backend && python scripts/check_kinship.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models, v2_service
from app.database import Base

engine = create_engine("sqlite://")
Base.metadata.create_all(engine)
db = sessionmaker(bind=engine)()
ds = models.Dataset(code="toy", name="toy", kind="simulated", visible_to="researcher")
db.add(ds)
db.flush()
failed = 0


def queen(tag, mother=None):
    q = models.Queen(dataset_id=ds.id, tag=tag, mother_queen_id=mother.id if mother else None)
    db.add(q)
    db.flush()
    return q


def mate(q, sires, n_drones=None):
    m = models.Mating(queen_id=q.id, method="instrumental", est_n_drones=n_drones)
    db.add(m)
    db.flush()
    for s, w in sires:
        db.add(models.MatingSire(mating_id=m.id, sire_queen_id=s.id, share=w))
    db.flush()


def check(label, got, expect):
    global failed
    ok = abs(got - expect) < 1e-9
    failed += 0 if ok else 1
    print(f"{'OK ' if ok else 'FAIL'} {label}: {got:.4f} (기대 {expect})")


A, B, C = queen("A"), queen("B"), queen("C")
mate(A, [(B, 1.0)])                       # A 가 B 의 수벌들과 교미
X, Y = queen("X", A), queen("Y", A)       # A 의 딸 둘
A2 = queen("A2")
mate(A2, [(B, 1.0)], n_drones=1)          # 수벌 한 마리 인공수정
X2, Y2 = queen("X2", A2), queen("Y2", A2)
mate(X, [(Y, 1.0)])                       # 자매의 수벌과 교미
Z = queen("Z", X)

k = v2_service.Kinship(db, [A.id])
check("어미-딸 θ(X, A)", k.theta(X.id, A.id), 0.25)
check("수벌 생산 여왕-딸 θ(X, B)", k.theta(X.id, B.id), 0.25)
check("다른 수벌 반자매 θ(X, Y)", k.theta(X.id, Y.id), 0.25)
check("같은 수벌 슈퍼시스터 θ(X2, Y2)", k.theta(X2.id, Y2.id), 0.375)
check("딸 × 어미 수벌 교배 F", k.cross_inbreeding(X.id, [(A.id, 1.0)]), 0.25)
check("자매 수벌 교배로 난 Z 의 F", k.inbreeding(Z.id), 0.25)
check("Z 자기 근연계수 θ(Z, Z)", k.theta(Z.id, Z.id), 0.625)
check("무관한 교배 F", k.cross_inbreeding(X.id, [(C.id, 1.0)]), 0.0)
sys.exit(1 if failed else 0)
