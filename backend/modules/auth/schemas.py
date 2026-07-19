from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SignupRequest(BaseModel):
    teacher_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    institution: Optional[str] = None


class LoginRequest(BaseModel):
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


class UpdateProfileRequest(BaseModel):
    teacher_name: Optional[str] = Field(None, min_length=2, max_length=100)
    institution: Optional[str] = None
