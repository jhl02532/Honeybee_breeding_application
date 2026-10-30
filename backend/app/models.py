from sqlalchemy import Column, ForeignKey, Integer, String, Float, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    farm_name = Column(String(100), nullable=True)
    role = Column(String(20), default="farmer") # farmer, researcher, admin
    
    # New fields for advanced registration
    full_name = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    experience_years = Column(Integer, nullable=True)
    queen_species = Column(String(50), nullable=True, index=True)

    apiaries = relationship("Apiary", back_populates="owner_user", cascade="all, delete-orphan")


class Apiary(Base):
    __tablename__ = "apiaries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    owner = Column(String, index=True)
    location = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    owner_user = relationship("User", back_populates="apiaries")
    colonies = relationship("Colony", back_populates="apiary", cascade="all, delete-orphan")



class Colony(Base):
    __tablename__ = "colonies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    apiary_id = Column(Integer, ForeignKey("apiaries.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, default="Active")  # Active, Weak, Dead
    queen_tag = Column(String, default="Unknown")
    mother_colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="SET NULL"), nullable=True, index=True)
    sample_id = Column(String(100), nullable=True, index=True)
    is_pore_c = Column(Boolean, default=False, index=True)
    queen_species = Column(String(50), nullable=True, index=True)

    apiary = relationship("Apiary", back_populates="colonies")
    records = relationship("TraitRecord", back_populates="colony", cascade="all, delete-orphan")
    mother = relationship("Colony", remote_side=[id])


class TraitRecord(Base):
    __tablename__ = "trait_records"

    id = Column(Integer, primary_key=True, index=True)
    colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    
    # Traits (형질 기록) — 측정하지 않은 형질은 NULL 로 남긴다 (기본값을 채우지 않음)
    honey_production = Column(Float, nullable=True)      # 꿀 생산량 (Kg)
    propolis_production = Column(Float, nullable=True)   # 프로폴리스 생산량 (g)
    royal_jelly_production = Column(Float, nullable=True) # 로얄젤리 생산량 (g)
    temperament = Column(Integer, nullable=True)            # 온순함 (1-5)
    virus_resistance = Column(Integer, nullable=True)       # 바이러스 저항성 (1-5)
    mite_resistance = Column(Integer, nullable=True)        # 응애 저항성 (1-5)
    swarming_rate = Column(Float, nullable=True)          # 분봉률 (%)
    overwintering_survival = Column(Float, nullable=True) # 월동 생존율 (%)
    climate_adaptation = Column(Integer, nullable=True)     # 기후 적응성 (1-5)
    vsh_rate = Column(Float, nullable=True)                # VSH 행동 발현율 (%) [farmer log]
    hygienic_rate = Column(Float, nullable=True)           # 핀테스트 청소율 (%) [farmer log]
    
    # Environment telemetry (기상/환경 데이터)
    temperature = Column(Float, nullable=True)          # 온도 (°C)
    humidity = Column(Float, nullable=True)             # 습도 (%)
    notes = Column(String, nullable=True)               # 비고

    colony = relationship("Colony", back_populates="records")


class MorphologicalRecord(Base):
    __tablename__ = "morphological_records"

    id = Column(Integer, primary_key=True, index=True)
    queen_tag = Column(String(100), index=True, nullable=False) # 여왕벌 기준 바인딩!
    colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="CASCADE"), nullable=True, index=True)
    date = Column(String, nullable=False, index=True)           # 분석 일자 (YYYY-MM-DD)
    
    # 연구실 형태 정밀 측정 데이터
    cubital_index = Column(Float, nullable=True)        # 큐비탈 지수 (a/b ratio)
    proboscis_length = Column(Float, nullable=True)     # 설수장 (혀 길이, mm)
    tergite_color = Column(String(50), nullable=True)   # 복판 색상 마커 (Yellow, Brown, Dark 등)
    basitarsus_length = Column(Float, nullable=True)    # 후경부 마디 길이 (mm)
    basitarsus_width = Column(Float, nullable=True)     # 후경부 마디 너비 (mm)
    researcher_notes = Column(String, nullable=True)    # 연구원 관찰 특이사항

    colony = relationship("Colony")



