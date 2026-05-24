from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas
from .auth import get_password_hash


# ========== USER CRUD ==========

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        farm_name=user.farm_name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Auto-Onboarding: if initial_colony_count > 0, automatically seed 1 apiary and N colonies
    initial_count = getattr(user, "initial_colony_count", 0) or 0
    if initial_count > 0 and db_user.role == "farmer":
        # 1. Create Default Apiary
        apiary_name = f"{db_user.farm_name or db_user.username} 제1봉장"
        db_apiary = models.Apiary(
            name=apiary_name,
            owner=db_user.username,
            location="가입 온보딩 자동생성 봉장",
            latitude=37.5665,
            longitude=126.9780,
            owner_id=db_user.id
        )
        db.add(db_apiary)
        db.commit()
        db.refresh(db_apiary)
        
        # 2. Create N Colonies
        q_types = getattr(user, "queen_types", []) or []
        for i in range(1, initial_count + 1):
            q_type = q_types[i - 1] if i - 1 < len(q_types) else "이탈리안"
            db_colony = models.Colony(
                code=f"C-{db_user.id:02d}-{i:02d}",
                apiary_id=db_apiary.id,
                status="Active",
                queen_tag=q_type
            )
            db.add(db_colony)
        db.commit()
        db.refresh(db_user)
        
    return db_user


# ========== APIARY CRUD (owner-isolated) ==========

def get_apiary(db: Session, apiary_id: int, owner_id: int = None):
    q = db.query(models.Apiary).filter(models.Apiary.id == apiary_id)
    if owner_id is not None:
        q = q.filter(models.Apiary.owner_id == owner_id)
    return q.first()

def get_apiary_by_name(db: Session, name: str):
    return db.query(models.Apiary).filter(models.Apiary.name == name).first()

def get_apiaries(db: Session, skip: int = 0, limit: int = 100, owner_id: int = None):
    q = db.query(models.Apiary)
    if owner_id is not None:
        q = q.filter(models.Apiary.owner_id == owner_id)
    return q.offset(skip).limit(limit).all()

def create_apiary(db: Session, apiary: schemas.ApiaryCreate, owner_id: int = None):
    db_apiary = models.Apiary(
        name=apiary.name,
        owner=apiary.owner,
        location=apiary.location,
        latitude=apiary.latitude,
        longitude=apiary.longitude,
        owner_id=owner_id,
    )
    db.add(db_apiary)
    db.commit()
    db.refresh(db_apiary)
    return db_apiary

def delete_apiary(db: Session, apiary_id: int, owner_id: int = None):
    q = db.query(models.Apiary).filter(models.Apiary.id == apiary_id)
    if owner_id is not None:
        q = q.filter(models.Apiary.owner_id == owner_id)
    db_apiary = q.first()
    if db_apiary:
        db.delete(db_apiary)
        db.commit()
        return True
    return False


# ========== COLONY CRUD ==========

def get_colony(db: Session, colony_id: int):
    return db.query(models.Colony).filter(models.Colony.id == colony_id).first()

def get_colony_by_code(db: Session, code: str):
    return db.query(models.Colony).filter(models.Colony.code == code).first()

def get_colonies(db: Session, skip: int = 0, limit: int = 100, owner_id: int = None):
    q = db.query(models.Colony)
    if owner_id is not None:
        q = q.join(models.Apiary).filter(models.Apiary.owner_id == owner_id)
    return q.offset(skip).limit(limit).all()

def get_colonies_by_apiary(db: Session, apiary_id: int):
    return db.query(models.Colony).filter(models.Colony.apiary_id == apiary_id).all()

def create_colony(db: Session, colony: schemas.ColonyCreate):
    db_colony = models.Colony(
        code=colony.code,
        apiary_id=colony.apiary_id,
        status=colony.status,
        queen_tag=colony.queen_tag,
        mother_colony_id=colony.mother_colony_id
    )
    db.add(db_colony)
    db.commit()
    db.refresh(db_colony)
    return db_colony

def delete_colony(db: Session, colony_id: int):
    db_colony = db.query(models.Colony).filter(models.Colony.id == colony_id).first()
    if db_colony:
        db.delete(db_colony)
        db.commit()
        return True
    return False


# ========== TRAIT RECORD CRUD ==========

def get_trait_records(db: Session, skip: int = 0, limit: int = 100, owner_id: int = None):
    q = db.query(models.TraitRecord)
    if owner_id is not None:
        q = q.join(models.Colony).join(models.Apiary).filter(models.Apiary.owner_id == owner_id)
    return q.offset(skip).limit(limit).all()

