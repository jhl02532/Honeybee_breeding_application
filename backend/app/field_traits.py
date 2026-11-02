"""2027 시범 형질 사전. 현장 입력 화면은 이 정의를 읽어 만든다."""
from typing import List

SPECIES = ("mellifera", "cerana")

ROUNDS = {
    1: "월동 후, 주요 유밀기 전",
    2: "주요 유밀기 말",
    3: "월동 전",
}

QUEEN_STATUS = {
    "QR": "정상",
    "V": "처녀왕",
    "C": "격리 여왕",
    "AINL": "인공수정 미산란",
    "NS": "미확인",
    "QL": "무왕",
    "SRV": "자체 교체 처녀왕",
    "SRL": "자체 교체 산란",
    "DL": "일벌 산란",
}

EVENT_TYPES = {
    "honey_harvest": "채밀",
    "queen_replaced": "여왕 교체",
    "swarmed": "분봉",
    "split": "분할",
    "merged": "합봉",
    "absconded": "도망",
    "died": "폐사",
    "treatment": "약제 처리",
}

AGGRESSION_ANCHORS = {
    1: "훈연이 거의 필요 없고 공격 없음",
    2: "작업할수록 훈연이 더 필요",
    3: "벌이 주변을 날지만 쏘지 않음",
    4: "쏘거나 위협 자세, 방어 벌이 늘어남",
    5: "여러 번 쏘고 쫓아오며 주변 봉군까지 자극",
}

SWARMING_ANCHORS = {
    1: "왕대 없음, 관리 불필요",
    2: "왕대를 제거함",
    3: "봉아·꿀 제거나 계상 추가로 관리",
    4: "분할이 필요했음",
    5: "관리했는데도 분봉",
}


def _cell_anchors(*limits: str) -> dict:
    return {score: f"감염 봉방 {text}" for score, text in enumerate(limits, start=1)}


# required 는 해당 회차에 마감 전 입력이 필요한 회차 목록이다
FIELD_TRAITS = [
    {"code": "frames_bees", "name_ko": "벌 프레임 수", "name_en": "Frames of bees", "unit": "프레임",
     "scale": "continuous", "category": "population", "min": 0, "max": 40, "step": 0.25,
     "rounds": [1, 2, 3], "required": [1, 2, 3], "species": SPECIES,
     "protocol": "양면이 벌로 덮인 소비를 1로 보고 ¼ 단위로 기록한다."},
    {"code": "frames_brood", "name_ko": "봉아 프레임 수", "name_en": "Frames of brood", "unit": "프레임",
     "scale": "continuous", "category": "population", "min": 0, "max": 30, "step": 0.25,
     "rounds": [1, 3], "required": [], "species": SPECIES,
     "protocol": "봉아가 차지한 면적을 ¼ 프레임 단위로 기록한다."},
    {"code": "honey_store_frames", "name_ko": "저장꿀 프레임 수", "name_en": "Stored honey", "unit": "프레임",
     "scale": "continuous", "category": "production", "min": 0, "max": 40, "step": 0.25,
     "rounds": [2, 3], "required": [], "species": SPECIES,
     "protocol": "벌통에 남은 꿀을 ¼ 프레임 단위로 추정한다."},
    {"code": "aggression", "name_ko": "공격성", "name_en": "Aggression", "unit": "1-5",
     "scale": "ordinal", "category": "behaviour", "min": 1, "max": 5, "step": 1,
     "rounds": [2, 3], "required": [2], "species": SPECIES, "anchors": AGGRESSION_ANCHORS,
     "protocol": "검정군 안의 차이가 드러나게 평가하고 평가 순서를 회차마다 바꾼다."},
    {"code": "swarming_score", "name_ko": "분봉성", "name_en": "Swarm tendency", "unit": "1-5",
     "scale": "ordinal", "category": "behaviour", "min": 1, "max": 5, "step": 1,
     "rounds": [2], "required": [2], "species": SPECIES, "anchors": SWARMING_ANCHORS,
     "protocol": "지난 회차 이후 왕대와 분봉 관리 내용을 기준으로 평가한다."},
    {"code": "sacbrood_score", "name_ko": "낭충봉아부패병", "name_en": "Sacbrood", "unit": "1-5",
     "scale": "ordinal", "category": "disease", "min": 1, "max": 5, "step": 1,
     "rounds": [1, 2, 3], "required": [1, 2, 3], "species": SPECIES,
     "anchors": _cell_anchors("0", "1~5", "6~10", "11~20", "20 초과"),
     "protocol": "재래꿀벌 구간은 사전 시험에서 확정한다."},
    {"code": "chalkbrood_score", "name_ko": "백묵병", "name_en": "Chalkbrood", "unit": "1-5",
     "scale": "ordinal", "category": "disease", "min": 1, "max": 5, "step": 1,
     "rounds": [1, 2, 3], "required": [], "species": ("mellifera",),
     "anchors": _cell_anchors("0", "1~5", "6~40", "41~80", "80 초과"), "protocol": None},
    {"code": "foulbrood_efb_score", "name_ko": "유럽부저병", "name_en": "European foulbrood", "unit": "1-5",
     "scale": "ordinal", "category": "disease", "min": 1, "max": 5, "step": 1,
     "rounds": [1, 2, 3], "required": [], "species": SPECIES,
     "anchors": _cell_anchors("0", "1~5", "6~20", "21~30", "30 초과"), "protocol": None},
    {"code": "varroa_count", "name_ko": "응애 수", "name_en": "Varroa count", "unit": "마리",
     "scale": "count", "category": "disease", "min": 0, "max": 1000, "step": 1,
     "rounds": [3], "required": [3], "species": ("mellifera",),
     "protocol": "측정법은 한 가지로 고정한다. 슈가파우더법과 세척법 중 사전 시험에서 정한다."},
    {"code": "varroa_sample_g", "name_ko": "응애 측정 표본 무게", "name_en": "Varroa sample weight", "unit": "g",
     "scale": "continuous", "category": "disease", "min": 0, "max": 500, "step": 1,
     "rounds": [3], "required": [3], "species": ("mellifera",),
     "protocol": "응애를 센 벌 표본의 무게를 기록한다."},
]

TRAIT_BY_CODE = {t["code"]: t for t in FIELD_TRAITS}


def fields_for(species: str, round_no: int) -> List[dict]:
    """해당 종·회차의 입력 항목. required 는 이 회차 기준 참·거짓으로 바꾼다."""
    fields = []
    for trait in FIELD_TRAITS:
        if species in trait["species"] and round_no in trait["rounds"]:
            fields.append({**trait, "species": list(trait["species"]),
                           "required": round_no in trait["required"]})
    return fields
