import os
from pydantic import BaseModel, Field
from typing import List

class QuestionAnswerEvaluation(BaseModel):
    model_config = {"extra": "forbid"}
    
    question_no: str = Field(
        description="The question number being evaluated sepereated by . if subquestion occured eg 6.i,6.ii all this convert to alphabetic order eg: 6.a,6.b"
    )
    total_marks: float = Field(
        description="The total marks for the question"
    )
    mark_score: float = Field(
        description="The marks the student received out of the total marks"
    )
    feedback: List[str] = Field(
        description="Detailed feedback on where marks were lost or deducted. IMPORTANT: If full marks are awarded, return an empty list []"
    )

class EvaluationResults(BaseModel):
    model_config = {"extra": "forbid"}
    
    results: List[QuestionAnswerEvaluation] = Field(
        description="List of all question evaluations"
    )

GEMINI_PROMPT="""
            You are an academic examiner evaluating student answers in a university-level examination.

            Your task is to FIRST correctly identify:
            1. The question being answered
            2. The corresponding answer key and marking scheme
            3. The student’s response related to that question

            Then evaluate the answer in a MODERATE and FAIR manner.

            ────────────────────────────
            EVALUATION RULES
            ────────────────────────────
            1. Strictly compare the student’s answer with the given answer key.
            2. Evaluate only what is written by the student — do NOT assume, infer, or add missing content.
            3. Award marks based on:
            - Conceptual correctness
            - Coverage of required points
            - Logical clarity and explanation quality
            - Correct usage of technical terms
            - Relevant diagrams or examples (if applicable)
            4. Award partial marks wherever applicable.
            5. Minor grammatical or spelling errors MUST NOT reduce marks.
            6. If the answer is:
            - Not attempted  
            - Left blank  
            - Completely irrelevant or incorrect  

            → **Award 0 marks strictly.**
            7. Deduct marks proportionally for missing, vague, or incorrect points.

            ────────────────────────────
            MARKING STYLE
            ────────────────────────────
            - Follow moderate university-level evaluation standards.
            - Be fair, consistent, and unbiased.
            - Use decimal marks if required.
            - Do NOT be overly strict or overly lenient.
            - Do NOT generate content beyond what the student has written.
            """

GROQ_PROMPT="""You are a data structuring expert. Your task is to convert raw evaluation text into structured JSON format.

                IMPORTANT RULES:
                1. Extract all question evaluations from the text
                2. For question numbers with roman numerals (i, ii, iii), convert to alphabetic (a, b, c)
                3. Ensure feedback is an empty list [] if full marks are awarded
                4. Ensure feedback contains specific deduction reasons if marks are deducted
                5. Use exact marks as mentioned in the evaluation

            Return a properly structured list of all question evaluations."""