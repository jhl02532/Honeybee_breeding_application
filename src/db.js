// MelittaBreed Local Relational Database & LocalStorage Manager

// Resilient storage wrapper for local file:// browser sandboxes
let localStorageMock = {};
const safeLocalStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage blocked under file:// protocol. Falling back to in-memory mock storage.", e);
      return localStorageMock[key] || null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      localStorageMock[key] = String(value);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete localStorageMock[key];
    }
  }
};

const STORAGE_KEYS = {
  APIARIES: 'melittabreed_apiaries',
  QUEENS: 'melittabreed_queens',
  COLONIES: 'melittabreed_colonies',
  TRAITS: 'melittabreed_traits',
  GENOMIC_SAMPLES: 'melittabreed_genomic_samples'
};

// Initial Seed Data representing a premium academic honeybee breeding program
const SEED_APIARIES = [
  {
    id: "API-001",
    owner: "김상식 (PhD. Kim)",
    farmName: "지리산 육종 시험포 (Jirisan Breeding Yard)",
    address: "경상남도 산청군 시천면 지리산대로 345",
    contact: "010-4567-8901",
    latitude: 35.3369,
    longitude: 127.7306,
    station: "산청 기상대"
  },
  {
    id: "API-002",
    owner: "박지은 (Researcher)",
    farmName: "중부 기후 적응 봉군 연구소 (Central Adapt Yard)",
    address: "경기도 여주시 가남읍 여주남로 124",
    contact: "010-8901-2345",
    latitude: 37.2911,
    longitude: 127.6358,
    station: "여주 기상대"
  },
  {
    id: "API-003",
    owner: "이종혁 (Master Beekeeper)",
    farmName: "해안 내염성 육성 봉장 (Coastal Salt Yard)",
    address: "전라남도 보성군 회천면 우암길 42",
    contact: "010-2345-6789",
    latitude: 34.7001,
    longitude: 127.0852,
    station: "보성 기상대"
  }
];

const SEED_QUEENS = [
  {
    id: "Q-2024-C01",
    breedLine: "Carniolan (카니올란 원종)",
    emergenceDate: "2024-05-10",
    damId: "DAM-CARN-09",
    sireId: "SIRE-DRN-22",
    hatchery: "독일 카니올란 보존 협회수입",
    status: "Active"
  },
  {
    id: "Q-2025-I02",
    breedLine: "Italian (이탈리안 황색종)",
    emergenceDate: "2025-04-12",
    damId: "DAM-ITAL-03",
    sireId: "SIRE-DRN-14",
    hatchery: "국립축산과학원 분양",
    status: "Active"
  },
  {
    id: "Q-2025-K03",
    breedLine: "Caucasian (코카시안 그레이)",
    emergenceDate: "2025-06-01",
    damId: "DAM-CAUC-11",
    sireId: "SIRE-DRN-40",
    hatchery: "강원 봉산물 육종센터",
    status: "Active"
  },
  {
    id: "Q-2025-Y04",
    breedLine: "Local Yellow (한국 토착종)",
    emergenceDate: "2025-07-15",
    damId: "DAM-LOCY-02",
    sireId: "SIRE-DRN-05",
    hatchery: "울릉도 토종벌 보존포",
    status: "Active"
  },
  {
    id: "Q-2026-N01",
    breedLine: "Jirisan Hybrid C-1 (J-잡종계)",
    emergenceDate: "2026-03-20",
    damId: "Q-2024-C01",
    sireId: "Q-2025-I02",
    hatchery: "지리산 시험포 자가인공수정",
    status: "Active"
  },
  {
    id: "Q-2026-R02",
    breedLine: "Mite Resistance Line (응애저항 계통)",
    emergenceDate: "2026-04-05",
    damId: "Q-2025-K03",
    sireId: "DAM-CAUC-11",
    hatchery: "꿀벌육종연구실 선발계통",
    status: "Active"
  }
];

