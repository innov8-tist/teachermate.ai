import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI
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


llm_struct=llm.with_structured_output(ListCO)
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "human",
            [
                {
                    "type": "text",
                    "text": (
                        "You are an AI system that extracts Question Numbers and CO values from the given image.\n\n"
                        "STRICT RULES:\n"
                        "1. Every question must have a question number (qno) and a CO.\n"
                        "2. If a question has sub-questions, ALWAYS format them using a DOT.\n"
                        "   Correct: 1.a, 1.b, 2.a\n"
                        "   Wrong: 1a, 1b, 2a\n"
                        "3. Even if the image shows '6a' or '6 b', you MUST convert it to '6.a' or '6.b'.\n"
                        "4. Do NOT merge sub-questions.\n"
                        "5. Output must strictly follow the given schema.\n"
                        "6. Do not add explanations or extra text.\n"
                        "7. If CO is missing, return null.\n\n"
                        "Now extract the data from this image."
                        "IMPORTANT ANY Question have sub question it should seperated by . and use alphabet a,b,c etc.."
                    )
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

def image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode("utf-8")

def main_func(image_path:str,subject_id:int):
    image_bs4 = image_to_base64(image_path)
    messages = prompt.format_messages(image_base64=image_bs4)
    result = llm_struct.invoke(messages)
    print(result)
    processed_arr=[]
    for data in result.items:
        convert_to_dict=data.__dict__
        processed_arr.append(convert_to_dict)
    obj=DBOperationTeacherCoProcessing()
    obj.insert_question_co_map(my_list=processed_arr,subject_id=subject_id)
    return {"status":"completed"}




