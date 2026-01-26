import base64
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from collections import defaultdict
from dotenv import load_dotenv
from .db_operation import DBOperationAnswerSheetProcessing

load_dotenv()


class QuestionMarkScheme(BaseModel):
    Reg_No: str = Field(
        default=None,
        description=(
            "Extract University Reg.no in the image.Valid format ONLY if clearly written as:'TOC' + 2 digits (year) + 2 LETTERS (branch code) + 3 digits. Branch code maybe IT,CS,EL,ME,EC etc. make sure there is NO spaces, NO separators, NO corrections. eg: TOC22IT083 like this"
        )
    )


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


class ExtractionPipeline:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_GEMINI_API_KEY"),
            temperature=0
        )
        self.marks_processor = MarksProcessor()

    def image_to_base64(self, image_path: str) -> str:
        with open(image_path, "rb") as img:
            return base64.b64encode(img.read()).decode("utf-8")

    def extract_regno_from_bottom(self, bottom_image_path: str) -> str:
        """Extract registration number from bottom image"""
        llm_struct = self.llm.with_structured_output(QuestionMarkScheme)
        prompt = ChatPromptTemplate.from_messages([
            ("human", [
                {"type": "text", "text": "Extract student details from this image."},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,{image_base64}"}}
            ])
        ])

        image_bs4 = self.image_to_base64(bottom_image_path)
        messages = prompt.format_messages(image_base64=image_bs4)
        result = llm_struct.invoke(messages)
        print("LLM Extration Part 1 Completed ")
        return result.Reg_No

    def extract_marks_from_top(self, top_image_path: str) -> dict:
        """Extract marks from top image"""
        llm_struct = self.llm.with_structured_output(MarksTableOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("human", [
                {"type": "text", "text": "Extract Student mark from this image"},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,{image_base64}"}}
            ])
        ])
        print("LLM Extration Part 2 Completed ")
        image_bs4 = self.image_to_base64(top_image_path)
        messages = prompt.format_messages(image_base64=image_bs4)
        result = llm_struct.invoke(messages)
        modified = self.marks_processor.modify(result.student)
        filtered = self.marks_processor.filter_valid_rows(modified)
        final = self.marks_processor.final_conversion(filtered)

        return final

    def process_student_sheet(self, top_image_path: str, bottom_image_path: str, subject_id: int, ia_id: int = 1, save_to_db: bool = True):
        """
        Complete pipeline to extract both regno and marks
        
        Args:
            top_image_path: Path to top processed image
            bottom_image_path: Path to bottom processed image
            subject_id: Subject ID for database storage
            ia_id: IA number (1 or 2)
            save_to_db: Whether to save to database
            
        Returns:
            dict with regno and marks
        """
        print("=" * 50)
        print("Starting Extraction Pipeline...")
        print("=" * 50)

        regno = self.extract_regno_from_bottom(bottom_image_path)
        print(f"Extracted Reg No: {regno}")

        marks = self.extract_marks_from_top(top_image_path)
        print(f"Extracted Marks: {marks}")

        if save_to_db:
            try:
                db_operation = DBOperationAnswerSheetProcessing()
                db_operation.insert_student_marks(
                    final_output=marks,
                    regno=regno,
                    subject_id=subject_id,
                    ia_id=ia_id
                )
                print("Data saved to database successfully!")
            except Exception as e:
                print(f"Error saving to database: {str(e)}")
                raise e

        print("=" * 50)
        print("Extraction Complete!")
        print("=" * 50)

        return {
            "regno": regno,
            "marks": marks,
            "subject_id": subject_id,
            "ia_id": ia_id
        }
