"""v2 테이블에 기존 기록과 시험 데이터를 넣는다.

    cd backend
    DATABASE_URL=... python -m scripts.load_v2_datasets legacy
    DATABASE_URL=... python -m scripts.load_v2_datasets inu
    DATABASE_URL=... python -m scripts.load_v2_datasets eynard --dir <eynard2025_PRJNA1083455 폴더>
    DATABASE_URL=... python -m scripts.load_v2_datasets calfee --file <pgen.1009038.s001.txt>
    DATABASE_URL=... python -m scripts.load_v2_datasets gwas --dir <상위 마커 TSV 폴더>

- legacy: v1 기록(queen_tag·mother_colony_id·sample_id·trait_records)을 잇는다.
- inu: backend/app/data/sampling/*.tsv(인천대 2026 채집 시료)를 samples 로 넣는다.
- eynard: Eynard et al. 2025 봉군 형질(data.csv)·SRA 대응표(sample_SRA.tab).
- calfee: Calfee et al. 2020 S1 Table(개체 날개 길이).
- gwas: Eynard GEMMA 요약 통계에서 뽑은 상위 마커(hpc 에서 p_wald 순 200개씩 뽑은 TSV).

모두 여러 번 돌려도 결과가 같다(같은 코드는 갱신).
"""
import argparse
import csv
import glob
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app import models, v2_service  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLING_DIR = os.path.join(HERE, "..", "app", "data", "sampling")

# Eynard data.csv 열 → 형질 정의. 단위·의미는 저자 README(Recherche Data Gouv doi:10.57745/HHE4CZ) 기준
EYNARD_TRAITS = [
    # 열, code, name_ko, unit, category, min, max
    ("percent_mnr", "mnr_pct", "응애 비번식률", "%", "disease", 0, 100),
    ("eb_mmr", "eb_mnr", "응애 비번식률(경험적 베이즈 보정)", "비율(0-1)", "disease", 0, 1),
    ("recap_inf", "recap_inf", "감염 봉방 재봉개율", "비율(0-1)", "disease", 0, 1),
    ("v_pho", "varroa_phoretic", "성충 부착 응애", "마리/100마리", "disease", 0, None),
    ("v_mito", "varroa_mito", "응애 mtDNA 리드 비율", "비율", "disease", 0, None),
    ("v_load", "varroa_load", "봉군 응애 총량(추정)", "마리", "disease", 0, None),
    ("pca1", "varroa_pc1", "응애 감염도 PC1", "주성분 점수", "disease", None, None),
    ("bee_weigth", "bee_sample_weight", "성충 시료 무게", "g", "other", 0, None),
    ("brood", "brood_cells", "봉아 수", "봉방", "production", 0, None),
]
EYNARD_GWAS_TRAIT = {"eb_mnr": "eb_mnr", "pc1": "varroa_pc1", "recap_inf": "recap_inf"}


def _commit_report(db, label, n, errors):
    db.commit()
    print(f"[{label}] {n}건 적재, 오류 {len(errors)}건")
    for e in errors[:20]:
        print("   ", e)


def load_inu(db):
    ds = v2_service.ensure_dataset(db, "inu_2026", "인천대 2026 채집 시료", "own_research")
    rows = {}
    for name, platform in (("sampling_ac.tsv", "illumina"), ("sampling_am.tsv", "illumina"), ("sampling_pore_c.tsv", "pore_c")):
        with open(os.path.join(SAMPLING_DIR, name), encoding="utf-8") as fh:
            for r in csv.DictReader(fh, delimiter="\t"):
                collected = (r.get("채집일자") or "").strip()
                attrs = {k: r.get(k) for k in ("권역", "계통", "종", "채집일자", "시료전달일자") if r.get(k)}
                code = r["시료 ID"].strip()
                if code in rows:
                    # 같은 시료가 짧은 리드와 Pore-C 목록에 함께 있거나, 한 파일에 두 번 적힌 경우
                    prev = rows[code]
                    if platform not in prev["platform"].split("+"):
                        prev["platform"] += f"+{platform}"
                    else:
                        print(f"   [inu] {name}: 시료 ID '{code}' 가 중복 — 원본 확인 필요")
                    continue
                rows[code] = {
                    "code": code, "sample_type": "worker",
                    "collected_date": collected[:10] if len(collected) >= 10 else None,
                    "latitude": r.get("lat"), "longitude": r.get("lng"), "location": r.get("권역"),
                    "platform": platform, "status": "sent" if r.get("시료전달일자") else "collected",
                    "attributes_json": json.dumps(attrs, ensure_ascii=False),
                }
    n, errors = v2_service.import_samples(db, ds, list(rows.values()))
    _commit_report(db, "inu", n, errors)