const SEED_COLONIES = [
  {
    id: "COL-101",
    apiaryId: "API-001",
    hiveCode: "J-01",
    queenId: "Q-2024-C01",
    setupDate: "2024-06-01",
    frameCount: 10,
    hiveType: "개량 10매 벌통 (Langstroth)",
    status: "Healthy"
  },
  {
    id: "COL-102",
    apiaryId: "API-001",
    hiveCode: "J-02",
    queenId: "Q-2025-I02",
    setupDate: "2025-05-01",
    frameCount: 9,
    hiveType: "개량 10매 벌통 (Langstroth)",
    status: "Healthy"
  },
  {
    id: "COL-103",
    apiaryId: "API-001",
    hiveCode: "J-03",
    queenId: "Q-2026-N01",
    setupDate: "2026-03-25",
    frameCount: 8,
    hiveType: "개량 10매 벌통 (Langstroth)",
    status: "Healthy"
  },
  {
    id: "COL-201",
    apiaryId: "API-002",
    hiveCode: "Y-01",
    queenId: "Q-2025-K03",
    setupDate: "2025-06-20",
    frameCount: 10,
    hiveType: "EPP 단열 벌통",
    status: "Healthy"
  },
  {
    id: "COL-202",
    apiaryId: "API-002",
    hiveCode: "Y-02",
    queenId: "Q-2025-Y04",
    setupDate: "2025-08-05",
    frameCount: 8,
    hiveType: "개량 10매 벌통 (Langstroth)",
    status: "Weakened"
  },
  {
    id: "COL-301",
    apiaryId: "API-003",
    hiveCode: "B-01",
    queenId: "Q-2026-R02",
    setupDate: "2026-04-10",
    frameCount: 9,
    hiveType: "EPP 단열 벌통",
    status: "Healthy"
  }
];

