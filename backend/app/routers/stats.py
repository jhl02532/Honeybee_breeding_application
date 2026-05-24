from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/v1/stats",
    tags=["Statistics"]
)

@router.get("/dashboard", response_model=schemas.IntegratedDashboardStats)
def read_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_dashboard_statistics(db, owner_id=current_user.id)