def load_eynard(db, folder):
    ds = v2_service.ensure_dataset(
        db, "eynard2025", "Eynard 2025 BeeStrong 봉군 응애 형질", "public",
        citation="Eynard SE et al. 2025 Mol Ecol (BeeStrong varroa GWAS); PRJNA1083455",
        doi="10.1111/mec.17637",
        license="확인 필요 — Recherche Data Gouv doi:10.57745/HHE4CZ",
        notes="일벌 약 500마리 혼합 시퀀싱(봉군 단위). 봉군당 여왕 1명으로 보고 형질을 여왕에 연결. 좌표 없음.")
    for col, code, name, unit, cat, lo, hi in EYNARD_TRAITS:
        v2_service.ensure_trait_definition(db, code, name, None, unit, "continuous", "colony", cat, lo, hi,
                                           protocol=f"Eynard et al. 2025 data.csv 열 `{col}`")
    with open(os.path.join(folder, "data.csv"), encoding="utf-8") as fh:
        data = list(csv.DictReader(fh, delimiter="\t"))

    def iso(d):  # 01/08/2016 → 2016-08-01 (data_updated.txt 의 ISO 날짜와 대조해 일/월/연 확인)
        if d.count("/") != 2:
            return None  # NA 3행
        dd, mm, yy = d.split("/")
        return f"{yy}-{mm}-{dd}"

    queens = [{
        "tag": r["num_bs"], "line": r["group"], "species": "Apis mellifera", "origin": "공개 데이터",
        "external_id": r["num_bs"],
        "ancestry_json": json.dumps({"Ligustica_Carnica": float(r["percent_Ligustica_Carnica"]),
                                     "Mellifera": float(r["percent_Mellifera"]),
                                     "Caucasica": float(r["percent_Caucasica"])}),
    } for r in data]
    n, errors = v2_service.import_queens(db, ds, queens)
    _commit_report(db, "eynard queens", n, errors)

    runs = {}
    with open(os.path.join(folder, "sample_SRA.tab"), encoding="utf-8") as fh:
        for r in csv.DictReader(fh, delimiter="\t"):
            runs.setdefault((r["num_bs"], r["BioSample"]), []).append(r["Run"])
    tags = {r["num_bs"] for r in data}
    samples = [{
        "code": bs, "queen_tag": num_bs, "sample_type": "worker_pool", "n_individuals": 500,
        "platform": "illumina", "biosample": bs, "run_accessions": ",".join(sorted(rs)), "status": "sequenced",
    } for (num_bs, bs), rs in runs.items() if num_bs in tags]
    n, errors = v2_service.import_samples(db, ds, samples)
    _commit_report(db, "eynard samples", n, errors)

    obs = []
    for r in data:
        for col, code, *_ in EYNARD_TRAITS:
            if r.get(col) not in (None, "", "NA"):
                obs.append({"trait_code": code, "value": r[col], "date": iso(r["date"]), "queen_tag": r["num_bs"]})
    n, errors = v2_service.import_trait_observations(db, ds, obs)
    _commit_report(db, "eynard traits", n, errors)


def load_calfee(db, path):
    ds = v2_service.ensure_dataset(
        db, "calfee2020", "Calfee 2020 아메리카 꿀벌 날개 길이", "public",
        citation="Calfee E et al. 2020 PLoS Genet, S1 Table; PRJNA622776",
        doi="10.1371/journal.pgen.1009038", license="확인 필요 — PLoS 부록(CC BY 로 보임)",
        notes="개체 단위 시료(봉군·여왕 정보 없음). 좌표는 0.01° 반올림해 저장.")
    v2_service.ensure_trait_definition(db, "wing_len_cm", "앞날개 길이", "Forewing length", "cm", "continuous",
                                       "individual", "morphology", 0, 2, protocol="Calfee et al. 2020 S1 Table `wing_length_cm`")
    with open(path, encoding="utf-8") as fh:
        data = list(csv.DictReader(fh, delimiter="\t"))
    samples = [{
        "code": r["Bee_ID"], "sample_type": "worker", "collected_date": r.get("collection_date") or None,
        "latitude": r.get("latitude"), "longitude": r.get("longitude"), "location": r.get("location"),
        "platform": "illumina", "status": "sequenced",
        "attributes_json": json.dumps({"population": r.get("population"), "feral_nest": r.get("feral_nest"),
                                       "A": r.get("A"), "C": r.get("C"), "M": r.get("M"),
                                       "est_coverage": r.get("est_coverage")}),
    } for r in data]
    n, errors = v2_service.import_samples(db, ds, samples)
    _commit_report(db, "calfee samples", n, errors)
    obs = [{"trait_code": "wing_len_cm", "value": r["wing_length_cm"], "date": r.get("collection_date") or None,
            "sample_code": r["Bee_ID"]} for r in data if r.get("wing_length_cm") not in (None, "", "NA")]
    n, errors = v2_service.import_trait_observations(db, ds, obs)
    _commit_report(db, "calfee traits", n, errors)


def load_gwas(db, folder, max_p=1e-5):
    rows = []
    for path in sorted(glob.glob(os.path.join(folder, "*.top200.tsv"))):
        with open(path, encoding="utf-8") as fh:
            for name, rs, a1, a0, af, beta, se, p in csv.reader(fh, delimiter="\t"):
                if float(p) > max_p:
                    continue
                population = name.split("_")[1]  # gemma_<집단>_<형질>_freq_lmm_...
                key = next(k for k in EYNARD_GWAS_TRAIT if name.startswith(f"gemma_{population}_{k}_"))
                chrom, pos = rs.split(":")
                rows.append({
                    "panel": "eynard2025_gwas_p1e-5", "marker_code": rs, "assembly": "Amel_HAv3.1",
                    "chrom": chrom, "pos": pos, "ref": a0, "alt": a1, "trait_code": EYNARD_GWAS_TRAIT[key],
                    "effect": beta, "effect_allele": a1, "allele_freq": af, "p_value": p, "population": population,
                    "source": f"Eynard 2025 GEMMA {name} (doi:10.1111/mec.17637)",
                })
    n, errors = v2_service.import_markers(db, rows)
    _commit_report(db, "gwas markers", n, errors)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["legacy", "inu", "eynard", "calfee", "gwas"])
    ap.add_argument("--dir")
    ap.add_argument("--file")
    args = ap.parse_args()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        v2_service.ensure_reference_data(db)
        if args.what == "legacy":
            print(v2_service.migrate_legacy(db))
        elif args.what == "inu":
            load_inu(db)
        elif args.what == "eynard":
            load_eynard(db, args.dir)
        elif args.what == "calfee":
            load_calfee(db, args.file)
        elif args.what == "gwas":
            load_gwas(db, args.dir)
    finally:
        db.close()


if __name__ == "__main__":
    main()
