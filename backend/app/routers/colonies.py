from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_colonies(db, skip=skip, limit=limit, owner_id=current_user.id)


@router.get("/api/v1/apiaries/{apiary_id}/colonies", response_model=List[schemas.Colony])
def read_colonies_by_apiary(
    apiary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify apiary ownership
    apiary = crud.get_apiary(db, apiary_id=apiary_id, owner_id=current_user.id)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apiary not found")
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
    # Verify apiary ownership
    apiary = crud.get_apiary(db, apiary_id=colony.apiary_id, owner_id=current_user.id)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apiary not found or not owned by user")
    return crud.create_colony(db=db, colony=colony)


@router.delete("/api/v1/colonies/{colony_id}")
def delete_colony(
    colony_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify colony and apiary ownership before delete
    colony = crud.get_colony(db, colony_id=colony_id)
    if not colony:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found")
    
    apiary = crud.get_apiary(db, apiary_id=colony.apiary_id, owner_id=current_user.id)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found or not owned by user")
        
    success = crud.delete_colony(db, colony_id=colony_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found or delete failed")
    return {"message": f"Successfully deleted Colony {colony_id}"}
