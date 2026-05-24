from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/v1/apiaries",
    tags=["Apiaries"]
)

@router.get("", response_model=List[schemas.Apiary])
def read_apiaries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_apiaries(db, skip=skip, limit=limit, owner_id=current_user.id)


@router.post("", response_model=schemas.Apiary, status_code=status.HTTP_201_CREATED)
def create_apiary(
    apiary: schemas.ApiaryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_apiary = crud.get_apiary_by_name(db, name=apiary.name)
    if db_apiary:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apiary name already exists")
    return crud.create_apiary(db=db, apiary=apiary, owner_id=current_user.id)


@router.get("/{apiary_id}", response_model=schemas.Apiary)
def read_apiary(
    apiary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_apiary = crud.get_apiary(db, apiary_id=apiary_id, owner_id=current_user.id)
    if db_apiary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apiary not found")
    return db_apiary


@router.delete("/{apiary_id}")
def delete_apiary(
    apiary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.delete_apiary(db, apiary_id=apiary_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apiary not found or delete failed")
    return {"message": f"Successfully deleted Apiary {apiary_id}"}
