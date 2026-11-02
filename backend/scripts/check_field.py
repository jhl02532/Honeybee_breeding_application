"""현장 기록 API 점검. 임시 SQLite 로 실행한다: python backend/scripts/check_field.py"""
import os
import sys
import tempfile

db_dir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{db_dir}/field.db"
os.environ.setdefault("JWT_SECRET_KEY", "field-check-only")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient  # noqa: E402

from app import auth, models  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402


def check(label, condition, detail=""):
    print(("OK  " if condition else "FAIL"), label, detail if not condition else "")
    if not condition:
        check.failed += 1


check.failed = 0

with TestClient(app) as client:
    db = SessionLocal()
    users = {}
    for name, role in [("res", "researcher"), ("adm", "admin"), ("far", "farmer")]:
        user = models.User(username=name, hashed_password="x", role=role)
        db.add(user)
        db.flush()
        users[role] = {"Authorization": "Bearer " + auth.create_access_token({"sub": str(user.id)})}
    apiary = models.Apiary(name="시범 양봉장", owner="far")
    db.add(apiary)
    db.flush()
    colonies = [models.Colony(code=f"T-{i}", apiary_id=apiary.id) for i in range(3)]
    db.add_all(colonies)
    db.flush()
    queen = models.Queen(tag="Q0", dataset_id=db.query(models.Dataset).filter_by(code="farm").first().id)
    db.add(queen)
    db.flush()
    db.add(models.ColonyQueen(colony_id=colonies[0].id, queen_id=queen.id, start_date="2027-02-20"))
    db.commit()
    ids = [c.id for c in colonies]
    apiary_id = apiary.id
    db.close()
    res, adm, far = users["researcher"], users["admin"], users["farmer"]

    check("농가는 사전 접근 불가", client.get("/api/v2/field/dictionary", headers=far).status_code == 403)
    r = client.post("/api/v2/field/groups", headers=res, json={
        "code": "KR-AM-1-2027", "apiary_id": apiary_id, "species": "mellifera", "year": 2027,
        "hives": [{"colony_id": c, "hive_code": f"H{i}"} for i, c in enumerate(ids)]})
    check("검정군 생성, 10군 미만 경고", r.status_code == 201 and len(r.json()["warnings"]) == 1, r.text)
    group = r.json()["id"]
    r = client.post("/api/v2/field/groups", headers=res, json={
        "code": "X", "apiary_id": apiary_id, "species": "mellifera", "year": 2027,
        "hives": [{"colony_id": ids[0], "hive_code": "A"}, {"colony_id": ids[1], "hive_code": "A"}]})
    check("벌통 ID 중복 거부", r.status_code == 422, r.text)

    r = client.post("/api/v2/field/visits", headers=res, json={"group_id": group, "round_no": 1, "date": "2027-03-10"})
    check("1회차 생성", r.status_code == 201, r.text)
    visit = r.json()["id"]
    form = client.get(f"/api/v2/field/visits/{visit}", headers=res).json()
    codes = {f["code"] for f in form["fields"]}
    check("1회차 항목", codes == {"frames_bees", "frames_brood", "sacbrood_score", "chalkbrood_score",
                                 "foulbrood_efb_score"}, str(codes))
    check("미입력 봉군 표시", form["colonies"][0]["missing"] == ["기록 없음"])

    url = f"/api/v2/field/visits/{visit}/records/{ids[0]}"
    check("범위 밖 거부", client.put(url, headers=res, json={"values": {"frames_bees": 99}}).status_code == 422)
    check("¼ 단위 아닌 값 거부", client.put(url, headers=res, json={"values": {"frames_bees": 3.1}}).status_code == 422)
    check("다른 회차 항목 거부", client.put(url, headers=res, json={"values": {"aggression": 3}}).status_code == 422)
    r = client.put(url, headers=res, json={"queen_status": "QR", "boxes": 1, "supers": 0,
                                           "values": {"frames_bees": 6.25, "sacbrood_score": 1}})
    body = r.json()
    check("저장, 필수 완료", r.status_code == 200 and body["missing"] == [], r.text)
    check("여왕 교체 6주 경고", any("교체" in w for w in body["warnings"]), str(body["warnings"]))
    r = client.put(url, headers=res, json={"queen_status": "NS", "boxes": 1, "supers": 0,
                                           "values": {"frames_bees": 7, "sacbrood_score": 1}})
    db = SessionLocal()
    check("수정 이력", db.query(models.RecordRevision).count() == 2, str(db.query(models.RecordRevision).count()))
    obs = db.query(models.TraitObservation).filter_by(colony_id=ids[0], trait_code="frames_bees").all()
    check("형질 1행 유지와 여왕 연결", len(obs) == 1 and obs[0].value == 7 and obs[0].queen_id is not None)
    db.close()

    url1 = f"/api/v2/field/visits/{visit}/records/{ids[1]}"
    r = client.put(url1, headers=res, json={"queen_status": "QL", "boxes": 1, "unknown": ["sacbrood_score"],
                                            "values": {"frames_bees": 2}})
    check("모름 처리로 필수 충족", r.json()["missing"] == [], r.text)
    check("여왕 없음 경고", any("여왕이 없습니다" in w for w in r.json()["warnings"]))
    sample = f"/api/v2/field/visits/{visit}/samples"
    r = client.post(sample, headers=res, json={"colony_id": ids[1], "code": "T1", "sample_type": "drone_pool", "n_individuals": 10})
    check("무왕군 수벌 시료 거부", r.status_code == 422, r.text)
    r = client.post(sample, headers=res, json={"colony_id": ids[0], "code": "T2", "sample_type": "drone_pool", "n_individuals": 5, "storage": "F1-A"})
    check("저수량 경고", r.status_code == 201 and any("미만" in w for w in r.json()["warnings"]), r.text)
    check("튜브 번호 중복 거부", client.post(sample, headers=res, json={"colony_id": ids[0], "code": "T2", "sample_type": "worker_pool"}).status_code == 409)

    r = client.post(f"/api/v2/field/visits/{visit}/close", headers=res)
    check("미완료 봉군이 있으면 마감 안 됨", r.json()["closed"] is False and r.json()["incomplete"][0]["hive_code"] == "H2", r.text)
    r = client.post(f"/api/v2/field/visits/{visit}/close?force=true", headers=res)
    check("확인 후 마감", r.json()["closed"] is True)
    check("마감 후 수정 거부", client.put(url, headers=res, json={"values": {}}).status_code == 409)
    check("연구자는 다시 열기 불가", client.post(f"/api/v2/field/visits/{visit}/reopen", headers=res).status_code == 403)
    check("관리자 다시 열기", client.post(f"/api/v2/field/visits/{visit}/reopen", headers=adm).status_code == 200)

    r = client.post("/api/v2/field/visits", headers=res, json={"group_id": group, "round_no": 2, "date": "2027-06-20"})
    v2 = r.json()["id"]
    r = client.put(f"/api/v2/field/visits/{v2}/records/{ids[0]}", headers=res, json={
        "queen_status": "QR", "boxes": 1, "supers": 1,
        "values": {"frames_bees": 14, "aggression": 2, "swarming_score": 1, "sacbrood_score": 1}})
    check("세력 급변 경고", any("크게" in w for w in r.json()["warnings"]), r.text)
    check("6주 지나면 교체 경고 없음", not any("교체" in w for w in r.json()["warnings"]), r.text)
    check("0kg 채밀 저장", client.post("/api/v2/field/events", headers=res, json={
        "colony_id": ids[0], "event_type": "honey_harvest", "date": "2027-06-01", "value": 0}).status_code == 201)
    check("채밀량 없으면 거부", client.post("/api/v2/field/events", headers=res, json={
        "colony_id": ids[0], "event_type": "honey_harvest", "date": "2027-06-01"}).status_code == 422)
    check("사건 목록", len(client.get(f"/api/v2/field/events?group_id={group}", headers=res).json()) == 1)
    check("검정군 목록", client.get("/api/v2/field/groups", headers=res).json()[0]["n_colonies"] == 3)

sys.exit(1 if check.failed else 0)
