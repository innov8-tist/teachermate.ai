from .settings import Settings
from .schemas_prompts import (
    QuestionAnswerEvaluation,
    EvaluationResults,
    GEMINI_PROMPT,
    GROQ_PROMPT
)
from .lite_lllm_data import LiteLLMData
from .lite_llm_config import LiteLLMConfig
__all__ = [
    "Settings",
    "QuestionAnswerEvaluation",
    "EvaluationResults",
    "GEMINI_PROMPT",
    "GROQ_PROMPT",
    "LiteLLMData",
    "LiteLLMConfig",
]

__version__ = "1.0.0"
__author__ = "TeacherMate.ai"
__description__ = "LLM Gateway for AI-powered evaluation using LiteLLM routing"
