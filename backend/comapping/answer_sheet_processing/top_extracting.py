import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field,RootModel
from .db_operation import DBOperationAnswerSheetProcessing
from langchain_groq import ChatGroq
from typing import List,Dict
from typing import Optional
from dotenv import load_dotenv
import os
import base64
load_dotenv()


from collections import defaultdict

class MarksProcessor:
    def __init__(self):
        self.roman_dict = {
            'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
            'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
            'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
            'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
        }

    def roman_to_number(self, key):
        return self.roman_dict.get(key)

    def modify(self, std_list, limit=4):
        return [
            {
                'row': std.row_id,
                'marks': {
                    str(self.roman_to_number(k)): v
                    for k, v in std.marks.items()
                    if self.roman_to_number(k) is not None
                }
            }
            for std in std_list[:limit]
        ]

    def filter_valid_rows(self, modified_list):
        return [
            {
                'row': row['row'],
                'marks': {k: v for k, v in row['marks'].items() if v is not None}
            }
            for row in modified_list
            if any(v is not None for v in row['marks'].values())
        ]

    def final_conversion(self, filtered_list):
        question_map = defaultdict(list)

        for entry in filtered_list:
            for q_no, mark in entry['marks'].items():
                question_map[q_no].append((entry['row'], mark))

        final_result = {}
        for q_no, values in question_map.items():
            if len(values) > 1:
                for row_label, mark in values:
                    final_result[f"{q_no}.{row_label}"] = mark
            else:
                final_result[q_no] = values[0][1]

        return final_result


class StudentMarks(BaseModel):
    row_id: str = Field(
        description="Row identifier of the student such as a, b, c, d, e"
    )
    marks: Dict[str, Optional[float]] = Field(
    description=(
        "Question-wise marks. "
        "Keys must be Roman numerals exactly as: "
        "I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII, XIII. "
        "For questions I to V, the maximum marks are 3 each. "
        "If a cell is empty, contains '_', or is unreadable, return null. "
        "Fractions may appear as '1/2' or combined values like '3 1/2'. "
        "Convert fractions to decimal format (e.g., '1/2' → 0.5, '3 1/2' → 3.5)."
    )
    )


class MarksTableOutput(BaseModel):
    student: List[StudentMarks]

llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            google_api_key=os.getenv("GOOGLE_GEMINI_API_KEY"),
            temperature=0
        )

llm_struct=llm.with_structured_output(MarksTableOutput)
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "human",
            [
                {
                    "type": "text",
                    "text": "Extract Student mark from this image"
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
image_bs4 = image_to_base64("C:\\Users\\manum\\Desktop\\mini project s6\\backend\\comapping\\answer_sheet_processed_images\\ARJUN A\\top.png")
messages = prompt.format_messages(image_base64=image_bs4)
result = llm_struct.invoke(messages)
processor = MarksProcessor()
modified = processor.modify(result.student)
filtered = processor.filter_valid_rows(modified)
final = processor.final_conversion(filtered)

print("**FINAL OUTPUT**")
print(final)
obj=DBOperationAnswerSheetProcessing()
obj.insert_student_marks(
    final_output=final,
    regno="TOC23CS078",
    subject_id=1,
    ia_id=1
)