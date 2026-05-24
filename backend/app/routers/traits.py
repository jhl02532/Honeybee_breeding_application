from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    tags=["Traits"]
)

@router.get("/api/v1/traits", response_model=List[schemas.TraitRecord])
def read_trait_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_trait_records(db, skip=skip, limit=limit, owner_id=current_user.id)


@router.get("/api/v1/colonies/{colony_id}/traits", response_model=List[schemas.TraitRecord])
def read_records_by_colony(
    colony_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    colony = crud.get_colony(db, colony_id=colony_id)
    if not colony:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found")
    
    # Secure ownership verification
    apiary = crud.get_apiary(db, apiary_id=colony.apiary_id, owner_id=current_user.id)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found or not owned by user")
        
    return crud.get_trait_records_by_colony(db, colony_id=colony_id)


@router.post("/api/v1/traits", response_model=schemas.TraitRecord, status_code=status.HTTP_201_CREATED)
def create_trait_record(
    record: schemas.TraitRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    colony = crud.get_colony(db, colony_id=record.colony_id)
    if not colony:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found")
        
    # Secure ownership verification
    apiary = crud.get_apiary(db, apiary_id=colony.apiary_id, owner_id=current_user.id)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found or not owned by user")
        
    return crud.create_trait_record(db=db, record=record)


@router.delete("/api/v1/traits/{record_id}")
def delete_trait_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Secure ownership verification
    record = db.query(models.TraitRecord).filter(models.TraitRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
        
    colony = crud.get_colony(db, colony_id=record.colony_id)
    if not colony:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colony not found")
        
    apiary = crud.get_apiary(db, apiary_id=colony.apiary_id, owner_id=current_user.id)
    if not apiary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found or not owned by user")
        
    success = crud.delete_trait_record(db, record_id=record_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found or delete failed")
    return {"message": f"Successfully deleted Trait Record {record_id}"}
