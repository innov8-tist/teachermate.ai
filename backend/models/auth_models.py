from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class TeacherSignup(BaseModel):
    teacher_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    institution: Optional[str] = None


class TeacherLogin(BaseModel):
    email: EmailStr
    password: str


class TeacherResponse(BaseModel):
    id: int
    teacher_name: str
    email: str
    institution: Optional[str]
    pfp_url: Optional[str]
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    teacher: TeacherResponse


class TeacherUpdate(BaseModel):
    teacher_name: Optional[str] = Field(None, min_length=2, max_length=100)
    institution: Optional[str] = None
