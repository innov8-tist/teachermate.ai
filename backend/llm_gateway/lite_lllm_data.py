from langchain_litellm import ChatLiteLLMRouter
from litellm import Router
from .schemas_prompts import EvaluationResults, QuestionAnswerEvaluation
from .settings import Settings
from dotenv import load_dotenv
import os
import asyncio

load_dotenv()
class LiteLLMData(Settings):
    def __init__(self):
        super().__init__()
        self.gemini_router=Router(
                            model_list=self.gemini_model_list,
                            routing_strategy="simple-shuffle",
                            enable_weighted_failover=True,
                            num_retries=1,
                            allowed_fails=1,
                            cooldown_time=60,
                            set_verbose=True
                        )
        self.groq_router=Router(
                            model_list=self.groq_model_list,
                            routing_strategy="simple-shuffle",
                            enable_weighted_failover=True,
                            num_retries=1,
                            allowed_fails=1,
                            cooldown_time=60,
                            set_verbose=True
                        )
        self.groq_litellm=ChatLiteLLMRouter(router=self.groq_router, model_name="groq",temperature=0)
        # self.groq_llm=self.groq_litellm.with_structured_output(EvaluationResults,)
        self.gemini_lanchain=ChatLiteLLMRouter(router=self.gemini_router,model_name="gemini",temperature=0)
        
        
        