const SEED_TRAITS = [
  // Colony 101 - Old and excellent producer (J-01, Carniolan)
  {
    id: "TR-1001",
    colonyId: "COL-101",
    recordingDate: "2025-05-15",
    honeyYield: 38.5,
    propolisYield: 280,
    royalJellyYield: 45,
    gentleness: 5,
    miteResistance: 4,
    virusResistance: 4,
    swarmingRate: 1, // 1 is excellent/low swarming, 5 is high swarming
    overwinteringSurvival: 95,
    climateAdaptability: 5,
    temperature: 24.5,
    humidity: 55,
    weatherStatus: "Sunny",
    inspector: "김상식 박사과정",
    healthGrade: "Healthy",
    feedingStatus: "None",
    treatmentLog: "None"
  },
  {
    id: "TR-1002",
    colonyId: "COL-101",
    recordingDate: "2025-07-20",
    honeyYield: 45.2,
    propolisYield: 310,
    royalJellyYield: 50,
    gentleness: 5,
    miteResistance: 4,
    virusResistance: 5,
    swarmingRate: 2,
    overwinteringSurvival: 98,
    climateAdaptability: 4,
    temperature: 28.8,
    humidity: 75,
    weatherStatus: "Overcast",
    inspector: "김상식 박사과정",
    healthGrade: "Healthy",
    feedingStatus: "Sugar water",
    treatmentLog: "Formic acid"
  },
  {
    id: "TR-1003",
    colonyId: "COL-101",
    recordingDate: "2026-05-10",
    honeyYield: 41.0,
    propolisYield: 340,
    royalJellyYield: 55,
    gentleness: 4,
    miteResistance: 5,
    virusResistance: 5,
    swarmingRate: 1,
    overwinteringSurvival: 99,
    climateAdaptability: 5,
    temperature: 21.0,
    humidity: 50,
    weatherStatus: "Sunny",
    inspector: "김상식 박사과정",
    healthGrade: "Healthy",
    feedingStatus: "Pollen cake",
    treatmentLog: "None"
  },

  // Colony 102 - High production Italian (J-02)
  {
    id: "TR-1004",
    colonyId: "COL-102",
    recordingDate: "2025-05-16",
    honeyYield: 48.0,
    propolisYield: 150,
    royalJellyYield: 85,
    gentleness: 4,
    miteResistance: 2,
    virusResistance: 3,
    swarmingRate: 3,
    overwinteringSurvival: 88,
    climateAdaptability: 4,
    temperature: 25.0,
    humidity: 60,
    weatherStatus: "Sunny",
    inspector: "김상식 박사과정",
    healthGrade: "Healthy",
    feedingStatus: "None",
    treatmentLog: "None"
  },
  {
    id: "TR-1005",
    colonyId: "COL-102",
    recordingDate: "2025-07-21",
    honeyYield: 52.5,
    propolisYield: 180,
    royalJellyYield: 90,
    gentleness: 3,
    miteResistance: 3,
    virusResistance: 3,
    swarmingRate: 4,
    overwinteringSurvival: 90,
    climateAdaptability: 4,
    temperature: 29.2,
    humidity: 78,
    weatherStatus: "Showering",
    inspector: "김상식 박사과정",
    healthGrade: "Healthy",
    feedingStatus: "Sugar water",
    treatmentLog: "None"
  },

  // Colony 103 - Young Jirisan Hybrid (J-03)
  {
    id: "TR-1006",
    colonyId: "COL-103",
    recordingDate: "2026-04-20",
    honeyYield: 12.5,
    propolisYield: 90,
    royalJellyYield: 20,
    gentleness: 4,
    miteResistance: 4,
    virusResistance: 4,
    swarmingRate: 2,
    overwinteringSurvival: 92,
    climateAdaptability: 5,
    temperature: 18.5,
    humidity: 45,
    weatherStatus: "Windy",
    inspector: "김상식 박사과정",
    healthGrade: "Healthy",
    feedingStatus: "None",
    treatmentLog: "None"
  },
  {
    id: "TR-1007",
    colonyId: "COL-103",
    recordingDate: "2026-05-18",
    honeyYield: 32.8,
    propolisYield: 220,
    royalJellyYield: 48,
    gentleness: 5,
    miteResistance: 4,
    virusResistance: 4,
    swarmingRate: 1,
    overwinteringSurvival: 95,
    climateAdaptability: 5,
    temperature: 23.2,
    humidity: 52,
    weatherStatus: "Sunny",
    inspector: "김상식 박사과정",
    healthGrade: "Healthy",
    feedingStatus: "Pollen cake",
    treatmentLog: "None"
  },

  // Colony 201 - Caucasian Center Adapt (Y-01)
  {
    id: "TR-1008",
    colonyId: "COL-201",
    recordingDate: "2025-06-25",
    honeyYield: 33.0,
    propolisYield: 480, // Heavy propolis producer
    royalJellyYield: 30,
    gentleness: 5,
    miteResistance: 3,
    virusResistance: 4,
    swarmingRate: 1,
    overwinteringSurvival: 96,
    climateAdaptability: 5,
    temperature: 26.5,
    humidity: 65,
    weatherStatus: "Overcast",
    inspector: "박지은 연구원",
    healthGrade: "Healthy",
    feedingStatus: "Sugar water",
    treatmentLog: "Thymol"
  },
  {
    id: "TR-1009",
    colonyId: "COL-201",
    recordingDate: "2026-05-15",
    honeyYield: 35.5,
    propolisYield: 520,
    royalJellyYield: 35,
    gentleness: 5,
    miteResistance: 4,
    virusResistance: 4,
    swarmingRate: 1,
    overwinteringSurvival: 97,
    climateAdaptability: 5,
    temperature: 22.0,
    humidity: 58,
    weatherStatus: "Sunny",
    inspector: "박지은 연구원",
    healthGrade: "Healthy",
    feedingStatus: "None",
    treatmentLog: "None"
  },

  // Colony 202 - Weakened Local Yellow (Y-02)
  {
    id: "TR-1010",
    colonyId: "COL-202",
    recordingDate: "2025-09-10",
    honeyYield: 15.0,
    propolisYield: 90,
    royalJellyYield: 15,
    gentleness: 2, // Somewhat aggressive
    miteResistance: 1, // Susceptible
    virusResistance: 2,
    swarmingRate: 5, // High swarming
    overwinteringSurvival: 75,
    climateAdaptability: 3,
    temperature: 24.0,
    humidity: 80,
    weatherStatus: "Showering",
    inspector: "박지은 연구원",
    healthGrade: "Alert",
    feedingStatus: "Sugar water",
    treatmentLog: "Formic acid"
  },

  // Colony 301 - Mite Resistance Coastal Line (B-01)
  {
    id: "TR-1011",
    colonyId: "COL-301",
    recordingDate: "2026-05-02",
    honeyYield: 24.8,
    propolisYield: 180,
    royalJellyYield: 38,
    gentleness: 4,
    miteResistance: 5, // Maximum resistance selected!
    virusResistance: 5,
    swarmingRate: 2,
    overwinteringSurvival: 95,
    climateAdaptability: 5,
    temperature: 20.2,
    humidity: 70,
    weatherStatus: "Windy",
    inspector: "이종혁 장인",
    healthGrade: "Healthy",
    feedingStatus: "Pollen cake",
    treatmentLog: "None"
  }
];

