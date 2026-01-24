import re
from langchain_community.document_loaders import PyMuPDFLoader
from pydantic import BaseModel, Field,RootModel
from typing import List
from dotenv import load_dotenv
import os
from PIL import Image
from langchain_core.messages import SystemMessage,HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
llm=ChatGoogleGenerativeAI(model="gemini-2.5-flash",api_key="AIzaSyDoFEYr0q7xpyQHtjQdINx62BKPe5ETpnY")
class QuestionImageBlock(BaseModel):
    question_number: str = Field(
        description="Question number including sub-parts (e.g., 1, 2(a), 5(ii))"
    )
    text: str = Field(
        description="Exact OCR text of the ANSWER or marking scheme. Verbatim only."
    )
    image: str = Field(
        description="Description of any diagram/table used in the answer, otherwise empty string"
    )

class OCRImageOutput(RootModel[List[QuestionImageBlock]]):
    pass
import base64
def get_image(filepath="mss student.jpeg", ext="jpeg"):
    with open(filepath, "rb") as f:
        content = f.read()

    image = Image.open(filepath)
    image.verify()  
    image_base64 = base64.b64encode(content).decode("utf-8")
    return f"data:image/{ext};base64,{image_base64}"

image_bs4=get_image()

system_prompt = SystemMessage(
    content="""
        You are an OCR extraction agent for EXAM ANSWER KEYS / MARKING SCHEMES.

        Input:
        - You will receive ONE CROPPED IMAGE containing the answer to a SINGLE question or sub-question.

        Your task:
        - Identify the EXACT question number shown in the image.
        - Extract ONLY the ANSWER / MARKING CONTENT present in the image.

        Strict Rules:
        - Extract text VERBATIM (exact OCR). Do NOT rewrite, summarize, or correct.
        - Preserve bullet points, numbering, equations, symbols, and line breaks.
        - If a diagram / figure / table is present:
        - DO NOT include it in the text.
        - Describe it briefly in the `image` field.
        - If no diagram is present, return an EMPTY STRING for `image`.
        - Do NOT infer missing parts of the answer.
        - Do NOT hallucinate additional content.
        - Output MUST strictly follow the given JSON schema.

        Important :
        Question number identification should be accurate maybe it like 7 a or 7 b other wise 7 roman letter
        """
)

human_prompt = HumanMessage(
    content=[
        {
            "type": "text",
            "text": """
                    This image contains the answer for ONE question only.

                    Extract:
                    - question_number (exactly as shown)
                    - text: exact answer / marking scheme text (verbatim)
                    - image: diagram / figure description if present, otherwise empty string

                    Return JSON ONLY. Follow the schema strictly.
                """
        },
        {
            "type": "image_url",
            "image_url": image_bs4
        }
    ]
)
llm_structured = llm.with_structured_output(OCRImageOutput)

res = llm_structured.invoke([system_prompt, human_prompt])
print(res)