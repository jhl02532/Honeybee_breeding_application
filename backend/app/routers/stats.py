from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/v1/stats",
    tags=["Statistics"]
)

@router.get("/dashboard", response_model=schemas.IntegratedDashboardStats)
def read_dashboard_statistics(
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "farmer":
        owner_id = current_user.id
    return crud.get_dashboard_statistics(db, owner_id=owner_id)
