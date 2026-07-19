"""
Student Sheet Extraction
Extracts registration number and marks from student answer sheets using LLM
Migrated from comapping/answer_sheet_processing/extraction_pipeline.py
"""

import base64
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from collections import defaultdict
from langchain_core.prompts import ChatPromptTemplate

from llm_gateway import LiteLLMConfig
from llm_gateway.schemas_prompts import GEMINI_PROMPT, GROQ_PROMPT
from db_service import get_db
from modules.co_mapper.models import COQuestionMapping, StudentAnswerMark


class QuestionMarkScheme(BaseModel):
    Reg_No: str = Field(
        default=None,
        description=(
            "Extract University Reg.no in the image.Valid format ONLY if clearly written as:'TOC' + 2 digits (year) + 2 LETTERS (branch code) + 3 digits. Branch code maybe IT,CS,EL,ME,EC etc. make sure there is NO spaces, NO separators, NO corrections. eg: TOC22IT083 like this"
        )
    )


class Marks(BaseModel):
    I: Optional[float] = Field(None)
    II: Optional[float] = Field(None)
    III: Optional[float] = Field(None)
    IV: Optional[float] = Field(None)
    V: Optional[float] = Field(None)
    VI: Optional[float] = Field(None)
    VII: Optional[float] = Field(None)
    VIII: Optional[float] = Field(None)
    IX: Optional[float] = Field(None)
    X: Optional[float] = Field(None)
    XI: Optional[float] = Field(None)
    XII: Optional[float] = Field(None)
    XIII: Optional[float] = Field(None)


class StudentMarks(BaseModel):
    row_id: str = Field(
        description="Row identifier such as a, b, c, d, e"
    )
    marks: Marks


class MarksTableOutput(BaseModel):
    student: List[StudentMarks]


class MarksProcessor:
    """Process and normalize extracted marks from LLM output"""
    
    def __init__(self):
        self.roman_dict = {
            "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5,
            "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10,
            "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15,
            "XVI": 16, "XVII": 17, "XVIII": 18, "XIX": 19, "XX": 20,
        }

    def roman_to_number(self, key):
        """Convert Roman numeral to number"""
        return self.roman_dict.get(key)

    def modify(self, std_list, limit=4):
        """Convert Roman numerals to question numbers"""
        modified = []

        for std in std_list[:limit]:
            marks = {}

            for roman, value in std.marks.model_dump().items():
                number = self.roman_to_number(roman)
                if number is not None:
                    marks[str(number)] = value

            modified.append({
                "row": std.row_id,
                "marks": marks
            })

        return modified

    def filter_valid_rows(self, modified_list):
        """Filter out rows with no valid marks"""
        filtered = []

        for row in modified_list:
            valid_marks = {
                k: v
                for k, v in row["marks"].items()
                if v is not None
            }

            if valid_marks:
                filtered.append({
                    "row": row["row"],
                    "marks": valid_marks
                })

        return filtered

    def final_conversion(self, filtered_list):
        """
        Convert marks to final format, handling sub-questions
        If multiple rows have marks for same question, format as 6.a, 6.b
        """
        question_map = defaultdict(list)

        for entry in filtered_list:
            for q_no, mark in entry["marks"].items():
                question_map[q_no].append((entry["row"], mark))

        final_result = {}

        for q_no, values in question_map.items():
            if len(values) == 1:
                final_result[q_no] = values[0][1]
            else:
                for row, mark in values:
                    final_result[f"{q_no}.{row}"] = mark

        return final_result


class ExtractionPipeline(LiteLLMConfig):
    """Complete pipeline for extracting student registration number and marks"""
    
    def __init__(self):
        super().__init__(GEMINI_PROMPT=GEMINI_PROMPT, GROQ_PROMPT=GROQ_PROMPT)
        self.marks_processor = MarksProcessor()

    def image_to_base64(self, image_path: str) -> str:
        """Convert image file to base64 string"""
        with open(image_path, "rb") as img:
            return base64.b64encode(img.read()).decode("utf-8")

    def extract_regno_from_bottom(self, bottom_image_url: str) -> str:
        """Extract registration number from bottom image using Gemini vision"""
        llm_struct = self.gemini_lanchain.with_structured_output(QuestionMarkScheme)

        prompt = ChatPromptTemplate.from_messages([
            ("human", [
                {"type": "text", "text": "Extract student details from this image."},
                {"type": "image_url", "image_url": {"url": "{image_url}"}}
            ])
        ])

        messages = prompt.format_messages(image_url=bottom_image_url)
        result = llm_struct.invoke(messages)

        print("LLM Extraction Part 1 Completed")
        return result.Reg_No

    def extract_marks_from_top(self, top_image_path: str) -> dict:
        """Extract marks from top image using Gemini vision"""
        llm_struct = self.gemini_lanchain.with_structured_output(MarksTableOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("human", [
                {"type": "text", "text": "Extract Student mark from this image"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "{image_url}"
                    }
                }
            ])
        ])
        print("LLM Extration Part 2 Completed ")
        
        messages = prompt.format_messages(image_url=top_image_path)
        result = llm_struct.invoke(messages)
        print("="*100)
        print(result)
        print("="*100)
        
        # Process marks through pipeline
        modified = self.marks_processor.modify(result.student)
        filtered = self.marks_processor.filter_valid_rows(modified)
        final = self.marks_processor.final_conversion(filtered)
        return final

    def process_student_sheet(self, top_image_path: str, bottom_image_path: str, 
                             subject_id: int, ia_id: int = 1, save_to_db: bool = True):
        """
        Complete pipeline to extract both regno and marks
        
        Args:
            top_image_path: Path to top processed image (can be temp file or S3 URL)
            bottom_image_path: Path to bottom processed image (can be temp file or S3 URL)
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
                insert_student_marks(
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


def insert_student_marks(final_output, regno, subject_id, ia_id):
    """
    Insert student marks for each question mapped to COs
    
    Args:
        final_output: Dict of question_no -> mark
        regno: Student registration number
        subject_id: Template ID
        ia_id: IA number
    """
    db = next(get_db())
    try:
        # Get all question-CO mappings for this template
        mapped_questions = db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == subject_id
        ).all()

        for q in mapped_questions:
            question_no = q.q_no
            mark = final_output.get(question_no, 0)
            
            # Check if mark already exists
            exists = db.query(StudentAnswerMark).filter(
                StudentAnswerMark.question_no == question_no,
                StudentAnswerMark.regno == regno,
                StudentAnswerMark.template_id == subject_id,
                StudentAnswerMark.ia_id == ia_id
            ).first()

            if not exists:
                student_mark = StudentAnswerMark(
                    question_no=question_no,
                    mark=str(mark),
                    regno=regno,
                    template_id=subject_id,
                    ia_id=ia_id
                )
                db.add(student_mark)

        db.commit()
        print("Student marks inserted successfully")
    finally:
        db.close()
