from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os

from db_service.db import get_db
from db_service.db_schema import Teacher
from models.auth_models import (
    TeacherSignup, 
    TeacherLogin, 
    TokenResponse, 
    TeacherResponse,
    TeacherUpdate
)
from auth.security import verify_password, get_password_hash, create_access_token
from auth.dependencies import get_current_teacher
from services.s3_service import s3_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    teacher_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    institution: Optional[str] = Form(None),
    pfp: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Register a new teacher account
    """
    # Check if email already exists
    existing_teacher = db.query(Teacher).filter(Teacher.email == email).first()
    if existing_teacher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password length
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Upload profile picture if provided
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
        
        # Only fail if S3 is available but upload failed
        if pfp and not pfp_url and s3_service.is_available:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload profile picture"
            )
    
    # Create new teacher
    hashed_password = get_password_hash(password)
    new_teacher = Teacher(
        name=teacher_name,
        email=email,
        password_hash=hashed_password,
        institution=institution,
        pfp_url=pfp_url
    )
    
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)
    
    # Create access token
    access_token = create_access_token(data={"sub": new_teacher.id})
    
    teacher_response = TeacherResponse(
        id=new_teacher.id,
        teacher_name=new_teacher.name,
        email=new_teacher.email,
        institution=new_teacher.institution,
        pfp_url=new_teacher.pfp_url
    )
    
    return TokenResponse(
        access_token=access_token,
        teacher=teacher_response
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Login with email and password
    """
    teacher = db.query(Teacher).filter(Teacher.email == email).first()
    
    if not teacher or not verify_password(password, teacher.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": teacher.id})
    print(f"Generated token length: {len(access_token)}")
    print(f"Token (first 100): {access_token[:100]}")
    
    teacher_response = TeacherResponse(
        id=teacher.id,
        teacher_name=teacher.name,
        email=teacher.email,
        institution=teacher.institution,
        pfp_url=teacher.pfp_url
    )
    
    return TokenResponse(
        access_token=access_token,
        teacher=teacher_response
    )


@router.get("/me", response_model=TeacherResponse)
async def get_current_teacher_info(
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Get current authenticated teacher information
    """
    return TeacherResponse(
        id=current_teacher.id,
        teacher_name=current_teacher.name,
        email=current_teacher.email,
        institution=current_teacher.institution,
        pfp_url=current_teacher.pfp_url
    )


@router.put("/me", response_model=TeacherResponse)
async def update_teacher_profile(
    teacher_name: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
    pfp: Optional[UploadFile] = File(None),
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Update teacher profile information
    """
    # Update fields if provided
    if teacher_name:
        current_teacher.name = teacher_name
    
    if institution is not None:
        current_teacher.institution = institution
    
    # Handle profile picture update
    if pfp:
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_extension = os.path.splitext(pfp.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp"
            )
        
        # Delete old profile picture if exists
        if current_teacher.pfp_url:
            s3_service.delete_file(current_teacher.pfp_url)
        
        # Upload new profile picture
        file_content = await pfp.read()
        pfp_url = s3_service.upload_file(file_content, file_extension)
        
        # Only fail if S3 is available but upload failed
        if not pfp_url and s3_service.is_available:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload profile picture"
            )
        
        if pfp_url:
            current_teacher.pfp_url = pfp_url
    
    db.commit()
    db.refresh(current_teacher)
    
    return TeacherResponse(
        id=current_teacher.id,
        teacher_name=current_teacher.name,
        email=current_teacher.email,
        institution=current_teacher.institution,
        pfp_url=current_teacher.pfp_url
    )


@router.delete("/me/pfp")
async def delete_profile_picture(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Delete teacher profile picture
    """
    if not current_teacher.pfp_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile picture to delete"
        )
    
    # Delete from S3
    success = s3_service.delete_file(current_teacher.pfp_url)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile picture"
        )
    
    # Update database
    current_teacher.pfp_url = None
    db.commit()
    
    return {"message": "Profile picture deleted successfully"}
