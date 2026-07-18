"""
Analytics Module
Provides analytics functionality for dashboard metrics and insights.

Structure:
- router.py: API endpoints
- service.py: Business logic layer
- repository.py: Database access layer
- schemas.py: Pydantic models for request/response
"""

from .router import router

__all__ = ["router"]
