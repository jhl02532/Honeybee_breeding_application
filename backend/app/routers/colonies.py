from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    tags=["Colonies"]
)

@router.get("/api/v1/colonies", response_model=List[schemas.Colony])
def read_colonies(
    skip: int = 0,
    limit: int = 100,
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "farmer":
        owner_id = current_user.id
    elif current_user.role in ["admin", "researcher"]:
        owner_id = None
    return crud.get_colonies(db, skip=skip, limit=limit, owner_id=owner_id)


@router.get("/api/v1/apiaries/{apiary_id}/colonies", response_model=List[schemas.Colony])
def read_colonies_by_apiary(
    apiary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    apiary = crud.get_apiary(db, apiary_id=apiary_id, owner_id=None)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apiary not found")
    if current_user.role == "farmer" and apiary.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="해당 양봉장의 봉군을 조회할 권한이 없습니다.")
    return crud.get_colonies_by_apiary(db, apiary_id=apiary_id)


@router.post("/api/v1/colonies", response_model=schemas.Colony, status_code=status.HTTP_201_CREATED)
def create_colony(
    colony: schemas.ColonyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_colony = crud.get_colony_by_code(db, code=colony.code)
    if db_colony:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Colony code already exists")
    
    apiary = crud.get_apiary(db, apiary_id=colony.apiary_id, owner_id=None)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apiary not found")
    if current_user.role == "farmer" and apiary.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="해당 양봉장에 봉군을 생성할 권한이 없습니다.")
    return crud.create_colony(db=db, colony=colony)


@router.delete("/api/v1/colonies/{colony_id}")
def delete_colony(
    colony_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    colony = crud.get_colony(db, colony_id=colony_id)
    if not colony:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found")
    
    apiary = crud.get_apiary(db, apiary_id=colony.apiary_id, owner_id=None)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apiary not found")
    if current_user.role == "farmer" and apiary.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="해당 봉군을 삭제할 권한이 없습니다.")
        
    success = crud.delete_colony(db, colony_id=colony_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found or delete failed")
    return {"message": f"Successfully deleted Colony {colony_id}"}
