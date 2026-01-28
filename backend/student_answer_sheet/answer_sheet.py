import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import ChatPromptTemplate
import base64
from dotenv import load_dotenv

try:
    from .db_operation import StudentAnswerService
except ImportError:
    from student_answer_sheet.db_operation import StudentAnswerService

load_dotenv()

# ============================================================================
# STEP 1: Extract text from student images using Gemini (vision capability)
# ============================================================================

class StudentAnswerExtraction(BaseModel):
    """Extracted text from student's answer"""
    answer_text: str = Field(
        description="The complete text written by the student in their answer"
    )
    image_explanation: str = Field(
        description="Detailed explanation of any diagrams, graphs, or images drawn by the student. Empty string if no images/diagrams present"
    )

# ============================================================================
# STEP 2: Evaluate extracted text using Groq (text-only, faster)
# ============================================================================

class QuestionAnswerEvaluation(BaseModel):
    """Student answer evaluation result"""
    mark_score: float = Field(
        description="The marks the student received out of the total marks"
    )
    feedback: List[str] = Field(
        description="Detailed feedback on where marks were lost or deducted. IMPORTANT: If full marks are awarded, return an empty list []"
    )

# Initialize LLMs
gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_GEMINI_API_KEY"),
    temperature=0
)

groq_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0
)

gemini_structured = gemini_llm.with_structured_output(StudentAnswerExtraction)
groq_structured = groq_llm.with_structured_output(QuestionAnswerEvaluation)


def image_to_base64(image_path: str) -> str:
    """Convert image to base64 string"""
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode("utf-8")


def create_extraction_prompt(student_image_paths: List[str]) -> ChatPromptTemplate:
    """Create a prompt for extracting text from student answer images"""
    human_content = [
        {
            "type": "text",
            "text": "Extract all text and explain any diagrams/images from the student's answer shown in the image(s) below:"
        }
    ]
    
    # Add all student answer images
    for i, _ in enumerate(student_image_paths):
        human_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{{student_image_{i}}}"
            }
        })
    
    return ChatPromptTemplate.from_messages([
        ("system", """You are a text extraction expert. Your task is to:

1. Extract ALL text written by the student in their answer
2. If there are any diagrams, graphs, flowcharts, or images drawn by the student, provide a detailed explanation of what they show

Be thorough and accurate. Combine information from all images if the answer spans multiple pages.

Return:
- answer_text: Complete text written by the student
- image_explanation: Detailed explanation of any diagrams/images (empty string if none present)"""),
        ("human", human_content)
    ])


def create_evaluation_prompt() -> ChatPromptTemplate:
    """Create a prompt for evaluating student answer (text-only)"""
    return ChatPromptTemplate.from_messages([
        ("system", """You are a strict but fair exam evaluator. Your task is to evaluate student answers and award marks.

EVALUATION GUIDELINES:
1. Compare the student's answer with the expected answer and marking criteria
2. Award marks based on:
   - Correctness of concepts
   - Completeness of answer
   - Quality of explanations
   - Accuracy of diagrams/calculations (if applicable)
3. Be precise with marks (use decimals if needed)
4. Award partial marks for partially correct answers
5. If the student's answer is completely correct, award FULL marks

CRITICAL FEEDBACK RULES - READ CAREFULLY:
⚠️ IMPORTANT: The feedback field is ONLY for explaining mark deductions!

- If mark_score == total_mark (100% correct): 
  → feedback MUST be an empty list
  → Do NOT provide any comments, praise, or observations
  → Do NOT mention what was correct
  
- If mark_score < total_mark (marks deducted):
  → feedback MUST contain specific reasons for EACH mark deduction
  → Focus ONLY on mistakes, errors, or missing content
  → Be specific about what was wrong and how many marks were lost

EXAMPLES:
CORRECT - Full marks: mark_score equals total_mark, feedback is empty list
WRONG - Full marks with feedback: mark_score equals total_mark but feedback has items
CORRECT - Partial marks: mark_score less than total_mark, feedback explains each deduction

Return ONLY:
- mark_score: Exact marks awarded (must be <= total marks)
- feedback: Empty list if full marks, otherwise specific deduction reasons"""),
        ("human", """Evaluate the student's answer based on the following:

QUESTION DETAILS:
Question: {question}
Total Marks: {total_mark}

MARKING CRITERIA:
{mark_criteria}

EXPECTED ANSWER:
{answer}

EXPECTED IMAGE EXPLANATION (if diagrams/graphs are required):
{expected_image_explanation}

---

STUDENT'S ANSWER:
{student_answer_text}

STUDENT'S DIAGRAMS/IMAGES (if any):
{student_image_explanation}

---

Evaluate carefully. Remember: If the student deserves full marks, return an empty feedback list.""")
    ])


def extract_student_answer(student_image_paths: List[str]) -> StudentAnswerExtraction:
    """
    Step 1: Extract text and image explanations from student answer images using Gemini
    """
    print("🔍 Step 1: Extracting text from student images using Gemini...")
    
    # Convert images to base64
    student_images_base64 = {
        f"student_image_{i}": image_to_base64(path) 
        for i, path in enumerate(student_image_paths)
    }
    
    # Create and format prompt
    prompt = create_extraction_prompt(student_image_paths)
    formatted_prompt = prompt.format_messages(**student_images_base64)
    
    # Extract using Gemini
    result = gemini_structured.invoke(formatted_prompt)
    
    print(f"✓ Extracted {len(result.answer_text)} characters of text")
    if result.image_explanation:
        print(f"✓ Found diagrams/images in student answer")
    
    return result


