from sqlalchemy import Column, ForeignKey, Integer, String, Float
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

    apiary = relationship("Apiary", back_populates="colonies")
    records = relationship("TraitRecord", back_populates="colony", cascade="all, delete-orphan")
    mother = relationship("Colony", remote_side=[id])


class TraitRecord(Base):
    __tablename__ = "trait_records"

    id = Column(Integer, primary_key=True, index=True)
    colony_id = Column(Integer, ForeignKey("colonies.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    
    # Traits (형질 기록)
    honey_production = Column(Float, default=0.0)      # 꿀 생산량 (Kg)
    propolis_production = Column(Float, default=0.0)   # 프로폴리스 생산량 (g)
    royal_jelly_production = Column(Float, default=0.0) # 로얄젤리 생산량 (g)
    temperament = Column(Integer, default=3)            # 온순함 (1-5)
    virus_resistance = Column(Integer, default=3)       # 바이러스 저항성 (1-5)
    mite_resistance = Column(Integer, default=3)        # 응애 저항성 (1-5)
    swarming_rate = Column(Float, default=0.0)          # 분봉률 (%)
    overwintering_survival = Column(Float, default=100.0) # 월동 생존율 (%)
    climate_adaptation = Column(Integer, default=3)     # 기후 적응성 (1-5)
    vsh_rate = Column(Float, default=0.0)                # VSH 행동 발현율 (%) [farmer log]
    hygienic_rate = Column(Float, default=0.0)           # 핀테스트 청소율 (%) [farmer log]
    
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

