from typing import Optional
from fastapi import UploadFile, HTTPException, status
import os

from .repository import AuthRepository
from .schemas import SignupRequest, LoginRequest, UpdateProfileRequest, TeacherResponse, TokenResponse
from .security import verify_password, get_password_hash, create_access_token
from .models import Teacher
from services.s3_service import s3_service


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository
    
    async def signup(
        self,
        teacher_name: str,
        email: str,
        password: str,
        institution: Optional[str] = None,
        pfp: Optional[UploadFile] = None
    ) -> TokenResponse:
        if self.repository.email_exists(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        if len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        pfp_url = None
        if pfp:
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            file_extension = os.path.splitext(pfp.filename)[1].lower()
            
            if file_extension not in allowed_extensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp"
                )
            
            file_content = await pfp.read()
            pfp_url = s3_service.upload_file(file_content, file_extension)
            
            if pfp and not pfp_url and s3_service.is_available:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to upload profile picture"
                )
        
        password_hash = get_password_hash(password)
        
        teacher = self.repository.create(
            name=teacher_name,
            email=email,
            password_hash=password_hash,
            institution=institution,
            pfp_url=pfp_url
        )
        
        access_token = create_access_token(data={"sub": teacher.id})
        
        return TokenResponse(
            access_token=access_token,
            teacher=TeacherResponse(
                id=teacher.id,
                teacher_name=teacher.name,
                email=teacher.email,
                institution=teacher.institution,
                pfp_url=teacher.pfp_url
            )
        )
    
    async def login(self, email: str, password: str) -> TokenResponse:
        teacher = self.repository.get_by_email(email)
        
        if not teacher or not verify_password(password, teacher.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": teacher.id})
        
        return TokenResponse(
            access_token=access_token,
            teacher=TeacherResponse(
                id=teacher.id,
                teacher_name=teacher.name,
                email=teacher.email,
                institution=teacher.institution,
                pfp_url=teacher.pfp_url
            )
        )
    
    def get_teacher_info(self, teacher: Teacher) -> TeacherResponse:
        return TeacherResponse(
            id=teacher.id,
            teacher_name=teacher.name,
            email=teacher.email,
            institution=teacher.institution,
            pfp_url=teacher.pfp_url
        )
    
    async def update_profile(
        self,
        teacher: Teacher,
        teacher_name: Optional[str] = None,
        institution: Optional[str] = None,
        pfp: Optional[UploadFile] = None
    ) -> TeacherResponse:
        if teacher_name:
            teacher.name = teacher_name
        
        if institution is not None:
            teacher.institution = institution
        
        if pfp:
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            file_extension = os.path.splitext(pfp.filename)[1].lower()
            
            if file_extension not in allowed_extensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp"
                )
            
            if teacher.pfp_url:
                s3_service.delete_file(teacher.pfp_url)
            
            file_content = await pfp.read()
            pfp_url = s3_service.upload_file(file_content, file_extension)
            
            if not pfp_url and s3_service.is_available:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to upload profile picture"
                )
            
            if pfp_url:
                teacher.pfp_url = pfp_url
        
        updated_teacher = self.repository.update(teacher)
        
        return TeacherResponse(
            id=updated_teacher.id,
            teacher_name=updated_teacher.name,
            email=updated_teacher.email,
            institution=updated_teacher.institution,
            pfp_url=updated_teacher.pfp_url
        )
    
    async def delete_profile_picture(self, teacher: Teacher) -> dict:
        if not teacher.pfp_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No profile picture to delete"
            )
        
        success = s3_service.delete_file(teacher.pfp_url)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete profile picture"
            )
        
        teacher.pfp_url = None
        self.repository.update(teacher)
        
        return {"message": "Profile picture deleted successfully"}
