from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from db_service.db import get_db
from db_service.db_schema import Teacher
from auth.security import decode_access_token

security = HTTPBearer()


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Teacher:
    """
    Dependency to get the current authenticated teacher from JWT token
    """
    token = credentials.credentials
    print(f"Received token: {token[:20]}..." if len(token) > 20 else f"Received token: {token}")
    
    payload = decode_access_token(token)
    if payload is None:
        print("✗ Token validation failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    teacher_id_str: str = payload.get("sub")
    if teacher_id_str is None:
        print("✗ No teacher ID in token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        teacher_id = int(teacher_id_str)
    except (ValueError, TypeError):
        print(f"✗ Invalid teacher ID format: {teacher_id_str}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if teacher is None:
        print(f"✗ Teacher not found with ID: {teacher_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teacher not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"✓ Authenticated teacher: {teacher.name} (ID: {teacher.id})")
    return teacher
