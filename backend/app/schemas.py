from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional

# --- Authentication Schemas ---
class UserRole(str, Enum):
    FARMER = "farmer"
    RESEARCHER = "researcher"
    ADMIN = "admin"

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=100)
    farm_name: Optional[str] = None
    role: UserRole
    initial_colony_count: Optional[int] = Field(default=0, ge=0, le=100)
    queen_types: Optional[List[str]] = []

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    farm_name: Optional[str] = None
    role: UserRole

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- Trait Record Schemas ---
class TraitRecordBase(BaseModel):
    date: str
    honey_production: float = Field(default=0.0, ge=0.0)
    propolis_production: float = Field(default=0.0, ge=0.0)
    royal_jelly_production: float = Field(default=0.0, ge=0.0)
    temperament: int = Field(default=3, ge=1, le=5)
    virus_resistance: int = Field(default=3, ge=1, le=5)
    mite_resistance: int = Field(default=3, ge=1, le=5)
    swarming_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    overwintering_survival: float = Field(default=100.0, ge=0.0, le=100.0)
    climate_adaptation: int = Field(default=3, ge=1, le=5)
    temperature: Optional[float] = Field(None, ge=-50.0, le=60.0)
    humidity: Optional[float] = Field(None, ge=0.0, le=100.0)
    vsh_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    hygienic_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    notes: Optional[str] = None

class TraitRecordCreate(TraitRecordBase):
    colony_id: int

class TraitRecord(TraitRecordBase):
    id: int
    colony_id: int

    class Config:
        from_attributes = True


# --- Colony Schemas ---
class ColonyBase(BaseModel):
    code: str
    status: str = "Active"
    queen_tag: str = "Unknown"
    mother_colony_id: Optional[int] = None

class ColonyCreate(ColonyBase):
    apiary_id: int

class Colony(ColonyBase):
    id: int
    apiary_id: int
    records: List[TraitRecord] = []

    class Config:
        from_attributes = True


# --- Apiary Schemas ---
class ApiaryBase(BaseModel):
    name: str
    owner: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ApiaryCreate(ApiaryBase):
    owner_id: Optional[int] = None

class Apiary(ApiaryBase):
    id: int
    owner_id: Optional[int] = None
    colonies: List[Colony] = []

    class Config:
        from_attributes = True


# --- Summary statistics helper ---
class IntegratedDashboardStats(BaseModel):
    total_apiaries: int
    total_colonies: int
    total_records: int
    avg_honey: float
    avg_propolis: float
    avg_royal_jelly: float
    active_colonies: int = 0
    weak_colonies: int = 0
    dead_colonies: int = 0
    avg_survival_rate: float = 0.0
    queen_types: int = 0


# --- Bulk Synchronization Schemas ---
class BulkColonyCreate(BaseModel):
    code: str
    status: str = "Active"
    queen_tag: str = "Unknown"
    apiary_id: Optional[int] = None
    apiary_name: Optional[str] = None  # Offline key fallback mapping
    mother_colony_id: Optional[int] = None
    mother_colony_code: Optional[str] = None  # Offline parent mapping fallback

class BulkTraitRecordCreate(TraitRecordBase):
    colony_id: Optional[int] = None
    colony_code: Optional[str] = None  # Offline key fallback mapping

class BulkSyncPayload(BaseModel):
    apiaries: List[ApiaryCreate] = []
    colonies: List[BulkColonyCreate] = []
    traits: List[BulkTraitRecordCreate] = []

class BulkSyncResponse(BaseModel):
    success: bool
    created_apiaries: int
    created_colonies: int
    created_records: int


# --- Morphological Record (Lab Research) Schemas ---
class MorphologicalRecordBase(BaseModel):
    queen_tag: str = Field(..., min_length=1, max_length=100)
    colony_id: Optional[int] = None
    date: str
    cubital_index: Optional[float] = Field(None, ge=0.0, le=20.0)
    proboscis_length: Optional[float] = Field(None, ge=0.0, le=15.0)
    tergite_color: Optional[str] = Field(None, max_length=50)
    basitarsus_length: Optional[float] = Field(None, ge=0.0, le=10.0)
    basitarsus_width: Optional[float] = Field(None, ge=0.0, le=10.0)
    researcher_notes: Optional[str] = None

class MorphologicalRecordCreate(MorphologicalRecordBase):
    pass

class MorphologicalRecord(MorphologicalRecordBase):
    id: int

    class Config:
        from_attributes = True


# --- Researcher Dashboard Stats Schemas ---
class ResearcherStats(BaseModel):
    total_farmers: int
    total_apiaries: int
    total_colonies: int
    total_records: int
    avg_honey: float
    avg_propolis: float
    avg_royal_jelly: float
    avg_survival_rate: float
    active_colonies: int
    weak_colonies: int
    dead_colonies: int
    queen_types: int

