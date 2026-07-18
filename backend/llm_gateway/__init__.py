"""
LLM Gateway Package

This package provides LiteLLM-based routing and structured output generation
for Gemini and Groq models used in evaluation tasks.
"""

# Settings and Configuration
from .settings import Settings

# Schemas and Prompts
from .schemas_prompts import (
    QuestionAnswerEvaluation,
    EvaluationResults,
    GEMINI_PROMPT,
    GROQ_PROMPT
)

# LiteLLM Data Layer
from .lite_lllm_data import LiteLLMData

# LiteLLM Configuration and Main Interface
from .lite_llm_config import LiteLLMConfig

# Export all public interfaces
__all__ = [
    # Settings
    "Settings",
    
    # Schemas
    "QuestionAnswerEvaluation",
    "EvaluationResults",
    
    # Prompts
    "GEMINI_PROMPT",
    "GROQ_PROMPT",
    
    # Core Classes
    "LiteLLMData",
    "LiteLLMConfig",
]

# Package metadata
__version__ = "1.0.0"
__author__ = "TeacherMate.ai"
__description__ = "LLM Gateway for AI-powered evaluation using LiteLLM routing"
