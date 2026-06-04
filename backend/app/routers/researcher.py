import csv
import io
import os
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/v1/researcher",
    tags=["Researcher Console"]
)

# Dependency guard to check researcher role
def get_current_researcher(current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["researcher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="연구원 또는 관리자 권한이 필요합니다"
        )
    return current_user


@router.get("/stats", response_model=schemas.ResearcherStats)
def read_global_statistics(
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """전국 농가의 통합 빅데이터 통계 연산"""
    total_farmers = db.query(models.User).filter(models.User.role == "farmer").count()
    total_apiaries = db.query(models.Apiary).count()
    total_colonies = db.query(models.Colony).count()
    total_records = db.query(models.TraitRecord).count()

    # Averages
    avg_honey = db.query(func.avg(models.TraitRecord.honey_production)).scalar() or 0.0
    avg_propolis = db.query(func.avg(models.TraitRecord.propolis_production)).scalar() or 0.0
    avg_royal_jelly = db.query(func.avg(models.TraitRecord.royal_jelly_production)).scalar() or 0.0
    avg_survival = db.query(func.avg(models.TraitRecord.overwintering_survival)).scalar() or 0.0

    # Status breakdown
    active_colonies = db.query(models.Colony).filter(models.Colony.status == "Active").count()
    weak_colonies = db.query(models.Colony).filter(models.Colony.status == "Weak").count()
    dead_colonies = db.query(models.Colony).filter(models.Colony.status == "Dead").count()
    queen_types = db.query(models.Colony.queen_tag).distinct().count()

    return {
        "total_farmers": total_farmers,
        "total_apiaries": total_apiaries,
        "total_colonies": total_colonies,
        "total_records": total_records,
        "avg_honey": round(float(avg_honey), 2),
        "avg_propolis": round(float(avg_propolis), 2),
        "avg_royal_jelly": round(float(avg_royal_jelly), 2),
        "avg_survival_rate": round(float(avg_survival), 2),
        "active_colonies": active_colonies,
        "weak_colonies": weak_colonies,
        "dead_colonies": dead_colonies,
        "queen_types": queen_types
    }


@router.get("/farmers")
def read_farmers_registry(
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """전국 양봉 협력 농가 가입 현황 모니터링"""
    farmers = db.query(models.User).filter(models.User.role == "farmer").all()
    res = []
    for f in farmers:
        apiaries_count = len(f.apiaries)
        colonies_count = sum(len(a.colonies) for a in f.apiaries)
        res.append({
            "id": f.id,
            "username": f.username,
            "farm_name": f.farm_name or "미지정",
            "apiaries_count": apiaries_count,
            "colonies_count": colonies_count
        })
    return res


@router.get("/morphological", response_model=List[schemas.MorphologicalRecord])
def read_morphological_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """실험실 형태학적 측정 샘플 전체 조회"""
    return crud.get_morphological_records(db, skip=skip, limit=limit)


@router.post("/morphological", response_model=schemas.MorphologicalRecord, status_code=status.HTTP_201_CREATED)
def create_morphological_record(
    record: schemas.MorphologicalRecordCreate,
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """여왕벌(queen_tag) 기준 연구실 정밀 형태학적 측정 샘플링 기입"""
    # Verify colony exists if provided
    if record.colony_id:
        colony = crud.get_colony(db, colony_id=record.colony_id)
        if not colony:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found")
    return crud.create_morphological_record(db=db, record=record)


@router.delete("/morphological/{record_id}")
def delete_morphological_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    success = crud.delete_morphological_record(db, record_id=record_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return {"message": f"Successfully deleted Morphological Record {record_id}"}


@router.get("/export/csv")
def export_global_csv(
    db: Session = Depends(get_db),
    current_researcher: models.User = Depends(get_current_researcher)
):
    """전국 농가의 형질 내검 기록 및 형태 측정 기록을 Excel 호환 BOM CSV 패키지로 일괄 추출"""
    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "농가아이디",
        "농장명",
        "봉장명",
        "벌통코드",
        "여왕벌태그",
        "날짜",
        "꿀생산량(kg)",
        "프로폴리스(g)",
        "로얄젤리(g)",
        "온순함",
        "바이러스저항성",
        "응애저항성",
        "분봉률(%)",
        "월동생존율(%)",
        "VSH율(%)",
        "핀테스트청소율(%)",
        "기온(°C)",
        "습도(%)",
        "실험실_큐비탈지수",
        "실험실_혀길이(mm)",
        "실험실_복판색상",
        "실험실_후경길이(mm)",
        "실험실_후경너비(mm)",
        "비고"
    ]
    writer.writerow(headers)

    # Query all trait records joined with colony, apiary, and owner user
    records = db.query(models.TraitRecord).join(models.Colony).join(models.Apiary).join(models.User).all()

    for r in records:
        colony = r.colony
        apiary = colony.apiary
        user = apiary.owner_user

        # Fetch latest morphological sample matching the queen_tag of this colony, if any
        morph = db.query(models.MorphologicalRecord).filter(
            models.MorphologicalRecord.queen_tag == colony.queen_tag
        ).order_by(models.MorphologicalRecord.date.desc()).first()

        writer.writerow([
            user.username,
            user.farm_name or "미지정",
            apiary.name,
            colony.code,
            colony.queen_tag,
            r.date,
            r.honey_production,
            r.propolis_production,
            r.royal_jelly_production,
            r.temperament,
            r.virus_resistance,
            r.mite_resistance,
            r.swarming_rate,
            r.overwintering_survival,
            r.vsh_rate,
            r.hygienic_rate,
            r.temperature if r.temperature is not None else "",
            r.humidity if r.humidity is not None else "",
            morph.cubital_index if morph else "",
            morph.proboscis_length if morph else "",
            morph.tergite_color if morph else "",
            morph.basitarsus_length if morph else "",
            morph.basitarsus_width if morph else "",
            r.notes or ""
        ])

    csv_data = "\ufeff" + output.getvalue()
    return Response(
        content=csv_data.encode("utf-8"),
        media_type="text/csv;charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=MelittaBreed_Researcher_MasterData.csv"
        }
    )


GLOBAL_MASTER_DF = None

def load_global_dfs():
    global GLOBAL_MASTER_DF
    if GLOBAL_MASTER_DF is not None:
        return
    import pandas as pd
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    pore_c_path = os.path.join(BASE_DIR, "..", "data", "sampling", "sampling_pore_c.tsv")
    ac_path = os.path.join(BASE_DIR, "..", "data", "sampling", "sampling_ac.tsv")
    am_path = os.path.join(BASE_DIR, "..", "data", "sampling", "sampling_am.tsv")
    global_path = os.path.join(BASE_DIR, "..", "data", "sampling", "wgs_world_data.tsv")

    # 1. Load domestic files
    df_pore_c = pd.read_csv(pore_c_path, sep="\t") if os.path.exists(pore_c_path) else pd.DataFrame()
    df_ac = pd.read_csv(ac_path, sep="\t") if os.path.exists(ac_path) else pd.DataFrame()
    df_am = pd.read_csv(am_path, sep="\t") if os.path.exists(am_path) else pd.DataFrame()

    # Normalize column names strip whitespace
    for df in [df_pore_c, df_ac, df_am]:
        if not df.empty:
            df.columns = df.columns.str.strip()

    # Normalize species
    if not df_pore_c.empty and "종" in df_pore_c.columns:
        def normalize_species(val):
            val_str = str(val).lower()
            if "cerana" in val_str or "토종" in val_str or "동양" in val_str:
                return "Apis cerana"
            return "Apis mellifera"
        df_pore_c["종"] = df_pore_c["종"].apply(normalize_species)
    
    if not df_ac.empty:
        df_ac["종"] = "Apis cerana"
    if not df_am.empty:
        df_am["종"] = "Apis mellifera"

    # Track Pore-C sample IDs (for subset flag is_pore_c = True)
    pore_c_ids = set()
    if not df_pore_c.empty and "시료 ID" in df_pore_c.columns:
        pore_c_ids = set(df_pore_c["시료 ID"].dropna().astype(str).str.strip().str.upper().unique())

    # Combine domestic DataFrames
    dfs_to_concat = [df for df in [df_pore_c, df_ac, df_am] if not df.empty]
    if dfs_to_concat:
        domestic_df = pd.concat(dfs_to_concat, ignore_index=True)
    else:
        domestic_df = pd.DataFrame(columns=["채집일자", "시료전달일자", "권역", "주소 (상세)", "농가(대표자)", "시료 ID", "계통", "종", "lat", "lng"])

    # Strict Deduplication on "시료 ID" (case-insensitive)
    if "시료 ID" in domestic_df.columns:
        domestic_df["시료 ID"] = domestic_df["시료 ID"].astype(str).str.strip().str.upper()
        domestic_df = domestic_df.drop_duplicates(subset=["시료 ID"], keep="first")
    
    # Add dynamic flags
    if "시료 ID" in domestic_df.columns:
        domestic_df["is_pore_c"] = domestic_df["시료 ID"].apply(lambda x: str(x) in pore_c_ids if pd.notna(x) else False)
    else:
        domestic_df["is_pore_c"] = False

    domestic_df["수집구분"] = "프로젝트 자체 생산"

    # 2. Global mode
    if os.path.exists(global_path):
        global_df = pd.read_csv(global_path, sep="\t")
        global_df.columns = global_df.columns.str.strip()
    else:
        global_df = pd.DataFrame(columns=["Country", "Region", "Species", "Count", "lat", "lng"])
    
    global_df["is_pore_c"] = False
    global_df["수집구분"] = "공공 데이터 수집"

    GLOBAL_MASTER_DF = {
        "domestic": domestic_df,
        "global": global_df
    }


@router.get("/sampling-status")
def get_sampling_status(
    request: Request,
    mode: Optional[str] = None,  # domestic 또는 global
    species: Optional[str] = None,
    source_type: Optional[str] = None, # 프로젝트 자체 생산, 공공 데이터 수집 또는 Pore-C 핵심 집단 (50개체)
    region: Optional[str] = None,      # 국내 권역 용
    country: Optional[str] = None      # 해외 국가 용
):
    """가입자 전체에 오프라인 파일 로드 없이 전량 메모리에서 0.01초 내 집계하는 고속 유전자원 수집 현황 API"""
    load_global_dfs()

    try:
        # mode 기본값 설정
        if not mode:
            mode = "domestic"

        # Copy dataframe from cache to prevent mutations
        df = GLOBAL_MASTER_DF[mode].copy()

        # Apply Filters
        if species and species != "선택 안 함":
            col = "종" if "종" in df.columns else "Species"
            if col in df.columns:
                df = df[df[col] == species]
                
        if source_type and source_type != "선택 안 함":
            if source_type in ["Pore-C 핵심 집단 (50개체)", "pore_c", "Pore-C용 샘플(50개체)"]:
                if "is_pore_c" in df.columns:
                    df = df[df["is_pore_c"].astype(str).str.lower().isin(["true", "1"])]
            elif "수집구분" in df.columns:
                df = df[df["수집구분"] == source_type]
            
        if mode == "domestic" and region and region != "전체":
            col = "권역" if "권역" in df.columns else "Region"
            if col in df.columns:
                df = df[df[col] == region]
        elif mode == "global" and country and country != "전체":
            col = "국가" if "국가" in df.columns else "Country"
            if col in df.columns:
                df = df[df[col] == country]

        # Privacy Leak Check: Drop personal data columns to prevent leakage
        cols_to_drop = [c for c in ["농가(대표자)", "농가주", "연락처", "주소 (상세)", "주소", "대표자"] if c in df.columns]
        if cols_to_drop:
            df = df.drop(columns=cols_to_drop)

        # JSON Crash Prevention
        df = df.astype(str).replace({"nan": "", "NaN": "", "None": ""})
        # Restore boolean/numeric types for appropriate properties
        if "is_pore_c" in df.columns:
            df["is_pore_c"] = df["is_pore_c"].isin(["True", "true", "1"])
            
        result_records = df.to_dict(orient="records")

        return {
            "status": "success",
            "mode": mode,
            "total_count": len(result_records),
            "data": result_records
        }

    except Exception as e:
        import traceback
        print(f"Error in get_sampling_status: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"필터 파이프라인 연산 중 런타임 캐시 크래시 발생: {str(e)}"
        )



@router.get("/phylogeny-data")
def get_phylogeny_data():
    """mtDNA 계통수 Newick 파일 및 TSV 메타데이터를 상대경로로 읽어 일괄 조회"""
    mt_dna_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "mtDNA")
    
    trees = {}
    tree_files = {
        "korean_with_mellifera": "korean_with_mellifera_tree_rooted.treefile",
        "korean_only": "korean_only_tree_rooted.treefile",
        "balanced": "balanced_mtDNA_tree.treefile"
    }
    
    for key, fname in tree_files.items():
        path = os.path.join(mt_dna_dir, fname)
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    trees[key] = f.read().strip()
            else:
                # Try unrooted fallback if rooted file is missing
                unrooted_fname = fname.replace("_rooted", "")
                unrooted_path = os.path.join(mt_dna_dir, unrooted_fname)
                if os.path.exists(unrooted_path):
                    with open(unrooted_path, "r", encoding="utf-8") as f:
                        trees[key] = f.read().strip()
                else:
                    trees[key] = ""
        except Exception as e:
            print(f"Error reading tree file {fname}: {str(e)}")
            trees[key] = ""
            
    # Read metadata TSV
    metadata = []
    tsv_path = os.path.join(mt_dna_dir, "mtDNA_metadata.tsv")
    try:
        if os.path.exists(tsv_path):
            with open(tsv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f, delimiter="\t")
                for row in reader:
                    metadata.append(dict(row))
    except Exception as e:
        print(f"Error reading TSV metadata: {str(e)}")
        
    return {
        "trees": trees,
        "metadata": metadata
    }


@router.get("/wgs-world-data")
def get_wgs_world_data():
    """WGS 세계지도 시각화를 위한 정제된 TSV 데이터 조회"""
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.join(BASE_DIR, "..", "data", "sampling", "wgs_world_data.tsv")
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WGS 세계지도 데이터가 존재하지 않습니다."
        )
    try:
        import pandas as pd
        df = pd.read_csv(filepath, sep="\t")
        df = df.astype(str).replace({"nan": "", "NaN": "", "None": ""})
        data = df.to_dict(orient="records")
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        import traceback
        error_detail = f"WGS 데이터 직렬화 분석 중 내부 오류 발생: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )


