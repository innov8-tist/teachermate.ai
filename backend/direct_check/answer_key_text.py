import google.generativeai as genai
from dotenv import load_dotenv
import os
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))

sample_file = genai.upload_file(path="KasyapP.pdf", display_name="sample1")
extract_model = genai.GenerativeModel('gemini-2.5-flash')
print(f"Uploaded file '{sample_file.display_name}' as: {sample_file.uri}")

text_response = extract_model.generate_content(
    [sample_file, "Extract all text from this document as well as image description if present"]
)

student_text = text_response.text

sample_file2 = genai.upload_file(path="scheme.pdf", display_name="sample2")

text_response2 = extract_model.generate_content(
    [sample_file2, "Extract all text from this document as well as image description if present"]
)

print(f"Uploaded file '{sample_file2.display_name}' as: {sample_file2.uri}")

teacher_text=text_response2.text



evalution_criteria="""
Here is **only the mark criteria** extracted from the uploaded scheme (no questions, no answers):

---

### **PART A – Marking Criteria**

1. **Differentiate system software and application software**

   * Any **3 differences with proper example** → **3 marks**

2. **Assembler directives in SIC**

   * **1 mark for each assembler directive** → **3 marks**

3. **Format of object program (Two-pass SIC Assembler)**

   * Correct **Header record** → **1 mark**
   * Correct **Text record** → **1 mark**
   * Correct **End record** → **1 mark**
   * **Total: 3 marks**

4. **SIC program to swap ALPHA and BETA**

   * Any program with **correct logic** → **3 marks**

5. **Object code generation (given instructions)**

   * **1 mark for each instruction** → **3 marks**

---

### **PART B – Marking Criteria**

6. **a) Types of system software (any four)**

   * **1.5 marks each** × 4 → **6 marks**

   **b) Architecture of SIC/XE machine**

   * Memory → **1 mark**
   * Registers → **1 mark**
   * Data formats → **1 mark**
   * Instruction formats → **2 marks**
   * Addressing modes → **1 mark**
   * Instruction set → **1 mark**
   * Input & Output → **1 mark**
   * **Total: 8 marks**

7. **a) SIC/XE instructions for expression**

   * Any program with **correct logic** → **5 marks**

   **b) Pass-1 of two-pass assembler**

   * Correct **algorithm** → **7 marks**
   * Data structures (**SYMTAB, OPTAB, LOCCTR**) → **2 marks**
   * **Total: 9 marks**

8. **Object code + data structures**

   * Correct **address & object code** → **5 marks**
   * **Data structures** → **2 marks**
   * **Total: 7 marks**

---

"""




evaluation_prompt = f"""
You are an automated university answer paper evaluator.

INPUTS:
1. Student answer script (raw extracted text)
2. Teacher answer scheme (raw extracted text)
3. Official mark criteria (STRICT)

----------------------------------
MARK CRITERIA (AUTHORITATIVE):
{evalution_criteria}
----------------------------------

TASK (VERY IMPORTANT):
1. Automatically IDENTIFY all questions attempted by the student
2. Match each detected answer to the MOST RELEVANT mark criterion
3. Questions may NOT be numbered consistently
4. Some questions may be skipped or partially answered
5. Some answers may appear without question numbers

EVALUATION RULES:
- If no answer matches a criterion → status = "not_answered"
- Partial answers → award proportional marks
- Do NOT hallucinate answers
- Do NOT exceed max marks
- Be strict like a real examiner
- Ignore irrelevant content

----------------------------------
OUTPUT FORMAT (STRICT JSON ONLY):

{{
  "questions": [
    {{
      "detected_question": "",
      "matched_criteria": "",
      "status": "answered | not_answered",
      "marks_awarded": 0,
      "max_marks": 0,
      "reason": ""
    }}
  ],
  "total_marks": 0,
  "maximum_marks": 50
}}

----------------------------------
STUDENT ANSWER SCRIPT:
{student_text}

----------------------------------
TEACHER SCHEME:
{teacher_text}
"""


from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import json

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=os.getenv("GOOGLE_GEMINI_API_KEY"),
    temperature=0
)

response = llm.invoke([
    HumanMessage(content=evaluation_prompt)
])

print(response.content)