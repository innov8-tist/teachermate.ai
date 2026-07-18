from fastapi import Depends
from sqlalchemy.orm import Session
from db_service.db import get_db
from .repository import AuthRepository
from .service import AuthService
from .security import get_current_teacher as get_current_teacher_dependency

get_current_teacher = get_current_teacher_dependency


def get_auth_repository(db: Session = Depends(get_db)) -> AuthRepository:
    return AuthRepository(db)


def get_auth_service(repository: AuthRepository = Depends(get_auth_repository)) -> AuthService:
    return AuthService(repository)