// --- DBA SCHEMA VALIDATOR LAYER ---
class SchemaValidator {
  static validateApiary(a) {
    if (!a.farmName || typeof a.farmName !== 'string' || a.farmName.trim() === '') {
      throw new Error("무결성 오류: 농가명이 공백이거나 유효하지 않습니다.");
    }
    if (!a.owner || typeof a.owner !== 'string' || a.owner.trim() === '') {
      throw new Error("무결성 오류: 소유자 이름이 유효하지 않습니다.");
    }
    if (typeof a.latitude !== 'number' || isNaN(a.latitude) || a.latitude < 33 || a.latitude > 43) {
      throw new Error("무결성 오류: 위도 범위를 벗어났습니다. (대한민국 위도 범위: 33 ~ 43)");
    }
    if (typeof a.longitude !== 'number' || isNaN(a.longitude) || a.longitude < 124 || a.longitude > 132) {
      throw new Error("무결성 오류: 경도 범위를 벗어났습니다. (대한민국 경도 범위: 124 ~ 132)");
    }
  }

  static validateQueen(q) {
    if (!q.breedLine || typeof q.breedLine !== 'string' || q.breedLine.trim() === '') {
      throw new Error("무결성 오류: 여왕벌 유전계통(Breed Line)이 유효하지 않습니다.");
    }
    if (!q.emergenceDate || isNaN(Date.parse(q.emergenceDate))) {
      throw new Error("무결성 오류: 우화일자가 올바른 날짜 포맷이 아닙니다.");
    }
  }

  static validateColony(c) {
    if (!c.hiveCode || typeof c.hiveCode !== 'string' || c.hiveCode.trim() === '') {
      throw new Error("무결성 오류: 벌통 코드(Hive Code)가 유효하지 않습니다.");
    }
    if (typeof c.frameCount !== 'number' || isNaN(c.frameCount) || c.frameCount < 1 || c.frameCount > 30) {
      throw new Error("무결성 오류: 벌통 내 소비수(Frame Count)는 1매에서 30매 사이여야 합니다.");
    }
  }

  static validateTrait(t) {
    if (typeof t.honeyYield !== 'number' || isNaN(t.honeyYield) || t.honeyYield < 0 || t.honeyYield > 150) {
      throw new Error("무결성 오류: 꿀 생산량은 0Kg 이상 150Kg 이하의 정상 범위여야 합니다.");
    }
    if (t.propolisYield !== undefined && (typeof t.propolisYield !== 'number' || isNaN(t.propolisYield) || t.propolisYield < 0 || t.propolisYield > 1500)) {
      throw new Error("무결성 오류: 프로폴리스 생산량은 0g 이상 1500g 이하의 범위여야 합니다.");
    }
    if (t.royalJellyYield !== undefined && (typeof t.royalJellyYield !== 'number' || isNaN(t.royalJellyYield) || t.royalJellyYield < 0 || t.royalJellyYield > 500)) {
      throw new Error("무결성 오류: 로얄젤리 생산량은 0g 이상 500g 이하의 범위여야 합니다.");
    }
    const scores = ['gentleness', 'miteResistance', 'virusResistance', 'swarmingRate', 'climateAdaptability'];
    scores.forEach(s => {
      if (typeof t[s] !== 'number' || isNaN(t[s]) || t[s] < 1 || t[s] > 5) {
        throw new Error(`무결성 오류: ${s} 평가점수는 1점에서 5점 사이여야 합니다.`);
      }
    });
    if (typeof t.overwinteringSurvival !== 'number' || isNaN(t.overwinteringSurvival) || t.overwinteringSurvival < 0 || t.overwinteringSurvival > 100) {
      throw new Error("무결성 오류: overwintering 생존율은 0%에서 100% 사이여야 합니다.");
    }
  }
}

// --- DBA MATERIALIZED JOINED VIEW ENGINE ---
class MelittaViews {
  constructor(dbInstance) {
    this.db = dbInstance;
    this.traitsMergedView = [];
    this.coloniesMergedView = [];
  }