# ---------------------------------------------------------------------------
# v2: 형질·유전체 연결 구조 (설계안 2026-10-30)
# 기존 테이블은 그대로 두고 옆에 더한다. 모든 행은 dataset 으로 출처를 나눈다.
# ---------------------------------------------------------------------------

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # farm, eynard2025, calfee2020 ...
    name = Column(String(200), nullable=False)
    kind = Column(String(20), nullable=False, default="farm")         # farm, own_research, public, simulated
    citation = Column(String(500), nullable=True)
    doi = Column(String(200), nullable=True)
    license = Column(String(200), nullable=True)
    visible_to = Column(String(20), nullable=False, default="researcher")  # all, researcher, admin
    notes = Column(Text, nullable=True)


class Queen(Base):
    __tablename__ = "queens"
    __table_args__ = (UniqueConstraint("dataset_id", "tag", name="uq_queen_dataset_tag"),)

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    tag = Column(String(100), nullable=False, index=True)              # 기존 queen_tag, 공개 데이터의 봉군/여왕 번호
    mother_queen_id = Column(Integer, ForeignKey("queens.id", ondelete="SET NULL"), nullable=True, index=True)
    species = Column(String(50), nullable=True)
    line = Column(String(100), nullable=True)                          # 계통·품종·집단
    birth_date = Column(String(10), nullable=True)                     # YYYY-MM-DD
    origin = Column(String(50), nullable=True)                         # 자체 육성, 구입, 공개 데이터, 시뮬레이션
    external_id = Column(String(100), nullable=True, index=True)       # BeeBreed ID, num_bs 등
    ancestry_json = Column(Text, nullable=True)                        # 아종 조상 비율 등 {"M": 0.7, ...}

    mother = relationship("Queen", remote_side=[id])


class ColonyQueen(Base):
    __tablename__ = "colony_queens"

    id = Column(Integer, primary_key=True, index=True)
    colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="CASCADE"), nullable=False, index=True)
    queen_id = Column(Integer, ForeignKey("queens.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(String(10), nullable=True)                     # 비어 있으면 시작일 미상
    end_date = Column(String(10), nullable=True)                       # 비어 있으면 현재 여왕
    change_reason = Column(String(30), nullable=True)                  # introduced, supersedure, swarm, requeen, migrated


class Mating(Base):
    __tablename__ = "matings"

    id = Column(Integer, primary_key=True, index=True)
    queen_id = Column(Integer, ForeignKey("queens.id", ondelete="CASCADE"), nullable=False, index=True)
    method = Column(String(30), nullable=False, default="natural_open")  # natural_open, mating_station, instrumental, single_drone
    date = Column(String(10), nullable=True)
    location = Column(String(200), nullable=True)
    latitude = Column(Float, nullable=True)                            # 0.01° 반올림 값만 저장
    longitude = Column(Float, nullable=True)
    est_n_drones = Column(Integer, nullable=True)

    sires = relationship("MatingSire", back_populates="mating", cascade="all, delete-orphan")


class MatingSire(Base):
    __tablename__ = "mating_sires"

    id = Column(Integer, primary_key=True, index=True)
    mating_id = Column(Integer, ForeignKey("matings.id", ondelete="CASCADE"), nullable=False, index=True)
    sire_queen_id = Column(Integer, ForeignKey("queens.id", ondelete="SET NULL"), nullable=True, index=True)  # 수벌을 낳은 여왕
    sire_colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="SET NULL"), nullable=True)
    drone_sample_id = Column(Integer, ForeignKey("samples.id", ondelete="SET NULL"), nullable=True)
    share = Column(Float, nullable=True)                               # 정액·부계 비율을 알면 기록

    mating = relationship("Mating", back_populates="sires")


