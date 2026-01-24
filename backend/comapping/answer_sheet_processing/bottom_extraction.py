import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field,RootModel
from typing import List
from typing import Optional
from dotenv import load_dotenv
import os
import base64
load_dotenv()

class QuestionMarkScheme(BaseModel):
    Name: str = Field(
        default=None,
        description="Exact student name from the image"
    )
    Semester:int= Field(
        default=None,
        description=("Extract the student current semester (1-8) maximum That is mentiond in Branch&Semester row")
    )
    Branch: str = Field(
        default=None,
        description=(
            "Extract Branch written in the 'Branch & Semester' field (e.g., CS, IT, EL, ME, EC, etc."
        )
    )
    Reg_No: str = Field(
        default=None,
        description=(
            "Extract University Reg.no in the image.Valid format ONLY if clearly written as:'TOC' + 2 digits (year) + 2 LETTERS (branch code) + 3 digits. Branch code maybe IT,CS,EL,ME,EC etc. make sure there is NO spaces, NO separators, NO corrections. eg: TOC22IT083 like this"
        )    
    )
    Roll_No:int= Field(
        default=None,
        description="Numeric roll number if clearly visible. Otherwise None."
    )
llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            google_api_key=os.getenv("GOOGLE_GEMINI_API_KEY"),
            temperature=0
            )
llm_struct=llm.with_structured_output(QuestionMarkScheme)
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "human",
            [
                {
                    "type": "text",
                    "text": "Extract student details from this image."
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
image_bs4 = image_to_base64("../answer_sheet_processed_images/KasyapP/bot.png")
messages = prompt.format_messages(image_base64=image_bs4)
result = llm_struct.invoke(messages)
print(result)