  // Incremental / Lazy View Rebuild
  updateViews() {
    const start = performance.now();
    try {
      const apiaries = this.db.getApiaries() || [];
      const queens = this.db.getQueens() || [];
      const colonies = this.db.getColonies() || [];
      const traits = this.db.getTraits() || [];

      // 1. Colonies Merged View 구체화
      this.coloniesMergedView = colonies.map(c => {
        const apiary = apiaries.find(a => a.id === c.apiaryId) || { farmName: 'Unknown', owner: 'Unknown' };
        const queen = queens.find(q => q.id === c.queenId) || { breedLine: 'Unknown', status: 'Unknown' };
        return {
          ...c,
          apiaryName: apiary.farmName,
          apiaryOwner: apiary.owner,
          queenBreedLine: queen.breedLine,
          queenStatus: queen.status
        };
      });

      // 2. Traits Merged View 구체화
      this.traitsMergedView = traits.map(t => {
        const colony = colonies.find(c => c.id === t.colonyId) || { hiveCode: 'Unknown', queenId: 'Unknown', apiaryId: 'Unknown' };
        const apiary = apiaries.find(a => a.id === colony.apiaryId) || { farmName: 'Unknown' };
        const queen = queens.find(q => q.id === colony.queenId) || { breedLine: 'Unknown' };
        return {
          ...t,
          hiveCode: colony.hiveCode,
          queenId: colony.queenId,
          apiaryId: colony.apiaryId,
          apiaryName: apiary.farmName,
          queenBreedLine: queen.breedLine
        };
      });

      const duration = (performance.now() - start).toFixed(2);
      console.log(`[DBA View Engine] Materialized Views completed in ${duration}ms. Colonies View: ${this.coloniesMergedView.length} records, Traits View: ${this.traitsMergedView.length} records.`);
    } catch (e) {
      console.error("[DBA View Engine] Materialized Views update crashed!", e);
    }
  }

  getTraitsMergedView() {
    return this.traitsMergedView;
  }

  getColoniesMergedView() {
    return this.coloniesMergedView;
  }
}

// LocalStorage Controller Class
class MelittaDatabase {
  constructor() {
    this.apiariesMap = new Map();
    this.queensMap = new Map();
    this.coloniesMap = new Map();
    this.traitsMap = new Map();
    
    this.initDatabase();
    
    // Materialized view and index creation
    this.views = new MelittaViews(this);
    this.buildIndexMaps();
    this.views.updateViews();
  }

