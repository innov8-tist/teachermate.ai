from pydantic import BaseModel
from typing import List
from fastapi import Form, UploadFile, File

class CoCreationModel(BaseModel):
    subject_name: str
    sem: int
    ia_number: int

