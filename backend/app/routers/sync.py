from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, models
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/v1/sync",
    tags=["Synchronization"]
)

@router.post("/bulk", response_model=schemas.BulkSyncResponse)
def bulk_sync_user_data(
    payload: schemas.BulkSyncPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """오프라인 상태에서 모바일/웹에 누적 저장된 모든 봉장/벌통/기록을 일괄 동기화 트랜잭션 처리"""
    try:
        result = crud.bulk_sync_data(db=db, owner_id=current_user.id, payload=payload)
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"동기화 중 오류가 발생했습니다: {str(e)}"
        )
