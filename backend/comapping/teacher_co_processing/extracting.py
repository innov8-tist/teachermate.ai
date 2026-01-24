import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field
from typing import List
from .db_operation import DBOperationTeacherCoProcessing
from dotenv import load_dotenv
import os
import base64

load_dotenv()


class COTEACHERPROCESSING(BaseModel):
    qno: str = Field(
        default=None,
        description="Extract the Question No."
    )
    co: str =Field(
        default=None,
        description="Extract the corresponding CO"
    )
class ListCO(BaseModel):
    items:List[COTEACHERPROCESSING]


llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_GEMINI_API_KEY"),
            temperature=0
            )

groq_llm = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0
)
llm_struct=llm.with_structured_output(ListCO)
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "human",
            [
                {
                    "type": "text",
                    "text":"Extract the text from the image"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,{image_base64}"
                    }
                }
            ]
        )
    ]
)

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

def format_for_groq(items):
    return "\n".join(
        [f"{item.qno} {item.co}" for item in items]
    )
def image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode("utf-8")

def main_func(image_path:str,subject_id:int):
    image_bs4 = image_to_base64(image_path)
    messages = prompt.format_messages(image_base64=image_bs4)
    result = llm_struct.invoke(messages)
    ocr_text = format_for_groq(result.items)
    structured_llm = groq_llm.with_structured_output(ListCO)
    result = structured_llm.invoke(
        groq_prompt.format_messages(ocr_text=ocr_text)
    )
    print(result)
    processed_arr=[]
    for data in result.items:
        convert_to_dict=data.__dict__
        processed_arr.append(convert_to_dict)
    obj=DBOperationTeacherCoProcessing()
    obj.insert_question_co_map(my_list=processed_arr,subject_id=subject_id)
    return {"status":"completed"}




