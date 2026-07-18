from typing import Optional
from sqlalchemy.orm import Session
from .models import Teacher


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, teacher_id: int) -> Optional[Teacher]:
        return self.db.query(Teacher).filter(Teacher.id == teacher_id).first()
    
    def get_by_email(self, email: str) -> Optional[Teacher]:
        return self.db.query(Teacher).filter(Teacher.email == email).first()
    
    def email_exists(self, email: str) -> bool:
        return self.db.query(Teacher).filter(Teacher.email == email).first() is not None
    
    def create(
        self,
        name: str,
        email: str,
        password_hash: str,
        institution: Optional[str] = None,
        pfp_url: Optional[str] = None
    ) -> Teacher:
        teacher = Teacher(
            name=name,
            email=email,
            password_hash=password_hash,
            institution=institution,
            pfp_url=pfp_url
        )
        self.db.add(teacher)
        self.db.commit()
        self.db.refresh(teacher)
        return teacher
    
    def update(self, teacher: Teacher) -> Teacher:
        self.db.commit()
        self.db.refresh(teacher)
        return teacher
