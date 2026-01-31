import google.generativeai as genai
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

class QuestionAnswerEvaluation(BaseModel):
    question_no: str = Field(
        description="The question number being evaluated sepereated by . if subquestion occured eg 6.i,6.ii all this convert to alphabetic order eg: 6.a,6.b"
    )
    total_marks: float = Field(
        description="The total marks for the question"
    )
    mark_score: float = Field(
        description="The marks the student received out of the total marks"
    )
    feedback: List[str] = Field(
        description="Detailed feedback on where marks were lost or deducted. IMPORTANT: If full marks are awarded, return an empty list []"
    )

class EvaluationResults(BaseModel):
    results: List[QuestionAnswerEvaluation] = Field(
        description="List of all question evaluations"
    )

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))

groq_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0
)

groq_structured = groq_llm.with_structured_output(EvaluationResults)
def evaluate_pdf(answer_key_path, student_answer_path):
    print("Uploading answer key...")
    answer_key_file = genai.upload_file(answer_key_path)
    
    print("Uploading student answer...")
    student_answer_file = genai.upload_file(student_answer_path)

    model = genai.GenerativeModel("gemini-3-flash-preview")
    
    prompt = """
    You are an academic examiner evaluating student answers in a university-level examination.

    Your task is to evaluate the student’s answer in a MODERATE and FAIR manner.

    EVALUATION RULES:
    1. Compare the student’s answer strictly with the given answer key and marking scheme.
    2. Award marks based on:
    - Conceptual correctness  
    - Coverage of required points  
    - Clarity and logical flow of explanation  
    - Correct use of technical terms  
    - Diagrams or examples (if applicable)
    3. Award partial marks wherever applicable.
    4. Minor grammatical or spelling mistakes should NOT reduce marks.
    5. If the answer is partially correct or missing some points, deduct marks proportionally.
    6. If the question is **not attempted**, **left blank**, or **completely incorrect**, award **0 marks strictly**.
    7. Do NOT assume or infer answers that are not explicitly written by the student.

    MARKING STYLE:
    - Follow moderate university-level valuation.
    - Be fair and consistent.
    - Use decimal values if required.
    - Do not be overly strict or overly lenient.
    """
    
    print("Generating evaluation...")
    response = model.generate_content([
        prompt,
        answer_key_file,
        student_answer_file
    ])

    return response.text

def groq_structure(res: str):
    """
    Convert Gemini's raw evaluation response into structured JSON using Groq
    
    Args:
        res: Raw text response from Gemini evaluation
        
    Returns:
        Structured evaluation results with proper JSON format
    """
    print("🔄 Structuring evaluation results with Groq...")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a data structuring expert. Your task is to convert raw evaluation text into structured JSON format.

                IMPORTANT RULES:
                1. Extract all question evaluations from the text
                2. For question numbers with roman numerals (i, ii, iii), convert to alphabetic (a, b, c)
                3. Ensure feedback is an empty list [] if full marks are awarded
                4. Ensure feedback contains specific deduction reasons if marks are deducted
                5. Use exact marks as mentioned in the evaluation

            Return a properly structured list of all question evaluations."""),
        ("human", """Convert the following evaluation text into structured format:

        {evaluation_text}

        Extract all questions, marks, and feedback accurately.""")
    ])
    
    formatted_prompt = prompt.format_messages(evaluation_text=res)
    result = groq_structured.invoke(formatted_prompt)
    
    print(f"✓ Structured {len(result.results)} question evaluations")
    
    return result


if __name__ == "__main__":
    answer_key = "test_pdfs/MP IA1 Question paper Answer scheme (1).pdf"
    student_answer = "test_pdfs/updatedIA1.pdf"
    
    print("Starting evaluation...\n")
    res = evaluate_pdf(answer_key, student_answer)
    
    print("\n" + "="*50)
    print("RAW GEMINI EVALUATION:")
    print("="*50)
    print(res)
    
    print("\n" + "="*50)
    print("STRUCTURING WITH GROQ:")
    print("="*50)
    structured_result = groq_structure(res)
    
    print("\n" + "="*50)
    print("STRUCTURED EVALUATION RESULT:")
    print("="*50)
    print(structured_result.model_dump_json(indent=2))