def evaluate_with_groq(
    question: str,
    total_mark: int,
    mark_criteria: List[str],
    answer: str,
    expected_image_explanation: str,
    student_answer_text: str,
    student_image_explanation: str
) -> QuestionAnswerEvaluation:
    """
    Step 2: Evaluate the extracted text using Groq
    """
    print("⚖️  Step 2: Evaluating answer using Groq...")
    
    # Format mark criteria as string
    mark_criteria_text = "\n".join([f"  {i+1}. {criteria}" 
                                   for i, criteria in enumerate(mark_criteria)])
    
    # Create and format prompt
    prompt = create_evaluation_prompt()
    formatted_prompt = prompt.format_messages(
        question=question,
        total_mark=total_mark,
        mark_criteria=mark_criteria_text,
        answer=answer,
        expected_image_explanation=expected_image_explanation or "No image explanation provided",
        student_answer_text=student_answer_text,
        student_image_explanation=student_image_explanation or "No diagrams/images present"
    )
    
    # Evaluate using Groq
    result = groq_structured.invoke(formatted_prompt)
    
    # Post-processing: Ensure feedback is empty if full marks awarded
    if result.mark_score >= total_mark:
        result.feedback = []
        print(f"✓ Full marks awarded: {result.mark_score}/{total_mark}")
    else:
        print(f"✓ Evaluation complete: {result.mark_score}/{total_mark} marks awarded")
    
    return result


def evaluate_student_answer(
    question_no: str,
    subject_id: int,
    student_image_paths: List[str],
    student_reg_no: str = None,
    s3_image_urls: List[str] = None
) -> dict:
    """
    Evaluate a student's answer by:
    1. Extracting text from images using Gemini (vision)
    2. Evaluating the text using Groq (text-only, faster)
    
    Args:
        question_no: Question number (e.g., "1", "2.a")
        subject_id: Subject/Template ID
        student_image_paths: List of paths to student answer images (for AI processing)
        student_reg_no: Student registration number (optional)
        s3_image_urls: List of S3 URLs for permanent storage (optional)
        
    Returns:
        dict with evaluation results and status
    """
    try:
        # Fetch answer schema from database
        with StudentAnswerService() as service:
            answer_schema = service.get_answer_schema(question_no, subject_id)
            
            if not answer_schema:
                return {
                    "status": "error",
                    "message": f"No answer schema found for question {question_no} in subject {subject_id}"
                }
            
            print("=" * 50)
            print("EVALUATING STUDENT ANSWER")
            print("=" * 50)
            print(f"Question No: {question_no}")
            print(f"Subject ID: {subject_id}")
            print(f"Total Marks: {answer_schema.total_mark}")
            print(f"Number of student images: {len(student_image_paths)}")
            print("=" * 50)
            
            # STEP 1: Extract text from images using Gemini
            extracted = extract_student_answer(student_image_paths)
            
            print(f"\n📝 Student's Answer Text:")
            print(f"  {extracted.answer_text[:200]}..." if len(extracted.answer_text) > 200 else f"  {extracted.answer_text}")
            
            if extracted.image_explanation:
                print(f"\n🖼️  Student's Diagrams/Images:")
                print(f"  {extracted.image_explanation[:200]}..." if len(extracted.image_explanation) > 200 else f"  {extracted.image_explanation}")
            
            # STEP 2: Evaluate using Groq
            result = evaluate_with_groq(
                question=answer_schema.question,
                total_mark=answer_schema.total_mark,
                mark_criteria=answer_schema.mark_criteria,
                answer=answer_schema.answer,
                expected_image_explanation=answer_schema.image_explanation,
                student_answer_text=extracted.answer_text,
                student_image_explanation=extracted.image_explanation
            )
            
            print("\n" + "=" * 50)
            print("EVALUATION RESULT")
            print("=" * 50)
            print(f"Marks Awarded: {result.mark_score}/{answer_schema.total_mark}")
            
            if result.feedback:
                print(f"\nFeedback (Marks Deducted):")
                for i, feedback_point in enumerate(result.feedback, 1):
                    print(f"  {i}. {feedback_point}")
            else:
                print(f"\n✓ Perfect! Full marks awarded - No feedback needed.")
            
            print("=" * 50)
            
            # Save evaluation to database
            # Use S3 URLs if provided, otherwise fall back to temp paths
            image_paths_to_save = s3_image_urls if s3_image_urls else student_image_paths
            
            db_record = service.insert_student_evaluation(
                question_no=question_no,
                subject_id=subject_id,
                mark_score=result.mark_score,
                total_mark=answer_schema.total_mark,
                feedback=result.feedback,
                student_image_paths=image_paths_to_save,
                student_reg_no=student_reg_no
            )
            
            print(f"\n✓ Evaluation saved to database with ID: {db_record.id}")
            
            return {
                "status": "success",
                "message": "Successfully evaluated student answer",
                "data": {
                    "id": db_record.id,
                    "question_no": question_no,
                    "mark_score": result.mark_score,
                    "total_mark": answer_schema.total_mark,
                    "percentage": round((result.mark_score / answer_schema.total_mark) * 100, 2),
                    "feedback": result.feedback,
                    "extracted_text": extracted.answer_text,
                    "extracted_images": extracted.image_explanation
                }
            }
            
    except Exception as e:
        print(f"\n✗ Evaluation failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Evaluation failed: {str(e)}"
        }


def main(question_no: str, subject_id: int, student_image_paths: List[str]):
    """Main function for testing"""
    return evaluate_student_answer(question_no, subject_id, student_image_paths)
