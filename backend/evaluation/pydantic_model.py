from pydantic import BaseModel, Field
class EvaluationLLM(BaseModel):
    llmscore: float = Field(description="Score from 0 to 1")
    feedback: list[str] = Field(
        description="List of feedback messages explaining missing points or errors"
    )