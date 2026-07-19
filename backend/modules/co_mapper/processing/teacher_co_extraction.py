"""
Teacher CO Extraction
Extracts question-to-CO mappings from uploaded question paper images using LLM
Migrated from comapping/teacher_co_processing/extracting.py
"""

import base64
from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import ChatPromptTemplate

from llm_gateway import LiteLLMConfig
from llm_gateway.schemas_prompts import GEMINI_PROMPT, GROQ_PROMPT
from db_service import get_db
from modules.co_mapper.models import COQuestionMapping


class COTEACHERPROCESSING(BaseModel):
    qno: str = Field(
        default=None,
        description="Extract the Question No."
    )
    co: str = Field(
        default=None,
        description="Extract the corresponding CO"
    )


class ListCO(BaseModel):
    items: List[COTEACHERPROCESSING]


def image_to_base64(image_path: str) -> str:
    """Convert image file to base64 string"""
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode("utf-8")


def format_for_groq(items):
    """Format extracted items for Groq processing"""
    return "\n".join(
        [f"{item.qno} {item.co}" for item in items]
    )


def extract_co_mappings_from_image(image_path: str, subject_id: int):
    """
    Main extraction function: Extract Q→CO mappings from image and save to database
    
    Args:
        image_path: Path to the uploaded CO template image
        subject_id: Template ID to associate mappings with
        
    Returns:
        dict with status
    """
    # Initialize LLM config
    obj = LiteLLMConfig(GEMINI_PROMPT=GEMINI_PROMPT, GROQ_PROMPT=GROQ_PROMPT)
    llm = obj.gemini_lanchain
    groq_llm = obj.groq_litellm
    
    # Prepare structured LLM
    llm_struct = llm.with_structured_output(ListCO)
    
    # Prompt for Gemini vision
    prompt = ChatPromptTemplate.from_messages([
        ("human", [
            {"type": "text", "text": "Extract the text from the image"},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,{image_base64}"}}
        ])
    ])
    
    # Groq prompt for normalization
    groq_prompt = ChatPromptTemplate.from_messages([
        ("human", """
You are given OCR text from a question paper.

TASK:
- Extract question number and CO.
- If sub-questions exist, format as:
  1.a, 1.b, 2.a
- Convert:
  6.i -> 6.a
  6a → 6.a
  7 b → 7.b
  etc..
  IMPORTANT if the question have sub question it should be . seperated .a,.b etc..
- Do NOT merge questions.
- Output must strictly match the schema.

OCR TEXT:
{ocr_text}
""")
    ])
    
    # Step 1: Extract with Gemini vision
    image_bs4 = image_to_base64(image_path)
    messages = prompt.format_messages(image_base64=image_bs4)
    result = llm_struct.invoke(messages)
    
    # Step 2: Normalize with Groq
    ocr_text = format_for_groq(result.items)
    structured_llm = groq_llm.with_structured_output(ListCO)
    result = structured_llm.invoke(
        groq_prompt.format_messages(ocr_text=ocr_text)
    )
    
    print(result)
    
    # Step 3: Convert to list of dicts
    processed_arr = []
    for data in result.items:
        convert_to_dict = data.__dict__
        processed_arr.append(convert_to_dict)
    
    # Step 4: Save to database
    insert_question_co_map(my_list=processed_arr, subject_id=subject_id)
    
    return {"status": "completed"}


def insert_question_co_map(my_list, subject_id: int):
    """
    Insert question to CO mappings from teacher's uploaded template
    
    Args:
        my_list: List of dicts with 'qno' and 'co' keys
        subject_id: Template ID
    """
    db = next(get_db())
    try:
        mappings = []
        for item in my_list:
            co_code = item["co"].upper()
            q_no = item["qno"]
            mappings.append(
                COQuestionMapping(
                    q_no=q_no,
                    co_no=co_code,
                    template_id=subject_id
                )
            )
        db.add_all(mappings)
        db.commit()
        print("Question-CO mapping inserted")
    finally:
        db.close()
