import os
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List, Optional
from langchain_core.prompts import ChatPromptTemplate
import base64
from pathlib import Path
from dotenv import load_dotenv
from .db_operation import AnswerSchemaService

load_dotenv()

class QuestionAnswerExtraction(BaseModel):
    question: str = Field(
        description="The complete question text"
    )
    total_mark: int = Field(
        description="Total marks allocated for the question"
    )
    mark_criteria: List[str] = Field(
        description="How marks are distributed for the question"
    )
    answer: str = Field(
        description="The answer provided for the question"
    )
    image_explanation: Optional[str] = Field(
        default="",
        description="Explanation of any diagrams, graphs, or images present in the answer. Empty string if no images present"
    )

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_GEMINI_API_KEY"),
    temperature=0
)

llm_structured = llm.with_structured_output(QuestionAnswerExtraction)

def image_to_base64(image_path: str) -> str:
    """Convert image to base64 string"""
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode("utf-8")

def create_prompt_with_images(image_paths: List[str]) -> ChatPromptTemplate:
    """Create a prompt template that supports multiple images for a single question"""
    human_content = [
        {
            "type": "text",
            "text": "Extract the question, total marks, mark criteria, answer, and image explanation from the image(s). Note: The answer for ONE question may span across multiple images - combine all parts to extract the complete information."
        }
    ]
    
    for i, _ in enumerate(image_paths):
        human_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{{image_{i}}}"
            }
        })
    
    return ChatPromptTemplate.from_messages([
        ("system", """You are an exam answer sheet analyzer. Extract information for ONE question from the provided image(s).

        IMPORTANT: If multiple images are provided, they contain different parts of the SAME question's answer. Combine all parts together.

        Extract:
        1. The complete question text
        2. Total marks allocated for the question  
        3. Mark criteria (how marks are distributed)
        4. The COMPLETE student's answer (combine from all images if answer spans multiple images)
        5. If there are any diagrams, graphs, or images in the answer, provide a detailed explanation. If no images present, leave empty.

Be thorough and combine information from all images to provide a complete extraction."""),
        ("human", human_content)
    ])

def extract_from_images(image_paths: List[str]) -> QuestionAnswerExtraction:
    """Extract information from one or more images"""
    images_base64 = {f"image_{i}": image_to_base64(path) for i, path in enumerate(image_paths)}
    prompt = create_prompt_with_images(image_paths)
    formatted_prompt = prompt.format_messages(**images_base64)
    result = llm_structured.invoke(formatted_prompt)
    return result

def main(image_path: list, QUESTION_NO: str, SUBJECT_ID: int):
    result = extract_from_images(image_path)
    
    print("=" * 50)
    print("EXTRACTED INFORMATION")
    print("=" * 50)
    print(f"\nNumber of images processed: {len(image_path)}")
    print(f"\nQuestion: {result.question}")
    print(f"\nTotal Mark: {result.total_mark}")
    print(f"\nMark Criteria:")
    for i, criteria in enumerate(result.mark_criteria, 1):
        print(f"  {i}. {criteria}")
    print(f"\nAnswer: {result.answer}")
    print(f"\nImage Explanation: {result.image_explanation if result.image_explanation else 'No images present'}")
    print("=" * 50)
    
    try:
        with AnswerSchemaService() as service:
            db_record = service.insert_answer_schema(
                question_no=QUESTION_NO,
                subject_id=SUBJECT_ID,
                question=result.question,
                total_mark=result.total_mark,
                mark_criteria=result.mark_criteria,
                answer=result.answer,
                image_explanation=result.image_explanation
            )
            print(f"\nData saved to database with ID: {db_record.id}")
            
            return {
                "status": "success",
                "message": "Successfully inserted into database",
                "data": {
                    "id": db_record.id,
                    "question_no": QUESTION_NO,
                    "question": result.question,
                    "total_mark": result.total_mark,
                    "mark_criteria": result.mark_criteria,
                    "answer": result.answer,
                    "image_explanation": result.image_explanation
                }
            }
    except Exception as e:
        print(f"\n✗ Failed to save to database: {e}")
        return {
            "status": "error",
            "message": f"Failed to save to database: {str(e)}"
        }

