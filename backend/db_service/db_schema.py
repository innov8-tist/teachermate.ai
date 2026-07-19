from sqlalchemy import Column,Integer,Boolean,String,ForeignKey,Text,JSON,Float
from .db import Base


class EvaluationSchema(Base):
    """Evaluation criteria and answer keys (formerly AnswerSchema)"""
    __tablename__ = "evaluation_schemas"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("co_templates.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    pdf_path = Column(String, nullable=False)  # S3 URL of the complete answer schema PDF
    status = Column(String, default="active")  # active, archived
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class STUDENTINFO(Base):
    __tablename__="student_info"
    id=Column(Integer,primary_key=True,index=True)
    reg_no=Column(String,nullable=False)
    name=Column(String,nullable=False)
    branch=Column(String,nullable=False)
    division=Column(String,nullable=False)


class StudentEvaluationProgress(Base):
    """Track student evaluation progress for resuming evaluations"""
    __tablename__ = "student_evaluation_progress"
    id = Column(Integer, primary_key=True, index=True)
    schema_id = Column(Integer, ForeignKey("evaluation_schemas.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    student_reg_no = Column(String, nullable=False)
    upload_method = Column(String, nullable=False)  # 'pdf' or 'camera'
    student_pdf_path = Column(String, nullable=True)  # S3 URL or path to student's answer PDF
    total_questions = Column(Integer, nullable=False, default=0)  # Total questions to evaluate
    created_at = Column(String, nullable=False)  # ISO timestamp
    updated_at = Column(String, nullable=False)  # ISO timestamp



class StudentAnswerEvaluation(Base):
    """Student answer evaluations with AI feedback"""
    __tablename__ = "student_answer_evaluations"
    id = Column(Integer, primary_key=True, index=True)
    progress_id = Column(Integer, ForeignKey("student_evaluation_progress.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    student_reg_no = Column(String, nullable=True)  # Student registration number 
    question_no = Column(String, nullable=False)
    mark_score = Column(Float, nullable=False)  # Marks awarded
    total_mark = Column(Integer, nullable=False)  # Total marks for question
    feedback = Column(JSON, nullable=False)  # List of feedback points
    evaluated_at = Column(String, nullable=False)  # ISO timestamp