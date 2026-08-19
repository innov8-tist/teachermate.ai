"""
Teacher CO Extraction
Extracts question-to-CO mappings from uploaded question paper images using LLM
Migrated from comapping/teacher_co_processing/extracting.py
"""

import base64
from pydantic import BaseModel, Field
from typing import List
import asyncio
from langchain_core.prompts import ChatPromptTemplate

from llm_gateway import LiteLLMConfig
from llm_gateway.schemas_prompts import GEMINI_PROMPT, GROQ_PROMPT
from db_service import get_db
from modules.co_mapper.models import COQuestionMapping


class COTEACHERPROCESSING(BaseModel):
    qno: str = Field(
        description="Extract the Question No."
    )
    co: str = Field(
        description="Extract the corresponding CO"
    )


class ListCO(BaseModel):
    items: List[COTEACHERPROCESSING]


def image_to_base64(image_path: str) -> str:
    """Convert image file to base64 string"""
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode("utf-8")


def format_for_groq(items):
    """Format extracted items for Groq processing."""
    return "\n".join(
        f"{item.qno} {item.co}"
        for item in items
    )


def extract_co_mappings_from_image(image_path: str, subject_id: int):
    """
    Extract Q→CO mappings from image and save them to database.
    """

    obj = LiteLLMConfig(
        GEMINI_PROMPT=GEMINI_PROMPT,
        GROQ_PROMPT=GROQ_PROMPT
    )

    gemini_llm = obj.gemini_lanchain

    gemini_structured = gemini_llm.with_structured_output(
        ListCO
    )
    prompt = ChatPromptTemplate.from_messages([
        (
            "human",
            [
                {
                    "type": "text",
                    "text": "Extract the question number and corresponding CO from this image."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,{image_base64}"
                    }
                }
            ]
        )
    ])

    # ---------------------------------------------------------
    # Step 1: Extract using Gemini
    # ---------------------------------------------------------

    image_bs4 = image_to_base64(image_path)

    messages = prompt.format_messages(
        image_base64=image_bs4
    )

    gemini_result = gemini_structured.invoke(messages)

    print("Gemini result:")
    print(gemini_result)

    # ---------------------------------------------------------
    # Convert Gemini result to text for Groq
    # ---------------------------------------------------------

    ocr_text = format_for_groq(
        gemini_result.items
    )

    print("\nText sent to Groq:")
    print(ocr_text)

    # ---------------------------------------------------------
    # Step 2: Groq structured output
    # ---------------------------------------------------------

    groq_messages = [
        {
            "role": "system",
            "content": """
You are given question-to-CO mappings extracted from an image.

Normalize the question numbers.

Rules:

1. Normal question:
   1 → 1

2. Subquestions must use dot notation:
   6.i → 6.a
   6.ii → 6.b
   6a → 6.a
   7 b → 7.b

3. Convert roman numerals to alphabetic order:
   i → a
   ii → b
   iii → c
   iv → d

4. Never merge questions.

5. Preserve the corresponding CO.

6. Return every question from the input.

7. Output must strictly follow the provided JSON schema.
"""
        },
        {
            "role": "user",
            "content": f"""
Normalize these question-to-CO mappings:

{ocr_text}
"""
        }
    ]

    response = asyncio.run(
        obj.groq_router.acompletion(
            model="groq",
            messages=groq_messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "list_co",
                    "strict": True,
                    "schema": ListCO.model_json_schema()
                }
            }
        )
    )

    # ---------------------------------------------------------
    # Parse Groq response
    # ---------------------------------------------------------

    result = ListCO.model_validate_json(
        response.choices[0].message.content
    )

    print("\nGroq result:")
    print(result)

    # ---------------------------------------------------------
    # Step 3: Convert to dictionaries
    # ---------------------------------------------------------

    processed_arr = [
        data.model_dump()
        for data in result.items
    ]

    print("\nProcessed:")
    print(processed_arr)

    # ---------------------------------------------------------
    # Step 4: Save to database
    # ---------------------------------------------------------

    insert_question_co_map(
        my_list=processed_arr,
        subject_id=subject_id
    )

    return {
        "status": "completed",
        "items": processed_arr
    }


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