class Sample(Base):
    __tablename__ = "samples"
    __table_args__ = (UniqueConstraint("dataset_id", "code", name="uq_sample_dataset_code"),)

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(100), nullable=False, index=True)
    colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="SET NULL"), nullable=True, index=True)
    queen_id = Column(Integer, ForeignKey("queens.id", ondelete="SET NULL"), nullable=True, index=True)
    sample_type = Column(String(20), nullable=False, default="worker")  # queen, worker, worker_pool, drone, drone_pool, larva
    n_individuals = Column(Integer, nullable=True)
    collected_date = Column(String(10), nullable=True)
    latitude = Column(Float, nullable=True)                            # 0.01° 반올림
    longitude = Column(Float, nullable=True)
    location = Column(String(200), nullable=True)
    platform = Column(String(50), nullable=True)                       # illumina, hifi, ont, pore_c, chip (여럿이면 + 로 연결)
    biosample = Column(String(50), nullable=True)
    run_accessions = Column(String(500), nullable=True)                # 쉼표로 구분
    file_uri = Column(String(500), nullable=True)                      # 서버 경로 (웹에서 열지 않음)
    status = Column(String(20), nullable=True)                         # collected, sent, sequenced, called, qc_fail
    attributes_json = Column(Text, nullable=True)


class TraitDefinition(Base):
    __tablename__ = "trait_definitions"

    code = Column(String(50), primary_key=True)
    name_ko = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)
    unit = Column(String(30), nullable=True)
    scale = Column(String(20), nullable=False, default="continuous")   # continuous, ordinal, binary, count
    level = Column(String(20), nullable=False, default="colony")       # colony, individual
    category = Column(String(30), nullable=True)                       # production, behaviour, disease, overwintering, morphology, other
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    protocol = Column(Text, nullable=True)
    legacy_column = Column(String(50), nullable=True)                  # trait_records 의 해당 열


class TraitObservation(Base):
    __tablename__ = "trait_observations"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    trait_code = Column(String(50), ForeignKey("trait_definitions.code"), nullable=False, index=True)
    colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="CASCADE"), nullable=True, index=True)
    queen_id = Column(Integer, ForeignKey("queens.id", ondelete="CASCADE"), nullable=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id", ondelete="CASCADE"), nullable=True, index=True)
    value = Column(Float, nullable=False)
    date = Column(String(10), nullable=True, index=True)
    measured_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    method_note = Column(String(200), nullable=True)
    legacy_record_id = Column(Integer, ForeignKey("trait_records.id", ondelete="CASCADE"), nullable=True, index=True)


class Marker(Base):
    __tablename__ = "markers"
    __table_args__ = (UniqueConstraint("panel", "marker_code", "trait_code", "population", name="uq_marker_panel_code_trait_pop"),)

    id = Column(Integer, primary_key=True, index=True)
    panel = Column(String(50), nullable=False, index=True)
    marker_code = Column(String(100), nullable=False, index=True)      # 예: 12:10153855
    assembly = Column(String(50), nullable=True)
    chrom = Column(String(50), nullable=True)
    pos = Column(Integer, nullable=True)
    ref = Column(String(50), nullable=True)
    alt = Column(String(50), nullable=True)
    trait_code = Column(String(50), ForeignKey("trait_definitions.code"), nullable=True, index=True)
    effect = Column(Float, nullable=True)
    effect_allele = Column(String(50), nullable=True)
    allele_freq = Column(Float, nullable=True)
    p_value = Column(Float, nullable=True)
    population = Column(String(50), nullable=True)                     # GWAS 를 돌린 집단
    source = Column(String(300), nullable=True)


class SampleGenotype(Base):
    __tablename__ = "sample_genotypes"
    __table_args__ = (UniqueConstraint("sample_id", "marker_id", name="uq_genotype_sample_marker"),)

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id", ondelete="CASCADE"), nullable=False, index=True)
    marker_id = Column(Integer, ForeignKey("markers.id", ondelete="CASCADE"), nullable=False, index=True)
    gt = Column(String(10), nullable=True)                             # 개체: 0/0, 0/1, 1/1, 수벌: 0, 1
    af = Column(Float, nullable=True)                                  # 혼합 시료: 대립유전자 빈도
    depth = Column(Integer, nullable=True)


class BreedingValue(Base):
    __tablename__ = "breeding_values"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    queen_id = Column(Integer, ForeignKey("queens.id", ondelete="CASCADE"), nullable=False, index=True)
    trait_code = Column(String(50), ForeignKey("trait_definitions.code"), nullable=False, index=True)
    value = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)
    model = Column(String(30), nullable=False)                         # pblup, gblup, ssgblup, marker_score, true_value
    model_version = Column(String(50), nullable=True)
    run_date = Column(String(10), nullable=True)