def get_trait_records_by_colony(db: Session, colony_id: int):
    return db.query(models.TraitRecord).filter(
        models.TraitRecord.colony_id == colony_id
    ).order_by(models.TraitRecord.date.asc()).all()

def create_trait_record(db: Session, record: schemas.TraitRecordCreate):
    db_record = models.TraitRecord(
        colony_id=record.colony_id,
        date=record.date,
        honey_production=record.honey_production,
        propolis_production=record.propolis_production,
        royal_jelly_production=record.royal_jelly_production,
        temperament=record.temperament,
        virus_resistance=record.virus_resistance,
        mite_resistance=record.mite_resistance,
        swarming_rate=record.swarming_rate,
        overwintering_survival=record.overwintering_survival,
        climate_adaptation=record.climate_adaptation,
        temperature=record.temperature,
        humidity=record.humidity,
        vsh_rate=record.vsh_rate,
        hygienic_rate=record.hygienic_rate,
        notes=record.notes
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def delete_trait_record(db: Session, record_id: int):
    db_record = db.query(models.TraitRecord).filter(models.TraitRecord.id == record_id).first()
    if db_record:
        db.delete(db_record)
        db.commit()
        return True
    return False


# ========== INTEGRATED DASHBOARD STATS (owner-isolated) ==========

def get_dashboard_statistics(db: Session, owner_id: int = None):
    """Return aggregated stats, optionally filtered by owner_id."""
    apiary_q = db.query(models.Apiary)
    colony_q = db.query(models.Colony)
    record_q = db.query(models.TraitRecord)

    if owner_id is not None:
        apiary_q = apiary_q.filter(models.Apiary.owner_id == owner_id)
        colony_q = colony_q.join(models.Apiary).filter(models.Apiary.owner_id == owner_id)
        record_q = record_q.join(models.Colony).join(models.Apiary).filter(models.Apiary.owner_id == owner_id)

    total_apiaries = apiary_q.count()
    total_colonies = colony_q.count()
    total_records = record_q.count()

    # Status breakdown
    active_q = colony_q.filter(models.Colony.status == "Active")
    weak_q = colony_q.filter(models.Colony.status == "Weak")
    dead_q = colony_q.filter(models.Colony.status == "Dead")
    active_count = active_q.count() if owner_id else db.query(models.Colony).filter(models.Colony.status == "Active").count()
    weak_count = weak_q.count() if owner_id else db.query(models.Colony).filter(models.Colony.status == "Weak").count()
    dead_count = dead_q.count() if owner_id else db.query(models.Colony).filter(models.Colony.status == "Dead").count()

    # Averages
    if owner_id:
        avg_honey = record_q.with_entities(func.avg(models.TraitRecord.honey_production)).scalar() or 0.0
        avg_propolis = record_q.with_entities(func.avg(models.TraitRecord.propolis_production)).scalar() or 0.0
        avg_royal_jelly = record_q.with_entities(func.avg(models.TraitRecord.royal_jelly_production)).scalar() or 0.0
        avg_survival = record_q.with_entities(func.avg(models.TraitRecord.overwintering_survival)).scalar() or 0.0
    else:
        avg_honey = db.query(func.avg(models.TraitRecord.honey_production)).scalar() or 0.0
        avg_propolis = db.query(func.avg(models.TraitRecord.propolis_production)).scalar() or 0.0
        avg_royal_jelly = db.query(func.avg(models.TraitRecord.royal_jelly_production)).scalar() or 0.0
        avg_survival = db.query(func.avg(models.TraitRecord.overwintering_survival)).scalar() or 0.0

    # Unique queen types
    queen_q = colony_q.with_entities(models.Colony.queen_tag).distinct()
    queen_types = queen_q.count() if owner_id else db.query(models.Colony.queen_tag).distinct().count()

    return {
        "total_apiaries": total_apiaries,
        "total_colonies": total_colonies,
        "total_records": total_records,
        "avg_honey": round(float(avg_honey), 2),
        "avg_propolis": round(float(avg_propolis), 2),
        "avg_royal_jelly": round(float(avg_royal_jelly), 2),
        "active_colonies": active_count,
        "weak_colonies": weak_count,
        "dead_colonies": dead_count,
        "avg_survival_rate": round(float(avg_survival), 2),
        "queen_types": queen_types,
    }


# ========== BULK SYNC CRUD (owner-isolated) ==========

def bulk_sync_data(db: Session, owner_id: int, payload: schemas.BulkSyncPayload) -> dict:
    created_apiaries_count = 0
    created_colonies_count = 0
    created_records_count = 0
    
    # 1. Process Apiaries
    apiary_name_to_id = {}
    for apiary in payload.apiaries:
        db_apiary = db.query(models.Apiary).filter(models.Apiary.name == apiary.name).first()
        if not db_apiary:
            db_apiary = models.Apiary(
                name=apiary.name,
                owner=apiary.owner,
                location=apiary.location,
                latitude=apiary.latitude,
                longitude=apiary.longitude,
                owner_id=owner_id
            )
            db.add(db_apiary)
            db.flush()  # populate ID
            created_apiaries_count += 1
        else:
            if db_apiary.owner_id != owner_id:
                # Security constraint: user cannot hijack an existing apiary name they don't own
                continue
        apiary_name_to_id[apiary.name] = db_apiary.id

    # 2. Process Colonies
    colony_code_to_id = {}
    colonies_to_update_parent = []
    for colony in payload.colonies:
        db_colony = db.query(models.Colony).filter(models.Colony.code == colony.code).first()
        if not db_colony:
            apiary_id = colony.apiary_id
            if not apiary_id and colony.apiary_name:
                apiary_id = apiary_name_to_id.get(colony.apiary_name)
                if not apiary_id:
                    exist_apiary = db.query(models.Apiary).filter(
                        models.Apiary.name == colony.apiary_name,
                        models.Apiary.owner_id == owner_id
                    ).first()
                    if exist_apiary:
                        apiary_id = exist_apiary.id
            
            if not apiary_id:
                continue
                
            db_colony = models.Colony(
                code=colony.code,
                apiary_id=apiary_id,
                status=colony.status,
                queen_tag=colony.queen_tag,
                mother_colony_id=colony.mother_colony_id
            )
            db.add(db_colony)
            db.flush()
            created_colonies_count += 1
        colony_code_to_id[colony.code] = db_colony.id
        if colony.mother_colony_code or colony.mother_colony_id:
            colonies_to_update_parent.append((db_colony, colony.mother_colony_id, colony.mother_colony_code))

    # 2-Pass: Resolve parent-child lineage for newly offline-created colonies
    for db_c, m_id, m_code in colonies_to_update_parent:
        resolved_id = m_id
        if not resolved_id and m_code:
            resolved_id = colony_code_to_id.get(m_code)
            if not resolved_id:
                exist_parent = db.query(models.Colony).join(models.Apiary).filter(
                    models.Colony.code == m_code,
                    models.Apiary.owner_id == owner_id
                ).first()
                if exist_parent:
                    resolved_id = exist_parent.id
        if resolved_id:
            db_c.mother_colony_id = resolved_id
            db.add(db_c)
            db.flush()

    # 3. Process Trait Records
    for record in payload.traits:
        colony_id = record.colony_id
        if not colony_id and record.colony_code:
            colony_id = colony_code_to_id.get(record.colony_code)
            if not colony_id:
                exist_colony = db.query(models.Colony).join(models.Apiary).filter(
                    models.Colony.code == record.colony_code,
                    models.Apiary.owner_id == owner_id
                ).first()
                if exist_colony:
                    colony_id = exist_colony.id
        
        if not colony_id:
            continue
            
        db_record = models.TraitRecord(
            colony_id=colony_id,
            date=record.date,
            honey_production=record.honey_production,
            propolis_production=record.propolis_production,
            royal_jelly_production=record.royal_jelly_production,
            temperament=record.temperament,
            virus_resistance=record.virus_resistance,
            mite_resistance=record.mite_resistance,
            swarming_rate=record.swarming_rate,
            overwintering_survival=record.overwintering_survival,
            climate_adaptation=record.climate_adaptation,
            temperature=record.temperature,
            humidity=record.humidity,
            vsh_rate=record.vsh_rate,
            hygienic_rate=record.hygienic_rate,
            notes=record.notes
        )
        db.add(db_record)
        created_records_count += 1
        
    db.commit()
    return {
        "success": True,
        "created_apiaries": created_apiaries_count,
        "created_colonies": created_colonies_count,
        "created_records": created_records_count
    }


# ========== DATA SEEDING ==========

def seed_database_if_empty(db: Session):
    if db.query(models.Apiary).count() > 0:
        return
    
    # 1. Create Apiaries
    apiary1 = models.Apiary(name="남한산성 연구 봉장", owner="박박사", location="경기도 광주시 남한산성면", latitude=37.4782, longitude=127.1895)
    apiary2 = models.Apiary(name="제주 아열대 육종원", owner="김석사", location="제주특별자치도 서귀포시", latitude=33.2541, longitude=126.5601)
    db.add_all([apiary1, apiary2])
    db.commit()

    # 2. Create Colonies
    c1 = models.Colony(code="K-01", apiary_id=apiary1.id, status="Active", queen_tag="Q-2025-N01")
    c2 = models.Colony(code="K-02", apiary_id=apiary1.id, status="Active", queen_tag="Q-2025-N02")
    c3 = models.Colony(code="J-01", apiary_id=apiary2.id, status="Active", queen_tag="Q-2026-J01")
    c4 = models.Colony(code="J-02", apiary_id=apiary2.id, status="Weak", queen_tag="Q-2026-J02")
    db.add_all([c1, c2, c3, c4])
    db.commit()

    # 3. Create Trait Records
    r1 = models.TraitRecord(colony_id=c1.id, date="2026-05-10", honey_production=45.2, propolis_production=320.0, royal_jelly_production=12.0, temperament=5, virus_resistance=4, mite_resistance=4, swarming_rate=12.5, overwintering_survival=95.0, climate_adaptation=4, temperature=21.5, humidity=62.0, notes="활동성 매우 강함, 분봉 징후 없음")
    r2 = models.TraitRecord(colony_id=c1.id, date="2026-05-20", honey_production=52.8, propolis_production=340.0, royal_jelly_production=15.0, temperament=5, virus_resistance=5, mite_resistance=4, swarming_rate=15.0, overwintering_survival=95.0, climate_adaptation=5, temperature=24.0, humidity=58.0, notes="꿀 수밀 능력 극대화 상태")
    r3 = models.TraitRecord(colony_id=c2.id, date="2026-05-12", honey_production=38.0, propolis_production=290.0, royal_jelly_production=8.0, temperament=4, virus_resistance=3, mite_resistance=3, swarming_rate=20.0, overwintering_survival=90.0, climate_adaptation=4, temperature=22.0, humidity=65.0, notes="온순하나 응애 다소 관찰됨")
    r4 = models.TraitRecord(colony_id=c3.id, date="2026-05-15", honey_production=62.0, propolis_production=480.0, royal_jelly_production=25.0, temperament=4, virus_resistance=5, mite_resistance=5, swarming_rate=8.0, overwintering_survival=98.0, climate_adaptation=5, temperature=26.5, humidity=75.0, notes="제주 기후 완전 적응, 다수 채밀")
    r5 = models.TraitRecord(colony_id=c4.id, date="2026-05-16", honey_production=15.0, propolis_production=100.0, royal_jelly_production=2.0, temperament=2, virus_resistance=2, mite_resistance=2, swarming_rate=35.0, overwintering_survival=70.0, climate_adaptation=2, temperature=26.0, humidity=78.0, notes="세력 약화, 여왕벌 산란율 부진")
    
    db.add_all([r1, r2, r3, r4, r5])
    db.commit()


# ========== MORPHOLOGICAL RECORD CRUD (Lab Research) ==========

def get_morphological_records(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.MorphologicalRecord).offset(skip).limit(limit).all()

def get_morphological_records_by_queen(db: Session, queen_tag: str):
    return db.query(models.MorphologicalRecord).filter(
        models.MorphologicalRecord.queen_tag == queen_tag
    ).order_by(models.MorphologicalRecord.date.asc()).all()

def create_morphological_record(db: Session, record: schemas.MorphologicalRecordCreate):
    db_record = models.MorphologicalRecord(
        queen_tag=record.queen_tag,
        colony_id=record.colony_id,
        date=record.date,
        cubital_index=record.cubital_index,
        proboscis_length=record.proboscis_length,
        tergite_color=record.tergite_color,
        basitarsus_length=record.basitarsus_length,
        basitarsus_width=record.basitarsus_width,
        researcher_notes=record.researcher_notes
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def delete_morphological_record(db: Session, record_id: int):
    db_record = db.query(models.MorphologicalRecord).filter(models.MorphologicalRecord.id == record_id).first()
    if db_record:
        db.delete(db_record)
        db.commit()
        return True
    return False


# ========== DATA SEEDING ==========

def seed_database_if_empty(db: Session):
    # Ensure melitta exists
    melitta_user = db.query(models.User).filter(models.User.username == "melitta").first()
    if not melitta_user:
        melitta_user = models.User(
            username="melitta",
            hashed_password=get_password_hash("melittapass"),
            farm_name="멜리타 스마트 양봉장",
            role="farmer"
        )
        db.add(melitta_user)
        db.commit()
        db.refresh(melitta_user)

    # Ensure researcher exists
    researcher_user = db.query(models.User).filter(models.User.username == "researcher").first()
    if not researcher_user:
        researcher_user = models.User(
            username="researcher",
            hashed_password=get_password_hash("researcherpass"),
            farm_name="국립 꿀벌 육종 연구소",
            role="researcher"
        )
        db.add(researcher_user)
        db.commit()
        db.refresh(researcher_user)

    # Ensure admin exists
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        admin_user = models.User(
            username="admin",
            hashed_password=get_password_hash("adminpass"),
            farm_name="시스템 총괄 관리자",
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)


    # Seed relational data if apiaries are empty
    if db.query(models.Apiary).count() > 0:
        return
    
    # 1. Create Apiaries
    apiary1 = models.Apiary(name="남한산성 연구 봉장", owner="박박사", location="경기도 광주시 남한산성면", latitude=37.4782, longitude=127.1895, owner_id=melitta_user.id)
    apiary2 = models.Apiary(name="제주 아열대 육종원", owner="김석사", location="제주특별자치도 서귀포시", latitude=33.2541, longitude=126.5601, owner_id=melitta_user.id)
    db.add_all([apiary1, apiary2])
    db.commit()

    # 2. Create Colonies
    c1 = models.Colony(code="K-01", apiary_id=apiary1.id, status="Active", queen_tag="Q-2025-N01")
    c2 = models.Colony(code="K-02", apiary_id=apiary1.id, status="Active", queen_tag="Q-2025-N02")
    c3 = models.Colony(code="J-01", apiary_id=apiary2.id, status="Active", queen_tag="Q-2026-J01")
    c4 = models.Colony(code="J-02", apiary_id=apiary2.id, status="Weak", queen_tag="Q-2026-J02")
    db.add_all([c1, c2, c3, c4])
    db.commit()

    # 3. Create Trait Records (incorporating VSH and Hygienic behavior!)
    r1 = models.TraitRecord(colony_id=c1.id, date="2026-05-10", honey_production=45.2, propolis_production=320.0, royal_jelly_production=12.0, temperament=5, virus_resistance=4, mite_resistance=4, swarming_rate=12.5, overwintering_survival=95.0, climate_adaptation=4, temperature=21.5, humidity=62.0, vsh_rate=80.0, hygienic_rate=95.0, notes="활동성 매우 강함, 분봉 징후 없음")
    r2 = models.TraitRecord(colony_id=c1.id, date="2026-05-20", honey_production=52.8, propolis_production=340.0, royal_jelly_production=15.0, temperament=5, virus_resistance=5, mite_resistance=4, swarming_rate=15.0, overwintering_survival=95.0, climate_adaptation=5, temperature=24.0, humidity=58.0, vsh_rate=85.0, hygienic_rate=98.0, notes="꿀 수밀 능력 극대화 상태")
    r3 = models.TraitRecord(colony_id=c2.id, date="2026-05-12", honey_production=38.0, propolis_production=290.0, royal_jelly_production=8.0, temperament=4, virus_resistance=3, mite_resistance=3, swarming_rate=20.0, overwintering_survival=90.0, climate_adaptation=4, temperature=22.0, humidity=65.0, vsh_rate=60.0, hygienic_rate=80.0, notes="온순하나 응애 다소 관찰됨")
    r4 = models.TraitRecord(colony_id=c3.id, date="2026-05-15", honey_production=62.0, propolis_production=480.0, royal_jelly_production=25.0, temperament=4, virus_resistance=5, mite_resistance=5, swarming_rate=8.0, overwintering_survival=98.0, climate_adaptation=5, temperature=26.5, humidity=75.0, vsh_rate=90.0, hygienic_rate=99.0, notes="제주 기후 완전 적응, 다수 채밀")
    r5 = models.TraitRecord(colony_id=c4.id, date="2026-05-16", honey_production=15.0, propolis_production=100.0, royal_jelly_production=2.0, temperament=2, virus_resistance=2, mite_resistance=2, swarming_rate=35.0, overwintering_survival=70.0, climate_adaptation=2, temperature=26.0, humidity=78.0, vsh_rate=40.0, hygienic_rate=50.0, notes="세력 약화, 여왕벌 산란율 부진")
    db.add_all([r1, r2, r3, r4, r5])
    db.commit()

    # 4. Create Morphological Lab Samples (Seeding morphological values linked to Q-2025-N01)
    morph1 = models.MorphologicalRecord(
        queen_tag="Q-2025-N01",
        colony_id=c1.id,
        date="2026-05-18",
        cubital_index=1.85,
        proboscis_length=6.45,
        tergite_color="Yellow-Stripes",
        basitarsus_length=3.25,
        basitarsus_width=1.15,
        researcher_notes="이탈리안 순종 계열의 날개 시맥 비율 확인됨. 혀 길이도 매우 양호하여 채밀성 보증."
    )
    db.add(morph1)
    db.commit()

