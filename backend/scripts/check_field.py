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
from app.field_traits import fields_for  # noqa: E402
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
    check("1회차 응애 없음", "varroa_count" not in codes)

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
    r = client.post(sample, headers=res, json={"colony_id": ids[2], "code": "T3", "sample_type": "worker_pool"})
    check("여왕 없는 봉군 시료 거부", r.status_code == 422 and "여왕" in r.text, r.text)
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
    form2 = client.get(f"/api/v2/field/visits/{v2}", headers=res).json()
    required2 = {f["code"] for f in form2["fields"] if f["required"]}
    check("2회차 서양벌 응애 필수", {"varroa_count", "varroa_sample_g"} <= required2, str(required2))
    check("재래꿀벌은 응애 항목 없음", not any("varroa_count" in {x["code"] for x in fields_for("cerana", n)} for n in (1, 2, 3)))

    url2 = f"/api/v2/field/visits/{visit}/records/{ids[2]}"
    r = client.put(url2, headers=res, json={"queen_status": "QR", "boxes": 1, "values": {"frames_bees": 5, "sacbrood_score": 2}})
    check("여왕 미등록은 미완료", r.json()["missing"] == ["여왕 등록"], r.text)
    q_url = f"/api/v2/field/colonies/{ids[2]}/queen"
    mother = form2["queen_options"][0]["id"]
    r = client.post(q_url, headers=res, json={"tag": "Q0", "birth_year": 2026})
    check("여왕 ID 중복 거부", r.status_code == 409, r.text)
    r = client.post(q_url, headers=res, json={"tag": "Q2", "mating_method": "x"})
    check("교미 방식 코드 거부", r.status_code == 422, r.text)
    r = client.post(q_url, headers=res, json={"tag": "Q2", "sire_queen_id": mother})
    check("교미 방식 없는 수벌군 거부", r.status_code == 422, r.text)
    r = client.post(q_url, headers=res, json={
        "tag": "Q2", "birth_year": 2026, "mother_queen_id": mother, "origin": "자체 육성",
        "mating_method": "natural_open", "sire_queen_id": mother})
    body = r.json()
    check("여왕 등록과 어미·교미 저장", r.status_code == 201 and body["queen"]["mother_tag"] == "Q0"
          and body["queen"]["sire_tag"] == "Q0" and body["queen"]["birth_year"] == 2026, r.text)
    q2 = body["queen"]["id"]
    form1 = client.get(f"/api/v2/field/visits/{visit}", headers=res).json()
    row = next(c for c in form1["colonies"] if c["colony_id"] == ids[2])
    check("등록 후 미완료 해소", row["missing"] == [] and row["queen_tag"] == "Q2", str(row))
    db = SessionLocal()
    check("등록 전 형질을 여왕에 연결", all(o.queen_id == q2 for o in db.query(models.TraitObservation).filter_by(colony_id=ids[2]).all()))
    db.close()
    check("현재 여왕이 있으면 일반 등록 거부", client.post(q_url, headers=res, json={"tag": "Q3"}).status_code == 409)
    r = client.post(sample, headers=res, json={"colony_id": ids[2], "code": "T4", "sample_type": "drone_pool", "n_individuals": 10})
    check("여왕 등록 후 시료 저장", r.status_code == 201, r.text)
    r = client.put(f"/api/v2/field/queens/{q2}?colony_id={ids[2]}", headers=res, json={"tag": "Q2", "mother_queen_id": q2})
    check("자기 자신을 어미로 거부", r.status_code == 422, r.text)
    r = client.put(f"/api/v2/field/queens/{q2}?colony_id={ids[2]}", headers=res, json={
        "tag": "Q2-A", "birth_year": 2025, "mother_queen_id": mother})
    check("여왕 수정", r.status_code == 200 and r.json()["queen"]["tag"] == "Q2-A" and r.json()["queen"]["mating_method"] is None, r.text)
    check("교체는 도입일 필요", client.post(q_url, headers=res, json={"tag": "Q3", "replace": True}).status_code == 422)
    r = client.post(q_url, headers=res, json={"tag": "Q3", "replace": True, "introduced_date": "2027-03-01",
                                              "mother_queen_id": q2, "origin": "구입"})
    check("교체 시 이전 시료 재채집 안내", r.status_code == 201 and any("T4" in w for w in r.json()["warnings"]), r.text)
    q3 = r.json()["queen"]["id"]
    db = SessionLocal()
    links = db.query(models.ColonyQueen).filter_by(colony_id=ids[2]).order_by(models.ColonyQueen.id).all()
    check("이전 여왕 재임 종료", links[0].end_date == "2027-02-28" and links[1].end_date is None, str([l.end_date for l in links]))
    check("교체 사건 자동 기록", db.query(models.FieldEvent).filter_by(colony_id=ids[2], event_type="queen_replaced").count() == 1)
    rec = db.query(models.FieldRecord).filter_by(colony_id=ids[2]).first()
    check("교체일 이후 기록은 새 여왕", rec.queen_id == q3, str(rec.queen_id))
    check("시료는 채집 당시 여왕 유지", db.query(models.Sample).filter_by(code="T4").first().queen_id == q2)
    check("여왕 변경 이력", db.query(models.RecordRevision).filter_by(table_name="queens", field="tag").count() >= 1)
    db.close()
    r = client.post("/api/v2/field/events", headers=res, json={"colony_id": ids[0], "event_type": "queen_replaced", "date": "2027-07-01"})
    check("교체 사건은 등록 안내", r.status_code == 201 and len(r.json()["warnings"]) == 1, r.text)

    check("0kg 채밀 저장", client.post("/api/v2/field/events", headers=res, json={
        "colony_id": ids[0], "event_type": "honey_harvest", "date": "2027-06-01", "value": 0}).status_code == 201)
    check("채밀량 없으면 거부", client.post("/api/v2/field/events", headers=res, json={
        "colony_id": ids[0], "event_type": "honey_harvest", "date": "2027-06-01"}).status_code == 422)
    check("사건 목록", len(client.get(f"/api/v2/field/events?group_id={group}", headers=res).json()) == 3)
    check("검정군 목록", client.get("/api/v2/field/groups", headers=res).json()[0]["n_colonies"] == 3)

    # 비교표: 5군 검정군에서 사유별 제외와 방향 확인
    db = SessionLocal()
    apiary = models.Apiary(name="비교 양봉장", owner="far")
    db.add(apiary)
    db.flush()
    colonies = [models.Colony(code=f"C-{i}", apiary_id=apiary.id) for i in range(6)]
    db.add_all(colonies)
    db.flush()
    farm = db.query(models.Dataset).filter_by(code="farm").first().id
    for i, colony in enumerate(colonies[:5]):
        queen = models.Queen(tag=f"CQ{i}", dataset_id=farm)
        db.add(queen)
        db.flush()
        start = "2027-06-15" if i == 3 else None
        db.add(models.ColonyQueen(colony_id=colony.id, queen_id=queen.id, start_date=start))
    db.commit()
    cids, comp_apiary = [c.id for c in colonies], apiary.id
    db.close()
    r = client.post("/api/v2/field/groups", headers=res, json={
        "code": "CMP", "apiary_id": comp_apiary, "species": "mellifera", "year": 2027,
        "hives": [{"colony_id": c, "hive_code": f"C{i}"} for i, c in enumerate(cids)]})
    cg = r.json()["id"]
    cv = client.post("/api/v2/field/visits", headers=res, json={"group_id": cg, "round_no": 2, "date": "2027-07-01"}).json()["id"]
    rows = [(10, 1, 2, "QR"), (20, 3, 2, "QR"), (30, 5, 4, "QR"), (40, 1, 2, "QR"), (99 / 4, 1, 2, "QL")]
    for c, (frames, aggression, varroa, status_code) in zip(cids, rows):
        client.put(f"/api/v2/field/visits/{cv}/records/{c}", headers=res, json={
            "queen_status": status_code, "boxes": 1, "values": {
                "frames_bees": frames, "aggression": aggression, "swarming_score": 1, "sacbrood_score": 1,
                "varroa_count": varroa, "varroa_sample_g": 100}})
    client.put(f"/api/v2/field/visits/{cv}/records/{cids[5]}", headers=res, json={"queen_status": "NS", "boxes": 1, "values": {"frames_bees": 12}})
    for c, kg in [(cids[0], 5), (cids[0], 7), (cids[1], 0), (cids[2], 3)]:
        client.post("/api/v2/field/events", headers=res, json={"colony_id": c, "event_type": "honey_harvest", "date": "2027-06-20", "value": kg})
    client.post("/api/v2/field/events", headers=res, json={"colony_id": cids[0], "event_type": "honey_harvest", "date": "2027-08-01", "value": 50})
    check("농가는 비교표 접근 불가", client.get(f"/api/v2/field/visits/{cv}/comparison", headers=far).status_code == 403)
    r = client.get(f"/api/v2/field/visits/{cv}/comparison", headers=res)
    cmp = r.json()
    by_hive = {row["hive_code"]: row for row in cmp["rows"]}
    check("비교표 응답", r.status_code == 200 and cmp["n_eligible"] == 3, r.text[:300])
    check("도입 42일 미만 제외", by_hive["C3"]["reasons"] == ["도입 42일 미만"], str(by_hive["C3"]["reasons"]))
    check("무왕 제외", "무왕" in by_hive["C4"]["reasons"], str(by_hive["C4"]))
    check("여왕 미확정 제외", "여왕 미확정" in by_hive["C5"]["reasons"], str(by_hive["C5"]))
    check("제외 봉군은 값만 표시", by_hive["C3"]["cells"]["frames_bees"]["value"] == 40 and by_hive["C3"]["cells"]["frames_bees"]["z"] is None)
    frames = [by_hive[h]["cells"]["frames_bees"] for h in ("C0", "C1", "C2")]
    check("높을수록 좋은 형질 순위", [c["rank"] for c in frames] == [3, 2, 1] and frames[2]["z"] == 1.0 and frames[0]["z"] == -1.0, str(frames))
    aggr = [by_hive[h]["cells"]["aggression"] for h in ("C0", "C1", "C2")]
    check("낮을수록 좋은 형질 방향", aggr[0]["rank"] == 1 and aggr[0]["z"] > 0 > aggr[2]["z"], str(aggr))
    check("동점 형질은 z 없음", by_hive["C0"]["cells"]["sacbrood_score"]["z"] is None)
    check("응애는 100 g 당 값", by_hive["C2"]["cells"]["varroa_count"]["value"] == 4 and "varroa_sample_g" not in by_hive["C2"]["cells"], str(by_hive["C2"]["cells"]))
    check("방문일까지 채밀 누적", by_hive["C0"]["cells"]["honey_total"]["value"] == 12, str(by_hive["C0"]["cells"].get("honey_total")))
    check("표본이 작은 경고와 입력 중 경고", len(cmp["warnings"]) == 2, str(cmp["warnings"]))
    db = SessionLocal()
    sample = models.Sample(dataset_id=farm, code="MIS", colony_id=cids[1], queen_id=None, visit_id=cv, collected_date="2027-07-01")
    db.add(sample)
    db.commit()
    db.close()
    r = client.get(f"/api/v2/field/visits/{cv}/comparison", headers=res).json()
    row = next(x for x in r["rows"] if x["hive_code"] == "C1")
    check("시료-여왕 불일치 제외, 3군 미만이면 z 없음", row["reasons"] == ["시료-여왕 불일치"] and r["rows"][0]["cells"]["frames_bees"]["z"] is None, str(row))

sys.exit(1 if check.failed else 0)
