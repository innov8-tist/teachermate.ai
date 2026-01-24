from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import numpy as np
from agno.agent import Agent
from agno.models.openrouter import OpenRouter
from agno.models.google import Gemini
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from backend.evaluation.pydantic_model import EvaluationLLM
import time
from typing import Dict, Any
import os
load_dotenv()
class EvalutionMetrics:
    def __init__(self):
        self.embedding_model=GoogleGenerativeAIEmbeddings(
                                model="models/gemini-embedding-001",
                                api_key=os.getenv("GOOGLE_GEMINI_API_KEY")
                            )
        self.model=Gemini(id="gemini-2.5-flash",api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))
        self.vectorizer=TfidfVectorizer()

    @staticmethod
    def cosine_similarity(vec1, vec2):
        dot = np.dot(vec1, vec2)
        return dot / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

    def KeyWordMatching(self,teacher_answer:str,student_answer:str)->Dict:
        tfidf_matrix = self.vectorizer.fit_transform([teacher_answer, student_answer])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return {"keyword_similarity":similarity}
    
    def SemanticMatching(self,teacher_answer:str, student_answer:str)->Dict:
        vec1 = np.array(self.embedding_model.embed_query(teacher_answer))
        vec2 = np.array(self.embedding_model.embed_query(student_answer))
        results = {
            "cosine_similarity": float(self.cosine_similarity(vec1, vec2)),
        }
        return results
    def llmMatching(self,teacher_answer:str,student_answer:str)->Dict:
        agent = Agent(
            model=self.model,
            description=(
                "You are an intelligent answer-evaluation assistant. "
                "Your job is to evaluate a student's answer compared to a teacher's reference answer. "
                "You must detect missing or incorrect key points, identify conceptual gaps, and provide clear feedback. "
                "Your output must strictly follow the EvaluationLLM schema: "
                "`llmscore` should be a float between 0 and 1, and `feedback` should explain why marks were deducted, "
                "highlighting missing keywords or incorrect reasoning. "
                "Be concise, accurate, and fair in your evaluation."
            ),
            output_schema=EvaluationLLM,
        )
        input_text=f"Teacher Answer:{teacher_answer} \n  Student Answer:{student_answer}"
        res=agent.run(input_text)
        return {"LLM_Score":res.content.llmscore,"FeedBack":res.content.feedback}
    
if __name__ == "__main__":
    teacher_answer="""Photosynthesis is the process by which green plants convert light energy into chemical energy.
                    It involves chlorophyll, water, and carbon dioxide. Plants absorb sunlight and use CO2 and water
                    to produce glucose and release oxygen as a byproduct."""
    student_answer="""
                    Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce food. 
                    Chlorophyll in the leaves absorbs the sunlight, which provides the energy needed for the reaction. 
                    During this process, plants convert light energy into chemical energy stored in glucose, and oxygen is released as a byproduct.
                    """
    obj=EvalutionMetrics()
    start_time=time.time()
    keyword_score=obj.KeyWordMatching(teacher_answer=teacher_answer,student_answer=student_answer)
    semantic_score=obj.SemanticMatching(teacher_answer=teacher_answer,student_answer=student_answer)
    llm_score=obj.llmMatching(teacher_answer=teacher_answer,student_answer=student_answer)
    endtime=time.time()
    total_time=endtime-start_time
    print("Total Time Taken: ",total_time)
    print(f"Keyword Score: {keyword_score}")
    print(f"Semantic Score: {semantic_score}")
    print(f"LLM Score: {llm_score}")
    final_score=0.2*keyword_score["keyword_similarity"]+0.2*semantic_score["cosine_similarity"]+0.6*llm_score["LLM_Score"]
    final_mark=final_score*5
    formatted = f"{final_mark:.2f}" 
    left_part = int((formatted.split(".")[0]))
    decimal_part=int(formatted.split(".")[1])
    if decimal_part>80:
        print(f"Final Mark the student obtain: {left_part+1}.00")  
    elif decimal_part<80 and decimal_part>50:
        print(f"Final Mark the student obtain: {left_part}.5")
    elif decimal_part>30 and decimal_part<50:
        print(f"Final Mark the student obtain: {left_part}.5")
    else:
        print(f"Final Mark the student obtain: {left_part}.00")