  initDatabase() {
    if (!safeLocalStorage.getItem(STORAGE_KEYS.APIARIES)) {
      safeLocalStorage.setItem(STORAGE_KEYS.APIARIES, JSON.stringify(SEED_APIARIES));
    }
    if (!safeLocalStorage.getItem(STORAGE_KEYS.QUEENS)) {
      safeLocalStorage.setItem(STORAGE_KEYS.QUEENS, JSON.stringify(SEED_QUEENS));
    }
    if (!safeLocalStorage.getItem(STORAGE_KEYS.COLONIES)) {
      safeLocalStorage.setItem(STORAGE_KEYS.COLONIES, JSON.stringify(SEED_COLONIES));
    }
    if (!safeLocalStorage.getItem(STORAGE_KEYS.TRAITS)) {
      safeLocalStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(SEED_TRAITS));
    }
  }

  // Build high-performance O(1) Memory Index Maps
  buildIndexMaps() {
    try {
      const apiaries = this.getApiaries() || [];
      this.apiariesMap.clear();
      apiaries.forEach(a => this.apiariesMap.set(a.id, a));

      const queens = this.getQueens() || [];
      this.queensMap.clear();
      queens.forEach(q => this.queensMap.set(q.id, q));

      const colonies = this.getColonies() || [];
      this.coloniesMap.clear();
      colonies.forEach(c => this.coloniesMap.set(c.id, c));

      const traits = this.getTraits() || [];
      this.traitsMap.clear();
      traits.forEach(t => this.traitsMap.set(t.id, t));
      
      console.log(`[DBA Engine] In-memory index maps successfully loaded. Apiaries: ${this.apiariesMap.size}, Queens: ${this.queensMap.size}, Colonies: ${this.coloniesMap.size}, Traits: ${this.traitsMap.size}`);
    } catch (e) {
      console.error("[DBA Engine] Error rebuilding in-memory index maps:", e);
    }
  }

  // DBA Safe Transaction Guard (Backup, Rollback, Index rebuild and View update support)
  safeTransaction(writeFn) {
    // Capture state backup
    const backup = {
      apiaries: safeLocalStorage.getItem(STORAGE_KEYS.APIARIES),
      queens: safeLocalStorage.getItem(STORAGE_KEYS.QUEENS),
      colonies: safeLocalStorage.getItem(STORAGE_KEYS.COLONIES),
      traits: safeLocalStorage.getItem(STORAGE_KEYS.TRAITS)
    };

    try {
      const result = writeFn();
      // Rebuild high-speed index caches
      this.buildIndexMaps();
      // Rebuild Materialized Views
      this.views.updateViews();
      return result;
    } catch (err) {
      console.error("[DBA Engine] Transaction crashed! Initiating rollback...", err);
      // Restore backups
      if (backup.apiaries) safeLocalStorage.setItem(STORAGE_KEYS.APIARIES, backup.apiaries);
      if (backup.queens) safeLocalStorage.setItem(STORAGE_KEYS.QUEENS, backup.queens);
      if (backup.colonies) safeLocalStorage.setItem(STORAGE_KEYS.COLONIES, backup.colonies);
      if (backup.traits) safeLocalStorage.setItem(STORAGE_KEYS.TRAITS, backup.traits);
      
      // Rebuild index caches to reflect rolled back state
      this.buildIndexMaps();
      this.views.updateViews();
      throw err;
    }
  }

  // --- O(1) High-Performance Direct Search Helpers ---
  getApiaryById(id) {
    return this.apiariesMap.get(id) || null;
  }

  getQueenById(id) {
    return this.queensMap.get(id) || null;
  }

  getColonyById(id) {
    return this.coloniesMap.get(id) || null;
  }

  getTraitById(id) {
    return this.traitsMap.get(id) || null;
  }

  // --- APIARIES ---
  getApiaries() {
    try {
      const data = safeLocalStorage.getItem(STORAGE_KEYS.APIARIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[DBA Engine] Failed to parse apiaries:", e);
      return [];
    }
  }

  saveApiary(apiary) {
    return this.safeTransaction(() => {
      SchemaValidator.validateApiary(apiary);
      const apiaries = this.getApiaries();
      if (!apiary.id) {
        apiary.id = 'API-' + String(apiaries.length + 1).padStart(3, '0');
        apiaries.push(apiary);
      } else {
        const idx = apiaries.findIndex(a => a.id === apiary.id);
        if (idx !== -1) apiaries[idx] = apiary;
      }
      safeLocalStorage.setItem(STORAGE_KEYS.APIARIES, JSON.stringify(apiaries));
      return apiary;
    });
  }

  // DBA CASCADE DELETE: Deleting apiary cascade-deletes all its colonies and traits
  deleteApiary(id) {
    return this.safeTransaction(() => {
      let apiaries = this.getApiaries();
      apiaries = apiaries.filter(a => a.id !== id);
      safeLocalStorage.setItem(STORAGE_KEYS.APIARIES, JSON.stringify(apiaries));

      // Cascade Delete associated Colonies
      const colonies = this.getColonies();
      const affectedColonies = colonies.filter(c => c.apiaryId === id);
      affectedColonies.forEach(c => {
        this.deleteColonyInternal(c.id);
      });

      return true;
    });
  }

  // --- QUEENS ---
  getQueens() {
    try {
      const data = safeLocalStorage.getItem(STORAGE_KEYS.QUEENS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[DBA Engine] Failed to parse queens:", e);
      return [];
    }
  }

  saveQueen(queen) {
    return this.safeTransaction(() => {
      SchemaValidator.validateQueen(queen);
      const queens = this.getQueens();
      if (!queen.id) {
        const birthYear = new Date(queen.emergenceDate).getFullYear() || 2026;
        const breedLetter = queen.breedLine.charAt(0).toUpperCase();
        const count = queens.filter(q => q.id.startsWith(`Q-${birthYear}`)).length + 1;
        queen.id = `Q-${birthYear}-${breedLetter}${String(count).padStart(2, '0')}`;
        queens.push(queen);
      } else {
        const idx = queens.findIndex(q => q.id === queen.id);
        if (idx !== -1) queens[idx] = queen;
      }
      safeLocalStorage.setItem(STORAGE_KEYS.QUEENS, JSON.stringify(queens));
      return queen;
    });
  }

  // DBA REFERENCE SAFETY: Deleting a queen updates its colonies' queenId relationship to "Unknown"
  deleteQueen(id) {
    return this.safeTransaction(() => {
      let queens = this.getQueens();
      queens = queens.filter(q => q.id !== id);
      safeLocalStorage.setItem(STORAGE_KEYS.QUEENS, JSON.stringify(queens));

      // Update associated Colonies to maintain referential sanity
      let colonies = this.getColonies();
      let updated = false;
      colonies.forEach(c => {
        if (c.queenId === id) {
          c.queenId = 'Unknown';
          updated = true;
        }
      });
      if (updated) {
        safeLocalStorage.setItem(STORAGE_KEYS.COLONIES, JSON.stringify(colonies));
      }

      return true;
    });
  }

  // --- COLONIES ---
  getColonies() {
    try {
      const data = safeLocalStorage.getItem(STORAGE_KEYS.COLONIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[DBA Engine] Failed to parse colonies:", e);
      return [];
    }
  }

  saveColony(colony) {
    return this.safeTransaction(() => {
      SchemaValidator.validateColony(colony);
      const colonies = this.getColonies();
      if (!colony.id) {
        colony.id = 'COL-' + String(colonies.length + 101).padStart(3, '0');
        colonies.push(colony);
      } else {
        const idx = colonies.findIndex(c => c.id === colony.id);
        if (idx !== -1) colonies[idx] = colony;
      }
      safeLocalStorage.setItem(STORAGE_KEYS.COLONIES, JSON.stringify(colonies));
      return colony;
    });
  }

  // DBA CASCADE DELETE: Deleting colony cascade-deletes all its historical traits records
  deleteColony(id) {
    return this.safeTransaction(() => {
      this.deleteColonyInternal(id);
      return true;
    });
  }

  // Internal helper to bypass nested transaction locks during cascade
  deleteColonyInternal(colonyId) {
    let colonies = this.getColonies();
    colonies = colonies.filter(c => c.id !== colonyId);
    safeLocalStorage.setItem(STORAGE_KEYS.COLONIES, JSON.stringify(colonies));

    // Cascade delete associated traits
    let traits = this.getTraits();
    traits = traits.filter(t => t.colonyId !== colonyId);
    safeLocalStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(traits));
  }

  // --- TRAIT RECORDS ---
  getTraits() {
    try {
      const data = safeLocalStorage.getItem(STORAGE_KEYS.TRAITS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[DBA Engine] Failed to parse traits:", e);
      return [];
    }
  }

  saveTrait(trait) {
    return this.safeTransaction(() => {
      SchemaValidator.validateTrait(trait);
      const traits = this.getTraits();
      if (!trait.id) {
        trait.id = 'TR-' + String(traits.length + 1001).padStart(4, '0');
        traits.push(trait);
      } else {
        const idx = traits.findIndex(t => t.id === trait.id);
        if (idx !== -1) traits[idx] = trait;
      }
      safeLocalStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(traits));
      return trait;
    });
  }

  deleteTrait(id) {
    return this.safeTransaction(() => {
      let traits = this.getTraits();
      traits = traits.filter(t => t.id !== id);
      safeLocalStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(traits));
      return true;
    });
  }

  // Raw Database Reset
  resetDatabase() {
    return this.safeTransaction(() => {
      safeLocalStorage.setItem(STORAGE_KEYS.APIARIES, JSON.stringify(SEED_APIARIES));
      safeLocalStorage.setItem(STORAGE_KEYS.QUEENS, JSON.stringify(SEED_QUEENS));
      safeLocalStorage.setItem(STORAGE_KEYS.COLONIES, JSON.stringify(SEED_COLONIES));
      safeLocalStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(SEED_TRAITS));
      return true;
    });
  }

  // Import Database
  importDatabase(data) {
    return this.safeTransaction(() => {
      if (data.apiaries) safeLocalStorage.setItem(STORAGE_KEYS.APIARIES, JSON.stringify(data.apiaries));
      if (data.queens) safeLocalStorage.setItem(STORAGE_KEYS.QUEENS, JSON.stringify(data.queens));
      if (data.colonies) safeLocalStorage.setItem(STORAGE_KEYS.COLONIES, JSON.stringify(data.colonies));
      if (data.traits) safeLocalStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(data.traits));
      return true;
    });
  }
}

window.MelittaSystem = window.MelittaSystem || {};
window.MelittaSystem.db = new MelittaDatabase();
window.db = window.MelittaSystem.db;

