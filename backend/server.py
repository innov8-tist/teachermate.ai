from fastapi import FastAPI, Depends, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import uvicorn
import os
import uuid
import tempfile
import asyncio
from pathlib import Path
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from db_operation.db_server import DBServiceForServer
from dependencies import get_db_service
from modules.auth import router as auth_router
from modules.auth.dependencies import get_current_teacher
from modules.auth.models import Teacher
from modules.analytics import router as analytics_router
from modules.co_mapper import router as co_mapper_router
from modules.evaluations import router as evaluations_router, router_no_prefix as evaluations_router_no_prefix
from services.s3_service import s3_service
from datetime import datetime
from modules.co_mapper.models import COTemplate
from db_service.db_schema import StudentAnswerEvaluation, STUDENTINFO
from db_service.db_schema import EvaluationSchema, StudentEvaluationProgress
from modules.co_mapper.models import StudentAnswerMark
from llm_gateway.lite_llm_config import LiteLLMConfig
from llm_gateway.schemas_prompts import GEMINI_PROMPT,GROQ_PROMPT
import requests
import sys
import traceback
import fitz
import tempfile
import os
import shutil
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)
app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(co_mapper_router)
app.include_router(evaluations_router)
app.include_router(evaluations_router_no_prefix)
os.makedirs("public", exist_ok=True)
app.mount("/public", StaticFiles(directory="public"), name="public")


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.get("/health")
def health_check():
    """
    Health check endpoint for monitoring and load balancers
    Returns service status, environment info, and database connectivity
    """
    try:
        environment = os.getenv("ENVIRONMENT", "development")

        db_service = DBServiceForServer()
        try:
            from sqlalchemy import text
            db_service.db.execute(text("SELECT 1"))
            db_status = "healthy"
            db_message = "Database connection successful"
        except Exception as e:
            db_status = "unhealthy"
            db_message = f"Database error: {str(e)}"
        finally:
            db_service.close()

        s3_status = "available" if s3_service.is_available else "unavailable"

        return {
            "status": "healthy" if db_status == "healthy" else "degraded",
            "message": "Service is running",
            "environment": environment,
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.2",
            "services": {
                "database": {
                    "status": db_status,
                    "message": db_message
                },
                "s3": {
                    "status": s3_status
                }
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Health check failed: {str(e)}",
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "timestamp": datetime.now().isoformat()
        }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
