import re
from langchain_community.document_loaders import PyMuPDFLoader
from pydantic import BaseModel, Field,RootModel
from typing import List
from agno.models.openrouter import OpenRouter
from agno.models.google import Gemini
from dotenv import load_dotenv
from agno.agent import Agent
import os
load_dotenv()

class QuestionMarkScheme(BaseModel):
    question_number: str = Field(
        description="Question number including sub-parts (e.g., 6(i), 6(ii))"
    )
    total_marks: int = Field(
        description="Total marks allocated for the question"
    )
    mark_criteria: List[str] = Field(
        description="Point-wise mark criteria exactly as mentioned in the answer scheme"
    )


class AnswerSchemeOutput(RootModel[List[QuestionMarkScheme]]):
    pass
file_path = "MP IA1 Question paper Answer scheme.pdf"
loader = PyMuPDFLoader(file_path)
documents = loader.load()

combined_text = ""

for i, doc in enumerate(documents):
    combined_text += "\n" + doc.page_content


agent = Agent(
    model=OpenRouter(id="mistralai/devstral-2512:free",api_key="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"),
    description=(
        "This agent extracts structured mark allocation data from raw text "
        "obtained from an exam ANSWER SCHEME PDF. "
        "It is designed for automated grading systems and exam analytics "
        "where deterministic, schema-compliant output is required."
    ),
    instructions=("""
            You are an exam answer-scheme extraction agent.

            Your task is to analyze raw extracted text from an ANSWER SCHEME PDF and
            extract structured mark information for EVERY question and sub-question.

            For EACH question or sub-question, extract ONLY:
            1. question_number
            2. total_marks (INTEGER only)
            3. mark_criteria as a LIST of POINT-WISE CRITERIA exactly as written
            in the answer scheme.

            MARK CRITERIA EXTRACTION RULES:
            - Extract criteria exactly as stated in the scheme.
            - Preserve examiner wording and intent.
            - Include statements like:
            • "Any 3 points – 1 mark each"
            • "Diagram – 3 marks"
            • "Explanation – 4 marks"
            • "Any 2 with diagram and explanation – 3.5 marks each"
            - Do NOT split marks.
            - Do NOT interpret, rebalance, or normalize marks.
            - Do NOT infer evaluation logic.
            - Do NOT convert criteria into weights or categories.

            STRICT OUTPUT RULES:
            - Output MUST be a JSON ARRAY.
            - Each object MUST contain ONLY:
            question_number, total_marks, mark_criteria
            - mark_criteria MUST be a LIST of STRINGS.
            - Do NOT include explanations, answers, or extra text.
            - Preserve the order of criteria as mentioned.
            - Do NOT miss any question or sub-question.

            Output MUST strictly conform to the AnswerSchemeOutput schema.
        """
    ),
    output_schema=AnswerSchemeOutput,
    markdown=True
)
result = agent.run(combined_text)
print(result.content)