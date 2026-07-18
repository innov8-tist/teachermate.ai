from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from typing import Optional

from .schemas import TokenResponse, TeacherResponse
from .service import AuthService
from .dependencies import get_auth_service, get_current_teacher
from .models import Teacher

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    teacher_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    institution: Optional[str] = Form(None),
    pfp: Optional[UploadFile] = File(None),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.signup(
        teacher_name=teacher_name,
        email=email,
        password=password,
        institution=institution,
        pfp=pfp
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    email: str = Form(...),
    password: str = Form(...),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.login(email=email, password=password)


@router.get("/me", response_model=TeacherResponse)
async def get_current_teacher_info(
    current_teacher: Teacher = Depends(get_current_teacher),
    auth_service: AuthService = Depends(get_auth_service)
):
    return auth_service.get_teacher_info(current_teacher)


@router.put("/me", response_model=TeacherResponse)
async def update_teacher_profile(
    teacher_name: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
    pfp: Optional[UploadFile] = File(None),
    current_teacher: Teacher = Depends(get_current_teacher),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.update_profile(
        teacher=current_teacher,
        teacher_name=teacher_name,
        institution=institution,
        pfp=pfp
    )


@router.delete("/me/pfp")
async def delete_profile_picture(
    current_teacher: Teacher = Depends(get_current_teacher),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.delete_profile_picture(current_teacher)
