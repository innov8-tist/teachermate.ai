"""
CO Mapper Module
Handles Course Outcome (CO) mapping functionality:
- CO template creation and management
- Student answer sheet processing
- Excel report generation
- Sync with Evaluation system
"""

from .router import router

__all__ = ["router"]
