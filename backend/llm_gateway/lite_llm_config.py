from langchain_litellm import ChatLiteLLMRouter
from langchain_core.prompts import ChatPromptTemplate
from .lite_lllm_data import LiteLLMData
from .schemas_prompts import GEMINI_PROMPT, GROQ_PROMPT
from litellm import completion_cost
from dotenv import load_dotenv
import os
import asyncio
load_dotenv()
class LiteLLMConfig(LiteLLMData):
    def __init__(self,GEMINI_PROMPT,GROQ_PROMPT):
        super().__init__()
        self.GEMINI_PROMPT=GEMINI_PROMPT
        self.GROQ_PROMPT=GROQ_PROMPT
    async def gemini(self,answer_key:str,student_ans:str):
        response = await self.gemini_router.acompletion(
            model="gemini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": self.GEMINI_PROMPT},
                        {
                            "type": "file",
                            "file": {
                                "file_id": answer_key,
                                "format": "application/pdf" 
                            }
                        },
                        {
                            "type": "file",
                            "file": {
                                "file_id": student_ans,
                                "format": "application/pdf" 
                            }
                        },
                    ],
                }
            ]
        )
        cost = completion_cost(completion_response=response)
        deployment = response._hidden_params.get("model_id", "?")
        print("#"*100)
        print(f"#{deployment:<32} Called Model")
        print("\nInput tokens: ", response.usage.prompt_tokens)
        print("Output tokens:", response.usage.completion_tokens)
        print(f"Cost:         ${cost:.8f}")
        print("#"*100)
        return response.choices[0].message.content
    async def groq(self,user_text:str):
        print("🔄 Structuring evaluation results with Groq...")
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.GROQ_PROMPT ),
            ("human", """Convert the following evaluation text into structured format:
            {evaluation_text}
            Extract all questions, marks, and feedback accurately.""")
        ])
        formatted_prompt = prompt.format_messages(evaluation_text=user_text)
        response =await self.groq_llm.ainvoke(formatted_prompt)
        # deployment = response.response_metadata["model_info"]["id"]
        print("#"*100)
        # print(f"#{deployment:<32} Called Model")
        print(f"✓ Structured {len(response.results)} question evaluations")
        print(response)
        print("#"*100)
        return response
    
async def main():
    obj = LiteLLMConfig(
        GEMINI_PROMPT=GEMINI_PROMPT,
        GROQ_PROMPT=GROQ_PROMPT
    )

    answer_key = "https://teachermate.s3.ap-south-1.amazonaws.com/MP+IA1+Question+paper+Answer+scheme.pdf"
    student_answer = "https://teachermate.s3.ap-south-1.amazonaws.com/Mp+Best+IA1.pdf"

    print("Starting evaluation...\n")

    res = await obj.gemini(answer_key, student_answer)

    print("\n" + "=" * 50)
    print("RAW GEMINI EVALUATION:")
    print("=" * 50)
    print(res)

    print("\n" + "=" * 50)
    print("STRUCTURING WITH GROQ:")
    print("=" * 50)

    structured_result = await obj.groq(res)

    print("\n" + "=" * 50)
    print("STRUCTURED EVALUATION RESULT:")
    print("=" * 50)
    print(structured_result.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())